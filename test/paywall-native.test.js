'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Logic = require('../public/js/iap-native-client-logic');

const ROOT = path.join(__dirname, '..');
const paywallJs = fs.readFileSync(path.join(ROOT, 'public/js/paywall.js'), 'utf8');
const paywallHtml = fs.readFileSync(path.join(ROOT, 'public/paywall.html'), 'utf8');
const svLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
const enLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));

describe('paywall native subscription screen', () => {
  test('A: web mode hides native purchase UI and shows web notice', () => {
    assert.match(paywallJs, /function configureWebMode/);
    assert.match(paywallJs, /hide\(document\.getElementById\('paywallPlans'\)\)/);
    assert.match(paywallJs, /show\(document\.getElementById\('paywallWebNotice'\)\)/);
    assert.match(paywallJs, /hide\(document\.getElementById\('paywallNativeActions'\)\)/);
    assert.match(paywallJs, /if \(!isNative\(\)\)/);
    assert.match(paywallHtml, /id="paywallWebNotice"/);
    assert.match(paywallHtml, /id="paywallNativeActions"/);
  });

  test('B: native pricing requires IAPManager.canPurchase (fail-closed)', () => {
    assert.match(paywallJs, /if \(!IAPManager\.canPurchase\(\)\)/);
    assert.match(paywallJs, /setStatus\(t\('paywall\.statusUnavailable'\)/);
    assert.doesNotMatch(paywallJs, /localStorage/);
    assert.doesNotMatch(paywallJs, /magic|bypass|devButton/i);
  });

  test('C: native eligible path resolves monthly + yearly from offering', () => {
    assert.match(paywallJs, /Logic\.resolveOfferingTierDisplays/);
    assert.match(paywallJs, /renderTierPrices\(displays, config\)/);
    assert.match(paywallJs, /setPurchaseCtaEnabled\(true\)/);
    assert.match(paywallHtml, /id="planYearlyBtn"/);
    assert.match(paywallHtml, /id="planMonthlyBtn"/);
    assert.match(paywallHtml, /id="paywallPurchaseBtn"/);
  });

  test('D: exact package matching delegated to IapNativeClientLogic (no packages[0])', () => {
    assert.doesNotMatch(paywallJs, /packages\[0\]/);
    assert.doesNotMatch(paywallJs, /availablePackages\[0\]/);
    assert.match(paywallJs, /IAPManager\.purchasePackage\(selectedTier\)/);
    const managerSrc = fs.readFileSync(path.join(ROOT, 'public/js/iap-manager.js'), 'utf8');
    assert.match(managerSrc, /Logic\.pickPackageFromOffering/);
    assert.doesNotMatch(managerSrc, /packages\[0\]/);
  });

  test('E: trial offer metadata always uses ConditionalTrial (never KnownTrial)', () => {
    assert.equal(Logic.resolveTrialTermsKey(null, 14), 'ConditionalTrial');
    assert.equal(
      Logic.resolveTrialTermsKey({ introPriceString: '0,00 kr' }, 14),
      'ConditionalTrial'
    );
    assert.equal(Logic.resolveTrialTermsKey({ introPriceString: '0,00 kr' }, null), 'ConditionalTrial');
    assert.equal(Logic.resolveTrialTermsKey(null, 0), 'NoTrial');
    assert.notEqual(
      Logic.resolveTrialTermsKey({ introPriceString: '0,00 kr' }, 14),
      'KnownTrial'
    );
    assert.match(paywallJs, /Logic\.resolveTrialTermsKey/);
    assert.doesNotMatch(paywallJs, /tierTermsKey/);
  });

  test('F: restore purchases uses IAPManager.restorePurchases', () => {
    assert.match(paywallJs, /async function restorePurchases/);
    assert.match(paywallJs, /IAPManager\.restorePurchases\(\)/);
    assert.match(paywallJs, /t\('paywall\.restoreNone'\)/);
    assert.match(paywallHtml, /id="paywallRestoreBtn"/);
  });

  test('G: gift-card control hidden in native mode', () => {
    assert.match(paywallJs, /hide\(document\.getElementById\('giftCardBtn'\)\)/);
    assert.match(paywallJs, /hide\(document\.getElementById\('giftRedeemPanel'\)\)/);
    assert.match(paywallJs, /function configureNativeMode/);
    assert.match(paywallHtml, /id="giftCardBtn"/);
  });

  test('H: legal links use UI locale and in-app return params (not jurisdiction routing)', () => {
    assert.doesNotMatch(paywallJs, /fetchLegalRoutes\(['"]SE['"]/);
    assert.doesNotMatch(paywallJs, /syncRegisterLegalLinks/);
    assert.doesNotMatch(paywallJs, /sd_country_code/);
    assert.doesNotMatch(paywallJs, /CountryChoice/);
    assert.doesNotMatch(paywallJs, /LegalRoutes\.fetchLegalRoutes/);
    assert.doesNotMatch(paywallHtml, /data-legal-terms-link/);
    assert.doesNotMatch(paywallHtml, /legal-routes\.js/);
    assert.match(paywallJs, /function resolvePaywallLegalRoutes/);
    assert.match(paywallJs, /params\.set\('returnTo', '\/paywall'\)/);
    assert.match(paywallJs, /applyPaywallLegalLinks\(\)/);
    assert.match(paywallHtml, /id="paywallAutoRenew"/);

    const { resolveInAppLegalRoutes } = require('../src/lib/legal-routing');
    const svRoutes = resolveInAppLegalRoutes({ locale: 'sv-SE' });
    assert.equal(svRoutes.terms, '/terms');
    assert.equal(svRoutes.privacy, '/privacy');

    const enRoutes = resolveInAppLegalRoutes({ locale: 'en-GB' });
    assert.equal(enRoutes.terms, '/en/terms');
    assert.equal(enRoutes.privacy, '/en/privacy');
    assert.notEqual(enRoutes.terms, '/en/eea/terms');
  });

  test('I: purchase cannot double-submit', () => {
    assert.match(paywallJs, /let purchaseInProgress = false/);
    assert.match(paywallJs, /if \(purchaseInProgress \|\| !pricesReady\) return/);
    assert.match(paywallJs, /purchaseInProgress = true/);
    assert.match(paywallJs, /setPlanControlsDisabled\(true\)/);
    assert.match(paywallHtml, /id="paywallPurchaseBtn"[^>]*disabled/);
  });

  test('plan selection does not start purchase directly', () => {
    assert.match(paywallJs, /selectedTier = 'yearly'/);
    assert.match(paywallJs, /selectedTier = 'monthly'/);
    assert.match(paywallJs, /updatePlanSelection\(\)/);
    assert.doesNotMatch(paywallJs, /purchaseTier\(/);
    assert.match(paywallJs, /purchaseSelectedTier/);
    assert.match(paywallJs, /getElementById\('paywallPurchaseBtn'\)/);
  });

  test('loading state shown while prices fetch', () => {
    assert.match(paywallHtml, /id="paywallLoading"/);
    assert.match(paywallHtml, /paywall\.loadingPrices/);
    assert.match(paywallJs, /showLoadingPrices\(true\)/);
    assert.match(paywallJs, /setPurchaseCtaEnabled\(false\)/);
  });

  // Regression: renderTierPrices() built 'paywall.yearly' + termsKey / 'paywall.monthly' +
  // termsKey (missing the 'Terms' infix that every actual locale key uses —
  // paywall.yearlyTermsConditionalTrial / paywall.monthlyTermsConditionalTrial etc.).
  // Result: the raw i18n key rendered on screen instead of the subscription terms
  // sentence, discovered during physical-device App Store sandbox E2E testing.
  test('plan terms text uses the yearlyTerms/monthlyTerms key prefix (not yearly/monthly alone)', () => {
    assert.match(paywallJs, /t\('paywall\.yearlyTerms' \+ yearlyTermsKey/);
    assert.match(paywallJs, /t\('paywall\.monthlyTerms' \+ monthlyTermsKey/);
    assert.doesNotMatch(paywallJs, /t\('paywall\.yearly' \+ yearlyTermsKey/);
    assert.doesNotMatch(paywallJs, /t\('paywall\.monthly' \+ monthlyTermsKey/);
  });

  test('every possible resolveTrialTermsKey() result resolves to a real locale key (sv-SE + en-GB)', () => {
    const possibleSuffixes = ['ConditionalTrial', 'KnownTrial', 'NoTrial'];
    for (const suffix of possibleSuffixes) {
      for (const prefix of ['yearlyTerms', 'monthlyTerms']) {
        const key = `${prefix}${suffix}`;
        assert.ok(
          Object.prototype.hasOwnProperty.call(svLocale.paywall || {}, key),
          `sv-SE.json paywall.${key} must exist`
        );
        assert.ok(
          Object.prototype.hasOwnProperty.call(enLocale.paywall || {}, key),
          `en-GB.json paywall.${key} must exist`
        );
      }
    }
  });
});

describe('resolveTrialTermsKey', () => {
  test('introPriceString alone must not return KnownTrial', () => {
    assert.equal(
      Logic.resolveTrialTermsKey({ introPriceString: 'Free' }, 14),
      'ConditionalTrial'
    );
    assert.notEqual(
      Logic.resolveTrialTermsKey({ introPriceString: 'Free' }, 14),
      'KnownTrial'
    );
  });

  test('trial_days config alone is conditional only', () => {
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, 14), 'ConditionalTrial');
  });

  test('no trial configured', () => {
    assert.equal(Logic.resolveTrialTermsKey({ priceString: '59 kr' }, null), 'NoTrial');
  });
});
