/**
 * Request ID middleware.
 * Owns: generating and propagating unique request IDs across logs.
 * Does NOT own: JWT parsing, rate limiting, auth.
 *
 * Generates a unique UUID for each request and attaches it to:
 *   - req.id — available for handler access
 *   - X-Request-ID response header — for debugging
 *
 * All logs within the request lifetime automatically inherit req.id
 * when using pino-http middleware (see server.js).
 *
 * Usage:
 *   app.use(requestIdMiddleware());
 */

const { v4: uuidv4 } = require('uuid');

function requestIdMiddleware() {
  return (req, res, next) => {
    // Use X-Request-ID header if provided by upstream proxy/load balancer,
    // otherwise generate a new UUID.
    req.id = req.get('X-Request-ID') || uuidv4();
    res.set('X-Request-ID', req.id);
    next();
  };
}

module.exports = requestIdMiddleware;
