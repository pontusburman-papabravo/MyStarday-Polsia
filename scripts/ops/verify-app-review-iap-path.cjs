#!/usr/bin/env node
'use strict';

/**
 * Verify App Review IAP path against a live deployment (read-only HTTP checks).
 *
 * Usage:
 *   APP_REVIEW_IAP_EMAIL=... APP_REVIEW_IAP_PASSWORD=... \
 *     node scripts/ops/verify-app-review-iap-path.cjs
 *
 * Optional:
 *   VERIFY_BASE_URL env var (required unless SMOKE_BASE_URL is set) <!-- pragma: allowlist secret -->
 *   APP_REVIEW_EMAIL / APP_REVIEW_PASSWORD — complimentary account must stay blocked
 */

const BASE = (process.env.VERIFY_BASE_URL || process.env.SMOKE_BASE_URL || '').replace(/\/$/, '');
const IAP_EMAIL = (process.env.APP_REVIEW_IAP_EMAIL || '').trim().toLowerCase();
const IAP_PASSWORD = process.env.APP_REVIEW_IAP_PASSWORD || '';
const COMPLIMENTARY_EMAIL = (process.env.APP_REVIEW_EMAIL || '').trim().toLowerCase();
const COMPLIMENTARY_PASSWORD = process.env.APP_REVIEW_PASSWORD || '';

function jar() {
  const cookies = new Map();
  return {
    store(res) {
      for (const raw of res.headers.getSetCookie?.() || []) {
        const part = raw.split(';')[0];
        const i = part.indexOf('=');
        if (i > 0) cookies.set(part.slice(0, i), part.slice(i + 1));
      }
    },
    header() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  const cj = jar();
  cj.store(res);
  return { ok: res.ok, status: res.status, body, cookies: cj.header() };
}

async function getJson(path, cookies) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookies } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function assertCheck(name, pass, detail) {
  return { name, pass, detail };
}

async function verifyAccount(label, email, password, expect) {
  const checks = [];
  if (!email || !password) {
    checks.push(assertCheck(`${label}: credentials`, false, 'missing email or password env'));
    return checks;
  }

  const loginResult = await login(email, password);
  checks.push(assertCheck(`${label}: login`, loginResult.ok, `status ${loginResult.status}`));
  if (!loginResult.ok) return checks;

  const status = await getJson('/api/subscription/status', loginResult.cookies);
  checks.push(assertCheck(`${label}: subscription/status`, status.ok, `status ${status.status}`));
  if (!status.ok) return checks;

  const s = status.body;
  checks.push(assertCheck(
    `${label}: subscription_ui_visible`,
    s.subscription_ui_visible === expect.subscription_ui_visible,
    JSON.stringify(s.subscription_ui_visible)
  ));
  checks.push(assertCheck(
    `${label}: native_purchase_eligible`,
    s.native_purchase_eligible === expect.native_purchase_eligible,
    JSON.stringify(s.native_purchase_eligible)
  ));

  const iap = await getJson('/api/iap/config?platform=ios', loginResult.cookies);
  checks.push(assertCheck(`${label}: iap/config`, iap.ok, `status ${iap.status}`));
  if (iap.ok) {
    checks.push(assertCheck(
      `${label}: nativePurchasesEnabled`,
      iap.body.nativePurchasesEnabled === expect.nativePurchasesEnabled,
      JSON.stringify(iap.body.nativePurchasesEnabled)
    ));
    checks.push(assertCheck(
      `${label}: apiKey present`,
      expect.apiKeyPresent ? !!iap.body.apiKey : !iap.body.apiKey,
      iap.body.apiKey ? 'present' : 'null'
    ));
    if (expect.products) {
      checks.push(assertCheck(
        `${label}: monthly product id`,
        typeof iap.body.products?.monthly === 'string' && iap.body.products.monthly.endsWith('.subscription.monthly'),
        iap.body.products?.monthly || 'missing'
      ));
      checks.push(assertCheck(
        `${label}: yearly product id`,
        typeof iap.body.products?.yearly === 'string' && iap.body.products.yearly.includes('.subscription.yearly'),
        iap.body.products?.yearly || 'missing'
      ));
    }
  }

  return checks;
}

async function main() {
  if (!BASE) {
    console.error(JSON.stringify({ ok: false, error: 'Set VERIFY_BASE_URL or SMOKE_BASE_URL' }));
    process.exit(2);
  }
  const allChecks = [];

  allChecks.push(...await verifyAccount('iap_review', IAP_EMAIL, IAP_PASSWORD, {
    subscription_ui_visible: true,
    native_purchase_eligible: true,
    nativePurchasesEnabled: true,
    apiKeyPresent: true,
    products: true,
  }));

  if (COMPLIMENTARY_EMAIL && COMPLIMENTARY_PASSWORD) {
    allChecks.push(...await verifyAccount('complimentary_review', COMPLIMENTARY_EMAIL, COMPLIMENTARY_PASSWORD, {
      subscription_ui_visible: true,
      native_purchase_eligible: false,
      nativePurchasesEnabled: false,
      apiKeyPresent: false,
      products: false,
    }));
  }

  const failed = allChecks.filter((c) => !c.pass);
  const report = {
    base_url: BASE,
    ok: failed.length === 0,
    checks: allChecks,
    navigation_for_apple: [
      'Launch the app on iPhone (build under review).',
      'Sign in with the IAP review parent account (APP_REVIEW_IAP_EMAIL — not the complimentary review account).',
      'Tap Inställningar (Settings) in the bottom navigation.',
      'Tap Premium.',
      'Tap Aktivera Premium / View subscriptions.',
      'On the subscription screen, select Premium Yearly or Premium Monthly, then tap Fortsätt.',
      'Apple sandbox purchase sheet opens (no real charge). Restore Purchases is also available on that screen.',
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
