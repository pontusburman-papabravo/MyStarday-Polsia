# Min Stjärndag

Swedish family app for children's daily routines, star rewards, and schedule management. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber).

## Stack

Express.js + Neon PostgreSQL + Tailwind CDN, deployed on Render.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (requires DATABASE_URL)
DATABASE_URL="postgresql://..." npm run dev

# Run tests (Node 20)
npm test

# Node 24+ requires quoted glob:
# node --test 'test/*.test.js'

# Run linter (requires eslint installed)
npm run lint
```

> **Note:** `npm install` is required before running tests locally. Several test
> files `require()` route modules that depend on express, pg, and other
> packages. Without `node_modules`, the upload/auth suites will crash and
> cancel. CI (`.github/workflows/ci.yml`) handles this automatically via
> `npm ci`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Server port (default: 3000) |
| `JWT_SECRET` | Yes | Secret for signing access tokens (15-min JWTs) |
| `JWT_SECRET_PREVIOUS` | No | Previous secret for zero-downtime key rotation |
| `NODE_ENV` | No | Set to `production` in deployed env |
| `VAPID_PUBLIC_KEY` | No | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | No | Web Push VAPID private key |
| `EMAIL_ENABLED` | No | Set to `false` to disable email sending |
| `REQUIRE_EMAIL_VERIFICATION` | No | Set to `false` after email delivery confirmed |
| `SECURITY_HEADERS_ENABLED` | No | Set to `false` to disable security headers |

## Database

Schema is managed via `migrate.js` (runs on every deploy via `npm run build`).

Create new migrations in `migrations/` with timestamp prefix:
```
migrations/1750000000000_add_new_table.js
```

## External Integrations

- **Polsia email proxy** — invite emails and notifications (configured via Polsia infra)
- **Polsia R2 proxy** — image uploads for manual star grants
- **Polsia Stripe proxy** — payment checkout
- **Web Push (VAPID)** — browser push notifications

## Key Endpoints

- `GET /health` — Health check (no DB query)
- `POST /api/auth/login` — Parent login (returns access token)
- `POST /api/auth/child-login` — Child login with PIN
- `POST /api/auth/refresh` — Silent token refresh
- `POST /api/auth/logout` — Logout

## Deployment

Deployed to Render. Push to main auto-deploys to staging. Manual production deploy via GitHub Actions.

Build: `npm run build` (= `npm run migrate`)
Start: `npm start`