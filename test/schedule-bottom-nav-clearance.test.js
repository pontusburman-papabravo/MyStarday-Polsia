'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Weekly Schedule 375×812 bottom-nav clearance', () => {
  it('exposes a shared nav-height token used by the nav itself', () => {
    const css = read('public/css/parent-bottom-nav.css');
    assert.match(css, /--parent-bottom-nav-height:\s*calc\(56px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(css, /height:\s*var\(--parent-bottom-nav-height\)/);
  });

  it('schedule magic shell pads by nav height + gap instead of zeroing bottom padding', () => {
    const css = read('public/css/parent-magic-common.css');
    const blockStart = css.indexOf('body.parent-magic-page-schedule .magic-page-shell');
    assert.ok(blockStart > -1, 'schedule magic-page-shell rule must exist');
    const block = css.slice(blockStart, blockStart + 420);
    assert.match(css, /body\.parent-magic-view\.parent-magic-page-schedule:not\(\.parent-theme-light\) \.magic-page-shell/);
    assert.match(css, /body\.parent-magic-view\.parent-theme-light\.parent-magic-page-schedule \.magic-page-shell/);
    assert.match(block, /padding-bottom:\s*calc\(var\(--parent-bottom-nav-height/);
    assert.doesNotMatch(block, /padding-bottom:\s*0/);
  });

  it('375×812 native-style tab bar uses the same height token as the web dock', () => {
    const css = read('public/css/parent-tab-bar.css');
    assert.match(css, /height:\s*var\(--parent-bottom-nav-height/);
  });

  it('does not change non-schedule magic-page-shell padding to the nav token', () => {
    const css = read('public/css/parent-magic-common.css');
    const generic = css.slice(css.indexOf('.magic-page-shell {'), css.indexOf('.magic-page-hero'));
    assert.doesNotMatch(generic, /--parent-bottom-nav-height/);
  });
});
