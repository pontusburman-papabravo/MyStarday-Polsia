/**
 * User stats admin routes.
 * Owns: parent/child aggregate statistics and professional share-link stats.
 * Does NOT own: any other admin tables — read-only queries only.
 */

const express = require('express');
const userStats = require('../../../db/user-stats');

const router = express.Router();

// ─── GET /api/admin/user-stats ────────────────────────────
router.get('/user-stats', async (req, res) => {
  try {
    const [parents, children, shareLinks] = await Promise.all([
      userStats.getParentStats(),
      userStats.getChildStats(),
      userStats.getShareLinkStats(),
    ]);

    res.json({ parents, children, share_links: shareLinks });
  } catch (err) {
    console.error('[ADMIN user-stats] error:', err);
    res.status(500).json({ error: 'Kunde inte hämta användarstatistik' });
  }
});

module.exports = router;