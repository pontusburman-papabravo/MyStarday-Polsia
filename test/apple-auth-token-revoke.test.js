'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Apple token revocation', () => {
  it('10) deletion path collects and revokes Apple refresh tokens', () => {
    const account = fs.readFileSync(path.join(ROOT, 'src/routes/family/account.js'), 'utf8');
    const deletion = fs.readFileSync(path.join(ROOT, 'src/lib/family-deletion.js'), 'utf8');
    const unlink = fs.readFileSync(path.join(ROOT, 'src/routes/account/identity.js'), 'utf8');
    assert.match(account, /collectAppleRefreshTokens/);
    assert.match(account, /revokeCollectedAppleTokens/);
    assert.match(deletion, /revokeAppleToken/);
    assert.match(deletion, /collectAppleRefreshTokens/);
    assert.match(unlink, /revokeCollectedAppleTokens/);
    assert.match(unlink, /apple_refresh_token = NULL/);
  });

  it('creates client secret JWT only when configured', () => {
    const prev = { ...process.env };
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_SIGN_IN_KEY_ID;
    delete process.env.APPLE_SIGN_IN_PRIVATE_KEY;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;
    delete require.cache[require.resolve('../src/lib/apple-token')];
    const appleToken = require('../src/lib/apple-token');
    assert.equal(appleToken.isAppleTokenRevocationConfigured(), false);
    assert.equal(appleToken.createAppleClientSecret('com.example'), null);
    Object.assign(process.env, prev);
  });

  it('exchange and revoke post to Apple token endpoints', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/apple-token.js'), 'utf8');
    assert.match(src, /https:\/\/appleid\.apple\.com\/auth\/token/);
    assert.match(src, /https:\/\/appleid\.apple\.com\/auth\/revoke/);
    assert.match(src, /grant_type: 'authorization_code'/);
    assert.match(src, /token_type_hint/);
    assert.match(src, /algorithm: 'ES256'/);
  });

  it('oauth capture uses authorizationCode from the same auth transaction', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/auth/oauth-apple.js'), 'utf8');
    assert.match(src, /persistAppleRefreshToken/);
    assert.match(src, /authorizationCode/);
    assert.match(src, /captureAppleRefreshToken/);
  });

  it('settings still expose in-app account deletion', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /id="deleteAccountBtn"/);
    assert.match(html, /\/api\/family\/delete-account/);
    assert.match(html, /Radera mitt konto/);
  });
});
