'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function registerFamily(baseUrl, extra = {}) {
  const email = `attr-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'integration-test-pass-1',
      name: 'Attribution Test',
      platform: 'web',
      ...extra,
    }),
  });
  const text = await res.text();
  return { res, text, email, body: text ? JSON.parse(text) : {} };
}

async function attributionForParent(parentId) {
  const db = require('../src/lib/db');
  const parent = await db.query('SELECT family_id FROM parent WHERE id = $1', [parentId]);
  const familyId = parent.rows[0] && parent.rows[0].family_id;
  assert.ok(familyId, 'register should create a parent family');
  const attr = await db.query(
    `SELECT source, medium, campaign
     FROM family_acquisition_attribution
     WHERE family_id = $1`,
    [familyId]
  );
  return attr.rows[0] || null;
}

test('email register persists paid UTM wave contract', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text, body } = await registerFamily(http.baseUrl, {
      utm_source: 'meta',
      utm_medium: 'paid_social',
      utm_campaign: 'activation_wave_01_test',
    });
    assert.equal(res.status, 201, text);
    const row = await attributionForParent(body.parentId);
    assert.ok(row, 'attribution row must exist');
    assert.equal(row.source, 'meta');
    assert.equal(row.medium, 'paid_social');
    assert.equal(row.campaign, 'activation_wave_01_test');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('untagged email register stays direct/none', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text, body } = await registerFamily(http.baseUrl);
    assert.equal(res.status, 201, text);
    const row = await attributionForParent(body.parentId);
    assert.ok(row, 'attribution row must exist for platform-only signup');
    assert.equal(row.source, 'direct');
    assert.equal(row.medium, 'none');
    assert.equal(row.campaign, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('email-like UTM source does not persist as campaign source', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const { res, text, body } = await registerFamily(http.baseUrl, {
      utm_source: 'parent@example.com',
      utm_campaign: '11111111-2222-4333-8555-666666666666',
    });
    assert.equal(res.status, 201, text);
    const row = await attributionForParent(body.parentId);
    assert.ok(row);
    assert.notEqual(row.source, 'parent@example.com');
    assert.equal(row.source, 'direct');
    assert.equal(row.medium, 'none');
    assert.equal(row.campaign, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
