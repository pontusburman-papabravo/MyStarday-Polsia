'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('home shortcut analytics', () => {
  it('dashboard-home-hub tracks home_shortcut_click with stable ids and slots', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /home_shortcut_click/);
    assert.match(hub, /shortcut_id:/);
    assert.match(hub, /slot:/);
    assert.match(hub, /data-shortcut-id="retroactive" data-shortcut-slot="0"/);
    assert.match(hub, /data-shortcut-id="once_task" data-shortcut-slot="1"/);
    assert.match(hub, /data-shortcut-id="give_stars" data-shortcut-slot="2"/);
    assert.match(hub, /data-shortcut-id="day_off" data-shortcut-slot="3"/);
    assert.match(hub, /bindShortcutAnalytics/);
  });

  it('analytics allowlist includes home_shortcut_click', () => {
    const src = read('src/routes/analytics.js');
    assert.match(src, /'home_shortcut_click'/);
  });
});
