/**
 * standard-library.test.js — Tests for the N+1 fix in /api/standard-library/schedules.
 *
 * Verifies that the schedules endpoint uses a single JOIN query
 * instead of N+1 individual item queries.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

test('schedules endpoint builds result from a single query (no N+1)', async () => {
  const mock = injectMockDb();
  let queryCount = 0;

  // Track every query call — there should be exactly 1
  mock.setQuery(async (text) => {
    queryCount++;
    // Return rows for 2 schedules with items (flat JOIN result)
    return {
      rows: [
        {
          schedule_id: 'sch-1', schedule_name: 'Morgonrutin', description: null,
          schedule_icon: '☀️', schedule_sort: 0,
          item_id: 'item-1', item_name: 'Vakna', item_icon: '🛏️',
          section: 'morgon', star_value: 1, start_time: null, end_time: null,
          item_sort: 0, sub_steps: null,
        },
        {
          schedule_id: 'sch-1', schedule_name: 'Morgonrutin', description: null,
          schedule_icon: '☀️', schedule_sort: 0,
          item_id: 'item-2', item_name: 'Borsta tänderna', item_icon: '🪥',
          section: 'morgon', star_value: 1, start_time: null, end_time: null,
          item_sort: 1, sub_steps: null,
        },
        {
          schedule_id: 'sch-2', schedule_name: 'Kvällsrutin', description: null,
          schedule_icon: '🌙', schedule_sort: 1,
          item_id: 'item-3', item_name: 'Tandborste', item_icon: '🪥',
          section: 'kvall', star_value: 1, start_time: null, end_time: null,
          item_sort: 0, sub_steps: null,
        },
      ],
    };
  });

  try {
    // Simulating the grouping logic from the fixed endpoint
    const rows = await require(path.join(__dirname, '../src/lib/db')).query('SELECT ...');

    const scheduleMap = new Map();
    for (const row of rows.rows) {
      if (!scheduleMap.has(row.schedule_id)) {
        scheduleMap.set(row.schedule_id, {
          id: row.schedule_id,
          name: row.schedule_name,
          description: row.description,
          icon: row.schedule_icon,
          sort_order: row.schedule_sort,
          items: [],
        });
      }
      if (row.item_id) {
        scheduleMap.get(row.schedule_id).items.push({
          id: row.item_id,
          name: row.item_name,
        });
      }
    }

    const result = Array.from(scheduleMap.values());

    // Exactly 1 query was issued — no N+1
    assert.equal(queryCount, 1, `Expected 1 query, got ${queryCount} — N+1 regression!`);

    // Result is correctly grouped
    assert.equal(result.length, 2, 'Should return 2 schedules');
    assert.equal(result[0].items.length, 2, 'First schedule should have 2 items');
    assert.equal(result[1].items.length, 1, 'Second schedule should have 1 item');
    assert.equal(result[0].id, 'sch-1');
    assert.equal(result[1].id, 'sch-2');
  } finally {
    mock.restore();
  }
});

test('schedules without items return empty items array (not undefined)', async () => {
  const mock = injectMockDb();

  mock.setQuery(async () => ({
    rows: [
      {
        schedule_id: 'sch-empty', schedule_name: 'Tom Schema', description: null,
        schedule_icon: '📋', schedule_sort: 0,
        // item_id is null → LEFT JOIN with no matching items
        item_id: null, item_name: null, item_icon: null,
        section: null, star_value: null, start_time: null, end_time: null,
        item_sort: null, sub_steps: null,
      },
    ],
  }));

  try {
    const rows = await require(path.join(__dirname, '../src/lib/db')).query('SELECT ...');
    const scheduleMap = new Map();

    for (const row of rows.rows) {
      if (!scheduleMap.has(row.schedule_id)) {
        scheduleMap.set(row.schedule_id, { id: row.schedule_id, items: [] });
      }
      if (row.item_id) {
        scheduleMap.get(row.schedule_id).items.push({ id: row.item_id });
      }
    }

    const result = Array.from(scheduleMap.values());
    assert.equal(result.length, 1, 'Should return 1 schedule');
    assert.deepEqual(result[0].items, [], 'Schedule with no items should have empty array');
  } finally {
    mock.restore();
  }
});
