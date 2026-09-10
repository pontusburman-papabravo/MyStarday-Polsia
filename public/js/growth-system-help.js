/**
 * growth-system-help.js — contextual stuck-family help (no global banners).
 * Renders inside help panel and enriches existing handoff surfaces.
 */
(function () {
  'use strict';

  const SHOWN_SESSION_PREFIX = 'msd_system_help_shown_';

  function locale() {
    try {
      if (window.I18n && I18n.getLocale) return I18n.getLocale();
      if (document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
    } catch (_) {}
    return 'sv-SE';
  }

  function isEnglish() {
    return locale().indexOf('en') === 0;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function detectSurface() {
    const path = window.location.pathname || '';
    if (path.indexOf('/onboarding') === 0) return 'onboarding';
    if (path.indexOf('/child-login') === 0) return 'child_login';
    if (path.indexOf('/schedule') === 0) return 'schedule';
    if (path.indexOf('/daily-log') === 0) return 'daily_log';
    if (path === '/' || path.indexOf('/dashboard') === 0) return 'dashboard';
    if (path.indexOf('/child-profile') === 0 || path.indexOf('/settings') === 0) return 'settings_pin';
    return 'help_panel';
  }

  async function fetchContext(surface) {
    if (!window.Auth || !Auth.api) return null;
    const qs = new URLSearchParams();
    qs.set('surface', surface || detectSurface());
    qs.set('locale', locale());
    try {
      return await Auth.api('/api/growth/system-help/context?' + qs.toString());
    } catch (_) {
      return null;
    }
  }

  async function postJson(path, body) {
    if (!window.Auth || !Auth.api) return null;
    try {
      return await Auth.api(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
    } catch (_) {
      return null;
    }
  }

  function markShownSession(blockingStep) {
    try {
      sessionStorage.setItem(SHOWN_SESSION_PREFIX + blockingStep, String(Date.now()));
    } catch (_) {}
  }

  function wasShownSession(blockingStep) {
    try {
      return Boolean(sessionStorage.getItem(SHOWN_SESSION_PREFIX + blockingStep));
    } catch (_) {
      return false;
    }
  }

  async function recordShown(data) {
    if (!data || !data.blockingStep) return;
    if (wasShownSession(data.blockingStep)) return;
    markShownSession(data.blockingStep);
    await postJson('/api/growth/system-help/shown', {
      blocking_step: data.blockingStep,
    });
  }

  function runCtaAction(action) {
    switch (action) {
      case 'open_onboarding':
        window.location.href = '/onboarding';
        return;
      case 'start_child_login':
        if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
          DashboardChildHandoff.startChildLogin();
          return;
        }
        if (window.Auth && typeof Auth.logout === 'function') {
          Auth.logout({ childFlow: true });
          return;
        }
        window.location.href = '/child-login';
        return;
      case 'open_daily_log':
        window.location.href = '/daily-log';
        return;
      case 'open_schedule':
        window.location.href = '/schedule';
        return;
      case 'open_child_profile':
        window.location.href = '/settings#children';
        return;
      default:
        return;
    }
  }

  function buildTechnicalContext(surface, data) {
    const ctx = {
      surface: surface || detectSurface(),
      blocking_step: data && data.blockingStep,
      help_type: data && data.help && data.help.helpType,
      route: window.location.pathname || '',
      locale: locale(),
      timestamp: new Date().toISOString(),
    };
    try {
      if (window.Platform && Platform.getInfo) {
        const info = Platform.getInfo();
        if (info && info.platform) ctx.platform = String(info.platform);
      }
    } catch (_) {}
    try {
      if (navigator && navigator.userAgent) {
        ctx.user_agent = navigator.userAgent.slice(0, 500);
      }
    } catch (_) {}
    try {
      if (window.CACHE_NAME) ctx.sw_version = String(window.CACHE_NAME);
    } catch (_) {}
    return ctx;
  }

  function buildCardHtml(help, surface) {
    if (!help) return '';
    const reportLabel = isEnglish() ? 'Report a problem' : 'Rapportera problem';
    const secondary = help.secondaryCtaAction
      ? '<button type="button" class="growth-system-help-secondary mt-2 w-full min-h-[44px] text-sm text-indigo-700 underline">' +
        esc(help.secondaryCtaLabel) + '</button>'
      : '';
    const report = help.showSupportRequest
      ? '<button type="button" class="growth-system-help-report mt-2 w-full text-xs text-slate-500 underline">' +
        esc(reportLabel) + '</button>'
      : '';
    return (
      '<div class="help-journey-tip help-journey-tip--coach growth-system-help-card" ' +
      'data-blocking-step="' + esc(help.blockingStep || '') + '" data-surface="' + esc(surface) + '">' +
      '<p class="help-journey-tip-label">' + esc(isEnglish() ? 'Suggested help' : 'Föreslagen hjälp') + '</p>' +
      '<p class="help-journey-tip-headline">' + esc(help.headline) + '</p>' +
      '<p class="help-journey-tip-body">' + esc(help.body) + '</p>' +
      '<button type="button" class="help-journey-tip-cta growth-system-help-cta">' + esc(help.ctaLabel) + '</button>' +
      secondary +
      report +
      '</div>'
    );
  }

  function bindCard(mount, data, surface) {
    const card = mount.querySelector('.growth-system-help-card');
    if (!card) return;
    const cta = card.querySelector('.growth-system-help-cta');
    const secondary = card.querySelector('.growth-system-help-secondary');
    const report = card.querySelector('.growth-system-help-report');
    if (cta) {
      cta.addEventListener('click', async function () {
        await postJson('/api/growth/system-help/engage', {
          surface: surface,
          blocking_step: data.blockingStep,
          cta_action: data.help && data.help.ctaAction,
        });
        runCtaAction(data.help && data.help.ctaAction);
        if (typeof window.__hbClose === 'function') window.__hbClose();
      });
    }
    if (secondary) {
      secondary.addEventListener('click', async function () {
        await postJson('/api/growth/system-help/engage', {
          surface: surface,
          blocking_step: data.blockingStep,
          cta_action: data.help && data.help.secondaryCtaAction,
        });
        runCtaAction(data.help && data.help.secondaryCtaAction);
        if (typeof window.__hbClose === 'function') window.__hbClose();
      });
    }
    if (report) {
      report.addEventListener('click', async function () {
        const context = buildTechnicalContext(surface, data);
        await postJson('/api/growth/system-help/support-request', {
          surface: surface,
          context: context,
        });
        report.textContent = isEnglish()
          ? 'Thanks — we received your report with technical details.'
          : 'Tack — vi har tagit emot rapporten med teknisk kontext.';
        report.disabled = true;
      });
    }
  }

  /**
   * Render into help panel mount (primary surface — no auto-popup).
   */
  async function refreshHelpPanel(mountEl) {
    if (!mountEl) return null;
    const surface = 'help_panel';
    const data = await fetchContext(surface);
    if (!data || !data.eligible || !data.help) {
      return null;
    }
    const html = buildCardHtml(
      Object.assign({ blockingStep: data.blockingStep }, data.help),
      surface
    );
    mountEl.innerHTML = html;
    mountEl.style.display = html ? 'block' : 'none';
    if (html) {
      bindCard(mountEl, data, surface);
      await recordShown(data);
    }
    return data;
  }

  const PRIMARY_CTA_SELECTOR = [
    '[data-action="child-login"]',
    '#dashboardChildLoginBtn',
    '.activation-fs-cta',
  ].join(',');

  function bindEngage(el, data, surface, ctaAction) {
    if (!el || el.getAttribute('data-system-help-engage') === '1') return;
    el.setAttribute('data-system-help-engage', '1');
    el.addEventListener('click', function () {
      postJson('/api/growth/system-help/engage', {
        surface: surface,
        blocking_step: data.blockingStep,
        cta_action: ctaAction || (data.help && data.help.ctaAction),
      });
    });
  }

  /**
   * Count the existing Hem next-step CTA as system help — no second coach.
   */
  async function attachPrimaryCta(rootEl, opts) {
    opts = opts || {};
    if (!rootEl || rootEl.classList.contains('hidden')) return null;
    const surface = opts.surface || 'child_handoff';
    const data = await fetchContext(surface);
    if (!data || !data.eligible || !data.help) return null;
    const cta = rootEl.querySelector(opts.ctaSelector || PRIMARY_CTA_SELECTOR);
    if (cta) bindEngage(cta, data, surface);
    await recordShown(data);
    return data;
  }

  /**
   * PIN hint on the existing handoff card — not a detour into the help panel.
   */
  async function enrichHandoff(rootEl) {
    if (!rootEl || rootEl.classList.contains('hidden')) return;
    if (rootEl.querySelector('.growth-system-help-handoff')) return;
    const data = await fetchContext('child_handoff');
    if (!data || !data.eligible || !data.help) return;

    const help = data.help;
    const wrap = document.createElement('div');
    wrap.className = 'growth-system-help-handoff';
    if (help.secondaryCtaAction) {
      wrap.innerHTML =
        '<p class="growth-system-help-inline text-sm text-navy mt-2">' +
          esc(isEnglish()
            ? 'Forgotten the PIN? Check it under the child profile first.'
            : 'Har ni glömt PIN? Visa den under barnets profil först.') +
        '</p>' +
        '<button type="button" class="growth-system-help-secondary mt-1 min-h-[44px] text-sm text-indigo-700 underline text-left">' +
          esc(help.secondaryCtaLabel) +
        '</button>';
      const secondary = wrap.querySelector('.growth-system-help-secondary');
      if (secondary) {
        secondary.addEventListener('click', function () {
          postJson('/api/growth/system-help/engage', {
            surface: 'child_handoff',
            blocking_step: data.blockingStep,
            cta_action: help.secondaryCtaAction,
          });
          runCtaAction(help.secondaryCtaAction);
        });
      }
      rootEl.appendChild(wrap);
    }

    const existing = rootEl.querySelector(PRIMARY_CTA_SELECTOR);
    if (existing) bindEngage(existing, data, 'child_handoff');
    await recordShown(data);
  }

  window.GrowthSystemHelp = {
    detectSurface: detectSurface,
    fetchContext: fetchContext,
    refreshHelpPanel: refreshHelpPanel,
    enrichHandoff: enrichHandoff,
    attachPrimaryCta: attachPrimaryCta,
    buildCardHtml: buildCardHtml,
    buildTechnicalContext: buildTechnicalContext,
  };
})();
