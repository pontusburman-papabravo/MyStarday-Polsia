'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { signSupportFollowUpToken } = require('../src/lib/support-follow-up-token');
const {
  generateRawToken,
  isOpaqueToken,
  containsMessageId,
  hashRaw,
} = require('../src/lib/support-reply-token');
const { redactSupportText } = require('../src/lib/log-redact');
const { buildPublicSupportThread } = require('../src/lib/support-thread');
const { resolveSupportAgentMode } = require('../config/support-agent');
const { LEGACY_TOKEN_SUNSET, NEW_TOKEN_EXPIRY_DAYS } = require('../config/support-reply-token');
const { SUPPORT_CACHE_CONTROL, SUPPORT_REFERRER_POLICY } = require('../src/lib/support-security-headers');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginAsAdmin(baseUrl, db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const { getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  assert.equal(loginRes.status, 200, await loginRes.text());
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const body = await loginRes.json();
  return { ...session, cookies, csrfToken: body.csrfToken };
}

async function insertCase(db, overrides = {}) {
  const { rows } = await db.query(
    `INSERT INTO contact_message (name, email, message, message_type, status, family_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, status, metadata`,
    [
      overrides.name || 'Anna',
      overrides.email || 'anna@example.com',
      overrides.message || 'Jag kan inte byta barnets namn',
      overrides.message_type || 'contact',
      overrides.status || 'new',
      overrides.family_id || null,
      JSON.stringify(overrides.metadata || { locale: 'sv-SE' }),
    ]
  );
  return rows[0];
}

describe('support opaque reply token — unit', () => {
  it('generates opaque sr1 tokens without message id', () => {
    const raw = generateRawToken();
    assert.equal(isOpaqueToken(raw), true);
    assert.equal(containsMessageId(raw), false);
    assert.equal(raw.includes('51'), false);
    assert.equal(hashRaw(raw).length, 64);
    assert.equal(NEW_TOKEN_EXPIRY_DAYS, 30);
    assert.equal(LEGACY_TOKEN_SUNSET, '2026-10-23');
  });

  it('redacts opaque and legacy tokens in logs', () => {
    const opaque = 'https://example.test/support/svar/sr1.abcdefghijklmnopqrstuvwxyz0123456789ABCD';
    const legacy = 'https://example.test/support/svar/sf1.51.signaturehere';
    const query = '/api/support/thread?token=sr1.abcdefghijklmnopqrstuvwxyz0123456789ABCD';
    assert.equal(redactSupportText(opaque), 'https://example.test/support/svar/[REDACTED]');
    assert.equal(redactSupportText(legacy), 'https://example.test/support/svar/[REDACTED]');
    assert.match(redactSupportText(query), /token=\[REDACTED\]/);
  });

  it('hides cursor_note and internal_note from public thread', () => {
    const thread = buildPublicSupportThread({
      createdAt: '2026-09-01T10:00:00.000Z',
      message: 'Hej från användaren',
      internalNote: 'Hemligt intern\n\n--- Svar 2026-09-01 10:10 ---\nSynligt svar',
      events: [
        {
          event_type: 'cursor_note',
          created_at: '2026-09-01T10:05:00.000Z',
          payload: { summary: 'Intern analys', body: 'får inte synas' },
        },
        {
          event_type: 'reply_sent',
          created_at: '2026-09-01T10:10:00.000Z',
          payload: { body: 'Synligt svar' },
        },
      ],
    });
    const bodies = thread.map((t) => t.body).join('\n');
    assert.match(bodies, /Hej från användaren/);
    assert.match(bodies, /Synligt svar/);
    assert.equal(bodies.includes('Hemligt'), false);
    assert.equal(bodies.includes('Intern analys'), false);
    assert.equal(bodies.includes('får inte synas'), false);
  });

  it('agent mode is ooo during window and normal after', () => {
    const prev = process.env.SUPPORT_AGENT_MODE;
    process.env.SUPPORT_AGENT_MODE = 'auto';
    assert.equal(resolveSupportAgentMode(new Date('2026-09-05T12:00:00+02:00')), 'ooo');
    assert.equal(resolveSupportAgentMode(new Date('2026-09-12T12:00:00+02:00')), 'normal');
    process.env.SUPPORT_AGENT_MODE = 'normal';
    assert.equal(resolveSupportAgentMode(new Date('2026-09-05T12:00:00+02:00')), 'normal');
    if (prev === undefined) delete process.env.SUPPORT_AGENT_MODE;
    else process.env.SUPPORT_AGENT_MODE = prev;
  });

  it('service worker does not cache support token routes', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    assert.match(sw, /\/support\/svar\//);
    assert.match(sw, /cache: 'no-store'/);
    assert.match(sw, /\/api\/support\/thread/);
  });
});

describe('support opaque reply token — http', () => {
  it('create, token isolation, follow-up, archive fail-closed, admin authz', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await registerAndLogin(http.baseUrl);
      const contactRes = await fetch(`${http.baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Parent',
          email: session.email,
          message: 'Jag behöver hjälp med schemat idag',
          locale: 'sv',
        }),
      });
      const contactBody = await contactRes.json();
      assert.equal(contactRes.status, 200, JSON.stringify(contactBody));
      assert.match(contactBody.threadUrl, /^\/support\/svar\/sr1\./);
      assert.equal(contactBody.threadUrl.includes(String(contactBody.id || '')), false);

      const raw = contactBody.threadUrl.split('/').pop();
      const hash = hashRaw(raw);
      const stored = await db.query(
        'SELECT token_hash, contact_message_id FROM contact_message_reply_token WHERE token_hash = $1',
        [hash]
      );
      assert.equal(stored.rows.length, 1);
      const rawInDb = await db.query(
        `SELECT 1 FROM contact_message_reply_token WHERE token_hash = $1`,
        [raw]
      );
      assert.equal(rawInDb.rows.length, 0);

      const page = await fetch(`${http.baseUrl}${contactBody.threadUrl}`);
      assert.equal(page.status, 200);
      assert.match(page.headers.get('cache-control') || '', /no-store/);
      assert.equal(page.headers.get('referrer-policy'), SUPPORT_REFERRER_POLICY);
      assert.match(page.headers.get('x-robots-tag') || '', /noindex/);
      assert.ok(SUPPORT_CACHE_CONTROL.includes('no-store'));
      const pageHtml = await page.text();
      assert.equal(pageHtml.includes('analytics-shim'), false);
      assert.equal(pageHtml.includes('meta-app-events'), false);

      const threadRes = await fetch(
        `${http.baseUrl}/api/support/thread?token=${encodeURIComponent(raw)}`
      );
      const threadBody = await threadRes.json();
      assert.equal(threadRes.status, 200, JSON.stringify(threadBody));
      assert.equal(threadBody.thread[0].role, 'user');
      assert.equal(Object.prototype.hasOwnProperty.call(threadBody, 'family_id'), false);
      assert.equal(JSON.stringify(threadBody).includes('cursor_note'), false);

      const other = await insertCase(db, { message: 'Annat ärende' });
      const otherIssued = await fetch(`${http.baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'B',
          email: 'other-support@example.com',
          message: 'Andra ärendet behöver också minst tio tecken',
        }),
      });
      const otherBody = await otherIssued.json();
      const otherRaw = otherBody.threadUrl.split('/').pop();
      const cross = await fetch(
        `${http.baseUrl}/api/support/thread?token=${encodeURIComponent(otherRaw)}`
      );
      const crossJson = await cross.json();
      assert.equal(cross.status, 200);
      assert.equal(
        JSON.stringify(crossJson.thread).includes('Jag behöver hjälp med schemat idag'),
        false
      );
      assert.ok(other.id || otherRaw);

      const follow = await fetch(`${http.baseUrl}/api/support/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: raw, message: 'Här är mer information om felet' }),
      });
      const followJson = await follow.json();
      assert.equal(follow.status, 200, JSON.stringify(followJson));
      assert.ok(followJson.thread.some((turn) => turn.body.includes('mer information')));

      const admin = await loginAsAdmin(http.baseUrl, db, session);
      const list = await fetch(`${http.baseUrl}/api/admin/contact-messages?q=schemat`, {
        headers: { Cookie: cookieHeader(admin.cookies) },
      });
      assert.equal(list.status, 200);

      const otherParent = await registerAndLogin(http.baseUrl);
      const parentDenied = await fetch(`${http.baseUrl}/api/admin/contact-messages`, {
        headers: { Cookie: cookieHeader(otherParent.cookies) },
      });
      assert.ok([401, 403].includes(parentDenied.status));

      const unauth = await fetch(`${http.baseUrl}/api/admin/contact-messages`);
      assert.ok([401, 403].includes(unauth.status));

      const childId = await createChild(http.baseUrl, admin, { pin: '4242' });
      const childLogin = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, pin: '4242' }),
      });
      if (childLogin.status === 200) {
        const { getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
        let childCookies = {};
        for (const header of getSetCookieHeaders(childLogin)) {
          childCookies = mergeCookies(childCookies, [header]);
        }
        const childDenied = await fetch(`${http.baseUrl}/api/admin/contact-messages`, {
          headers: { Cookie: cookieHeader(childCookies) },
        });
        assert.ok([401, 403].includes(childDenied.status));
      }

      const caseRow = (await db.query(
        `SELECT id FROM contact_message WHERE message LIKE 'Jag behöver hjälp med schemat%' ORDER BY id DESC LIMIT 1`
      )).rows[0];

      const noteRes = await fetch(`${http.baseUrl}/api/admin/contact-messages/${caseRow.id}/cursor-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(admin.cookies),
          'X-CSRF-Token': admin.csrfToken,
        },
        body: JSON.stringify({
          note: 'Troligen schema-förvirring',
          category: 'schedule_routine',
          confidence: 0.7,
        }),
      });
      assert.equal(noteRes.status, 201, await noteRes.text());

      const publicAfterNote = await fetch(
        `${http.baseUrl}/api/support/thread?token=${encodeURIComponent(raw)}`
      );
      const publicAfter = await publicAfterNote.json();
      assert.equal(JSON.stringify(publicAfter).includes('Troligen schema'), false);

      const escalate = await fetch(`${http.baseUrl}/api/support/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: raw }),
      });
      assert.equal(escalate.status, 200, await escalate.text());

      const takeover = await fetch(`${http.baseUrl}/api/admin/contact-messages/${caseRow.id}/takeover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(admin.cookies),
          'X-CSRF-Token': admin.csrfToken,
        },
        body: '{}',
      });
      assert.equal(takeover.status, 200, await takeover.text());

      const agentReply = await fetch(`${http.baseUrl}/api/admin/contact-messages/${caseRow.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(admin.cookies),
          'X-CSRF-Token': admin.csrfToken,
        },
        body: JSON.stringify({ body: 'Detta får inte skickas av agenten efter takeover', actor: 'cursor' }),
      });
      assert.equal(agentReply.status, 409);

      const contactDb = require('../db/contact-messages');
      await contactDb.archiveMessage(caseRow.id, { adminId: admin.id || null, auto: false });
      const archivedFollow = await fetch(`${http.baseUrl}/api/support/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: raw, message: 'Försöker öppna arkiverat ärende igen' }),
      });
      assert.ok([400, 410].includes(archivedFollow.status));
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('legacy sf1 redirects to opaque URL before sunset', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const row = await insertCase(db);
      const legacy = signSupportFollowUpToken(row.id);
      const res = await fetch(`${http.baseUrl}/support/svar/${legacy}`, { redirect: 'manual' });
      assert.ok([302, 303].includes(res.status), String(res.status));
      const location = res.headers.get('location') || '';
      assert.match(location, /\/support\/svar\/sr1\./);
      assert.equal(location.includes(legacy), false);
      assert.equal(location.includes(`sf1.${row.id}`), false);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('invalid and sunset tokens fail closed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const bad = await fetch(`${http.baseUrl}/api/support/thread?token=sr1.not-a-real-token-value-xxxxxx`);
      assert.ok([400, 410].includes(bad.status));
      const { verifyLegacyToken } = require('../src/lib/support-reply-token');
      const sunset = await verifyLegacyToken(signSupportFollowUpToken(1), {
        now: new Date('2026-10-24T12:00:00+02:00'),
      });
      assert.equal(sunset.ok, false);
      assert.equal(sunset.reason, 'sunset');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
