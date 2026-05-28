/**
 * Landing news CRUD — reads/writes landing_news table.
 * Owns: all queries for landing news items (admin + public).
 * Does NOT own: landing page rendering (see routes/landing.js).
 */

const db = require('../src/lib/db');

// ─── Public (landing page) ──────────────────────────────────

/** Returns active items sorted by sort_order ASC */
async function getActiveItems() {
  const res = await db.query(
    `SELECT id, title, body, image_url, button_text, button_url, sort_order
     FROM landing_news
     WHERE is_active = true
     ORDER BY sort_order ASC, created_at ASC`
  );
  return res.rows;
}

// ─── Admin ──────────────────────────────────────────────────

/** Returns all items sorted by sort_order ASC */
async function getAllItems() {
  const res = await db.query(
    `SELECT id, title, body, image_url, button_text, button_url, sort_order, is_active, created_at, updated_at
     FROM landing_news
     ORDER BY sort_order ASC, created_at ASC`
  );
  return res.rows;
}

/** Returns a single item by id */
async function getItemById(id) {
  const res = await db.query(
    `SELECT id, title, body, image_url, button_text, button_url, sort_order, is_active, created_at, updated_at
     FROM landing_news WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/** Creates a new item, returns the created row */
async function createItem({ title, body, image_url, button_text, button_url, sort_order, is_active }) {
  const res = await db.query(
    `INSERT INTO landing_news (title, body, image_url, button_text, button_url, sort_order, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, title, body, image_url, button_text, button_url, sort_order, is_active, created_at, updated_at`,
    [
      title,
      body || null,
      image_url || null,
      button_text || 'Läs mer',
      button_url || null,
      sort_order || 0,
      is_active !== false,
    ]
  );
  return res.rows[0];
}

/** Updates an existing item, returns the updated row */
async function updateItem(id, { title, body, image_url, button_text, button_url, sort_order, is_active }) {
  const res = await db.query(
    `UPDATE landing_news
     SET title = $2, body = $3, image_url = $4, button_text = $5, button_url = $6, sort_order = $7, is_active = $8, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, body, image_url, button_text, button_url, sort_order, is_active, created_at, updated_at`,
    [
      id,
      title,
      body || null,
      image_url || null,
      button_text || 'Läs mer',
      button_url || null,
      sort_order || 0,
      is_active !== false,
    ]
  );
  return res.rows[0] || null;
}

/** Deletes an item by id */
async function deleteItem(id) {
  const res = await db.query(`DELETE FROM landing_news WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

/** Batch-update sort_order for multiple items */
async function updateSortOrders(updates) {
  // updates: [{ id, sort_order }, ...]
  for (const { id, sort_order } of updates) {
    await db.query(`UPDATE landing_news SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [id, sort_order]);
  }
}

module.exports = { getActiveItems, getAllItems, getItemById, createItem, updateItem, deleteItem, updateSortOrders };