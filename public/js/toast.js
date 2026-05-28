/**
 * Shared toast notification module.
 * Works with all existing showToast call signatures across the app.
 * The toast element is created dynamically if not present in the DOM.
 */

(function () {
  let _timer = null;

  /**
   * Show a toast notification.
   * Signature variations from across the codebase:
   *   showToast(msg)                        — default navy, 3s
   *   showToast(msg, error)                 — error bool, 3s
   *   showToast(msg, type)                  — type 'error' triggers red, 3s
   *   showToast(msg, isError, duration)     — bool + custom duration
   */
  function showToast(msg, arg2, arg3) {
    var isError = false;
    var duration = 3000;

    if (typeof arg2 === 'boolean') {
      isError = arg2;
      if (typeof arg3 === 'number') duration = arg3;
    } else if (typeof arg2 === 'string') {
      isError = (arg2 === 'error');
    }

    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }

    el.textContent = msg;
    var bg = isError ? 'bg-red-500 text-white' : 'bg-navy text-white';
    // Use CSS custom property to respect safe-area-inset (notch/Dynamic Island/PWA)
    el.className = 'fixed z-50 px-6 py-3 rounded-xl shadow-lg font-semibold text-sm max-w-xs ' + bg;
    el.style.top = 'max(1rem, env(safe-area-inset-top, 1rem))';
    el.style.right = 'max(1rem, env(safe-area-inset-right, 1rem))';

    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { el.classList.add('hidden'); }, duration);
  }

  /**
   * Show a green success toast.
   * Signature: showSuccessToast(msg, duration)
   */
  function showSuccessToast(msg, arg2) {
    var duration = (typeof arg2 === 'number') ? arg2 : 3000;

    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }

    el.textContent = msg;
    el.className = 'fixed z-50 px-6 py-3 rounded-xl shadow-lg font-semibold text-sm max-w-xs bg-green-600 text-white';
    el.style.top = 'max(1rem, env(safe-area-inset-top, 1rem))';
    el.style.right = 'max(1rem, env(safe-area-inset-right, 1rem))';

    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { el.classList.add('hidden'); }, duration);
  }

  // Expose globally
  window.showToast = showToast;
  window.showSuccessToast = showSuccessToast;
})();