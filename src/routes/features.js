/**
 * Public feature access routes (authenticated family).
 * Owns: listing accessible features for the current family.
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getAccessibleFeatures } = require('../../db/features');

const router = express.Router();

// GET /api/features — list features accessible to the authenticated family
router.get('/', requireAuth, async (req, res) => {
  try {
    // Only parent families have feature access (not child login)
    if (req.user.type !== 'parent') {
      return res.json([]);
    }
    const features = await getAccessibleFeatures(req.user.familyId);
    res.json(features);
  } catch (err) {
    console.error('[FEATURES] get accessible error:', err);
    res.status(500).json({ error: 'Kunde inte hämta funktioner' });
  }
});

module.exports = router;