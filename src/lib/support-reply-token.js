'use strict';

/**
 * Opaque support reply tokens (sr1.<random>).
 * Raw token never stored — SHA-256 hash only.
 * Legacy sf1.{id}.{hmac} is verify-only until LEGACY_TOKEN_SUNSET.
 */

const crypto = require('crypto');
const config = require('./config');
const tokens = require('../../db/contact-message-reply-tokens');
const contactMessages = require('../../db/contact-messages');
const events = require('../../db/contact-message-events');
const {
  TOKEN_PREFIX,
  LEGACY_PREFIX,
  TOKEN_BYTES,
  isLegacySunsetPassed,
  expiryDate,
} = require('../../config/support-reply-token');
const { verifySupportFollowUpToken } = require('./support-follow-up-token');

const OPAQUE_RE = new RegExp(`^${TOKEN_PREFIX}\\.[A-Za-z0-9_-]{40,}$`);
const LEGACY_RE = new RegExp(`^${LEGACY_PREFIX}\\.\\d+\\.[A-Za-z0-9_-]+$`);

function hashRaw(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function generateRawToken() {
  return `${TOKEN_PREFIX}.${crypto.randomBytes(TOKEN_BYTES).toString('base64url')}`;
}

function isOpaqueToken(raw) {
  return typeof raw === 'string' && OPAQUE_RE.test(raw.trim());
}

function isLegacyToken(raw) {
  return typeof raw === 'string' && LEGACY_RE.test(raw.trim());
}

function containsMessageId(raw) {
  if (!isOpaqueToken(raw)) return false;
  const body = raw.trim().slice(TOKEN_PREFIX.length + 1);
  return /^\d+$/.test(body);
}

function threadPath(raw) {
  return `/support/svar/${raw}`;
}

function followUpUrl(raw) {
  const base = String(config.email.baseUrl || '').replace(/\/$/, '');
  return `${base}${threadPath(raw)}`;
}

function classifyFailure(row, now = new Date()) {
  if (!row) return 'invalid';
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at) <= now) return 'expired';
  return null;
}

async function issueReplyToken(messageId, { createdBy = 'system' } = {}) {
  const id = Number(messageId);
  if (!Number.isInteger(id) || id < 1) {
    const err = new Error('support reply token requires numeric message id');
    err.code = 'INVALID_MESSAGE_ID';
    throw err;
  }

  const caseRow = await contactMessages.getMessageById(id);
  if (!caseRow) {
    const err = new Error('Ärendet hittades inte');
    err.statusCode = 404;
    throw err;
  }
  if (caseRow.status === 'archived') {
    const err = new Error('archived');
    err.code = 'ARCHIVED';
    err.statusCode = 410;
    throw err;
  }

  const raw = generateRawToken();
  const tokenHash = hashRaw(raw);
  const row = await tokens.insertToken({
    contactMessageId: id,
    tokenHash,
    expiresAt: expiryDate(),
    createdBy,
  });
  await events.logEvent(id, 'reply_token_created', {
    payload: {
      token_id: row.id,
      created_by: createdBy,
      expires_at: row.expires_at,
    },
  });
  return { raw, row };
}

async function revokeActiveTokens(messageId, { reason = 'revoked' } = {}) {
  const revoked = await tokens.revokeActiveForMessage(messageId);
  if (revoked.length) {
    await events.logEvent(messageId, 'reply_token_revoked', {
      payload: { count: revoked.length, reason },
    });
  }
  return revoked;
}

async function verifyOpaqueToken(raw) {
  const token = typeof raw === 'string' ? raw.trim() : '';
  if (!isOpaqueToken(token) || containsMessageId(token)) {
    return { ok: false, reason: 'invalid' };
  }
  const row = await tokens.findByHash(hashRaw(token));
  const reason = classifyFailure(row);
  if (reason) return { ok: false, reason };
  return { ok: true, messageId: row.contact_message_id, tokenRow: row };
}

async function migrateLegacyToOpaque(messageId) {
  const issued = await issueReplyToken(messageId, { createdBy: 'legacy_migration' });
  await events.logEvent(messageId, 'legacy_reply_token_migrated', {
    payload: { token_id: issued.row.id },
  });
  return issued;
}

async function verifyLegacyToken(raw, { now } = {}) {
  if (isLegacySunsetPassed(now)) {
    return { ok: false, reason: 'sunset' };
  }
  const verified = verifySupportFollowUpToken(raw);
  if (!verified.ok) return { ok: false, reason: 'invalid' };
  const caseRow = await contactMessages.getMessageById(verified.messageId);
  if (!caseRow) return { ok: false, reason: 'invalid' };
  if (caseRow.status === 'archived') return { ok: false, reason: 'archived' };
  return { ok: true, messageId: verified.messageId, legacy: true };
}

/**
 * Resolve a bearer token from URL/body. Fail closed.
 * @returns {Promise<{ok:true,messageId:number,tokenRow?:object,legacy?:boolean}|{ok:false,reason:string}>}
 */
async function resolveSupportToken(raw, { now } = {}) {
  const token = typeof raw === 'string' ? raw.trim() : '';
  if (!token) return { ok: false, reason: 'invalid' };
  if (isOpaqueToken(token)) return verifyOpaqueToken(token);
  if (isLegacyToken(token)) return verifyLegacyToken(token, { now });
  return { ok: false, reason: 'invalid' };
}

async function touchToken(tokenRow) {
  if (!tokenRow || !tokenRow.id) return null;
  return tokens.markUsed(tokenRow.id);
}

function rawTokenLooksStored(value) {
  if (typeof value !== 'string') return false;
  return isOpaqueToken(value) || isLegacyToken(value);
}

module.exports = {
  hashRaw,
  generateRawToken,
  isOpaqueToken,
  isLegacyToken,
  containsMessageId,
  threadPath,
  followUpUrl,
  issueReplyToken,
  revokeActiveTokens,
  verifyOpaqueToken,
  verifyLegacyToken,
  migrateLegacyToOpaque,
  resolveSupportToken,
  touchToken,
  rawTokenLooksStored,
};
