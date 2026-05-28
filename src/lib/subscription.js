/**
 * Subscription access helpers for RevenueCat IAP + lifetime-free model.
 *
 * Does NOT gate on family_subscriptions.components — that is a separate
 * component-level system. This module handles subscription_status and
 * the is_lifetime_free flag on the family row.
 */

/**
 * Returns true if the family has active (paid) subscription status.
 * Families with is_lifetime_free=true are always treated as active
 * regardless of subscription_status value.
 *
 * @param {{ is_lifetime_free?: boolean, subscription_status?: string }} family
 * @returns {boolean}
 */
function hasActiveSubscription(family) {
  if (!family) return false;
  if (family.is_lifetime_free) return true;
  return (
    family.subscription_status === 'active' ||
    family.subscription_status === 'grace_period'
  );
}

module.exports = { hasActiveSubscription };