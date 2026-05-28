/**
 * Feature access helper.
 * Returns true if the family has access to the named feature:
 *   - status = 'live' (globally available), OR
 *   - status = 'dev' AND family_id exists in family_features
 * Usage: const hasIt = await featureAccess(familyId, 'my_feature_slug');
 */
const { hasAccess } = require('../../db/features');

module.exports = { featureAccess: hasAccess };