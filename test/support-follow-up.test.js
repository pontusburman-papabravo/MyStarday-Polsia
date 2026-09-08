'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('support follow-up link', () => {
  it('legacy signer still verifies numeric message id', () => {
    const { signSupportFollowUpToken, verifySupportFollowUpToken } = require('../src/lib/support-follow-up-token');
    const token = signSupportFollowUpToken(51);
    const ok = verifySupportFollowUpToken(token);
    assert.equal(ok.ok, true);
    assert.equal(ok.messageId, 51);
    assert.equal(verifySupportFollowUpToken(token.slice(0, -1) + 'x').ok, false);
    assert.match(token, /^sf1\.51\./);
  });

  it('new issuer is opaque and wired to public routes', () => {
    const { generateRawToken, isOpaqueToken, followUpUrl } = require('../src/lib/support-reply-token');
    const raw = generateRawToken();
    assert.equal(isOpaqueToken(raw), true);
    assert.match(followUpUrl(raw), /\/support\/svar\/sr1\./);
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/support-follow-up.js'), 'utf8');
    const pages = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    const csrf = fs.readFileSync(path.join(ROOT, 'src/middleware/csrf.js'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(route, /router\.get\('\/thread'/);
    assert.match(route, /router\.post\('\/follow-up'/);
    assert.match(route, /router\.post\('\/escalate'/);
    assert.match(pages, /\/support\/svar\/:token/);
    assert.match(csrf, /\/support\/follow-up/);
    assert.match(index, /api\/support/);
  });

  it('builds a public thread from original + events without leaking notes', () => {
    const { buildPublicSupportThread } = require('../src/lib/support-thread');
    const thread = buildPublicSupportThread({
      createdAt: '2026-08-31T10:00:00.000Z',
      message: 'Jag kan inte byta namn\n\n--- Användarsvar 2026-08-31 11:00 ---\nFortfarande samma',
      internalNote: 'Ringde skolan\n\n--- Svar 2026-08-31 10:30 ---\nGå till Familj\n(Resend: abc)',
      events: [
        {
          event_type: 'reply_sent',
          created_at: '2026-08-31T10:30:00.000Z',
          payload: { body: 'Gå till Familj', email_id: 'abc' },
        },
        {
          event_type: 'user_reply',
          created_at: '2026-08-31T11:00:00.000Z',
          payload: { body: 'Fortfarande samma' },
        },
      ],
    });
    assert.deepEqual(thread.map((turn) => turn.role), ['user', 'support', 'user']);
    assert.equal(thread[0].body, 'Jag kan inte byta namn');
    assert.equal(thread[1].body, 'Gå till Familj');
    assert.equal(thread[2].body, 'Fortfarande samma');
    assert.equal(thread.some((turn) => /Ringde|Resend/.test(turn.body)), false);
  });

  it('receipt and reply emails use i18n and opaque URL placeholder', () => {
    const { buildReceiptBodies, shouldSendSupportReceipt } = require('../src/lib/support-receipt');
    assert.equal(shouldSendSupportReceipt('landing-share@example.se'), false);
    assert.equal(shouldSendSupportReceipt('parent@example.com'), true);
    const sv = buildReceiptBodies({
      recipientName: 'Anna',
      followUpUrl: 'https://example.test/support/svar/sr1.opaque',
      locale: 'sv',
    });
    assert.match(sv.subject, /ärende/i);
    assert.match(sv.text, /example\.test\/support\/svar\/sr1\.opaque/);
    assert.equal(sv.text.includes('sf1.'), false);
    const en = buildReceiptBodies({
      recipientName: 'Anna',
      followUpUrl: 'https://example.test/support/svar/sr1.opaque',
      locale: 'en',
    });
    assert.match(en.html, /Open your conversation/);
    const { buildReplyBodies, buildReplySubject } = require('../src/lib/contact-message-reply');
    assert.match(buildReplySubject('contact', 'en-GB'), /Your message/);
    const reply = buildReplyBodies({
      recipientName: 'Anna',
      originalMessage: 'Hej',
      replyBody: 'Gör så här',
      followUpUrl: 'https://example.test/support/svar/sr1.opaque',
      locale: 'en-GB',
    });
    assert.match(reply.html, /Open the conversation/);
  });

  it('sv and en support locale trees include follow-up keys', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));
    for (const key of ['invalid', 'expired', 'revoked', 'archived', 'legacySunset']) {
      assert.ok(sv.support.errors[key]);
      assert.ok(en.support.errors[key]);
    }
    assert.ok(sv.support.page.needHuman);
    assert.ok(en.support.page.needHuman);
  });
});
