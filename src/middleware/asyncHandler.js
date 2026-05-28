/**
 * Wraps an async Express route handler so unhandled rejections are forwarded
 * to Express's error middleware (app.use((err, req, res, next) => {...})).
 *
 * Without this, async route handlers in Express 4 silently swallow thrown errors —
 * the request hangs and Node logs "UnhandledPromiseRejectionWarning".
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };