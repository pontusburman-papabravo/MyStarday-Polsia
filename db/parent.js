/**
 * Parent entity DB module.
 * Owns: parent table queries (including Apple + Google Sign In).
 * Does NOT own: parent_child linking, auth tokens, push subscriptions.
 */

const db = require('../src/lib/db');

const PARENT_AUTH_SELECT = `
  SELECT id, family_id, email, name, verified, is_admin, created_at,
         password_hash IS NOT NULL AS has_password,
         apple_user_id, google_user_id,
         COALESCE(onboarding_completed, true) AS onboarding_completed
  FROM parent`;

/**
 * Get a parent by Apple user ID.
 */
async function getParentByAppleUserId(appleUserId) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE apple_user_id = $1`,
    [appleUserId]
  );
  return result.rows[0] || null;
}

/**
 * Get a parent by Google user ID (JWT sub).
 */
async function getParentByGoogleUserId(googleUserId) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE google_user_id = $1`,
    [googleUserId]
  );
  return result.rows[0] || null;
}

/**
 * Get a parent by email (for linking existing accounts to OAuth).
 */
async function getParentByEmail(email) {
  const result = await db.query(
    `${PARENT_AUTH_SELECT} WHERE LOWER(email) = LOWER($1)`,
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

async function saveAppleRefreshToken(parentId, refreshToken, clientHint) {
  if (!parentId || !refreshToken) return null;
  const hint = clientHint === 'native' || clientHint === 'web' ? clientHint : null;
  const result = await db.query(
    `UPDATE parent
     SET apple_refresh_token = $2, apple_client_hint = COALESCE($3, apple_client_hint)
     WHERE id = $1
     RETURNING id`,
    [parentId, refreshToken, hint]
  );
  return result.rows[0] || null;
}

async function clearAppleRefreshToken(parentId) {
  if (!parentId) return null;
  const result = await db.query(
    `UPDATE parent
     SET apple_refresh_token = NULL, apple_client_hint = NULL
     WHERE id = $1
     RETURNING id`,
    [parentId]
  );
  return result.rows[0] || null;
}

/**
 * @param {{ parentId?: string|null, familyId?: string|null, client?: { query: Function }|null }} opts
 */
async function listAppleRefreshTokens(opts = {}) {
  const { parentId = null, familyId = null, client = null } = opts;
  const exec = client && typeof client.query === 'function' ? client : db;
  if (parentId) {
    const result = await exec.query(
      `SELECT id, apple_refresh_token, apple_client_hint
       FROM parent
       WHERE id = $1 AND apple_refresh_token IS NOT NULL`,
      [parentId]
    );
    return result.rows;
  }
  if (familyId) {
    const result = await exec.query(
      `SELECT id, apple_refresh_token, apple_client_hint
       FROM parent
       WHERE family_id = $1 AND apple_refresh_token IS NOT NULL`,
      [familyId]
    );
    return result.rows;
  }
  return [];
}

/**
 * Link a Google user ID to an existing parent account.
 */
async function linkGoogleUserId(parentId, googleUserId) {
  const result = await db.query(
    `UPDATE parent
     SET google_user_id = $2
     WHERE id = $1
     RETURNING id`,
    [parentId, googleUserId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getParentByAppleUserId,
  getParentByGoogleUserId,
  getParentByEmail,
  linkAppleUserId,
  linkGoogleUserId,
  saveAppleRefreshToken,
  clearAppleRefreshToken,
  listAppleRefreshTokens,
};
