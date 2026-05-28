/**
 * Dashboard impersonation mode — admin session tokens, auto-logout countdown, write-button disabling.
 * Does not own: authentication backend, API routing.
 */

// ─── Impersonation mode detection ────────────────────────
    (function() {
      const params = new URLSearchParams(window.location.search);
      const impToken = params.get('impersonation_token');
      const familyName = params.get('family_name');
      if (!impToken) return;

      // Store in sessionStorage (tab-scoped, never persists)
      sessionStorage.setItem('impersonation_token', impToken);
      sessionStorage.setItem('impersonation_family_name', familyName || 'Okänd familj');

      // Decode expiry from JWT without a library (base64url)
      try {
        const payload = JSON.parse(atob(impToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        sessionStorage.setItem('impersonation_exp', String(payload.exp || 0));
      } catch {}

      // Clean up URL (remove token from address bar)
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    })();

    // ─── Patch Auth.api to use impersonation token if active ─
    // Runs after auth.js loads (auth.js is loaded in <head> via <script src>)
    window.addEventListener('DOMContentLoaded', function() {
      const impToken = sessionStorage.getItem('impersonation_token');
      if (!impToken) return;

      const familyName = sessionStorage.getItem('impersonation_family_name') || 'Okänd familj';
      const exp = parseInt(sessionStorage.getItem('impersonation_exp') || '0', 10);

      // Override Auth.getToken and isLoggedIn so all Auth.api calls use the impersonation token
      Auth.getToken = function() { return impToken; };
      Auth.isLoggedIn = function() { return true; };
      // Prevent logging out the real session
      Auth.logout = function() {
        sessionStorage.removeItem('impersonation_token');
        sessionStorage.removeItem('impersonation_family_name');
        sessionStorage.removeItem('impersonation_exp');
        window.location.href = '/admin';
      };

      // Show banner
      const banner = document.getElementById('impersonationBanner');
      const spacer = document.getElementById('impersonationBannerSpacer');
      const nameEl = document.getElementById('impersonationFamilyName');
      const countdown = document.getElementById('impersonationCountdown');
      if (banner) banner.style.display = 'block';
      if (spacer) spacer.style.display = 'block';
      if (nameEl) nameEl.textContent = familyName;

      // Countdown timer + auto-logout
      function updateCountdown() {
        const remaining = Math.max(0, exp - Math.floor(Date.now() / 1000));
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        if (countdown) countdown.textContent = m + ':' + s;
        if (remaining <= 0) {
          sessionStorage.removeItem('impersonation_token');
          sessionStorage.removeItem('impersonation_family_name');
          sessionStorage.removeItem('impersonation_exp');
          alert('Support-sessionen har gått ut. Du skickas tillbaka till admin.');
          window.location.href = '/admin';
        }
      }
      updateCountdown();
      setInterval(updateCountdown, 1000);

      // Disable write-triggering buttons visually
      // Runs after full page load so all buttons are rendered
      window.addEventListener('load', function() {
        disableWriteButtons();
      });
    });

    function disableWriteButtons() {
      // Selectors for buttons that trigger mutations in dashboard
      const WRITE_SELECTORS = [
        'button[onclick*="grantStars"]',
        'button[onclick*="manualStar"]',
        'button[onclick*="addActivity"]',
        'button[onclick*="editActivity"]',
        'button[onclick*="deleteActivity"]',
        'button[onclick*="saveSchedule"]',
        'button[onclick*="pauseChild"]',
        'button[onclick*="addChild"]',
        'button[onclick*="invite"]',
        'button[onclick*="redeem"]',
        'button[onclick*="toggleComplete"]',
        '#logoutBtn',
        // settings page buttons
        'button[onclick*="saveSettings"]',
        'button[onclick*="deleteAccount"]',
        'button[onclick*="changePassword"]',
      ];
      WRITE_SELECTORS.forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
          btn.disabled = true;
          btn.style.opacity = '0.35';
          btn.style.cursor = 'not-allowed';
          btn.title = 'Inaktiverat i support-läge';
        });
      });
    }
