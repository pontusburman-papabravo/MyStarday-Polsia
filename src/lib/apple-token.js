'use strict';

/**
 * Sign in with Apple token exchange + revocation (Guideline 5.1.1(v)).
 * Identity still comes from verifyAppleIdToken(); this module only handles
 * authorization-code → refresh_token capture and revoke-on-delete.
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');

function parentDb() {
  return require('../../db/parent');
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const CLIENT_SECRET_TTL_SEC = 15777000; // Apple max: 6 months

function appleTeamId() {
  return String(process.env.APPLE_TEAM_ID || '').trim();
}

function appleKeyId() {
  return String(process.env.APPLE_SIGN_IN_KEY_ID || process.env.APPLE_KEY_ID || '').trim();
}

function appleWebClientId() {
  return String(process.env.APPLE_CLIENT_ID || '').trim();
}

function appleNativeClientId() {
  return String(process.env.APPLE_BUNDLE_ID || '').trim();
}

function readApplePrivateKey() {
  const inline = process.env.APPLE_SIGN_IN_PRIVATE_KEY || process.env.APPLE_PRIVATE_KEY;
  if (inline && /BEGIN [A-Z ]*PRIVATE KEY/.test(inline)) {
    return inline.replace(/\\n/g, '\n');
  }
  const keyPath = process.env.APPLE_SIGN_IN_KEY_PATH || process.env.APPLE_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  return null;
}

function isAppleTokenRevocationConfigured() {
  return Boolean(
    appleTeamId()
    && appleKeyId()
    && readApplePrivateKey()
    && (appleWebClientId() || appleNativeClientId())
  );
}

function createAppleClientSecret(clientId) {
  const key = readApplePrivateKey();
  const teamId = appleTeamId();
  const keyId = appleKeyId();
  if (!key || !teamId || !keyId || !clientId) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: now + CLIENT_SECRET_TTL_SEC,
      aud: APPLE_ISSUER,
      sub: clientId,
    },
    key,
    { algorithm: 'ES256', keyid: keyId }
  );
}

function clientIdsForHint(clientHint) {
  const nativeId = appleNativeClientId();
  const webId = appleWebClientId();
  if (clientHint === 'native') {
    return [nativeId, webId].filter(Boolean);
  }
  return [webId, nativeId].filter(Boolean);
}

async function postAppleForm(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

async function exchangeAppleAuthorizationCode({ code, clientId, redirectUri }) {
  if (!code || !clientId) {
    return { ok: false, reason: 'missing_input' };
  }
  const clientSecret = createAppleClientSecret(clientId);
  if (!clientSecret) {
    return { ok: false, reason: 'not_configured' };
  }
  const params = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  };
  if (redirectUri) params.redirect_uri = redirectUri;
  const result = await postAppleForm(APPLE_TOKEN_URL, params);
  if (!result.ok || !result.json || !result.json.refresh_token) {
    return { ok: false, reason: 'exchange_failed', status: result.status };
  }
  return {
    ok: true,
    refreshToken: result.json.refresh_token,
    accessToken: result.json.access_token || null,
  };
}

async function revokeAppleToken({ token, clientId, tokenTypeHint = 'refresh_token' }) {
  if (!token || !clientId) {
    return { ok: false, reason: 'missing_input' };
  }
  const clientSecret = createAppleClientSecret(clientId);
  if (!clientSecret) {
    return { ok: false, reason: 'not_configured' };
  }
  const result = await postAppleForm(APPLE_REVOKE_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    token,
    token_type_hint: tokenTypeHint,
  });
  if (result.ok || result.status === 200) {
    return { ok: true };
  }
  return { ok: false, reason: 'revoke_failed', status: result.status };
}

async function captureAppleRefreshToken({
  parentId,
  authorizationCode,
  clientHint,
  redirectUri,
}) {
  if (!parentId || !authorizationCode || typeof authorizationCode !== 'string') {
    return { stored: false, reason: 'missing_code' };
  }
  if (!isAppleTokenRevocationConfigured()) {
    return { stored: false, reason: 'not_configured' };
  }
  const errors = [];
  for (const clientId of clientIdsForHint(clientHint)) {
    const exchanged = await exchangeAppleAuthorizationCode({
      code: authorizationCode,
      clientId,
      redirectUri,
    });
    if (exchanged.ok) {
      await parentDb().saveAppleRefreshToken(parentId, exchanged.refreshToken, clientHint);
      return { stored: true, clientId };
    }
    errors.push(exchanged.reason);
  }
  console.warn('[APPLE] refresh token capture failed', { reasons: errors });
  return { stored: false, reason: 'exchange_failed' };
}

/**
 * Revoke stored Apple refresh tokens. Never throws — deletion must proceed.
 * @param {{ parentId?: string, familyId?: string, client?: { query: Function } }} opts
 */
async function revokeStoredAppleTokens(opts = {}) {
  const { parentId = null, familyId = null, client = null } = opts;
  const rows = await parentDb().listAppleRefreshTokens({ parentId, familyId, client });
  if (!rows.length) {
    return { attempted: 0, revoked: 0, skipped: 0, reason: 'no_tokens' };
  }
  if (!isAppleTokenRevocationConfigured()) {
    console.error('[APPLE] token revocation not configured; stored tokens cannot be revoked');
    return { attempted: 0, revoked: 0, skipped: rows.length, reason: 'not_configured' };
  }

  let revoked = 0;
  let skipped = 0;
  for (const row of rows) {
    let ok = false;
    for (const clientId of clientIdsForHint(row.apple_client_hint)) {
      const result = await revokeAppleToken({
        token: row.apple_refresh_token,
        clientId,
      });
      if (result.ok) {
        ok = true;
        break;
      }
    }
    if (ok) revoked += 1;
    else skipped += 1;
  }
  return { attempted: rows.length, revoked, skipped };
}

module.exports = {
  appleTeamId,
  appleKeyId,
  appleWebClientId,
  appleNativeClientId,
  isAppleTokenRevocationConfigured,
  createAppleClientSecret,
  exchangeAppleAuthorizationCode,
  revokeAppleToken,
  captureAppleRefreshToken,
  revokeStoredAppleTokens,
};
