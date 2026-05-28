const fs = require('fs');
const path = require('path');

const locales = {};
const localesDir = path.join(__dirname, '..', 'locales');

/**
 * Load all locale files from src/locales/.
 */
function loadLocales() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const lang = file.replace('.json', '');
    locales[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
  }
  console.log(`[i18n] Loaded locales: ${Object.keys(locales).join(', ')}`);
}

/**
 * Get translation for a key in a specific language.
 * Supports nested keys with dot notation: "auth.login.title"
 */
function t(lang, key, params = {}) {
  const locale = locales[lang] || locales['sv'] || {};
  const keys = key.split('.');
  let value = locale;
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value !== 'string') return key;

  // Simple template replacement: {{name}} → params.name
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
}

/**
 * Get all translations for a language (for frontend).
 */
function getLocale(lang) {
  return locales[lang] || locales['sv'] || {};
}

/**
 * Get list of available languages.
 */
function getAvailableLanguages() {
  return Object.keys(locales);
}

module.exports = { loadLocales, t, getLocale, getAvailableLanguages };
