/**
 * Admin routes for feature flag management.
 * Owns: features CRUD, family assignment, documentation updates for admin panel.
 * Does NOT own: feature_flag table (legacy simple flags — see admin/system.js).
 */

const express = require('express');

// UUID validation regex (8-4-4-4-12 hex)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const {
  listFeatures, getFeature, createFeature,
  updateFeature, deleteFeature,
  updateDocs, addDevNote, addChangelog,
  addFamily, removeFamily, listFeatureFamilies, searchFamilies,
} = require('../../../db/features');

const router = express.Router();

// ─── List all features ─────────────────────────────────
router.get('/features', async (req, res) => {
  try {
    const features = await listFeatures();
    res.json(features);
  } catch (err) {
    console.error('[ADMIN] features list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta funktioner' });
  }
});

// ─── Create a new feature ──────────────────────────────
router.post('/features', async (req, res) => {
  try {
    const { slug, name, description, status, tags, priority, complexity, estimated_hours } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ error: 'slug och name krävs' });
    }

    // Validate slug format (lowercase, no spaces)
    if (!/^[a-z0-9_]+$/.test(slug)) {
      return res.status(400).json({ error: 'slug måste vara lower-case med bara a-z, 0-9 och _' });
    }

    // Validate status
    if (status && !['dev', 'live', 'off'].includes(status)) {
      return res.status(400).json({ error: 'status måste vara dev, live eller off' });
    }

    // Validate priority
    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'priority måste vara low, medium, high eller critical' });
    }

    const feature = await createFeature({
      slug,
      name,
      description,
      status,
      tags: tags || [],
      priority: priority || 'medium',
      complexity: complexity ? parseInt(complexity, 10) : 5,
      estimatedHours: estimated_hours || null,
    });

    res.status(201).json(feature);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `En funktion med slug "${req.body.slug}" finns redan` });
    }
    console.error('[ADMIN] features create error:', err);
    res.status(500).json({ error: 'Kunde inte skapa funktion' });
  }
});

// ─── Search families for assignment modal ───────────────
router.get('/features/families-search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const excludeSlug = req.query.exclude_slug;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 20);

    if (!excludeSlug) {
      return res.status(400).json({ error: 'exclude_slug krävs' });
    }
    if (q.length < 2) {
      return res.status(400).json({ error: 'Sökfrågan måste vara minst 2 tecken' });
    }

    const results = await searchFamilies(q, excludeSlug, limit);
    res.json(results);
  } catch (err) {
    console.error('[ADMIN] families search error:', err);
    res.status(500).json({ error: 'Kunde inte söka familjer' });
  }
});

// ─── List all families (for dropdown) ──────────────────
router.get('/features/families', async (req, res) => {
  try {
    const db = require('../../lib/db');
    const result = await db.query(`
      SELECT f.id, f.name, COUNT(p.id) AS parent_count
      FROM family f
      LEFT JOIN parent p ON p.family_id = f.id AND p.is_admin = false
      WHERE f.archived_at IS NULL
      GROUP BY f.id
      ORDER BY f.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] families list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta familjer' });
  }
});

// ─── Get a single feature ───────────────────────────────
router.get('/features/:slug', async (req, res) => {
  try {
    const feature = await getFeature(req.params.slug);
    if (!feature) {
      return res.status(404).json({ error: 'Funktionen hittades inte' });
    }
    // Also get assigned families
    const families = await listFeatureFamilies(req.params.slug);
    res.json({ ...feature, assigned_families: families });
  } catch (err) {
    console.error('[ADMIN] features get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta funktion' });
  }
});

// ─── Update a feature ───────────────────────────────────
router.put('/features/:slug', async (req, res) => {
  try {
    const { name, description, status, tags, priority, complexity, estimated_hours, documentation, dev_notes, changelog, category } = req.body;

    // Validate status
    if (status && !['dev', 'live', 'off'].includes(status)) {
      return res.status(400).json({ error: 'status måste vara dev, live eller off' });
    }

    // Validate priority
    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'priority måste vara low, medium, high eller critical' });
    }

    const fields = {};
    if (name          !== undefined) fields.name          = name;
    if (description    !== undefined) fields.description    = description;
    if (status        !== undefined) fields.status         = status;
    if (tags          !== undefined) fields.tags           = tags;
    if (priority      !== undefined) fields.priority        = priority;
    if (complexity    !== undefined) fields.complexity      = parseInt(complexity, 10);
    if (estimated_hours !== undefined) fields.estimatedHours = estimated_hours === null ? null : parseFloat(estimated_hours);
    if (documentation !== undefined) fields.documentation  = documentation;
    if (dev_notes     !== undefined) fields.dev_notes      = dev_notes;
    if (changelog     !== undefined) fields.changelog      = changelog;
    if (category      !== undefined) fields.category       = category;

    const feature = await updateFeature(req.params.slug, fields);
    if (!feature) {
      return res.status(404).json({ error: 'Funktionen hittades inte' });
    }

    console.log(`[ADMIN] Feature "${req.params.slug}" updated by admin ${req.user.id}`);
    res.json(feature);
  } catch (err) {
    console.error('[ADMIN] features update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera funktion' });
  }
});

// ─── Patch feature status (toggle) ───────────────────────
// Simplified endpoint specifically for status changes via toggle UI.
router.patch('/features/:slug', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['dev', 'live', 'off'].includes(status)) {
      return res.status(400).json({ error: 'status krävs och måste vara dev, live eller off' });
    }
    const feature = await updateFeature(req.params.slug, { status });
    if (!feature) {
      return res.status(404).json({ error: 'Funktionen hittades inte' });
    }
    console.log(`[ADMIN] Feature "${req.params.slug}" status patched to "${status}" by admin ${req.user.id}`);
    res.json(feature);
  } catch (err) {
    console.error('[ADMIN] features patch error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera funktion' });
  }
});

// ─── Delete a feature ───────────────────────────────────
router.delete('/features/:slug', async (req, res) => {
  try {
    const deleted = await deleteFeature(req.params.slug);
    if (!deleted) {
      return res.status(404).json({ error: 'Funktionen hittades inte' });
    }
    console.log(`[ADMIN] Feature "${req.params.slug}" deleted by admin ${req.user.id}`);
    res.json({ message: 'Funktionen har tagits bort' });
  } catch (err) {
    console.error('[ADMIN] features delete error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort funktion' });
  }
});

// ─── Update documentation ───────────────────────────────
router.patch('/features/:slug/docs', async (req, res) => {
  try {
    // docUpdates: partial JSONB update — keys like purpose, user_stories, etc.
    const { doc_updates, dev_note, changelog_entry } = req.body;

    if (dev_note) {
      const docs = await addDevNote(req.params.slug, dev_note);
      if (!docs) return res.status(404).json({ error: 'Funktionen hittades inte' });
      return res.json({ message: 'Utvecklingsanteckning tillagd', documentation: docs });
    }

    if (changelog_entry) {
      const docs = await addChangelog(req.params.slug, changelog_entry);
      if (!docs) return res.status(404).json({ error: 'Funktionen hittades inte' });
      return res.json({ message: 'Changelog tillagd', documentation: docs });
    }

    if (doc_updates) {
      const docs = await updateDocs(req.params.slug, doc_updates);
      if (!docs) return res.status(404).json({ error: 'Funktionen hittades inte' });
      return res.json({ message: 'Dokumentation uppdaterad', documentation: docs });
    }

    res.status(400).json({ error: 'doc_updates, dev_note eller changelog_entry krävs' });
  } catch (err) {
    console.error('[ADMIN] features docs update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera dokumentation' });
  }
});

// ─── Add family to feature ──────────────────────────────
router.post('/features/:slug/families', async (req, res) => {
  try {
    const { family_id } = req.body;
    if (!family_id) {
      return res.status(400).json({ error: 'family_id krävs' });
    }
    if (!UUID_REGEX.test(family_id)) {
      return res.status(400).json({ error: 'family_id måste vara ett giltigt UUID' });
    }

    const added = await addFamily(family_id, req.params.slug);
    if (!added) {
      return res.json({ message: 'Familjen är redan tillagd' });
    }

    console.log(`[ADMIN] Family ${family_id} added to feature "${req.params.slug}" by admin ${req.user.id}`);
    res.status(201).json({ message: 'Familj tillagd' });
  } catch (err) {
    console.error('[ADMIN] features add family error:', err);
    res.status(500).json({ error: 'Kunde inte lägga till familj' });
  }
});

// ─── Remove family from feature ─────────────────────────
router.delete('/features/:slug/families/:familyId', async (req, res) => {
  try {
    if (!UUID_REGEX.test(req.params.familyId)) {
      return res.status(400).json({ error: 'family_id måste vara ett giltigt UUID' });
    }
    const removed = await removeFamily(req.params.familyId, req.params.slug);
    if (!removed) {
      return res.status(404).json({ error: 'Familjen är inte tillagd i denna funktion' });
    }
    console.log(`[ADMIN] Family ${req.params.familyId} removed from feature "${req.params.slug}" by admin ${req.user.id}`);
    res.json({ message: 'Familj borttagen' });
  } catch (err) {
    console.error('[ADMIN] features remove family error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort familj' });
  }
});

module.exports = router;