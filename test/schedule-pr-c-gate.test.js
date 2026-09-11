'use strict';

/**
 * PR C gate — executable copy safety + replace-mode invariants (DB-backed).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');
const vm = require('node:vm');
const { setupTestDb } = require('./helpers/setup.js');
const { createTestFamilyWithChild } = require('./helpers/canonical-library-fixture.js');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

async function seedActivity(db, familyId, name) {
  const res = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
     VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
    [familyId, name]
  );
  return res.rows[0].id;
}

async function seedWeeklyDayDetailed(db, childId, dayOfWeek, items) {
  const sched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id`,
    [childId, dayOfWeek, dayOfWeek]
  );
  let sortOrder = 0;
  for (const item of items) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sched.rows[0].id, item.activityId, item.start || null, item.end || null, sortOrder++, item.section || 'morgon']
    );
  }
  return sched.rows[0].id;
}

async function weeklyItemRows(db, childId, dayOfWeek) {
  const res = await db.query(
    `SELECT wsi.activity_template_id, at.name, wsi.section, wsi.start_time, wsi.end_time, wsi.sort_order
     FROM weekly_schedule_item wsi
     JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
     JOIN activity_template at ON at.id = wsi.activity_template_id
     WHERE ws.child_id = $1 AND ws.day_of_week = $2
     ORDER BY wsi.sort_order ASC`,
    [childId, dayOfWeek]
  );
  return res.rows;
}

async function activityTemplateCount(db, familyId) {
  const res = await db.query('SELECT count(*)::int AS n FROM activity_template WHERE family_id = $1', [familyId]);
  return res.rows[0].n;
}

describe('PR C gate — executable copy safety', () => {
  test('merge, empty-source reject, replace_day (DB-backed)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const { copyScheduleDay, ScheduleApplyError } = require('../src/lib/schedule-apply.js');

    try {
      await t.test('merge: Thursday→Monday preserves existing, times, sections; skips duplicate template', async () => {
        const { familyId, childId } = await createTestFamilyWithChild(db);

        const breakfast = await seedActivity(db, familyId, 'Frukost');
        const lunch = await seedActivity(db, familyId, 'Middag');
        const meds = await seedActivity(db, familyId, 'Läkemedel');
        const shared = await seedActivity(db, familyId, 'Delad');
        const mondayOnly = await seedActivity(db, familyId, 'MåndagBefintlig');

        await seedWeeklyDayDetailed(db, childId, 4, [
          { activityId: breakfast, start: '08:30:00', end: '09:00:00', section: 'morgon' },
          { activityId: lunch, start: '12:00:00', end: '12:30:00', section: 'dag' },
          { activityId: meds, start: '20:00:00', end: '20:15:00', section: 'kvall' },
          { activityId: shared, start: '21:00:00', end: '21:30:00', section: 'kvall' },
        ]);
        await seedWeeklyDayDetailed(db, childId, 1, [
          { activityId: mondayOnly, start: '07:00:00', end: '07:15:00', section: 'morgon' },
          { activityId: shared, start: '21:00:00', end: '21:30:00', section: 'kvall' },
        ]);

        const templatesBefore = await activityTemplateCount(db, familyId);

        const result = await copyScheduleDay({
          familyId,
          sourceChildId: childId,
          sourceDayOfWeek: 4,
          targetChildId: childId,
          targetDays: [1],
          mode: 'merge',
        });

        assert.deepEqual(result.applied_days, [1]);
        assert.ok(result.duplicate_items_skipped >= 1, 'shared template should be skipped as duplicate');

        const monday = await weeklyItemRows(db, childId, 1);
        assert.equal(monday.length, 5, 'monday existing + 3 new non-duplicates');
        assert.ok(monday.some((r) => r.name === 'MåndagBefintlig'), 'pre-existing Monday item remains');

        const copiedBreakfast = monday.find((r) => r.name === 'Frukost');
        assert.ok(copiedBreakfast);
        assert.equal(String(copiedBreakfast.start_time).slice(0, 5), '08:30');
        assert.equal(String(copiedBreakfast.end_time).slice(0, 5), '09:00');
        assert.equal(copiedBreakfast.section, 'morgon');

        const orderNames = monday.map((r) => r.name);
        assert.ok(orderNames.includes('Delad'), 'existing shared item remains');
        assert.equal(orderNames.filter((n) => n === 'Delad').length, 1, 'duplicate template not double-added');
        assert.equal(await activityTemplateCount(db, familyId), templatesBefore, 'no new activity templates created');

        const reload = await weeklyItemRows(db, childId, 1);
        assert.deepEqual(reload.map((r) => r.name), orderNames, 'reload matches same order');
      });

      await t.test('empty source rejects with no target mutation', async () => {
        const { familyId, childId } = await createTestFamilyWithChild(db);
        const existing = await seedActivity(db, familyId, 'Existing');
        await seedWeeklyDayDetailed(db, childId, 1, [{ activityId: existing, section: 'morgon' }]);

        await assert.rejects(
          copyScheduleDay({
            familyId, sourceChildId: childId, sourceDayOfWeek: 4, targetChildId: childId, targetDays: [1], mode: 'merge',
          }),
          (err) => err instanceof ScheduleApplyError
        );

        const rows = await weeklyItemRows(db, childId, 1);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].name, 'Existing');
      });

      await t.test('replace_day removes pre-existing target items when explicitly chosen', async () => {
        const { familyId, childId } = await createTestFamilyWithChild(db);
        const src = await seedActivity(db, familyId, 'Torsdag');
        const old = await seedActivity(db, familyId, 'Gammal');
        await seedWeeklyDayDetailed(db, childId, 4, [{ activityId: src, section: 'kvall' }]);
        await seedWeeklyDayDetailed(db, childId, 1, [{ activityId: old, section: 'morgon' }]);

        await copyScheduleDay({
          familyId, sourceChildId: childId, sourceDayOfWeek: 4, targetChildId: childId, targetDays: [1], mode: 'replace_day',
        });

        const monday = await weeklyItemRows(db, childId, 1);
        assert.deepEqual(monday.map((r) => r.name), ['Torsdag']);
      });
    } finally {
      await db.cleanup();
    }
  });
});

describe('PR C gate — replace UI safety (source)', () => {
  test('fresh openCopyDay uses merge default; replace requires confirmReplaceDay before mutate', () => {
    const src = read('public/js/schedule-add-menu.js');
    assert.match(src, /function openCopyDay\(\)[\s\S]*copyDayState\.mode = 'merge'/);
    assert.match(src, /function openCopyDayToCurrentDay\(\)[\s\S]*copyDayState\.mode = 'merge'/);
    const submit = src.slice(src.indexOf('async function submitCopyDay'), src.indexOf('async function doSubmitCopyDay'));
    assert.match(submit, /copyDayState\.mode === 'replace_day'/);
    assert.match(submit, /confirmReplaceDay\(/);
    assert.doesNotMatch(submit, /doSubmitCopyDay\(targetDays\)[\s\S]*replace_day[\s\S]*without[\s\S]*confirm/i);
  });

  test('populated day header has single Copy Day control without promo helper', () => {
    const src = read('public/js/schedule.js');
    const render = src.slice(src.indexOf('function renderSchedule()'), src.indexOf('function renderItem'));
    assert.match(render, /border-gold/);
    assert.doesNotMatch(render, /copyDayPromo/);
  });
});
