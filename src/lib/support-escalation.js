'use strict';

/**
 * Human escalation + takeover for contact_message.
 * Events + metadata only — no new status machine.
 */

const db = require('./db');
const config = require('./config');
const events = require('../../db/contact-message-events');
const contactMessages = require('../../db/contact-messages');
const { sendEmail, isTestMailbox } = require('./email');
const { escalationSlaHours } = require('../../config/support-agent');
const { resolveSupportLocale } = require('./support-locale');

const META_KEY = 'support_ops';
const FORBIDDEN_NOTIFY = [
  /access_token/i,
  /csrf_token/i,
  /\bpassword\b/i,
  /\bpin\b/i,
  /authorization/i,
  /cookie/i,
  /\bsr1\./i,
  /\bsf1\./i,
];

function adminInboxUrl(messageId) {
  const base = String(config.email.baseUrl || '').replace(/\/$/, '');
  return `${base}/admin#meddelanden?ticket=${encodeURIComponent(messageId)}`;
}

function notifyRecipient() {
  const raw = process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL;
  return (raw && raw.trim()) || config.email.from;
}

function parseOps(metadata) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  const ops = meta[META_KEY] && typeof meta[META_KEY] === 'object' ? meta[META_KEY] : {};
  return { meta, ops };
}

function isTakenOver(metadata) {
  return Boolean(parseOps(metadata).ops.human_takeover_at);
}

function isEscalated(metadata) {
  const { ops } = parseOps(metadata);
  return Boolean(ops.escalated_at || ops.human_takeover_at);
}

async function loadMessage(id) {
  const { rows } = await db.query(
    `SELECT id, name, email, message, message_type, status, family_id, metadata,
            created_at, root_cause
     FROM contact_message WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function patchOps(id, patch) {
  const { rows } = await db.query(
    `UPDATE contact_message
     SET metadata = jsonb_set(
       COALESCE(metadata, '{}'::jsonb),
       $2::text[],
       COALESCE(metadata->'support_ops', '{}'::jsonb) || $3::jsonb,
       true
     )
     WHERE id = $1
     RETURNING id, metadata, status, email, name, message, message_type, family_id, created_at`,
    [id, [META_KEY], JSON.stringify(patch)]
  );
  return rows[0] || null;
}

function assertNotifySafe(text) {
  for (const pattern of FORBIDDEN_NOTIFY) {
    if (pattern.test(text)) {
      throw new Error(`escalation notify failed secret scan: ${pattern}`);
    }
  }
}

function buildEscalationEmail(row, { reason, source, locale }) {
  const ageHours = Math.max(
    0,
    Math.round((Date.now() - new Date(row.created_at).getTime()) / 3600000)
  );
  const lastUser = String(row.message || '').trim().slice(0, 400);
  const lines = [
    'Supporteskalering — mänsklig insats behövs',
    '',
    `Ärende: #${row.id}`,
    `Typ: ${row.message_type || '—'}`,
    `Status: ${row.status}`,
    `Källa: ${source}`,
    `Orsak: ${reason}`,
    `Ålder: ${ageHours} h`,
    `Locale: ${locale || '—'}`,
    '',
    'Senaste användartext (avkortad):',
    lastUser || '—',
    '',
    'Öppna i admin:',
    adminInboxUrl(row.id),
  ];
  const body = lines.join('\n');
  assertNotifySafe(body);
  return {
    subject: `[${config.email.fromName}] Supporteskalering #${row.id}`,
    body,
  };
}

async function claimNotifySlot(id, { reason, force = false } = {}) {
  const stamp = new Date().toISOString();
  const patch = {
    notified_at: stamp,
    last_notify_reason: String(reason || '').slice(0, 200),
  };
  const { rows } = await db.query(
    `UPDATE contact_message
     SET metadata = jsonb_set(
       COALESCE(metadata, '{}'::jsonb),
       $2::text[],
       COALESCE(metadata->'support_ops', '{}'::jsonb) || $3::jsonb,
       true
     )
     WHERE id = $1
       AND (
         $4::boolean = true
         OR COALESCE(metadata->'support_ops'->>'notified_at', '') = ''
       )
     RETURNING id, metadata, status, email, name, message, message_type, family_id, created_at`,
    [id, [META_KEY], JSON.stringify(patch), force]
  );
  return rows[0] || null;
}

async function notifyEscalation(row, { reason, source, locale, force = false } = {}) {
  const { ops } = parseOps(row.metadata);
  if (!force && ops.notified_at) {
    return { sent: false, skipped: 'dedupe' };
  }
  const recipient = notifyRecipient();
  const claimed = await claimNotifySlot(row.id, { reason, force });
  if (!claimed) return { sent: false, skipped: 'dedupe' };

  if (isTestMailbox(claimed.email) && !force) {
    await events.logEvent(row.id, 'human_escalation_notified', {
      payload: { skipped: 'test_mailbox', reason, source },
    });
    return { sent: false, skipped: 'test_mailbox' };
  }

  const email = buildEscalationEmail(claimed, { reason, source, locale });
  try {
    await sendEmail({
      to: recipient,
      subject: email.subject,
      body: email.body,
      tags: [{ name: 'category', value: 'support_escalation' }],
    });
    await events.logEvent(row.id, 'human_escalation_notified', {
      payload: { reason: String(reason || '').slice(0, 200), source },
    });
    return { sent: true };
  } catch (err) {
    console.error('[SUPPORT] escalation notify failed:', err.message);
    return { sent: false, error: err.message };
  }
}

async function requestHumanEscalation(id, {
  source = 'user',
  reason = 'user_requested',
  adminId = null,
  forceNotify = false,
} = {}) {
  const row = await loadMessage(id);
  if (!row) return null;
  if (row.status === 'archived') {
    const err = new Error('archived');
    err.statusCode = 410;
    err.code = 'ARCHIVED';
    throw err;
  }

  const { ops } = parseOps(row.metadata);
  const already = Boolean(ops.escalated_at);
  const eventType = source === 'user' ? 'human_escalation_requested' : 'human_escalation_auto';

  if (!already) {
    await events.logEvent(id, eventType, {
      adminId,
      payload: { reason: String(reason).slice(0, 200), source },
    });
  } else if (source === 'user') {
    await events.logEvent(id, 'human_escalation_requested', {
      adminId,
      payload: { reason: String(reason).slice(0, 200), source, repeat: true },
    });
  }

  const updated = await patchOps(id, {
    escalated_at: ops.escalated_at || new Date().toISOString(),
    escalation_reason: String(reason).slice(0, 200),
    escalation_source: source,
  });

  const locale = await resolveSupportLocale({
    metadata: row.metadata,
    familyId: row.family_id,
  });
  const explicitUserRepeat = source === 'user' && already;
  const shouldNotify = !ops.notified_at || forceNotify || explicitUserRepeat;
  if (shouldNotify && updated) {
    await notifyEscalation(updated, {
      reason,
      source,
      locale,
      force: forceNotify || explicitUserRepeat,
    });
  }
  return updated;
}

const RENOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function notifyOnNewUserInfo(id) {
  const row = await loadMessage(id);
  if (!row || row.status === 'archived') return { sent: false, skipped: 'inactive' };
  const { ops } = parseOps(row.metadata);
  if (!ops.escalated_at) return { sent: false, skipped: 'not_escalated' };
  if (ops.notified_at && Date.now() - new Date(ops.notified_at).getTime() < RENOTIFY_COOLDOWN_MS) {
    return { sent: false, skipped: 'cooldown' };
  }
  const locale = await resolveSupportLocale({
    metadata: row.metadata,
    familyId: row.family_id,
  });
  return notifyEscalation(row, {
    reason: 'new_user_info',
    source: 'user_follow_up',
    locale,
    force: true,
  });
}

async function humanTakeover(id, adminId) {
  const row = await loadMessage(id);
  if (!row) return null;
  const updated = await patchOps(id, {
    human_takeover_at: new Date().toISOString(),
    returned_to_agent_at: null,
  });
  await events.logEvent(id, 'human_takeover', {
    adminId,
    payload: { admin_id: adminId || null },
  });
  if (updated && updated.status === 'new') {
    await contactMessages.updateMessageStatus(id, 'in_progress', adminId);
  }
  return updated;
}

async function returnToAgent(id, adminId) {
  const updated = await patchOps(id, {
    human_takeover_at: null,
    returned_to_agent_at: new Date().toISOString(),
  });
  await events.logEvent(id, 'returned_to_agent', {
    adminId,
    payload: {},
  });
  return updated;
}

function agentMayReplyExternally(metadata) {
  return !isTakenOver(metadata);
}

async function autoEscalateStaleCases({ now = new Date(), slaHours = escalationSlaHours() } = {}) {
  const { rows } = await db.query(
    `SELECT id, metadata, status, created_at
     FROM contact_message
     WHERE status IN ('new', 'read', 'in_progress')
       AND archived_at IS NULL
       AND created_at < $1::timestamptz
       AND COALESCE(metadata->'support_ops'->>'escalated_at', '') = ''
     ORDER BY created_at ASC
     LIMIT 50`,
    [new Date(now.getTime() - slaHours * 3600000).toISOString()]
  );

  let escalated = 0;
  for (const row of rows) {
    if (isTakenOver(row.metadata)) continue;
    await requestHumanEscalation(row.id, {
      source: 'auto',
      reason: `sla_${slaHours}h`,
    });
    escalated += 1;
  }
  return { escalated, candidates: rows.length, slaHours };
}

module.exports = {
  META_KEY,
  parseOps,
  isTakenOver,
  isEscalated,
  requestHumanEscalation,
  notifyEscalation,
  notifyOnNewUserInfo,
  humanTakeover,
  returnToAgent,
  agentMayReplyExternally,
  autoEscalateStaleCases,
  adminInboxUrl,
  buildEscalationEmail,
};
