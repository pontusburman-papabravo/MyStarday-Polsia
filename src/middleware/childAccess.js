/**
 * childAccess middleware — centralized parent→child ownership check.
 * Owns: asserting that req.user (parent) has a parent_child link to :childId.
 * Does NOT own: JWT verification (auth.js), family-level scoping (authz.js).
 *
 * On success: sets req.child = { id, family_id, timezone, birthday, name }
 * On failure: responds 403 immediately — downstream handlers are not called.
 *
 * Usage:
 *   const { requireChildAccess } = require('../middleware/childAccess');
 *   router.get('/:childId/foo', requireChildAccess, handler);
 */

'use strict';

const db = require('../lib/db');

/**
 * Fetch the child row if the parent owns it, otherwise null.
 * Returns all commonly needed child columns so callers avoid a second query.
 */
async function getChildForParent(parentId, childId) {
  const result = await db.query(
    `SELECT c.id, c.family_id, c.timezone, c.birthday, c.name, c.emoji
     FROM child c
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND c.id = $2`,
    [parentId, childId]
  );
  return result.rows[0] || null;
}

/**
 * Express middleware — reads childId from req.params.childId.
 * Attaches the resolved child to req.child on success.
 */
async function requireChildAccess(req, res, next) {
  try {
    const parentId = req.user && req.user.id;
    const { childId } = req.params;

    if (!parentId || !childId) {
      return res.status(400).json({ error: 'Ogiltigt anrop' });
    }

    const child = await getChildForParent(parentId, childId);
    if (!child) {
      return res.status(403).json({ error: 'Inget tillstånd för detta barn' });
    }

    req.child = child;
    next();
  } catch (err) {
    console.error('[CHILD-ACCESS] Middleware error:', err.message);
    res.status(500).json({ error: 'Internt fel' });
  }
}

module.exports = { requireChildAccess, getChildForParent };
