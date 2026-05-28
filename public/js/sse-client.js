/**
 * Min Stjärndag — SSE real-time client
 *
 * Establishes a persistent EventSource connection to /api/events.
 * Dispatches custom DOM events that page-specific handlers can listen to.
 *
 * Events dispatched on window:
 *   sse:DAILY_LOG_ITEM_COMPLETED — { itemId, childId, completed }
 *   sse:STAR_GRANTED             — { childId, starCount, reason }
 *   sse:SCHEDULE_UPDATED         — { childId, dayOfWeek }
 *   sse:GOAL_PROGRESS_UPDATE     — { childId }
 *   sse:SYSTEM_ALERT             — { message_id, message_text, created_at }
 *   sse:PIN_FAILED_WARNING       — { childId, childName, attemptCount }
 *   sse:connected                — initial handshake
 *   sse:disconnected             — connection lost (before reconnect)
 *
 * Auth:
 *   - Cookie-only: browser sends httpOnly access_token cookie automatically.
 *   - EventSource is same-origin, so cookies are included without extra config.
 *   - No token in query param or localStorage needed.
 *
 * Reconnection strategy:
 *   - EventSource reconnects automatically on network loss.
 *   - On window focus: force-reconnect if the connection is closed.
 *   - Manual 5-second fallback reconnect if EventSource stays CLOSED.
 */

(function () {
  'use strict';

  let _es = null;
  let _reconnectTimer = null;

  function isLoggedIn() {
    // Check if user data exists (set by Auth on login).
    try {
      return !!(window.Auth && window.Auth.isLoggedIn());
    } catch {
      return false;
    }
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent('sse:' + name, { detail }));
  }

  function connect() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }

    if (!isLoggedIn()) return; // not logged in — skip

    // Close any existing connection cleanly
    if (_es) {
      try { _es.close(); } catch {}
      _es = null;
    }

    // Cookie-only auth: browser sends httpOnly cookie automatically for same-origin.
    // withCredentials: true is the default for same-origin EventSource.
    _es = new EventSource('/api/events');

    _es.addEventListener('CONNECTED', () => {
      dispatch('connected', {});
    });

    _es.addEventListener('DAILY_LOG_ITEM_COMPLETED', (e) => {
      try { dispatch('DAILY_LOG_ITEM_COMPLETED', JSON.parse(e.data)); } catch {}
    });

    _es.addEventListener('STAR_GRANTED', (e) => {
      try { dispatch('STAR_GRANTED', JSON.parse(e.data)); } catch {}
    });

    _es.addEventListener('SCHEDULE_UPDATED', (e) => {
      try { dispatch('SCHEDULE_UPDATED', JSON.parse(e.data)); } catch {}
    });

    _es.addEventListener('GOAL_PROGRESS_UPDATE', (e) => {
      try { dispatch('GOAL_PROGRESS_UPDATE', JSON.parse(e.data)); } catch {}
    });

    _es.addEventListener('SYSTEM_ALERT', (e) => {
      try { dispatch('SYSTEM_ALERT', JSON.parse(e.data)); } catch {}
    });

    _es.addEventListener('PIN_FAILED_WARNING', (e) => {
      try { dispatch('PIN_FAILED_WARNING', JSON.parse(e.data)); } catch {}
    });

    _es.onerror = () => {
      dispatch('disconnected', {});
      // Check if this is an auth error (401) vs a network error.
      // EventSource doesn't expose HTTP status codes, so we probe /api/auth/me.
      // On 401: auth has expired — trigger silent refresh before reconnecting.
      // On success: network hiccup — EventSource will auto-reconnect; also
      // schedule a manual fallback reconnect in case it stays CLOSED.
      window._sseAuthCheckPending = true;
      fetch('/api/auth/me', { credentials: 'include' })
        .then(res => {
          window._sseAuthCheckPending = false;
          if (res.status === 401) {
            // Token expired — trigger silent refresh (Auth.js handles this).
            if (window.Auth && typeof window.Auth.refresh === 'function') {
              window.Auth.refresh().catch(() => {});
            }
          }
          // Whether auth is ok or expired (now refreshed), reconnect
          _reconnectTimer = setTimeout(() => {
            if (_es && _es.readyState === EventSource.CLOSED) {
              connect();
            }
          }, 5000);
        })
        .catch(() => {
          window._sseAuthCheckPending = false;
          // Network error — EventSource will auto-reconnect; add fallback
          _reconnectTimer = setTimeout(() => {
            if (_es && _es.readyState === EventSource.CLOSED) {
              connect();
            }
          }, 5000);
        });
    };
  }

  // Reconnect on window focus — re-reads token so a refreshed token is used
  window.addEventListener('focus', () => {
    if (!_es || _es.readyState === EventSource.CLOSED) {
      connect();
    }
  });

  // Reconnect on visibilitychange (more reliable than focus on mobile PWA)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!_es || _es.readyState === EventSource.CLOSED) {
        connect();
      }
    }
  });

  // Start as soon as the script loads (auth token should exist at this point)
  // Use a small delay to let Auth.js initialise first.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(connect, 300));
  } else {
    setTimeout(connect, 300);
  }

  // Expose for debugging and so Auth silent refresh can trigger a reconnect
  window._sseClient = {
    connect,
    reconnect: connect,
    getStatus: () => _es ? _es.readyState : -1,
  };
})();
