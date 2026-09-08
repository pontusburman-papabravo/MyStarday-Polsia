/**
 * Admin contact messages — Fas 3A/3B inbox API.
 */
const express = require('express');
const contactMessages = require('../../../db/contact-messages');
const messageEvents = require('../../../db/contact-message-events');
const { sendEmail } = require('../../lib/email');
const { buildReplySubject, buildReplyBodies } = require('../../lib/contact-message-reply');
const { issueReplyToken, followUpUrl, revokeActiveTokens } = require('../../lib/support-reply-token');
const {
  requestHumanEscalation,
  humanTakeover,
  returnToAgent,
  agentMayReplyExternally,
} = require('../../lib/support-escalation');
const { resolveSupportLocale } = require('../../lib/support-locale');
const events = require('../../../db/contact-message-events');
const {
  ROOT_CAUSES,
  RESOLUTION_TYPES,
} = require('../../../config/support-taxonomy');
const config = require('../../lib/config');

const router = express.Router();

const VALID_TYPES = ['bug', 'feedback', 'contact', 'language'];
const VALID_INBOX = ['unread', 'active', 'answered', 'archived'];
const { isValidRootCause } = require('../../../config/support-taxonomy');
const { isValidQueue } = require('../../../config/support-queues');

router.get('/contact-messages', async (req, res, next) => {
  try {
    const type = VALID_TYPES.includes(req.query.type) ? req.query.type : undefined;
    const queue = isValidQueue(req.query.queue) ? req.query.queue : undefined;
    const status = contactMessages.MESSAGE_STATUSES.includes(req.query.status)
      ? req.query.status
      : undefined;
    const inbox = VALID_INBOX.includes(req.query.inbox) ? req.query.inbox : undefined;
    const followup = req.query.followup === '1' || req.query.followup === 'true';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
    const rootCause = isValidRootCause(req.query.root_cause) ? req.query.root_cause : undefined;
    const escalated = req.query.escalated === '1' || req.query.escalated === 'true';
    const limit = req.query.limit ? Math.min(Number(req.query.limit) || 100, 500) : 200;
    const rows = await contactMessages.listMessages({
      type,
      queue,
      status,
      inbox,
      followup,
      q: q || undefined,
      rootCause,
      escalated,
      limit,
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/unread-count', async (req, res, next) => {
  try {
    const counts = await contactMessages.getMessageCounts();
    res.json({
      unreadCount: counts.unread_count || 0,
      needsFollowUpCount: counts.needs_follow_up_count || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/counts', async (req, res, next) => {
  try {
    const counts = await contactMessages.getMessageCounts();
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/taxonomy', async (req, res) => {
  res.json({
    rootCauses: ROOT_CAUSES,
    resolutionTypes: RESOLUTION_TYPES,
  });
});

router.get('/contact-messages/analytics', async (req, res, next) => {
  try {
    const analytics = await contactMessages.getSupportAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/:id/events', async (req, res, next) => {
  try {
    const events = await messageEvents.listEventsForMessage(req.params.id);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/:id', async (req, res, next) => {
  try {
    const row = await contactMessages.getMessageDetail(req.params.id);
    if (!row) return res.status(404).json({ error: 'Ärendet hittades inte' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.patch('/contact-messages/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const row = await contactMessages.updateMessageStatus(
      req.params.id,
      status,
      req.user.id
    );
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Status uppdaterad', ...row });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/contact-messages/:id/family', async (req, res, next) => {
  try {
    const { family_id: familyId } = req.body || {};
    const row = await contactMessages.linkMessageFamily(
      req.params.id,
      familyId || null,
      req.user.id
    );
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Familjkoppling uppdaterad', ...row });
  } catch (err) {
    next(err);
  }
});

router.patch('/contact-messages/:id/resolution', async (req, res, next) => {
  try {
    const row = await contactMessages.saveResolution(
      req.params.id,
      req.body || {},
      req.user.id
    );
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Klassificering sparad', ...row });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/contact-messages/:id/archive', async (req, res, next) => {
  try {
    const body = req.body || {};
    const row = await contactMessages.archiveMessage(req.params.id, {
      adminId: req.user.id,
      auto: false,
      resolution: body,
    });
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Ärendet arkiverat', ...row });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.put('/contact-messages/:id/read', async (req, res, next) => {
  try {
    const { is_read: isRead } = req.body || {};
    if (typeof isRead !== 'boolean') {
      return res.status(400).json({ error: 'is_read krävs (boolean)' });
    }
    const row = await contactMessages.setMessageRead(req.params.id, isRead, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: isRead ? 'Markerat som läst' : 'Markerat som oläst', ...row });
  } catch (err) {
    next(err);
  }
});

router.put('/contact-messages/:id/note', async (req, res, next) => {
  try {
    const { note } = req.body || {};
    const row = await contactMessages.saveMessageNote(req.params.id, note, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Anteckning sparad', ...row });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/reply', async (req, res, next) => {
  try {
    const { body } = req.body || {};
    const replyBody = typeof body === 'string' ? body.trim() : '';
    if (replyBody.length < 10) {
      return res.status(400).json({ error: 'Svaret måste vara minst 10 tecken' });
    }
    if (replyBody.length > 5000) {
      return res.status(400).json({ error: 'Svaret får vara högst 5000 tecken' });
    }

    const message = await contactMessages.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Meddelandet hittades inte' });

    const recipientEmail = String(message.email || '').trim().toLowerCase();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'Meddelandet saknar giltig e-postadress att svara till' });
    }

    const actor = req.body?.actor === 'cursor' ? 'cursor' : 'admin';
    if (actor === 'cursor' && !agentMayReplyExternally(message.metadata || {})) {
      return res.status(409).json({ error: 'Ärendet är övertaget av människa — agenten får inte svara externt' });
    }
    if (message.status === 'archived') {
      return res.status(410).json({ error: 'Ärendet är arkiverat' });
    }

    const locale = await resolveSupportLocale({
      metadata: message.metadata,
      familyId: message.family_id,
    });
    const issued = await issueReplyToken(message.id, { createdBy: actor === 'cursor' ? 'cursor' : 'admin' });
    const subject = buildReplySubject(message.message_type, locale);
    const { text, html } = buildReplyBodies({
      recipientName: message.name,
      originalMessage: message.message,
      replyBody,
      followUpUrl: followUpUrl(issued.raw),
      locale,
    });

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject,
      body: text,
      html,
      from: `${config.email.fromName} <${config.email.from}>`,
      tags: [{ name: 'category', value: 'support_reply' }],
    });

    if (!emailResult.success) {
      return res.status(502).json({
        error: emailResult.error || 'Kunde inte skicka e-post',
      });
    }

    const row = await contactMessages.recordMessageReply(message.id, {
      replyBody,
      adminId: req.user.id,
      emailId: emailResult.emailId || null,
      actor,
    });

    console.log(
      `[ADMIN] Contact reply sent for message ${message.id} by admin ${req.user.id} to ${recipientEmail}`
    );

    res.json({
      message: 'Svar skickat',
      emailId: emailResult.emailId || null,
      ...row,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/cursor-note', async (req, res, next) => {
  try {
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (note.length < 3) {
      return res.status(400).json({ error: 'cursor_note måste vara minst 3 tecken' });
    }
    const message = await contactMessages.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    const payload = {
      summary: note.slice(0, 4000),
      category: typeof req.body?.category === 'string' ? req.body.category.slice(0, 64) : null,
      confidence: typeof req.body?.confidence === 'number' ? req.body.confidence : null,
      probable_root_cause: typeof req.body?.probable_root_cause === 'string'
        ? req.body.probable_root_cause.slice(0, 128)
        : null,
      escalate: req.body?.escalate === true,
      recommended_action: typeof req.body?.recommended_action === 'string'
        ? req.body.recommended_action.slice(0, 500)
        : null,
    };
    const event = await events.logEvent(message.id, 'cursor_note', {
      adminId: req.user.id,
      payload,
    });
    res.status(201).json({ message: 'Intern cursor_note sparad', event });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/escalate', async (req, res, next) => {
  try {
    const row = await requestHumanEscalation(req.params.id, {
      source: req.body?.source === 'auto' ? 'auto' : 'agent',
      reason: req.body?.reason || 'agent_escalation',
      adminId: req.user.id,
      forceNotify: req.body?.force_notify === true,
    });
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Eskalerat', ...row });
  } catch (err) {
    if (err.statusCode === 410) return res.status(410).json({ error: 'Ärendet är arkiverat' });
    next(err);
  }
});

router.post('/contact-messages/:id/takeover', async (req, res, next) => {
  try {
    const row = await humanTakeover(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Övertaget', ...row });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/return-to-agent', async (req, res, next) => {
  try {
    const row = await returnToAgent(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Tillbaka till agenten', ...row });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/reply-token/revoke', async (req, res, next) => {
  try {
    const message = await contactMessages.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    const revoked = await revokeActiveTokens(message.id, { reason: 'admin_revoke' });
    res.json({ message: 'Svarslänkar spärrade', revoked: revoked.length });
  } catch (err) {
    next(err);
  }
});

router.post('/contact-messages/:id/reply-token/regenerate', async (req, res, next) => {
  try {
    const message = await contactMessages.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    if (message.status === 'archived') {
      return res.status(410).json({ error: 'Ärendet är arkiverat' });
    }
    await revokeActiveTokens(message.id, { reason: 'admin_regenerate' });
    const issued = await issueReplyToken(message.id, { createdBy: 'admin' });
    res.json({
      message: 'Ny svarslänk skapad',
      followUpUrl: followUpUrl(issued.raw),
      expiresAt: issued.row.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/contact-messages/:id', async (req, res, next) => {
  try {
    const row = await contactMessages.deleteMessage(req.params.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Meddelandet har tagits bort' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
