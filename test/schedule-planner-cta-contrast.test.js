'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PLANNER_GOLD_SURFACES = [
  'public/js/schedule-core.js',
  'public/js/schedule.js',
  'public/js/schedule-add-menu.js',
  'public/js/schedule-dnd.js',
  'public/js/schedule-special-days.js',
  'public/js/schedule-views.js',
  'public/js/schedule-activity-modals.js',
  'public/js/schedule-template-mode.js',
  'public/schedule.html',
];

const GOLD = '#F5A623';
const GOLD_HOVER = '#EAB308';
const NAVY = '#1B2340';
const WHITE = '#FFFFFF';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Lines that pair bg-gold with text-white on the same class string (planner scope). */
function goldWhiteViolations(src) {
  const violations = [];
  for (const line of src.split('\n')) {
    if (!line.includes('bg-gold')) continue;
    if (!/\btext-white\b/.test(line)) continue;
    if (/\bbg-navy\b/.test(line)) continue;
    violations.push(line.trim());
  }
  return violations;
}

describe('planner primary CTA contrast', () => {
  it('ScheduleCore exposes navy-on-gold token (not white-on-gold)', () => {
    const core = read('public/js/schedule-core.js');
    assert.match(core, /PLANNER_PRIMARY_BTN\s*=\s*'bg-gold hover:bg-yellow-500 text-navy'/);
    assert.match(core, /PLANNER_PRIMARY_DAY_TAB\s*=\s*'bg-gold text-navy border-gold'/);
    assert.match(core, /PLANNER_PRIMARY_BTN,/);
  });

  it('navy on gold and hover meet WCAG AA normal text (>=4.5:1)', () => {
    assert.ok(contrastRatio(NAVY, GOLD) >= 4.5, `navy on gold: ${contrastRatio(NAVY, GOLD).toFixed(2)}:1`);
    assert.ok(contrastRatio(NAVY, GOLD_HOVER) >= 4.5, `navy on hover: ${contrastRatio(NAVY, GOLD_HOVER).toFixed(2)}:1`);
    assert.ok(contrastRatio(WHITE, GOLD) < 4.5, 'white on gold must stay documented as failing');
    assert.ok(Math.abs(contrastRatio(WHITE, GOLD) - 2.03) < 0.05, 'regression guard for known ~2.03:1 failure');
  });

  it('planner schedule surfaces do not pair bg-gold with text-white', () => {
    for (const rel of PLANNER_GOLD_SURFACES) {
      const src = read(rel);
      const bad = goldWhiteViolations(src);
      assert.deepEqual(bad, [], `${rel} still has bg-gold + text-white:\n${bad.join('\n')}`);
    }
  });

  it('schedule.html primary trigger and modal saves use text-navy on gold', () => {
    const html = read('public/schedule.html');
    assert.match(html, /id="scheduleAddMenuBtn"[^>]*bg-gold[^>]*text-navy/);
    const addMenu = read('public/js/schedule-add-menu.js');
    assert.match(addMenu, /id="samActivitySaveBtn"[^>]*text-navy/);
    assert.match(addMenu, /id="samCopyDaySaveBtn"[^>]*text-navy/);
  });

  it('magic dark CSS keeps navy on gold buttons (computed override)', () => {
    const css = read('public/css/parent-magic-common.css');
    assert.match(css, /button\.bg-gold[\s\S]*color:\s*#1b2340 !important/);
    assert.match(css, /\.day-tab\.bg-gold[\s\S]*color:\s*#1b2340 !important/);
  });
});
