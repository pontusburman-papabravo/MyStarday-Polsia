'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildLegalLinkHref } = require('../src/lib/legal-return');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');

const ROOT = path.join(__dirname, '..');
const paywallJs = fs.readFileSync(path.join(ROOT, 'public/js/paywall.js'), 'utf8');
const paywallHtml = fs.readFileSync(path.join(ROOT, 'public/paywall.html'), 'utf8');
const legalReturnNavJs = fs.readFileSync(path.join(ROOT, 'public/js/legal-return-nav.js'), 'utf8');
const publicLangSwitcherJs = fs.readFileSync(path.join(ROOT, 'public/js/public-lang-switcher.js'), 'utf8');

describe('paywall legal navigation (App Review 3.1.2(c))', () => {
  test('paywall uses jurisdiction legal-routes API with returnTo (not locale-only shortcuts)', () => {
    assert.doesNotMatch(paywallHtml, /legal-routes\.js/i);
    assert.doesNotMatch(paywallJs, /resolvePaywallLegalRoutes|resolveInAppLegalRoutes/);
    assert.match(paywallJs, /\/api\/market\/legal-routes/);
    assert.match(paywallJs, /applyPaywallLegalLinks\(paywallCountryCode\)/);
    assert.match(paywallJs, /params\.set\('returnTo', '\/paywall'\)/);
  });

  test('paywall legal links do not use data-legal-* hooks that register sync can overwrite', () => {
    assert.doesNotMatch(paywallHtml, /data-legal-terms-link/);
    assert.doesNotMatch(paywallHtml, /data-legal-privacy-link/);
  });

  test('Swedish SE paywall jurisdiction maps to /terms and /privacy with returnTo', () => {
    const routes = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(
      buildLegalLinkHref(routes.terms, { returnTo: '/paywall', tier: 'yearly' }),
      '/terms?returnTo=%2Fpaywall&tier=yearly'
    );
    assert.equal(
      buildLegalLinkHref(routes.privacy, { returnTo: '/paywall', tier: 'yearly' }),
      '/privacy?returnTo=%2Fpaywall&tier=yearly'
    );
  });

  test('IE en-GB paywall jurisdiction keeps EEA legal routes with returnTo', () => {
    const routes = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    assert.equal(routes.terms, '/en/eea/terms');
    assert.equal(routes.privacy, '/en/eea/privacy');
    assert.equal(
      buildLegalLinkHref(routes.terms, { returnTo: '/paywall', tier: 'monthly' }),
      '/en/eea/terms?returnTo=%2Fpaywall&tier=monthly'
    );
  });

  test('FI sv-SE paywall jurisdiction maps to Swedish routes', () => {
    const routes = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(routes.terms, '/terms');
    assert.equal(routes.privacy, '/privacy');
  });

  test('IAP review IE account (en-GB) must not fall back to /en/terms mirror pages', () => {
    const routes = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    assert.notEqual(routes.terms, '/en/terms');
    assert.notEqual(routes.privacy, '/en/privacy');
  });

  test('paywall restores selected tier from return URL', () => {
    assert.match(paywallJs, /function readTierFromUrl/);
    assert.match(paywallJs, /readTierFromUrl\(\)/);
    assert.match(paywallJs, /selectedTier = tier/);
  });

  test('paywall refreshes legal hrefs when plan selection changes', () => {
    assert.match(paywallJs, /applyPaywallLegalLinks\(paywallCountryCode\)/);
  });

  test('legal pages wire legal-return-nav and suppress public language switcher in-app', () => {
    for (const rel of [
      'public/terms.html',
      'public/privacy.html',
      'public/en-terms.html',
      'public/en-privacy.html',
      'public/en/eea-terms.html',
      'public/en/eea-privacy.html',
    ]) {
      const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(html, /legal-return-nav\.js/, `${rel} must load legal-return-nav.js`);
    }
    assert.match(legalReturnNavJs, /data-legal-in-app-return/);
    assert.match(publicLangSwitcherJs, /hasInAppReturnContext/);
  });

  test('direct public /terms and /privacy remain valid without returnTo', () => {
    assert.match(fs.readFileSync(path.join(ROOT, 'public/terms.html'), 'utf8'), /href="\/" class="back-link"/);
    assert.equal(buildLegalLinkHref('/terms', {}), '/terms');
  });
});
