/**
 * Pedagog notes DB module.
 * Owns: pedagog_notes CRUD for pedagog role parents.
 * Does NOT own: child, parent, parent_child — read-only joins only.
 */

const db = require('../src/lib/db');

/**
 * List children the given pedagog has access to via parent_child.role = 'pedagog'.
 */
async function getPedagogChildren(pedagogId) {
  const result = await db.query(`
    SELECT c.id, c.name, c.emoji, c.birthday
    FROM child c
    JOIN parent_child pc ON pc.child_id = c.id
    WHERE pc.parent_id = $1 AND pc.role = 'pedagog'
    ORDER BY c.name
  `, [pedagogId]);
  return result.rows;
}

/**
 * Get or create (upsert) a pedagog note.
 * Ghost draft protection: if existing note is is_draft=false (published),
 * the incoming isDraft=true cannot overwrite is_draft to true again.
 * isDraft=null means "auto-save draft" (use incoming value, default true).
 * isDraft=false means "mark as done" — always sets is_draft=false.
 * Returns the note row.
 */
async function upsertNote({ childId, pedagogId, date, mood, sleepQuality, sleepHours, meals, behavior, notes, mealsStructured, isDraft }) {
  // Ghost draft protection: query existing note first
  const existing = await getNote(childId, pedagogId, date);
  const draftFlag = (existing && existing.is_draft === false)
    ? false  // already published — preserve published state
    : (isDraft !== false);  // null (autosave) or true → use incoming value (default true); false → explicit done

  const result = await db.query(`
    INSERT INTO pedagog_notes (child_id, pedagog_id, date, mood, sleep_quality, sleep_hours, meals, behavior, notes, meals_structured, is_draft, updated_at)
    VALUES ($1, $2, $3::DATE, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (child_id, pedagog_id, date) DO UPDATE SET
      mood              = EXCLUDED.mood,
      sleep_quality     = EXCLUDED.sleep_quality,
      sleep_hours       = EXCLUDED.sleep_hours,
      meals             = EXCLUDED.meals,
      behavior          = EXCLUDED.behavior,
      notes             = EXCLUDED.notes,
      meals_structured  = EXCLUDED.meals_structured,
      is_draft          = CASE
                            WHEN pedagog_notes.is_draft = false THEN false
                            ELSE EXCLUDED.is_draft
                          END,
      updated_at        = NOW()
    RETURNING *
  `, [childId, pedagogId, date, mood ?? null, sleepQuality ?? null, sleepHours ?? null, meals ?? null, behavior ?? null, notes ?? null, mealsStructured ?? null, draftFlag]);
  return result.rows[0];
}

/**
 * Get a single note by childId, pedagogId, date.
 */
async function getNote(childId, pedagogId, date) {
  const result = await db.query(`
    SELECT * FROM pedagog_notes
    WHERE child_id = $1 AND pedagog_id = $2 AND date = $3::DATE
  `, [childId, pedagogId, date]);
  return result.rows[0] || null;
}

/**
 * Get all published (is_draft=false) notes for a child in a date range.
 * Draft notes are never included in shared reports.
 */
async function getNotesForPeriod(childId, dateFrom, dateTo) {
  const result = await db.query(`
    SELECT
      pn.id,
      pn.date,
      pn.mood,
      pn.sleep_quality,
      pn.sleep_hours,
      pn.meals,
      pn.behavior,
      pn.notes,
      pn.meals_structured,
      pn.created_at,
      pn.updated_at,
      p.name AS pedagog_name
    FROM pedagog_notes pn
    JOIN parent p ON p.id = pn.pedagog_id
    WHERE pn.child_id = $1
      AND pn.date BETWEEN $2::DATE AND $3::DATE
      AND pn.is_draft = false
    ORDER BY pn.date ASC
  `, [childId, dateFrom, dateTo]);
  return result.rows;
}

/**
 * Verify pedagogen has access to a specific child.
 * Returns true if the parent has role='pedagog' for this child.
 */
async function verifyPedagogAccess(pedagogId, childId) {
  const result = await db.query(`
    SELECT 1 FROM parent_child
    WHERE parent_id = $1 AND child_id = $2 AND role = 'pedagog'
  `, [pedagogId, childId]);
  return result.rows.length > 0;
}

/**
 * Overview of children for a pedagogen on a given date.
 * Filters out children whose family doesn't have the pedagoganteckningar feature enabled.
 * Computes family_label with disambiguation when multiple children share the same family_name.
 */
async function getOverview(pedagogId, date) {
  const result = await db.query(`
    SELECT
      c.id,
      c.name,
      c.emoji,
      f.name       AS family_name,
      f.id         AS family_id,
      pn.is_draft,
      pn.mood,
      pn.updated_at AS saved_at,
      -- Primary parent name for family_label disambiguation
      (
        SELECT p.name FROM parent p
        JOIN parent_child pc2 ON pc2.parent_id = p.id AND pc2.role = 'primary' AND pc2.revoked_at IS NULL
        WHERE pc2.child_id = c.id
        LIMIT 1
      ) AS primary_parent_name
    FROM parent_child pc
    JOIN child        c  ON c.id = pc.child_id
    JOIN family       f  ON f.id = c.family_id
    -- Feature gate: only families with pedagoganteckningar live or family_feature enabled
    JOIN features feat ON feat.slug = 'pedagoganteckningar'
      AND feat.status <> 'off'
      AND (
        feat.status = 'live'
        OR EXISTS (
          SELECT 1 FROM family_features ff
          WHERE ff.family_id = f.id AND ff.feature_slug = 'pedagoganteckningar'
        )
      )
    LEFT JOIN pedagog_notes pn
           ON pn.child_id = c.id
          AND pn.date = $2::DATE
          AND pn.pedagog_id = $1
    WHERE pc.parent_id = $1
      AND pc.role = 'pedagog'
      AND pc.revoked_at IS NULL
    ORDER BY c.name ASC
  `, [pedagogId, date]);

  // Count children per family to detect collisions
  const familyCount = {};
  for (const row of result.rows) {
    familyCount[row.family_id] = (familyCount[row.family_id] || 0) + 1;
  }

  // Build family_label: disambiguate when multiple children share same family
  const labelMap = {}; // family_id -> count of children processed so far
  const children = result.rows.map(row => {
    const hasCollision = familyCount[row.family_id] > 1;
    const familyLabel = hasCollision && row.primary_parent_name
      ? `${row.name} · ${row.family_name} (${row.primary_parent_name})`
      : `${row.name} · ${row.family_name}`;

    return {
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      family_name: row.family_name,
      family_label: familyLabel,
      is_draft: row.is_draft ?? null,
      mood: row.mood ?? null,
      saved_at: row.is_draft === false ? row.saved_at : null,
    };
  });

  return children;
}

module.exports = {
  getPedagogChildren,
  upsertNote,
  getNote,
  getNotesForPeriod,
  verifyPedagogAccess,
  getOverview,
};