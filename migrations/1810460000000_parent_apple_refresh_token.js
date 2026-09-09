'use strict';

/**
 * Persist Apple refresh tokens so Sign in with Apple credentials can be
 * revoked when the parent unlinks Apple or the family account is deleted
 * (App Store Guideline 5.1.1(v)).
 */

module.exports = {
  name: '1810460000000_parent_apple_refresh_token',
  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
        ADD COLUMN IF NOT EXISTS apple_refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS apple_client_hint VARCHAR(16)
    `);
  },
  down: async (client) => {
    await client.query(`
      ALTER TABLE parent
        DROP COLUMN IF EXISTS apple_refresh_token,
        DROP COLUMN IF EXISTS apple_client_hint
    `);
  },
};
