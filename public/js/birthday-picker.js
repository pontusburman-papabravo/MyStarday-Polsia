/**
 * Shared birthday picker module.
 * Handles year/month/day selects for child birthdates.
 * Supports two modes:
 *   - No arg: fixed IDs (onboarding)
 *   - prefix arg: dynamic IDs prefix+'Year'/'Month'/'Day' (dashboard, schedule, family)
 */

(function () {
  var MONTH_NAMES_SV = [
    'Januari','Februari','Mars','April','Maj','Juni',
    'Juli','Augusti','September','Oktober','November','December'
  ];

  /**
   * Initialize birthday year/month selects.
   * @param {string} [prefix] - ID prefix for dynamic lookup.
   *   If omitted, uses fixed IDs: childBirthdayYear/Month (onboarding).
   *   If provided, looks for: prefix+'Year', prefix+'Month', prefix+'Day'.
   */
  function initBirthdayPicker(prefix) {
    var yearSel, monthSel, daySel, daySelId;

    if (prefix) {
      yearSel  = document.getElementById(prefix + 'Year');
      monthSel = document.getElementById(prefix + 'Month');
      daySelId = prefix + 'Day';
    } else {
      // Onboarding / no-prefix mode: fixed IDs for childBirthday
      yearSel  = document.getElementById('childBirthdayYear');
      monthSel = document.getElementById('childBirthdayMonth');
      daySelId = 'childBirthdayDay';
    }

    if (!yearSel) return;

    var now = new Date();
    var curYear = now.getFullYear();

    // Years: current year down to 30 years ago
    for (var y = curYear; y >= curYear - 30; y--) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }

    // Months (full Swedish names)
    MONTH_NAMES_SV.forEach(function (name, i) {
      var opt = document.createElement('option');
      opt.value = String(i + 1).padStart(2, '0');
      opt.textContent = name;
      monthSel.appendChild(opt);
    });

    updateBirthdayDays(prefix);
  }

  /**
   * Populate day dropdown based on selected year+month.
   * Handles both prefix-based (dashboard/schedule) and fixed-ID (onboarding) modes.
   */
  function updateBirthdayDays(prefix) {
    var yearSel, monthSel, daySel;

    if (prefix) {
      yearSel  = document.getElementById(prefix + 'Year');
      monthSel = document.getElementById(prefix + 'Month');
      daySel   = document.getElementById(prefix + 'Day');
    } else {
      yearSel  = document.getElementById('childBirthdayYear');
      monthSel = document.getElementById('childBirthdayMonth');
      daySel   = document.getElementById('childBirthdayDay');
    }

    if (!daySel) return;

    var prevDay = daySel.value;
    var y = parseInt(yearSel.value) || new Date().getFullYear();
    var m = parseInt(monthSel.value) || 1;
    var daysInMonth = new Date(y, m, 0).getDate();

    daySel.innerHTML = '<option value="">Dag</option>';
    for (var d = 1; d <= daysInMonth; d++) {
      var opt = document.createElement('option');
      opt.value = String(d).padStart(2, '0');
      opt.textContent = d;
      daySel.appendChild(opt);
    }
    if (prevDay && parseInt(prevDay) <= daysInMonth) daySel.value = prevDay;
  }

  /**
   * Set the selected values of the birthday selects.
   * Call AFTER initBirthdayPicker so options exist.
   * @param {string} birthday - ISO date string 'YYYY-MM-DD' or null/undefined
   * @param {string} [prefix] - ID prefix (default: 'bd')
   */
  function setBirthdayValue(birthday, prefix) {
    if (!birthday) return;
    var parts = birthday.split('-');
    if (parts.length !== 3) return;
    var yearEl = document.getElementById((prefix || 'bd') + 'Year');
    var monthEl = document.getElementById((prefix || 'bd') + 'Month');
    var dayEl = document.getElementById((prefix || 'bd') + 'Day');
    if (yearEl) yearEl.value = parts[0];
    if (monthEl) monthEl.value = parts[1];
    if (dayEl) dayEl.value = parts[2];
  }

  // Expose globally
  window.initBirthdayPicker = initBirthdayPicker;
  window.updateBirthdayDays = updateBirthdayDays;
  window.setBirthdayValue = setBirthdayValue;
})();