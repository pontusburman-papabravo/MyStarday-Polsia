/**
 * Payment success route — verifies Stripe checkout and injects pixel data.
 * Owns: checkout session verification via Polsia API, pixel data injection.
 * Does NOT own: Stripe webhook handling, payment creation.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Gate 2E: betalning — if feature is OFF, redirect to dashboard
router.get('/success', async (req, res) => {
  // No auth on this route (Stripe redirects here). Use checkAccessPublic with null familyId.
  // hasAccess(null, slug) returns false if feature.status is 'off' or doesn't exist.
  const { hasAccess } = require('../../db/features');
  const allowed = await hasAccess(null, 'betalning');
  if (!allowed) {
    return res.redirect('/dashboard?error=betalning_aktiverad');
  }
  const sessionId = req.query.checkout_session_id || req.query.session_id;
  if (!sessionId) {
    return res.redirect('/?error=missing_session');
  }

  let paymentData = null;
  try {
    const polsiaUrl = process.env.POLSIA_API_URL;
    const polsiaKey = process.env.POLSIA_API_KEY;
    if (polsiaUrl && polsiaKey) {
      const verifyRes = await fetch(
        `${polsiaUrl}/api/company-payments/verify?session_id=${encodeURIComponent(sessionId)}`,
        { headers: { Authorization: `Bearer ${polsiaKey}` } }
      );
      const json = await verifyRes.json();
      if (json.verified && json.payment) {
        paymentData = json.payment;
      }
    }
  } catch (err) {
    console.error('[payment/success] Verification error:', err.message);
  }

  const htmlPath = path.join(__dirname, '..', '..', 'public', 'payment-success.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const pixelData = paymentData
    ? JSON.stringify({ amount: paymentData.amount, currency: paymentData.currency || 'SEK' })
    : 'null';
  html = html.replace('__PIXEL_PAYMENT_DATA__', pixelData);
  res.type('html').send(html);
});

module.exports = router;
