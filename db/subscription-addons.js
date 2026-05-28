// Subscription add-ons: admin-configured optional paid add-ons.

const { query } = require('../src/lib/db');

function getAllAddons() {
  return query('SELECT * FROM subscription_addons ORDER BY created_at ASC');
}

function getActiveAddons() {
  return query('SELECT * FROM subscription_addons WHERE is_active = true ORDER BY created_at ASC');
}

function getAddonById(id) {
  return query('SELECT * FROM subscription_addons WHERE id = $1', [id]).then(r => r.rows[0] || null);
}

function createAddon({ name, description, price_sek, stripe_price_id, is_active }) {
  return query(
    `INSERT INTO subscription_addons (name, description, price_sek, stripe_price_id, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [name, description || null, price_sek, stripe_price_id || null, is_active !== false]
  ).then(r => r.rows[0]);
}

function updateAddon(id, { name, description, price_sek, stripe_price_id, is_active }) {
  return query(
    `UPDATE subscription_addons
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         price_sek = COALESCE($4, price_sek),
         stripe_price_id = COALESCE($5, stripe_price_id),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, description, price_sek, stripe_price_id, is_active]
  ).then(r => r.rows[0] || null);
}

function deleteAddon(id) {
  return query('DELETE FROM subscription_addons WHERE id = $1 RETURNING id', [id]).then(r => r.rows[0]);
}

module.exports = { getAllAddons, getActiveAddons, getAddonById, createAddon, updateAddon, deleteAddon };