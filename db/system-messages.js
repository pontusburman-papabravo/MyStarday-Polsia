/**
 * db/system-messages.js
 * Owns: system_messages table — admin-to-family direct notifications.
 * Does NOT own: authentication, SSE broadcasting, or contact messages.
 */

const db = require('../src/lib/db');

/**
 * Create a new system message for a family.
 * @param {string} familyId
 * @param {string} message
 * @returns {Promise<object>} the created row
 */
async function createSystemMessage(familyId, message) {
  const result = await db.query(
    `INSERT INTO system_messages (family_id, message)
     VALUES ($1, $2)
     RETURNING *`,
    [familyId, message]
  );
  return result.rows[0];
}

/**
 * Get unread system messages for a family (no per-parent filtering — generic use).
 * @param {string} familyId
 * @returns {Promise<object[]>}
 */
async function getUnreadMessages(familyId) {
  const result = await db.query(
    `SELECT id, message, created_at
     FROM system_messages
     WHERE family_id = $1 AND is_read = false
     ORDER BY created_at ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Get unread system messages for a specific parent, filtering out messages
 * the parent has already dismissed.
 * @param {string} familyId
 * @param {string} parentId
 * @returns {Promise<object[]>}
 */
async function getUnreadMessagesForParent(familyId, parentId) {
  const result = await db.query(
    `SELECT id, message, created_at
     FROM system_messages
     WHERE family_id = $1
       AND is_read = false
       AND (dismissed_by_parent_ids IS NULL OR NOT ($2 = ANY(dismissed_by_parent_ids)))
     ORDER BY created_at ASC`,
    [familyId, parentId]
  );
  return result.rows;
}

/**
 * Mark a message as read — only if it belongs to the given family.
 * @param {string} messageId
 * @param {string} familyId  — ownership check
 * @returns {Promise<boolean>} true if updated
 */
async function markAsRead(messageId, familyId) {
  const result = await db.query(
    `UPDATE system_messages
     SET is_read = true
     WHERE id = $1 AND family_id = $2`,
    [messageId, familyId]
  );
  return result.rowCount > 0;
}

/**
 * Dismiss a system message for a specific parent.
 * Sets is_read = true AND records the parent in dismissed_by_parent_ids,
 * so the message won't reappear for this parent on future page loads.
 * @param {string} messageId
 * @param {string} familyId — ownership check
 * @param {string} parentId — the parent dismissing this message
 * @returns {Promise<boolean>} true if updated
 */
async function dismissForParent(messageId, familyId, parentId) {
  const result = await db.query(
    `UPDATE system_messages
     SET is_read = true,
         dismissed_by_parent_ids = ARRAY_APPEND(
           COALESCE(dismissed_by_parent_ids, ARRAY[]::UUID[]),
           $3::UUID
         )
     WHERE id = $1 AND family_id = $2`,
    [messageId, familyId, parentId]
  );
  return result.rowCount > 0;
}

/**
 * Get recent messages sent to a family (admin history view, latest 10).
 * @param {string} familyId
 * @returns {Promise<object[]>}
 */
async function getRecentMessages(familyId) {
  const result = await db.query(
    `SELECT id, message, is_read, created_at
     FROM system_messages
     WHERE family_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [familyId]
  );
  return result.rows;
}

module.exports = {
  createSystemMessage,
  getUnreadMessages,
  getUnreadMessagesForParent,
  markAsRead,
  dismissForParent,
  getRecentMessages,
};
