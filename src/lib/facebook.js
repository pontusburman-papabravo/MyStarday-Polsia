/**
 * src/lib/facebook.js
 * Owns: Facebook Graph API integration — page token setup and posting to the page feed.
 * Does NOT own: deciding when to post (routes/dagens-nyhet.js, nyhet-scheduler.js).
 *
 * Env vars required:
 *   FACEBOOK_PAGE_ACCESS_TOKEN  — long-lived page token
 *   FACEBOOK_PAGE_ID            — numeric page ID
 *
 * Token setup: call setupFacebookPageToken(userToken) once to exchange a short-lived
 * user token for a long-lived page token and persist it via the update_env_vars API.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';
const TIMEOUT_MS = 10_000;

/**
 * Returns true if Facebook posting is configured and enabled.
 */
function isFacebookConfigured() {
  return !!(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID);
}

/**
 * Exchange a short-lived user access token for a long-lived page access token.
 * Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET env vars.
 *
 * @param {string} userToken  Short-lived user access token
 * @returns {{ pageId: string, pageToken: string, longLivedToken: string }}
 */
async function getFacebookPageToken(userToken) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET env vars are required');
  }

  // Step 1: Get page list from user token
  const accountsRes = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(userToken)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) }
  );
  const accountsData = await accountsRes.json();

  if (!accountsRes.ok || accountsData.error) {
    const msg = accountsData.error?.message || `HTTP ${accountsRes.status}`;
    throw new Error(`Facebook /me/accounts failed: ${msg}`);
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const page = accountsData.data?.find(p => !pageId || p.id === pageId);

  if (!page) {
    const ids = (accountsData.data || []).map(p => p.id).join(', ');
    throw new Error(`Page ${pageId || '?'} not found in /me/accounts. Available: ${ids}`);
  }

  const shortPageToken = page.access_token;

  // Step 2: Exchange for long-lived token
  const exchangeUrl = `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(shortPageToken)}`;

  const exchangeRes = await fetch(exchangeUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const exchangeData = await exchangeRes.json();

  if (!exchangeRes.ok || exchangeData.error) {
    const msg = exchangeData.error?.message || `HTTP ${exchangeRes.status}`;
    throw new Error(`Facebook token exchange failed: ${msg}`);
  }

  return {
    pageId: page.id,
    pageName: page.name,
    longLivedToken: exchangeData.access_token,
  };
}

/**
 * Post a message to the Facebook page feed.
 * Returns the Facebook post ID.
 *
 * @param {{ title: string, body: string }} nyhet
 * @returns {Promise<string>} Facebook post ID
 */
async function postNyhetToFacebook(nyhet) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    throw new Error('Facebook integration not configured (missing FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ID)');
  }

  // Format post message: title on first line, body below
  const message = `${nyhet.title}\n\n${nyhet.body}`;

  const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: token,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    throw new Error(`Facebook post failed: ${msg}`);
  }

  return data.id; // e.g. "1084073184794967_123456789"
}

module.exports = { isFacebookConfigured, getFacebookPageToken, postNyhetToFacebook };
