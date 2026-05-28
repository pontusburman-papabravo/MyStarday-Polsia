/**
 * One-time setup: create Stripe product + price for My Starday.
 * Mounted at /api/stripe-setup (no auth — one-time use only).
 * Remove this file after product/price are created.
 */
const express = require('express');
const router = express.Router();

let stripe = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    stripe = require('stripe')(key, { apiVersion: '2025-04-30.basil' });
  }
  return stripe;
}

router.get('/setup-stripe', async (req, res) => {
  try {
    const s = getStripe();

    const product = await s.products.create({
      name: 'My Starday Premium',
      description: 'Familjeabonnemang – obegränsat antal barn',
    });

    const price = await s.prices.create({
      product: product.id,
      unit_amount: 5900,
      currency: 'sek',
      recurring: { interval: 'month' },
    });

    res.json({
      product_id: product.id,
      price_id: price.id,
      unit_amount: 5900,
      currency: 'sek',
      interval: 'month',
    });
  } catch (err) {
    console.error('[setup-stripe] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;