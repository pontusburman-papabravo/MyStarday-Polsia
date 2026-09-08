'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { signSupportFollowUpToken } = require('../src/lib/support-follow-up-token');
const { SUPPORT_CACHE_CONTROL, SUPPORT_REFERRER_POLICY } = require('../src/lib/support-security-headers');

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
  const loginText = await loginRes.text();
  assert.equal(loginRes.status, 200, loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const body = JSON.parse(loginText);
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

describe('support opaque reply token — http', () => {
  it('create, token isolation, follow-up, archive fail-closed, admin authz', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const { hashRaw } = require('../src/lib/support-reply-token');
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
      assert.match(contactBody.threadUrl, /^\/support\/svar\/sr1\.[A-Za-z0-9_-]{40,}$/);
      assert.equal(Object.prototype.hasOwnProperty.call(contactBody, 'id'), false);

      const raw = contactBody.threadUrl.split('/').pop();
      const hash = hashRaw(raw);
      const stored = await db.query(
        'SELECT token_hash, contact_message_id FROM contact_message_reply_token WHERE token_hash = $1',
        [hash]
      );
      assert.equal(stored.rows.length, 1);
      const tokenBody = raw.slice('sr1.'.length);
      assert.equal(/^\d+$/.test(tokenBody), false);
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
      const wellFormedUnknown = `sr1.${'A'.repeat(43)}`;
      const bad = await fetch(
        `${http.baseUrl}/api/support/thread?token=${encodeURIComponent(wellFormedUnknown)}`
      );
      assert.ok([400, 410].includes(bad.status), `unexpected status ${bad.status}`);
      const malformed = await fetch(`${http.baseUrl}/api/support/thread?token=sf1.not-an-id.x`);
      assert.ok([400, 410].includes(malformed.status), `unexpected status ${malformed.status}`);
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
