/**
 * Stripe webhook handler.
 * Owns: receiving and processing Stripe webhook events.
 * Does NOT own: checkout session creation, payment link generation.
 */
const express = require('express');

const router = express.Router();
const db = require('../lib/db');

// Stripe SDK — initialized lazily so the app doesn't crash if STRIPE_SECRET_KEY is absent
let stripe = null;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });
  }
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return stripe;
}

/**
 * POST /api/stripe/webhook
 * Stripe sends raw body with signature in header.
 * Verify signature using STRIPE_WEBHOOK_SECRET env var.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[stripe-webhook] Missing signature or webhook secret');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event;
  try {
    const s = getStripe();
    event = s.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // $userId matches the metadata key set when creating the checkout session
        const familyId = session.metadata?.family_id || session.client_reference_id;
        if (!familyId) {
          console.warn('[stripe-webhook] checkout.session.completed — no family_id in metadata');
          break;
        }
        await db.query(
          `UPDATE family
           SET subscription_status = 'active',
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [familyId, session.customer, session.subscription]
        );
        console.log(`[stripe-webhook] Activated family ${familyId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        if (sub.status === 'active' || sub.status === 'trialing') {
          await db.query(
            `UPDATE family
             SET subscription_status = 'active',
                 stripe_subscription_id = $2,
                 updated_at = NOW()
             WHERE stripe_customer_id = $1`,
            [customerId, sub.id]
          );
        } else if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'past_due') {
          await db.query(
            `UPDATE family
             SET subscription_status = 'expired',
                 updated_at = NOW()
             WHERE stripe_customer_id = $1 OR stripe_subscription_id = $2`,
            [customerId, sub.id]
          );
        }
        console.log(`[stripe-webhook] subscription.updated — ${sub.status} for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        await db.query(
          `UPDATE family
           SET subscription_status = 'expired',
               stripe_subscription_id = NULL,
               updated_at = NOW()
           WHERE stripe_customer_id = $1 OR stripe_subscription_id = $2`,
          [customerId, sub.id]
        );
        console.log(`[stripe-webhook] subscription.deleted — customer ${customerId}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[stripe-webhook] Processing error:', err.message, err.stack);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

module.exports = router;