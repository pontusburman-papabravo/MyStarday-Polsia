/**
 * src/routes/surveys.js
 * Owns: survey CRUD (admin), respondent submission flow, duplicate detection.
 * Does NOT own: auth logic, family/child data, push notifications.
 *
 * Admin routes (/api/admin/surveys/*) — requireAdmin via admin.js router.
 * Public routes (/api/surveys/*) — no auth required (respondent flow).
 * Seeder route (/api/admin/surveys/seed) — idempotent, creates the 3 built-in surveys.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/surveys');
const { requireAdmin } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');

// Middleware for shortlink routes: 403 if enkater feature is not active for anyone.
// shortlink routes are public (no auth), so we check feature status directly.
function requireFeaturePublic(slug) {
  return async (req, res, next) => {
    const { hasAccess } = require('../../db/features');
    const allowed = await hasAccess(null, slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    next();
  };
}

// ── Admin router (mounted at /api/admin/surveys) ───────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

// List all surveys
adminRouter.get('/', async (req, res) => {
  try {
    const surveys = await db.getAllSurveys();
    res.json(surveys);
  } catch (err) {
    console.error('[SURVEYS] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta enkäter' });
  }
});

// Get single survey with full questions + options
adminRouter.get('/:id', async (req, res) => {
  try {
    const survey = await db.getSurveyFull(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });
    const stats = await db.getSurveyStats(req.params.id);
    res.json({ ...survey, stats });
  } catch (err) {
    console.error('[SURVEYS] get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta enkät' });
  }
});

// Create survey
adminRouter.post('/', async (req, res) => {
  try {
    const { slug, title, description, target_tag, opens_at, closes_at, thank_you_message, thank_you_cta_text, thank_you_cta_url } = req.body;
    if (!slug || !title) return res.status(400).json({ error: 'slug och title krävs' });
    const survey = await db.createSurvey({ slug, title, description, target_tag, opens_at, closes_at, thank_you_message, thank_you_cta_text, thank_you_cta_url });
    res.status(201).json(survey);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug används redan' });
    console.error('[SURVEYS] create error:', err);
    res.status(500).json({ error: 'Kunde inte skapa enkät' });
  }
});

// Update survey metadata + status
adminRouter.patch('/:id', async (req, res) => {
  try {
    const updated = await db.updateSurvey(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Enkät hittades inte' });
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug används redan' });
    console.error('[SURVEYS] update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera enkät' });
  }
});

// Delete survey (cascades to questions, options, responses)
adminRouter.delete('/:id', async (req, res) => {
  try {
    await db.deleteSurvey(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] delete error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort enkät' });
  }
});

// ── Questions ──────────────────────────────────────────────────────────────

// Add question to survey
adminRouter.post('/:id/questions', async (req, res) => {
  try {
    const surveyOwn = await db.query('SELECT id FROM surveys WHERE id = $1', [req.params.id]);
    if (!surveyOwn.rows.length) return res.status(404).json({ error: 'Undersökning hittades inte' });
    const q = await db.createQuestion({ survey_id: req.params.id, ...req.body });
    res.status(201).json(q);
  } catch (err) {
    console.error('[SURVEYS] add question error:', err);
    res.status(500).json({ error: 'Kunde inte lägga till fråga' });
  }
});

// Update question
adminRouter.patch('/:id/questions/:qid', async (req, res) => {
  try {
    const qOwn = await db.query(
      'SELECT id FROM survey_questions WHERE id = $1 AND survey_id = $2',
      [req.params.qid, req.params.id]
    );
    if (!qOwn.rows.length) return res.status(404).json({ error: 'Fråga hittades inte' });
    const q = await db.updateQuestion(req.params.qid, req.body);
    res.json(q);
  } catch (err) {
    console.error('[SURVEYS] update question error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera fråga' });
  }
});

// Delete question
adminRouter.delete('/:id/questions/:qid', async (req, res) => {
  try {
    const qOwn = await db.query(
      'SELECT id FROM survey_questions WHERE id = $1 AND survey_id = $2',
      [req.params.qid, req.params.id]
    );
    if (!qOwn.rows.length) return res.status(404).json({ error: 'Fråga hittades inte' });
    await db.deleteQuestion(req.params.qid);
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] delete question error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort fråga' });
  }
});

// Reorder questions
adminRouter.post('/:id/questions/reorder', async (req, res) => {
  try {
    const { order } = req.body; // array of question UUIDs
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order måste vara array' });
    // Verify all UUIDs in the order array belong to this survey
    const validQIds = (await db.query(
      'SELECT id FROM survey_questions WHERE survey_id = $1',
      [req.params.id]
    )).rows.map(r => r.id);
    const orderSet = new Set(order);
    const invalidIds = order.filter(id => !validQIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'Frågor från annan undersökning i order' });
    }
    await db.reorderQuestions(req.params.id, order);
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] reorder error:', err);
    res.status(500).json({ error: 'Kunde inte sortera frågor' });
  }
});

// ── Options ────────────────────────────────────────────────────────────────

// Add option to question
adminRouter.post('/:id/questions/:qid/options', async (req, res) => {
  try {
    const qOwn = await db.query(
      'SELECT id FROM survey_questions WHERE id = $1 AND survey_id = $2',
      [req.params.qid, req.params.id]
    );
    if (!qOwn.rows.length) return res.status(404).json({ error: 'Fråga hittades inte' });
    const opt = await db.createOption({ question_id: req.params.qid, ...req.body });
    res.status(201).json(opt);
  } catch (err) {
    console.error('[SURVEYS] add option error:', err);
    res.status(500).json({ error: 'Kunde inte lägga till alternativ' });
  }
});

// Update option
adminRouter.patch('/:id/questions/:qid/options/:oid', async (req, res) => {
  try {
    const optOwn = await db.query(
      `SELECT so.id FROM survey_options so
       JOIN survey_questions sq ON sq.id = so.question_id
       WHERE so.id = $1 AND sq.id = $2 AND sq.survey_id = $3`,
      [req.params.oid, req.params.qid, req.params.id]
    );
    if (!optOwn.rows.length) return res.status(404).json({ error: 'Alternativ hittades inte' });
    const opt = await db.updateOption(req.params.oid, req.body);
    res.json(opt);
  } catch (err) {
    console.error('[SURVEYS] update option error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera alternativ' });
  }
});

// Delete option
adminRouter.delete('/:id/questions/:qid/options/:oid', async (req, res) => {
  try {
    const optOwn = await db.query(
      `SELECT so.id FROM survey_options so
       JOIN survey_questions sq ON sq.id = so.question_id
       WHERE so.id = $1 AND sq.id = $2 AND sq.survey_id = $3`,
      [req.params.oid, req.params.qid, req.params.id]
    );
    if (!optOwn.rows.length) return res.status(404).json({ error: 'Alternativ hittades inte' });
    await db.deleteOption(req.params.oid);
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] delete option error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort alternativ' });
  }
});

// ── Responses (admin read) ─────────────────────────────────────────────────

adminRouter.get('/:id/responses', async (req, res) => {
  try {
    const responses = await db.getSurveyResponses(req.params.id);
    res.json(responses);
  } catch (err) {
    console.error('[SURVEYS] get responses error:', err);
    res.status(500).json({ error: 'Kunde inte hämta svar' });
  }
});

// ── Del 2: Rapport endpoints ───────────────────────────────────────────────

// Full rapport for a single survey: per-question breakdowns + time series
adminRouter.get('/:id/rapport', async (req, res) => {
  try {
    const survey = await db.getSurveyFull(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });
    const stats = await db.getSurveyStats(req.params.id);
    const breakdowns = await db.getSurveyQuestionBreakdowns(req.params.id);
    const timeSeries = await db.getSurveyTimeSeries(req.params.id);
    res.json({ survey, stats, breakdowns, time_series: timeSeries });
  } catch (err) {
    console.error('[SURVEYS] rapport error:', err);
    res.status(500).json({ error: 'Kunde inte hämta rapport' });
  }
});

// CSV export — returns text/csv
adminRouter.get('/:id/export', async (req, res) => {
  try {
    const survey = await db.getSurveyFull(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });

    const { start_date, end_date, complete_only } = req.query;
    const rows = await db.getSurveyExportRows(req.params.id, {
      start_date: start_date || null,
      end_date: end_date || null,
      complete_only: complete_only === '1' || complete_only === 'true',
    });

    const questions = survey.questions || [];
    const optMap = {};
    for (const q of questions) {
      for (const o of (q.options || [])) {
        optMap[o.id] = o.option_text;
      }
    }

    // Build CSV header
    const qHeaders = questions.map(q => `"${q.question_text.replace(/"/g, '""')}"`);
    const header = ['Svar-ID', 'Status', 'Tidpunkt', 'GDPR', ...questions.map(q => `"${q.question_text.replace(/"/g, '""')}"`)].join(',');

    const csvRows = [header];
    for (const row of rows) {
      const ansMap = {};
      for (const a of (row.answers || [])) {
        let val = '';
        if (a.scale_value != null) val = String(a.scale_value);
        else if (a.selected_option_ids && a.selected_option_ids.length > 0) {
          val = a.selected_option_ids.map(oid => optMap[oid] || oid).join('; ');
          if (a.freetext_value) val += ` (${a.freetext_value})`;
        } else val = a.answer_text || '';
        ansMap[a.question_id] = val;
      }
      const cols = [
        `"${row.response_id}"`,
        `"${row.status}"`,
        `"${row.submitted_at ? new Date(row.submitted_at).toISOString() : ''}"`,
        `"${row.gdpr_consent ? 'Ja' : 'Nej'}"`,
        ...questions.map(q => `"${(ansMap[q.id] || '').replace(/"/g, '""')}"`)
      ];
      csvRows.push(cols.join(','));
    }

    const slug = survey.slug || req.params.id;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${slug}-export.csv"`);
    // BOM for Excel UTF-8 compatibility
    res.send('\uFEFF' + csvRows.join('\r\n'));
  } catch (err) {
    console.error('[SURVEYS] export error:', err);
    res.status(500).json({ error: 'Kunde inte exportera' });
  }
});

// Comparison endpoint — POST body: { survey_ids: [uuid, ...] }
adminRouter.post('/compare', async (req, res) => {
  try {
    const { survey_ids } = req.body;
    if (!Array.isArray(survey_ids) || survey_ids.length < 2) {
      return res.status(400).json({ error: 'Minst 2 enkäter krävs för jämförelse' });
    }
    const data = await db.getComparisonData(survey_ids);
    res.json(data);
  } catch (err) {
    console.error('[SURVEYS] compare error:', err);
    res.status(500).json({ error: 'Kunde inte hämta jämförelsedata' });
  }
});

// ── Seeder — idempotent, creates the 3 built-in surveys ───────────────────
adminRouter.post('/seed', async (req, res) => {
  try {
    const result = await seedBuiltInSurveys();
    res.json({ ok: true, seeded: result });
  } catch (err) {
    console.error('[SURVEYS] seed error:', err);
    res.status(500).json({ error: 'Seed misslyckades: ' + err.message });
  }
});

// ── Public respondent router (mounted at /api/surveys) ────────────────────
const { requireAuth } = require('../middleware/auth');
const publicRouter = express.Router();

// ── Del 4: Popup state endpoints ───────────────────────────────────────────

// GET /api/surveys/popup/logged-in — returns active popup survey for logged-in parent
// Returns null if no survey should be shown (dismissed, not expired snooze, etc.)
publicRouter.get('/popup/logged-in', requireAuth, requireFeature('enkater'), async (req, res) => {
  try {
    if (req.user.type !== 'parent') return res.json({ survey: null });
    const survey = await db.getActivePopupSurveyForLoggedIn();
    if (!survey) return res.json({ survey: null });

    // Check registered_before/after audience filter
    if (survey.popup_registered_after || survey.popup_registered_before) {
      // We need the parent's created_at — fetch it inline
      const rawDb = require('../lib/db');
      const parentRes = await rawDb.query(
        `SELECT created_at FROM parent WHERE id = $1`, [req.user.id]
      );
      const parent = parentRes.rows[0];
      if (parent) {
        const pCreated = new Date(parent.created_at);
        if (survey.popup_registered_after && pCreated < new Date(survey.popup_registered_after)) {
          return res.json({ survey: null });
        }
        if (survey.popup_registered_before && pCreated > new Date(survey.popup_registered_before)) {
          return res.json({ survey: null });
        }
      }
    }

    // Check if parent already dismissed, clicked, or snooze still active.
    // 'shown' is the only action that doesn't suppress — all intentional actions do.
    const interaction = await db.getPopupInteraction(survey.id, req.user.id);
    if (interaction) {
      if (interaction.action === 'dismissed') return res.json({ survey: null });
      if (interaction.action === 'clicked') return res.json({ survey: null });
      if (interaction.action === 'snoozed' && interaction.snooze_until && new Date(interaction.snooze_until) > new Date()) {
        return res.json({ survey: null });
      }
    }

    // Check if already submitted
    const dupCheck = await db.getSurveyStats(survey.id);
    // We can't check per-parent without more joins — skip; dedup is handled client-side by cookie too

    res.json({ survey });
  } catch (err) {
    console.error('[SURVEYS] popup logged-in error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// GET /api/surveys/popup/landing — returns active popup survey for landing visitors
publicRouter.get('/popup/landing', async (req, res) => {
  try {
    const survey = await db.getActivePopupSurveyForLanding();
    if (!survey) return res.json({ survey: null });
    res.json({
      survey: {
        id: survey.id, slug: survey.slug, title: survey.title,
        description: survey.description,
        popup_trigger_delay_secs: survey.popup_trigger_delay_secs,
        popup_trigger_scroll_pct: survey.popup_trigger_scroll_pct,
        contest_enabled: survey.contest_enabled,
        contest_prize_description: survey.contest_prize_description,
      }
    });
  } catch (err) {
    console.error('[SURVEYS] popup landing error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/surveys/popup/interaction — record popup action (shown/snoozed/dismissed/clicked)
publicRouter.post('/popup/interaction', async (req, res) => {
  try {
    const { survey_id, action, snooze_days, cookie_token } = req.body;
    if (!survey_id || !action) return res.status(400).json({ error: 'survey_id och action krävs' });

    // Logged-in parent check (optional auth)
    const parentId = req.user?.type === 'parent' ? req.user.id : null;

    await db.recordPopupInteraction({
      surveyId: survey_id,
      parentId,
      cookieToken: cookie_token || null,
      action,
      snoozeDays: snooze_days || 3,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[SURVEYS] popup interaction error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Get survey by slug (public — returns questions + options, no responses)
publicRouter.get('/s/:slug', async (req, res) => {
  try {
    // Gate: enkater must be globally available
    const { hasAccess: hasAccessSlug } = require('../../db/features');
    const allowed = await hasAccessSlug(null, 'enkater');
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const survey = await db.getSurveyFullBySlug(req.params.slug);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });
    if (survey.status === 'closed') return res.status(410).json({ error: 'Enkäten är stängd', status: 'closed' });
    if (survey.status === 'paused') return res.status(503).json({ error: 'Enkäten är pausad', status: 'paused' });
    if (survey.status === 'draft') return res.status(404).json({ error: 'Enkät hittades inte' });
    // Auto-close if closes_at is past
    if (survey.closes_at && new Date(survey.closes_at) < new Date()) {
      return res.status(410).json({ error: 'Enkäten har stängts', status: 'closed', closes_at: survey.closes_at });
    }
    // Track view for response-rate calculation (fire-and-forget)
    db.incrementViewCount(survey.id).catch(() => {});
    res.json(survey);
  } catch (err) {
    console.error('[SURVEYS] public get error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Start a response session (called when respondent opens survey)
publicRouter.post('/s/:slug/start', async (req, res) => {
  try {
    const survey = await db.getSurveyBySlug(req.params.slug);
    if (!survey || survey.status !== 'active') {
      return res.status(404).json({ error: 'Enkät ej tillgänglig' });
    }
    if (survey.closes_at && new Date(survey.closes_at) < new Date()) {
      return res.status(410).json({ error: 'Enkäten har stängts', status: 'closed' });
    }

    const { fingerprint, cookie_token } = req.body;

    // Duplicate check
    if (cookie_token) {
      const dup = await db.checkDuplicate(survey.id, cookie_token);
      if (dup && dup.status === 'submitted') {
        return res.status(409).json({ error: 'Du har redan svarat på denna enkät', duplicate: true });
      }
    }

    const response = await db.createResponse({ survey_id: survey.id, fingerprint });
    const ipRaw = req.ip || '';
    // Minimal hash — not cryptographic, just for aggregation
    const ip_hash = Buffer.from(ipRaw).toString('base64').slice(0, 20);

    if (cookie_token) {
      await db.recordParticipant({ survey_id: survey.id, response_id: response.id, cookie_token, fingerprint, ip_hash });
    }

    res.status(201).json({ response_id: response.id, survey_id: survey.id });
  } catch (err) {
    console.error('[SURVEYS] start error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Save answer (partial save — can be called any time during the survey)
publicRouter.post('/responses/:rid/answers', async (req, res) => {
  try {
    // Gate: enkater must be globally available for anonymous survey participation
    const { hasAccess } = require('../../db/features');
    const allowed = await hasAccess(null, 'enkater');
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const { question_id, answer_text, selected_option_ids, freetext_value, scale_value } = req.body;
    if (!question_id) return res.status(400).json({ error: 'question_id krävs' });
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });
    const answer = await db.upsertAnswer({ response_id: req.params.rid, question_id, answer_text, selected_option_ids, freetext_value, scale_value });
    res.json(answer);
  } catch (err) {
    console.error('[SURVEYS] save answer error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Submit response (final)
publicRouter.post('/responses/:rid/submit', async (req, res) => {
  try {
    // Gate: enkater must be globally available
    const { hasAccess: hasAccessCheck } = require('../../db/features');
    const allowed = await hasAccessCheck(null, 'enkater');
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    const { gdpr_consent, respondent_email, contest_gdpr_consent } = req.body;
    const response = await db.getResponse(req.params.rid);
    if (!response) return res.status(404).json({ error: 'Session hittades inte' });
    if (response.status === 'submitted') return res.status(409).json({ error: 'Enkäten är redan inskickad' });
    const submitted = await db.submitResponse(req.params.rid, { gdpr_consent, respondent_email });

    // Get survey for thank-you config + contest
    const survey = await db.getSurveyById(response.survey_id);

    // Del 4: record contest entry if contest is enabled and respondent consented with email
    let contestEntered = false;
    if (survey?.contest_enabled && contest_gdpr_consent && respondent_email) {
      try {
        await db.upsertContestEntry({
          surveyId: response.survey_id,
          responseId: req.params.rid,
          respondentEmail: respondent_email,
        });
        contestEntered = true;
      } catch {
        // non-fatal — contestEntered stays false
      }
    }

    res.json({
      ok: true,
      thank_you_message: survey?.thank_you_message || 'Tack för ditt svar!',
      thank_you_cta_text: survey?.thank_you_cta_text || null,
      thank_you_cta_url: survey?.thank_you_cta_url || null,
      // Del 4: contest + target-tag info for custom thank-you pages
      target_tag: survey?.target_tag || null,
      contest_enabled: survey?.contest_enabled || false,
      contest_entered: contestEntered,
      contest_prize_description: survey?.contest_prize_description || null,
      contest_closes_at: survey?.contest_closes_at || null,
    });
  } catch (err) {
    console.error('[SURVEYS] submit error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// ── Del 4: Distribution + Contest admin endpoints ─────────────────────────

// Update distribution config for a survey
adminRouter.patch('/:id/distribution', async (req, res) => {
  try {
    const fields = {};
    const allowed = [
      'popup_logged_in_enabled', 'popup_landing_enabled',
      'popup_trigger_delay_secs', 'popup_trigger_scroll_pct',
      'popup_start_date', 'popup_end_date',
      'popup_registered_after', 'popup_registered_before',
      'contest_enabled', 'contest_prize_description', 'contest_prize_image_url',
      'contest_winner_count', 'contest_closes_at',
    ];
    for (const k of allowed) { if (k in req.body) fields[k] = req.body[k]; }
    const updated = await db.updateSurvey(req.params.id, fields);
    if (!updated) return res.status(404).json({ error: 'Enkät hittades inte' });
    res.json(updated);
  } catch (err) {
    console.error('[SURVEYS] distribution update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera distributionsinställningar' });
  }
});

// Get popup stats for a survey
adminRouter.get('/:id/popup-stats', async (req, res) => {
  try {
    const stats = await db.getPopupStats(req.params.id);
    res.json(stats);
  } catch (err) {
    console.error('[SURVEYS] popup stats error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Get contest entries for a survey
adminRouter.get('/:id/contest', async (req, res) => {
  try {
    const entries = await db.getContestEntries(req.params.id);
    res.json(entries);
  } catch (err) {
    console.error('[SURVEYS] contest entries error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Pick random winners
adminRouter.post('/:id/contest/pick-winners', async (req, res) => {
  try {
    const survey = await db.getSurveyById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Enkät hittades inte' });
    const count = req.body.count || survey.contest_winner_count || 1;
    const winners = await db.pickContestWinners(req.params.id, count);
    res.json({ winners });
  } catch (err) {
    console.error('[SURVEYS] pick winners error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Mark entry as contacted
adminRouter.patch('/:id/contest/:entryId/contacted', async (req, res) => {
  try {
    const entry = await db.markContestEntryContacted(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Deltagare hittades inte' });
    res.json(entry);
  } catch (err) {
    console.error('[SURVEYS] mark contacted error:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// ── Del 4: Public popup API ────────────────────────────────────────────────
// Built-in survey seeder ─────────────────────────────────────────────────
async function seedBuiltInSurveys() {
  const seeded = [];

  const surveys = [
    {
      slug: 'aktiva-anvandare',
      title: 'Aktiva användare — din upplevelse',
      description: 'Vi vill förstå hur appen fungerar i er vardag. Det tar 2-3 minuter.',
      target_tag: 'Målgrupp A — Aktiva användare',
      thank_you_message: 'Tack så mycket! Dina svar hjälper oss att göra appen ännu bättre för er vardag.',
      thank_you_cta_text: 'Gå till appen',
      thank_you_cta_url: '/dashboard',
      questions: [
        {
          question_text: 'Vilken funktion i appen använder du oftast?',
          question_type: 'radio',
          options: [
            { option_text: 'NU/NÄSTA/SENARE' },
            { option_text: 'Stjärnsystemet' },
            { option_text: 'Schemabiblioteket' },
            { option_text: 'Bildstödet' },
            { option_text: 'Annat', allows_freetext: true },
          ],
        },
        {
          question_text: 'Beskriv en situation den senaste veckan då appen gjorde er vardag lättare.',
          question_type: 'text_long',
        },
        {
          question_text: 'Vad saknas för att appen ska bli ännu bättre i er vardag?',
          question_type: 'text_long',
        },
        {
          question_text: 'Förlorar ditt barn intresset för stjärnorna/belöningarna efter ett tag?',
          question_type: 'radio',
          options: [
            { option_text: 'Nej, intresset håller i sig' },
            { option_text: 'Ja, efter några dagar' },
            { option_text: 'Ja, efter några veckor' },
            { option_text: 'Vi har inte använt belöningar ännu' },
          ],
        },
        {
          question_text: 'Har tjatet i vardagen minskat sedan ni började använda appen?',
          question_type: 'scale',
          scale_min: 1,
          scale_max: 5,
          scale_min_label: 'Ingen skillnad',
          scale_max_label: 'Märkbart mindre tjat',
        },
      ],
    },
    {
      slug: 'registrerade-inaktiva',
      title: 'Registrerade men inaktiva — vi vill förstå',
      description: 'Du skapade ett konto men vi märker att ni inte kommit igång. Hjälp oss förstå varför.',
      target_tag: 'Målgrupp B — Registrerade men inaktiva',
      thank_you_message: 'Tack! Dina svar hjälper oss göra appen enklare att komma igång med.',
      thank_you_cta_text: 'Prova igen',
      thank_you_cta_url: '/dashboard',
      questions: [
        {
          question_text: 'Vad var den främsta anledningen till att ni inte kom igång?',
          question_type: 'radio',
          options: [
            { option_text: 'Krångligt att installera' },
            { option_text: 'Tidskrävande att sätta upp schema' },
            { option_text: 'Barnet visade inget intresse' },
            { option_text: 'Glömde bort det' },
            { option_text: 'Annat', allows_freetext: true },
          ],
        },
        {
          question_text: 'Hur tydligt var det hur appen fungerar utifrån landningssidan?',
          question_type: 'scale',
          scale_min: 1,
          scale_max: 5,
          scale_min_label: 'Mycket otydligt',
          scale_max_label: 'Helt tydligt',
        },
        {
          question_text: 'Hur viktigt är det för dig att en app finns i App Store/Google Play?',
          question_type: 'scale',
          scale_min: 1,
          scale_max: 5,
          scale_min_label: 'Inte viktigt alls',
          scale_max_label: 'Absolut nödvändigt',
        },
        {
          question_text: 'Vad skulle behövas för att du skulle ge appen en ny chans?',
          question_type: 'checkbox',
          options: [
            { option_text: 'Färdiga exempelscheman' },
            { option_text: 'Kort videoinstruktion' },
            { option_text: 'App Store / Google Play' },
            { option_text: 'Påminnelser via push' },
            { option_text: 'Annat', allows_freetext: true },
          ],
        },
      ],
    },
    {
      slug: 'inte-registrerade',
      title: 'Ännu inte registrerad — vi är nyfikna',
      description: 'Du har besökt vår sida men inte skapat ett konto. Hjälp oss förstå vad du funderar på.',
      target_tag: 'Målgrupp C — Ännu inte registrerade',
      thank_you_message: 'Tack! Dina tankar är värdefulla. Säkra din gratisplats idag — inget kreditkort behövs.',
      thank_you_cta_text: 'Säkra min gratisplats',
      thank_you_cta_url: '/register',
      questions: [
        {
          question_text: 'Är det tydligt hur Min Stjärndag fungerar utifrån informationen på sidan?',
          question_type: 'radio',
          options: [
            { option_text: 'Ja, helt tydligt' },
            { option_text: 'Delvis, men jag har frågor' },
            { option_text: 'Nej, jag förstår inte riktigt' },
          ],
        },
        {
          question_text: 'Vad skulle få dig att lita på att det här är en app värd att satsa tid på?',
          question_type: 'text_short',
        },
        {
          question_text: 'Vad gör att du tvekar att klicka på "Säkra min gratisplats"?',
          question_type: 'checkbox',
          options: [
            { option_text: 'Osäker på om appen passar barnets ålder' },
            { option_text: 'Undrar vad som händer efter gratisåret' },
            { option_text: 'Vill ha App Store / Google Play' },
            { option_text: 'Behöver fler exempelskärmdumpar' },
            { option_text: 'Annat', allows_freetext: true },
          ],
        },
        {
          question_text: 'Vilket verktyg använder ni idag för bildstöd och rutiner?',
          question_type: 'radio',
          options: [
            { option_text: 'Whiteboardtavla' },
            { option_text: 'Papper och penna' },
            { option_text: 'Annan app' },
            { option_text: 'Inget alls' },
          ],
        },
      ],
    },
  ];

  for (const surveyData of surveys) {
    // Check if slug already exists
    const existing = await db.getSurveyBySlug(surveyData.slug);
    if (existing) {
      // Activate existing draft surveys so respondents can start them
      if (existing.status !== 'active') {
        await db.updateSurvey(existing.id, { status: 'active' });
        seeded.push({ slug: surveyData.slug, action: 'activated', id: existing.id });
      } else {
        seeded.push({ slug: surveyData.slug, action: 'skipped' });
      }
      continue;
    }

    const survey = await db.createSurvey({
      slug: surveyData.slug,
      title: surveyData.title,
      description: surveyData.description,
      target_tag: surveyData.target_tag,
      thank_you_message: surveyData.thank_you_message,
      thank_you_cta_text: surveyData.thank_you_cta_text,
      thank_you_cta_url: surveyData.thank_you_cta_url,
    });

    for (let qi = 0; qi < surveyData.questions.length; qi++) {
      const qData = surveyData.questions[qi];
      const question = await db.createQuestion({
        survey_id: survey.id,
        sort_order: qi,
        question_text: qData.question_text,
        question_type: qData.question_type,
        scale_min: qData.scale_min ?? null,
        scale_max: qData.scale_max ?? null,
        scale_min_label: qData.scale_min_label ?? null,
        scale_max_label: qData.scale_max_label ?? null,
      });

      if (qData.options) {
        for (let oi = 0; oi < qData.options.length; oi++) {
          await db.createOption({
            question_id: question.id,
            sort_order: oi,
            option_text: qData.options[oi].option_text,
            allows_freetext: qData.options[oi].allows_freetext ?? false,
          });
        }
      }
    }

    // Activate the survey so respondents can start it immediately
    await db.updateSurvey(survey.id, { status: 'active' });
    seeded.push({ slug: surveyData.slug, action: 'created', id: survey.id });
  }

  return seeded;
}

// ── SMS shortlink router — handles /tyck (mounted at /tyck in server.js) ──
const shortlinkRouter = express.Router();
shortlinkRouter.use(requireFeaturePublic('enkater'));

// /tyck → redirect to first active popup-landing survey (SMS shortlink)
shortlinkRouter.get('/', async (req, res) => {
  try {
    const survey = await db.getActivePopupSurveyForLanding();
    if (survey) return res.redirect(302, `/tyck/${survey.slug}`);
    // Fallback: any active survey
    const surveys = await db.getAllSurveys();
    const active = surveys.find(s => s.status === 'active');
    if (active) return res.redirect(302, `/tyck/${active.slug}`);
    res.redirect(302, '/');
  } catch {
    res.redirect(302, '/');
  }
});

// /tyck/:slug → serve the survey SPA
shortlinkRouter.get('/:slug', (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, '../../public/tyck.html'));
});

module.exports = { adminRouter, publicRouter, shortlinkRouter };
