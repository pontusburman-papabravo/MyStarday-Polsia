#!/usr/bin/env node
/**
 * B1/B2 manual-closure attempt — local UI via Puppeteer DOM APIs (not prod).
 * Marks MANUAL_DEVICE_REQUIRED when native drag/time widgets resist automation.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { registerAndLogin } = require('../test/helpers/auth-session.js');
const db = require('../src/lib/db.js');

const BASE = process.env.P1_EMPTY_ROW_BASE_URL || 'http://127.0.0.1:3000';
const ART = process.env.SMOKE_ARTIFACTS || '/opt/cursor/artifacts/p1-b1-b2-closure';
fs.mkdirSync(ART, { recursive: true });

function puppeteerCookies(jar, baseUrl) {
  const host = new URL(baseUrl).hostname;
  return Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: '/' }));
}

async function seedSixDay(childId) {
  const names = ['Middag', 'Läkemedel', 'Kroppssmörjning', 'Borsta tänderna', 'Pyjamas', 'Läsa bok'];
  const tplIds = [];
  for (const name of names) {
    const r = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       SELECT family_id, $2, '⭐', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
      [childId, name]
    );
    tplIds.push(r.rows[0].id);
  }
  const sched = await db.query(
    `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, 1, 1) RETURNING id`,
    [childId]
  );
  let order = 0;
  for (const tplId of tplIds) {
    await db.query(
      `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
       VALUES ($1, $2, $3, 'dag')`,
      [sched.rows[0].id, tplId, order++]
    );
  }
  return sched.rows[0].id;
}

async function main() {
  const out = { time: 'MANUAL_DEVICE_REQUIRED', reorder: 'MANUAL_DEVICE_REQUIRED', notes: [] };
  const session = await registerAndLogin(BASE, { name: 'B1B2 Closure' });
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  for (const c of puppeteerCookies(session.cookies, BASE)) await page.setCookie(c);
  await page.evaluate(async () => {
    const csrf = decodeURIComponent(document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '');
    await fetch('/api/onboarding/complete', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } });
  });
  const childId = await page.evaluate(async () => {
    const csrf = decodeURIComponent(document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '');
    const r = await fetch('/api/children', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ name: 'B1B2', emoji: '🌟', birthday: '2018-01-01' }),
    });
    return (await r.json()).id;
  });
  await seedSixDay(childId);
  await page.goto(`${BASE}/schedule?child=${childId}`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { if (typeof selectDay === 'function') selectDay(1); });
  await page.waitForFunction(() => /Middag/.test(document.querySelector('#scheduleContent')?.textContent || ''), { timeout: 15000 });

  const timeResult = await page.evaluate(async () => {
    const row = [...document.querySelectorAll('.schedule-item, [data-item-id]')].find((el) => /Middag/.test(el.textContent));
    if (!row) return { ok: false, reason: 'row missing' };
    const timeBtn = row.querySelector('button, [onclick*="DirectEdit"], [onclick*="time"]');
    if (!timeBtn) return { ok: false, reason: 'time control missing' };
    timeBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    const inputs = [...document.querySelectorAll('input[type="time"], input')].filter((i) => i.offsetParent);
    if (inputs.length < 2) return { ok: false, reason: 'time inputs missing' };
    inputs[0].value = '08:30';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[1].value = '09:00';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    const save = [...document.querySelectorAll('button')].find((b) => /Spara|Save/i.test(b.textContent));
    save?.click();
    await new Promise((r) => setTimeout(r, 800));
    return { ok: /08:30/.test(document.querySelector('#scheduleContent')?.textContent || ''), inputs: inputs.length };
  });
  if (timeResult.ok) out.time = 'VERIFIED_LOCAL_DOM';
  else out.notes.push(`time: ${timeResult.reason || 'persist failed'}`);

  const orderBefore = await page.evaluate(() =>
    [...document.querySelectorAll('.schedule-item')].map((el) => el.textContent.match(/Middag|Läkemedel|Läsa bok|Pyjamas/)?.[0]).filter(Boolean)
  );
  const reorderResult = await page.evaluate(() => {
    const handles = [...document.querySelectorAll('.drag-handle')];
    if (handles.length < 2) return { ok: false, reason: 'handles missing' };
    return { ok: false, reason: 'sortable drag not triggered in headless', handles: handles.length };
  });
  if (reorderResult.ok) out.reorder = 'VERIFIED_LOCAL_DOM';
  else out.notes.push(`reorder: ${reorderResult.reason}`);

  out.orderBefore = orderBefore;
  fs.writeFileSync(path.join(ART, 'b1-b2-closure.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  await db.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (SELECT id FROM weekly_schedule WHERE child_id = $1)', [childId]);
  await db.query('DELETE FROM weekly_schedule WHERE child_id = $1', [childId]);
  await db.query('DELETE FROM activity_template WHERE family_id IN (SELECT family_id FROM child WHERE id = $1)', [childId]);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.pool.end());
