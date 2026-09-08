'use strict';

const SUPPORT_CACHE_CONTROL = 'private, no-store, no-cache, must-revalidate';
const SUPPORT_REFERRER_POLICY = 'no-referrer';

function applySupportSecurityHeaders(res) {
  res.setHeader('Cache-Control', SUPPORT_CACHE_CONTROL);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', SUPPORT_REFERRER_POLICY);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function supportSecurityHeadersMiddleware(req, res, next) {
  applySupportSecurityHeaders(res);
  next();
}

function isSupportTokenPath(pathname) {
  const path = String(pathname || '');
  return (
    path.startsWith('/support/svar/')
    || path === '/api/support/thread'
    || path === '/api/support/follow-up'
    || path === '/api/support/escalate'
  );
}

module.exports = {
  SUPPORT_CACHE_CONTROL,
  SUPPORT_REFERRER_POLICY,
  applySupportSecurityHeaders,
  supportSecurityHeadersMiddleware,
  isSupportTokenPath,
};
