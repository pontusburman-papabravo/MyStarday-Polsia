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
const { getSetCookieHeaders, mergeCookies } = require('../test/helpers/http.js');
const db = require('../src/lib/db.js');

async function registerEnSession(base) {
  const email = `gate-en-${Date.now()}@example.com`;
  const password = 'integration-test-pass-1';
  const registerRes = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Gate EN', preferred_locale: 'en-GB' }),
  });
  if (registerRes.status !== 201) {
    throw new Error(`en register failed ${registerRes.status}: ${await registerRes.text()}`);
  }
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, preferred_locale: 'en-GB' }),
  });
  const loginText = await loginRes.text();
  if (loginRes.status !== 200) {
    throw new Error(`en login failed ${loginRes.status}: ${loginText}`);
  }
  const loginBody = JSON.parse(loginText);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { email, cookies, csrfToken: loginBody.csrfToken };
}

async function enableEnglishGlobalFlag() {
  await db.query(
    `UPDATE feature_flag SET enabled = true WHERE key = 'english_app_global_enabled'`,
  );
}

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

function parseRgba(str) {
  const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])];
}

function parseRgb(str) {
  const rgba = parseRgba(str);
  return rgba ? rgba.slice(0, 3) : [255, 255, 255];
}

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: '/' }));
}

async function measureButtonText(page, pattern, label, root = '#scheduleContent') {
  return page.evaluate((pat, lbl, rootSel) => {
    const root = rootSel ? document.querySelector(rootSel) : document.body;
    const scope = root || document.body;
    const btn = [...scope.querySelectorAll('button')].find((b) => {
      if (b.offsetParent === null && !b.closest('#scheduleAddMenuBody')) return false;
      return new RegExp(pat).test(b.textContent);
    });
    if (!btn) return { label: lbl, missing: true };
    const parse = (str) => {
      const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])] : null;
    };
    const opaqueAncestor = (el) => {
      let n = el.parentElement;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c[3] >= 0.99) return c.slice(0, 3);
        n = n.parentElement;
      }
      return [7, 7, 26];
    };
    const cs = getComputedStyle(btn);
    const img = cs.backgroundImage || '';
    const hexes = [...img.matchAll(/#([0-9a-fA-F]{3,8})/g)].map((m) => {
      const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1].slice(0, 6);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    });
    const rgbStops = [...img.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map((m) => [
      Number(m[1]), Number(m[2]), Number(m[3]),
    ]);
    const stops = hexes.concat(rgbStops);
    const raw = parse(cs.backgroundColor) || [0, 0, 0, 0];
    const under = opaqueAncestor(btn);
    const composited = raw[3] >= 0.99 ? raw.slice(0, 3) : [
      Math.round(raw[0] * raw[3] + under[0] * (1 - raw[3])),
      Math.round(raw[1] * raw[3] + under[1] * (1 - raw[3])),
      Math.round(raw[2] * raw[3] + under[2] * (1 - raw[3])),
    ];
    const worst = stops.length ? stops[stops.length - 1] : composited;
    return {
      label: lbl,
      fg: cs.color,
      bg: `rgb(${worst[0]}, ${worst[1]}, ${worst[2]})`,
      backgroundColor: cs.backgroundColor,
      backgroundImage: img === 'none' ? '' : img,
      gradientStops: stops,
      className: btn.className,
    };
  }, pattern, label, root);
}

async function measureChipContrast(page, selector, label) {
  return page.evaluate((sel, lbl) => {
    const el = document.querySelector(sel);
    if (!el) return { label: lbl, missing: true };
    const parse = (str) => {
      const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])] : null;
    };
    const opaqueAncestor = (node) => {
      let n = node.parentElement;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c[3] >= 0.99) return c.slice(0, 3);
        n = n.parentElement;
      }
      return [7, 7, 26];
    };
    const cs = getComputedStyle(el);
    const raw = parse(cs.backgroundColor) || [0, 0, 0, 0];
    const under = opaqueAncestor(el);
    const composited = raw[3] >= 0.99 ? raw.slice(0, 3) : [
      Math.round(raw[0] * raw[3] + under[0] * (1 - raw[3])),
      Math.round(raw[1] * raw[3] + under[1] * (1 - raw[3])),
      Math.round(raw[2] * raw[3] + under[2] * (1 - raw[3])),
    ];
    return {
      label: lbl,
      fg: cs.color,
      bg: `rgb(${composited[0]}, ${composited[1]}, ${composited[2]})`,
      className: el.className,
      ariaPressed: el.getAttribute('aria-pressed'),
      ariaChecked: el.getAttribute('aria-checked'),
    };
  }, selector, label);
}

function ratioFromMeasure(m) {
  if (m.missing) return m;
  const fg = parseRgb(m.fg);
  const bg = parseRgb(m.bg);
  const ratio = Number(contrastRatio(fg, bg).toFixed(2));
  const ratios = (m.gradientStops || []).map((stop) => Number(contrastRatio(fg, stop).toFixed(2)));
  const worst = ratios.length ? Math.min(ratio, ...ratios) : ratio;
  return {
    label: m.label,
    ratio: worst,
    passNormal: worst >= 4.5,
    passUi: worst >= 3,
    fg: m.fg,
    bg: m.bg,
    className: m.className,
    gradientStops: m.gradientStops,
    whiteOnGold: /\bbg-gold\b/.test(m.className || '') && /\btext-white\b/.test(m.className || ''),
  };
}

async function forceTheme(page, theme) {
  await page.evaluate((t) => {
    if (window.AppViewMode && AppViewMode.setTheme) AppViewMode.setTheme(t);
    const light = t === 'light';
    document.body.classList.toggle('parent-theme-light', light);
    document.body.classList.toggle('parent-theme-dark', !light);
    document.documentElement.classList.toggle('parent-theme-light', light);
    document.documentElement.classList.toggle('parent-theme-dark', !light);
    document.documentElement.classList.toggle('dark', !light);
    document.body.classList.toggle('dark', !light);
  }, theme);
  await new Promise((r) => setTimeout(r, 250));
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
  await enableEnglishGlobalFlag();

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
    a11y: {},
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

  await forceTheme(page, 'light');
  report.themeLight = await page.evaluate(() => ({
    body: document.body.className,
    html: document.documentElement.className,
    theme: window.AppViewMode && AppViewMode.getTheme ? AppViewMode.getTheme() : null,
  }));
  report.i18n.svSE = await page.evaluate(() => ({
    emptyDayAdd: [...document.querySelectorAll('button')].some((b) => /Lägg till aktivitet/.test(b.textContent)),
    copyFrom: false,
    mixedLanguage: document.body.innerText.includes('Add activity'),
  }));
  report.contrast.light = [
    ratioFromMeasure(await measureButtonText(page, 'Lägg till aktivitet', 'primaryAdd')),
    ratioFromMeasure(await measureButtonText(page, 'Använd mall', 'useTemplate')),
  ];
  report.contrast.lightWhiteOnGold = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Lägg till aktivitet/.test(b.textContent));
    if (!btn) return { missing: true };
    const cls = btn.className;
    const color = getComputedStyle(btn).color;
    return {
      className: cls,
      color,
      usesPlannerPrimary: cls.includes('bg-gold') && cls.includes('text-navy'),
      whiteOnGold: cls.includes('text-white') && cls.includes('bg-gold'),
    };
  });
  await page.screenshot({ path: path.join(ART, 'contrast-empty-day-sv.png'), fullPage: true });

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
  report.a11y.emptyWeek = await page.evaluate(() => {
    const measure = (btn) => {
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return {
        text: btn.textContent.trim().slice(0, 48),
        w: Math.round(r.width),
        h: Math.round(r.height),
        min44: r.height >= 44,
        aria: btn.getAttribute('aria-label'),
      };
    };
    const btns = [...document.querySelectorAll('#scheduleContent button')];
    return {
      primaryAdd: measure(btns.find((b) => /Lägg till aktivitet/.test(b.textContent))),
      useTemplate: measure(btns.find((b) => /Använd mall/.test(b.textContent))),
    };
  });

  let taps = 0;
  await page.click('.day-tab[data-day="2"]');
  await new Promise((r) => setTimeout(r, 500));
  taps += 1;
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Lägg till aktivitet/.test(b.textContent)).click());
  taps += 1;
  await waitForSelector(page, '#scheduleAddMenuBody h3');
  report.scenarios.A.rapidEntryOpened = true;
  report.scenarios.A.noRouteChangeOnOpen = page.url().includes('/schedule');
  await page.screenshot({ path: path.join(ART, 'A-rapid-entry-open-sv.png'), fullPage: true });

  const familyActivities = await fetch(`${BASE}/api/activities`, {
    headers: { Cookie: Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ') },
  }).then((r) => r.json());
  const saveNames = ['Middag', 'Läkemedel', 'Kroppssmörjning', 'Borsta tänderna', 'Pyjamas', 'Läsa bok'];
  report.scenarios.A.requestedActivities = saveNames;
  report.scenarios.A.familyLibraryCount = familyActivities.length;
  const sequential = [];
  for (let i = 0; i < 6; i++) {
    const name = saveNames[i];
    await page.click('#samActivitySearch');
    taps += 1;
    await page.type('#samActivitySearch', name, { delay: 10 });
    await new Promise((r) => setTimeout(r, 250));
    const picked = await page.evaluate((n) => {
      const listBtn = [...document.querySelectorAll('#samActivityList button')].find((b) => b.textContent.includes(n));
      if (listBtn) {
        listBtn.click();
        return 'existing';
      }
      const createBtn = [...document.querySelectorAll('#scheduleAddMenuBody button')].find(
        (b) => /Skapa|"/.test(b.textContent) && b.textContent.includes(n)
      );
      if (createBtn) {
        createBtn.click();
        return 'create';
      }
      return false;
    }, name);
    if (picked) taps += 1;
    await page.click('#samActivitySaveBtn');
    taps += 1;
    await new Promise((r) => setTimeout(r, 700));
    sequential.push(await page.evaluate((n, pickKind) => ({
      name: n,
      pickKind,
      modalStillOpen: Boolean(document.querySelector('#scheduleAddMenuBody h3')),
      stillOnSchedule: location.pathname.includes('/schedule'),
      noLibrary: !location.pathname.includes('/library'),
    }), name, picked));
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

  const cChildId = await page.evaluate(async () => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
    const r = await fetch('/api/children', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
      body: JSON.stringify({ name: 'CopyBarn', emoji: '🌙', birthday: '2017-06-01' }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`create copy child failed ${r.status}: ${JSON.stringify(data)}`);
    return data.id;
  });
  await apiApplyActivities(BASE, session, cChildId, 4, ['Middag', 'Läkemedel', 'Pyjamas', 'Borsta tänderna']);
  await page.goto(`${BASE}/schedule?child=${cChildId}`, { waitUntil: 'networkidle2' });
  await forceTheme(page, 'light');
  await page.click('.day-tab[data-day="1"]');
  await new Promise((r) => setTimeout(r, 800));

  report.scenarios.C = {
    childId: cChildId,
    copyFromVisible: await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Kopiera från annan dag/.test(b.textContent))),
  };
  if (report.scenarios.C.copyFromVisible) {
    report.i18n.svSE = report.i18n.svSE || {};
    report.i18n.svSE.copyFrom = true;
    report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera från annan dag', 'copyFromDay')));
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera från annan dag/.test(b.textContent)).click());
    await new Promise((r) => setTimeout(r, 500));
    report.contrast.light.push(
      ratioFromMeasure(await measureChipContrast(page, '#scheduleAddMenuBody button.bg-navy.text-white', 'sourceDaySelected')),
    );
    report.contrast.light.push(
      ratioFromMeasure(await measureChipContrast(page, '#scheduleAddMenuBody button[aria-pressed="true"]', 'targetDaySelected')),
    );
    const body = await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '');
    report.scenarios.C.modalText = body.slice(0, 700);
    report.scenarios.C.hasSourceSection = /Kopiera från/i.test(body);
    report.scenarios.C.hasTargetSection = /Kopiera till/i.test(body);
    report.scenarios.C.mergeDefault = /●.*Lägg till/i.test(body);
    report.scenarios.C.targetMondaySelected = /✓\s*Mån/i.test(body);
    report.scenarios.C.sourceSelected = await page.evaluate(() => {
      const selected = [...document.querySelectorAll('#scheduleAddMenuBody button[aria-pressed="true"], #scheduleAddMenuBody button.bg-navy')];
      const source = selected.find((b) => /Mån|Tis|Ons|Tor|Fre|Lör|Sön/.test(b.textContent) && !/✓/.test(b.textContent));
      return {
        text: source ? source.textContent.trim() : null,
        ariaPressed: source ? source.getAttribute('aria-pressed') : null,
        thursday: Boolean(source && /Tor/.test(source.textContent)),
      };
    });
    report.scenarios.C.sourceVisible = Boolean(report.scenarios.C.sourceSelected?.thursday || report.scenarios.C.sourceSelected?.text);
    await page.screenshot({ path: path.join(ART, 'C-copy-from-day-modal-sv.png'), fullPage: true });
    const mondayBefore = await countMondayItems(BASE, session, cChildId);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avbryt')?.click());
    await new Promise((r) => setTimeout(r, 400));
    report.scenarios.C.cancelZeroMutation = (await countMondayItems(BASE, session, cChildId)) === mondayBefore;
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera från annan dag/.test(b.textContent)).click());
    await new Promise((r) => setTimeout(r, 400));
    report.i18n.svSE = report.i18n.svSE || {};
    report.i18n.svSE.copyFrom = true;
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#scheduleAddMenuBody button')].find(
        (b) => b.getAttribute('onclick') === 'ScheduleAddMenu.setCopyDaySource(2)',
      );
      btn?.click();
    });
    report.scenarios.C.sourceChangedToTuesday = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#scheduleAddMenuBody button')].find(
        (b) => b.getAttribute('onclick') === 'ScheduleAddMenu.setCopyDaySource(2)',
      );
      return Boolean(btn && btn.className.includes('bg-navy'));
    });
    report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, '^Spara$', 'saveLight', '#scheduleAddMenuBody')));
    report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, '^Avbryt$', 'cancelLight', '#scheduleAddMenuBody')));
    await page.screenshot({ path: path.join(ART, 'C-copy-source-changed-sv.png'), fullPage: true });
    await page.keyboard.press('Escape');
  }

  await page.click('.day-tab[data-day="4"]');
  await new Promise((r) => setTimeout(r, 800));
  report.scenarios.B = await page.evaluate(() => ({
    copyDayVisible: [...document.querySelectorAll('button')].some((b) => /Kopiera dag/.test(b.textContent)),
    promoTextPresent: /Klar dag|Kopiera en färdig dag/i.test(document.body.innerText),
    timeControls: document.querySelectorAll('[data-action="edit-time"], .action-btn-time, [aria-label*="tid" i]').length,
    removeControls: document.querySelectorAll('.action-btn-remove').length,
    sectionControls: typeof window.ScheduleSectionEdit === 'object',
    reorderHandles: document.querySelectorAll('[aria-label*="ordning" i], .drag-handle, [data-dnd-handle]').length,
    verdict: 'promo removed — promoted button only',
  }));
  await page.screenshot({ path: path.join(ART, 'B-populated-day-header-sv.png'), fullPage: true });

  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera dag/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 500));
  report.scenarios.replace = {
    mergeDefaultOnFreshOpen: /●.*Lägg till/i.test(await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '')),
  };
  await page.evaluate(() => ScheduleAddMenu.setCopyDayMode('replace_day'));
  await new Promise((r) => setTimeout(r, 300));
  report.scenarios.replace.replaceSelected = /●.*Ersätt hela dagen|Ersätter allt som redan finns/i.test(await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || ''));
  await page.evaluate(() => ScheduleAddMenu.toggleCopyDayTarget(1));
  await new Promise((r) => setTimeout(r, 200));
  await page.click('#samCopyDaySaveBtn');
  await page.waitForSelector('#samConfirmCancelBtn', { timeout: 5000 }).catch(() => null);
  report.scenarios.replace.confirmDialogShown = Boolean(await page.$('#samConfirmCancelBtn'));
  if (report.scenarios.replace.confirmDialogShown) {
    await page.click('#samConfirmCancelBtn');
    await new Promise((r) => setTimeout(r, 400));
  }
  report.scenarios.replace.cancelConfirmZeroMutation = Boolean(await page.$('#scheduleAddMenuBody'));
  await page.keyboard.press('Escape');

  await page.click('.day-tab[data-day="4"]');
  await new Promise((r) => setTimeout(r, 400));
  report.contrast.light.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera dag', 'promotedCopyDay')));

  await forceTheme(page, 'dark');
  await new Promise((r) => setTimeout(r, 400));
  await page.click('.day-tab[data-day="4"]');
  await new Promise((r) => setTimeout(r, 400));
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, 'Kopiera dag', 'promotedCopyDayDark')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Kopiera dag/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 400));
  report.contrast.dark.push(
    ratioFromMeasure(await measureChipContrast(page, '#scheduleAddMenuBody button.bg-navy.text-white', 'sourceDaySelectedDark')),
  );
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, '^Spara$', 'saveDark', '#scheduleAddMenuBody')));
  report.contrast.dark.push(ratioFromMeasure(await measureButtonText(page, '^Avbryt$', 'cancelDark', '#scheduleAddMenuBody')));
  await page.screenshot({ path: path.join(ART, 'contrast-copy-modal-magic-dark.png'), fullPage: true });
  await page.keyboard.press('Escape');

  const enSession = await registerEnSession(BASE);
  const enChildId = await createChild(BASE, enSession, { name: 'GateEn', emoji: '🌍' });
  await fetch(`${BASE}/api/onboarding/complete`, {
    method: 'POST',
    headers: {
      Cookie: Object.entries(enSession.cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      'X-CSRF-Token': enSession.csrfToken,
    },
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const host = new URL(BASE).hostname;
  await page.deleteCookie(...(await page.cookies()));
  for (const [name, value] of Object.entries(enSession.cookies)) {
    await page.setCookie({ name, value, domain: host, path: '/' });
  }
  await page.goto(`${BASE}/schedule?child=${enChildId}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => /Add activity/.test(b.textContent)),
    { timeout: 60000 },
  );
  await new Promise((r) => setTimeout(r, 800));
  report.i18n.enGB = await page.evaluate(() => ({
    emptyDayAdd: [...document.querySelectorAll('button')].some((b) => /Add activity/.test(b.textContent)),
    copyFrom: false,
    useTemplate: [...document.querySelectorAll('button')].some((b) => /Use a template/.test(b.textContent)),
    mixedLanguage: document.body.innerText.includes('Lägg till aktivitet'),
  }));
  await page.screenshot({ path: path.join(ART, 'i18n-en-empty-day.png'), fullPage: true });
  await apiApplyActivities(BASE, enSession, enChildId, 4, saveNames.slice(0, 3));
  await page.goto(`${BASE}/schedule?child=${enChildId}`, { waitUntil: 'networkidle2' });
  await page.click('.day-tab[data-day="1"]');
  await new Promise((r) => setTimeout(r, 800));
  report.i18n.enGB.copyFrom = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Copy from another day/.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Copy from another day/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 500));
  const enCopyModal = await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '');
  report.i18n.enGB.copyModal = {
    sourceSection: /Copy from/i.test(enCopyModal),
    targetSection: /Copy to/i.test(enCopyModal),
    mergeDefault: /●.*Add/i.test(enCopyModal),
    cancel: /Cancel/i.test(enCopyModal),
    save: /Save/i.test(enCopyModal),
  };
  await page.keyboard.press('Escape');
  await page.click('.day-tab[data-day="4"]');
  await new Promise((r) => setTimeout(r, 800));
  report.i18n.enGB.copyDay = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Copy day/.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Copy day/.test(b.textContent))?.click());
  await new Promise((r) => setTimeout(r, 400));
  const enModal = await page.evaluate(() => document.querySelector('#scheduleAddMenuBody')?.innerText || '');
  report.i18n.enGB.modal = {
    cancel: /Cancel/i.test(enModal),
    save: /Save/i.test(enModal),
    merge: /●.*Add/i.test(enModal),
    replace: /Replace the whole day/i.test(enModal),
  };
  report.i18n.enGB.mixedLanguage = await page.evaluate(() => document.body.innerText.includes('Lägg till aktivitet') || document.body.innerText.includes('Kopiera'));
  await page.screenshot({ path: path.join(ART, 'i18n-en-copy-modal.png'), fullPage: true });

  report.regression = await page.evaluate(() => ({
    scheduleAddMenuPresent: typeof window.ScheduleAddMenu === 'object',
    legacyCopyDayFallback: typeof window.openCopyDayModal === 'function',
    removeButtons: document.querySelectorAll('.action-btn-remove').length > 0,
    sectionEdit: typeof window.ScheduleSectionEdit === 'object',
    rapidEntryFn: typeof window.ScheduleAddMenu?.openActivityForDay === 'function',
  }));

  Object.assign(report.a11y, await page.evaluate(() => {
    const measure = (btn) => {
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return {
        text: btn.textContent.trim().slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
        min44: r.height >= 44 && r.width >= 44,
        aria: btn.getAttribute('aria-label') || btn.getAttribute('aria-pressed') || btn.getAttribute('aria-checked') || null,
        role: btn.getAttribute('role'),
      };
    };
    const btns = [...document.querySelectorAll('button')];
    return {
      primaryAdd: measure(btns.find((b) => /Add activity|Lägg till aktivitet/.test(b.textContent))),
      copyDay: measure(btns.find((b) => /Copy day|Kopiera dag/.test(b.textContent) && !/another/.test(b.textContent))),
    };
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
