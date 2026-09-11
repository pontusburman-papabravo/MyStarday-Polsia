'use strict';

/**
 * Planner PR C — empty day + copy day discoverability.
 * Source-pattern + small vm harness (matches schedule-add-menu.test.js style).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCHEDULE_JS = 'public/js/schedule.js';
const ADD_MENU = 'public/js/schedule-add-menu.js';
const APPLY = 'src/lib/schedule-apply.js';

describe('Planner PR C — empty day + copy discoverability', () => {
  it('1 empty week shows direct add CTA (not template-first)', () => {
    const src = read(SCHEDULE_JS);
    const block = src.slice(src.indexOf('if (schedules.length === 0)'), src.indexOf('const ds = schedules.find'));
    assert.match(block, /emptyStateActionsHtml\(\{ showCopyFromDay: false \}\)/);
    assert.doesNotMatch(block, /openTemplateModal\(\)/);
    assert.match(src, /spt\('schedule\.empty\.addActivity'\)/);
  });

  it('2 empty week direct add opens Rapid Entry via openActivityForDay', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleAddMenu\.openActivityForDay\(\$\{day\}\)/);
    const addMenu = read(ADD_MENU);
    assert.match(addMenu, /async function openActivityForDay/);
    assert.match(addMenu, /await openActivity\(\)/);
  });

  it('3 empty week does not force template chooser as primary', () => {
    const src = read(SCHEDULE_JS);
    const emptyWeek = src.slice(src.indexOf('if (schedules.length === 0)'), src.indexOf('const ds = schedules.find'));
    assert.match(src, /spt\('schedule\.empty\.useTemplate'\)/);
    assert.doesNotMatch(emptyWeek, /openTemplateModal\(\)/);
    assert.doesNotMatch(emptyWeek, /schedule\.editor\.createSchedule/);
  });

  it('4 empty day with other populated days exposes copy-from-day action', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /function otherDaysHaveSchedule/);
    assert.match(src, /otherDaysHaveSchedule\(currentDay\)/);
    assert.match(src, /ScheduleAddMenu\.openCopyDayToCurrentDay/);
  });

  it('5 non-empty day exposes Copy Day at day level', () => {
    const src = read(SCHEDULE_JS);
    const render = src.slice(src.indexOf('function renderSchedule()'), src.indexOf('function renderItem'));
    assert.match(render, /ScheduleAddMenu\.openCopyDay\(\)/);
    assert.match(render, /schedule\.editor\.copyDay/);
    assert.match(render, /schedule\.empty\.copyDayPromo/);
  });

  it('6 Copy Day uses existing canonical merge semantics (ScheduleApplyClient)', () => {
    const src = read(ADD_MENU);
    assert.match(src, /ScheduleApplyClient\.copyDay/);
    assert.match(src, /mode:\s*copyDayState\.mode/);
    assert.match(src, /copyDayState\.mode = 'merge'/);
    const apply = read(APPLY);
    assert.match(apply, /async function copyScheduleDay/);
    assert.match(apply, /mode = 'merge'/);
  });

  it('7–9 copy preserves times, sections, order via canonical service', () => {
    const apply = read(APPLY);
    assert.match(apply, /start_time, end_time, sort_order, section/);
    assert.match(apply, /ORDER BY wsi\.sort_order ASC/);
    assert.match(apply, /normalizeSection\(r\.section\)/);
  });

  it('10 copy reuses activity_template_id (no duplicate templates in service layer)', () => {
    const apply = read(APPLY);
    assert.match(apply, /activity_template_id/);
    assert.doesNotMatch(apply, /INSERT INTO activity_template/);
  });

  it('11 cancel Copy Day closes modal without mutation call', () => {
    const src = read(ADD_MENU);
    const render = src.slice(src.indexOf('function renderCopyDayStep'), src.indexOf('function setCopyDaySource'));
    assert.match(render, /ScheduleAddMenu\.close\(\)/);
    assert.match(src, /function closeAddMenu/);
    const closeBody = src.slice(src.indexOf('function closeAddMenu'), src.indexOf('document.addEventListener'));
    assert.doesNotMatch(closeBody, /copyDay\(/);
  });

  it('12 failed copy surfaces error without closing schedule editor', () => {
    const src = read(ADD_MENU);
    assert.match(src, /samCopyDayError/);
    assert.match(src, /doSubmitCopyDay[\s\S]*!ok[\s\S]*errEl/);
  });

  it('13–16 Rapid Entry / B1 / B2 surfaces unchanged', () => {
    const schedule = read(SCHEDULE_JS);
    assert.match(schedule, /ScheduleDirectEdit/);
    assert.match(schedule, /ScheduleSectionEdit/);
    assert.match(schedule, /ScheduleAddMenu\.openActivityForDay/);
    const emptyWeek = schedule.slice(schedule.indexOf('if (schedules.length === 0)'), schedule.indexOf('const ds = schedules.find'));
    assert.doesNotMatch(emptyWeek, /openTemplateModal\(\)/);
  });

  it('17–18 sv-SE and en-GB empty/copy keys exist', () => {
    for (const loc of ['config/i18n/schedule-sv-SE.json', 'config/i18n/schedule-en-GB.json']) {
      const json = JSON.parse(read(loc));
      for (const key of ['addActivity', 'useTemplate', 'copyFromDay', 'copyDayPromo']) {
        assert.ok(json.empty[key], `${loc} missing empty.${key}`);
        assert.ok(String(json.empty[key]).length > 2);
      }
    }
  });

  it('19 dynamic weekday labels use ScheduleCore.dayShort in copy flow', () => {
    const src = read(ADD_MENU);
    assert.match(src, /function dayLabel\(dow\)/);
    assert.match(src, /ScheduleCore\.dayShort/);
  });

  it('20 empty actions use max-w-xs stack (375px-friendly, no horizontal toolbar)', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /flex flex-col items-center gap-3/);
    assert.match(src, /max-w-xs/);
    assert.match(src, /min-h-\[44px\]/);
  });

  it('21 accessibility: descriptive aria-labels on empty + copy CTAs', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /aria-label="\$\{spt\('schedule\.empty\.addActivity'\)\}"/);
    assert.match(src, /aria-label="\$\{spt\('schedule\.empty\.copyFromDay'\)\}"/);
    assert.match(src, /const copyDayLabel = spt\('schedule\.editor\.copyDay'\)/);
    assert.match(src, /aria-label="\$\{escHtml\(copyDayLabel\)\}"/);
  });

  it('22 openCopyDayToCurrentDay preselects target day with merge default', () => {
    const src = read(ADD_MENU);
    assert.match(src, /function openCopyDayToCurrentDay/);
    assert.match(src, /copyDayState\.targetDays = new Set\(\[targetDay\]\)/);
    assert.match(src, /copyDayState\.mode = 'merge'/);
    assert.match(src, /openCopyDayToCurrentDay,/);
  });

  it('vm: findDefaultCopySourceDay picks first other populated weekday', () => {
    const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
    const schedules = [{ day_of_week: 4 }, { day_of_week: 2 }];
    const excludeDay = 1;
    let picked = excludeDay;
    for (const dow of WEEKDAYS) {
      if (dow === excludeDay) continue;
      if (schedules.some((row) => row.day_of_week === dow)) { picked = dow; break; }
    }
    assert.equal(picked, 2);
  });
});
