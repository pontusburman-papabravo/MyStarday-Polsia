'use strict';

/**
 * Safe in-app return targets for legal pages opened from paywall/settings.
 * Keep client mirror in public/js/legal-return-nav.js in sync (see test/legal-return.test.js).
 */

const ALLOWED_RETURN_PATHS = new Set(['/paywall']);

const ALLOWED_TIERS = new Set(['monthly', 'yearly']);

function sanitizeReturnTo(input) {
  if (input == null || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('://') || trimmed.includes('..')) return null;
  const pathOnly = trimmed.split('?')[0].split('#')[0];
  if (!ALLOWED_RETURN_PATHS.has(pathOnly)) return null;
  return pathOnly;
}

function sanitizeTier(input) {
  if (input == null || typeof input !== 'string') return null;
  const tier = input.trim().toLowerCase();
  return ALLOWED_TIERS.has(tier) ? tier : null;
}

function buildReturnUrl(returnTo, tier) {
  const path = sanitizeReturnTo(returnTo);
  if (!path) return null;
  const params = new URLSearchParams();
  const safeTier = sanitizeTier(tier);
  if (safeTier) params.set('tier', safeTier);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

function buildLegalLinkHref(basePath, options = {}) {
  if (!basePath || typeof basePath !== 'string' || !basePath.startsWith('/')) return basePath;
  const returnTo = sanitizeReturnTo(options.returnTo);
  if (!returnTo) return basePath;
  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  const safeTier = sanitizeTier(options.tier);
  if (safeTier) params.set('tier', safeTier);
  const sep = basePath.includes('?') ? '&' : '?';
  return `${basePath}${sep}${params.toString()}`;
}

module.exports = {
  ALLOWED_RETURN_PATHS,
  ALLOWED_TIERS,
  sanitizeReturnTo,
  sanitizeTier,
  buildReturnUrl,
  buildLegalLinkHref,
};
