/**
 * Platform abstraction layer — isolates Capacitor-specific logic.
 * Loaded early in <head>, before all other scripts.
 *
 * WHAT: exposes window.Platform with isNative/isIOS/isAndroid/isWeb detection,
 * native plugin shims (haptics, share, push), and a ready() promise.
 *
 * WHAT NOT: does NOT load @capacitor/core — that happens only after native init
 * via the Capacitor bundler. On web, this file works without any dependencies.
 */
var Platform = (function () {
  function noop() {}

  function isNative() {
    return typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform();
  }

  function isIOS() {
    return isNative() && Capacitor.getPlatform() === 'ios';
  }

  function isAndroid() {
    return isNative() && Capacitor.getPlatform() === 'android';
  }

  function isWeb() {
    return !isNative();
  }

  function ready() {
    if (isNative()) {
      // Capacitor has already initialised — resolve immediately.
      return Promise.resolve();
    }
    // On web, there's nothing to wait for.
    return Promise.resolve();
  }

  // ── Vibration toggle (localStorage) ──────────────────────────────────
  function isHapticsEnabled() {
    // Stored per-child via childId key, or a global default if no child context.
    try {
      return localStorage.getItem('stjarndag_haptics_enabled') !== 'false';
    } catch (_) {
      return true;
    }
  }

  function setHapticsEnabled(val) {
    try {
      localStorage.setItem('stjarndag_haptics_enabled', val ? 'true' : 'false');
    } catch (_) {}
  }

  // Haptics — uses @capacitor/haptics on native, navigator.vibrate on web.
  var haptics = {
    async light() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    async medium() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    },
    async heavy() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    async success() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, NotificationType } = await import('@capacitor/haptics');
          await Haptics.notification({ type: NotificationType.Success });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    },
    async error() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, NotificationType } = await import('@capacitor/haptics');
          await Haptics.notification({ type: NotificationType.Error });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 30, 80]);
      }
    },
    isEnabled() { return isHapticsEnabled(); },
    setEnabled(val) { setHapticsEnabled(val); }
  };

  // Share — @capacitor/share on native, Web Share API on web, clipboard fallback.
  var share = async function (opts) {
    if (isNative()) {
      try {
        const { Share } = await import('@capacitor/share');
        return await Share.share({
          title: opts.title || '',
          text: opts.text || '',
          url: opts.url || '',
        });
      } catch (err) {
        console.warn('[Platform.share] Native share failed:', err.message);
      }
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        return await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      } catch (err) {
        // User cancelled — not an error
        if (err.name !== 'AbortError') throw err;
        return;
      }
    }
    // Fallback: copy text to clipboard
    if (opts.text) {
      try {
        await navigator.clipboard.writeText(opts.text);
        return { copied: true };
      } catch (_) {}
    }
    throw new Error('Share not supported');
  };

  // Push — Web Push on web, Capacitor PushNotifications on native.
  var push = {
    /**
     * Request push notification permission and register the device token.
     * On web: registers with the backend's VAPID subscription endpoint.
     * On iOS/Android: requests Capacitor PushNotifications permission and
     *   registers the APNs/FCM token via /api/push/register-native.
     */
    async register() {
      if (isNative()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive !== 'granted') {
            console.warn('[Platform.push] Permission denied:', permResult);
            return { success: false, reason: 'permission_denied' };
          }
          const result = await PushNotifications.register();
          // Get the token that was registered
          PushNotifications.addListener('registration', async (tokenEvt) => {
            const platform = isIOS() ? 'ios' : 'android';
            try {
              await fetch('/api/push/register-native', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenEvt.value, platform }),
                credentials: 'include',
              });
            } catch (err) {
              console.error('[Platform.push] Token registration failed:', err);
            }
          });
          PushNotifications.addListener('registrationError', (err) => {
            console.error('[Platform.push] Registration error:', err);
          });
          return { success: true, token: result };
        } catch (err) {
          console.error('[Platform.push] Register failed:', err);
          return { success: false, reason: err.message };
        }
      } else {
        // Web: use the Service Worker registration + VAPID subscription
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return { success: false, reason: 'push_not_supported' };
        }
        const swReg = await navigator.serviceWorker.ready;
        const pubKeyRes = await fetch('/api/push/vapid-public-key');
        if (!pubKeyRes.ok) {
          const err = await pubKeyRes.json().catch(() => ({}));
          return { success: false, reason: err.error || 'not_configured' };
        }
        const { publicKey } = await pubKeyRes.json();
        const sub = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
          credentials: 'include',
        });
        return { success: true };
      }
    },

    /**
     * Unregister this device from push notifications.
     * Removes the token/subscription from the backend.
     */
    async unregister() {
      if (isNative()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const tokenResult = await PushNotifications.getLastDeliveredNotification?.();
          // Unregister from Capacitor
          await PushNotifications.unregister?.();
          // The token to remove comes from the 'registration' event stored in memory;
          // for simplicity, clear all native tokens by platform if we can't get the token.
          const platform = isIOS() ? 'ios' : 'android';
          // Try to get current token to delete the right one
          await fetch('/api/push/unregister-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, token: '' }),
            credentials: 'include',
          }).catch(() => {});
          return { success: true };
        } catch (err) {
          console.error('[Platform.push] Unregister failed:', err);
          return { success: false, reason: err.message };
        }
      } else {
        try {
          const swReg = await navigator.serviceWorker.ready;
          const sub = await swReg.pushManager.getSubscription();
          if (sub) {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint }),
              credentials: 'include',
            });
            await sub.unsubscribe();
          }
          return { success: true };
        } catch (err) {
          console.error('[Platform.push] Unregister failed:', err);
          return { success: false, reason: err.message };
        }
      }
    },
  };

  // ── Helper: VAPID key decoding ─────────────────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // ── Apple Sign In ────────────────────────────────────────────────
  // Native: delegates to @capacitor/sign-in-with-apple plugin.
  // Web: falls back to Sign in with Apple JS (https://appleid.apple.com/auth/js)
  // which requires a valid Apple Developer configured domain.
  var appleSignIn = {
    /**
     * Start Apple Sign In and return the identity token.
     * On native: calls the Capacitor plugin.
     * On web: loads Apple's JS and uses the Sign in with Apple popup flow.
     * Returns: { idToken, name } or throws on failure/cancel.
     */
    async signIn() {
      if (isNative()) {
        try {
          const { SignInWithApple } = await import('@sign-in-with-apple/native');
          const result = await SignInWithApple.signIn({
            clientId: 'se.mystarday.app',
            redirectUri: 'se.mystarday.app://oauth-callback',
            scopes: 'email name',
          });
          return {
            idToken: result.identityToken,
            name: result.fullName.givenName
              ? `${result.fullName.givenName} ${result.fullName.familyName || ''}`.trim()
              : null,
          };
        } catch (err) {
          if (err.message === 'cancel') return null;
          throw err;
        }
      }
      // Web: use Sign in with Apple JS
      return new Promise((resolve, reject) => {
        if (!document.getElementById('apple-id-auth')) {
          const script = document.createElement('script');
          script.id = 'apple-id-auth';
          script.src = 'https://appleid.apple.com/auth/js';
          script.async = true;
          script.onload = () => attemptWebSignIn(resolve, reject);
          script.onerror = () => reject(new Error('Kunde inte ladda Apple Sign In'));
          document.head.appendChild(script);
        } else {
          attemptWebSignIn(resolve, reject);
        }
      });
    },
  };

  function attemptWebSignIn(resolve, reject) {
    const apple = window.AppleID;
    if (!apple) {
      reject(new Error('Apple Sign In JS inte tillgänglig'));
      return;
    }
    apple.auth.signIn({
      clientId: 'se.mystarday.app',
      scope: 'name email',
      redirectURI: window.location.origin,
    }).then(res => {
      resolve({ idToken: res.authorization.id_token, name: null });
    }).catch(err => {
      if (err.error === 'user_cancelled') { resolve(null); return; }
      reject(err);
    });
  }

  return {
    isNative: isNative,
    isIOS: isIOS,
    isAndroid: isAndroid,
    isWeb: isWeb,
    ready: ready,
    haptics: haptics,
    share: share,
    push: push,
    isHapticsEnabled: isHapticsEnabled,
    setHapticsEnabled: setHapticsEnabled,
    appleSignIn: appleSignIn,
  };
})();

// Expose globally.
window.Platform = Platform;