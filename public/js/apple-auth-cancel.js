/**
 * Canonical Sign in with Apple cancellation detection.
 *
 * Shipped native plugin (build 1158 and earlier) rejects with only
 * error.localizedDescription. Capacitor then typically sets code "ERROR"
 * and does not pass ASAuthorizationError.canceled (1001).
 *
 * The patched plugin rejects user-cancel as message "canceled" + code ERR_CANCELED.
 * Web Apple JS uses error user_cancelled / popup_closed_by_user.
 */
(function appleAuthCancelModule(root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) root.AppleAuthCancel = api;
}(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function appleAuthCancelFactory() {
  'use strict';

  const CANCEL_CODES = {
    ERR_CANCELED: true,
    1001: true,
    '1001': true,
    canceled: true,
    cancelled: true,
    'ASAuthorizationError.canceled': true,
    ASAuthorizationErrorCanceled: true,
  };

  const CANCEL_ERROR_KEYS = {
    user_cancelled: true,
    popup_closed_by_user: true,
    ERR_CANCELED: true,
    canceled: true,
    cancelled: true,
    cancel: true,
  };

  function collectTexts(error) {
    if (error == null) return [];
    const texts = [];
    if (typeof error === 'string') texts.push(error);
    if (typeof error === 'object') {
      ['message', 'errorMessage', 'error', 'code', 'errorCode', 'localizedDescription'].forEach(function (key) {
        if (error[key] != null && error[key] !== '') texts.push(String(error[key]));
      });
    }
    texts.push(String(error));
    return texts;
  }

  function firstCode(error) {
    if (!error || typeof error !== 'object') return undefined;
    if (error.code != null) return error.code;
    if (error.errorCode != null) return error.errorCode;
    return undefined;
  }

  function isNonCancelAuthError(text) {
    const lower = String(text || '').toLowerCase();
    return lower === 'sign_in_unavailable' ||
      lower === 'apple_sign_in_failed' ||
      lower.indexOf('sign_in_unavailable') !== -1 && lower.indexOf('cancel') === -1;
  }

  function isAppleAuthCancellation(error) {
    if (!error) return false;
    if (typeof error === 'object' && error.canceled === true) return true;

    const code = firstCode(error);
    if (code === 1001 || CANCEL_CODES[code] === true) return true;
    if (error && error.error && CANCEL_ERROR_KEYS[error.error] === true) return true;

    const texts = collectTexts(error);
    for (let i = 0; i < texts.length; i++) {
      const raw = texts[i];
      if (!raw || isNonCancelAuthError(raw)) continue;
      const lower = raw.toLowerCase();
      if (CANCEL_ERROR_KEYS[lower] === true) return true;
      if (/authorizationerror(?:\s+error)?\s*1001/i.test(raw)) return true;
      if (/(?:^|[^\d])error\s*1001(?:[^\d]|$)/i.test(raw)) return true;
      if (/\bcancel(?:led|ed)?\b/i.test(raw)) return true;
      if (/user_cancelled|popup_closed_by_user/i.test(raw)) return true;
      // Swedish AuthenticationServices copy — "cancel" is not in the string.
      if (/avbr[oö]t|avbruten|avbryts/i.test(raw)) return true;
    }
    return false;
  }

  function canceledResult() {
    return { canceled: true };
  }

  function isCanceledOutcome(result) {
    return !result || result.canceled === true;
  }

  return {
    isAppleAuthCancellation: isAppleAuthCancellation,
    canceledResult: canceledResult,
    isCanceledOutcome: isCanceledOutcome,
  };
}));
