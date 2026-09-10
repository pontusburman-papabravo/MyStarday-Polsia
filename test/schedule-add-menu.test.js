'use strict';

/**
 * Phase 1B frontend — "+ Lägg till" primary Weekly Schedule action.
 * Source-pattern tests (matching the existing schedule-family-grid.test.js /
 * i18n-schedule-surfaces.test.js style — this repo does not run a full browser/jsdom
 * harness for schedule.js; manual verification screenshots cover interactive behaviour,
 * see the PR description). Full HTTP/backend coverage lives in
 * test/schedule-apply-routes.test.js and test/schedule-apply-phase1b.test.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-add-menu.js';
const CLIENT_MODULE = 'public/js/schedule-apply-client.js';
const HTML = 'public/schedule.html';
const SCHEDULE_JS = 'public/js/schedule.js';

describe('Phase 1B — "+ Lägg till" primary menu', () => {
  it('A1/A3: schedule.html has exactly one new primary "+ Lägg till" button (no competing duplicate)', () => {
    const html = read(HTML);
    const matches = html.match(/id="scheduleAddMenuBtn"/g) || [];
    assert.equal(matches.length, 1, 'exactly one + Lägg till trigger button');
    assert.match(html, /ScheduleAddMenu\.open\(\)/);
    assert.match(html, /data-i18n="schedule\.addMenu\.trigger"/);
  });

  it('A2: schedule-add-menu.js opens all three primary options from one entry menu', () => {
    const src = read(MODULE);
    assert.match(src, /function openAddMenu/);
    assert.match(src, /ScheduleAddMenu\.openActivity\(\)/);
    assert.match(src, /ScheduleAddMenu\.openTemplate\(\)/);
    assert.match(src, /ScheduleAddMenu\.openCopyDay\(\)/);
  });

  it('is an IIFE exposing window.ScheduleAddMenu with the documented public API', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m);
    for (const fn of [
      'open', 'openMenu', 'close', 'openActivity', 'submitActivity', 'openTemplate',
      'submitTemplate', 'openCopyDay', 'submitCopyDay', 'openSaveAsTemplate', 'submitSaveAsTemplate',
      'selectPendingCreate',
    ]) {
      assert.match(src, new RegExp(`\\b${fn}\\b`), `ScheduleAddMenu API must include ${fn}`);
    }
    assert.match(src, /window\.ScheduleAddMenu\s*=/);
  });

  it('script load order: apply-client and add-menu load after schedule.js/schedule-views.js', () => {
    const html = read(HTML);
    const idx = (needle) => html.indexOf(needle);
    const scheduleJsIdx = idx('/js/schedule.js?');
    const viewsIdx = idx('/js/schedule-views.js?');
    const clientIdx = idx('/js/schedule-apply-client.js?');
    const addMenuIdx = idx('/js/schedule-add-menu.js?');
    assert.ok(scheduleJsIdx > -1 && viewsIdx > -1 && clientIdx > -1 && addMenuIdx > -1, 'all four scripts must be present');
    assert.ok(clientIdx > scheduleJsIdx && clientIdx > viewsIdx, 'schedule-apply-client.js loads after schedule.js/schedule-views.js');
    assert.ok(addMenuIdx > clientIdx, 'schedule-add-menu.js loads after schedule-apply-client.js');
  });

  it('B7/C14/D21: default mode for every canonical command is merge, never replace_day', () => {
    const src = read(MODULE);
    // Module-level flow state defaults
    assert.match(src, /mode:\s*'merge'\s*\}/); // templateState / copyDayState default
    // Explicit call-sites into the backend never hardcode replace_day as a default
    assert.doesNotMatch(src, /mode:\s*'replace_day'\s*,?\s*\/\/\s*default/i);
  });

  it('C17/D22/§7: replace_day always routes through the destructive confirmation before mutating', () => {
    const src = read(MODULE);
    assert.match(src, /function confirmReplaceDay/);
    // Template + copy-day submit paths must check for replace_day and call the confirmation
    // BEFORE the actual mutating call (doSubmitTemplate / doSubmitCopyDay).
    const submitTemplateBody = src.slice(src.indexOf('async function submitTemplate'), src.indexOf('async function doSubmitTemplate'));
    assert.match(submitTemplateBody, /mode === 'replace_day'/);
    assert.match(submitTemplateBody, /confirmReplaceDay\(/);
    const submitCopyDayBody = src.slice(src.indexOf('async function submitCopyDay'), src.indexOf('async function doSubmitCopyDay'));
    assert.match(submitCopyDayBody, /mode === 'replace_day'/);
    assert.match(submitCopyDayBody, /confirmReplaceDay\(/);
  });

  it('§7: destructive confirmation never uses a generic "OK" label and always offers explicit Ersätt/Avbryt', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, />OK</);
    assert.match(src, /confirmReplaceDay\.confirmBtn/);
    assert.match(src, /confirmReplaceDay\.cancelBtn/);
  });

  it('B8/C/D §12/§1B.9: operation_id is generated via ScheduleApplyClient and sent on every canonical call', () => {
    const src = read(MODULE);
    assert.match(src, /ScheduleApplyClient\.createOperationTracker\(\)/);
    assert.match(src, /opTracker\.forCommand\(/g);
    assert.match(src, /applyActivity\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /applyTemplate\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /copyDay\(currentChildId,\s*\{[^}]*operationId/s);
    assert.match(src, /saveDayAsTemplate\(currentChildId,\s*\{[^}]*operationId/s);
  });

  it('schedule-apply-client.js: operation tracker only regenerates the id when the command fingerprint changes', () => {
    const src = read(CLIENT_MODULE);
    assert.match(src, /function createOperationTracker/);
    assert.match(src, /serialized !== lastFingerprint/);
  });

  it('E24/E27: "Spara dagen som mall" is added to the EXISTING day action row (no second competing day menu)', () => {
    const src = read(SCHEDULE_JS);
    assert.match(src, /ScheduleAddMenu\.openSaveAsTemplate\(\)/);
    // Existing legacy day-action buttons remain (strangler §1B.13/§20 — not removed).
    assert.match(src, /openCopyDayModal\(\)/);
    assert.match(src, /confirmDeleteSchedule\(\)/);
  });

  it('F26/F29: critical controls use an explicit >=44px effective touch target class', () => {
    const src = read(MODULE);
    assert.match(src, /const TOUCH_BTN = 'min-h-\[44px\] min-w-\[44px\]'/, 'a single shared >=44x44px touch-target class must be defined');
    const usageCount = (src.match(/\$\{TOUCH_BTN\}/g) || []).length;
    assert.ok(usageCount > 15, `expected TOUCH_BTN applied broadly across interactive controls, found ${usageCount} uses`);
  });

  it('F30: no interaction in the new flow requires drag-and-drop', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, /draggable=|dragstart|ondrop/);
  });

  it('F32: selected weekday/mode state is conveyed via text/icon, not colour alone', () => {
    const src = read(MODULE);
    assert.match(src, /aria-pressed/); // weekday chip selection state
    assert.match(src, /aria-checked/); // mode selector selection state
    assert.match(src, /active \? '✓ ' : ''/); // explicit checkmark glyph, not just a colour swap
  });

  it('§17: ESC closes the modal, dialog role + aria-modal are set', () => {
    const src = read(MODULE);
    assert.match(src, /'Escape'/);
    assert.match(src, /role',\s*'dialog'/);
    assert.match(src, /aria-modal',\s*'true'/);
  });

  it('§1B.20/§1B.21 decision records are documented in the module header', () => {
    const src = read(MODULE);
    assert.match(src, /Multi-child decision/);
    assert.match(src, /applyScheduleSourceToTargets/);
  });

  it('H36-38: legacy fill-week / assign-schedule / apply-date-range surfaces are untouched', () => {
    const html = read(HTML);
    assert.match(html, /openFillWeekModal\(\)/, 'legacy Fyll vecka trigger still present');
    assert.match(html, /id="fillWeekBtn"/);
    assert.ok(fs.existsSync(path.join(ROOT, 'public/assign-schedule.html')), 'assign-schedule.html must still exist');
  });

  it('Phase 1B custody hardening §3/§4: every submit path reads the active custody home and forwards it', () => {
    const src = read(MODULE);
    assert.match(src, /function activeCustodyHomeId/);
    assert.match(src, /ScheduleCustody\.getActiveHomeId\(\)/);

    // Each submit function computes custodyHomeId once and forwards it to BOTH the operation
    // fingerprint (so switching custody home never reuses a stale operation_id, §5) AND the
    // client call body (so the request actually targets that home, §4/§8-11).
    for (const [startMarker, endMarker] of [
      ['async function doSubmitTemplate', 'async function openCopyDay'],
    ]) {
      const body = src.slice(src.indexOf(startMarker), endMarker ? src.indexOf(endMarker) : undefined);
      assert.match(body, /const custodyHomeId = activeCustodyHomeId\(\)/, `${startMarker} must read activeCustodyHomeId()`);
      assert.match(body, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/, `${startMarker} fingerprint must include custodyHomeId`);
      assert.match(body, /custodyHomeId,?\s*\}\);/, `${startMarker} client call must forward custodyHomeId`);
    }

    const applyCallStart = src.indexOf('ScheduleApplyClient.applyActivity(currentChildId');
    const submitActivityBody = src.slice(src.lastIndexOf('const days = [...activityState.days];', applyCallStart), applyCallStart + 450);
    assert.match(submitActivityBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitActivityBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);
    assert.match(submitActivityBody, /operationId, custodyHomeId/);

    const submitCopyDayBody = src.slice(src.indexOf('async function doSubmitCopyDay'), src.indexOf('setPending(\'samCopyDaySaveBtn\', false);'));
    assert.match(submitCopyDayBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitCopyDayBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);

    const submitSaveAsTemplateBody = src.slice(src.indexOf('async function submitSaveAsTemplate'), src.indexOf('async function openDay') > -1 ? src.indexOf('async function openDay') : undefined);
    assert.match(submitSaveAsTemplateBody, /const custodyHomeId = activeCustodyHomeId\(\)/);
    assert.match(submitSaveAsTemplateBody, /forCommand\(\{[^]*?custodyHomeId[^]*?\}\)/);
  });

  it('Phase 1B custody hardening §4: HTTP client accepts custodyHomeId and only sends custody_home_id when truthy', () => {
    const src = read(CLIENT_MODULE);
    for (const fn of ['applyActivity', 'applyTemplate', 'copyDay', 'saveDayAsTemplate']) {
      const start = src.indexOf(`${fn}(childId`);
      assert.ok(start > -1, `${fn} must exist in the client`);
      const body = src.slice(start, start + 700);
      assert.match(body, /custodyHomeId/, `${fn} must accept custodyHomeId`);
      assert.match(body, /custodyHomeId \? \{ custody_home_id: custodyHomeId \} : \{\}/, `${fn} must only send custody_home_id when active`);
    }
  });

  it('no hardcoded Swedish/English literal user copy — every label goes through pt()/i18n keys', () => {
    const src = read(MODULE);
    // Only inspect non-comment code lines — doc comments legitimately name the Swedish
    // product concepts (matches the repo's own audit-hardcoded-swedish.js convention of
    // exempting `//` and `/** */` lines). Real user-visible copy must only appear as an
    // i18n key lookup (t('schedule.addMenu....')), asserted for full sv-SE/en-GB parity by
    // test/i18n-schedule-surfaces.test.js "schedule fragment keys have full sv-SE / en-GB parity".
    const codeLines = src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const codeOnly = codeLines.join('\n');
    for (const literal of ['Lägg till aktivitet', 'Ersätt hela dagen', 'Spara dagen som mall']) {
      assert.doesNotMatch(codeOnly, new RegExp(literal), `"${literal}" must be an i18n key, not a hardcoded literal in code`);
    }
  });

  it('inline create: create row only for non-empty trimmed name without exact match', () => {
    const src = read(MODULE);
    assert.match(src, /function normalizeActivityName/);
    assert.match(src, /function activityNameKey/);
    assert.match(src, /function findExactActivityMatch/);
    assert.match(src, /function shouldShowCreateRow/);
    const showBody = src.slice(src.indexOf('function shouldShowCreateRow'), src.indexOf('function timeGroupFromSection'));
    assert.match(showBody, /normalizeActivityName\(query\)/);
    assert.match(showBody, /if \(!name\) return false/);
    assert.match(showBody, /findExactActivityMatch/);
    const picker = src.slice(src.indexOf('function renderActivityPicker'), src.indexOf('function renderActivityStep'));
    assert.match(picker, /shouldShowCreateRow\(activityState\.query/);
    assert.match(picker, /selectPendingCreate/);
    assert.match(picker, /libraryAutoSaveNote/);
    assert.doesNotMatch(picker, /template\.noneMine/);
    assert.match(picker, /activity\.noneFound/);
    assert.match(picker, /activity\.noneYet/);
  });

  it('inline create: new activity creates once at Save then applies', () => {
    const src = read(MODULE);
    const createFn = src.slice(src.indexOf('async function createFamilyActivity'), src.indexOf('async function submitActivity'));
    assert.match(createFn, /apiFetch\('\/api\/activities'/);
    assert.match(createFn, /method:\s*'POST'/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    const createIdx = submit.indexOf('createFamilyActivity(');
    const applyIdx = submit.indexOf('ScheduleApplyClient.applyActivity');
    assert.ok(createIdx > -1 && applyIdx > createIdx, 'create runs before apply');
    assert.match(submit, /createdUnappliedId \|\| activityState\.templateId/);
    assert.match(submit, /createFamilyActivity\(stagedName\)/);
    assert.match(submit, /if \(!created\.ok \|\| !created\.data\.id\)/);
    assert.match(submit, /createdUnappliedId = templateId/);
    assert.match(submit, /loadTemplates/);
    assert.match(submit, /loadScheduleForDay|afterSuccessfulMutation/);
    assert.doesNotMatch(submit, /\/api\/activities\/\$\{/);
  });

  it('inline create: existing exact match is reused with zero create requests', () => {
    const src = read(MODULE);
    const filterBody = src.slice(src.indexOf('function filterActivity'), src.indexOf('function selectActivity'));
    assert.match(filterBody, /findExactActivityMatch\(allTemplates, q\)/);
    assert.match(filterBody, /activityState\.templateId = match\.id/);
    const helpers = src.slice(src.indexOf('function findExactActivityMatch'), src.indexOf('function shouldShowCreateRow'));
    assert.match(helpers, /activityNameKey\(tpl\.name\) === key/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    const createGuard = submit.slice(0, submit.indexOf('createFamilyActivity'));
    assert.match(createGuard, /createdUnappliedId \|\| activityState\.templateId/);
    assert.match(createGuard, /findExactActivityMatch\(allTemplates, stagedName\)/);
    assert.match(createGuard, /if \(!templateId && shouldShowCreateRow\(stagedName/);
  });

  it('inline create: match is trim + case-insensitive; whitespace-only never creates', () => {
    const src = read(MODULE);
    const normalize = src.slice(src.indexOf('function normalizeActivityName'), src.indexOf('function activityNameKey'));
    assert.match(normalize, /\.trim\(\)/);
    const keyFn = src.slice(src.indexOf('function activityNameKey'), src.indexOf('function findExactActivityMatch'));
    assert.match(keyFn, /\.toLowerCase\(\)/);
    const showBody = src.slice(src.indexOf('function shouldShowCreateRow'), src.indexOf('function timeGroupFromSection'));
    assert.match(showBody, /if \(!name\) return false/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    assert.match(submit, /shouldShowCreateRow\(stagedName, allTemplates\)/);
  });

  it('inline create: create failure does not apply; apply failure keeps id for retry', () => {
    const src = read(MODULE);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    const beforeApply = submit.slice(0, submit.indexOf('ScheduleApplyClient.applyActivity'));
    assert.match(beforeApply, /if \(!created\.ok \|\| !created\.data\.id\)/);
    assert.match(beforeApply, /return;/);
    assert.match(submit, /activityState\.createdUnappliedId = templateId/);
    assert.match(submit, /activity\.applyFailed/);
    const afterFail = submit.slice(submit.indexOf('if (!ok)'), submit.indexOf('resetActivityForNextEntry()'));
    assert.match(afterFail, /return;/);
    assert.doesNotMatch(afterFail, /resetActivityForNextEntry\(\)/);
    assert.doesNotMatch(afterFail, /createdUnappliedId = null/);
    const createGuard = submit.slice(0, submit.indexOf('createFamilyActivity'));
    assert.match(createGuard, /createdUnappliedId/);
    assert.doesNotMatch(src, /DELETE \/api\/activities/);
  });

  it('inline create: existing add-activity path still applies selected templates', () => {
    const src = read(MODULE);
    assert.match(src, /function selectActivity\(id\)/);
    assert.match(src, /ScheduleApplyClient\.applyActivity\(currentChildId/);
    assert.match(src, /activity\.added/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    assert.match(submit, /createdThisSave \? 'schedule\.addMenu\.activity\.createdAndAdded' : 'schedule\.addMenu\.activity\.added'/);
  });

  it('inline create: Copy Day path is unchanged and does not create activities', () => {
    const src = read(MODULE);
    const copyDay = src.slice(src.indexOf('function openCopyDay'), src.indexOf('function openSaveAsTemplate'));
    assert.ok(copyDay.length > 200, 'copy-day slice includes open + submit handlers');
    assert.match(copyDay, /ScheduleApplyClient\.copyDay/, 'copy day still applies via ScheduleApplyClient');
    assert.doesNotMatch(copyDay, /createFamilyActivity/, 'copy day does not create activities');
    assert.doesNotMatch(copyDay, /pendingNewName/, 'copy day does not use inline-create state');
    assert.match(src, /function openCopyDay/);
    assert.match(src, /function submitCopyDay/);
  });

  it('rapid entry: successful Activity save stays open and resets for the next name', () => {
    const src = read(MODULE);
    assert.match(src, /function resetActivityForNextEntry/);
    const helper = src.slice(src.indexOf('function resetActivityForNextEntry'), src.indexOf('async function openActivity'));
    assert.match(helper, /resetActivityCreateState\(\)/);
    assert.match(helper, /activityState\.query = ''/);
    assert.match(helper, /activityState\.days = days/);
    assert.match(helper, /activityState\.section = section/);
    assert.match(helper, /activityState\.startTime = startTime/);
    assert.match(helper, /activityState\.endTime = endTime/);
    assert.match(helper, /opTracker\.reset\(\)/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    const success = submit.slice(submit.indexOf('resetActivityForNextEntry()'));
    assert.match(success, /resetActivityForNextEntry\(\)/);
    assert.match(success, /renderActivityStep\(\)/);
    assert.match(success, /restoreSearchFocus\(\)/);
    assert.match(success, /afterSuccessfulMutation\(\)/);
    assert.doesNotMatch(success, /closeAddMenu\(\)/);
    const createFail = submit.slice(0, submit.indexOf('ScheduleApplyClient.applyActivity'));
    assert.doesNotMatch(createFail, /resetActivityForNextEntry\(\)/);
  });

  it('rapid entry: submit mutex blocks a second in-flight Activity save', () => {
    const src = read(MODULE);
    assert.match(src, /let activitySubmitInFlight = false/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    assert.match(submit, /if \(activitySubmitInFlight\) return;/);
    assert.match(submit, /activitySubmitInFlight = true/);
    assert.match(submit, /finally \{\s*activitySubmitInFlight = false/s);
    assert.doesNotMatch(submit, /setTimeout\(|debounce/);
  });

  it('rapid entry: two sequential saves reset opTracker so the second apply is a new command', () => {
    const src = read(MODULE);
    const helper = src.slice(src.indexOf('function resetActivityForNextEntry'), src.indexOf('async function openActivity'));
    assert.match(helper, /opTracker\.reset\(\)/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    const resetIdx = submit.indexOf('resetActivityForNextEntry()');
    const applyIdx = submit.indexOf('ScheduleApplyClient.applyActivity');
    assert.ok(resetIdx > applyIdx, 'opTracker reset happens after a successful apply, not before');
    assert.doesNotMatch(submit.slice(submit.indexOf('if (!ok)'), resetIdx), /opTracker\.reset\(\)/);
  });

  it('rapid entry: Template and Copy Day still close on success', () => {
    const src = read(MODULE);
    const templateSuccess = src.slice(src.indexOf('async function doSubmitTemplate'), src.indexOf('function openCopyDay'));
    assert.match(templateSuccess, /closeAddMenu\(\)/);
    assert.doesNotMatch(templateSuccess, /resetActivityForNextEntry\(\)/);
    const copySuccess = src.slice(src.indexOf('async function doSubmitCopyDay'), src.indexOf('function openSaveAsTemplate'));
    assert.match(copySuccess, /closeAddMenu\(\)/);
    assert.doesNotMatch(copySuccess, /resetActivityForNextEntry\(\)/);
  });

  it('rapid entry: child switch closes the Activity modal instead of applying to the wrong child', () => {
    const src = read(MODULE);
    assert.match(src, /let activityContextChildId = null/);
    assert.match(src, /activityContextChildId = currentChildId/);
    assert.match(src, /function closeIfChildContextChanged/);
    assert.match(src, /function bindChildContextGuards/);
    assert.match(src, /window\.selectChild = wrappedSelectChild/);
    assert.match(src, /window\.backToChildrenList = wrappedBackToChildren/);
    const submit = src.slice(src.indexOf('async function submitActivity'), src.indexOf('const templateState'));
    assert.match(submit, /currentChildId !== activityContextChildId/);
    assert.match(submit, /activity\.childChanged/);
    const applySlice = submit.slice(submit.lastIndexOf('if (!currentChildId || currentChildId !== activityContextChildId)'), submit.indexOf('ScheduleApplyClient.applyActivity'));
    assert.match(applySlice, /closeAddMenu\(\)/);
    assert.doesNotMatch(applySlice, /applyActivity\(/);
  });

  it('rapid entry: 375px Activity modal keeps a sticky Save footer and Escape still closes', () => {
    const src = read(MODULE);
    const html = read(HTML);
    assert.match(src, /sam-activity-shell/);
    assert.match(src, /sam-activity-scroll/);
    assert.match(src, /sam-activity-footer/);
    assert.match(src, /id="samActivitySaveBtn"/);
    assert.match(src, /aria-labelledby',\s*'scheduleAddMenuTitle'/);
    assert.match(src, /aria-live="polite"/);
    assert.match(html, /#scheduleAddMenuModal \.sam-activity-footer/);
    assert.match(html, /100dvh/);
    assert.match(src, /'Escape'/);
    assert.match(src, /ScheduleAddMenu\.close\(\)/);
  });
});
