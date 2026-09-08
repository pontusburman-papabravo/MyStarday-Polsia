'use strict';

/**
 * Opaque support reply-token contract.
 *
 * NEW_TOKEN_EXPIRY = 30 days
 *   Auto-archive of answered cases is 14 days. 30 days covers one answer cycle
 *   plus a user-reply buffer without eternal bearer links. Admin can regenerate.
 *
 * LEGACY_TOKEN_SUNSET = 2026-10-23 (Europe/Stockholm)
 *   Prod 2026-09-08: 18 contact_message rows, 0 active, 2 answered, 16 archived,
 *   3 answered in last 30d, 1 user_reply in last 30d. Outstanding relevant sf1
 *   links are those two answered rows plus recent bookmarks. 45 days from audit
 *   date covers the 30d answered window + 14d archive buffer.
 */

const TIMEZONE = 'Europe/Stockholm';
const TOKEN_PREFIX = 'sr1';
const LEGACY_PREFIX = 'sf1';
const TOKEN_BYTES = 32;
const NEW_TOKEN_EXPIRY_DAYS = 30;
const LEGACY_TOKEN_SUNSET = '2026-10-23';

function stockholmDateStamp(now) {
  const date = now instanceof Date ? now : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isLegacySunsetPassed(now) {
  return stockholmDateStamp(now) > LEGACY_TOKEN_SUNSET;
}

function expiryDate(from = new Date()) {
  return new Date(from.getTime() + NEW_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

module.exports = {
  TIMEZONE,
  TOKEN_PREFIX,
  LEGACY_PREFIX,
  TOKEN_BYTES,
  NEW_TOKEN_EXPIRY_DAYS,
  LEGACY_TOKEN_SUNSET,
  stockholmDateStamp,
  isLegacySunsetPassed,
  expiryDate,
};
