/**
 * Test suite for welcome-mailer.js
 * Run with: node --test test/welcome-mailer.test.js
 *
 * welcome-mailer.js now delegates to sendEmail() (Polsia proxy) — no node-fetch.
 * Global fetch is mocked so sendEmail() hits our mock instead of the real proxy.
 */

const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ─── Env must be set BEFORE loading the mailer ─────────────────────────────────
process.env.POLSIA_API_KEY = 'test-key';
process.env.APP_URL = 'https://mystarday.se';

// ─── Mock DB — pattern-based matching for robustness ──────────────────────────
let mockChildRow = null;     // child name lookup row
let mockTemplateRow = null; // welcome_email_template row
let mockUnsubRow = null;    // unsubscribe_token row

const mockDb = {
  query: async (sql, params) => {
    const short = sql.replace(/\n/g, ' ').slice(0, 60);
    if (sql.includes('welcome_email_template')) return { rows: mockTemplateRow ? [mockTemplateRow] : [] };
    if (sql.includes('email_subscriptions') && sql.includes('unsubscribe_token')) return { rows: mockUnsubRow ? [mockUnsubRow] : [] };
    if (sql.includes('JOIN parent_child')) {
      // Child name lookup (SELECT c.name FROM child c JOIN parent_child ...)
      if (mockChildRow) return { rows: [mockChildRow] };
      return { rows: [] };
    }
    // console.log('[MOCK] unhandled:', short);  // Uncomment to debug
    return { rows: [] };
  },
};

// Patch the db module (repo-relative — works in any checkout)
const dbAbsPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbAbsPath] = { exports: mockDb };

// ─── Mock global fetch (used by sendEmail in email.js) ─────────────────────────
let capturedBody = null;
const originalFetch = global.fetch;

global.fetch = async (url, opts) => {
  if (url === 'https://polsia.com/api/proxy/email/send') {
    capturedBody = opts?.body ? JSON.parse(opts.body) : null;
    return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' };
  }
  return originalFetch(url, opts);
};

// ─── Load the mailer (env must be set before this line) ────────────────────────
const wfAbsPath = path.join(__dirname, '../src/lib/welcome-mailer.js');
delete require.cache[require.resolve(wfAbsPath)];
const { sendWelcomeEmail } = require(wfAbsPath);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setMockRows({ template, child, unsub }) {
  mockTemplateRow = template || null;
  mockChildRow    = child    || null;
  mockUnsubRow    = unsub    || null;
}

function clearMockRows() {
  mockTemplateRow = null;
  mockChildRow    = null;
  mockUnsubRow    = null;
}

function getRequestBody() {
  return capturedBody;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe('sendWelcomeEmail', () => {

  beforeEach(() => {
    clearMockRows();
    capturedBody = null;
  });

  // ── Polsia proxy receives correct payload ──────────────────────────────────
  it('sends email via Polsia proxy with to, from, replyTo, subject, body, html', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}', body: 'Välkommen!' },
      unsub: { unsubscribe_token: 'tok123' },
    });

    await sendWelcomeEmail('anna@example.com', 'pid-1', { foralderns_namn: 'Anna' });

    const body = getRequestBody();
    assert.ok(body, 'Request was made to Polsia proxy');
    assert.strictEqual(body.to, 'anna@example.com');
    assert.strictEqual(body.subject, 'Hej Anna');
    assert.ok(body.html && body.html.includes('Välkommen!'));
    assert.ok(body.from && body.from.includes('info@mystarday.se'));
    assert.ok(body.replyTo && body.replyTo.includes('info@mystarday.se'));
  });

  // ── Template must be read from welcome_email_template (is_active) ─────────
  it('queries ONLY welcome_email_template (not email_templates) for the template', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Body' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    // DB mock only matches welcome_email_template — if email_templates were
    // queried, mock returns { rows: [] } and send fails.
    assert.strictEqual(capturedBody.to, 'parent@test.com', 'Email was sent — welcome_email_template was found');
  });

  it('skips send gracefully when no active template exists', async () => {
    setMockRows({ template: null });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'No active template found');
    assert.strictEqual(capturedBody, null, 'Polsia proxy must not be called');
  });

  // ── Child name lookup when barnets_namn is not provided ───────────────────
  it('looks up child name from DB when barnets_namn is empty in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
      child: { name: 'Leo' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid-abc', { foralderns_namn: 'Anna' });

    const body = getRequestBody();
    assert.ok(body, 'Email was sent');
    assert.ok(body.subject.includes('Leo'), `Subject must contain resolved child name "Leo", got: ${body.subject}`);
    assert.ok(body.html.includes('Leo'), 'Body must contain resolved child name "Leo"');
  });

  it('does NOT look up child name when barnets_namn is already provided in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', {
      foralderns_namn: 'Anna',
      barnets_namn: 'Maja',
    });

    const body = getRequestBody();
    assert.ok(body, 'Email was sent');
    assert.ok(body.html.includes('Maja'), 'Body must use provided barnets_namn "Maja"');
    assert.ok(body.subject.includes('Maja'), 'Subject must use provided name "Maja"');
  });

  it('handles empty child result gracefully (no linked child at registration time)', async () => {
    setMockRows({
      template: { subject: 'Ämne {{barnets_namn}}', body: 'Body {{barnets_namn}}' },
      unsub: { unsubscribe_token: 'tok' },
      child: null,
    });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Anna' });

    assert.strictEqual(result.success, true, 'Email must still send even with no child');
    const body = getRequestBody();
    assert.ok(!body.subject.includes('{{barnets_namn}}'), 'Subject must not contain unsubstituted {{barnets_namn}}');
  });

  // ── Variable substitution ──────────────────────────────────────────────────
  it('substitutes foralderns_namn in subject and body', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}!', body: 'Välkommen {{foralderns_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Karin' });

    const body = getRequestBody();
    assert.ok(body.subject.includes('Karin'), 'Subject must contain "Karin"');
    assert.ok(body.html.includes('Karin'), 'Body must contain "Karin"');
  });

  // ── Error handling when POLSIA_API_KEY is not set ─────────────────────────
  it('skips send and returns error when Polsia proxy returns failure', async () => {
    // Override fetch to return failure
    const prevFetch = global.fetch;
    global.fetch = async (url, opts) => {
      if (url === 'https://polsia.com/api/proxy/email/send') {
        return { ok: false, status: 401, text: async () => 'No API key', json: async () => ({}) };
      }
      return prevFetch(url, opts);
    };

    setMockRows({
      template: { subject: 'Test', body: 'Body' },
    });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.ok(result.error, 'Error must be returned');

    global.fetch = prevFetch;
  });

  // ── Unsubscribe URL is present in HTML footer ──────────────────────────────
  it('includes unsubscribe URL in email HTML footer', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Hej!' },
      unsub: { unsubscribe_token: 'tok-abc123' },
    });

    await sendWelcomeEmail('test@example.com', 'pid', { foralderns_namn: 'Test' });

    const body = getRequestBody();
    assert.ok(
      body.html.includes('/api/newsletter/unsubscribe?token=tok-abc123'),
      'HTML footer must include unsubscribe URL'
    );
  });
});