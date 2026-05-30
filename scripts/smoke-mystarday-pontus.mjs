/**
 * Röktest mystarday.se — förälder + barn + daily-log (v131-regression).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://mystarday.se';
const PARENT_EMAIL = 'pontus@burman.cc';
const PARENT_PASSWORD = 'Kalle001!';
const CHILD_DISPLAY = 'Astrid';
const CHILD_PIN = '1112';

const ARTIFACTS = '/opt/cursor/artifacts/smoke-mystarday-pontus';
fs.mkdirSync(ARTIFACTS, { recursive: true });

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`OK  ${name}${detail ? `: ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
}

async function screenshot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(400);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    locale: 'sv-SE',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  // Health + SW version hint
  const health = await page.evaluate(async () => {
    const r = await fetch('/health');
    return r.json();
  }).catch(() => null);
  if (health?.status === 'healthy') {
    pass('GET /health', `version ${health.version || '?'}`);
  } else {
    fail('GET /health', JSON.stringify(health));
  }

  const swHead = await page.goto(`${BASE}/sw.js`, { waitUntil: 'domcontentloaded' });
  const swText = await swHead.text();
  if (swText.includes('v131') || swText.includes('stjarndag-v131')) {
    pass('Service worker', 'v131');
  } else if (swText.includes('v130')) {
    fail('Service worker', 'still v130 on CDN — hard refresh may be needed');
  } else {
    fail('Service worker', 'unknown version');
  }

  // Parent login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptCookies(page);
  await page.fill('#email', PARENT_EMAIL);
  await page.fill('#password', PARENT_PASSWORD);
  await page.click('#submitBtn');
  await page.waitForTimeout(3000);

  const afterLoginUrl = page.url();
  if (afterLoginUrl.includes('dashboard') || afterLoginUrl.includes('onboarding') || afterLoginUrl.includes('family')) {
    pass('Parent login redirect', afterLoginUrl);
  } else {
    const errText = await page.locator('#loginError, .text-red-600, [role="alert"]').first().textContent().catch(() => '');
    fail('Parent login', `url=${afterLoginUrl} err=${errText?.slice(0, 120)}`);
    await screenshot(page, '01-login-fail');
  }
  await screenshot(page, '02-after-parent-login');

  const me = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    return { status: r.status, body: r.ok ? await r.json() : await r.text() };
  });

  if (me.status === 200 && me.body?.email) {
    pass('GET /api/auth/me', me.body.email);
  } else {
    fail('GET /api/auth/me', `status ${me.status}`);
  }

  const children = me.body?.children || [];
  const astrid = children.find(
    (c) => c.name?.toLowerCase() === CHILD_DISPLAY.toLowerCase() || c.username?.toLowerCase() === CHILD_DISPLAY.toLowerCase()
  );
  if (astrid) {
    pass('Child in family', `${astrid.name} (@${astrid.username})`);
  } else {
    fail('Child in family', `Astrid not in [${children.map((c) => c.name).join(', ')}]`);
  }

  // Dashboard shows Astrid
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const dashBody = await page.textContent('body');
  if (dashBody?.includes('Astrid')) {
    pass('Parent dashboard', 'shows Astrid');
  } else {
    fail('Parent dashboard', 'Astrid not visible in UI');
  }
  await screenshot(page, '03-dashboard');

  // Child login
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const username = astrid?.username || CHILD_DISPLAY.toLowerCase();
  await page.fill('#username', username);
  await page.fill('#pin', CHILD_PIN);

  const childLoginResp = page.waitForResponse(
    (r) => r.url().includes('/api/auth/child-login') && r.request().method() === 'POST',
    { timeout: 15000 }
  ).catch(() => null);

  await page.click('#childLoginForm button[type="submit"]');
  const resp = await childLoginResp;
  const childLoginStatus = resp ? resp.status() : null;
  await page.waitForTimeout(4000);

  if (childLoginStatus === 200) {
    pass('POST /api/auth/child-login', `username=${username}`);
  } else {
    const errEl = await page.locator('#childLoginError, .text-red-600').first().textContent().catch(() => '');
    fail('POST /api/auth/child-login', `status=${childLoginStatus} ui=${errEl?.slice(0, 80)}`);
    await screenshot(page, '04-child-login-fail');
  }

  const childUrl = page.url();
  if (childUrl.includes('child-dashboard') || childUrl.includes('child.html') || childUrl.includes('/v2/child')) {
    pass('Child view URL', childUrl);
  } else {
    fail('Child view URL', childUrl);
  }

  // Critical: daily-log must not 500
  const dailyLog = await page.evaluate(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
    const r = await fetch(`/api/me/daily-log?date=${today}`, { credentials: 'include' });
    let body;
    try {
      body = await r.json();
    } catch {
      body = await r.text();
    }
    return { status: r.status, body };
  });

  if (dailyLog.status === 200 && dailyLog.body?.items !== undefined) {
    const n = Array.isArray(dailyLog.body.items) ? dailyLog.body.items.length : 0;
    pass('GET /api/me/daily-log', `${n} items`);
  } else {
    fail('GET /api/me/daily-log', `status=${dailyLog.status} ${JSON.stringify(dailyLog.body)?.slice(0, 200)}`);
  }

  await page.waitForTimeout(3000);
  const childBody = await page.textContent('body');
  const hasErrorBanner =
    childBody?.includes('Hmm') ||
    childBody?.includes('något gick fel') ||
    childBody?.includes('Något gick fel');
  if (!hasErrorBanner) {
    pass('Child UI', 'no generic error banner');
  } else {
    fail('Child UI', 'shows error message');
    await screenshot(page, '05-child-error');
  }
  await screenshot(page, '06-child-dashboard');

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
