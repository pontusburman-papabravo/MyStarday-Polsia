#!/usr/bin/env node
'use strict';

/**
 * Read-only prod inspection for App Review IAP path (no secrets printed).
 * Usage (on VPS): cd $VPS_APP_PATH && source .env && node scripts/ops/inspect-app-review-iap-prod.cjs
 */

const db = require('../../src/lib/db');
const { getNativePurchaseEligibility } = require('../../src/lib/iap-native-purchase-gate');
const { resolveSubscriptionUiVisibility } = require('../../src/lib/subscription-ui-visibility');

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email.slice(0, 3)}***@${email.slice(at + 1)}`;
}

async function familySnapshot(familyId) {
  const fam = await db.query(
    'SELECT id, created_at, country_code, is_lifetime_free FROM family WHERE id = $1',
    [familyId]
  );
  const ents = await db.query(
    'SELECT entitlement_key, source, status FROM family_entitlements WHERE family_id = $1',
    [familyId]
  );
  const parents = await db.query(
    'SELECT email, name FROM parent WHERE family_id = $1 ORDER BY email',
    [familyId]
  );
  const eligibility = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });
  const vis = await resolveSubscriptionUiVisibility(familyId, { active: false });
  return {
    family: fam.rows[0] || null,
    entitlements: ents.rows,
    parents: parents.rows.map((p) => ({ email: maskEmail(p.email), name: p.name })),
    native_purchase_eligibility: eligibility,
    subscription_ui: vis,
  };
}

async function main() {
  const allowlist = String(process.env.REVENUECAT_SANDBOX_FAMILY_IDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const out = {
    billing_ui_disabled: process.env.BILLING_UI_DISABLED,
    sandbox_purchases_enabled: process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED,
    allowlist_count: allowlist.length,
    has_ios_public_key: !!(process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY || process.env.REVENUECAT_APPLE_PUBLIC_SDK_KEY),
    app_settings: null,
    allowlist_families: [],
    review_like_accounts: [],
  };

  const settings = await db.query(
    "SELECT key, value FROM app_settings WHERE key IN ('payment_enabled', 'payment_start_at')"
  );
  out.app_settings = settings.rows;

  for (const fid of allowlist) {
    out.allowlist_families.push(await familySnapshot(fid));
  }

  const review = await db.query(
    `SELECT p.family_id::text AS family_id, p.email
     FROM parent p
     WHERE LOWER(p.email) LIKE '%review%'
        OR LOWER(p.email) LIKE '%appstore%'
        OR LOWER(p.email) LIKE '%iap%'
     ORDER BY p.email
     LIMIT 20`
  );

  for (const row of review.rows) {
    const snap = await familySnapshot(row.family_id);
    out.review_like_accounts.push({
      email: maskEmail(row.email),
      on_sandbox_allowlist: allowlist.includes(row.family_id.toLowerCase()),
      ...snap,
    });
  }

  console.log(JSON.stringify(out, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
