/**
 * Shared date utilities for ISO date-string arithmetic.
 *
 * All functions work on ISO YYYY-MM-DD strings and use UTC arithmetic
 * (midday UTC trick) to avoid DST off-by-one errors.
 *
 * Does NOT own: database, scheduling, or business logic.
 */

/**
 * Add (or subtract) whole days from an ISO date string.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - positive = forward, negative = backward
 * @returns {string} YYYY-MM-DD
 */
function addDaysIso(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Get the Monday of the week containing the given ISO date string.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} YYYY-MM-DD of that week's Monday
 */
function getWeekMondayIso(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // days to go back to get Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

module.exports = { addDaysIso, getWeekMondayIso };