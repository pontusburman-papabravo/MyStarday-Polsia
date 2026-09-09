/**
 * oauth-registration-payload.js — attach pre-auth country + locale to OAuth signup requests.
 * Country comes from CountryChoice session storage (independent from language).
 */
(function oauthRegistrationPayloadModule() {
  'use strict';

  function withOAuthRegistrationFields(body) {
    let payload = body && typeof body === 'object' ? Object.assign({}, body) : {};
    if (window.LoginLocale && typeof window.LoginLocale.withLoginLocale === 'function') {
      payload = window.LoginLocale.withLoginLocale(payload);
    }
    if (window.CountryChoice && typeof window.CountryChoice.isConfirmed === 'function' && window.CountryChoice.isConfirmed()) {
      const countryCode = typeof window.CountryChoice.getCountryCode === 'function'
        ? window.CountryChoice.getCountryCode()
        : null;
      if (countryCode) {
        payload.country_code = countryCode;
      }
    }
    if (window.AppleAuthCompletion && typeof window.AppleAuthCompletion.termsChecked === 'function') {
      if (window.AppleAuthCompletion.termsChecked()) {
        payload.terms_accepted = true;
      }
    } else {
      const termsEl = document.getElementById('appleTermsAccepted')
        || document.getElementById('appleCompletionTermsAccepted')
        || document.getElementById('termsAccepted');
      if (termsEl && termsEl.checked) {
        payload.terms_accepted = true;
      }
    }
    return payload;
  }

  window.OAuthRegistrationPayload = {
    withOAuthRegistrationFields,
  };
})();
