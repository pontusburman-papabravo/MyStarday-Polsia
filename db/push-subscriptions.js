/**
 * Push subscription queries — handles both Web Push (endpoint) and
 * native iOS/Android (native_token) subscription storage.
 * Owns: all push_subscriptions access.
 * Does NOT own: sending notifications (src/lib/push-notifications.js).
 */

const { query } = require('../src/lib/db');

/**
 * Upsert a web push subscription (endpoint-based).
 * One endpoint = one subscription, regardless of parent.
 */
async function upsertWebSubscription(parentId, endpoint, subscriptionJson) {
  await query(
    `INSERT INTO push_subscriptions (parent_id, endpoint, subscription_json, platform, updated_at)
     VALUES ($1, $2, $3, 'web', NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       parent_id = EXCLUDED.parent_id,
       subscription_json = EXCLUDED.subscription_json,
       updated_at = NOW()`,
    [parentId, endpoint, JSON.stringify(subscriptionJson)]
  );
}

/**
 * Upsert a native push subscription (APNs / FCM token).
 * Uses (parent_id, native_token, platform) as unique key so the same device
 * token is re-registered to the same parent on app re-open.
 * A token that belongs to a different parent is NOT overwritten.
 */
async function upsertNativeSubscription(parentId, nativeToken, platform) {
  await query(
    `INSERT INTO push_subscriptions (parent_id, native_token, platform, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (parent_id, native_token, platform)
     DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = NOW()`,
    [parentId, nativeToken, platform]
  );
}

/**
 * Remove a web push subscription.
 */
async function deleteWebSubscription(parentId, endpoint) {
  await query(
    'DELETE FROM push_subscriptions WHERE parent_id = $1 AND endpoint = $2 AND platform = $3',
    [parentId, endpoint, 'web']
  );
}

/**
 * Remove a native push subscription.
 */
async function deleteNativeSubscription(parentId, nativeToken, platform) {
  await query(
    'DELETE FROM push_subscriptions WHERE parent_id = $1 AND native_token = $2 AND platform = $3',
    [parentId, nativeToken, platform]
  );
}

/**
 * Get all web subscriptions for a parent (for sending via web-push).
 */
async function getWebSubscriptions(parentId) {
  const result = await query(
    `SELECT id, endpoint, subscription_json FROM push_subscriptions
     WHERE parent_id = $1 AND platform = 'web'`,
    [parentId]
  );
  return result.rows.map(r => ({
    id: r.id,
    endpoint: r.endpoint,
    subscriptionJson: r.subscription_json,
  }));
}

/**
 * Get all native subscriptions for a parent (for sending via APNs/FCM).
 * Returns rows grouped by platform: 'ios' | 'android'.
 */
async function getNativeSubscriptions(parentId) {
  const result = await query(
    `SELECT id, native_token, platform FROM push_subscriptions
     WHERE parent_id = $1 AND platform IN ('ios', 'android') AND native_token IS NOT NULL`,
    [parentId]
  );
  return result.rows.map(r => ({
    id: r.id,
    nativeToken: r.native_token,
    platform: r.platform,
  }));
}

/**
 * Get all distinct parents that have any push subscription (for broadcast).
 */
async function getAllSubscribedParentIds() {
  const result = await query('SELECT DISTINCT parent_id FROM push_subscriptions');
  return result.rows.map(r => r.parent_id);
}

/**
 * Clean up expired native subscriptions by parent + platform.
 * Pass a token string to delete a specific one, or leave null to get all stale ones.
 */
async function deleteExpiredNativeSubscription(parentId, nativeToken, platform) {
  await query(
    'DELETE FROM push_subscriptions WHERE parent_id = $1 AND native_token = $2 AND platform = $3',
    [parentId, nativeToken, platform]
  );
}

/**
 * Delete a native subscription by token + platform (no parent_id required).
 * Used by sendAPNs when Apple returns BadDeviceToken/Unregistered so the
 * expired token is cleaned up without needing the parent context.
 */
async function deleteNativeSubscriptionByToken(nativeToken, platform) {
  await query(
    'DELETE FROM push_subscriptions WHERE native_token = $1 AND platform = $2',
    [nativeToken, platform]
  );
}

module.exports = {
  upsertWebSubscription,
  upsertNativeSubscription,
  deleteWebSubscription,
  deleteNativeSubscription,
  deleteNativeSubscriptionByToken,
  getWebSubscriptions,
  getNativeSubscriptions,
  getAllSubscribedParentIds,
  deleteExpiredNativeSubscription,
};