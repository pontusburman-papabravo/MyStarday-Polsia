/**
 * Child view routing — A/B toggle between classic and new child views.
 * Owns: /child/:childId redirect logic based on child_view_config.view_mode,
 *       /child-new/:childId → child-new.html
 * Does NOT own: auth middleware (handled at mount level), daily-log rendering.
 * Feature gate: ny_barnvy gates access to the new view. If feature is off, the
 * child_view_config setting is ignored and all children go to the classic view.
 * Admin bypass: req.user.isAdmin skips feature gates.
 */
const express = require('express');
const db = require('../lib/db');
const { optionalAuth } = require('../middleware/auth');
const { redirectIfNoAccess } = require('../middleware/feature-gate');

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return UUID_REGEX.test(id);
}

// ─── GET /child/:childId — A/B toggle ──────────────────────
// Reads child_view_config.view_mode, redirects to classic or new view.
// Gates 'ny_barnvy' — if feature is off, all children go to classic view.
// redirectIfNoAccess handles admin bypass automatically.
router.get('/:childId', optionalAuth, redirectIfNoAccess('ny_barnvy', '/child-dashboard'), async (req, res) => {
  try {
    const { childId } = req.params;
    if (!isValidUuid(childId)) {
      return res.redirect('/child-login');
    }

    const result = await db.query(
      'SELECT child_view_config FROM child WHERE id = $1',
      [childId]
    );
    if (result.rows.length === 0) {
      return res.redirect('/child-login');
    }

    const { view_mode: viewMode } = result.rows[0].child_view_config || {};

    if (viewMode === 'new') {
      return res.redirect(`/child-new/${childId}`);
    }

    return res.redirect(`/child-dashboard?child=${childId}`);
  } catch (err) {
    console.error('[CHILD-VIEW] Route error:', err);
    return res.redirect('/child-login');
  }
});

// ─── GET /child/new/:childId — functional V2 child view ───
// Gates 'ny_barnvy' — direct navigation to new view requires feature access.
// redirectIfNoAccess handles admin bypass automatically.
router.get('/new/:childId', optionalAuth, redirectIfNoAccess('ny_barnvy', '/child-dashboard'), async (req, res) => {
  const { childId } = req.params;
  if (!isValidUuid(childId)) {
    return res.redirect('/child-login');
  }
  res.redirect(`/child-new.html?child=${childId}`);
});

module.exports = router;