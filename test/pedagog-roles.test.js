/**
 * Pedagog roles integration tests.
 * Tests: getParentRoles, syncAccountType, ghost-draft upsert.
 *
 * Run: node --test test/pedagog-roles.test.js
 */

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Mock DATABASE_URL before any module loads
process.env.DATABASE_URL = 'REDACTED/mock_test';

// ─── Mock DB ─────────────────────────────────────────────────────────────────
let queryStack = [];

function pushQueryResult(rows) {
  queryStack.push({ rows, reject: false, throw: null });
}
function pushQueryError(err) {
  queryStack.push({ rows: null, reject: false, throw: err });
}

const mockDb = {
  query: async (text, params) => {
    const entry = queryStack.shift();
    if (entry && entry.throw) throw entry.throw;
    let rows = entry ? entry.rows : [];
    // Simulate SQL role filter for getChildrenForParent (pc.role = ANY($2))
    if (text.includes('parent_child') && params && Array.isArray(params[1])) {
      const allowedRoles = params[1];
      rows = rows.filter((row) => allowedRoles.includes(row.role));
    }
    return { rows };
  },
  getClient: async () => { throw new Error('getClient not mocked'); },
  pool: {},
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: mockDb, children: [], parent: null, paths: [],
};

const parentAccess = require(path.join(__dirname, '../db/parent-access'));

// Also need to reload authz (depends on parent-access via getParentRoles)
const authzPath = require.resolve(path.join(__dirname, '../src/middleware/authz'));
delete require.cache[authzPath];
const authz = require(authzPath);

// ─── Test helpers ─────────────────────────────────────────────────────────────

function clearStack() { queryStack = []; }

function runMw(mw, req) {
  return new Promise((resolve) => {
    let statusCode;
    const res = {
      status(code) { statusCode = code; return { json(body) { resolve({ status: statusCode, body }); } }; },
    };
    const next = (err) => err ? resolve({ error: err }) : resolve({ next: true });
    mw(req, res, next);
  });
}

// ─── getParentRoles ──────────────────────────────────────────────────────────

test('getParentRoles: family parent (primary only)', async () => {
  clearStack();
  pushQueryResult([{ role: 'primary', child_id: 'child-1' }]);
  const result = await parentAccess.getParentRoles('parent-family');
  assert.strictEqual(result.hasPrimaryOrShared, true);
  assert.strictEqual(result.hasPedagogOnly, false);
  assert.deepStrictEqual(result.pedagogChildIds, []);
  assert.strictEqual(result.isDualRole, false);
});

test('getParentRoles: educator parent (pedagog only)', async () => {
  clearStack();
  pushQueryResult([
    { role: 'pedagog', child_id: 'child-1' },
    { role: 'pedagog', child_id: 'child-2' },
  ]);
  const result = await parentAccess.getParentRoles('parent-educator');
  assert.strictEqual(result.hasPrimaryOrShared, false);
  assert.strictEqual(result.hasPedagogOnly, true);
  assert.deepStrictEqual(result.pedagogChildIds, ['child-1', 'child-2']);
  assert.strictEqual(result.isDualRole, false);
});

test('getParentRoles: dual-role parent (primary + pedagog)', async () => {
  clearStack();
  pushQueryResult([
    { role: 'primary', child_id: 'child-1' },
    { role: 'pedagog', child_id: 'child-2' },
  ]);
  const result = await parentAccess.getParentRoles('parent-dual');
  assert.strictEqual(result.hasPrimaryOrShared, true);
  assert.strictEqual(result.hasPedagogOnly, false);
  assert.strictEqual(result.isDualRole, true);
  assert.deepStrictEqual(result.pedagogChildIds, ['child-2']);
});

test('getParentRoles: shared parent (invited, no primary)', async () => {
  clearStack();
  pushQueryResult([{ role: 'shared', child_id: 'child-1' }]);
  const result = await parentAccess.getParentRoles('parent-shared');
  assert.strictEqual(result.hasPrimaryOrShared, true);
  assert.strictEqual(result.hasPedagogOnly, false);
  assert.strictEqual(result.isDualRole, false);
});

test('getParentRoles: no parent_child links (edge case)', async () => {
  clearStack();
  pushQueryResult([]);
  const result = await parentAccess.getParentRoles('parent-orphan');
  assert.strictEqual(result.hasPrimaryOrShared, false);
  assert.strictEqual(result.hasPedagogOnly, false); // length=0 so every() returns true but hasPrimaryOrShared=false
  assert.deepStrictEqual(result.pedagogChildIds, []);
  assert.strictEqual(result.isDualRole, false);
});

// ─── getChildrenForParent ────────────────────────────────────────────────────

test('getChildrenForParent defaults to primary+shared', async () => {
  clearStack();
  pushQueryResult([
    { id: 'child-1', name: 'Emma', role: 'primary' },
    { id: 'child-2', name: 'Axel', role: 'shared' },
  ]);
  const result = await parentAccess.getChildrenForParent('parent-1');
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, 'child-1');
  assert.strictEqual(result[1].id, 'child-2');
});

test('getChildrenForParent filters by allowedRoles', async () => {
  clearStack();
  pushQueryResult([{ id: 'child-1', name: 'Lärare-Olle', role: 'pedagog' }]);
  const result = await parentAccess.getChildrenForParent('parent-pedagog', { allowedRoles: ['pedagog'] });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].role, 'pedagog');
});

test('getChildrenForParent returns empty for pedagog-only on default roles', async () => {
  clearStack();
  pushQueryResult([{ id: 'child-1', name: 'Elev', role: 'pedagog' }]);
  const result = await parentAccess.getChildrenForParent('parent-pedagog'); // defaults to ['primary','shared']
  assert.strictEqual(result.length, 0);
});

// ─── syncAccountType ─────────────────────────────────────────────────────────

test('syncAccountType: family (primary only)', async () => {
  clearStack();
  pushQueryResult([{ role: 'primary', child_id: 'child-1' }]);
  pushQueryResult({ rowCount: 1 }); // UPDATE parent
  const type = await parentAccess.syncAccountType('parent-1');
  assert.strictEqual(type, 'family');
});

test('syncAccountType: educator (pedagog only)', async () => {
  clearStack();
  pushQueryResult([{ role: 'pedagog', child_id: 'child-1' }]);
  pushQueryResult({ rowCount: 1 });
  const type = await parentAccess.syncAccountType('parent-pedagog');
  assert.strictEqual(type, 'educator');
});

test('syncAccountType: dual (primary + pedagog)', async () => {
  clearStack();
  pushQueryResult([
    { role: 'primary', child_id: 'child-1' },
    { role: 'pedagog', child_id: 'child-2' },
  ]);
  pushQueryResult({ rowCount: 1 });
  const type = await parentAccess.syncAccountType('parent-dual');
  assert.strictEqual(type, 'dual');
});

// ─── Pedagog-only access on family routes ─────────────────────────────────────

test('requireNotPedagogOnly → 403 for educator (pedagog-only) parent', async () => {
  clearStack();
  pushQueryResult([{ role: 'pedagog', child_id: 'child-1' }]);
  const req = { user: { id: 'pedagog-id' } };
  const result = await runMw(authz.requireNotPedagogOnly, req);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.error, 'PEDAGOG_ONLY');
});

test('requirePrimaryParent → 403 for shared parent', async () => {
  clearStack();
  pushQueryResult([]); // no role='primary' row
  const req = { user: { id: 'shared-id' } };
  const result = await runMw(authz.requirePrimaryParent, req);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.error, 'ONLY_PRIMARY');
});