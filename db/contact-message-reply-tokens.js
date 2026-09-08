'use strict';

const db = require('../src/lib/db');

async function insertToken({
  contactMessageId,
  tokenHash,
  expiresAt,
  createdBy = 'system',
  purpose = 'follow_up',
}) {
  const { rows } = await db.query(
    `INSERT INTO contact_message_reply_token
       (contact_message_id, token_hash, purpose, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, contact_message_id, token_hash, purpose, created_at,
               expires_at, revoked_at, last_used_at, use_count, created_by`,
    [contactMessageId, tokenHash, purpose, expiresAt, createdBy]
  );
  return rows[0] || null;
}

async function findByHash(tokenHash) {
  const { rows } = await db.query(
    `SELECT id, contact_message_id, token_hash, purpose, created_at,
            expires_at, revoked_at, last_used_at, use_count, created_by
     FROM contact_message_reply_token
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function findActiveForMessage(contactMessageId) {
  const { rows } = await db.query(
    `SELECT id, contact_message_id, token_hash, purpose, created_at,
            expires_at, revoked_at, last_used_at, use_count, created_by
     FROM contact_message_reply_token
     WHERE contact_message_id = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [contactMessageId]
  );
  return rows;
}

async function markUsed(id) {
  const { rows } = await db.query(
    `UPDATE contact_message_reply_token
     SET last_used_at = NOW(), use_count = use_count + 1
     WHERE id = $1
     RETURNING id, use_count, last_used_at`,
    [id]
  );
  return rows[0] || null;
}

async function revokeToken(id) {
  const { rows } = await db.query(
    `UPDATE contact_message_reply_token
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE id = $1
     RETURNING id, contact_message_id, revoked_at`,
    [id]
  );
  return rows[0] || null;
}

async function revokeActiveForMessage(contactMessageId) {
  const { rows } = await db.query(
    `UPDATE contact_message_reply_token
     SET revoked_at = NOW()
     WHERE contact_message_id = $1
       AND revoked_at IS NULL
     RETURNING id`,
    [contactMessageId]
  );
  return rows;
}

function hashExistsInDb(tokenHash) {
  return findByHash(tokenHash).then((row) => Boolean(row));
}

module.exports = {
  insertToken,
  findByHash,
  findActiveForMessage,
  markUsed,
  revokeToken,
  revokeActiveForMessage,
  hashExistsInDb,
};
