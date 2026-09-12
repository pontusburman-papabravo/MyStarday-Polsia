#!/usr/bin/env node
/**
 * P1 empty-row browser gate — 375×812 evidence for existing weekly_schedule row + zero items.
 * Local disposable account only (never prod).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { registerAndLogin } = require('../test/helpers/auth-session.js');
const db = require('../src/lib/db.js');

const BASE = process.env.P1_EMPTY_ROW_BASE_URL || 'http://127.0.0.1:3000';
const ART = process.env.SMOKE_ARTIFACTS || '/opt/cursor/artifacts/p1-empty-row-gate';

fs.mkdirSync(ART, { recursive: true });

async function seedFixture(childId) {
  const tplThu = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     SELECT family_id, 'TorsdagTest', '🍽', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
    [childId]
  );
  const tplMon = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     SELECT family_id, 'Middag', '🍽', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
    [childId]
  );

  const monSched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1, 1) RETURNING id`,
    [childId]
  );
  const thuSched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 4, 4) RETURNING id`,
    [childId]
  );
  await db.query(
    `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section, start_time, end_time)
     VALUES ($1, $2, 0, 'morgon', '08:00', '08:30')`,
    [thuSched.rows[0].id, tplThu.rows[0].id]
  );

  return { monScheduleId: monSched.rows[0].id, tplMonId: tplMon.rows[0].id };
}

async function countSchedules(childId, dow) {
  const res = await db.query(
    'SELECT count(*)::int AS n FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
    [childId, dow]
  );
  return res.rows[0].n;
}

async function countItems(scheduleId) {
  const res = await db.query(
    'SELECT count(*)::int AS n FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
    [scheduleId]
  );
  return res.rows[0].n;
}

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: '/' }));
}

async function main() {
  const report = { base: BASE, checks: {}, artifacts: [] };
  const session = await registerAndLogin(BASE, { name: 'P1 Empty Row Gate' });

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  for (const c of puppeteerCookies(session.cookies, BASE)) await page.setCookie(c);

  await page.evaluate(async () => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
    const r = await fetch('/api/onboarding/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
    });
    if (!r.ok) throw new Error(`onboarding failed ${r.status}`);
  });

  const childId = await page.evaluate(async () => {
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '';
    const r = await fetch('/api/children', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
      body: JSON.stringify({ name: 'P1Gate', emoji: '🧒', birthday: '2018-01-01' }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`create child failed ${r.status}`);
    return data.id;
  });

  const { monScheduleId } = await seedFixture(childId);

  await page.goto(`${BASE}/schedule?child=${childId}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#scheduleContent', { timeout: 30000 });

  // Select Monday (dow 1)
  await page.evaluate(() => {
    if (typeof selectDay === 'function') selectDay(1);
  });
  await page.waitForFunction(() => {
    const el = document.querySelector('#scheduleContent');
    return el && /Lägg till aktivitet|Add activity/i.test(el.textContent);
  }, { timeout: 15000 });

  const emptyState = await page.evaluate(() => {
    const root = document.querySelector('#scheduleContent');
    const text = root?.textContent || '';
    return {
      hasPrimary: /Lägg till aktivitet/i.test(text),
      hasTemplate: /Använd mall/i.test(text),
      hasCopyFrom: /Kopiera från annan dag/i.test(text),
      hasEditorCopyDay: /Kopiera dag/i.test(text) && !/Kopiera från annan dag/i.test(text.replace(/Kopiera från annan dag/g, '')),
      hasSectionAdd: /\+ Aktivitet/i.test(text),
    };
  });
  report.checks.empty_monday = emptyState;
  const emptyShot = path.join(ART, 'p1_empty_monday_row_zero_items.png');
  await page.screenshot({ path: emptyShot, fullPage: false });
  report.artifacts.push(emptyShot);

  // Tap primary Rapid Entry
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#scheduleContent button')].find((b) => /Lägg till aktivitet/i.test(b.textContent));
    btn?.click();
  });
  await page.waitForSelector('#scheduleAddMenuBody', { timeout: 10000 });
  report.checks.rapid_entry_open = await page.evaluate(() => !!document.querySelector('#scheduleAddMenuBody'));
  await page.evaluate(() => ScheduleAddMenu.close());

  // Add one activity via API path through UI search
  await page.evaluate(() => ScheduleAddMenu.openActivityForDay(1));
  await page.waitForSelector('#samActivitySearch', { timeout: 10000 });
  await page.type('#samActivitySearch', 'Middag', { delay: 20 });
  await page.waitForFunction(() => document.querySelector('#scheduleAddMenuBody'), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#scheduleAddMenuBody button')].find((b) => /Middag/i.test(b.textContent));
    row?.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => ScheduleAddMenu.submitActivity());
  await page.waitForFunction(() => {
    const t = document.querySelector('#scheduleContent')?.textContent || '';
    return /1 aktivitet|1 activity/i.test(t) || /Middag/i.test(t);
  }, { timeout: 15000 });

  const populated = await page.evaluate(() => {
    const root = document.querySelector('#scheduleContent');
    const text = root?.textContent || '';
    return {
      hasEditorCopyDay: /Kopiera dag/i.test(text),
      hasMiddag: /Middag/i.test(text),
      missingEmptyPrimary: !/Lägg till aktivitet/i.test(text),
    };
  });
  report.checks.after_one_activity = populated;
  const populatedShot = path.join(ART, 'p1_monday_one_activity_editor.png');
  await page.screenshot({ path: populatedShot, fullPage: false });
  report.artifacts.push(populatedShot);

  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(() => { if (typeof selectDay === 'function') selectDay(1); });
  await page.waitForFunction(() => /Middag/i.test(document.querySelector('#scheduleContent')?.textContent || ''), { timeout: 15000 });
  report.checks.refresh_persists = /Middag/i.test(await page.evaluate(() => document.querySelector('#scheduleContent')?.textContent || ''));

  const scheduleCount = await countSchedules(childId, 1);
  const itemCount = await countItems(monScheduleId);
  report.checks.no_duplicate_schedule = scheduleCount === 1;
  report.checks.item_count = itemCount;

  // Cleanup fixture rows for disposable account
  await db.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (SELECT id FROM weekly_schedule WHERE child_id = $1)', [childId]);
  await db.query('DELETE FROM weekly_schedule WHERE child_id = $1', [childId]);
  await db.query('DELETE FROM activity_template WHERE family_id IN (SELECT family_id FROM child WHERE id = $1)', [childId]);

  await browser.close();

  report.pass =
    emptyState.hasPrimary
    && emptyState.hasTemplate
    && emptyState.hasCopyFrom
    && !emptyState.hasSectionAdd
    && report.checks.rapid_entry_open
    && populated.hasMiddag
    && populated.hasEditorCopyDay
    && report.checks.no_duplicate_schedule
    && report.checks.refresh_persists;

  const out = path.join(ART, 'p1-empty-row-gate-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => db.pool.end());
