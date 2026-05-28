/**
 * Family statistics DB module.
 * Owns: family-level aggregate queries for public and admin stats.
 * Does NOT own: parent/child-level stats (user-stats.js), analytics (analytics.js).
 */

const db = require('../src/lib/db');

/**
 * Returns the number of "founder" families — those with an active
 * subscription status (active, trial, or beta).
 * Used by the landing page counter: "X/200 familjer har redan gått med".
 */
async function getFounderCount() {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM family
    WHERE subscription_status IN ('active', 'trial', 'beta')
  `);
  return parseInt(result.rows[0].total || 0);
}

module.exports = { getFounderCount };