/**
 * Upgrade success route — serves /upgrade/success after Stripe Checkout.
 * Owns: serving the success page (no auth needed, Stripe redirects here).
 * Does NOT own: Stripe webhook, payment verification.
 */
const express = require('express');
const router = express.Router();

router.get('/success', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../../public/upgrade-success.html'));
});

module.exports = router;