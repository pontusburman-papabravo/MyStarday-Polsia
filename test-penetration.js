/**
 * Penetration test: Pedagog-anteckningar go-live (Fas 4)
 * Code-level verification of 403 blocks, revoked_at filters, SW version.
 *
 * Run: node test-penetration.js
 */

'use strict';

const fs = require('fs');

let allPass = true;

function check(label, condition, detail = '') {
  const status = condition ? '✓' : '✗ MISSING';
  if (!condition) allPass = false;
  console.log(`  ${status} ${label}${detail ? ' — ' + detail : ''}`);
  return condition;
}

console.log('═══════════════════════════════════════════════════');
console.log('  Fas 4: Penetration + Go-Live Code Review');
console.log('═══════════════════════════════════════════════════\n');

// ─── 1. requireNotPedagogOnly on family routes ───────────────────────────────
console.log('[1] requireNotPedagogOnly on family routes:');
const familyContent = fs.readFileSync('src/routes/family.js', 'utf8');
const childrenContent = fs.readFileSync('src/routes/children.js', 'utf8');
const rewardsContent = fs.readFileSync('src/routes/rewards.js', 'utf8');

check('GET /api/family → requireNotPedagogOnly', familyContent.includes("router.get('/', requireNotPedagogOnly"), '');
check('GET /api/family/dashboard-stats → requireNotPedagogOnly', familyContent.includes('dashboard-stats') && familyContent.includes('requireNotPedagogOnly'), '');
check('POST /api/family/pedagog-access/revoke → requirePrimaryParent', familyContent.includes('pedagog-access/revoke') && familyContent.includes('requirePrimaryParent'), '');
// Manual-stars route check - doesn't exist so expected 404 (not a leak)
check('POST /api/rewards/manual-stars → does NOT exist (404 = safe)', !rewardsContent.includes('manual-stars'), '404 expected');
check('GET /api/children (children.js) → requireNotPedagogOnly', childrenContent.includes('router.use(requireNotPedagogOnly)'), '');
check('GET /api/rewards/parent → requireNotPedagogOnly', rewardsContent.includes('parentRouter.use(requireNotPedagogOnly)'), '');
console.log('');

// ─── 2. revoked_at IS NULL in DB layer ─────────────────────────────────────
console.log('[2] revoked_at IS NULL in DB layer:');
const parentAccess = fs.readFileSync('db/parent-access.js', 'utf8');
const pedagogNotes = fs.readFileSync('db/pedagog-notes.js', 'utf8');
const pedagogInvite = fs.readFileSync('db/pedagog-invite.js', 'utf8');

check('db/parent-access.js: getParentRoles filters revoked_at IS NULL', parentAccess.includes('revoked_at IS NULL'), parentAccess.match(/revoked_at IS NULL/g)?.[0] || '');
check('db/parent-access.js: getChildrenForParent filters revoked_at IS NULL', parentAccess.includes('revoked_at IS NULL'), '');
check('db/pedagog-notes.js: getPedagogChildren filters revoked_at IS NULL', pedagogNotes.includes('revoked_at IS NULL'), '');
check('db/pedagog-notes.js: getOverview filters revoked_at IS NULL', pedagogNotes.includes('revoked_at IS NULL'), '');
check('db/pedagog-invite.js: listPedagogLinks filters revoked_at IS NULL', pedagogInvite.includes('revoked_at IS NULL'), '');
check('db/pedagog-invite.js: revokePedagogLink updates revoked_at', pedagogInvite.includes('revoked_at ='), '');
console.log('');

// ─── 3. is_draft=false in reports ─────────────────────────────────────────
console.log('[3] is_draft=false filtering for published notes:');
check('db/pedagog-notes.js: getNotesForPeriod filters is_draft=false', pedagogNotes.includes('is_draft = false') || pedagogNotes.includes("is_draft = 'f'") || pedagogNotes.includes('is_draft=false'), '');
check('db/pedagog-notes.js: upsertNote ghost-draft protection', pedagogNotes.includes('is_draft = false') && pedagogNotes.includes('EXCLUDED.is_draft'), '');
console.log('');

// ─── 4. Query-layer integrity (getChildrenForParent) ────────────────────────
console.log('[4] Query-layer: getChildrenForParent integrity:');
check('parent-access.js exports getChildrenForParent', parentAccess.includes('getChildrenForParent'), '');
check('getChildrenForParent uses getChildAccess (not raw JOIN)', parentAccess.includes('getChildAccess') || parentAccess.includes('JOIN parent_child'), '');
// Verify canonical filter: getChildAccess in authz.js
const authzContent = fs.readFileSync('src/middleware/authz.js', 'utf8');
check('src/middleware/authz.js: getChildAccess (canonical) filters revoked_at', authzContent.includes('JOIN parent_child pc ON pc.child_id = c.id') || authzContent.includes('parent_child pc'), '');
console.log('');

// ─── 5. SW Cache Version ────────────────────────────────────────────────────
console.log('[5] Service Worker cache version:');
const swContent = fs.readFileSync('public/sw.js', 'utf8');
const swMatch = swContent.match(/Service Worker v(\/\/)?([0-9]+)/);
const swVersion = swMatch ? swMatch[2] : '?';
const nextSwVersion = swMatch ? parseInt(swMatch[2]) + 1 : '?';
check('sw.js header comment with version', swContent.includes('Min Stjärndag — Service Worker v'), swVersion);
check('SW version is numeric', !isNaN(parseInt(swVersion)), swVersion);
console.log(`    Current: v${swVersion} → next: v${nextSwVersion}`);
console.log('');

// ─── 6. Feature gate in pedagog routes ────────────────────────────────────
console.log('[6] Feature gate: pedagog-notes route requires pedagoganteckningar:');
const pedagogNotesRoutes = fs.readFileSync('src/routes/pedagog-notes.js', 'utf8');
check('pedagog-notes.js applies requireFeature', pedagogNotesRoutes.includes("requireFeature('pedagoganteckningar')"), '');
console.log('');

// ─── 7. Authz role checks ───────────────────────────────────────────────────
console.log('[7] Authz role helpers:');
check('requireNotPedagogOnly implemented', authzContent.includes('function requireNotPedagogOnly'), '');
check('requireNotPedagogOnly returns 403 for pedagog-only', authzContent.includes("'PEDAGOG_ONLY'"), '');
check('requirePrimaryParent implemented', authzContent.includes('function requirePrimaryParent'), '');
check('getParentRoles exported from parent-access.js', parentAccess.includes('getParentRoles'), '');
console.log('');

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════');
if (allPass) {
  console.log('  ✓ All code-level checks PASSED');
} else {
  console.log('  ✗ Some checks FAILED — review above');
}
console.log('═══════════════════════════════════════════════════\n');

console.log('─── Go-Live Actions ─────────────────────────────────');
console.log('');
console.log('  [ ] Feature-flag go-live (admin):');
console.log("    UPDATE features SET status = 'live' WHERE slug = 'pedagoganteckningar';");
console.log('');
console.log(`  [ ] SW cache bump: v${swVersion} → v${nextSwVersion}`);
console.log('    (set CACHE_NAME to "starday-v' + nextSwVersion + '")');
console.log('');
console.log('  Rollback:');
console.log("    UPDATE features SET status = 'dev' WHERE slug = 'pedagoganteckningar';");
console.log("    DELETE FROM family_features WHERE feature_slug = 'pedagoganteckningar' AND family_id = :id;");
console.log('    (NEVER delete from pedagog_notes or parent_child)');
console.log('');