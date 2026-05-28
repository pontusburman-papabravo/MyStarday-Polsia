/**
 * Weekly summary scheduler.
 *
 * Fires every Sunday at 21:00 Europe/Stockholm time.
 * Aggregates stars earned, routines completed, and mood ratings for the past week.
 * Sends a formatted email to every parent with weekly_summary = true in notification_preference.
 *
 * Does NOT manage any other notification type — reward redemption notifications
 * live in src/routes/rewards.js.
 */

const db = require('./db');
const { sendEmail } = require('./email');
const { WEEKLY_SUMMARY_SCHEDULER_LOCK_ID } = require('./scheduler-constants');

/**
 * Day of month of the last Sunday in a given month.
 * @param {number} year  - e.g. 2026
 * @param {number} month - 0-indexed (0=January, 11=December)
 */
function lastSundayOfMonth(year, month) {
  // Last day of this month (day=0 in next month = last day of this)
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const dayOfWeek = lastDayOfMonth.getDay(); // 0=Sun
  const sunday = new Date(lastDayOfMonth.getTime() - dayOfWeek * 86400 * 1000);
  return sunday.getDate(); // 1–31
}

function msUntilNextSunday2100Stockholm() {
  const now = new Date();

  // Get current time parts in Stockholm timezone
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const localDow = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`).getDay(); // 0=Sun

  // Days until next Sunday (same day if it's Sunday and before 21:00)
  const currentHour = parseInt(parts.hour, 10);
  const currentMinute = parseInt(parts.minute, 10);
  let daysUntilSunday = (7 - localDow) % 7;
  if (daysUntilSunday === 0 && (currentHour < 21 || (currentHour === 21 && currentMinute === 0))) {
    daysUntilSunday = 0; // today is Sunday and we haven't fired yet
  } else if (daysUntilSunday === 0) {
    daysUntilSunday = 7; // Sunday but past 21:00 — wait until next week
  }

  // Build a Date representing next Sunday 21:00 in Stockholm local time
  const nextSundayLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T21:00:00`);
  nextSundayLocal.setDate(nextSundayLocal.getDate() + daysUntilSunday);

  // Determine which year the next Sunday falls in (may roll over to next year)
  const stockholmYear = parseInt(
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric' }).format(nextSundayLocal),
    10
  );

  // Sweden DST: last Sunday of March (02:00→03:00) to last Sunday of October (03:00→02:00)
  const dstStart = lastSundayOfMonth(stockholmYear, 2); // March
  const dstEnd = lastSundayOfMonth(stockholmYear, 9);   // October
  const stockholmDay = nextSundayLocal.getDate();
  const stockholmMonth = nextSundayLocal.getMonth() + 1; // 1-indexed

  let offsetMs;
  if (stockholmMonth > 3 && stockholmMonth < 10) {
    offsetMs = 2 * 3600 * 1000; // definitely summer
  } else if (stockholmMonth === 3 && stockholmDay >= dstStart) {
    offsetMs = 2 * 3600 * 1000; // after DST start (last Sun of March)
  } else if (stockholmMonth === 10 && stockholmDay < dstEnd) {
    offsetMs = 2 * 3600 * 1000; // before DST end (last Sun of October)
  } else {
    offsetMs = 1 * 3600 * 1000; // winter
  }

  const utcMs = nextSundayLocal.getTime() - offsetMs;
  return Math.max(0, utcMs - now.getTime());
}

/**
 * Aggregate data for a child over the past 7 days.
 */
async function aggregateChildWeek(childId, startDate, endDate) {
  const starsResult = await db.query(
    `SELECT COALESCE(SUM(dli.star_value), 0) AS stars_earned,
            COUNT(*) FILTER (WHERE dli.completed = true) AS routines_completed,
            COUNT(*) AS routines_total
     FROM daily_log dl
     JOIN daily_log_item dli ON dli.daily_log_id = dl.id
     WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3`,
    [childId, startDate, endDate]
  );

  // Mood: average of child ratings (score 1–10) from this week
  const moodResult = await db.query(
    `SELECT ROUND(AVG(r.score), 1) AS avg_mood, COUNT(*) AS mood_count
     FROM rating r
     JOIN daily_log_item dli ON dli.id = r.daily_log_item_id
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3
       AND r.user_type = 'child'`,
    [childId, startDate, endDate]
  );

  return {
    starsEarned: parseInt(starsResult.rows[0].stars_earned, 10),
    routinesCompleted: parseInt(starsResult.rows[0].routines_completed, 10),
    routinesTotal: parseInt(starsResult.rows[0].routines_total, 10),
    avgMood: moodResult.rows[0].avg_mood ? parseFloat(moodResult.rows[0].avg_mood) : null,
    moodCount: parseInt(moodResult.rows[0].mood_count, 10),
  };
}

/**
 * Format a mood score (1–10) as a Swedish description with emoji.
 */
function formatMood(score) {
  if (score === null) return null;
  if (score >= 8) return `Väldigt glad 😄 (${score}/10)`;
  if (score >= 6) return `Glad 🙂 (${score}/10)`;
  if (score >= 4) return `Neutral 😐 (${score}/10)`;
  return `Ledsen 😔 (${score}/10)`;
}

/**
 * Build HTML email body for the weekly summary.
 */
function buildWeeklySummaryHtml(parentName, weekLabel, children) {
  const firstName = (parentName || '').split(' ')[0] || 'Förälder';

  const childSections = children.map(({ child, stats }) => {
    const completionPct = stats.routinesTotal > 0
      ? Math.round((stats.routinesCompleted / stats.routinesTotal) * 100)
      : 0;

    const moodLine = stats.avgMood !== null && stats.moodCount >= 2
      ? `<tr><td style="padding:4px 0;color:#5A6178;">Humör (snitt)</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#1B2340;">${formatMood(stats.avgMood)}</td></tr>`
      : '';

    return `
      <div style="border:1px solid #E8ECF4;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="margin:0 0 12px;color:#1B2340;font-size:18px;">${child.emoji || '⭐'} ${child.name}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#5A6178;">Intjänade stjärnor</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;color:#F5A623;">⭐ ${stats.starsEarned}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#5A6178;">Avklarade rutiner</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;color:#1B2340;">${stats.routinesCompleted} av ${stats.routinesTotal} (${completionPct}%)</td>
          </tr>
          ${moodLine}
        </table>
        <div style="margin-top:12px;background:#E8F5E9;border-radius:8px;height:8px;overflow:hidden;">
          <div style="background:#4CAF50;height:8px;width:${completionPct}%;border-radius:8px;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
      <h2 style="color:#1B2340;margin-bottom:4px;">Hej ${firstName}! 👋</h2>
      <p style="color:#5A6178;margin-top:0;">Här är veckans sammanfattning för <strong>${weekLabel}</strong>.</p>

      ${childSections}

      <div style="background:#FFF3D6;border-left:4px solid #F5A623;border-radius:8px;padding:14px 16px;margin-top:8px;">
        <p style="margin:0;color:#1B2340;font-size:14px;">
          🌟 Fortsätt det fantastiska arbetet! Varje avklarad rutin bygger vanor för livet.
        </p>
      </div>

      <p style="margin-top:24px;font-size:14px;color:#5A6178;">
        Du kan hantera e-postaviseringar under <strong>Inställningar → Aviseringar</strong> i appen.
      </p>
    </div>
  `;
}

// Unique integer lock ID for this scheduler (imported from scheduler-constants)

/**
 * Send weekly summary emails to all opted-in parents.
 */
async function runWeeklySummaryJob() {
  // Advisory lock prevents duplicate emails if multiple instances fire at the same time
  let lockAcquired = false;
  try {
    const { rows } = await db.query('SELECT pg_try_advisory_lock($1) AS acquired', [WEEKLY_SUMMARY_SCHEDULER_LOCK_ID]);
    lockAcquired = rows[0].acquired;
  } catch (err) {
    console.error('[WEEKLY-SUMMARY] Failed to acquire advisory lock:', err.message);
    // Fail-open: sending duplicate emails is less harmful than not sending any
    lockAcquired = true;
  }

  if (!lockAcquired) {
    console.log('[WEEKLY-SUMMARY] Skipping — another instance holds the lock');
    return;
  }

  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDateObj = new Date(now);
  startDateObj.setDate(startDateObj.getDate() - 6);
  const startDate = startDateObj.toISOString().slice(0, 10);

  const weekLabel = `${startDate} – ${endDate}`;
  console.log(`[WEEKLY-SUMMARY] Starting job for ${weekLabel}`);

  let sentCount = 0;
  let errorCount = 0;

  try {
    // Fetch all parents with weekly_summary enabled and email_enabled
    const parentsResult = await db.query(
      `SELECT p.id AS parent_id, p.email, p.name AS parent_name, p.family_id
       FROM parent p
       JOIN notification_preference np ON np.parent_id = p.id
       WHERE np.weekly_summary = true AND np.email_enabled = true
         AND p.verified = true`,
      []
    );

    console.log(`[WEEKLY-SUMMARY] Found ${parentsResult.rows.length} opted-in parents`);

    for (const parent of parentsResult.rows) {
      try {
        // Get children linked to this parent
        const childrenResult = await db.query(
          `SELECT c.id, c.name, c.emoji
           FROM child c
           JOIN parent_child pc ON pc.child_id = c.id
           WHERE pc.parent_id = $1
           ORDER BY c.sort_order ASC, c.created_at ASC`,
          [parent.parent_id]
        );

        if (childrenResult.rows.length === 0) continue;

        // Aggregate stats for each child
        const childData = [];
        for (const child of childrenResult.rows) {
          const stats = await aggregateChildWeek(child.id, startDate, endDate);
          childData.push({ child, stats });
        }

        // Skip if all children have zero activity this week
        const totalStars = childData.reduce((sum, c) => sum + c.stats.starsEarned, 0);
        const totalRoutines = childData.reduce((sum, c) => sum + c.stats.routinesTotal, 0);
        if (totalStars === 0 && totalRoutines === 0) {
          console.log(`[WEEKLY-SUMMARY] Skipping ${parent.email} — no activity this week`);
          continue;
        }

        const html = buildWeeklySummaryHtml(parent.parent_name, weekLabel, childData);
        await sendEmail({
          to: parent.email,
          subject: `Veckans sammanfattning ⭐ — ${weekLabel}`,
          html,
        });

        sentCount++;
        console.log(`[WEEKLY-SUMMARY] Sent to ${parent.email}`);
      } catch (err) {
        errorCount++;
        console.error(`[WEEKLY-SUMMARY] Failed for parent ${parent.parent_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[WEEKLY-SUMMARY] Job failed:', err.message);
  } finally {
    await db.query('SELECT pg_advisory_unlock($1)', [WEEKLY_SUMMARY_SCHEDULER_LOCK_ID]).catch(() => {});
  }

  console.log(`[WEEKLY-SUMMARY] Done. Sent=${sentCount} Errors=${errorCount}`);
}

let _timer = null;

function scheduleNextRun() {
  const ms = msUntilNextSunday2100Stockholm();
  const minutes = Math.round(ms / 60000);
  console.log(`[WEEKLY-SUMMARY] Next run in ${minutes} minutes (next Sunday 21:00 Stockholm)`);
  _timer = setTimeout(async () => {
    await runWeeklySummaryJob();
    scheduleNextRun(); // reschedule after each run
  }, ms);
  if (_timer.unref) _timer.unref();
}

/**
 * Start the weekly summary scheduler. Call once at server startup.
 */
function startWeeklySummaryScheduler() {
  scheduleNextRun();
  console.log('[WEEKLY-SUMMARY] Scheduler started');
}

/**
 * Stop the scheduler (for tests / graceful shutdown).
 */
function stopWeeklySummaryScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

/**
 * Run the job immediately (for manual trigger / testing).
 */
async function runWeeklySummaryNow() {
  return runWeeklySummaryJob();
}

module.exports = { startWeeklySummaryScheduler, stopWeeklySummaryScheduler, runWeeklySummaryNow };
