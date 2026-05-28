/**
 * Admin routes for waitlist survey management.
 * Owns: listing waitlist signups, stats, CSV export for admin panel.
 * Does NOT own: signup handling (src/routes/public.js), DB queries (db/waitlist.js).
 */
const express = require('express');
const { listWaitlistEntries, getWaitlistStats, deleteWaitlistEntry } = require('../../../db/waitlist');

const router = express.Router();

// GET /api/admin/waitlist — paginated list with search
router.get('/waitlist', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = req.query.search || null;
    const { rows, total } = await listWaitlistEntries({ limit, offset, search });
    res.json({ entries: rows, total, limit, offset });
  } catch (err) {
    console.error('[ADMIN] waitlist error:', err);
    res.status(500).json({ error: 'Kunde inte hämta waitlist' });
  }
});

// GET /api/admin/waitlist/stats — aggregate stats for admin panel
router.get('/waitlist/stats', async (req, res) => {
  try {
    const stats = await getWaitlistStats();
    res.json(stats);
  } catch (err) {
    console.error('[ADMIN] waitlist/stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta statistik' });
  }
});

// DELETE /api/admin/waitlist/:id — delete a waitlist entry
router.delete('/waitlist/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Ogiltigt ID' });
    }
    const deleted = await deleteWaitlistEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Intressent hittades inte' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] waitlist delete error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort intressenten' });
  }
});

module.exports = router;