const express = require('express');
const archiver = require('archiver');
const db = require('../lib/db');
const { hashPassword, comparePassword } = require('../lib/hash');
const { requireParent, requireAdmin } = require('../middleware/auth');
const { revokeAllRefreshTokens } = require('../lib/refresh-tokens');
const { sendAccountDeletionRequestedEmail } = require('../lib/email');
const { validate } = require('../middleware/validate');
const { UpdateNotificationPrefsSchema, ReorderSchema } = require('../lib/schemas');
// Inline schemas for account-specific mutations (not shared across routes)
const { z } = require('zod');
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Nuvarande lösenord krävs').max(128),
  newPassword: z.string().min(8, 'Nytt lösenord måste vara minst 8 tecken').max(128),
});

const router = express.Router();

// ─── In-memory rate limit: 1 export per 24h per parent ──
// Map<parentId, lastExportTimestamp>
const exportRateLimit = new Map();
const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Helper: convert array of objects to CSV string ─────
function toCsv(rows) {
  if (!rows || rows.length === 0) return 'Ingen data\n';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    // Wrap in quotes if contains comma, quote, or newline
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

// ─── GET /api/account/export-data ───────────────────────
// GDPR: Export all family data as a ZIP of CSV files.
// Rate-limited to 1 request per 24h per parent.
router.get('/export-data', requireParent, async (req, res) => {
  const parentId = req.user.id;

  // Rate limit check
  const lastExport = exportRateLimit.get(parentId);
  if (lastExport && Date.now() - lastExport < EXPORT_COOLDOWN_MS) {
    const nextAllowed = new Date(lastExport + EXPORT_COOLDOWN_MS);
    const hoursLeft = Math.ceil((nextAllowed - Date.now()) / (1000 * 60 * 60));
    return res.status(429).json({
      error: `Du kan bara exportera din data en gång per 24 timmar. Försök igen om ${hoursLeft} timmar.`,
      next_allowed_at: nextAllowed.toISOString(),
    });
  }

  try {
    // Fetch parent + family info
    const parentRow = await db.query(
      `SELECT p.id, p.name, p.email, p.created_at, p.family_id,
              f.name AS family_name, f.timezone
       FROM parent p JOIN family f ON f.id = p.family_id
       WHERE p.id = $1`,
      [parentId]
    );
    if (parentRow.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    const { family_id } = parentRow.rows[0];

    // ── Fetch all data ───────────────────────────────────
    const [childrenRes, weeklyItemsRes, rewardsRes, redemptionsRes,
           dailyLogsRes, dailyLogItemsRes, ratingsRes, manualStarsRes] = await Promise.all([
      // Children (anonymised IDs — we use child_id labels, not real UUIDs in export)
      db.query(
        `SELECT id AS barn_id, name AS namn, emoji, birthday AS fodelsedag,
                created_at AS skapad
         FROM child WHERE family_id = $1 ORDER BY created_at`,
        [family_id]
      ),
      // Weekly schedule items
      db.query(
        `SELECT c.name AS barn, ws.day_of_week AS veckodag,
                at2.name AS aktivitet, wsi.section, wsi.sort_order AS ordning,
                ws.created_at AS schema_skapad
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON wsi.weekly_schedule_id = ws.id
         JOIN child c ON ws.child_id = c.id
         JOIN activity_template at2 ON wsi.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY c.name, ws.day_of_week, wsi.sort_order`,
        [family_id]
      ),
      // Rewards
      db.query(
        `SELECT name AS namn, icon, star_cost AS stjarnkostnad,
                is_active AS aktiv, created_at AS skapad
         FROM reward WHERE family_id = $1 ORDER BY created_at`,
        [family_id]
      ),
      // Reward redemptions
      db.query(
        `SELECT c.name AS barn, r.name AS beloning, rr.stars_spent AS stjarnor,
                rr.redeemed_at AS inlost
         FROM reward_redemption rr
         JOIN child c ON rr.child_id = c.id
         JOIN reward r ON rr.reward_id = r.id
         WHERE c.family_id = $1
         ORDER BY rr.redeemed_at DESC`,
        [family_id]
      ),
      // Daily log summary (per child per day)
      db.query(
        `SELECT c.name AS barn, dl.log_date AS datum,
                dl.total_stars AS totala_stjarnor, dl.completed_count AS avbockade,
                dl.total_count AS totalt
         FROM daily_log dl
         JOIN child c ON dl.child_id = c.id
         WHERE c.family_id = $1
         ORDER BY c.name, dl.log_date DESC`,
        [family_id]
      ),
      // Daily log items (activity completions)
      db.query(
        `SELECT c.name AS barn, dl.log_date AS datum, at2.name AS aktivitet,
                dli.completed AS avbockad, dli.stars_earned AS tjänade_stjärnor,
                dli.completed_at AS avbockad_kl, dli.section
         FROM daily_log_item dli
         JOIN daily_log dl ON dli.daily_log_id = dl.id
         JOIN child c ON dl.child_id = c.id
         LEFT JOIN activity_template at2 ON dli.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY c.name, dl.log_date DESC, dli.section`,
        [family_id]
      ),
      // Ratings
      db.query(
        `SELECT c.name AS barn, dl.log_date AS datum, at2.name AS aktivitet,
                r.score AS betyg, r.user_type AS bedomare, r.comment AS kommentar,
                r.created_at AS registrerad
         FROM rating r
         JOIN daily_log_item dli ON r.daily_log_item_id = dli.id
         JOIN daily_log dl ON dli.daily_log_id = dl.id
         JOIN child c ON dl.child_id = c.id
         LEFT JOIN activity_template at2 ON dli.activity_template_id = at2.id
         WHERE c.family_id = $1
         ORDER BY r.created_at DESC`,
        [family_id]
      ),
      // Manual star grants
      db.query(
        `SELECT c.name AS barn, msg.star_count AS stjarnor,
                msg.reason AS anledning, msg.created_at AS datum
         FROM manual_star_grant msg
         JOIN child c ON msg.child_id = c.id
         WHERE c.family_id = $1
         ORDER BY msg.created_at DESC`,
        [family_id]
      ),
    ]);

    // Record export time now (before streaming, to prevent concurrent abuse)
    exportRateLimit.set(parentId, Date.now());

    // ── Build ZIP and stream to client ──────────────────
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="min-data-${new Date().toISOString().slice(0, 10)}.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('[ACCOUNT] Export archive error:', err);
      // Cannot change headers at this point; just destroy
      res.destroy();
    });
    archive.pipe(res);

    archive.append(toCsv(parentRow.rows.map(r => ({
      namn: r.namn || r.name,
      e_post: r.email,
      familjenamn: r.family_name,
      tidszon: r.timezone,
      registrerad: r.created_at,
    }))), { name: '01_profil.csv' });

    archive.append(toCsv(childrenRes.rows), { name: '02_barn.csv' });
    archive.append(toCsv(weeklyItemsRes.rows), { name: '03_scheman.csv' });
    archive.append(toCsv(rewardsRes.rows), { name: '04_beloningar.csv' });
    archive.append(toCsv(redemptionsRes.rows), { name: '05_inlosningar.csv' });
    archive.append(toCsv(dailyLogsRes.rows), { name: '06_dagliga_loggar.csv' });
    archive.append(toCsv(dailyLogItemsRes.rows), { name: '07_aktiviteter.csv' });
    archive.append(toCsv(ratingsRes.rows), { name: '08_betygssattning.csv' });
    archive.append(toCsv(manualStarsRes.rows), { name: '09_manuella_stjarnor.csv' });

    await archive.finalize();
  } catch (err) {
    console.error('[ACCOUNT] Export data error:', err);
    // Only send error response if headers not yet sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
    }
  }
});

// ─── PUT /api/account/change-password ───────────────────
router.put('/change-password', requireParent, validate(ChangePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Nuvarande och nytt lösenord krävs' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    // Verify current password
    const result = await db.query(
      'SELECT password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Nuvarande lösenord är felaktigt' });
    }

    // Update password
    const newHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE parent SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    );

    // Revoke ALL refresh tokens so stolen tokens can't outlive the password change.
    // Without this, a compromised refresh token remains valid for up to 30 days.
    await revokeAllRefreshTokens({ userId: req.user.id, userType: 'parent' });

    res.json({ message: 'Lösenordet har ändrats!' });
  } catch (err) {
    console.error('[ACCOUNT] Change password error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/account/notifications ─────────────────────
router.put('/notifications', requireParent, validate(UpdateNotificationPrefsSchema), async (req, res) => {
  try {
    const { weekly_summary, reward_redemption, email_enabled } = req.body;

    // Upsert notification preferences
    const existing = await db.query(
      'SELECT id FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      const updates = [];
      const values = [];
      let idx = 1;

      if (typeof weekly_summary === 'boolean') {
        updates.push(`weekly_summary = $${idx++}`);
        values.push(weekly_summary);
      }
      if (typeof reward_redemption === 'boolean') {
        updates.push(`reward_redemption = $${idx++}`);
        values.push(reward_redemption);
      }
      if (typeof email_enabled === 'boolean') {
        updates.push(`email_enabled = $${idx++}`);
        values.push(email_enabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Inga inställningar att uppdatera' });
      }

      values.push(req.user.id);
      await db.query(
        `UPDATE notification_preference SET ${updates.join(', ')} WHERE parent_id = $${idx}`,
        values
      );
    } else {
      await db.query(
        `INSERT INTO notification_preference (parent_id, weekly_summary, reward_redemption, email_enabled)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          weekly_summary !== false,
          reward_redemption !== false,
          email_enabled !== false,
        ]
      );
    }

    // Return current preferences
    const prefs = await db.query(
      'SELECT weekly_summary, reward_redemption, email_enabled FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    res.json({
      message: 'Inställningar uppdaterade!',
      notifications: prefs.rows[0],
    });
  } catch (err) {
    console.error('[ACCOUNT] Notifications error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/notifications ─────────────────────
router.get('/notifications', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT weekly_summary, reward_redemption, email_enabled FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        weekly_summary: true,
        reward_redemption: true,
        email_enabled: true,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ACCOUNT] Get notifications error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/status ─────────────────────────────
router.get('/status', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pending_deletion, deletion_requested_at
       FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const row = result.rows[0];
    let daysRemaining = null;
    if (row.pending_deletion && row.deletion_requested_at) {
      const due = new Date(row.deletion_requested_at);
      due.setDate(due.getDate() + 30);
      const now = new Date();
      const remaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, remaining);
    }

    res.json({
      pending_deletion: row.pending_deletion,
      deletion_requested_at: row.deletion_requested_at,
      days_remaining: daysRemaining,
    });
  } catch (err) {
    console.error('[ACCOUNT] Get status error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/delete ───────────────────────────
router.post('/delete', requireParent, async (req, res) => {
  try {
    // Check if already pending deletion
    const existing = await db.query(
      `SELECT pending_deletion, deletion_requested_at FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    if (existing.rows[0].pending_deletion) {
      // Already pending — return success without re-triggering
      return res.json({
        message: 'Kontot är redan markerat för radering.',
        pending_deletion: true,
        deletion_requested_at: existing.rows[0].deletion_requested_at,
      });
    }

    // Set soft delete
    const now = new Date();
    await db.query(
      `UPDATE parent SET pending_deletion = true, deletion_requested_at = $1 WHERE id = $2`,
      [now, req.user.id]
    );

    // Get email for notification
    const parentResult = await db.query(
      `SELECT email, family_id FROM parent WHERE id = $1`,
      [req.user.id]
    );
    const { email } = parentResult.rows[0];
    const firstName = email.split('@')[0].split('.')[0];

    // Send confirmation email
    sendAccountDeletionRequestedEmail(email, firstName).catch(err => {
      console.warn('[ACCOUNT] Failed to send deletion email:', err.message);
    });

    res.json({
      message: 'Kontot har markerats för radering. Du har 30 dagar att ångra dig.',
      pending_deletion: true,
      deletion_requested_at: now.toISOString(),
      days_remaining: 30,
    });
  } catch (err) {
    console.error('[ACCOUNT] Delete account error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/cancel-deletion ─────────────────
router.post('/cancel-deletion', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pending_deletion FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    if (!result.rows[0].pending_deletion) {
      return res.json({ message: 'Ingen radering att avbryta.' });
    }

    // Cancel the deletion
    await db.query(
      `UPDATE parent SET pending_deletion = false, deletion_requested_at = NULL WHERE id = $1`,
      [req.user.id]
    );

    res.json({ message: 'Raderingen har avbrutits. Ditt konto är nu aktivt igen.' });
  } catch (err) {
    console.error('[ACCOUNT] Cancel deletion error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/widget-order ────────────────────────
router.get('/widget-order', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT widget_order FROM parent WHERE id = $1',
      [req.user.id]
    );
    res.json({ widget_order: result.rows[0]?.widget_order || [] });
  } catch (err) {
    console.error('[ACCOUNT] Get widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/account/widget-order ───────────────────────
router.put('/widget-order', requireParent, async (req, res) => {
  try {
    const { widget_order } = req.body;
    if (!Array.isArray(widget_order)) {
      return res.status(400).json({ error: 'widget_order must be an array' });
    }

    await db.query(
      'UPDATE parent SET widget_order = $1 WHERE id = $2',
      [JSON.stringify(widget_order), req.user.id]
    );

    res.json({ message: 'Ordning sparad', widget_order });
  } catch (err) {
    console.error('[ACCOUNT] Save widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/share-notify ──────────────────────
// Fires when a parent shares the app with someone. Sends an
// email notification to info@mystarday.se with the sharer's details.
router.post('/share-notify', requireParent, async (req, res) => {
  try {
    const parentResult = await db.query(
      'SELECT email, name FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const { email: parentEmail, name: parentName } = parentResult.rows[0];
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });

    // Send notification email to info@mystarday.se (fire-and-forget)
    const { sendEmail } = require('../lib/email');
    sendEmail({
      to: 'info@mystarday.se',
      subject: `🌟 Delning — ${parentName || parentEmail} tipsade en familj!`,
      body: `Förälder: ${parentName || '—'}\nE-post: ${parentEmail}\nTidpunkt: ${now}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">🌟 Ny delning av Stjärndag!</h2>
          <p><strong>Förälder:</strong> ${parentName || '—'}</p>
          <p><strong>E-post:</strong> ${parentEmail}</p>
          <p><strong>Tidpunkt:</strong> ${now}</p>
        </div>`,
    }).catch(err => {
      console.warn('[ACCOUNT] Failed to send share notification:', err.message);
    });

    res.json({ message: 'Tack för att du delade!' });
  } catch (err) {
    console.error('[ACCOUNT] Share notify error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

// ─── POST /api/account/delete-immediate ─────────────────
// GDPR: Immediate, permanent hard deletion with password confirmation.
// Deletes the entire family and all associated data in dependency order.
// No deletion is logged (GDPR requirement: data must be fully gone).
router.post('/delete-immediate', requireParent, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Lösenord krävs för att bekräfta radering' });
  }

  const client = await db.getClient();
  try {
    // 1. Verify password before doing anything destructive
    const parentRow = await client.query(
      'SELECT id, email, family_id, password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentRow.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Konto hittades inte' });
    }

    const { email, family_id, password_hash } = parentRow.rows[0];
    const valid = await comparePassword(password, password_hash);
    if (!valid) {
      client.release();
      return res.status(401).json({ error: 'Fel lösenord. Försök igen.' });
    }

    // 2. Delete all family data in dependency order (no ON DELETE CASCADE in schema)
    await client.query('BEGIN');

    // Ratings (references daily_log_item)
    await client.query(`
      DELETE FROM rating WHERE daily_log_item_id IN (
        SELECT dli.id FROM daily_log_item dli
        JOIN daily_log dl ON dli.daily_log_id = dl.id
        JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Daily log items (references daily_log, activity_template)
    await client.query(`
      DELETE FROM daily_log_item WHERE daily_log_id IN (
        SELECT dl.id FROM daily_log dl
        JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Daily logs (references child)
    await client.query(`
      DELETE FROM daily_log WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Reward redemptions (references reward, child, parent)
    await client.query(`
      DELETE FROM reward_redemption WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM reward_redemption WHERE reward_id IN (
        SELECT id FROM reward WHERE family_id = $1
      )`, [family_id]);

    // Weekly schedule items (references weekly_schedule, activity_template)
    await client.query(`
      DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
        SELECT ws.id FROM weekly_schedule ws
        JOIN child c ON ws.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Weekly schedules (references child)
    await client.query(`
      DELETE FROM weekly_schedule WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Streaks (references child)
    await client.query(`
      DELETE FROM streak WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Parent notes (references child, parent)
    await client.query(`
      DELETE FROM parent_note WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Notification preferences (references parent)
    await client.query(`
      DELETE FROM notification_preference WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Parent-child relationships
    await client.query(`
      DELETE FROM parent_child WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM parent_child WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Rewards (references family)
    await client.query(`DELETE FROM reward WHERE family_id = $1`, [family_id]);

    // Activity templates (references family)
    await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [family_id]);

    // Categories (references family)
    await client.query(`DELETE FROM category WHERE family_id = $1`, [family_id]);

    // Family invites (references family)
    await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [family_id]);

    // Email verification tokens (no FK, delete by parent_id)
    await client.query(`
      DELETE FROM email_verification WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Password reset tokens (no FK, delete by parent_id)
    await client.query(`
      DELETE FROM password_reset WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Children (references family)
    await client.query(`DELETE FROM child WHERE family_id = $1`, [family_id]);

    // Parents (references family)
    await client.query(`DELETE FROM parent WHERE family_id = $1`, [family_id]);

    // Family (root)
    await client.query(`DELETE FROM family WHERE id = $1`, [family_id]);

    await client.query('COMMIT');

    // 3. Clear auth cookie so the client is immediately logged out
    res.clearCookie('token');
    res.json({ message: 'Kontot och all tillhörande data har raderats permanent.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[ACCOUNT] Immediate delete error:', err);
    res.status(500).json({ error: 'Något gick fel vid radering. Försök igen.' });
  } finally {
    client.release();
  }
});

module.exports = router;
