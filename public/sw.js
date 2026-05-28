/**
 * Min Stjärndag — Service Worker v130
 * v130: Child dashboard — mood rating no longer gated by dev kanslo_tracking flag;
 *       serialize check-offs + coalesce loadDay to fix errors when tapping multiple tasks;
 *       batch ratings in GET /api/me/daily-log (fewer parallel API calls).
 * v129: Release prep — lifetime free för topp 200 familjer.
 *       Auth.js: SELECT COUNT(*) → is_lifetime_free in same transaction.
 *       Familien #1–200: is_lifetime_free=true, Inga prenumerationskrav.
 *       Familien #201+: normal trial/subscription-flöde via RevenueCat.
 * v128: RevenueCat webhook endpoint (POST /api/iap/webhook) — subscription_status sync
 *       from RevenueCat events (INITIAL_PURCHASE/RENEWAL → active, CANCELLATION → cancelled,
 *       EXPIRATION → expired, BILLING_ISSUE → grace_period). Lifetime-free guard prevents
 *       webhook from overriding free status. HMAC-SHA256 Authorization verification.
 * v127: RevenueCat IAP infrastructure — iap-manager.js (native SDK init, checkSubscriptionStatus),
 *       /api/auth/me includes is_lifetime_free from family row,
 *       auth.js getFamilyId() for RevenueCat appUserID,
 *       REVENUECAT_API_KEY in .env.example.
 *       NOTE: @revenuecat/purchases-capacitor npm blocked by Polsia npm policy —
 *       must be resolved before native builds can use IAP.
 * v126: DELETE /api/family/delete-account endpoint for Apple 5.1.1 compliance;
 *       settings.html two-step RADERA confirmation modal, CSRF-protected delete flow.
 * v125: App Store-ready — terms.html, privacy.html Apple ID + APNs token sections,
 *       terms links in register/settings/landing footer.
 * v124: APNs key via APNS_KEY_CONTENT env var (no .p8 file on disk);
 *       native UX polish: cookie-banner.js hides on Platform.isNative().
 * v123: Cache-bust for landing news image fix — forces fresh fetch after SSR deploy.
 * v122: Landing news SSR — server pre-renders news cards (image + text) into HTML.
 * v120: PWA-install kill-switch (Platform.isNative), offline.html polish, child-login safe-area.
 * v119: Native push integration in push-manager.js — Platform.push on iOS/Android.
 * Strategy:
 *   - Static assets (CSS, JS, icons, fonts): Stale-while-revalidate (v25+)
 *   - API calls (/api/*): Network-only, bypass HTTP cache entirely
 *   - HTML pages: Network-first, fallback to cache
 *   - Offline: Serve /offline.html
 *   - Offline completions: handled by in-page offline-queue.js (not by SW)
 *   - Push notifications: Show system notification with title/body/icon from payload
 *   - PWA badge: setAppBadge(count) on push, clearAppBadge on notification click/app open
 *   - Notification click: Focus existing window or open new tab on correct URL
 *   - Update detection: postMessage('SW_UPDATED') to all clients when new SW activates
 *
 * v35 fix: Bundle A — 4 bugs (#1673775).
 *   - Bug #18+#F: submitCreateActivity wrapped in try/finally with btn-disable,
 *     failedSteps tracking mirrors library.js pattern, warning toast on substep failures.
 *   - Bug #15: login.html admin redirect now checks both isAdmin and is_admin (defense-in-depth).
 *   - Dead code: Removed unused localDay block in getDayOfWeek (daily-log-generator.js).
 *   - Bumped cache v34→v35 + HTML version tags to force fresh JS.
 *
 * v46 fix: BUG #1776812 — "The string did not match the expected pattern" when creating report.
 *   - Removed pattern="[0-9]*" from pinCode input in reports.html (oninput handler already strips non-digits).
 *   - Added type="button" to create report button to prevent implicit form submission.
 *   - Added formnovalidate to createBtn as belt-and-suspenders against HTML5 constraint validation.
 *   - Bumped cache v66→v67 to force fresh HTML for all users.
 *
 * v34 fix: 2 timezone bugs (#1672099).
 *   - Calendar: replaced UTC getUTCDay() with per-child timezone getLocalDateStr/getDayOfWeek.
 *   - Dashboard: replaced hardcoded Stockholm with per-child todayStr map (childTodayMap).
 *
 * v32 fix: 5 bugs (#1671752).
 *   - Bug 1+2+6: Removed z-250 !important CSS override on modals — survey popup (z-9000)
 *     was intercepting clicks and redirecting to /tyck/. Modals use z-[9100]/z-[9200].
 *     Also added missing ⭐ 4 star button + substep section to createActivityModal.
 *   - Bug 3: schedule.js getElementById('addActivitySubmitBtn') → 'addActivityBtn' (null → TypeError)
 *   - Bug 4: survey-popup.js CSRF token fix (window._csrfToken → Auth.getCsrfToken()),
 *     double-recording guard (_surveyPopupActionRecorded), and CSRF exempt path correction.
 *   - Bug 5: Delete activity now offers "Bara denna dag" vs "Alla kommande" via exclude-date endpoint.
 *   - Bumped cache v29→v32 + HTML version tags v2.9.0→v2.12.0 to force fresh JS.
 *
 * v29 fix: 6 broken interactions (#1662849).
 *   - Bug 6: schedule-templates INSERT missing day_of_week → NOT NULL violation (server-side fix)
 *   - Bug 3+5: survey popup X button now records 'dismissed' interaction → popup stops reappearing;
 *     server also suppresses popup after 'clicked' action (prevents survey redirect loop)
 *   - Bug 2: submitCreateActivity() in schedule.js now closes addActivityModal before recurrence
 *   - Bug 1+4: All dashboard modals raised from z-[250] to z-[9100], above survey popup z-9000
 *   - Bumped cache v28→v29 + HTML version tags v2.8.0→v2.9.0 to force fresh JS.
 *
 * v28 fix: BUG #1661846 — Logout redirect always goes to / instead of /login.
 *   - auth.js Auth.logout(): changed redirect from '/login' to '/'
 *   - Reads sessionRestored flag from server response: if true, goes to /dashboard
 *     (child logged out + parent session restored), otherwise always goes to /
 *   - Bumped cache v27→v28 + HTML version tags v2.7.0→v2.8.0 to force fresh JS.
 *
 * v27 fix: 5 broken button interactions from #1662377.
 *   - Added missing star value 4 button in Veckoschema (schedule.html)
 *   - Added inline substep/delsteg input to Bibliotek activity creation (library.html + library.js)
 *   - Bumped cache v26→v27 + HTML version tags v2.6.0→v2.7.0 to ensure users get fresh JS.
 *
 * v26 fix: Bugfixes for Översikt + Veckoschema button interactions.
 *   - Once-task search shows "Skapa ny" hint when zero results (dashboard.js)
 *   - Schedule item delete now shows confirmation dialog (schedule.js)
 *   - Fixed JSON.stringify breaking onclick attributes for "Skapa ny" button (schedule.js)
 *   - Bumped cache v25→v26 + HTML version tags v2.5.0→v2.6.0 to ensure users get fresh JS.
 *
 * v25 fix: JS caching changed from cache-first to stale-while-revalidate.
 *   Cache-first was causing users to be stuck on old JS files indefinitely —
 *   four consecutive bug fixes to activity creation never reached users because
 *   the SW always served the stale cached copy. Stale-while-revalidate returns
 *   the cached version immediately (fast) but also fetches the latest from the
 *   network and updates the cache, so the NEXT page load gets the fix.
 *   Cache name bumped v24→v25 to force full re-cache of all assets.
 *
 * v23 fix: PWA app badge (red number on home screen icon). Uses Badging API
 *   (Chrome 81+, Safari 16.4+) to show unread count on push and clear on
 *   notification click. Client-side badge clear on visibilitychange handled
 *   by sw-register.js.
 *
 * v22 fix: cookie-only auth migration. On activate, tells all clients to purge
 *   stale 'stjarndag_token' from localStorage (fixes login-loop where expired
 *   localStorage token overrode valid httpOnly cookie via Authorization header priority).
 *   Cache name bumped to force full re-cache of updated auth.js and other JS files.
 *
 * v21 fix: auth.js shared-device guard — silentRefresh detects parent/child token
 *   type mismatch from refresh cookie collision on shared devices.
 * v20 fix: Added dom-utils.js and feedback.js to STATIC_ASSETS pre-cache list.
 * v19 fix: SKIP_WAITING message handler for "Ladda om nu" banner.
 * v18 fix: API cache:'no-store' to bypass 304 reconstitution bugs.
 */

/* Wave 2: Offline reading — schema + belöningar vises offline i barnvy */
const CACHE_NAME = 'stjarndag-v130';
// v127: DB-migration för IAP-beredskap — is_lifetime_free, rc_customer_id, subscription_status DEFAULT 'none'
// v126: App Store-förberedelse — /terms route, privacy.html Apple ID + APNs sections
// v125: App Store-ready — terms.html, privacy.html Apple ID + APNs token sections
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/offline.html',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/css/theme.css',
  '/js/platform.js',
  '/js/auth.js',
  '/js/dom-utils.js',
  '/js/theme.js',
  '/js/i18n.js',
  '/js/offline-queue.js',
  '/js/offline-store.js',   // IndexedDB wrapper for offline schema/profil/belöningar
  '/js/sw-register.js',
  '/js/mobile-nav.js',
  '/js/feedback.js',
  // Child view pages + JS (offline reading)
  '/child-login.html',
  '/child-dashboard.html',
  '/js/child-login.js',
  '/js/child-dashboard.js',
  // Pedagog pages
  '/pedagog-note.html',
  '/pedagog-oversikt.html',
  '/js/skeleton.js',
  '/js/sse-client.js',
  '/js/child-dashboard-sse.js',
  '/js/help-bubble.js',
  '/js/feature-check.js',
  // Professional report
  '/professional-report.html',
];

// ─── Message handler: allow clients to trigger skipWaiting ──
// Why: when a new SW is in the "waiting" state (e.g. install succeeded but
// skipWaiting didn't fire, or a tab was open preventing activation), the
// client-side "Ladda om nu" button sends this message to force activation.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Install: pre-cache static assets ────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches + purge stale localStorage auth ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            // Tell clients to purge stale localStorage token (cookie-only auth migration)
            client.postMessage({ type: 'CLEANUP_AUTH' });
            // Notify that a new version is active so they can show a reload banner
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});

// ─── Fetch strategy ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts, Tailwind, etc.)
  if (url.origin !== self.location.origin) return;

  // API calls: Network-only, bypass HTTP cache entirely.
  // Why cache:'no-store': prevents the browser from sending If-None-Match headers
  // that produce 304 responses. 304 bodies sometimes fail to reconstitute through
  // the SW fetch pipeline, leaving pages stuck on "Laddar…" (v17 regression).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        new Response(
          JSON.stringify({ error: 'Offline', message: 'Du är offline. Anslut till internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Stale-while-revalidate
  // Returns cached version immediately (fast), then fetches latest from network
  // and updates cache so the NEXT load gets the fresh version. This ensures
  // bug fixes propagate within one page load cycle instead of being stuck forever.
  if (
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached); // If network fails, fall back to cache
          // Return cached immediately if available, else wait for network
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // HTML pages: Network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match(OFFLINE_URL);
      })
  );
});

// ─── Push: show system notification + set PWA badge ─────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Min Stjärndag', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Min Stjärndag';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Update PWA home screen badge with count of visible notifications.
      // Badging API: Chrome 81+, Safari 16.4+ — no-op where unsupported.
      if ('setAppBadge' in navigator) {
        return self.registration.getNotifications().then((notifications) => {
          return navigator.setAppBadge(notifications.length);
        });
      }
    })
  );
});

// ─── Notification click: open correct URL + update badge ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard';

  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : self.location.origin + targetUrl;

  event.waitUntil(
    // Update badge: remaining notification count after closing this one.
    self.registration.getNotifications().then((remaining) => {
      if ('setAppBadge' in navigator) {
        if (remaining.length > 0) {
          navigator.setAppBadge(remaining.length);
        } else {
          navigator.clearAppBadge();
        }
      }
    }).then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((windowClients) => {
      // Focus existing window on the target URL if one is open
      for (const client of windowClients) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // No matching window — open new tab
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
