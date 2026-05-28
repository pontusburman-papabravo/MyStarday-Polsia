const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  // Reduced from 20 → 5: Neon Serverless can't sustain 20 concurrent connections.
  // Cold-start connections (first after inactivity) can take 10–30s to establish
  // on serverless Postgres. A smaller pool with tight timeouts ensures fast fail
  // rather than exhaustion + indefinite hang.
  max: 5,
  // Fail fast if no connection available rather than queuing indefinitely
  connectionTimeoutMillis: 5000,
  // Kill connections idle >30s — prevents Neon keeping old connections alive
  // which can cause "idle connection过期" on serverless after inactivity
  idleTimeoutMillis: 30000,
  // Kill any individual query after 15s — prevents one slow query from
  // holding a connection forever and exhausting the pool (Neon Serverless
  // shared infra can be sluggish; this ensures fast fail on the server side).
  statement_timeout: 15000,
});

/**
 * Execute a query with parameterized values.
 * @param {string} text - SQL query
 * @param {any[]} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Get a client from the pool for transactions.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
