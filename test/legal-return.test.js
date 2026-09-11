'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  sanitizeReturnTo,
  sanitizeTier,
  buildReturnUrl,
  buildLegalLinkHref,
} = require('../src/lib/legal-return');
const { resolveInAppLegalRoutes } = require('../src/lib/legal-routing');

const ROOT = path.join(__dirname, '..');
const clientSrc = fs.readFileSync(path.join(ROOT, 'public/js/legal-return-nav.js'), 'utf8');

describe('legal-return allowlist', () => {
  it('accepts /paywall only', () => {
    assert.equal(sanitizeReturnTo('/paywall'), '/paywall');
    assert.equal(sanitizeReturnTo('/settings'), null);
    assert.equal(sanitizeReturnTo('/dashboard'), null);
  });

  it('rejects open redirects and protocol tricks', () => {
    assert.equal(sanitizeReturnTo('https://evil.example/phish'), null);
    assert.equal(sanitizeReturnTo('//evil.example'), null);
    assert.equal(sanitizeReturnTo('/paywall/../login'), null);
    assert.equal(sanitizeReturnTo('/paywall?next=/admin'), '/paywall');
  });

  it('accepts monthly/yearly tier only', () => {
    assert.equal(sanitizeTier('yearly'), 'yearly');
    assert.equal(sanitizeTier('MONTHLY'), 'monthly');
    assert.equal(sanitizeTier('lifetime'), null);
  });

  it('buildReturnUrl preserves tier on paywall', () => {
    assert.equal(buildReturnUrl('/paywall', 'yearly'), '/paywall?tier=yearly');
    assert.equal(buildReturnUrl('/paywall', 'bad'), '/paywall');
    assert.equal(buildReturnUrl('/login', 'yearly'), null);
  });

  it('buildLegalLinkHref encodes returnTo and tier', () => {
    assert.equal(
      buildLegalLinkHref('/terms', { returnTo: '/paywall', tier: 'monthly' }),
      '/terms?returnTo=%2Fpaywall&tier=monthly'
    );
    assert.equal(buildLegalLinkHref('/terms', { returnTo: 'https://evil.test' }), '/terms');
  });

  it('client mirror keeps the same /paywall allowlist', () => {
    assert.match(clientSrc, /ALLOWED_RETURN_PATHS = \{ '\/paywall': true \}/);
    assert.match(clientSrc, /ALLOWED_TIERS = \{ monthly: true, yearly: true \}/);
  });
});

describe('resolveInAppLegalRoutes', () => {
  it('sv-SE uses Swedish public legal pages', () => {
    const routes = resolveInAppLegalRoutes({ locale: 'sv-SE' });
    assert.equal(routes.terms, '/terms');
    assert.equal(routes.privacy, '/privacy');
  });

  it('en-GB uses English mirror pages, not EEA jurisdiction marketing pages', () => {
    const routes = resolveInAppLegalRoutes({ locale: 'en-GB' });
    assert.equal(routes.terms, '/en/terms');
    assert.equal(routes.privacy, '/en/privacy');
    assert.notEqual(routes.terms, '/en/eea/terms');
  });
});
