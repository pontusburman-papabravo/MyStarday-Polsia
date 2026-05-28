// Reward management: default rewards library, creation, updates, deletion.
// Owns: default_reward, reward (sync with families).
// Does NOT own: family (see family.js), activity templates (see schedule.js).

const express = require('express');
const db = require('../../lib/db');
const { notifyLibraryUpdate } = require('../../lib/library-notifications');

const router = express.Router();

// ─── DEFAULT REWARDS LIBRARY ─────────────────────────────
// GET /api/admin/default-rewards
router.get('/default-rewards', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, icon, star_cost, sort_order FROM default_reward ORDER BY sort_order ASC, star_cost ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] List default rewards error:', err);
    res.status(500).json({ error: 'Kunde inte hämta standardbelöningar' });
  }
});

// POST /api/admin/default-rewards
router.post('/default-rewards', async (req, res) => {
  try {
    const { name, icon, star_cost, sort_order } = req.body;
    if (!name || !star_cost) return res.status(400).json({ error: 'Namn och stjärnkostnad krävs' });
    const cost = parseInt(star_cost, 10);
    if (isNaN(cost) || cost < 1) return res.status(400).json({ error: 'Stjärnkostnad måste vara minst 1' });

    const result = await db.query(
      `INSERT INTO default_reward (name, icon, star_cost, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), icon || '🎁', cost, parseInt(sort_order, 10) || 0]
    );
    const newDefault = result.rows[0];

    // Seed to ALL existing families that don't already have this reward (source_default_id match)
    // Additive-only: never overwrite
    const families = await db.query(
      'SELECT id FROM family WHERE archived_at IS NULL'
    );
    for (const fam of families.rows) {
      await db.query(
        `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, source_default_id, modified_by_family)
         VALUES ($1, $2, $3, $4, false, true, $5, false)
         ON CONFLICT DO NOTHING`,
        [fam.id, newDefault.name, newDefault.icon, newDefault.star_cost, newDefault.id]
      );
    }

    notifyLibraryUpdate('reward', `Ny belöning: ${newDefault.icon} ${newDefault.name} tillagd`);
    res.status(201).json(newDefault);
  } catch (err) {
    console.error('[ADMIN] Create default reward error:', err);
    res.status(500).json({ error: 'Kunde inte skapa standardbelöning' });
  }
});

// PUT /api/admin/default-rewards/reorder — MUST be before /:id
router.put('/default-rewards/reorder', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of order) {
        if (!item.id || typeof item.sort_order !== 'number') continue;
        await client.query(
          'UPDATE default_reward SET sort_order = $1 WHERE id = $2',
          [item.sort_order, item.id]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Ordning uppdaterad' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ADMIN] Reorder default rewards error:', err);
    res.status(500).json({ error: 'Kunde inte sortera' });
  }
});

// PUT /api/admin/default-rewards/:id
router.put('/default-rewards/:id', async (req, res) => {
  try {
    const { name, icon, star_cost, sort_order } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon); }
    if (star_cost !== undefined) {
      const cost = parseInt(star_cost, 10);
      if (isNaN(cost) || cost < 1) return res.status(400).json({ error: 'Stjärnkostnad måste vara minst 1' });
      updates.push(`star_cost = $${idx++}`); values.push(cost);
    }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE default_reward SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Standardbelöning hittades inte' });
    const updated = result.rows[0];

    // Propagate to families where the reward has NOT been modified by the family
    // (protected sync: modified_by_family = false means admin can still update it)
    const syncUpdates = [];
    const syncValues = [updated.id]; // $1 = default reward id
    let si = 2;
    if (name !== undefined) { syncUpdates.push(`name = $${si++}`); syncValues.push(updated.name); }
    if (icon !== undefined) { syncUpdates.push(`icon = $${si++}`); syncValues.push(updated.icon); }
    if (star_cost !== undefined) { syncUpdates.push(`star_cost = $${si++}`); syncValues.push(updated.star_cost); }

    if (syncUpdates.length > 0) {
      await db.query(
        `UPDATE reward SET ${syncUpdates.join(', ')}
         WHERE source_default_id = $1 AND modified_by_family = false`,
        syncValues
      );
    }

    notifyLibraryUpdate('reward', `Belöning uppdaterad: ${updated.icon} ${updated.name}`);
    res.json(updated);
  } catch (err) {
    console.error('[ADMIN] Update default reward error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera standardbelöning' });
  }
});

// DELETE /api/admin/default-rewards/:id
// Deletes the default but NEVER deletes families' copies — sets source_default_id to NULL
router.delete('/default-rewards/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Detach families' copies from this default (they keep living)
    await client.query(
      `UPDATE reward SET source_default_id = NULL WHERE source_default_id = $1`,
      [req.params.id]
    );
    const result = await client.query(
      'DELETE FROM default_reward WHERE id = $1 RETURNING id, name, icon',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Standardbelöning hittades inte' });
    }
    await client.query('COMMIT');
    notifyLibraryUpdate('reward', `Belöning borttagen: ${result.rows[0].icon} ${result.rows[0].name}`);
    res.json({ message: 'Standardbelöning borttagen. Familjers kopior bevaras.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ADMIN] Delete default reward error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort standardbelöning' });
  } finally {
    client.release();
  }
});

module.exports = router;
