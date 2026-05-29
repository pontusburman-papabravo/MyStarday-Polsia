/**
 * login-magic.js — Role selector logic for the "magisk natt" login redesign.
 * WHAT: role card interaction, parent form reveal, back navigation, show/hide helpers.
 * WHAT NOT: auth POST/Apple sign-in — handled by inline scripts in login.html.
 */

(function () {
  'use strict';

  /* ── Star generation ────────────────────────────────────────────────────── */
  function generateStars(count) {
    var container = document.getElementById('stars-container');
    if (!container) return;
    for (var i = 0; i < count; i++) {
      var star = document.createElement('div');
      star.className = 'star-particle';
      var size = Math.random() < 0.7 ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 7) + 6;
      star.style.cssText = [
        'width:' + size + 'px',
        'height:' + size + 'px',
        'background:rgba(255,255,255,' + (Math.random() * 0.6 + 0.2).toFixed(2) + ')',
        'left:' + (Math.random() * 100).toFixed(1) + '%',
        'top:'  + (Math.random() * 100).toFixed(1) + '%',
        '--float-dur:'    + (Math.random() * 5 + 3).toFixed(1) + 's',
        '--float-delay:'  + (Math.random() * 4).toFixed(1) + 's',
        '--twinkle-dur:'  + (Math.random() * 3 + 1.5).toFixed(1) + 's',
        '--twinkle-delay:'+ (Math.random() * 3).toFixed(1) + 's',
      ].join(';');

      if (Math.random() < 0.35) star.classList.add('lit');
      if (Math.random() < 0.2)  star.classList.add('fast');
      if (Math.random() < 0.15) star.classList.add('slow');

      container.appendChild(star);
    }
  }

  /* ── Cloud generation ────────────────────────────────────────────────────── */
  function generateClouds(count) {
    var container = document.getElementById('clouds-container');
    if (!container) return;
    for (var i = 0; i < count; i++) {
      var cloud = document.createElement('div');
      cloud.className = 'cloud';
      var w = Math.floor(Math.random() * 180 + 80);
      var h = Math.floor(w * (0.4 + Math.random() * 0.3));
      cloud.style.cssText = [
        'width:' + w + 'px',
        'height:' + h + 'px',
        'left:' + (Math.random() * 100).toFixed(1) + '%',
        'top:'  + (Math.random() * 70).toFixed(1) + '%',
        '--drift-dur:'   + (Math.random() * 15 + 10).toFixed(0) + 's',
        '--drift-delay:' + (Math.random() * 8).toFixed(1) + 's',
      ].join(';');
      container.appendChild(cloud);
    }
  }

  /* ── Role card interaction ──────────────────────────────────────────────── */
  function initRoleCards() {
    var kidCard   = document.getElementById('kid-role-card');
    var parentCard = document.getElementById('parent-role-card');

    if (!kidCard || !parentCard) return;

    kidCard.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = '/child-login';
    });

    parentCard.addEventListener('click', function (e) {
      e.preventDefault();
      showParentLogin();
    });
  }

  /* ── Show parent login form ─────────────────────────────────────────────── */
  function showParentLogin() {
    var roleSection = document.getElementById('role-selection');
    var parentSection = document.getElementById('parent-login-section');

    if (!roleSection || !parentSection) return;

    roleSection.classList.add('card-transition');
    roleSection.style.display = 'none';
    parentSection.classList.add('card-transition');
    parentSection.style.display = 'flex';
  }

  /* ── Back to role selection ─────────────────────────────────────────────── */
  function backToRoleSelection() {
    var roleSection = document.getElementById('role-selection');
    var parentSection = document.getElementById('parent-login-section');

    if (!roleSection || !parentSection) return;

    parentSection.classList.remove('card-transition');
    parentSection.style.display = 'none';
    roleSection.classList.add('card-transition');
    roleSection.style.display = '';
  }

  /* ── Error helpers (called by inline login.html scripts) ───────────────── */
  window.LoginMagic = {
    showError: function (msg) {
      var el = document.getElementById('magic-login-error');
      if (el) {
        el.textContent = msg;
        el.style.display = '';
        el.classList.add('magic-error-box');
      }
    },
    hideError: function () {
      var el = document.getElementById('magic-login-error');
      if (el) {
        el.style.display = 'none';
        el.classList.remove('magic-error-box');
      }
    },
    setLoading: function (btn, on) {
      if (!btn) return;
      btn.disabled = on;
      btn.textContent = on ? 'Loggar in…' : 'Logga in';
    },
    showParentLogin: showParentLogin,
    backToRoleSelection: backToRoleSelection,
  };

  /* ── Init ──────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    generateStars(50);
    generateClouds(5);
    initRoleCards();
  });

})();