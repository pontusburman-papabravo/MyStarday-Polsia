// Welcome email template management.
const express = require('express');
const db = require('../../lib/db');

const router = express.Router();

// ─── GET /api/admin/welcome-email ───────────────────────
// Returns the active welcome email template (id=1).
router.get('/', async (req, res) => {
  console.log('[WELCOME-EMAIL] GET /api/admin/welcome-email called by user:', req.user?.id);
  try {
    const result = await db.query(
      'SELECT id, subject, body, is_active, updated_at FROM welcome_email_template WHERE id = 1'
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen välkomstmailmall har konfigurerats ännu' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Welcome email template get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta välkomstmailmall' });
  }
});

// ─── PUT /api/admin/welcome-email ─────────────────────
// Update the welcome email template (always updates id=1).
// Body: { subject: string, body: string, is_active: boolean }
router.put('/', async (req, res) => {
  console.log('[WELCOME-EMAIL] PUT /api/admin/welcome-email called by user:', req.user?.id, 'isAdmin:', req.user?.isAdmin);
  try {
    const { subject, body, is_active } = req.body;

    if (typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'subject krävs (text)' });
    }
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'body krävs (text)' });
    }
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active krävs (boolean)' });
    }

    // Upsert always writes to id=1
    const result = await db.query(
      `INSERT INTO welcome_email_template (id, subject, body, is_active, updated_at)
       VALUES (1, $1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET
         subject    = EXCLUDED.subject,
         body       = EXCLUDED.body,
         is_active  = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING id, subject, body, is_active, updated_at`,
      [subject.trim(), body, is_active]
    );

    console.log(`[ADMIN] Welcome email template updated by admin ${req.user.id}, is_active=${is_active}`);
    res.json({
      message: 'Välkomstmailmallen har sparats',
      template: result.rows[0],
    });
  } catch (err) {
    console.error('[ADMIN] Welcome email template update error:', err);
    res.status(500).json({ error: 'Kunde inte spara välkomstmailmall' });
  }
});

module.exports = router;