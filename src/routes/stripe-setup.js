/**
 * Stripe setup: create product + price and persist to app_settings.
 * GET /api/stripe-setup/status  — check current Stripe product/price status
 * POST /api/stripe-setup/create — create or confirm Basic App product + price (admin only)
 *
 * Trial: 14 days (built into the price via trial_period_days).
 * This route also handles the pre-existing GET /api/stripe-setup for backwards compat.
 */
const express = require('express');
const router = express.Router();
const appSettings = require('../../db/app-settings');

let stripe = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    stripe = require('stripe')(key, { apiVersion: '2025-04-30.basil' });
  }
  return stripe;
}

/**
 * GET /api/stripe-setup
 * Legacy compat: returns existing Stripe config if any.
 * New code should use GET /api/stripe-setup/status instead.
 */
router.get('/stripe-setup', async (req, res) => {
  try {
    const [priceId, productId] = await Promise.all([
      appSettings.getStripePriceId(),
      appSettings.getStripeProductId(),
    ]);
    if (priceId && productId) {
      res.json({ product_id: productId, price_id: priceId, unit_amount: 5900, currency: 'sek', interval: 'month' });
    } else {
      res.status(404).json({ error: 'No Stripe product configured yet. Use POST /api/stripe-setup/create.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stripe-setup/status
 * Returns the current Stripe product/price status from app_settings.
 */
router.get('/status', async (req, res) => {
  try {
    const [priceId, productId] = await Promise.all([
      appSettings.getStripePriceId(),
      appSettings.getStripeProductId(),
    ]);
    res.json({
      configured: !!(priceId && productId),
      product_id: productId || null,
      price_id: priceId || null,
      price_monthly_sek: 59,
      currency: 'sek',
      interval: 'month',
      trial_days: 14,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/stripe-setup/create
 * Creates the My Starday Basic product + price in Stripe.
 * Stores both IDs in app_settings so checkout and admin can read them.
 * Idempotent: if already configured, returns the existing IDs without creating duplicates.
 */
router.post('/create', async (req, res) => {
  try {
    const s = getStripe();

    // Check if already configured
    const [existingPriceId, existingProductId] = await Promise.all([
      appSettings.getStripePriceId(),
      appSettings.getStripeProductId(),
    ]);

    if (existingPriceId && existingProductId) {
      return res.json({
        product_id: existingProductId,
        price_id: existingPriceId,
        unit_amount: 5900,
        currency: 'sek',
        interval: 'month',
        trial_days: 14,
        already_existed: true,
      });
    }

    // Create product
    const product = await s.products.create({
      name: 'Min Stjärndag - Basic',
      description: 'Familjeabonnemang – 59 kr/månad, 14 dagars gratis provperiod',
    });

    // Create price with 14-day trial
    const price = await s.prices.create({
      product: product.id,
      unit_amount: 5900,
      currency: 'sek',
      recurring: {
        interval: 'month',
        trial_period_days: 14,
      },
    });

    // Persist to app_settings
    await Promise.all([
      appSettings.setStripeProductId(product.id),
      appSettings.setStripePriceId(price.id),
    ]);

    console.log(`[stripe-setup] Created product ${product.id}, price ${price.id} (14-day trial)`);

    res.json({
      product_id: product.id,
      price_id: price.id,
      unit_amount: 5900,
      currency: 'sek',
      interval: 'month',
      trial_days: 14,
      already_existed: false,
    });
  } catch (err) {
    console.error('[stripe-setup] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;