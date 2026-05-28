/**
 * db/library-update-log.js
 * Owns: library_update_log table — debounce state for push/in-app notifications
 *       triggered by admin mutations to the standard library.
 * Does NOT own: sending notifications (that's src/lib/library-notifications.js),
 *               push subscription management (push_subscriptions table).
 */

const db = require('../src/lib/db');

const DEBOUNCE_MINUTES = 10;

/**
 * Record a pending library update. Upserts on (kind, sent_at IS NULL):
 *   - If no pending row exists → insert with flush_after = NOW() + DEBOUNCE_MINUTES
 *   - If pending row exists → increment change_count, update description, extend flush_after
 *
 * @param {'activity'|'reward'|'schedule'} kind
 * @param {string} description — human-readable description of the change
 * @returns {Promise<object>} the upserted row
 */
async function recordPendingUpdate(kind, description) {
  // We use a CTE to handle the pending-row upsert atomically.
  // The partial unique index (kind WHERE sent_at IS NULL) makes INSERT conflict
  // when a pending row already exists — we then UPDATE it.
  const result = await db.query(
    `INSERT INTO library_update_log (kind, change_count, sample_description, flush_after)
     VALUES ($1, 1, $2, NOW() + INTERVAL '10 minutes')
     ON CONFLICT (kind) WHERE sent_at IS NULL
     DO UPDATE SET
       change_count       = library_update_log.change_count + 1,
       sample_description = EXCLUDED.sample_description,
       flush_after        = NOW() + INTERVAL '10 minutes',
       updated_at         = NOW()
     RETURNING *`,
    [kind, description]
  );
  return result.rows[0];
}

/**
 * Fetch all pending rows whose flush_after has passed (ready to send).
 * @returns {Promise<object[]>}
 */
async function getPendingDue() {
  const result = await db.query(
    `SELECT id, kind, change_count, sample_description
     FROM library_update_log
     WHERE sent_at IS NULL AND flush_after <= NOW()
     ORDER BY id ASC`
  );
  return result.rows;
}

/**
 * Mark a log row as sent.
 * @param {number} id
 * @returns {Promise<void>}
 */
async function markSent(id) {
  await db.query(
    `UPDATE library_update_log SET sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

module.exports = {
  recordPendingUpdate,
  getPendingDue,
  markSent,
};
