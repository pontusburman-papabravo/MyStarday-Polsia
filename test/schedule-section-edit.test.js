'use strict';

/**
 * Planner PR B2 — on-row section + row-order surface.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-section-edit.js';
const DIRECT = 'public/js/schedule-direct-edit.js';
const SCHEDULE_JS = 'public/js/schedule.js';
const HTML = 'public/schedule.html';

function createSectionEditSandbox(opts = {}) {
  const puts = [];
  const toasts = [];
  const items = opts.items || [opts.item || {
    id: 'item-1',
    start_time: opts.startTime || '08:30',
    end_time: opts.endTime || '09:00',
    section: opts.section || 'morgon',
    is_once_task: Boolean(opts.once),
    activity_name: 'Frukost',
  }];
  const editors = new Map();
  const chips = new Map();
  const document = {
    getElementById(id) {
      if (id.startsWith('sse-editor-')) {
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
      if (id.startsWith('sse-chip-')) {
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
      if (sel === '.sse-editor') {
        return [...editors.keys()].map((id) => document.getElementById(id));
      }
      if (sel === '.sse-section-chip') {
        return [...chips.keys()].map((id) => document.getElementById(id));
      }
      if (sel === '.sde-editor' || sel === '.sde-time-chip') return [];
      return [];
    },
  };

  const sandbox = {
    scheduleItems: items,
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
  return { sandbox, puts, toasts, item: items[0] };
}

describe('Planner PR B2 — section edit + row order', () => {
  it('is an IIFE exposing section chip, editor, toggle, setSection, and putItemSection', () => {
    const src = read(MODULE);
    assert.doesNotThrow(() => vm.runInNewContext(src, {
      window: {},
      document: { getElementById() { return null; }, querySelectorAll() { return []; } },
    }));
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /window\.ScheduleSectionEdit\s*=/);
    for (const fn of ['sectionChipHtml', 'sectionEditorHtml', 'toggle', 'setSection', 'putItemSection']) {
      assert.match(src, new RegExp(`\\b${fn}\\b`), `API must include ${fn}`);
    }
  });

  it('schedule.html loads schedule-section-edit.js after schedule-direct-edit.js', () => {
    const html = read(HTML);
    const directIdx = html.indexOf('/js/schedule-direct-edit.js?');
    const sectionIdx = html.indexOf('/js/schedule-section-edit.js?');
    assert.ok(directIdx > -1, 'schedule-direct-edit.js script tag missing');
    assert.ok(sectionIdx > -1, 'schedule-section-edit.js script tag missing');
    assert.ok(sectionIdx > directIdx, 'section-edit must load after direct-edit');
  });

  it('renderItem uses the on-row section chip and keeps the drag handle on the row', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleSectionEdit\.sectionChipHtml\(item\)/);
    assert.match(src, /ScheduleSectionEdit\.sectionEditorHtml\(item\)/);
    assert.match(src, /class="drag-handle"/);
    const dragIdx = src.indexOf('const dragHandle');
    const desktopIdx = src.indexOf('icon-btns-desktop flex gap-1');
    assert.ok(dragIdx > -1 && desktopIdx > -1);
    assert.ok(dragIdx < desktopIdx, 'drag handle is the on-row order surface, not desktop-only');
    assert.match(src, /\$\{dragHandle\}/);
    assert.match(src, /openEditTemplateModal/, 'name editing stays behind name-tap');
  });

  it('once-tasks get no section chip or editor', () => {
    const { sandbox } = createSectionEditSandbox({ once: true, section: 'dag' });
    const chip = sandbox.ScheduleSectionEdit.sectionChipHtml(sandbox.scheduleItems[0]);
    const editor = sandbox.ScheduleSectionEdit.sectionEditorHtml(sandbox.scheduleItems[0]);
    assert.equal(chip, '');
    assert.equal(editor, '');
  });

  it('recurring items render a section chip and four 44pt options', () => {
    const { sandbox } = createSectionEditSandbox({ section: 'morgon' });
    const item = sandbox.scheduleItems[0];
    const chip = sandbox.ScheduleSectionEdit.sectionChipHtml(item);
    const editor = sandbox.ScheduleSectionEdit.sectionEditorHtml(item);
    assert.match(chip, /sse-section-chip/);
    assert.match(chip, /schedule\.sections\.morgon/);
    assert.match(editor, /sse-editor-item-1/);
    assert.match(editor, /hidden/);
    for (const key of ['morgon', 'dag', 'kvall', 'natt']) {
      assert.match(editor, new RegExp(`data-sse-section="${key}"`));
    }
    assert.match(editor, /min-h-\[44px\]/);
  });

  it('PUT uses the existing item path and keeps times', async () => {
    const { sandbox, puts } = createSectionEditSandbox({ startTime: '08:30', endTime: '09:00', section: 'morgon' });
    const result = await sandbox.ScheduleSectionEdit.putItemSection('item-1', 'dag');
    assert.equal(result.ok, true);
    assert.equal(puts.length, 1);
    assert.equal(puts[0].url, '/api/schedules/sched-1/items/item-1');
    assert.equal(puts[0].method, 'PUT');
    assert.deepEqual(puts[0].body, {
      start_time: '08:30',
      end_time: '09:00',
      section: 'dag',
    });
  });

  it('rejects an invalid section without calling PUT', async () => {
    const { sandbox, puts } = createSectionEditSandbox();
    const result = await sandbox.ScheduleSectionEdit.putItemSection('item-1', 'lunch');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid-section');
    assert.equal(puts.length, 0);
  });

  it('setSection no-ops when the section is unchanged', async () => {
    const { sandbox, puts } = createSectionEditSandbox({ section: 'morgon' });
    await sandbox.ScheduleSectionEdit.setSection('item-1', 'morgon');
    assert.equal(puts.length, 0);
  });

  it('time editor close also hides section editors', () => {
    const src = read(DIRECT);
    assert.match(src, /\.sse-editor/);
    assert.match(src, /\.sse-section-chip/);
  });

  it('i18n editSection keys exist in sv-SE and en-GB', () => {
    const sv = JSON.parse(read('config/i18n/schedule-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/schedule-en-GB.json'));
    assert.equal(sv.editor.editSection, 'Byt del av dagen');
    assert.equal(en.editor.editSection, 'Change time of day');
  });
});
