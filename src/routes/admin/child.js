// Child management: child profiles, PIN lockout, PIN audit events.
// Owns: child-level PIN state, PIN audit logs.
// Does NOT own: family (see family.js), daily logs, schedules (see schedule.js).

const express = require('express');
const pinLockout = require('../../../db/pin-lockout');

const router = express.Router();

// ─── POST /api/admin/children/:id/reset-lockout ───────────
// Admin resets the PIN lockout timer for a child — does NOT change the PIN.
// GDPR boundary: admins can unlock but cannot read or change child PINs.
router.post('/children/:id/reset-lockout', async (req, res) => {
  try {
    const db = require('../../lib/db');

    // Verify child exists
    const childRow = await db.query(
      'SELECT id, family_id, name FROM child WHERE id = $1',
      [req.params.id]
    );
    if (childRow.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }
    const child = childRow.rows[0];

    await pinLockout.clearLockout(child.id);
    pinLockout.auditLog(child.id, child.family_id, 'lockout_cleared', req.ip || null, {
      cleared_by: 'admin',
      admin_id: req.user.id,
    }).catch(() => {});

    res.json({ message: `Låsning upphävd för ${child.name}` });
  } catch (err) {
    console.error('[ADMIN] Reset PIN lockout error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/admin/children/:id/pin-audit-log ────────────
// Admin view of PIN audit events for a child (latest 50).
router.get('/children/:id/pin-audit-log', async (req, res) => {
  try {
    const db = require('../../lib/db');

    const childRow = await db.query('SELECT id, name FROM child WHERE id = $1', [req.params.id]);
    if (childRow.rows.length === 0) {
      return res.status(404).json({ error: 'Barnet hittades inte' });
    }

    const log = await pinLockout.getAuditLog(req.params.id, 50);
    res.json({ child: childRow.rows[0], events: log });
  } catch (err) {
    console.error('[ADMIN] PIN audit log error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
