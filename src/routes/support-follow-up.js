'use strict';

/**
 * Public support thread — opaque bearer token, no login.
 * GET  /api/support/thread?token=
 * POST /api/support/follow-up { token, message }
 * POST /api/support/escalate { token }
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const contactMessages = require('../../db/contact-messages');
const {
  resolveSupportToken,
  touchToken,
} = require('../lib/support-reply-token');
const { applySupportSecurityHeaders } = require('../lib/support-security-headers');
const { resolveSupportLocale } = require('../lib/support-locale');
const { requestHumanEscalation, notifyOnNewUserInfo, isEscalated, parseOps } = require('../lib/support-escalation');
const { t } = require('../lib/i18n');
const { redactSupportText } = require('../lib/log-redact');

const router = express.Router();

router.use((req, res, next) => {
  applySupportSecurityHeaders(res);
  next();
});

function limiter(name, max) {
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${name}:${req.ip}`,
    handler: (req, res) => {
      const locale = req.supportLocale || 'sv-SE';
      res.status(429).json({ error: t(locale, 'support.errors.rateLimit') });
    },
  });
}

function tokenError(locale, reason) {
  if (reason === 'expired') return { status: 410, error: t(locale, 'support.errors.expired') };
  if (reason === 'revoked' || reason === 'archived') {
    return { status: 410, error: t(locale, 'support.errors.revoked') };
  }
  if (reason === 'sunset') return { status: 410, error: t(locale, 'support.errors.legacySunset') };
  return { status: 400, error: t(locale, 'support.errors.invalid') };
}

function publicPayload(row, locale) {
  const ops = parseOps(row.metadata).ops;
  return {
    caseRef: `#${row.id}`,
    status: row.status,
    locale,
    canReply: row.status !== 'archived',
    humanEscalationRequested: isEscalated(row.metadata),
    humanTakeover: Boolean(ops.human_takeover_at),
    thread: row.thread,
  };
}

async function resolveOrReject(req, res, raw) {
  const verified = await resolveSupportToken(raw);
  const localeHint = await resolveSupportLocale({
    acceptLanguage: req.get('accept-language'),
  });
  if (!verified.ok) {
    return { ok: false, locale: localeHint, ...tokenError(localeHint, verified.reason) };
  }
  const row = await contactMessages.getPublicThread(verified.messageId);
  if (!row) {
    return { ok: false, locale: localeHint, ...tokenError(localeHint, 'invalid') };
  }
  const locale = await resolveSupportLocale({
    metadata: row.metadata,
    acceptLanguage: req.get('accept-language'),
  });
  return { ok: true, verified, row, locale };
}

router.get('/thread', limiter('support-thread', 60), async (req, res, next) => {
  try {
    const resolved = await resolveOrReject(req, res, req.query.token);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    await touchToken(resolved.verified.tokenRow);
    res.json(publicPayload(resolved.row, resolved.locale));
  } catch (err) {
    console.error('[SUPPORT] thread error:', redactSupportText(err.message));
    next(err);
  }
});

router.post('/follow-up', limiter('support-follow-up', 10), async (req, res, next) => {
  try {
    const resolved = await resolveOrReject(req, res, req.body?.token);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (message.length < 10) {
      return res.status(400).json({ error: t(resolved.locale, 'support.errors.tooShort') });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: t(resolved.locale, 'support.errors.tooLong') });
    }
    if (resolved.row.status === 'archived') {
      return res.status(410).json({ error: t(resolved.locale, 'support.errors.archived') });
    }

    const saved = await contactMessages.recordUserFollowUp(resolved.verified.messageId, { body: message });
    if (!saved) {
      return res.status(404).json({ error: t(resolved.locale, 'support.errors.notFound') });
    }
    await touchToken(resolved.verified.tokenRow);
    await notifyOnNewUserInfo(saved.id).catch((err) => {
      console.error('[SUPPORT] follow-up notify failed:', redactSupportText(err.message));
    });
    const row = await contactMessages.getPublicThread(resolved.verified.messageId);
    res.json({
      message: t(resolved.locale, 'support.success.submitted'),
      ...publicPayload(row, resolved.locale),
    });
  } catch (err) {
    if (err.code === 'ARCHIVED') {
      const locale = req.supportLocale || 'sv-SE';
      return res.status(410).json({ error: t(locale, 'support.errors.archived') });
    }
    console.error('[SUPPORT] follow-up error:', redactSupportText(err.message));
    next(err);
  }
});

router.post('/escalate', limiter('support-escalate', 8), async (req, res, next) => {
  try {
    const resolved = await resolveOrReject(req, res, req.body?.token);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    if (resolved.row.status === 'archived') {
      return res.status(410).json({ error: t(resolved.locale, 'support.errors.archived') });
    }
    await requestHumanEscalation(resolved.verified.messageId, {
      source: 'user',
      reason: 'user_requested',
    });
    await touchToken(resolved.verified.tokenRow);
    const row = await contactMessages.getPublicThread(resolved.verified.messageId);
    res.json({
      message: t(resolved.locale, 'support.success.escalated'),
      ...publicPayload(row, resolved.locale),
    });
  } catch (err) {
    if (err.code === 'ARCHIVED') {
      return res.status(410).json({ error: t('sv-SE', 'support.errors.archived') });
    }
    console.error('[SUPPORT] escalate error:', redactSupportText(err.message));
    next(err);
  }
});

module.exports = router;
