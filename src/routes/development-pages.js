/**
 * Development page routes — serves admin development SPA pages.
 * Owns: /admin/development and /admin/development/:slug static page serving.
 */

const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/admin/development', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/development.html'));
});

router.get('/admin/development/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/development-detail.html'));
});

module.exports = router;