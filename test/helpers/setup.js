/**
 * Test setup helpers.
 * Provides mock DB injection so tests run without a live connection.
 * For tests that need real DB access, export setupTestDb() with DATABASE_URL.
 */

'use strict';

const path = require('path');

/**
 * Inject a mock db module into require.cache before loading any module
 * that depends on src/lib/db.
 *
 * Returns a control object with setRows/setQuery to configure mock behavior,
 * and a restore() to undo the injection.
 */
function injectMockDb() {
  // Must set DATABASE_URL before any module tries to load db.js
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'REDACTED/mock_test';
  }

  let mockQueryFn = async () => ({ rows: [] });

  const mockDb = {
    query: async (text, params) => mockQueryFn(text, params),
    getClient: async () => {
      const client = {
        query: async (text, params) => mockQueryFn(text, params),
        release: () => {},
      };
      return client;
    },
    pool: { query: async (text, params) => mockQueryFn(text, params) },
  };

  const dbPath = require.resolve(path.join(__dirname, '../../src/lib/db'));
  const original = require.cache[dbPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: mockDb,
    children: [],
    parent: null,
    paths: [],
  };

  return {
    setRows(rows) { mockQueryFn = async () => ({ rows }); },
    setQuery(fn) { mockQueryFn = fn; },
    restore() {
      if (original) {
        require.cache[dbPath] = original;
      } else {
        delete require.cache[dbPath];
      }
    },
  };
}

/**
 * Fake Express res object for middleware testing.
 * Captures the first status/json call so you can assert on it.
 */
function makeFakeRes() {
  let statusCode;
  let body;
  let resolved = false;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      if (!resolved) { body = data; resolved = true; }
      return res;
    },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return res;
}

/**
 * Run Express middleware and return { next, status, body }.
 */
function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    let statusCode;
    const res = {
      status(code) { statusCode = code; return res; },
      json(data) { resolve({ next: false, status: statusCode, body: data }); return res; },
    };
    middleware(req, res, () => resolve({ next: true }));
  });
}

module.exports = { injectMockDb, makeFakeRes, runMiddleware };
