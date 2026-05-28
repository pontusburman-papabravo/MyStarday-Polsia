# Authorization Audit — Min Stjärndag API

**Audited:** 2026-05-11
**Hardened:** 2026-05-11 (P1.3)
**Auditor:** Engineering agent
**Result:** No IDOR vulnerabilities found. All endpoints properly scoped. Centralized authz middleware added.

---

## Centralized Authz Middleware (`src/middleware/authz.js`)

All authorization helpers and middleware factories now live in a single module.

**Kill switch:** `AUTHZ_HARDENING_ENABLED=false` disables the new middleware and falls back to the existing per-route checks. Default: enabled.

### Exported helpers (async → row | null)

| Function | Verifies | Via |
|----------|----------|-----|
| `getChildAccess(parentId, childId)` | Parent owns child | `parent_child JOIN` |
| `getLogAccess(parentId, logId)` | Parent owns daily_log | `daily_log → child → parent_child` |
| `getItemAccess(parentId, itemId)` | Parent owns daily_log_item | `item → log → child → parent_child` |
| `getScheduleAccess(parentId, scheduleId)` | Parent owns weekly_schedule | child-scoped + family-level template |
| `getSpecialDayAccess(parentId, scheduleId)` | Parent owns special_day_schedule | `sds → child → parent_child` |
| `getRewardAccess(familyId, rewardId)` | Family owns reward | `WHERE family_id = $1` |
| `getActivityAccess(familyId, activityId)` | Family owns activity_template | `WHERE family_id = $1` |

### Middleware factories (return Express middleware, set req.authzXxx on pass)

| Factory | Sets on req | 403 message |
|---------|------------|-------------|
| `requireChildAccess(paramName)` | `req.authzChild` | Du har inte åtkomst till detta barn |
| `requireLogAccess(paramName)` | `req.authzLog` | Du har inte åtkomst till denna daglogg |
| `requireItemAccess(paramName)` | `req.authzItem` | Du har inte åtkomst till detta moment |
| `requireScheduleAccess(paramName)` | `req.authzSchedule` | Du har inte åtkomst till detta schema |
| `requireSpecialDayAccess(paramName)` | `req.authzSpecialDay` | Du har inte åtkomst till detta specialschema |

### Rollback

Set `AUTHZ_HARDENING_ENABLED=false` env var — all middleware factories become pass-through no-ops. The per-route helper functions in each route file remain in place as the fallback layer.

### Tests

`node tests/authz.test.js` — 28 tests covering IDOR scenarios (cross-family access, child isolation), kill switch, middleware factories, DB error propagation, invited parents.

---

---

## Authorization Model

Three roles, three middlewares:

| Role | Middleware | Token type | Identity |
|------|-----------|------------|----------|
| **Admin** | `requireAdmin` | JWT `role: admin` | `req.user.id` |
| **Parent** | `requireParent` | JWT `role: parent` | `req.user.id`, `req.user.familyId` |
| **Child** | `requireChild` | JWT `role: child` | `req.user.id` (child UUID) |

Invited parents (förälder 2) work via the `parent_child` table with `role: 'shared'`. They have the same access as primary parents — no restriction on which children they can see because the `JOIN parent_child pc ON pc.child_id = c.id WHERE pc.parent_id = $1` check passes for any parent linked to that child.

---

## Rollback Plan

Every auth check in the routes is a simple helper function (e.g. `getChildAccess()`, `getLogAccess()`, `getItemAccess()`). To roll back any individual check, comment out the `if (!X) return res.status(403)...` guard. No middleware needs touching. Changes are isolated.

---

## Endpoint Audit Table

| Endpoint | Method | Auth Required | Role Required | Family Scoped | IDOR Protection | Status |
|----------|--------|--------------|---------------|---------------|-----------------|--------|
| `/api/children` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/children/:id` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ 403 on wrong id | PASS |
| `/api/children/:id` | PUT | ✅ | Parent | ✅ `parent_child JOIN` | ✅ 403 on wrong id | PASS |
| `/api/children/:id` | DELETE | ✅ | Parent | ✅ `parent_child JOIN` | ✅ 403 on wrong id | PASS |
| `/api/children/:id/settings` | PUT | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/children/me/*` | * | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/activities` | GET | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/activities` | POST | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/activities/:id` | PUT | ✅ | Parent | ✅ `family_id check` | ✅ 404→family check | PASS |
| `/api/activities/:id` | DELETE | ✅ | Parent | ✅ `family_id check` | ✅ | PASS |
| `/api/rewards` | GET | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/rewards` | POST | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/rewards/:id` | PUT | ✅ | Parent | ✅ `family_id check` | ✅ | PASS |
| `/api/rewards/:id` | DELETE | ✅ | Parent | ✅ `family_id check` | ✅ | PASS |
| `/api/rewards/redeem` | POST | ✅ | Child | ✅ child's own `family_id` | ✅ | PASS |
| `/api/rewards/goals` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/rewards/goals/:childId` | PUT | ✅ | Parent | ✅ `parent_child + family_id` | ✅ | PASS |
| `/api/rewards/goal-change-requests/:id/approve` | PUT | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/rewards/goal-change-requests/:id/deny` | PUT | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/rewards/manual-stars` | POST | ✅ | Parent | ✅ `parent_child check` | ✅ | PASS |
| `/api/rewards/manual-stars/:childId` | GET | ✅ | Parent | ✅ `parent_child check` | ✅ | PASS |
| `/api/rewards/redemption-history` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/rewards/pending-requests` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/me/goal` | GET | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/me/goal` | POST | ✅ | Child | ✅ child's own `family_id` | ✅ | PASS |
| `/api/me/goal/change-request` | POST | ✅ | Child | ✅ child's own `family_id` | ✅ | PASS |
| `/api/me/manual-stars` | GET | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/children/:id/weekly-schedules` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/weekly-schedules/:id` | GET/PUT/DELETE | ✅ | Parent | ✅ `getScheduleAccess()` helper | ✅ | PASS |
| `/api/weekly-schedules/:id/items` | * | ✅ | Parent | ✅ `getScheduleAccess()` helper | ✅ | PASS |
| `/api/children/:id/special-days` | GET/POST/DELETE | ✅ | Parent | ✅ `getChildAccess()` helper | ✅ | PASS |
| `/api/special-day-schedules/:id/items` | * | ✅ | Parent | ✅ `getSpecialDayAccess()` helper | ✅ | PASS |
| `/api/children/:id/daily-log` | GET | ✅ | Parent | ✅ `getChildAccess()` helper | ✅ | PASS |
| `/api/children/:id/daily-logs` | GET | ✅ | Parent | ✅ `getChildAccess()` helper | ✅ | PASS |
| `/api/daily-log-items/:id/complete` | PUT | ✅ | Parent | ✅ `getItemAccess()` helper | ✅ | PASS |
| `/api/daily-log-items/:id/uncomplete` | PUT | ✅ | Parent | ✅ `getItemAccess()` helper | ✅ | PASS |
| `/api/daily-log-items/reorder` | PUT | ✅ | Parent | ✅ `getItemAccess()` helper | ✅ | PASS |
| `/api/daily-logs/:id/pause` | PUT | ✅ | Parent | ✅ `getLogAccess()` helper | ✅ | PASS |
| `/api/daily-logs/:id/unpause` | PUT | ✅ | Parent | ✅ `getLogAccess()` helper | ✅ | PASS |
| `/api/daily-logs/:id/bump-time` | PUT | ✅ | Parent | ✅ `getLogAccess()` helper | ✅ | PASS |
| `/api/children/me/daily-log` | GET | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/children/me/daily-log-items/:id/complete` | PUT | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/children/me/daily-log-items/:id/uncomplete` | PUT | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/children/me/daily-log-items/:id/sub-steps` | GET | ✅ | Child | ✅ `child_id = req.user.id` | ✅ | PASS |
| `/api/categories` | GET/POST | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/categories/:id` | PUT/DELETE | ✅ | Parent | ✅ `family_id check` | ✅ | PASS |
| `/api/family` | GET/PUT | ✅ | Parent | ✅ `WHERE id = req.user.familyId` | ✅ | PASS |
| `/api/family/invite/:token` | GET | ❌ (public) | None | — invite token is the credential | ✅ | PASS |
| `/api/family/invites` | POST | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/messages/unread` | GET | ✅ | Parent | ✅ `familyId` | ✅ | PASS |
| `/api/messages/:id/read` | PUT | ✅ | Parent | ✅ `familyId check` | ✅ | PASS |
| `/api/reminders` | GET/PUT | ✅ | Parent | ✅ `family_id` | ✅ | PASS |
| `/api/children/:id/calendar-week` | GET | ✅ | Parent | ✅ `parent_child JOIN` | ✅ | PASS |
| `/api/account/export-data` | GET | ✅ | Parent | ✅ `WHERE p.id = parentId` | ✅ | PASS |
| `/api/account/delete-request` | POST | ✅ | Parent | ✅ `req.user.id` | ✅ | PASS |
| `/api/push/subscribe` | POST | ✅ | Parent | ✅ `req.user.id` | ✅ | PASS |
| `/api/push/preferences` | GET/PUT | ✅ | Parent | ✅ `req.user.id` | ✅ | PASS |
| `/api/onboarding/*` | POST | ✅ | Parent | ✅ `family_id` + `parent_child check` | ✅ | PASS |
| `/api/admin/*` | * | ✅ | Admin | Global (by design) | ✅ | PASS |
| `/api/auth/login` | POST | ❌ (public) | None | — login produces token | ✅ | PASS |
| `/api/auth/refresh` | POST | ❌ (httpOnly cookie) | None | — validated by token | ✅ | PASS |
| `/api/auth/logout` | POST | ❌ (public) | None | — clears cookie | ✅ | PASS |
| `/api/auth/csrf-token` | GET | ❌ (public) | None | — returns CSRF token | ✅ | PASS |

---

## Key Patterns Used

### Family-scoped data
```sql
WHERE family_id = req.user.familyId
```

### Child-scoped data (IDOR protection)
```sql
SELECT c.* FROM child c
JOIN parent_child pc ON pc.child_id = c.id
WHERE pc.parent_id = $1 AND c.id = $2
```
This pattern correctly handles invited parents (förälder 2) — they have a `parent_child` row for their assigned children, so the JOIN succeeds without needing a `family_id` check.

### Child self-access
```sql
WHERE child_id = req.user.id   -- OR --  WHERE id = req.user.id
```

### Log/item access (indirect IDOR protection)
```sql
SELECT dli.* FROM daily_log_item dli
JOIN daily_log dl ON dl.id = dli.daily_log_id
JOIN child c ON c.id = dl.child_id
JOIN parent_child pc ON pc.child_id = c.id
WHERE pc.parent_id = $1 AND dli.id = $2
```

---

## Role Matrix

| Action | Admin | Förälder 1 (primary) | Förälder 2 (invited) | Barn |
|--------|-------|---------------------|---------------------|------|
| View all families | ✅ | ❌ | ❌ | ❌ |
| View own family data | ✅ | ✅ | ✅ own children | ❌ |
| Modify family settings | ✅ | ✅ | ✅ | ❌ |
| View child schedules | ✅ | ✅ assigned | ✅ assigned | Own only |
| Complete activities | ✅ | ✅ assigned | ✅ assigned | Own only |
| Manage rewards | ✅ | ✅ | ✅ | Read + redeem |
| View other child's data | ✅ | ❌ | ❌ | ❌ |
| Admin panel | ✅ | ❌ | ❌ | ❌ |

---

## Notes

- **404 vs 403 on item lookups:** Several item-level endpoints return 404 (not 403) when the item doesn't exist or is unauthorized. This is a minor information-disclosure risk (tells attacker whether a UUID exists). Mitigation: UUIDs are v4 and non-enumerable, so brute-forcing is infeasible. No change recommended.
- **Public endpoints:** Login, register, CSRF token, and family invite token lookup are intentionally public. The invite token is a 256-bit random credential — guessing is infeasible.
- **Admin routes:** Guarded by `requireAdmin` middleware. Admin has intentional full access to all family data (support + impersonation). All admin actions logged to `admin_audit_log`.
