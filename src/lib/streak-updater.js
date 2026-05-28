/**
 * Midnight streak updater.
 * Iterates over all children, checks whether they completed at least one
 * activity yesterday (in their local timezone), and updates their streak.
 *
 * NOTE: cycle_day column is not updated here. Its meaning needs verification
 * before any change — see Bug #13 task notes.
 */
const db = require('./db');
const { getLocalDateStr } = require('./daily-log-generator');

/**
 * Returns the UTC date string for "yesterday" in a given timezone.
 * Uses the same T12:00:00Z trick as daily-log-generator to avoid
 * off-by-one errors at timezone boundaries.
 */
function yesterdayLocalStr(timezone) {
  const today = getLocalDateStr(new Date(), timezone);
  const [y, m, d] = today.split('-').map(Number);
  const localMidnight = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  localMidnight.setUTCDate(localMidnight.getUTCDate() - 1);
  return localMidnight.toISOString().slice(0, 10);
}

async function updateAllStreaks() {
  const children = await db.query(
    `SELECT c.id AS child_id, COALESCE(c.timezone, 'Europe/Stockholm') AS timezone
     FROM child c
     WHERE EXISTS (SELECT 1 FROM streak WHERE child_id = c.id)`
  );

  for (const child of children.rows) {
    const yesterday = yesterdayLocalStr(child.timezone);

    const countRes = await db.query(
      `SELECT COUNT(*) FILTER (WHERE dli.completed) AS completed_count
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = $1 AND dl.date = $2`,
      [child.child_id, yesterday]
    );

    const hadActivity = parseInt(countRes.rows[0]?.completed_count ?? 0, 10) > 0;

    if (hadActivity) {
      // Activity completed yesterday — increment streak, or start new if gap
      await db.query(
        `UPDATE streak SET
           current_streak = CASE
             WHEN last_active_date = $2::date - INTERVAL '1 day' THEN current_streak + 1
             ELSE 1
           END,
           last_active_date = $2
         WHERE child_id = $1`,
        [child.child_id, yesterday]
      );
    } else {
      // No activity — break streak only if there was a gap before yesterday
      await db.query(
        `UPDATE streak SET current_streak = 0
         WHERE child_id = $1
           AND (last_active_date IS NULL
                OR last_active_date < $2::date - INTERVAL '1 day')`,
        [child.child_id, yesterday]
      );
    }
  }
}

module.exports = { updateAllStreaks };