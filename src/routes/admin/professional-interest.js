/**
 * Admin routes for professional interest submissions.
 * Owns: listing professional interest form submissions for admin panel.
 * Does NOT own: form submission handling (src/routes/public.js), DB queries (db/professional-interest.js).
 */
const express = require('express');
const { listProfessionalInterests, deleteProfessionalInterest } = require('../../../db/professional-interest');

const router = express.Router();

// GET /api/admin/professional-interests — list all submissions, newest first
router.get('/professional-interests', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const { rows, total } = await listProfessionalInterests({ limit, offset });
    res.json({ interests: rows, total });
  } catch (err) {
    console.error('[ADMIN] professional-interests error:', err);
    res.status(500).json({ error: 'Kunde inte hämta intresseanmälningar' });
  }
});

// DELETE /api/admin/professional-interests/:id — delete a submission
router.delete('/professional-interests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Ogiltigt ID' });
    }
    const deleted = await deleteProfessionalInterest(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Anmälan hittades inte' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] professional-interests delete error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort anmälan' });
  }
});

module.exports = router;
