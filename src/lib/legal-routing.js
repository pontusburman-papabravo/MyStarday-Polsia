'use strict';

/**
 * Legal document routing by jurisdiction (country_code + market_region), not locale alone.
 * See docs/international-expansion-v1-engineering-spec.md
 */

const { normalizeCountryCode, MARKET_REGIONS } = require('./market-region');
const { normalizeLocale } = require('./locale');

/**
 * @param {{ countryCode?: string|null, marketRegion?: string|null, locale?: string|null }} input
 * @returns {{ privacy: string, terms: string, childPrivacy: string|null, tracking: string|null, status: 'live'|'placeholder'|'draft' }}
 */
function resolveLegalRoutes(input = {}) {
  const countryCode = normalizeCountryCode(input.countryCode) || 'SE';
  const marketRegion = input.marketRegion || MARKET_REGIONS.EU;
  const locale = normalizeLocale(input.locale) || 'sv-SE';

  if (marketRegion === MARKET_REGIONS.UK || countryCode === 'GB') {
    return {
      privacy: '/en/uk/privacy',
      terms: '/en/uk/terms',
      childPrivacy: null,
      tracking: '/en/tracking-choices',
      status: 'placeholder',
    };
  }

  if (locale === 'sv-SE' && (countryCode === 'SE' || countryCode === 'FI')) {
    return {
      privacy: '/privacy',
      terms: '/terms',
      childPrivacy: null,
      tracking: null,
      status: 'live',
    };
  }

  // English UI — EEA baseline (IE + FI English overlays use same route family)
  const LIVE_EEA_COUNTRY_CODES = new Set(['IE', 'FI']);
  return {
    privacy: '/en/eea/privacy',
    terms: '/en/eea/terms',
    childPrivacy: '/en/eea/child-privacy',
    tracking: '/en/tracking-choices',
    status: LIVE_EEA_COUNTRY_CODES.has(countryCode) ? 'live' : 'draft',
  };
}

/**
 * Locale-only legal routes for in-app surfaces (paywall). Avoids jurisdiction
 * routing that would send Swedish UI users to EEA English marketing pages.
 *
 * @param {{ locale?: string|null }} input
 * @returns {{ privacy: string, terms: string, status: 'live' }}
 */
function resolveInAppLegalRoutes(input = {}) {
  const locale = normalizeLocale(input.locale) || 'sv-SE';
  if (locale === 'sv-SE') {
    return {
      privacy: '/privacy',
      terms: '/terms',
      status: 'live',
    };
  }
  return {
    privacy: '/en/privacy',
    terms: '/en/terms',
    status: 'live',
  };
}

module.exports = {
  resolveLegalRoutes,
  resolveInAppLegalRoutes,
};
