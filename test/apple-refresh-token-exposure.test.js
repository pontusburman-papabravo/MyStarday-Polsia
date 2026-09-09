'use strict';

/**
 * apple_refresh_token is a long-lived Apple credential.
 * It may be used server-side for revoke / unlink / delete only.
 * It must never appear in API, admin, export, snapshot, or log payloads.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLAINTEXT = 'apple-refresh-token-MUST-NOT-LEAK';

function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('apple_refresh_token exposure invariant', () => {
  it('SQL export redacts apple_refresh_token and existing credential columns', () => {
    const { prepareRowForExport, REDACTED_COLUMN_NAMES } = require('../src/lib/sql-export-utils');
    assert.ok(REDACTED_COLUMN_NAMES.has('apple_refresh_token'));
    assert.ok(REDACTED_COLUMN_NAMES.has('password_hash'));
    assert.ok(REDACTED_COLUMN_NAMES.has('token_hash'));
    assert.ok(REDACTED_COLUMN_NAMES.has('native_token'));

    const row = prepareRowForExport(
      {
        id: 'p1',
        password_hash: 'pw-secret',
        token_hash: 'tok-secret',
        native_token: 'push-secret',
        apple_refresh_token: PLAINTEXT,
        apple_client_hint: 'native',
        email: 'a@example.com',
      },
      { redactSensitive: true }
    );
    assert.equal(row.apple_refresh_token, '[REDACTED]');
    assert.equal(row.password_hash, '[REDACTED]');
    assert.equal(row.token_hash, '[REDACTED]');
    assert.equal(row.native_token, '[REDACTED]');
    assert.equal(row.apple_client_hint, 'native');
    assert.doesNotMatch(JSON.stringify(row), new RegExp(PLAINTEXT));
  });

  it('admin migration family export redacts parent credentials', async () => {
    const { buildFamilyExportBundle } = require('../src/lib/family-export');
    async function query(sql) {
      if (/SELECT \* FROM parent WHERE family_id/.test(sql)) {
        return {
          rows: [
            {
              id: 'p1',
              family_id: 'fam1',
              email: 'a@example.com',
              password_hash: 'pw-secret',
              apple_refresh_token: PLAINTEXT,
              apple_client_hint: 'web',
              name: 'Ada',
            },
          ],
        };
      }
      return { rows: [] };
    }

    const { files } = await buildFamilyExportBundle(query, 'fam1');
    const parents = files['parent.json'];
    assert.ok(Array.isArray(parents) && parents.length === 1);
    assert.equal(parents[0].apple_refresh_token, '[REDACTED]');
    assert.equal(parents[0].password_hash, '[REDACTED]');
    assert.equal(parents[0].apple_client_hint, 'web');
    assert.equal(parents[0].email, 'a@example.com');
    assert.doesNotMatch(JSON.stringify(files), new RegExp(PLAINTEXT));
    assert.doesNotMatch(JSON.stringify(files), /pw-secret/);
  });

  it('ops snapshot denylist blocks apple_refresh_token fingerprints', async () => {
    const { PII_FIELD_DENYLIST, SNAPSHOT_TABLE_SPECS } = await import(
      '../scripts/ops/lib/snapshot-tables.mjs'
    );
    assert.equal(PII_FIELD_DENYLIST.has('apple_refresh_token'), true);
    assert.equal(PII_FIELD_DENYLIST.has('password_hash'), true);
    for (const spec of SNAPSHOT_TABLE_SPECS) {
      assert.equal(
        spec.fingerprintColumns.includes('apple_refresh_token'),
        false,
        `${spec.table} fingerprint`
      );
    }
  });

  it('ordinary auth/account API sources do not select or serialize the token', () => {
    const paths = [
      'src/routes/auth/login.js',
      'src/routes/auth/session.js',
      'src/routes/account/helpers.js',
      'src/routes/account/export.js',
      'src/routes/family/core.js',
      'src/lib/avatar-api.js',
    ];
    for (const rel of paths) {
      assert.doesNotMatch(src(rel), /apple_refresh_token/, rel);
    }

    const parentAuth = src('db/parent.js');
    assert.match(parentAuth, /const PARENT_AUTH_SELECT =/);
    const authSelect = parentAuth.slice(
      parentAuth.indexOf('const PARENT_AUTH_SELECT'),
      parentAuth.indexOf('Get a parent by Apple')
    );
    assert.doesNotMatch(authSelect, /apple_refresh_token/);

    const session = src('src/routes/auth/session.js');
    assert.match(session, /const user = \{/);
    assert.match(session, /id: parent\.id/);
    assert.doesNotMatch(session, /res\.json\(\s*parent/);
    assert.doesNotMatch(session, /JSON\.stringify\(\s*parent/);
  });

  it('unlink and delete collect the token server-side before clear', () => {
    const unlink = src('src/routes/account/identity.js');
    const collectAt = unlink.indexOf('listAppleRefreshTokens');
    const clearAt = unlink.indexOf('apple_refresh_token = NULL');
    const revokeAt = unlink.indexOf('revokeCollectedAppleTokens');
    assert.ok(collectAt > 0, 'unlink collects tokens');
    assert.ok(collectAt < clearAt, 'unlink collects before clear');
    assert.ok(clearAt < revokeAt, 'unlink revokes after clear SQL');

    const admin = src('src/routes/admin/family.js');
    const adminCollect = admin.indexOf('listAppleRefreshTokens');
    const adminClear = admin.indexOf('apple_refresh_token = NULL');
    assert.ok(adminCollect > 0 && adminCollect < adminClear, 'admin unlink collects before clear');

    const deletion = src('src/lib/family-deletion.js');
    assert.match(deletion, /collectAppleRefreshTokens/);
    assert.match(deletion, /revokeCollectedAppleTokens/);
    assert.match(deletion, /listAppleRefreshTokens/);
  });

  it('token is not interpolated into console logging', () => {
    const watched = [
      'src/lib/apple-token.js',
      'src/lib/family-deletion.js',
      'src/routes/account/identity.js',
      'src/routes/admin/family.js',
      'src/routes/auth/oauth-apple.js',
      'db/parent.js',
    ];
    const leakLog = /console\.(log|info|debug|warn|error)\([^;]*apple_refresh_token/;
    const leakRefresh = /console\.(log|info|debug|warn|error)\([^;]*refreshToken/;
    for (const rel of watched) {
      const text = src(rel);
      assert.doesNotMatch(text, leakLog, rel);
      assert.doesNotMatch(text, leakRefresh, rel);
    }
  });

  it('family-export applies shared credential redaction', () => {
    const exp = src('src/lib/family-export.js');
    assert.match(exp, /prepareRowForExport/);
    assert.match(exp, /redactSensitive:\s*true/);
  });
});
