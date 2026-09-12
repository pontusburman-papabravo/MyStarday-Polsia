'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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

const ROOT = path.join(__dirname, '..');

describe('support opaque reply token — unit', () => {
  it('generates opaque sr1 tokens without an all-digit message-id body', () => {
    const raw = generateRawToken();
    assert.match(raw, /^sr1\.[A-Za-z0-9_-]{40,}$/);
    assert.equal(isOpaqueToken(raw), true);
    assert.equal(containsMessageId(raw), false);
    assert.equal(hashRaw(raw).length, 64);
    assert.equal(NEW_TOKEN_EXPIRY_DAYS, 30);
    assert.equal(LEGACY_TOKEN_SUNSET, '2026-10-23');
  });

  it('containsMessageId is true only for all-digit opaque bodies', () => {
    const allDigitOpaque = `sr1.${'9'.repeat(40)}`;
    const substring51 = `sr1.${'A'.repeat(20)}51${'B'.repeat(20)}`;
    const shortDigits = 'sr1.51';
    const legacy = 'sf1.51.signaturehere';
    assert.equal(isOpaqueToken(allDigitOpaque), true);
    assert.equal(containsMessageId(allDigitOpaque), true);
    assert.equal(isOpaqueToken(substring51), true);
    assert.equal(containsMessageId(substring51), false);
    assert.equal(containsMessageId(shortDigits), false);
    assert.equal(containsMessageId(legacy), false);
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
    const bodies = thread.map((turn) => turn.body).join('\n');
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
