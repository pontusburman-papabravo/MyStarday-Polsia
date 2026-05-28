const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { sendEmail } = require('../lib/email');
const { validate } = require('../middleware/validate');
const { FeedbackSchema } = require('../lib/schemas');

const router = express.Router();

// ─── POST /api/feedback ──────────────────────────────────
// Submit feedback or bug report from the app.
// Stored in contact_message with type 'bug' or 'feedback'.
// Sends email notification to info@mystarday.se.
// Gate 2H: feedback_formular must be available
router.post('/', requireParent, requireFeature('feedback_formular'), validate(FeedbackSchema), async (req, res) => {
  try {
    const { type, title, message } = req.body;

    if (!type || !['bug', 'feedback'].includes(type)) {
      return res.status(400).json({ error: 'Ogiltig typ — välj "bug" eller "feedback"' });
    }
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: 'Titel krävs (minst 3 tecken)' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Meddelande krävs (minst 10 tecken)' });
    }

    const parentName = req.user.name || req.user.email || 'Okänd användare';
    const parentEmail = req.user.email || '';

    // Insert into contact_message (same table as contact form)
    const result = await db.query(
      `INSERT INTO contact_message (name, email, message, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [parentName.trim(), parentEmail, message.trim(), type]
    );

    const insertedId = result.rows[0].id;
    const typeLabel = type === 'bug' ? 'Buggrapport' : 'Feedback';
    console.log(`[FEEDBACK] New ${type} from parent ${req.user.id}: ${title.trim()} (${insertedId})`);

    // Send email notification to owner
    await sendEmail({
      to: 'info@mystarday.se',
      subject: `Min Stjärndag — ${typeLabel}: ${title.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #1B2340; border-bottom: 2px solid #F5A623; padding-bottom: 8px;">
            Min Stjärndag — Nytt ${typeLabel}
          </h2>
          <p><strong>Typ:</strong> <span style="background:${type === 'bug' ? '#FEE2E2' : '#EDE7F6'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${typeLabel}</span></p>
          <p><strong>Rubrik:</strong> ${title.trim()}</p>
          <p><strong>Från:</strong> ${parentName.trim()} &lt;${parentEmail}&gt;</p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 8px; border-left: 4px solid #F5A623;">${message.trim()}</p>
          <p style="color: #5A6178; font-size: 12px; margin-top: 16px;">
            Meddelande-ID: ${insertedId} · ${new Date().toLocaleString('sv-SE')}
          </p>
        </div>
      `,
    });

    res.status(201).json({ message: 'Tack för din feedback! Vi läser allt som kommer in.' });
  } catch (err) {
    console.error('[FEEDBACK] Error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/feedback (admin only — legacy endpoint) ─────
// NOTE: Admin now uses /api/admin/contact-messages instead.
// This endpoint is kept for backward compatibility with older app versions.
router.get('/', requireParent, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Förbjuden' });
  }
  try {
    // Redirect to new unified contact-messages endpoint
    const result = await db.query(`
      SELECT id, name, email, message, created_at, is_read, message_type
      FROM contact_message
      WHERE message_type IN ('bug', 'feedback')
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ feedback: result.rows });
  } catch (err) {
    console.error('[FEEDBACK] List error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;