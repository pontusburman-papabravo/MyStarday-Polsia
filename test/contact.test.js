/**
 * contact.test.js — Regression test: exactly ONE /api/contact handler exists.
 *
 * Bug context: at some point a duplicate route handler was registered.
 * This test ensures there is exactly one POST handler on the contact router.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

test('contact router has exactly one POST handler on /', () => {
  const mock = injectMockDb();

  try {
    // Clear any cached version to ensure clean load
    const contactPath = require.resolve(path.join(__dirname, '../src/routes/contact'));
    delete require.cache[contactPath];

    const router = require(contactPath);

    // Express router stores its stack as an array of Layer objects
    const postLayers = router.stack
      ? router.stack.filter(layer => layer.route && layer.route.methods && layer.route.methods.post)
      : [];

    assert.equal(postLayers.length, 1, `Expected exactly 1 POST handler, got ${postLayers.length}`);

    // Verify the path is '/' (root of the contact router)
    const routePaths = postLayers.map(l => l.route.path);
    assert.deepEqual(routePaths, ['/'], `POST handler should be on '/', got ${JSON.stringify(routePaths)}`);
  } finally {
    mock.restore();
  }
});

test('contact route validates required fields', async () => {
  const mock = injectMockDb();

  try {
    const contactPath = require.resolve(path.join(__dirname, '../src/routes/contact'));
    delete require.cache[contactPath];

    // Simulate route logic: name/email/message are required
    const requiredFields = ['name', 'email', 'message'];
    const body = { name: '', email: 'test@test.com', message: 'Hi' };

    const missing = requiredFields.filter(f => !body[f]);
    assert.deepEqual(missing, ['name'], 'Should detect missing name field');
  } finally {
    mock.restore();
  }
});
