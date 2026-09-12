'use strict';

/**
 * P1 fix — existing weekly_schedule row + zero items must use PR C empty state.
 * Reproduces routing defect before fix; locks contract after fix.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCHEDULE_JS = 'public/js/schedule.js';

function loadScheduleBranch() {
  const src = read(SCHEDULE_JS);
  const start = src.indexOf('async function loadScheduleForDay()');
  const end = src.indexOf('async function checkIfDayPaused()');
  return src.slice(start, end);
}

function resolvePostItemsRenderBranch(branch) {
  const marker = 'scheduleItems = data.items || [];';
  const idx = branch.indexOf(marker);
  assert.ok(idx >= 0, 'loadScheduleForDay must assign scheduleItems from API');
  return branch.slice(idx, idx + 600);
}

describe('P1 — empty row routing contract (source)', () => {
  it('repro: post-items branch routes zero items to renderEmptyDay, not renderSchedule', () => {
    const postItems = resolvePostItemsRenderBranch(loadScheduleBranch());
    assert.match(
      postItems,
      /scheduleItems\.length\s*===\s*0[\s\S]*renderEmptyDay\(\)/,
      'zero items must call renderEmptyDay before populated editor'
    );
    assert.doesNotMatch(
      postItems,
      /scheduleItems\.length\s*===\s*0[\s\S]{0,120}renderSchedule\(\)/,
      'zero items must not fall through to renderSchedule'
    );
  });

  it('contract: no-row path still uses renderEmptyDay', () => {
    const branch = loadScheduleBranch();
    assert.match(branch, /if \(!ds\) \{[\s\S]*renderEmptyDay\(\)/);
  });

  it('contract: populated path still uses renderSchedule when items exist', () => {
    const branch = loadScheduleBranch();
    assert.match(branch, /else renderSchedule\(\)/);
  });

  it('contract: otherDaysHaveSchedule checks sibling item_count, not row existence alone', () => {
    const src = read(SCHEDULE_JS);
    const fn = src.slice(src.indexOf('function otherDaysHaveSchedule'), src.indexOf('function emptyStateActionsHtml'));
    assert.match(fn, /item_count/);
    assert.match(fn, /Number\(s\.item_count\)\s*>\s*0/);
  });

  it('contract: empty-state actions preserve currentScheduleId context (no nulling on empty row)', () => {
    const branch = loadScheduleBranch();
    const postItems = resolvePostItemsRenderBranch(branch);
    assert.doesNotMatch(
      postItems,
      /scheduleItems\.length\s*===\s*0[\s\S]{0,80}currentScheduleId\s*=\s*null/,
      'empty row must keep currentScheduleId for first save'
    );
  });

  it('i18n: sv-SE + en-GB empty keys unchanged', () => {
    for (const loc of ['config/i18n/schedule-sv-SE.json', 'config/i18n/schedule-en-GB.json']) {
      const json = JSON.parse(read(loc));
      for (const key of ['addActivity', 'useTemplate', 'copyFromDay']) {
        assert.ok(json.empty[key], `${loc} missing empty.${key}`);
      }
    }
  });

  it('contrast: PLANNER_PRIMARY_BTN navy-on-gold token intact', () => {
    const core = read('public/js/schedule-core.js');
    assert.match(core, /PLANNER_PRIMARY_BTN\s*=\s*'bg-gold hover:bg-yellow-500 text-navy'/);
  });

  it('B1/B2 surfaces unchanged in schedule.js', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleDirectEdit/);
    assert.match(src, /ScheduleSectionEdit/);
  });
});

describe('P1 — empty row vm harness', () => {
  /** Mirrors loadScheduleForDay post-items routing (keep in sync with schedule.js). */
  function resolveDayRender({ itemCount, viewMode = 'normal' }) {
    if (itemCount === 0) {
      if (viewMode === 'timeline') return 'timeline';
      if (viewMode === 'sbs') return 'sbs';
      if (viewMode === 'list') return 'list';
      return 'empty';
    }
    if (viewMode === 'timeline') return 'timeline';
    if (viewMode === 'sbs') return 'sbs';
    if (viewMode === 'list') return 'list';
    return 'editor';
  }

  function siblingHasPopulatedItems(childWeekSchedules, excludeDay) {
    return childWeekSchedules.some(
      (s) => s.day_of_week !== excludeDay && Number(s.item_count) > 0
    );
  }

  it('1–3 routing matrix matches product contract', () => {
    assert.equal(resolveDayRender({ itemCount: 0 }), 'empty');
    assert.equal(resolveDayRender({ itemCount: 0, viewMode: 'timeline' }), 'timeline');
    assert.equal(resolveDayRender({ itemCount: 2 }), 'editor');
  });

  it('4 empty row + sibling populated → copy-from-day eligible', () => {
    const schedules = [
      { day_of_week: 1, item_count: 0 },
      { day_of_week: 4, item_count: 5 },
    ];
    assert.equal(siblingHasPopulatedItems(schedules, 1), true);
  });

  it('5 empty row + no sibling populated → no copy-from-day', () => {
    const schedules = [{ day_of_week: 1, item_count: 0 }];
    assert.equal(siblingHasPopulatedItems(schedules, 1), false);
  });

  it('source contains the same zero-item guard as harness', () => {
    const postItems = resolvePostItemsRenderBranch(loadScheduleBranch());
    assert.match(postItems, /if \(scheduleItems\.length === 0\)/);
    assert.match(postItems, /else renderEmptyDay\(\)/);
  });
});

describe('P1 — duplicate schedule row safety (source + PR C gate)', () => {
  it('6–8 schedule-apply reuses existing weekly_schedule rows (see schedule-pr-c-gate DB tests)', () => {
    const apply = read('src/lib/schedule-apply.js');
    assert.match(apply, /async function findOrCreateWeeklyScheduleRow/);
    assert.match(apply, /if \(existing\.rows\.length > 0\)/);
    assert.match(apply, /return \{ scheduleId: existing\.rows\[0\]\.id, created: false \}/);
    assert.match(apply, /async function copyScheduleDay/);
  });
});
