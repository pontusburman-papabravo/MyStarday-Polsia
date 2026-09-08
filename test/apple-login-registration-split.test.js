'use strict';

/**
 * Apple login vs register contract — App Review 2.1(a) regression guard.
 * Login must not attempt account creation; unknown Apple IDs route to registration.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('Apple login/register split (client contract)', () => {
  it('login Apple handler sends intent login and routes REGISTRATION_REQUIRED to register', () => {
    const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
    const start = login.indexOf('async function handleAppleLogin');
    assert.ok(start > 0);
    const fn = login.slice(start, login.indexOf('function openAppleLinkModal', start));
    assert.match(fn, /intent:\s*'login'/);
    assert.match(fn, /data\.code === 'REGISTRATION_REQUIRED'/);
    assert.match(fn, /\/register\?method=apple/);
    assert.doesNotMatch(fn, /status === 201/);
    assert.doesNotMatch(fn, /CountryChoice/);
    assert.doesNotMatch(fn, /RegistrationCountryGate/);
  });

  it('register Apple handler sends intent register and keeps country preflight', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    const fn = html.slice(html.indexOf('async function handleAppleRegister'));
    assert.match(fn, /intent:\s*'register'/);
    assert.match(fn, /RegisterAppleAuth\.preflight/);
  });

  it('register shows neutral hint when opened from login Apple flow', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    assert.match(html, /id="appleRegistrationHint"/);
    assert.match(html, /params\.get\('method'\) === 'apple'/);
    assert.match(html, /auth\.register\.appleFromLoginHint/);
  });
});
