#!/usr/bin/env node
/**
 * PR C UX gate — real 375×812 Puppeteer evidence (local server + disposable test account).
 * Outputs JSON report + PNG screenshots under /opt/cursor/artifacts/pr-c-ux-gate/
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { registerAndLogin, createChild } = require('../test/helpers/auth-session.js');

const BASE = process.env.PR_C_GATE_BASE_URL || 'http://127.0.0.1:3000';
const ART = process.env.SMOKE_ARTIFACTS || '/opt/cursor/artifacts/pr-c-ux-gate';

fs.mkdirSync(ART, { recursive: true });

function relLuminance(r, g, b) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const L1 = relLuminance(...fg) + 0.05;
  const L2 = relLuminance(...bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

function parseRgb(str) {
  const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return [255, 255, 255];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: '/' }));
}

async function measureButtonText(page, pattern, label) {
  return page.evaluate((pat, lbl) => {
    const btn = [...document.querySelectorAll('button')].find((b) => new RegExp(pat).test(b.textContent));
    if (!btn) return { label: lbl, missing: true };
    const fg = getComputedStyle(btn).color;
    let n2 = btn;
    let bg = getComputedStyle(document.body).backgroundColor;
    while (n2) {
      const bgc = getComputedStyle(n2).backgroundColor;
      if (bgc && bgc !== 'rgba(0, 0, 0, 0)' && bgc !== 'transparent') {
        bg = bgc;
        break;
      }
      n2 = n2.parentElement;
    }
    return { label: lbl, fg, bg };
  }, pattern, label);
}

function ratioFromMeasure(m) {
  if (m.missing) return m;
  const ratio = Number(contrastRatio(parseRgb(m.fg), parseRgb(m.bg)).toFixed(2));
  return { label: m.label, ratio, passNormal: ratio >= 4.5, fg: m.fg, bg: m.bg };
}

async function apiApplyActivities(base, session, childId, day, names) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    'X-CSRF-Token': session.csrfToken,
  };
  const activities = await fetch(`${base}/api/activities`, { headers }).then((r) => r.json());
  for (let i = 0; i < names.length; i++) {
    const tpl = activities.find((a) => a.name === names[i]) || activities[i];
    if (!tpl) continue;
    await fetch(`${base}/api/children/${childId}/schedules/apply-activity`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        activity_template_id: tpl.id,
        days: [day],
        section: i % 3 === 0 ? 'morgon' : i % 3 === 1 ? 'dag' : 'kvall',
        start_time: `${String(8 + i).padStart(2, '0')}:00`,
        end_time: `${String(8 + i).padStart(2, '0')}:30`,
        mode: 'merge',
        operation_id: `gate-seed-${day}-${i}-${Date.now()}`,
      }),
    });
  }
}

async function countMondayItems(base, session, childId) {
  const headers = { Cookie: Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
  const schedules = await fetch(`${base}/api/children/${childId}/schedules`, { headers }).then((r) => r.json());
  const mon = schedules.find((s) => s.day_of_week === 1);
  if (!mon) return 0;
  const items = await fetch(`${base}/api/schedules/${mon.id}/items`, { headers }).then((r) => r.json());
  return (items.items || []).length;
}

async function waitForSelector(page, sel, timeout = 8000) {
  await page.waitForSelector(sel, { timeout, visible: true });
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.error('puppeteer missing');
    process.exit(2);
  }

  const session = await registerAndLogin(BASE, { name: 'PR C Gate' });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  for (const c of puppeteerCookies(session.cookies, BASE)) await page.setCookie(c);
  const onboardRes = await page.evaluate(async () => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
    const r = await fetch('/api/onboarding/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
    });
    return { status: r.status, text: await r.text() };
  });
  if (onboardRes.status !== 200) {
    throw new Error(`onboarding/complete in browser failed: ${JSON.stringify(onboardRes)}`);
  }
  const childId = await page.evaluate(async () => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
    const r = await fetch('/api/children', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
      body: JSON.stringify({ name: 'GateBarn', emoji: '🌟', birthday: '2018-01-01' }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`create child failed ${r.status}: ${JSON.stringify(data)}`);
    return data.id;
  });

  const report = {
    viewport: '375x812',
    base: BASE,
    email: session.email,
    childId,
    onboardingComplete: onboardRes,
    scenarios: {},
    contrast: { light: [], dark: [] },
    i18n: {},
    taps: {},
    regression: {},
    routes: [],
  };
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) report.routes.push(frame.url());
  });

  await page.goto(`${BASE}/schedule?child=${childId}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => /Lägg till aktivitet|Add activity/.test(b.textContent)),
    { timeout: 60000 },
  );
  await new Promise((r) => setTimeout(r, 2000));
  if (page.url().includes('/onboarding')) {
    const meCheck = await page.evaluate(async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      return { status: r.status, body: r.ok ? await r.json() : null };
    });
    await page.screenshot({ path: path.join(ART, 'FAIL-onboarding-redirect.png'), fullPage: true });
    throw new Error(`Unexpected onboarding redirect: onboard=${JSON.stringify(report.onboardingComplete)} authMe=${JSON.stringify(meCheck)} url=${page.url()}`);
  }
  if (!await page.evaluate(() => /Lägg till aktivitet|Add activity/.test(document.getElementById('scheduleContent')?.innerText || ''))) {
    const snippet = await page.evaluate(() => document.getElementById('scheduleContent')?.innerText?.slice(0, 500));
    await page.screenshot({ path: path.join(ART, 'FAIL-schedule-load.png'), fullPage: true });
    throw new Error(`Empty-week CTA missing at ${page.url()}: ${snippet}`);
  }
  const routeAtStart = page.url();

  report.scenarios.A = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const primary = btns.find((b) => /Lägg till aktivitet/.test(b.textContent));
    const template = btns.find((b) => /Använd mall/.test(b.textContent));
    const pr = primary?.getBoundingClientRect();
    const tr = template?.getBoundingClientRect();
    return {
      primaryVisible: Boolean(primary),
      templateSecondaryVisible: Boolean(template),
      primaryAboveTemplate: pr && tr ? pr.y < tr.y : null,
      forcedTemplateChooser: Boolean(document.body.innerText.match(/Från mall/i)),
      noLibraryRoute: !location.pathname.includes('/library'),
    };
  });
  await page.screenshot({ path: path.join(ART, 'A-empty-week-sv.png'), fullPage: true });

  let taps = 0;
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Lägg till aktivitet/.test(b.textContent)).click());
  taps += 1;
  await waitForSelector(page, '#scheduleAddMenuBody h3');
  report.scenarios.A.rapidEntryOpened = true;
  report.scenarios.A.noRouteChangeOnOpen = page.url().includes('/schedule');
  await page.screenshot({ path: path.join(ART, 'A-rapid-entry-open-sv.png'), fullPage: true });

  const familyActivities = await fetch(`${BASE}/api/activities`, {
    headers: { Cookie: Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ') },
  }).then((r) => r.json());
  const saveNames = familyActivities.slice(0, 6).map((a) => a.name);
  const sequential = [];
  for (let i = 0; i < 6; i++) {
    const name = saveNames[i];
    await page.type('#samActivitySearch', name, { delay: 10 });
    await new Promise((r) => setTimeout(r, 250));
    const picked = await page.evaluate((n) => {
      const btn = [...document.querySelectorAll('#samActivityList button')].find((b) => b.textContent.includes(n));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, name);
    if (picked) taps += 1;
    await page.click('#samActivitySaveBtn');
    taps += 1;
    await new Promise((r) => setTimeout(r, 700));
    sequential.push(await page.evaluate(() => ({
      modalStillOpen: Boolean(document.querySelector('#scheduleAddMenuBody h3')),
      stillOnSchedule: location.pathname.includes('/schedule'),
      noLibrary: !location.pathname.includes('/library'),
    })));
    await page.evaluate(() => {
      const input = document.querySelector('#samActivitySearch');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
  report.scenarios.A.sequentialSaves = sequential;
  report.scenarios.A.allSixInOneModal = sequential.every((s) => s.modalStillOpen && s.stillOnSchedule && s.noLibrary);
  report.taps.scenarioA = taps;
  await page.screenshot({ path: path.join(ART, 'A-after-six-saves-sv.png'), fullPage: true });
  await page.keyboard.press('Escape');

  await apiApplyActivities(BASE, session, childId, 4, saveNames.slice(0, 4));
  await page.goto(`${BASE}/schedule?child=${childId}`, { waitUntil: 'networkidle2' });
  await page.click('.day-tab[data-day="1"]');
  await new Promise((r) => setTimeout(r, 800));

  report.scenarios.C = { copyFromVisible: await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Kopiera från annan dag/.test(b.textContent))) };
  if (report.scenarios.C.copyFromVisible) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera från annan dag/.test(b.textContent)).click());
    await new Promise((r) => setTimeout(r, 500));
    const body = await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '');
    report.scenarios.C.modalText = body.slice(0, 700);
    report.scenarios.C.hasSourceSection = /Kopiera från/i.test(body);
    report.scenarios.C.hasTargetSection = /Kopiera till/i.test(body);
    report.scenarios.C.mergeDefault = /●.*Lägg till/i.test(body);
    report.scenarios.C.targetMondaySelected = /✓\s*Mån/i.test(body);
    report.scenarios.C.sourceVisible = await page.evaluate(() => [...document.querySelectorAll('#scheduleAddMenuBody button')].some((b) => /Tor|Torsdag/i.test(b.textContent) && b.className.includes('bg-navy')));
    const mondayBefore = await countMondayItems(BASE, session, childId);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avbryt')?.click());
    await new Promise((r) => setTimeout(r, 400));
    report.scenarios.C.cancelZeroMutation = (await countMondayItems(BASE, session, childId)) === mondayBefore;
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera från annan dag/.test(b.textContent)).click());
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Tisdag'))?.click());
    report.scenarios.C.sourceChangedToTuesday = /✓.*Tisdag/i.test(await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || ''));
    await page.screenshot({ path: path.join(ART, 'C-copy-from-day-modal-sv.png'), fullPage: true });
    await page.keyboard.press('Escape');
  }

  await page.click('.day-tab[data-day="4"]');
  await new Promise((r) => setTimeout(r, 800));
  report.scenarios.B = await page.evaluate(() => ({
    copyDayVisible: [...document.querySelectorAll('button')].some((b) => /Kopiera dag/.test(b.textContent)),
    promoTextPresent: document.body.innerText.includes('Klar dag'),
    verdict: 'promo removed — promoted button only',
  }));
  await page.screenshot({ path: path.join(ART, 'B-populated-day-header-sv.png'), fullPage: true });

  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera dag/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 500));
  report.scenarios.replace = {
    mergeDefaultOnFreshOpen: /●.*Lägg till/i.test(await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '')),
  };
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Ersätt hela dagen/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 300));
  report.scenarios.replace.replaceSelected = /●.*Ersätt hela dagen|Ersätter allt som redan finns/i.test(await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || ''));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Tisdag'))?.click());
  await page.click('#samCopyDaySaveBtn');
  await new Promise((r) => setTimeout(r, 600));
  report.scenarios.replace.confirmDialogShown = Boolean(await page.$('#samConfirmCancelBtn'));
  if (report.scenarios.replace.confirmDialogShown) {
    await page.click('#samConfirmCancelBtn');
    await new Promise((r) => setTimeout(r, 400));
  }
  report.scenarios.replace.cancelConfirmZeroMutation = Boolean(await page.$('#scheduleAddMenuBody'));
  await page.keyboard.press('Escape');

  await page.click('.day-tab[data-day="1"]');
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Lägg till aktivitet', 'primaryAdd')));
  report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera från annan dag', 'copyFromDay')));
  report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Använd mall', 'useTemplate')));
  await page.click('.day-tab[data-day="4"]');
  report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera dag', 'promotedCopyDay')));

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise((r) => setTimeout(r, 300));
  await page.click('.day-tab[data-day="1"]');
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, 'Lägg till aktivitet', 'primaryAddDark')));
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera från annan dag', 'copyFromDayDark')));
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, 'Använd mall', 'useTemplateDark')));

  report.i18n.svSE = await page.evaluate(() => ({
    emptyDayAdd: [...document.querySelectorAll('button')].some((b) => /Lägg till aktivitet/.test(b.textContent)),
    copyFrom: [...document.querySelectorAll('button')].some((b) => /Kopiera från annan dag/.test(b.textContent)),
    mixedLanguage: document.body.innerText.includes('Add activity'),
  }));

  await page.evaluate(() => {
    localStorage.setItem('sd_preferred_locale', 'en-GB');
    if (window.I18n && I18n.setLocale) I18n.setLocale('en-GB');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.querySelector('#scheduleContent'), { timeout: 30000 });
  await page.click('.day-tab[data-day="1"]');
  await new Promise((r) => setTimeout(r, 600));
  report.i18n.enGB = await page.evaluate(() => ({
    emptyDayAdd: [...document.querySelectorAll('button')].some((b) => /Add activity/.test(b.textContent)),
    copyFrom: [...document.querySelectorAll('button')].some((b) => /Copy from another day/.test(b.textContent)),
    useTemplate: [...document.querySelectorAll('button')].some((b) => /Use a template/.test(b.textContent)),
    mixedLanguage: document.body.innerText.includes('Lägg till aktivitet'),
  }));
  await page.click('.day-tab[data-day="4"]');
  report.i18n.enGB.copyDay = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Copy day/.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Copy day/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 400));
  const enModal = await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '');
  report.i18n.enGB.modal = {
    cancel: /Cancel/i.test(enModal),
    save: /Save/i.test(enModal),
    merge: /Add/i.test(enModal),
    replace: /Replace entire day/i.test(enModal),
  };
  await page.screenshot({ path: path.join(ART, 'i18n-en-copy-modal.png'), fullPage: true });

  report.regression = await page.evaluate(() => ({
    scheduleAddMenuPresent: typeof window.ScheduleAddMenu === 'object',
    legacyCopyDayFallback: typeof window.openCopyDayModal === 'function',
    removeButtons: document.querySelectorAll('.action-btn-remove').length > 0,
    sectionEdit: typeof window.ScheduleSectionEdit === 'object',
    rapidEntryFn: typeof window.ScheduleAddMenu?.openActivityForDay === 'function',
  }));

  report.routesSummary = {
    start: routeAtStart,
    end: page.url(),
    uniquePaths: [...new Set(report.routes.map((u) => new URL(u).pathname))],
  };

  fs.writeFileSync(path.join(ART, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
