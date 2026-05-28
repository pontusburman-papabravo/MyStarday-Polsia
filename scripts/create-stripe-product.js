/**
 * One-time script to create Stripe product + recurring price for My Starday.
 * Run: node scripts/create-stripe-product.js
 * Requires STRIPE_SECRET_KEY env var.
 */
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

async function main() {
  console.log('Creating My Starday Premium product...');

  const product = await stripe.products.create({
    name: 'My Starday Premium',
    description: 'Familjeabonnemang – obegränsat antal barn',
    metadata: {
      app: 'stjarndag',
    },
  });
  console.log('Product created:', product.id);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 5900, // 59.00 SEK
    currency: 'sek',
    recurring: {
      interval: 'month',
    },
    metadata: {
      app: 'stjarndag',
    },
  });
  console.log('Price created:', price.id);
  console.log('');
  console.log('=== RESULTS ===');
  console.log('STRIPE_PRODUCT_ID=' + product.id);
  console.log('STRIPE_PRICE_ID=' + price.id);
  console.log('');
  console.log('Set STRIPE_PRICE_ID in Render env vars to:', price.id);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});