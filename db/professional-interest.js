/**
 * DB queries for professional_interest table.
 * Owns: insert and list of professional interest form submissions.
 * Does NOT own: rate limiting (handled in route), email sending (handled in route).
 */
const { query } = require('../src/lib/db');

/**
 * Save a new professional interest submission.
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.role
 * @param {string|null} data.organization
 * @param {string|null} data.message
 * @param {boolean} data.gdprConsent
 * @param {string|null} data.ipAddress
 * @returns {Promise<object>} The created row
 */
async function createProfessionalInterest({ name, email, role, organization, message, gdprConsent, ipAddress }) {
  const result = await query(
    `INSERT INTO professional_interest (name, email, role, organization, message, gdpr_consent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, role, organization, created_at`,
    [name, email, role, organization || null, message || null, gdprConsent, ipAddress || null]
  );
  return result.rows[0];
}

/**
 * List all professional interest submissions, newest first.
 * @param {object} opts
 * @param {number} opts.limit
 * @param {number} opts.offset
 * @returns {Promise<{rows: object[], total: number}>}
 */
async function listProfessionalInterests({ limit = 50, offset = 0 } = {}) {
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT id, name, email, role, organization, message, created_at
       FROM professional_interest
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query('SELECT COUNT(*) AS total FROM professional_interest'),
  ]);
  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

/**
 * Delete a professional interest submission by id.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteProfessionalInterest(id) {
  const result = await query('DELETE FROM professional_interest WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { createProfessionalInterest, listProfessionalInterests, deleteProfessionalInterest };
