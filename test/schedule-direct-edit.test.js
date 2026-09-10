'use strict';

/**
 * Planner PR B — Direct Day Editing.
 * Source-pattern + executable PUT harness (same style as schedule-add-menu.test.js).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-direct-edit.js';
const SCHEDULE_JS = 'public/js/schedule.js';
const HTML = 'public/schedule.html';
const MAGIC_CSS = 'public/css/parent-magic-common.css';

function createDirectEditSandbox(opts = {}) {
  const puts = [];
  const toasts = [];
  const item = opts.item || {
    id: 'item-1',
    start_time: opts.startTime || null,
    end_time: opts.endTime || null,
    section: 'kvall',
    is_once_task: Boolean(opts.once),
    activity_name: 'Pyjamas',
  };
  const editors = new Map();
  const chips = new Map();
  const document = {
    getElementById(id) {
      if (id.startsWith('sde-editor-')) {
        if (!editors.has(id)) editors.set(id, { id, classList: new Set(['hidden']) });
        const el = editors.get(id);
        return {
          id,
          classList: {
            contains: (cls) => el.classList.has(cls),
            add: (cls) => el.classList.add(cls),
            toggle: (cls, force) => {
              if (force === true) el.classList.add(cls);
              else if (force === false) el.classList.delete(cls);
              else if (el.classList.has(cls)) el.classList.delete(cls);
              else el.classList.add(cls);
              return el.classList.has(cls);
            },
          },
        };
      }
      if (id.startsWith('sde-chip-')) {
        if (!chips.has(id)) chips.set(id, { ariaExpanded: 'false' });
        const chip = chips.get(id);
        return {
          id,
          setAttribute(name, value) {
            if (name === 'aria-expanded') chip.ariaExpanded = value;
          },
        };
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.sde-editor') {
        return [...editors.keys()].map((id) => document.getElementById(id));
      }
      if (sel === '.sde-time-chip') {
        return [...chips.keys()].map((id) => document.getElementById(id));
      }
      return [];
    },
  };

  const sandbox = {
    scheduleItems: [item],
    currentScheduleId: 'sched-1',
    reloads: 0,
    showToast(msg, isError) { toasts.push({ msg, isError: Boolean(isError) }); },
    loadScheduleForDay: async () => { sandbox.reloads += 1; },
    document,
    window: null,
    ScheduleCore: {
      fmtTime: (value) => (value ? String(value).substring(0, 5) : ''),
    },
    ScheduleI18n: {
      t: (key) => key,
    },
  };
  sandbox.window = sandbox;
  sandbox.window.apiFetch = async (url, init = {}) => {
    puts.push({ url, method: init.method, body: JSON.parse(init.body) });
    if (opts.putError) {
      return { ok: false, json: async () => ({ error: 'save-failed' }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };
  sandbox.window.ScheduleI18n = sandbox.ScheduleI18n;
  sandbox.window.ScheduleCore = sandbox.ScheduleCore;

  vm.runInNewContext(read(MODULE), sandbox, { filename: MODULE });
  return { sandbox, puts, toasts, item };
}

describe('Planner PR B — Direct Day Editing', () => {
  it('is an IIFE exposing time chip, editor, toggle, setTime, and putItemTimes', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /window\.ScheduleDirectEdit\s*=/);
    for (const fn of ['timeChipHtml', 'timeEditorHtml', 'toggle', 'setTime', 'putItemTimes']) {
      assert.match(src, new RegExp(`\\b${fn}\\b`), `API must include ${fn}`);
    }
  });

  it('schedule.html loads schedule-direct-edit.js after schedule.js', () => {
    const html = read(HTML);
    const scheduleIdx = html.indexOf('/js/schedule.js?');
    const directIdx = html.indexOf('/js/schedule-direct-edit.js?');
    assert.ok(scheduleIdx > -1, 'schedule.js script tag missing');
    assert.ok(directIdx > -1, 'schedule-direct-edit.js script tag missing');
    assert.ok(directIdx > scheduleIdx, 'direct-edit must load after schedule.js');
  });

  it('renderItem uses the on-row time chip and keeps remove outside icon-btns-desktop', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleDirectEdit\.timeChipHtml\(item\)/);
    assert.match(src, /ScheduleDirectEdit\.timeEditorHtml\(item\)/);
    const removeIdx = src.indexOf('const removeBtn');
    const desktopIdx = src.indexOf('icon-btns-desktop flex gap-1');
    assert.ok(removeIdx > -1 && desktopIdx > -1, 'removeBtn and icon-btns-desktop must exist');
    assert.ok(removeIdx < desktopIdx, 'remove button is built before the desktop-only cluster');
    assert.match(src, /\$\{removeBtn\}/);
    assert.doesNotMatch(
      src.slice(desktopIdx, desktopIdx + 280),
      /removeItem\('/,
      'desktop-only cluster must not be the only remove control',
    );
    assert.match(src, /spt\('schedule\.editor\.moreOptions'\)/);
  });

  it('once-tasks get static time text and no editor', () => {
    const { sandbox } = createDirectEditSandbox({
      once: true,
      startTime: '18:00',
      endTime: '18:30',
    });
    const chip = sandbox.ScheduleDirectEdit.timeChipHtml(sandbox.scheduleItems[0]);
    const editor = sandbox.ScheduleDirectEdit.timeEditorHtml(sandbox.scheduleItems[0]);
    assert.match(chip, /18:00–18:30/);
    assert.doesNotMatch(chip, /sde-time-chip/);
    assert.equal(editor, '');
  });

  it('empty recurring items render a Tid chip and hidden Starttid/Sluttid fields', () => {
    const { sandbox } = createDirectEditSandbox();
    const item = sandbox.scheduleItems[0];
    const chip = sandbox.ScheduleDirectEdit.timeChipHtml(item);
    const editor = sandbox.ScheduleDirectEdit.timeEditorHtml(item);
    assert.match(chip, /schedule\.editor\.addTime/);
    assert.match(chip, /sde-time-chip/);
    assert.match(editor, /sde-editor/);
    assert.match(editor, /sde-editor-item-1/);
    assert.match(editor, /hidden/);
    assert.match(editor, /type="time"/);
    assert.match(editor, /data-sde-which="start"/);
    assert.match(editor, /data-sde-which="end"/);
  });

  it('hides native type=time so iOS cannot paint the clock', () => {
    const html = read(HTML);
    assert.match(html, /\.sde-time-field input\[type="time"\]\.sde-time-input/);
    assert.match(html, /opacity:\s*0/);
    assert.match(html, /-webkit-text-fill-color:\s*transparent/);
    const src = read(MODULE);
    assert.match(src, /class="sde-time-input /);
  });

  it('PUT uses the existing item path and keeps section', async () => {
    const { sandbox, puts } = createDirectEditSandbox();
    const result = await sandbox.ScheduleDirectEdit.putItemTimes('item-1', '18:00', '18:30');
    assert.equal(result.ok, true);
    assert.equal(puts.length, 1);
    assert.equal(puts[0].url, '/api/schedules/sched-1/items/item-1');
    assert.equal(puts[0].method, 'PUT');
    assert.deepEqual(puts[0].body, {
      start_time: '18:00',
      end_time: '18:30',
      section: 'kvall',
    });
  });

  it('rejects end-before-start without calling PUT', async () => {
    const { sandbox, puts, toasts } = createDirectEditSandbox({ startTime: '18:00' });
    await sandbox.ScheduleDirectEdit.setTime('item-1', 'end', '17:00');
    assert.equal(puts.length, 0);
    assert.equal(toasts[0].isError, true);
    assert.match(toasts[0].msg, /endBeforeStart/);
  });

  it('setTime saves start then end in order through one mutex', async () => {
    const { sandbox, puts, toasts } = createDirectEditSandbox();
    await Promise.all([
      sandbox.ScheduleDirectEdit.setTime('item-1', 'start', '18:00'),
      sandbox.ScheduleDirectEdit.setTime('item-1', 'end', '18:30'),
    ]);
    assert.equal(puts.length, 2);
    assert.deepEqual(puts[0].body, { start_time: '18:00', end_time: null, section: 'kvall' });
    assert.deepEqual(puts[1].body, { start_time: '18:00', end_time: '18:30', section: 'kvall' });
    assert.equal(sandbox.reloads, 2);
    assert.equal(toasts.filter((t) => !t.isError).length, 2);
  });

  it('child-card count and day-tab date no longer use the failing contrast classes', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /child-card-count text-\[10px\] text-text-soft/);
    assert.match(src, /day-tab-date font-normal text-\[10px\]/);
    assert.doesNotMatch(src, /day-tab-date[^"]*opacity-75/);
    const css = read(MAGIC_CSS);
    assert.match(css, /\.child-card-count/);
    assert.match(css, /color:\s*#2a3458/);
    assert.match(css, /\.day-tab-date/);
    assert.match(css, /\.day-tab \.day-tab-date/);
  });

  it('i18n addTime keys exist in sv-SE and en-GB', () => {
    const sv = JSON.parse(read('config/i18n/schedule-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/schedule-en-GB.json'));
    assert.equal(sv.editor.addTime, 'Tid');
    assert.equal(sv.editor.addTimeAria, 'Lägg till tid');
    assert.equal(en.editor.addTime, 'Time');
    assert.equal(en.editor.addTimeAria, 'Add time');
  });
});
