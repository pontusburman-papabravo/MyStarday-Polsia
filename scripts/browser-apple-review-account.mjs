/**
 * Browser E2E: Apple Review account on mystarday.se
 * - Registers review@mystarday.se if missing
 * - Completes onboarding (Anna, 2018-09-08, skola + helg, PIN 4455)
 * - Verifies parent dashboard + child PIN login
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://mystarday.se';
const EMAIL = 'review@mystarday.se';
const PASSWORD = 'AppReview2026!';
const PARENT_NAME = 'Review Tester';
const CHILD_NAME = 'Anna';
const CHILD_BIRTHDAY = { year: '2018', month: '09', day: '08' };
const CHILD_PIN = '4455';

const ARTIFACTS = '/workspace/artifacts/apple-review-browser';
fs.mkdirSync(ARTIFACTS, { recursive: true });

async function screenshot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}

async function acceptCookies(page) {
  const accept = page.locator('#cb-banner .cb-btn-accept, button:has-text("Godkänn alla")');
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(500);
  }
}

async function registerIfNeeded(page) {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await acceptCookies(page);
  await screenshot(page, '01-register');

  const formVisible = await page.locator('#registerForm').isVisible().catch(() => false);
  if (!formVisible) {
    console.log('Register form not visible — trying login');
    return false;
  }

  await page.fill('#name', PARENT_NAME);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.check('#termsAccepted');

  await page.click('#submitBtn');
  await page.waitForTimeout(4000);

  const err = page.locator('#registerError:not(.hidden) #registerErrorText');
  if (await err.isVisible().catch(() => false)) {
    const msg = await err.textContent();
    console.log(`Register message: ${msg}`);
    if (msg && (msg.includes('finns redan') || msg.includes('already'))) {
      return false;
    }
    throw new Error(`Registration failed: ${msg}`);
  }

  try {
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
    await screenshot(page, '02-after-register');
    return true;
  } catch {
    console.log('No redirect after register — account likely exists');
    return false;
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await acceptCookies(page);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });
  await screenshot(page, '03-after-login');
}

async function completeOnboarding(page) {
  if (!page.url().includes('/onboarding')) {
    console.log('Not on onboarding — skip wizard');
    return;
  }

  await page.waitForSelector('#templateGroupGrid .day-pref-card', { timeout: 20000 });

  await page.fill('#childName', CHILD_NAME);
  await page.selectOption('#childBirthdayYear', CHILD_BIRTHDAY.year);
  await page.selectOption('#childBirthdayMonth', CHILD_BIRTHDAY.month);
  await page.selectOption('#childBirthdayDay', CHILD_BIRTHDAY.day);

  // Emoji 🌟
  await page.locator('.emoji-btn', { hasText: '🌟' }).first().click();

  // School schedule for ~7 years
  const skola = page.locator('.day-pref-card[data-pref="skola"]');
  if (await skola.count()) {
    await skola.click();
  } else {
    await page.locator('.day-pref-card').first().click();
  }

  await screenshot(page, '04-onboarding-step1');
  await page.click('#step1Btn');
  await page.waitForTimeout(2000);

  // Weekend modal
  const weekendYes = page.locator('#weekendYesBtn');
  if (await weekendYes.isVisible().catch(() => false)) {
    await weekendYes.click();
    await page.waitForTimeout(2000);
  }

  // Step 2 view type
  await page.click('#step2vBtn');
  await page.waitForTimeout(1500);

  // Step 3 confirm schedule
  await page.click('#step3Btn');
  await page.waitForTimeout(1500);

  // Step 4 rewards — pick first reward card
  await page.waitForSelector('#rewardGrid .reward-card', { timeout: 15000 });
  await page.locator('#rewardGrid .reward-card').first().click();
  await page.click('#step4Btn');
  await page.waitForTimeout(2000);

  // Step 5 — set PIN 4455
  await page.click('button:has-text("Välj egen PIN-kod")');
  await page.waitForSelector('#pinD1');
  for (let i = 0; i < 4; i++) {
    await page.fill(`#pinD${i + 1}`, CHILD_PIN[i]);
  }
  await page.click('#savePinBtn');
  await page.waitForTimeout(1500);
  await screenshot(page, '05-onboarding-pin');

  await page.click('button:has-text("Nästa →")');

  // Step 6 complete
  await page.click('#step6Btn');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  await screenshot(page, '06-dashboard');
}

async function verifyDashboard(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await page.waitForTimeout(4000);
  const body = await page.textContent('body');
  if (!body.includes('Anna')) {
    throw new Error('Dashboard does not show child Anna');
  }
  console.log('OK: Dashboard shows Anna');
  await screenshot(page, '07-dashboard-verify');
}

async function verifyChildPin(page) {
  await page.goto(`${BASE}/child-login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await screenshot(page, '08-child-login');

  const username = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const me = await res.json();
    return me.children?.[0]?.username || null;
  });

  if (!username) {
    // Log in as parent first from child-login redirect
    await page.goto(`${BASE}/login`);
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('#submitBtn');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
    await page.goto(`${BASE}/child-login`);
  }

  const uname = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const me = await res.json();
    return me.children?.[0]?.username;
  });

  console.log(`Child username: ${uname}`);

  await page.fill('#username', uname || 'lilla');
  await page.fill('#pin', CHILD_PIN);
  await page.click('#childLoginForm button[type="submit"]');
  await page.waitForTimeout(3000);
  await screenshot(page, '09-child-view');

  const url = page.url();
  if (!url.includes('child') && !url.includes('barn')) {
    console.log(`Child login URL: ${url} — check screenshot`);
  } else {
    console.log('OK: Child view reached');
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

  const registered = await registerIfNeeded(page);
  if (!registered) {
    await login(page);
  }

  await completeOnboarding(page);
  await verifyDashboard(page);
  await verifyChildPin(page);

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
