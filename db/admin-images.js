/**
 * Admin image bank CRUD — tracks images uploaded by admins via the image bank.
 * Owns: all queries for admin_uploaded_images table.
 * Does NOT own: the R2 upload itself (see routes/admin/images.js).
 */

const db = require('../src/lib/db');

/** Returns all images newest-first */
async function listAll(uploaderId) {
  const res = await db.query(
    `SELECT id, url, filename, mime_type, file_size, created_at
     FROM admin_uploaded_images
     ORDER BY created_at DESC`
  );
  return res.rows;
}

/** Returns a single image by id */
async function getById(id) {
  const res = await db.query(
    `SELECT id, uploader_id, url, filename, mime_type, file_size, created_at
     FROM admin_uploaded_images WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/** Inserts a new record and returns the row */
async function create({ uploaderId, url, filename, mimeType, fileSize }) {
  const res = await db.query(
    `INSERT INTO admin_uploaded_images (uploader_id, url, filename, mime_type, file_size, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, url, filename, mime_type, file_size, created_at`,
    [uploaderId, url, filename, mimeType, fileSize]
  );
  return res.rows[0];
}

/** Deletes an image by id */
async function deleteById(id) {
  const res = await db.query(
    `DELETE FROM admin_uploaded_images WHERE id = $1 RETURNING id, url`,
    [id]
  );
  return res.rows[0] || null;
}

module.exports = { listAll, getById, create, deleteById };