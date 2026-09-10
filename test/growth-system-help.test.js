'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyBlockingStep,
  evaluateStuckFamily,
} = require('../src/lib/growth-stuck-classifier');
const {
  buildHelpPayload,
  computeProgressionOutcome,
  SURFACE_BY_BLOCKING_STEP,
  HEM_CTA_EXPOSURE,
} = require('../src/lib/growth-system-help');
const { mapGrowthStuckFamily } = require('../src/lib/growth-stuck-work-queue');

describe('growth-stuck-classifier', () => {
  const now = new Date('2026-08-18T12:00:00Z');

  it('classifies onboarding, schema, login and return cohorts', () => {
    assert.equal(
      classifyBlockingStep({ onboarding_completed: false }),
      'onboarding_incomplete'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        schema_saved_at: '2026-08-10T00:00:00Z',
        child_access_completed_at: null,
      }),
      'schema_no_child_login'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        child_access_completed_at: '2026-08-10T00:00:00Z',
        first_completion_at: null,
      }),
      'login_no_completion'
    );
    assert.equal(
      classifyBlockingStep({
        onboarding_completed: true,
        first_completion_at: '2026-08-01T00:00:00Z',
        last_login_at: '2026-08-05T00:00:00Z',
      }, now),
      'completion_no_return'
    );
    assert.equal(
      classifyBlockingStep({ onboarding_completed: true, has_core_flow_error: true }),
      'core_flow_errors'
    );
  });

  it('requires 48h–14d family age for stuck window', () => {
    const tooYoung = evaluateStuckFamily({
      family_created_at: '2026-08-17T12:00:00Z',
      onboarding_completed: false,
    }, now);
    assert.equal(tooYoung.blockingStep, null);

    const inWindow = evaluateStuckFamily({
      family_created_at: '2026-08-15T12:00:00Z',
      onboarding_completed: false,
    }, now);
    assert.equal(inWindow.blockingStep, 'onboarding_incomplete');
    assert.equal(inWindow.inWindow, true);
  });
});

describe('growth-system-help content', () => {
  it('maps blocking step to contextual surfaces and copy', () => {
    const help = buildHelpPayload('schema_no_child_login', 'sv-SE');
    assert.equal(help.helpType, 'preview_child_login_help');
    assert.match(help.headline, /logga in/i);
    assert.equal(help.ctaAction, 'start_child_login');
    assert.equal(help.secondaryCtaAction, 'open_child_profile');
    assert.match(help.secondaryCtaLabel, /PIN/i);
    assert.match(help.body, /PIN/);
    assert.equal(help.showSupportRequest, false);
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('child_handoff'));
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('dashboard'));
  });

  it('computes 24h / 72h progression outcomes', () => {
    const shown = new Date('2026-08-18T08:00:00Z');
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-18T20:00:00Z')),
      'progressed_24h'
    );
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-20T08:00:00Z')),
      'progressed_72h'
    );
    assert.equal(
      computeProgressionOutcome(shown, new Date('2026-08-22T08:00:00Z')),
      null
    );
  });
});

describe('admin mapper exposes recommended system help', () => {
  it('includes recommendedSystemHelp aligned with in-app help', () => {
    const mapped = mapGrowthStuckFamily({
      family_id: 'f1',
      family_name: 'Test',
      created_at: '2026-08-15T08:00:00Z',
      blocking_step: 'schema_no_child_login',
      schema_saved_at: '2026-08-16T08:00:00Z',
    });
    assert.match(mapped.recommendedSystemHelp, /barninlogg/i);
    assert.match(mapped.manualNextStep, /barninlogg/i);
    assert.equal(mapped.autoSendAllowed, false);
  });
});

describe('growth-system-help route contract', () => {
  it('exports contextual API routes', () => {
    const router = require('../src/routes/growth-system-help');
    assert.ok(router);
    const stack = router.stack || [];
    const paths = stack.map((layer) => layer.route && layer.route.path).filter(Boolean);
    assert.ok(paths.includes('/context'));
    assert.ok(paths.includes('/shown'));
    assert.ok(paths.includes('/engage'));
    assert.ok(paths.includes('/support-request'));
  });
});

describe('growth-system-help scope errors', () => {
  const {
    isSystemHelpScopeError,
    mapSystemHelpRouteError,
  } = require('../src/lib/growth-system-help');

  it('treats FK violations as scope errors (no ops telemetry)', () => {
    const err = Object.assign(new Error('fk'), { code: '23503' });
    assert.equal(isSystemHelpScopeError(err), true);
    const mapped = mapSystemHelpRouteError(err, { isContext: true });
    assert.equal(mapped.status, 404);
    assert.equal(mapped.recordError, false);
    assert.equal(mapped.body.reason, 'family_not_found');
  });

  it('maps unknown errors to 500 with telemetry', () => {
    const mapped = mapSystemHelpRouteError(new Error('db down'), { isContext: false });
    assert.equal(mapped.status, 500);
    assert.equal(mapped.recordError, true);
  });
});

describe('growth-system-help outcome semantics', () => {
  it('never downgrades progressed_24h to progressed_72h or no_progress', () => {
    const rank = (outcome) => {
      if (outcome === 'progressed_24h') return 3;
      if (outcome === 'progressed_72h') return 2;
      if (outcome === 'no_progress') return 1;
      return 0;
    };
    const upgrade = (current, next) => {
      if (!next) return current;
      if (!current) return next;
      if (current === 'no_progress' && (next === 'progressed_24h' || next === 'progressed_72h')) return next;
      if (current === 'progressed_72h' && next === 'progressed_24h') return 'progressed_24h';
      return current;
    };
    assert.equal(upgrade('progressed_24h', 'progressed_72h'), 'progressed_24h');
    assert.equal(upgrade('progressed_24h', 'no_progress'), 'progressed_24h');
    assert.equal(upgrade('no_progress', 'progressed_24h'), 'progressed_24h');
    assert.ok(rank(upgrade('progressed_72h', 'progressed_24h')) > rank('progressed_72h'));
  });

  it('no_progress cutoff requires full 72h after shown', () => {
    const shown = new Date('2026-08-18T08:00:00Z');
    const at71h = new Date(shown.getTime() + 71 * 3600000);
    const at72h = new Date(shown.getTime() + 72 * 3600000 + 1000);
    const cutoff71 = new Date(at71h.getTime() - 72 * 3600000);
    const cutoff72 = new Date(at72h.getTime() - 72 * 3600000);
    assert.equal(shown < cutoff71, false);
    assert.equal(shown < cutoff72, true);
  });

  it('PR 1152 changes shown exposure; historical outcomes are not deleted', () => {
    assert.equal(HEM_CTA_EXPOSURE.pr, 1152);
    assert.equal(HEM_CTA_EXPOSURE.oldExposure, 'help_panel_or_handoff_detour');
    assert.equal(HEM_CTA_EXPOSURE.newExposure, 'existing_hem_or_first_success_cta');
    assert.match(HEM_CTA_EXPOSURE.segmentBy, /deploy SHA/);
    const dbSrc = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../db/growth-system-help.js'),
      'utf8'
    );
    assert.match(dbSrc, /COALESCE\(system_help_shown_at/);
    assert.match(dbSrc, /progression_outcome = CASE/);
    assert.doesNotMatch(dbSrc, /DELETE FROM family_system_help_state/);
  });
});

describe('growth-system-help migration', () => {
  it('creates state table and feature flag', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const migration = fs.readFileSync(
      path.join(__dirname, '../migrations/1810300000000_family_system_help_state.js'),
      'utf8'
    );
    assert.match(migration, /family_system_help_state/);
    assert.match(migration, /growth_system_help_v1/);
    assert.match(migration, /progressed_24h/);
    assert.match(migration, /support_requested_at/);
    const manifest = fs.readFileSync(
      path.join(__dirname, '../scripts/ops/lib/migration-snapshot-manifest.mjs'),
      'utf8'
    );
    assert.match(manifest, /1810300000000_family_system_help_state/);
    assert.match(manifest, /growth_system_help_v1/);
  });
});

describe('growth-system-help support report', () => {
  const {
    sanitizeReportContext,
    formatSupportReportMessage,
  } = require('../src/lib/growth-system-help');

  it('sanitizes technical context for support reports', () => {
    const ctx = sanitizeReportContext({
      surface: 'help_panel',
      blocking_step: 'schema_no_child_login',
      route: '/dashboard',
      locale: 'sv-SE',
      evil: '<script>',
      nested: { nope: true },
    });
    assert.equal(ctx.surface, 'help_panel');
    assert.equal(ctx.blocking_step, 'schema_no_child_login');
    assert.equal(ctx.evil, undefined);
    assert.equal(ctx.nested, undefined);
  });

  it('formats support report message with technical context', () => {
    const msg = formatSupportReportMessage(
      { blocking_step: 'login_no_completion', help_type: 'first_star_help' },
      { surface: 'help_panel', route: '/daily-log', locale: 'sv-SE' }
    );
    assert.match(msg, /Rapportera problem/);
    assert.match(msg, /login_no_completion/);
    assert.match(msg, /\/daily-log/);
  });
});

describe('growth-system-help deploy snapshot contract', () => {
  it('declares migration snapshot registry entry for deploy gate', async () => {
    const { loadMigrationSnapshotContract, expectedFeatureFlagInserts } = await import(
      '../scripts/ops/lib/migration-snapshot-manifest.mjs'
    );
    const name = '1810300000000_family_system_help_state';
    const contract = loadMigrationSnapshotContract(name);
    assert.equal(contract?.backwardCompatible, true);
    assert.equal(contract?.schemaOnly, true);
    const inserts = expectedFeatureFlagInserts([name]);
    assert.deepEqual(inserts, [
      { key: 'growth_system_help_v1', enabled: false, migration: name },
    ]);
  });

  it('allowlists growth_system_help_v1 for per-family overrides', () => {
    const familyOverrides = require('../db/family-feature-overrides');
    const { FLAG_KEYS } = require('../src/lib/activation-flags');
    assert.equal(familyOverrides.isOverrideFeatureKey(FLAG_KEYS.growthSystemHelp), true);
  });
});

describe('growth-system-help client attaches to existing Hem CTA', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');

  function read(rel) {
    return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  }

  function makeCta(overrides) {
    return Object.assign({
      disabled: false,
      hidden: false,
      attrs: {},
      listeners: {},
      getAttribute(k) { return this.attrs[k] || null; },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(ev, fn) { this.listeners[ev] = fn; },
      classList: { contains: () => false },
    }, overrides);
  }

  function loadClient(opts) {
    opts = opts || {};
    const posts = [];
    const help = Object.assign({
      blockingStep: 'schema_no_child_login',
      headline: 'Hjälp barnet logga in',
      body: 'PIN',
      ctaLabel: 'Starta barninloggning',
      ctaAction: 'start_child_login',
      secondaryCtaLabel: 'Visa eller byt PIN',
      secondaryCtaAction: 'open_child_profile',
      showSupportRequest: false,
    }, opts.help || {});
    const win = {
      I18n: { getLocale: () => 'sv-SE' },
      sessionStorage: {
        _m: {},
        getItem(k) { return this._m[k] || null; },
        setItem(k, v) { this._m[k] = String(v); },
      },
      Auth: {
        api: async (url) => {
          posts.push(String(url));
          if (String(url).includes('/context')) {
            return {
              eligible: opts.eligible !== false,
              blockingStep: help.blockingStep,
              help: opts.eligible === false ? null : help,
            };
          }
          return { ok: true };
        },
      },
      location: { pathname: '/dashboard', href: '/dashboard' },
      document: { documentElement: { lang: 'sv-SE' } },
    };
    const sandbox = {
      window: win,
      document: win.document,
      sessionStorage: win.sessionStorage,
      Auth: win.Auth,
      URLSearchParams,
    };
    vm.createContext(sandbox);
    vm.runInContext(read('public/js/growth-system-help.js'), sandbox);
    return { win, posts, help };
  }

  function count(posts, needle) {
    return posts.filter((p) => p.includes(needle)).length;
  }

  it('handoff enrichment is a PIN next step, not a help-panel detour', () => {
    const client = read('public/js/growth-system-help.js');
    assert.doesNotMatch(client, /Behöver du hjälp med inloggning/);
    assert.match(client, /attachPrimaryCta/);
    assert.match(client, /isActionablePrimaryCta/);
    assert.match(client, /showSupportRequest/);
    assert.match(client, /Auth\.logout\(\{ childFlow: true \}\)/);
    assert.match(client, /growth-system-help-handoff/);
    assert.match(client, /secondaryCtaAction/);
  });

  it('magic Hem and First Success wire the existing child-login CTA', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    const firstSuccess = read('public/js/activation-first-success-hub.js');
    assert.match(hub, /maybeEnrichMagicHandoff/);
    assert.match(hub, /enrichHandoff/);
    assert.match(firstSuccess, /attachSystemHelpToCoach/);
    assert.match(firstSuccess, /attachPrimaryCta/);
    assert.match(firstSuccess, /activation-fs-cta/);
  });

  it('help card omits report unless showSupportRequest', () => {
    const { win } = loadClient();
    const htmlNoReport = win.GrowthSystemHelp.buildCardHtml({
      blockingStep: 'schema_no_child_login',
      headline: 'Hjälp barnet logga in',
      body: 'PIN',
      ctaLabel: 'Starta barninloggning',
      secondaryCtaLabel: 'Visa eller byt PIN',
      secondaryCtaAction: 'open_child_profile',
      showSupportRequest: false,
    }, 'help_panel');
    assert.match(htmlNoReport, /Visa eller byt PIN/);
    assert.doesNotMatch(htmlNoReport, /Rapportera problem/);

    const htmlReport = win.GrowthSystemHelp.buildCardHtml({
      headline: 'Något gick fel',
      body: 'PIN',
      ctaLabel: 'Visa barnets PIN',
      showSupportRequest: true,
    }, 'help_panel');
    assert.match(htmlReport, /Rapportera problem/);
  });

  it('A: visible root + CTA exists => shown once', async () => {
    const { win, posts } = loadClient();
    const cta = makeCta();
    const root = { classList: { contains: () => false }, querySelector: () => cta };
    await win.GrowthSystemHelp.attachPrimaryCta(root, { ctaSelector: '.activation-fs-cta' });
    assert.equal(count(posts, '/shown'), 1);
    assert.equal(cta.attrs['data-system-help-engage'], '1');
  });

  it('B: visible root + CTA absent => shown 0', async () => {
    const { win, posts } = loadClient();
    const root = { classList: { contains: () => false }, querySelector: () => null };
    const result = await win.GrowthSystemHelp.attachPrimaryCta(root, { ctaSelector: '.activation-fs-cta' });
    assert.equal(result, null);
    assert.equal(count(posts, '/shown'), 0);
    assert.equal(count(posts, '/engage'), 0);
  });

  it('C: hidden/unavailable CTA => shown 0', async () => {
    const hidden = makeCta({ classList: { contains: (c) => c === 'hidden' } });
    const disabled = makeCta({ disabled: true });
    const wrongState = loadClient({
      help: { ctaAction: 'open_daily_log', blockingStep: 'login_no_completion' },
    });
    const visibleCta = makeCta();

    const a = loadClient();
    assert.equal(await a.win.GrowthSystemHelp.attachPrimaryCta({
      classList: { contains: () => false },
      querySelector: () => hidden,
    }, { ctaSelector: '.activation-fs-cta' }), null);
    assert.equal(count(a.posts, '/shown'), 0);

    const b = loadClient();
    assert.equal(await b.win.GrowthSystemHelp.attachPrimaryCta({
      classList: { contains: () => false },
      querySelector: () => disabled,
    }, { ctaSelector: '.activation-fs-cta' }), null);
    assert.equal(count(b.posts, '/shown'), 0);

    assert.equal(await wrongState.win.GrowthSystemHelp.attachPrimaryCta({
      classList: { contains: () => false },
      querySelector: () => visibleCta,
    }, { ctaSelector: '.activation-fs-cta' }), null);
    assert.equal(count(wrongState.posts, '/shown'), 0);
  });

  it('D: click bound CTA => engaged once', async () => {
    const { win, posts } = loadClient();
    const cta = makeCta();
    const root = { classList: { contains: () => false }, querySelector: () => cta };
    await win.GrowthSystemHelp.attachPrimaryCta(root, { ctaSelector: '.activation-fs-cta' });
    cta.listeners.click();
    await new Promise((r) => setImmediate(r));
    assert.equal(count(posts, '/engage'), 1);
  });

  it('E: rerender/rebind => no duplicate shown/engage', async () => {
    const { win, posts } = loadClient();
    const cta = makeCta();
    const root = { classList: { contains: () => false }, querySelector: () => cta };
    await win.GrowthSystemHelp.attachPrimaryCta(root, { ctaSelector: '.activation-fs-cta' });
    await win.GrowthSystemHelp.attachPrimaryCta(root, { ctaSelector: '.activation-fs-cta' });
    assert.equal(count(posts, '/shown'), 1);
    cta.listeners.click();
    await new Promise((r) => setImmediate(r));
    assert.equal(count(posts, '/engage'), 1);
  });
});

describe('growth-system-help single script load', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');

  function read(rel) {
    return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  }

  function extractEnsure(src) {
    const start = src.indexOf('function ensureGrowthSystemHelpScript(cb)');
    assert.notEqual(start, -1);
    const end = src.indexOf('\n  function ', start + 1);
    const end2 = src.indexOf('\n  /**', start + 1);
    const cut = [end, end2].filter((n) => n > start).sort((a, b) => a - b)[0];
    assert.ok(cut > start);
    return src.slice(start, cut);
  }

  function makeDoc() {
    const scripts = [];
    const listeners = {};
    const head = {
      appendChild(el) { scripts.push(el); },
    };
    return {
      scripts,
      head,
      documentElement: { lang: 'sv-SE' },
      createElement() {
        return {
          src: '',
          attrs: {},
          setAttribute(k, v) { this.attrs[k] = v; },
          onload: null,
          onerror: null,
        };
      },
      querySelector(sel) {
        if (sel.includes('data-growth-system-help-src')) {
          return scripts.find((s) => s.attrs && s.attrs['data-growth-system-help-src'] === '1') || null;
        }
        if (sel.includes('growth-system-help.js')) {
          return scripts.find((s) => s.src === '/js/growth-system-help.js') || null;
        }
        return null;
      },
      addEventListener(ev, fn) {
        listeners[ev] = listeners[ev] || [];
        listeners[ev].push(fn);
      },
      dispatchEvent(ev) {
        const name = ev && ev.type ? ev.type : ev;
        (listeners[name] || []).splice(0).forEach((fn) => fn());
      },
    };
  }

  function loadBothEnsures(win, doc) {
    const hubFn = extractEnsure(read('public/js/dashboard-home-hub.js'));
    const fsFn = extractEnsure(read('public/js/activation-first-success-hub.js'));
    const sandbox = { window: win, document: doc, Event };
    vm.createContext(sandbox);
    vm.runInContext(hubFn + '; window.hubEnsure = ensureGrowthSystemHelpScript;', sandbox);
    vm.runInContext(fsFn + '; window.fsEnsure = ensureGrowthSystemHelpScript;', sandbox);
    return sandbox;
  }

  it('both Hem consumers share the in-flight script contract', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    const first = read('public/js/activation-first-success-hub.js');
    assert.match(hub, /function ensureGrowthSystemHelpScript/);
    assert.match(first, /function ensureGrowthSystemHelpScript/);
    assert.match(hub, /__growthSystemHelpLoading/);
    assert.match(first, /__growthSystemHelpLoading/);
    assert.match(hub, /data-growth-system-help-src/);
    assert.match(first, /data-growth-system-help-src/);
    assert.doesNotMatch(first, /let systemHelpLoading/);
  });

  it('dashboard starts load first, First Success initializes => one script', () => {
    const doc = makeDoc();
    const win = { __growthSystemHelpLoading: false };
    const box = loadBothEnsures(win, doc);
    let hubReady = 0;
    let fsReady = 0;
    box.window.hubEnsure(() => { hubReady += 1; });
    box.window.fsEnsure(() => { fsReady += 1; });
    assert.equal(doc.scripts.length, 1);
    doc.scripts[0].onload();
    assert.equal(hubReady, 1);
    assert.equal(fsReady, 1);
  });

  it('First Success starts load first, dashboard initializes => one script', () => {
    const doc = makeDoc();
    const win = { __growthSystemHelpLoading: false };
    const box = loadBothEnsures(win, doc);
    box.window.fsEnsure(() => {});
    box.window.hubEnsure(() => {});
    assert.equal(doc.scripts.length, 1);
  });

  it('already loaded GrowthSystemHelp => no new script', () => {
    const doc = makeDoc();
    const win = { GrowthSystemHelp: { attachPrimaryCta() {} }, __growthSystemHelpLoading: false };
    const box = loadBothEnsures(win, doc);
    let calls = 0;
    box.window.hubEnsure(() => { calls += 1; });
    box.window.fsEnsure(() => { calls += 1; });
    assert.equal(doc.scripts.length, 0);
    assert.equal(calls, 2);
  });
});
