'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('parent', {
    apple_refresh_token: { type: 'text', notNull: false },
    apple_client_hint: { type: 'varchar(16)', notNull: false },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('parent', ['apple_refresh_token', 'apple_client_hint']);
};
