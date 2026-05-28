/**
 * Dashboard "Dagens nyhet" (app banner) — loads and displays admin-published news/updates with per-item dismissal.
 * Does not own: authentication, API routing, database.
 */

(function () {
      // Show banner only once per nyhet id. Store last seen id in localStorage.
      const STORAGE_KEY = 'dagensnyhet_dismissed';

      async function loadAppBanner() {
        try {
          const res = await fetch('/api/dagens-nyhet/banner', { credentials: 'include' });
          if (res.status === 204 || !res.ok) return;
          const data = await res.json();
          if (!data || !data.id) return;

          // If already dismissed this nyhet, skip
          if (localStorage.getItem(STORAGE_KEY) === data.id) return;

          document.getElementById('appBannerTitle').textContent = data.title;
          document.getElementById('appBannerBody').textContent = data.body;
          document.getElementById('dagensNyhetAppBanner').classList.remove('hidden');
          // Store id so we can dismiss per-item
          document.getElementById('dagensNyhetAppBanner').dataset.nyhetId = data.id;
        } catch (_) {
          // Banner failure is non-critical
        }
      }

      window.dismissAppBanner = function () {
        const banner = document.getElementById('dagensNyhetAppBanner');
        const id = banner.dataset.nyhetId;
        banner.classList.add('hidden');
        // Persist dismissal in localStorage (client-side, prevents immediate re-show)
        if (id) localStorage.setItem(STORAGE_KEY, id);
        // Notify backend so the banner doesn't reappear after login
        if (id) {
          fetch('/api/dagens-nyhet/' + id + '/dismiss', {
            method: 'PUT',
            credentials: 'include',
          }).catch(function () {
            // Non-critical: localStorage already prevents re-show in this session
          });
        }
      };

      // Load after a short delay so the page renders first
      setTimeout(loadAppBanner, 1500);
    })();
