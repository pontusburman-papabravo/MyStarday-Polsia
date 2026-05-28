/**
 * Feature gate middleware — blocks or redirects requests based on
 * the family's feature access (from db/features.hasAccess).
 * Does NOT own: feature definitions (db/features.js), admin routes.
 */

/**
 * Check hasAccess for a familyId (supports CORE_FEATURES).
 * Returns true if no familyId (public routes without auth).
 */
async function checkAccessPublic(familyId, slug) {
  if (!familyId) return true; // public/no-auth route — allow
  const { hasAccess } = require('../../db/features');
  return hasAccess(familyId, slug);
}

/**
 * Block with 403 if the family doesn't have access to the feature.
 * Use when the feature has NO natural fallback.
 * Admin users (req.user.isAdmin) bypass all feature gates.
 */
function requireFeature(slug) {
  return async (req, res, next) => {
    // Admin bypass — admins always see all features
    if (req.user?.isAdmin) return next();

    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(403).json({ error: 'Ingen familj kopplad' });
    }
    const { hasAccess } = require('../../db/features');
    const allowed = await hasAccess(familyId, slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Funktionen är inte tillgänglig för er familj' });
    }
    next();
  };
}

/**
 * Redirect to fallbackPath if the family doesn't have access.
 * Use when the feature has a natural fallback (e.g. old view → new view fallback).
 * Admin users (req.user.isAdmin) bypass all feature gates.
 */
function redirectIfNoAccess(slug, fallbackPath = '/child-view') {
  return async (req, res, next) => {
    // Admin bypass — admins always see all features
    if (req.user?.isAdmin) return next();

    const familyId = req.user?.familyId;
    if (!familyId) return res.redirect(fallbackPath);
    const { hasAccess } = require('../../db/features');
    const allowed = await hasAccess(familyId, slug);
    if (!allowed) return res.redirect(fallbackPath);
    next();
  };
}

/**
 * Redirect to fallbackPath for HTML page requests when no access.
 * Unlike redirectIfNoAccess, this skips auth check (reads req.user from cookie
 * middleware) and is used for browser page navigations where redirect is cleaner
 * than JSON 403.
 * Admin users (req.user.isAdmin) bypass all feature gates.
 */
function gateHtmlPage(slug, fallbackPath = '/dashboard') {
  return async (req, res, next) => {
    // Admin bypass — admins always see all features
    if (req.user?.isAdmin) return next();

    const familyId = req.user?.familyId;
    if (!familyId) return res.redirect(fallbackPath);

    const { hasAccess } = require('../../db/features');
    const allowed = await hasAccess(familyId, slug);
    if (!allowed) return res.redirect(fallbackPath);
    next();
  };
}

module.exports = { requireFeature, redirectIfNoAccess, gateHtmlPage, checkAccessPublic };