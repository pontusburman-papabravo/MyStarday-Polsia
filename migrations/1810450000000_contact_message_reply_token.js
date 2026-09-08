'use strict';

/**
 * Opaque hashed reply tokens for contact_message follow-up links.
 * Credential storage only — not a second support model.
 */
module.exports = {
  name: '1810450000000_contact_message_reply_token',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_message_reply_token (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_message_id INTEGER NOT NULL REFERENCES contact_message(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        purpose VARCHAR(32) NOT NULL DEFAULT 'follow_up',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        use_count INTEGER NOT NULL DEFAULT 0,
        created_by VARCHAR(32) NOT NULL DEFAULT 'system'
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cm_reply_token_message
        ON contact_message_reply_token (contact_message_id, revoked_at, expires_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cm_reply_token_active
        ON contact_message_reply_token (token_hash)
        WHERE revoked_at IS NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_cm_reply_token_active');
    await client.query('DROP INDEX IF EXISTS idx_cm_reply_token_message');
    await client.query('DROP TABLE IF EXISTS contact_message_reply_token');
  },
};
