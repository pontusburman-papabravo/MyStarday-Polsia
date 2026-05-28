/**
 * dom-utils.js -- shared DOM safety utilities.
 *
 * Exposes a single escapeHtml() function that must be used whenever
 * user-supplied content is interpolated into an innerHTML template.
 *
 * Load this script before any script that calls innerHTML with dynamic data.
 * Then call window.escapeHtml(str) or just escapeHtml(str).
 */
(function (root) {
  'use strict';

  /**
   * Escape a string for safe insertion into HTML.
   * Covers the five characters that matter for HTML injection:
   *   & < > " '
   *
   * @param {*} str - Value to escape. Non-strings are coerced.
   * @returns {string} HTML-safe string.
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  root.escapeHtml = escapeHtml;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
