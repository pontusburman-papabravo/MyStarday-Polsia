'use strict';

/**
 * SUPERSEDED 2026-09-08 split is now a regression guard in the opposite direction.
 * Login must keep the first Apple credential and must not bounce to /register?method=apple.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Apple login keeps the first Authentication Services credential', () => {
  it('login Apple handler completes or asks for country/terms without a second authorize', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    const start = login.indexOf('async function handleAppleLogin');
    assert.ok(start > 0);
    const fn = login.slice(start, login.indexOf('document.getElementById(\'appleCompletionSubmitBtn\')', start));
    assert.match(fn, /AppleAuthSession\.remember/);
    assert.match(fn, /APPLE_ACCOUNT_COMPLETION_REQUIRED|isCompletionRequired/);
    assert.doesNotMatch(fn, /REGISTRATION_REQUIRED/);
    assert.doesNotMatch(fn, /\/register\?method=apple/);
    assert.match(fn, /appleSignIn\.signIn/);
    assert.equal((fn.match(/appleSignIn\.signIn/g) || []).length, 1);
  });

  it('register Apple handler sends intent register and keeps country + terms preflight', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    const fn = html.slice(html.indexOf('async function handleAppleRegister'));
    assert.match(fn, /intent:\s*'register'/);
    assert.match(fn, /RegisterAppleAuth\.preflight/);
    assert.match(fn, /AppleAuthSession\.remember/);
  });

  it('legacy ?method=apple hides email/password identity fields', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    assert.match(html, /id="appleRegistrationHint"/);
    assert.match(html, /params\.get\('method'\) === 'apple'/);
    assert.match(html, /hideEmailPasswordIdentityFields/);
  });
});
