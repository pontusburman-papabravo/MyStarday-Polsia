'use strict';

/**
 * Locale for support communications.
 * Uses repo canonical locale helpers — no parallel locale model.
 *
 * Priority:
 * 1. contact_message.metadata.locale
 * 2. family.preferred_locale when family_id is linked
 * 3. explicit stored/request locale
 * 4. Accept-Language
 * 5. sv-SE
 */

const db = require('./db');
const {
  DEFAULT_LOCALE,
  normalizeLocale,
  validateLocale,
  parseAcceptLanguage,
} = require('./locale');
const { resolveCommunicationLocale } = require('./communication-locale');

function localeFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  return normalizeLocale(metadata.locale || metadata.preferred_locale || null);
}

async function familyLocale(familyId) {
  if (!familyId) return null;
  const { rows } = await db.query(
    `SELECT preferred_locale FROM family WHERE id = $1 LIMIT 1`,
    [familyId]
  );
  return normalizeLocale(rows[0]?.preferred_locale);
}

async function resolveSupportLocale({
  metadata,
  familyId,
  explicit,
  acceptLanguage,
} = {}) {
  const fromMeta = localeFromMetadata(metadata);
  if (fromMeta) return fromMeta;

  const fromFamily = await familyLocale(familyId);
  if (fromFamily) return resolveCommunicationLocale(fromFamily);

  const fromExplicit = normalizeLocale(explicit);
  if (fromExplicit) return fromExplicit;

  const fromHeader = parseAcceptLanguage(acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}

function resolveSupportLocaleSync({ metadata, explicit, acceptLanguage } = {}) {
  return (
    localeFromMetadata(metadata)
    || normalizeLocale(explicit)
    || parseAcceptLanguage(acceptLanguage)
    || DEFAULT_LOCALE
  );
}

function isEnglishLocale(locale) {
  return validateLocale(locale) === 'en-GB';
}

module.exports = {
  resolveSupportLocale,
  resolveSupportLocaleSync,
  localeFromMetadata,
  isEnglishLocale,
};
