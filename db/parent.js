/**
 * Parent entity DB module.
 * Owns: parent table queries (including Apple Sign In).
 * Does NOT own: parent_child linking, auth tokens, push subscriptions.
 */

const db = require('../src/lib/db');

/**
 * Get a parent by Apple user ID.
 */
async function getParentByAppleUserId(appleUserId) {
  const result = await db.query(
    `SELECT id, family_id, email, name, verified, is_admin, created_at,
            COALESCE(onboarding_completed, true) as onboarding_completed
     FROM parent
     WHERE apple_user_id = $1`,
    [appleUserId]
  );
  return result.rows[0] || null;
}

/**
 * Get a parent by email (for linking existing accounts to Apple).
 */
async function getParentByEmail(email) {
  const result = await db.query(
    `SELECT id, family_id, email, name, verified, is_admin, created_at,
            password_hash IS NOT NULL as has_password,
            COALESCE(onboarding_completed, true) as onboarding_completed
     FROM parent
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Link an Apple user ID to an existing parent account.
 */
async function linkAppleUserId(parentId, appleUserId, appleEmail) {
  const result = await db.query(
    `UPDATE parent
     SET apple_user_id = $2, apple_email = $3
     WHERE id = $1
     RETURNING id`,
    [parentId, appleUserId, appleEmail || null]
  );
  return result.rows[0] || null;
}

module.exports = { getParentByAppleUserId, getParentByEmail, linkAppleUserId };