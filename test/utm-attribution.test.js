'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RegisterSchema } = require('../src/lib/schemas');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('signup attribution (utm)', () => {
  it('RegisterSchema accepts optional utm fields', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'morgon-lugn-jun26',
      fbclid: 'abc123',
    });
    assert.equal(parsed.utm_source, 'meta');
    assert.equal(parsed.utm_medium, 'paid');
    assert.equal(parsed.utm_campaign, 'morgon-lugn-jun26');
    assert.equal(parsed.fbclid, 'abc123');
  });

  it('RegisterSchema works without utm fields', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    });
    assert.equal(parsed.utm_source, undefined);
  });

  it('RegisterSchema accepts platform + first_touch_at', () => {
    const parsed = RegisterSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      platform: 'ios',
      first_touch_at: '2026-06-01T12:00:00.000Z',
    });
    assert.equal(parsed.platform, 'ios');
    assert.equal(parsed.first_touch_at, '2026-06-01T12:00:00.000Z');
  });

  it('utm-capture client stores platform and omits fbclid persistence', () => {
    const src = read('public/js/utm-capture.js');
    assert.match(src, /detectPlatform/);
    assert.match(src, /toRegisterFields/);
    assert.match(src, /applyToPayload/);
    assert.match(src, /landing_locale/);
    assert.doesNotMatch(src, /fbclid/);
  });

  it('login and register load utm-capture before oauth payload helper', () => {
    const login = read('public/login.html');
    const register = read('public/register.html');
    const oauth = read('public/js/oauth-registration-payload.js');
    assert.match(login, /utm-capture\.js/);
    assert.match(register, /utm-capture\.js/);
    assert.ok(login.indexOf('utm-capture.js') < login.indexOf('oauth-registration-payload.js'));
    assert.match(oauth, /UtmCapture\.applyToPayload/);
  });

  it('platform-html injects utm-capture on pages that lack it', () => {
    const { injectPlatformHtml } = require('../src/middleware/platform-html');
    const html = injectPlatformHtml('<!doctype html><html><head></head><body></body></html>', '/bildschema-app');
    assert.match(html, /\/js\/utm-capture\.js/);
  });

  it('oauth signup writers still read req.body utm_* without a new path', () => {
    const apple = read('src/routes/auth/oauth-apple.js');
    const google = read('src/routes/auth/oauth-google.js');
    const oauthParent = read('src/lib/create-oauth-parent.js');
    assert.match(apple, /utm_source:\s*req\.body\.utm_source/);
    assert.match(google, /utm_source:\s*req\.body\.utm_source/);
    assert.match(oauthParent, /recordFamilyAttribution/);
  });

  it('landing query UTMs survive until toRegisterFields', () => {
    const { runInNewContext } = require('node:vm');
    const store = Object.create(null);
    const window = {
      location: {
        search: '?utm_source=meta&utm_medium=paid_social&utm_campaign=activation_wave_01',
        pathname: '/',
        hostname: 'localhost',
      },
      localStorage: {
        getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
      },
      document: { documentElement: { lang: 'sv-SE' } },
      matchMedia() { return { matches: false }; },
    };
    const sandbox = { window, document: window.document };
    runInNewContext(read('public/js/utm-capture.js'), sandbox);
    window.location.search = '';
    const fields = window.UtmCapture.toRegisterFields();
    assert.equal(fields.utm_source, 'meta');
    assert.equal(fields.utm_medium, 'paid_social');
    assert.equal(fields.utm_campaign, 'activation_wave_01');
    const payload = window.UtmCapture.applyToPayload({ idToken: 'x' });
    assert.equal(payload.utm_source, 'meta');
    assert.equal(payload.idToken, 'x');
  });
});
