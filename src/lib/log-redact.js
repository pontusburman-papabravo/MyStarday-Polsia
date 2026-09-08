'use strict';

/**
 * Redact PII before writing to server logs (N12).
 */

/**
 * Mask email for logs: `a***@example.com`. Non-strings → '(redacted)'.
 * @param {string|null|undefined} email
 * @returns {string}
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '(redacted)';
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) return '(redacted)';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

const SUPPORT_TOKEN_IN_PATH = /\/support\/svar\/(?:sr1|sf1)\.[A-Za-z0-9._~-]+/gi;
const SUPPORT_TOKEN_QUERY = /([?&]token=)([^&#\s]+)/gi;
const SUPPORT_TOKEN_BARE = /\b(?:sr1|sf1)\.[A-Za-z0-9._~-]{8,}/gi;

function redactSupportText(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  return value
    .replace(SUPPORT_TOKEN_IN_PATH, '/support/svar/[REDACTED]')
    .replace(SUPPORT_TOKEN_QUERY, '$1[REDACTED]')
    .replace(SUPPORT_TOKEN_BARE, '[REDACTED]');
}

function redactSupportUrl(url) {
  return redactSupportText(url);
}

module.exports = { maskEmail, redactSupportText, redactSupportUrl };
