/**
 * Min Stjärndag i18n module.
 * Loads locale strings and applies them to DOM elements with data-i18n attributes.
 */
const I18n = {
  locale: {},
  lang: 'sv',

  async load(lang = 'sv') {
    try {
      const res = await fetch(`/api/i18n/${lang}`);
      this.locale = await res.json();
      this.lang = lang;
      this.apply();
    } catch (err) {
      console.warn('[i18n] Failed to load locale:', err);
    }
  },

  /**
   * Get a translation by dot-notation key.
   * Example: I18n.t('auth.login.title')
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.locale;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
  },

  /**
   * Apply translations to all elements with data-i18n attributes.
   */
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text !== key) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text !== key) el.placeholder = text;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const text = this.t(key);
      if (text !== key) el.innerHTML = text;
    });
  },
};

// Auto-load Swedish locale on page load
document.addEventListener('DOMContentLoaded', () => I18n.load('sv'));
