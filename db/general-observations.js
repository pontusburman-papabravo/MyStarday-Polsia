/**
 * General observation queries — family-level, time-agnostic notes.
 * Does NOT own: auth, family access verification (done in routes).
 */
const db = require('../src/lib/db');

/**
 * Create a new general observation.
 */
async function createObservation({ familyId, text, isImportant }) {
  const result = await db.query(
    `INSERT INTO general_observations (family_id, text, is_important)
     VALUES ($1, $2, $3)
     RETURNING id, family_id, created_at, archived_at, text, is_important`,
    [familyId, text, Boolean(isImportant)]
  );
  return result.rows[0];
}

/**
 * Get all non-archived observations for a family, newest first.
 */
async function getActiveByFamily(familyId) {
  const result = await db.query(
    `SELECT id, family_id, created_at, archived_at, text, is_important
     FROM general_observations
     WHERE family_id = $1 AND archived_at IS NULL
     ORDER BY created_at DESC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Get all archived observations for a family, newest first.
 */
async function getArchivedByFamily(familyId) {
  const result = await db.query(
    `SELECT id, family_id, created_at, archived_at, text, is_important
     FROM general_observations
     WHERE family_id = $1 AND archived_at IS NOT NULL
     ORDER BY archived_at DESC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Get a single observation by id.
 */
async function getById(id) {
  const result = await db.query(
    `SELECT id, family_id, created_at, archived_at, text, is_important
     FROM general_observations WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update text and/or is_important on an observation.
 * Returns updated row.
 */
async function updateObservation(id, familyId, { text, isImportant }) {
  const result = await db.query(
    `UPDATE general_observations
     SET text = COALESCE($3, text),
         is_important = COALESCE($4, is_important)
     WHERE id = $1 AND family_id = $2
     RETURNING id, family_id, created_at, archived_at, text, is_important`,
    [id, familyId, text || null, isImportant !== undefined ? Boolean(isImportant) : null]
  );
  return result.rows[0] || null;
}

/**
 * Archive an observation (set archived_at).
 */
async function archiveObservation(id, familyId) {
  const result = await db.query(
    `UPDATE general_observations
     SET archived_at = NOW()
     WHERE id = $1 AND family_id = $2
     RETURNING id, family_id, created_at, archived_at, text, is_important`,
    [id, familyId]
  );
  return result.rows[0] || null;
}

/**
 * Restore an archived observation (clear archived_at).
 */
async function restoreObservation(id, familyId) {
  const result = await db.query(
    `UPDATE general_observations
     SET archived_at = NULL
     WHERE id = $1 AND family_id = $2
     RETURNING id, family_id, created_at, archived_at, text, is_important`,
    [id, familyId]
  );
  return result.rows[0] || null;
}

/**
 * Hard-delete an observation.
 */
async function deleteObservation(id, familyId) {
  const result = await db.query(
    `DELETE FROM general_observations WHERE id = $1 AND family_id = $2 RETURNING id`,
    [id, familyId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createObservation,
  getActiveByFamily,
  getArchivedByFamily,
  getById,
  updateObservation,
  archiveObservation,
  restoreObservation,
  deleteObservation,
};