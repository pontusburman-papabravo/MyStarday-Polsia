/**
 * Röktest mystarday.se — synlig browser (Desktop) + video/skärmdumpar.
 * Kör: DISPLAY=:1 node scripts/smoke-mystarday-desktop.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://mystarday.se';
const PARENT_EMAIL = process.env.SMOKE_PARENT_EMAIL || 'pontus@burman.cc';
const PARENT_PASSWORD = process.env.SMOKE_PARENT_PASSWORD || 'Kalle001!';
const CHILD_PIN = process.env.SMOKE_CHILD_PIN || '1112';
const CHILD_NAME = 'Astrid';

const ARTIFACTS = '/opt/cursor/artifacts/smoke-mystarday-desktop';
const VIDEO_DIR = path.join(ARTIFACTS, 'video');
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const HEADLESS = process.env.HEADLESS === '1';
const SLOW_MO = Number(process.env.SLOW_MO || 400);

async function shot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 4000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(600);
  }
}

async function main() {
  console.log(`Artifacts: ${ARTIFACTS}`);
  console.log(`Headless: ${HEADLESS}, slowMo: ${SLOW_MO}ms, DISPLAY: ${process.env.DISPLAY || '(default)'}`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const context = await browser.newContext({
    locale: 'sv-SE',
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  try {
    console.log('\n1. Health + startsida');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await shot(page, '01-home');
    await page.waitForTimeout(1500);

    console.log('\n2. Förälder — inloggning');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await acceptCookies(page);
    await page.fill('#email', PARENT_EMAIL);
    await page.fill('#password', PARENT_PASSWORD);
    await shot(page, '02-login-filled');
    await page.click('#submitBtn');
    await page.waitForTimeout(4000);
    await shot(page, '03-after-login');

    const me = await page.evaluate(async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      return r.ok ? await r.json() : null;
    });
    if (!me?.email) throw new Error('Förälder inloggad men /api/auth/me misslyckades');
    console.log(`   Inloggad som: ${me.email}`);

    const astrid = (me.children || []).find((c) =>
      c.name?.toLowerCase() === CHILD_NAME.toLowerCase()
    );
    if (!astrid) {
      throw new Error(`Hittade inte ${CHILD_NAME} bland barn: ${(me.children || []).map((c) => c.name).join(', ')}`);
    }
    console.log(`   Barn: ${astrid.name} (username: ${astrid.username})`);

    console.log('\n3. Föräldradashboard');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await shot(page, '04-dashboard');
    await page.waitForTimeout(2000);

    console.log('\n4. Barn — PIN-inloggning');
    await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await page.fill('#username', astrid.username);
    await page.fill('#pin', CHILD_PIN);
    await shot(page, '05-child-login-filled');
    await page.click('#childLoginForm button[type="submit"]');
    await page.waitForTimeout(5000);
    await shot(page, '06-child-view');

    console.log('\n5. Daily-log API (v131-fix)');
    const dailyLog = await page.evaluate(async () => {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
      const r = await fetch(`/api/me/daily-log?date=${today}`, { credentials: 'include' });
      const body = await r.json().catch(() => ({}));
      return { status: r.status, itemCount: body.items?.length ?? null, error: body.error };
    });
    if (dailyLog.status !== 200) {
      throw new Error(`GET /api/me/daily-log → ${dailyLog.status} ${dailyLog.error || ''}`);
    }
    console.log(`   daily-log OK — ${dailyLog.itemCount} aktiviteter idag`);

    const bodyText = await page.textContent('body');
    if (/Hmm|något gick fel|Något gick fel/i.test(bodyText || '')) {
      await shot(page, '07-child-error-banner');
      throw new Error('Barnvy visar felmeddelande i UI');
    }
    console.log('   Barnvy: ingen felbanner');

    await page.waitForTimeout(3000);
    await shot(page, '08-child-final');
    console.log('\n✓ Röktest klart — grönt');
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
    await browser.close();
    console.log(`\nVideo/sparade under: ${VIDEO_DIR}`);
    console.log(`Skärmdumpar: ${ARTIFACTS}`);
  }
}

main().catch((err) => {
  console.error('\n✗ Röktest misslyckades:', err.message);
  process.exit(1);
});
