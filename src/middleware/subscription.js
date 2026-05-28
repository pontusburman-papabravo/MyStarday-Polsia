/**
 * Subscription paywall middleware.
 * Owns: enforcing subscription_status requirements on protected API routes.
 * Does NOT own: Stripe webhook handling, payment creation, checkout session verification.
 */

const db = require('../lib/db');

const BETA_FREEZE_DATE = new Date('2027-06-30T23:59:59Z');

/**
 * Express middleware that requires an active subscription.
 * Must be mounted AFTER auth middleware so req.user is available.
 * Allows: beta (free until 2027-06-30), active (paying), valid trial.
 * Blocks: expired trial, expired, unknown.
 */
function requireActiveSubscription(req, res, next) {
  if (!req.user?.family_id) return next();
  db.query(
    `SELECT subscription_status, trial_ends_at
     FROM family WHERE id = $1`,
    [req.user.family_id]
  ).then(({ rows }) => {
    if (rows.length === 0) return res.status(401).json({ error: 'Familj hittades inte' });
    const { subscription_status, trial_ends_at } = rows[0];

    // Beta families are free until 2027-06-30
    if (subscription_status === 'beta' && new Date() <= BETA_FREEZE_DATE) return next();
    if (subscription_status === 'active') return next();
    if (subscription_status === 'trial' && trial_ends_at && new Date(trial_ends_at) > new Date()) return next();

    return res.status(402).json({ error: 'subscription_required', upgrade_url: '/upgrade' });
  }).catch(err => {
    req.log?.error({ msg: 'subscription check failed', operation: 'subscription.require', error: err.message });
    return res.status(500).json({ error: 'Kunde inte verifiera prenumeration' });
  });
}

module.exports = { requireActiveSubscription };