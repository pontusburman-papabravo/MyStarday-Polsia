'use strict';

/**
 * Planner remove-recurrence modal — locale consistency + delete semantics.
 * Does not change backend delete routes; asserts the existing three schedule
 * removals and that activity_template is never deleted.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const EN_LEAKS = [
  'Remove activity',
  'This day only',
  'Removed from today',
  'All days of the week',
  'Monday through Sunday',
  'Cancel',
  'Thursday',
  'every Thursday',
  'Every Thursday',
];

const SV_LEAKS = [
  'Ta bort aktivitet',
  'Bara denna dag',
  'Tas bara bort',
  'Alla dagar i veckan',
  'måndag till söndag',
  'Avbryt',
  'torsdag',
  'torsdagar',
  'veckoschemat',
];

function loadScheduleI18n(locale) {
  loadLocales();
  const sandbox = {
    window: {
      pt(key, params) {
        return t(locale, key, params);
      },
    },
  };
  vm.runInNewContext(read('public/js/schedule-i18n.js'), sandbox);
  return sandbox.window.ScheduleI18n;
}

function createClassList(initial) {
  const set = new Set(initial || []);
  return {
    add: (c) => { set.add(c); },
    remove: (c) => { set.delete(c); },
    contains: (c) => set.has(c),
    toggle(c, force) {
      if (force === true) set.add(c);
      else if (force === false) set.delete(c);
      else if (set.has(c)) set.delete(c);
      else set.add(c);
      return set.has(c);
    },
  };
}

function createEl(id, extra) {
  const el = {
    id,
    textContent: '',
    disabled: false,
    onclick: null,
    classList: createClassList(extra && extra.hidden ? ['hidden'] : []),
    getAttribute() { return null; },
    setAttribute() {},
    removeAttribute() {},
    querySelector(sel) {
      return (extra && extra.children && extra.children[sel]) || null;
    },
  };
  return Object.assign(el, extra || {});
}

function createRemoveSandbox(locale, opts) {
  loadLocales();
  const fetches = [];
  const titleEl = createEl('recurrenceTitle');
  const iconEl = createEl('recurrenceIcon');
  const cancelEl = createEl('recurrenceCancel');
  cancelEl.getAttribute = (name) => (name === 'data-i18n' ? 'schedule.modals.common.cancel' : null);
  const modalChildren = {
    h3: titleEl,
    '.text-3xl': iconEl,
    '[data-i18n="schedule.modals.common.cancel"]': cancelEl,
    'button[onclick*="closeRecurrenceModal"]': cancelEl,
  };
  const els = {
    recurrenceModal: createEl('recurrenceModal', { hidden: true, children: modalChildren }),
    recurrenceActivityName: createEl('recurrenceActivityName'),
    recurrenceOnceLbl: createEl('recurrenceOnceLbl'),
    recurrenceOnceDesc: createEl('recurrenceOnceDesc'),
    recurrenceOnceBtn: createEl('recurrenceOnceBtn'),
    recurrenceWeeklyLbl: createEl('recurrenceWeeklyLbl'),
    recurrenceWeeklyDesc: createEl('recurrenceWeeklyDesc'),
    recurrenceWeeklyBtn: createEl('recurrenceWeeklyBtn'),
    recurrenceAllDaysLbl: createEl('recurrenceAllDaysLbl'),
    recurrenceAllDaysDesc: createEl('recurrenceAllDaysDesc'),
    recurrenceAllDaysBtn: createEl('recurrenceAllDaysBtn', { hidden: true }),
    recurrenceStep1: createEl('recurrenceStep1'),
    recurrenceStep2: createEl('recurrenceStep2', { hidden: true }),
    recurrenceError: createEl('recurrenceError', { hidden: true }),
  };
  els.recurrenceModal.querySelector = (sel) => modalChildren[sel] || null;

  const i18nSandbox = { window: { pt: (key, params) => t(locale, key, params) } };
  vm.runInNewContext(read('public/js/schedule-i18n.js'), i18nSandbox);

  const sandbox = {
    window: {},
    console,
    document: {
      getElementById(id) { return els[id] || null; },
      querySelector() { return null; },
    },
    scheduleItems: [{
      id: opts && opts.itemId || 42,
      activity_name: opts && Object.prototype.hasOwnProperty.call(opts, 'activityName')
        ? opts.activityName
        : 'Klä på sig',
      is_once_task: false,
    }],
    currentDay: 4,
    currentScheduleId: 'sched-1',
    currentChildId: 'child-1',
    calView: 'day',
    dayOffset: 0,
    weekOffset: 0,
    showToast() {},
    openConfirmModal() {},
    async loadScheduleForDay() {},
    getDayFromOffset() { return new Date('2026-09-10T12:00:00'); },
    getWeekStart() { return new Date('2026-09-07T12:00:00'); },
    ScheduleI18n: i18nSandbox.window.ScheduleI18n,
    ScheduleCore: { dayShort(dow) { return String(dow); } },
    async apiFetch(url, init) {
      fetches.push({ url, method: (init && init.method) || 'GET', body: init && init.body });
      return { ok: true, json: async () => ({}) };
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(read('public/js/schedule-activity-modals.js'), sandbox);
  return { sandbox, els, fetches, titleEl, cancelEl };
}

function modalTexts(els, titleEl, cancelEl) {
  return {
    title: titleEl.textContent,
    activity: els.recurrenceActivityName.textContent,
    onceLbl: els.recurrenceOnceLbl.textContent,
    onceDesc: els.recurrenceOnceDesc.textContent,
    weeklyLbl: els.recurrenceWeeklyLbl.textContent,
    weeklyDesc: els.recurrenceWeeklyDesc.textContent,
    allDaysLbl: els.recurrenceAllDaysLbl.textContent,
    allDaysDesc: els.recurrenceAllDaysDesc.textContent,
    cancel: cancelEl.textContent,
  };
}

function assertNoLeaks(joined, leaks, locale) {
  for (const leak of leaks) {
    assert.equal(
      joined.includes(leak),
      false,
      `${locale} modal leaked ${JSON.stringify(leak)} in ${JSON.stringify(joined)}`
    );
  }
}

describe('recurrence remove modal i18n + semantics', () => {
  it('A. sv-SE modal is fully Swedish with Thursday plural and no English fallbacks', () => {
    const i18n = loadScheduleI18n('sv-SE');
    const copy = i18n.recurrenceRemoveCopy(4, 'Klä på sig');
    assert.equal(copy.title, 'Ta bort aktivitet');
    assert.equal(copy.onceLbl, 'Bara denna dag');
    assert.equal(copy.onceDesc, 'Tas bara bort från dagens schema');
    assert.equal(copy.weeklyLbl, 'Alla torsdagar');
    assert.equal(copy.weeklyDesc, 'Tas bort från alla torsdagar i veckoschemat');
    assert.equal(copy.allDaysLbl, 'Alla dagar i veckan');
    assert.equal(copy.allDaysDesc, 'Tas bort från måndag till söndag');
    assert.equal(copy.cancel, 'Avbryt');
    assert.equal(copy.dayName, 'Torsdag');
    assert.equal(copy.dayPlural, 'alla torsdagar');
    assert.doesNotMatch(copy.weeklyLbl, /Bara alla/);
    const { sandbox, els, titleEl, cancelEl } = createRemoveSandbox('sv-SE');
    sandbox.removeItem(42);
    const texts = modalTexts(els, titleEl, cancelEl);
    assert.deepEqual(texts, {
      title: 'Ta bort aktivitet',
      activity: '"Klä på sig"',
      onceLbl: 'Bara denna dag',
      onceDesc: 'Tas bara bort från dagens schema',
      weeklyLbl: 'Alla torsdagar',
      weeklyDesc: 'Tas bort från alla torsdagar i veckoschemat',
      allDaysLbl: 'Alla dagar i veckan',
      allDaysDesc: 'Tas bort från måndag till söndag',
      cancel: 'Avbryt',
    });
    const joined = Object.values(texts).filter((v) => v !== '"Klä på sig"').join('\n');
    assertNoLeaks(joined, EN_LEAKS, 'sv-SE');
  });

  it('B. en-GB modal is fully English with Thursday plural and no Swedish fallbacks', () => {
    const i18n = loadScheduleI18n('en-GB');
    const copy = i18n.recurrenceRemoveCopy(4, 'Klä på sig');
    assert.equal(copy.title, 'Remove activity');
    assert.equal(copy.onceLbl, 'This day only');
    assert.equal(copy.onceDesc, "Removed from today's schedule only");
    assert.equal(copy.weeklyLbl, 'Every Thursday');
    assert.equal(copy.weeklyDesc, 'Removes from every Thursday in the weekly schedule');
    assert.equal(copy.allDaysLbl, 'All days of the week');
    assert.equal(copy.allDaysDesc, 'Removes from Monday through Sunday');
    assert.equal(copy.cancel, 'Cancel');
    assert.equal(copy.dayName, 'Thursday');
    assert.equal(copy.dayPlural, 'every Thursday');
    const { sandbox, els, titleEl, cancelEl } = createRemoveSandbox('en-GB');
    sandbox.removeItem(42);
    const texts = modalTexts(els, titleEl, cancelEl);
    assert.deepEqual(texts, {
      title: 'Remove activity',
      activity: '"Klä på sig"',
      onceLbl: 'This day only',
      onceDesc: "Removed from today's schedule only",
      weeklyLbl: 'Every Thursday',
      weeklyDesc: 'Removes from every Thursday in the weekly schedule',
      allDaysLbl: 'All days of the week',
      allDaysDesc: 'Removes from Monday through Sunday',
      cancel: 'Cancel',
    });
    const joined = Object.values(texts).filter((v) => v !== '"Klä på sig"').join('\n');
    assertNoLeaks(joined, SV_LEAKS, 'en-GB');
  });

  it('C. activity name stays user text and is not translated', () => {
    const sv = loadScheduleI18n('sv-SE').recurrenceRemoveCopy(1, 'Klä på sig');
    const en = loadScheduleI18n('en-GB').recurrenceRemoveCopy(1, 'Klä på sig');
    assert.equal(sv.activityName, 'Klä på sig');
    assert.equal(en.activityName, 'Klä på sig');
    assert.equal(sv.activityQuoted, '"Klä på sig"');
    assert.equal(en.activityQuoted, '"Klä på sig"');
    const { sandbox, els } = createRemoveSandbox('en-GB', { activityName: 'Klä på sig' });
    sandbox.removeItem(42);
    assert.equal(els.recurrenceActivityName.textContent, '"Klä på sig"');
  });

  it('D. Cancel hides the modal and performs zero mutations', async () => {
    const { sandbox, els, fetches } = createRemoveSandbox('sv-SE');
    sandbox.removeItem(42);
    assert.equal(els.recurrenceModal.classList.contains('hidden'), false);
    assert.equal(fetches.length, 0);
    sandbox.closeRecurrenceModal();
    assert.equal(els.recurrenceModal.classList.contains('hidden'), true);
    assert.equal(fetches.length, 0);
  });

  it('E. each option keeps the existing schedule-remove semantics', async () => {
    const once = createRemoveSandbox('sv-SE');
    once.sandbox.removeItem(42);
    await once.els.recurrenceOnceBtn.onclick({ preventDefault() {}, stopPropagation() {} });
    assert.equal(once.fetches.length, 1);
    assert.equal(once.fetches[0].method, 'POST');
    assert.equal(once.fetches[0].url, '/api/schedules/sched-1/items/42/exclude-date');
    assert.match(String(once.fetches[0].body), /2026-09-10/);

    const weekly = createRemoveSandbox('en-GB');
    weekly.sandbox.removeItem(42);
    await weekly.els.recurrenceWeeklyBtn.onclick({ preventDefault() {}, stopPropagation() {} });
    assert.equal(weekly.fetches.length, 1);
    assert.equal(weekly.fetches[0].method, 'DELETE');
    assert.equal(weekly.fetches[0].url, '/api/schedules/sched-1/items/42');

    const allDays = createRemoveSandbox('sv-SE');
    allDays.sandbox.removeItem(42);
    await allDays.els.recurrenceAllDaysBtn.onclick({ preventDefault() {}, stopPropagation() {} });
    assert.equal(allDays.fetches.length, 1);
    assert.equal(allDays.fetches[0].method, 'DELETE');
    assert.equal(allDays.fetches[0].url, '/api/schedules/sched-1/items/42/all-days');
  });

  it('F. remove paths never delete activity_template', () => {
    const modalSrc = read('public/js/schedule-activity-modals.js');
    const dashSrc = read('public/js/dashboard-activity-modal.js');
    const itemRoutes = read('src/routes/schedules/items.js');
    for (const src of [modalSrc, dashSrc]) {
      assert.match(src, /ScheduleI18n\.recurrenceRemoveCopy/);
      assert.doesNotMatch(src, /Bara alla \$\{/);
      assert.doesNotMatch(src, /DAYS\[currentDay\]\}ar/);
      const removeStart = src.indexOf('function removeItem');
      const removeFn = removeStart === -1 ? '' : src.slice(removeStart, removeStart + 1600);
      assert.doesNotMatch(removeFn, /['"]aktiviteten['"]/);
    }
    const deleteFns = ['function deleteOnce', 'async function deleteAll', 'async function deleteAllDays']
      .map((needle) => {
        const start = modalSrc.indexOf(needle);
        return start === -1 ? '' : modalSrc.slice(start, start + 900);
      })
      .join('\n');
    assert.doesNotMatch(deleteFns, /\/api\/activities\//);
    assert.doesNotMatch(deleteFns, /activity_template/);
    assert.doesNotMatch(itemRoutes, /DELETE FROM activity_template/);
    assert.match(itemRoutes, /DELETE FROM weekly_schedule_item/);
    const { sandbox, fetches } = createRemoveSandbox('sv-SE');
    sandbox.removeItem(42);
    assert.equal(fetches.length, 0);
    assert.equal(fetches.some((f) => /activit/i.test(f.url)), false);
  });
});
