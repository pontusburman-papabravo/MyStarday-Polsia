/**
 * In-app legal page return navigation (paywall → terms/privacy → paywall).
 * Allowlist must stay in sync with src/lib/legal-return.js.
 */
(function legalReturnNavModule() {
  'use strict';

  const ALLOWED_RETURN_PATHS = { '/paywall': true };
  const ALLOWED_TIERS = { monthly: true, yearly: true };

  function sanitizeReturnTo(input) {
    if (input == null || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed.startsWith('/') || trimmed.indexOf('//') === 0) return null;
    if (trimmed.indexOf('://') !== -1 || trimmed.indexOf('..') !== -1) return null;
    const pathOnly = trimmed.split('?')[0].split('#')[0];
    if (!ALLOWED_RETURN_PATHS[pathOnly]) return null;
    return pathOnly;
  }

  function sanitizeTier(input) {
    if (input == null || typeof input !== 'string') return null;
    const tier = input.trim().toLowerCase();
    return ALLOWED_TIERS[tier] ? tier : null;
  }

  function buildReturnUrl(returnTo, tier) {
    const path = sanitizeReturnTo(returnTo);
    if (!path) return null;
    const params = new URLSearchParams();
    const safeTier = sanitizeTier(tier);
    if (safeTier) params.set('tier', safeTier);
    const q = params.toString();
    return q ? path + '?' + q : path;
  }

  function backLabel() {
    const lang = (document.documentElement.lang || '').toLowerCase();
    return lang.indexOf('en') === 0 ? 'Back to Premium' : 'Tillbaka till Premium';
  }

  function initInAppReturnNav() {
    const params = new URLSearchParams(window.location.search || '');
    const returnTo = sanitizeReturnTo(params.get('returnTo'));
    if (!returnTo) return false;

    const backUrl = buildReturnUrl(returnTo, params.get('tier'));
    if (!backUrl) return false;

    document.documentElement.setAttribute('data-legal-in-app-return', '1');

    document.querySelectorAll('.back-link').forEach(function (el) {
      el.href = backUrl;
      el.textContent = '\u2190 ' + backLabel();
    });

    document.querySelectorAll('nav a.logo').forEach(function (el) {
      el.href = backUrl;
      el.setAttribute('aria-label', backLabel());
    });

    document.querySelectorAll('[data-public-lang-switcher]').forEach(function (el) {
      el.remove();
    });

    return true;
  }

  document.addEventListener('DOMContentLoaded', initInAppReturnNav);

  window.LegalReturnNav = {
    sanitizeReturnTo: sanitizeReturnTo,
    sanitizeTier: sanitizeTier,
    buildReturnUrl: buildReturnUrl,
    initInAppReturnNav: initInAppReturnNav,
  };
})();
