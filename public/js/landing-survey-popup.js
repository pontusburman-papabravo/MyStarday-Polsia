/**
 * landing-survey-popup.js
 * Survey popup for landing page visitors (Målgrupp C — anonymous).
 * Triggers after delay OR scroll %, whichever fires first.
 * Also fires on exit-intent (mouse leaves top of viewport).
 * Cookie-based dismiss — won't reappear once dismissed or "not now" clicked.
 */

(function () {
  'use strict';

  const COOKIE_KEY_PREFIX = 'msd_survey_popup_';
  let _survey = null;
  let _triggered = false;
  let _scrollTimer = null;
  let _delayTimer = null;

  // Generate a random cookie token for anonymous tracking
  function _getCookieToken() {
    let t = localStorage.getItem('msd_anon_token');
    if (!t) {
      t = 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('msd_anon_token', t);
    }
    return t;
  }

  function _isCookieDismissed(surveyId) {
    return localStorage.getItem(COOKIE_KEY_PREFIX + surveyId) === 'dismissed';
  }

  function _markCookieDismissed(surveyId) {
    localStorage.setItem(COOKIE_KEY_PREFIX + surveyId, 'dismissed');
  }

  function _esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function trigger() {
    if (_triggered || !_survey) return;
    _triggered = true;
    _clearTimers();
    _render(_survey);
  }

  function _clearTimers() {
    if (_delayTimer) { clearTimeout(_delayTimer); _delayTimer = null; }
    if (_scrollTimer) { clearTimeout(_scrollTimer); _scrollTimer = null; }
    window.removeEventListener('scroll', _onScroll);
    document.removeEventListener('mouseleave', _onExitIntent);
  }

  function _onScroll() {
    if (_triggered) { _clearTimers(); return; }
    const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    const threshold = _survey.popup_trigger_scroll_pct || 50;
    if (pct >= threshold) trigger();
  }

  function _onExitIntent(e) {
    // Mouse exits from the top of the viewport — classic exit-intent signal
    if (e.clientY <= 5) trigger();
  }

  function _render(survey) {
    const div = document.createElement('div');
    div.id = 'landingSurveyPopup';
    div.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9000;
      width:340px;max-width:calc(100vw - 32px);
      background:#fff;border-radius:20px;
      box-shadow:0 8px 40px rgba(27,35,64,0.20);
      padding:20px;
      animation:landingPopupIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
    `;

    const contestBanner = survey.contest_enabled && survey.contest_prize_description
      ? `<div style="background:linear-gradient(135deg,#FFF3D6,#fde68a);border-radius:12px;padding:9px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
           <span style="font-size:1.3rem">🎁</span>
           <span style="font-size:0.8rem;font-weight:600;color:#92400e;">Tävla om ${_esc(survey.contest_prize_description)}!</span>
         </div>`
      : '';

    div.innerHTML = `
      <style>
        @keyframes landingPopupIn{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        #landingSurveyPopup button:hover{opacity:.85}
      </style>
      ${contestBanner}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;">
        <div>
          <p style="font-weight:700;font-size:0.95rem;color:#1B2340;margin:0 0 3px;">Vi vill höra din åsikt 👋</p>
          <p style="font-size:0.8rem;color:#5A6178;margin:0;">Det tar 2 minuter — inga personuppgifter krävs.</p>
        </div>
        <button id="landingPopupClose" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:1.1rem;padding:0;line-height:1;flex-shrink:0;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;">
        <a id="landingPopupCta" href="/tyck/${_esc(survey.slug)}" target="_blank"
          style="display:block;background:#1B2340;color:#fff;text-align:center;padding:11px;border-radius:12px;
                 font-weight:600;font-size:0.88rem;text-decoration:none;">
          Svara nu →
        </a>
        <div style="display:flex;gap:6px;">
          <button id="landingPopupLater"
            style="flex:1;background:#F3F4F6;border:none;cursor:pointer;padding:9px;border-radius:10px;
                   font-size:0.78rem;font-weight:600;color:#5A6178;">
            Inte nu
          </button>
          <button id="landingPopupNever"
            style="flex:1;background:#F3F4F6;border:none;cursor:pointer;padding:9px;border-radius:10px;
                   font-size:0.78rem;font-weight:600;color:#5A6178;">
            Stäng
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(div);

    const cookieToken = _getCookieToken();

    function close(action) {
      div.style.opacity = '0';
      div.style.transition = 'opacity .2s';
      setTimeout(() => div.remove(), 200);
      if (action === 'dismissed' || action === 'clicked') {
        _markCookieDismissed(survey.id);
      }
      _recordInteraction(survey.id, action, cookieToken);
    }

    document.getElementById('landingPopupClose').onclick = () => close('dismissed');
    document.getElementById('landingPopupNever').onclick  = () => close('dismissed');
    document.getElementById('landingPopupLater').onclick  = () => close('snoozed');
    document.getElementById('landingPopupCta').onclick    = () => close('clicked');
  }

  async function _recordInteraction(surveyId, action, cookieToken) {
    try {
      await fetch('/api/surveys/popup/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_id: surveyId, action, cookie_token: cookieToken }),
      });
    } catch { /* non-fatal */ }
  }

  async function initLandingSurveyPopup() {
    try {
      const res = await fetch('/api/surveys/popup/landing');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.survey) return;
      _survey = data.survey;
    } catch { return; }

    if (_isCookieDismissed(_survey.id)) return;

    const delaySecs = _survey.popup_trigger_delay_secs || 8;
    const scrollPct = _survey.popup_trigger_scroll_pct || 50;

    // Delay trigger
    _delayTimer = setTimeout(trigger, delaySecs * 1000);

    // Scroll trigger
    window.addEventListener('scroll', _onScroll, { passive: true });

    // Exit-intent (desktop only)
    document.addEventListener('mouseleave', _onExitIntent);
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLandingSurveyPopup);
  } else {
    initLandingSurveyPopup();
  }
})();
