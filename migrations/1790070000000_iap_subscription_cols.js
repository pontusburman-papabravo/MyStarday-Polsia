/**
 * IAP subscription columns + subscription_status values for RevenueCat.
 * Idempotent — safe to re-run on deploy.
 */
module.exports = {
  name: 'iap_subscription_cols',
  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS is_lifetime_free BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS rc_customer_id VARCHAR(255)
    `);

    // One-time: all families that exist at IAP release are lifetime free
    await client.query(`
      UPDATE family SET is_lifetime_free = true WHERE is_lifetime_free IS NOT TRUE
    `);

    // Normalize legacy status values; trial window stays on trial_ends_at
    await client.query(`
      UPDATE family
      SET subscription_status = 'none'
      WHERE subscription_status IN ('trial', 'beta')
    `);

    await client.query(`
      ALTER TABLE family
        ALTER COLUMN subscription_status SET DEFAULT 'none'
    `);

    // Replace CHECK constraint if present (ignore if constraint name differs)
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE family DROP CONSTRAINT IF EXISTS family_subscription_status_check;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await client.query(`
      ALTER TABLE family
        ADD CONSTRAINT family_subscription_status_check
        CHECK (subscription_status IN (
          'none', 'active', 'expired', 'grace_period', 'cancelled',
          'trial', 'beta'
        ))
    `);
  },
};
