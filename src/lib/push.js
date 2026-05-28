/**
 * Web Push trigger helpers.
 * Owns: high-level notification triggers with preference checks + activity-completion debounce.
 * Delegates sending to push-notifications.js (VAPID + web-push).
 * Does NOT own: subscription storage, VAPID configuration.
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');

/**
 * Get all parents in a family with their push_preferences.
 */
async function getFamilyParents(familyId) {
  try {
    const result = await db.query(
      `SELECT p.id, p.push_preferences, p.admin_push_enabled
       FROM parent p WHERE p.family_id = $1`,
      [familyId]
    );
    return result.rows;
  } catch (_) {
    return [];
  }
}

function isPushEnabled(parent) {
  const prefs = parent.push_preferences || {};
  return prefs.enabled === true;
}

function isPushEnabledForChild(parent, childId) {
  if (!isPushEnabled(parent)) return false;
  const prefs = parent.push_preferences || {};
  const perChild = prefs.per_child || {};
  return perChild[String(childId)] !== false;
}

// ── Activity-completion debounce ─────────────────────────────────────────────
// In-memory map: `${familyId}:${childId}` → { timer, count, childName, activities[] }
// If a child completes 3+ activities within 2 minutes, coalesce into one summary push.
const DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes
const BATCH_THRESHOLD = 3;
const _pendingCompletions = new Map();

function _flushCompletionBatch(key, familyId, childId, excludeParentId) {
  const pending = _pendingCompletions.get(key);
  if (!pending) return;
  _pendingCompletions.delete(key);

  const { childName, activities } = pending;
  let title, body;

  if (activities.length >= BATCH_THRESHOLD) {
    title = `⭐ ${childName}`;
    body = `har klargjort ${activities.length} aktiviteter!`;
  } else {
    // Single (or two) completions — send one push per activity
    for (const activityName of activities) {
      _sendParentsPush(familyId, childId, excludeParentId, `⭐ ${childName}`, `har klargjort ${activityName}!`);
    }
    return;
  }

  _sendParentsPush(familyId, childId, excludeParentId, title, body);
}

async function _sendParentsPush(familyId, childId, excludeParentId, title, body) {
  try {
    const parents = await getFamilyParents(familyId);
    for (const parent of parents) {
      // Skip the acting parent (no self-notifications when parent marks for child)
      if (excludeParentId && parent.id === excludeParentId) continue;
      if (!isPushEnabledForChild(parent, childId)) continue;
      sendPushNotification(parent.id, {
        title,
        body,
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] _sendParentsPush error:', err.message);
  }
}

/**
 * Notify parents when a child (or parent on behalf of child) completes an activity.
 *
 * @param {string} familyId
 * @param {string} childId
 * @param {string} childName
 * @param {string} activityName
 * @param {string|null} excludeParentId - Parent ID to exclude (self-notification guard).
 *   Pass null when a child is completing their own activity (notify all parents).
 *   Pass the parent's ID when a parent marks an activity done (skip that parent).
 */
async function notifyParentsChildCompleted(familyId, childId, childName, activityName, excludeParentId = null) {
  try {
    const key = `${familyId}:${childId}`;
    const existing = _pendingCompletions.get(key);

    if (existing) {
      // Accumulate into the running batch; reset the flush timer
      clearTimeout(existing.timer);
      existing.activities.push(activityName);
      existing.timer = setTimeout(() => _flushCompletionBatch(key, familyId, childId, excludeParentId), DEBOUNCE_MS);

      // If we just hit the batch threshold, flush immediately
      if (existing.activities.length === BATCH_THRESHOLD) {
        clearTimeout(existing.timer);
        _flushCompletionBatch(key, familyId, childId, excludeParentId);
      }
    } else {
      // First completion — start a debounce window
      const timer = setTimeout(() => _flushCompletionBatch(key, familyId, childId, excludeParentId), DEBOUNCE_MS);
      _pendingCompletions.set(key, {
        timer,
        childName,
        activities: [activityName],
      });
    }
  } catch (err) {
    console.error('[PUSH] notifyParentsChildCompleted error:', err.message);
  }
}

/**
 * Notify parents when a star is granted to a child.
 */
async function notifyChildStarGranted(childId, childName, starCount, parentName) {
  try {
    const result = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (!result.rows[0]) return;
    const familyId = result.rows[0].family_id;
    const parents = await getFamilyParents(familyId);
    for (const parent of parents) {
      if (!isPushEnabled(parent)) continue;
      sendPushNotification(parent.id, {
        title: `🌟 ${starCount} stjärnor till ${childName}!`,
        body: `${parentName} gav ${childName} ${starCount} stjärna${starCount > 1 ? 'r' : ''}!`,
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] notifyChildStarGranted error:', err.message);
  }
}

/**
 * Notify all parents in a family when a child requests a reward redemption.
 */
async function notifyParentsRewardRequest(familyId, childId, childName, rewardName) {
  try {
    const parents = await getFamilyParents(familyId);
    for (const parent of parents) {
      if (!isPushEnabledForChild(parent, childId)) continue;
      sendPushNotification(parent.id, {
        title: `🎁 ${childName} vill lösa in en belöning!`,
        body: `${childName} ber om: ${rewardName}`,
        icon: '/icon-192.png',
        url: '/dashboard',
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[PUSH] notifyParentsRewardRequest error:', err.message);
  }
}

module.exports = {
  notifyParentsChildCompleted,
  notifyChildStarGranted,
  notifyParentsRewardRequest,
};
