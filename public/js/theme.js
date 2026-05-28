/**
 * Min Stjärndag Theme System
 * Handles dark mode and color blindness themes.
 *
 * Usage: Include this script on any page. It auto-applies the saved theme on load.
 * Toggle dark mode: Theme.toggleDark()
 * Set color blindness: Theme.setColorBlind('none' | 'protanopia' | 'deuteranopia' | 'tritanopia')
 */
const Theme = {
  STORAGE_KEY_DARK: 'stjarndag_dark_mode',
  STORAGE_KEY_CB: 'stjarndag_color_blind',

  /**
   * Initialize: apply saved preferences on page load.
   */
  init() {
    // Dark mode
    const darkPref = localStorage.getItem(this.STORAGE_KEY_DARK);
    if (darkPref === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Color blindness
    const cbPref = localStorage.getItem(this.STORAGE_KEY_CB) || 'none';
    this._applyColorBlind(cbPref);
  },

  /**
   * Toggle dark mode on/off.
   */
  toggleDark() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(this.STORAGE_KEY_DARK, isDark);
    return isDark;
  },

  /**
   * Set dark mode explicitly.
   */
  setDark(enabled) {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(this.STORAGE_KEY_DARK, enabled);
  },

  /**
   * Get current dark mode state.
   */
  isDark() {
    return document.documentElement.classList.contains('dark');
  },

  /**
   * Set color blindness mode.
   * @param {'none'|'protanopia'|'deuteranopia'|'tritanopia'} mode
   */
  setColorBlind(mode) {
    localStorage.setItem(this.STORAGE_KEY_CB, mode);
    this._applyColorBlind(mode);
  },

  /**
   * Get current color blindness mode.
   */
  getColorBlind() {
    return localStorage.getItem(this.STORAGE_KEY_CB) || 'none';
  },

  /**
   * Apply color blindness CSS filter to the document.
   */
  _applyColorBlind(mode) {
    // Remove all cb classes first
    document.documentElement.classList.remove('cb-protanopia', 'cb-deuteranopia', 'cb-tritanopia');
    if (mode && mode !== 'none') {
      document.documentElement.classList.add(`cb-${mode}`);
    }
  },
};

// Auto-init on script load (before DOMContentLoaded to prevent FOUC)
Theme.init();
