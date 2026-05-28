/**
 * Child observation queries — free-standing notes per child per date.
 * Does NOT own: child access verification (done in routes).
 */
const db = require('../src/lib/db');

/**
 * Upsert an observation (create or update).
 * Returns the observation row.
 */
async function upsertObservation({ id, childId, parentId, date, section, content, isImportant }) {
  const sql = id
    ? `UPDATE child_observation
       SET content = $5, section = $4, is_important = $6, updated_at = NOW()
       WHERE id = $1 AND parent_id = $2
       RETURNING id, child_id, parent_id, date, section, content, is_important, created_at, updated_at`
    : `INSERT INTO child_observation (child_id, parent_id, date, section, content, is_important)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET content = $5, section = $4, is_important = $6, updated_at = NOW()
       RETURNING id, child_id, parent_id, date, section, content, is_important, created_at, updated_at`;

  const params = id
    ? [id, parentId, content, section, content, isImportant]
    : [childId, parentId, date, section, content, isImportant];

  const result = await db.query(sql, params);
  return result.rows[0];
}

/**
 * Get all observations for a child within a date range.
 * Ordered by date DESC, then section order.
 */
async function getObservationsForRange(childId, dateFrom, dateTo) {
  const result = await db.query(
    `SELECT co.id, co.date, co.section, co.content, co.is_important, co.created_at,
            co.parent_id,
            p.name AS parent_name
     FROM child_observation co
     JOIN parent p ON p.id = co.parent_id
     WHERE co.child_id = $1 AND co.date >= $2 AND co.date <= $3
     ORDER BY co.date DESC,
       ARRAY_POSITION(ARRAY['fm','em','kvall'], co.section) ASC NULLS LAST,
       co.created_at ASC`,
    [childId, dateFrom, dateTo]
  );
  return result.rows;
}

/**
 * Get a single observation by id.
 */
async function getObservationById(id) {
  const result = await db.query(
    `SELECT id, child_id, parent_id, date, section, content, is_important, created_at, updated_at
     FROM child_observation WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Delete an observation.
 */
async function deleteObservation(id, parentId) {
  const result = await db.query(
    `DELETE FROM child_observation WHERE id = $1 AND parent_id = $2 RETURNING id`,
    [id, parentId]
  );
  return result.rows[0];
}

module.exports = { upsertObservation, getObservationsForRange, getObservationById, deleteObservation };