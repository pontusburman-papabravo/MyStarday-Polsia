# Min Stjärndag

A Swedish family app for children's daily routines, star rewards, and schedule management. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber).

## Stack

Express.js + Neon PostgreSQL + Tailwind CDN, deployed on Render.

## Directory map

- `server.js` — Express entry point, middleware, route mounting (under 300 lines)
- `src/routes/` — All API route handlers (auth, onboarding, rewards, schedules, messages, etc.)
- `src/middleware/` — Auth middleware, rate limiter, maintenance mode, impersonation write-block, CSRF protection, validate (Zod), authz (centralized authorization helpers + middleware factories), platform-html (injects platform-theme.js + platform-native.css into all HTML responses)
- `src/lib/` — Shared utilities (db, config, hashing, i18n, schedulers, schemas, win-back-scheduler.js)
- `db/` — Named DB query functions per entity (system-messages.js, etc.)
- `public/` — Static HTML pages, CSS, client JS (SPA-like pages served by Express)
- `migrations/` — Database migrations (node-pg-migrate format)
- `config/` — Configuration files (subscription-components.js)

## Database

- `family` — household unit with timezone and section time settings; also holds is_lifetime_free BOOLEAN (all existing families = true), subscription_status ('none'|'active'|'expired'|'grace_period'|'cancelled'; defaults 'none' post-IAP migration), trial_ends_at, stripe_customer_id, stripe_subscription_id, rc_customer_id VARCHAR(255) (RevenueCat linkage)
- `parent` — parent account (email auth, family role, account_type ('family'|'educator'|'dual'), preferred_view_mode ('parent'|'pedagog'), push_preferences JSONB, admin_push_enabled, apple_user_id/apple_email for Apple Sign In)
- `child` — child profile (name, emoji, avatar_url, birthday, PIN, view_type, username, child_view_config JSONB with view_mode + element visibility flags); avatar_url enables profile photo upload with fallback chain: image → emoji → ⭐-placeholder
- `parent_child` — parent-to-child link (primary/shared/pedagog roles); revoked_at/revoked_by for soft deletion; connected_at when pedagogen linked
- `pedagog_invite` — educator invite tokens (family_id, email, invitee_name, child_ids, token, expires_at, accepted/accepted_at)
- `activity_template` — family-scoped activities (legacy table name; API is `/api/activities`); `source` column ('admin'|'user') tracks origin
- `default_activity_template` — admin-seeded global activity library (sub_steps JSONB)
- `default_schedule` / `default_schedule_item` — admin-managed standard schedules (copied to children)
- `weekly_schedule` / `weekly_schedule_item` — per-child 7-day schedules (name column for named templates)
- `special_day_schedule` / `special_day_schedule_item` — date-specific overrides
- `daily_log` / `daily_log_item` — daily completion tracking with star values; `daily_log_item.completed_date` (DATE) stores the schedule day for each completion (supports retroactive entry)
- `reward` / `reward_redemption` — star-cost rewards and child redemptions
- `default_reward` — admin-seeded global reward library
- `streak` — child streak tracking
- `feature_flag` — operational and feature flags
- `family_invite` — multi-parent invite tokens
- `admin_audit_log` — admin impersonation sessions and blocked write attempts (admin_id, target_family_id, action, metadata)
- `push_subscriptions` — push subscriptions per parent; web uses endpoint+subscription_json; native uses native_token+platform ('web'|'ios'|'android'); platform/native_token added 2026-05-25
- `system_messages` — admin-to-family direct notifications (id, family_id, message, is_read, created_at)
- `refresh_token` — httpOnly refresh tokens (hashed SHA-256; parent_id or child_id, expires_at, 30d TTL by default); access_token cookie also 30d so refresh works on PWA reopen
- `pin_lockout` — per-child PIN lockout state (attempt_count, locked_until); one row per child, upserted
- `pin_notification_log` — tracks when parent was notified about PIN failures (for email cooldown)
- `pin_audit_log` — immutable audit trail of all PIN events (attempts, lockouts, notifications, unlocks)
- `dagens_nyhet` — admin-published news items (title, body 280 chars, show_landing, send_push, expires_at 48h, status: draft/scheduled/published/unpublished, publish_at, unpublish_at, email_sent_count, email_sent_at, email_failed)
- `newsletters` — standalone newsletter dispatches (subject, body text, status: draft/sent/failed, sent_at, sent_count, failed_count); separate from dagens_nyhet
- `welcome_email_template` — editable welcome email sent to new parents on registration (id=1, subject, body with **bold** + `{{foralderns_namn}}` vars, is_active boolean); seeded on deploy
- `email_subscriptions` — newsletter opt-in/out tracking (parent_id FK, email, subscribed, subscribed_at, unsubscribed_at, unsubscribe_token UUID)
- `notification_log` — per-parent push notification archive (id, parent_id, title, body, type, url, is_read, created_at); pruned after 7 days by midnight scheduler
- `analytics_events` — anonymised event stream (family_id UUID, event_type, metadata JSONB, created_at, time_bucket smallint); no PII; indexed on (event_type, created_at), (time_bucket, created_at), (family_id, event_type)
- `analytics_daily_snapshots` — one row per day with active_families_24h/7d, stars_given, rewards_claimed, conversion_rate, pwa counts, newsletter subscribers; written by midnight scheduler
- `surveys` — survey/form definitions (slug, title, description, target_tag, status: draft/active/paused/closed, opens_at, closes_at, thank-you config)
- `survey_questions` — ordered questions per survey (types: radio, checkbox, text_short, text_long, scale; conditional logic via condition_question_id + condition_option_id)
- `survey_options` — answer choices for radio/checkbox questions (allows_freetext flag)
- `survey_responses` — one per respondent session; status in_progress → submitted; GDPR consent + email optional
- `survey_response_answers` — one row per question per response; upserted for partial save
- `survey_participants` — cookie_token + fingerprint duplicate detection per survey
- `survey_popup_interactions` — per-parent/cookie popup action log (shown/snoozed/dismissed/clicked; snooze_until for 3-day cooldown)
- `survey_contest_entries` — contest respondents (respondent_email, is_winner, is_contacted); one per response
- `email_templates` — four admin-editable email templates (undersokning|valkomstmail|nyhetsbrev|win-back; subject, body_text plain text with variable support); win-back added 2026-05-26
- `win_back_email_log` — approval-gated win-back send log (status: pending_approval|approved|sent|rejected; parent_email, parent_name, child_name, sent_at nullable, created_at for 48h stale tracking); replaces direct email send in scheduler
- `schedule_date_exclusion` — per-date exclusion for recurring schedule items ("bara denna dag" delete); PK (child_id, date, activity_template_id)
- `professional_interest` — interest form submissions from /pedagoger-och-terapeuter (name, email, role, organization, message, gdpr_consent, ip_address, created_at)
- `waitlist` — English landing page email signups (name, email, utm_source, ip_address, created_at); unique on email; used for launch outreach
- `professional_share_link` — parent-created report share links for professionals (family_id, child_id, public_id UUID, label, parent_summary, date_from/to, pin_hash, fields TEXT[], expires_at 7d, revoked_at, view_count)
- `pedagog_notes` — daily structured observations by pedagogen-role parents (child_id, pedagog_id, date, mood 1-5, sleep_quality 1-5|'easy'|'slow'|'difficult', sleep_hours, meals, behavior, notes, meals_structured JSONB, is_draft boolean); unique (child, pedagog, date)
- `child_observation` — free-standing notes per child per date (id, child_id, parent_id, date, section: 'fm'|'em'|'kvall', content, is_important, created_at, updated_at); used for "Allmän observation" in reports
- `general_observations` — family-level, time-agnostic notes (id, family_id, created_at, archived_at, text, is_important); separate from child_observation; supports archive/restore; used for "Allmän observation" in Rapporter → Aktiviteter-fliken
- `features` — feature flag master list (slug, name, description, status: dev/live/off, tags, priority, complexity, estimated_hours, documentation JSONB); indexes on status + slug
- `family_features` — family-to-feature access mapping (family_id FK, feature_slug FK, enabled_at); PK (family_id, feature_slug); used to gate dev-mode features per family
- `family_subscriptions` — component-based subscription model (family_id FK, tier: 'lifetime_free'|'trial'|'paid', trial_expires_at TIMESTAMPTZ, components JSONB); GIN index on components; has_component() SQL function; 96 existing families migrated to lifetime_free with basic_app

## External integrations

- **Polsia R2 proxy** — image uploads for manual star grants and child avatar photos
- **Polsia email proxy** — all outbound email (verification, invite, welcome, newsletter, PIN warning, account deletion, feedback, weekly summary); via `src/lib/email.js` → `https://polsia.com/api/proxy/email/send`; `POLSIA_API_KEY` env var; kill switch `EMAIL_ENABLED=false`; sender always `Min Stjärndag <info@mystarday.se>` (from name is hardcoded, never uses parent's name)
- **Polsia Stripe proxy** — payment checkout and verification (Stripe SDK at `stripe@17` for webhook verification via `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars)
- **Web Push (VAPID)** — push notifications via VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env vars
- **Apple APNs** — iOS native push via raw HTTP/2 + ES256 JWT auth (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH, APNS_BUNDLE_ID env vars); BadDeviceToken/Unregistered tokens are auto-deleted from push_subscriptions; docs at `docs/app-store-apns.md`
- **Facebook Graph API** — cross-post dagens nyhet to page feed (FACEBOOK_PAGE_ACCESS_TOKEN + FACEBOOK_PAGE_ID env vars)

## Recent changes

- 2026-05-29: Feature — Capacitor plugin installation (SW v143): `@capacitor-community/apple-sign-in` (not `@nicholaswmin/...`) added to package.json + declared in capacitor.config.ts; `SignInWithApple` + `Camera` plugins added to config.plugins. `@capacitor/camera` added as devDependency. ⚠️ Xcode manual install: `npm install @capacitor/camera @capacitor-community/apple-sign-in && npx cap sync ios` then rebuild in Xcode. Files: package.json, capacitor.config.ts, public/js/platform.js, CLAUDE.md.
- 2026-05-29: Feature — Avatar picker fix + Capacitor plugins (SW v142): `Platform.camera.upload()` updated from `/api/upload/image` → `/api/upload/avatar` (correct 2MB avatar endpoint); `initIOSAvatarPicker()` guard changed from `Platform.isNative()` → `Platform.isIOS()` (camera iOS-only per spec); onboarding avatarPreview uses R2 placeholder URL; `package.json` added `@capacitor/cli` devDep only. ⚠️ Xcode manual install required: `npm install @capacitor/camera @capacitor-community/apple-sign-in && npx cap sync ios`. Files: public/js/platform.js, public/js/onboarding.js, public/onboarding.html, package.json, CLAUDE.md.
- 2026-05-29: Feature — iOS camera avatar picker (SW v141): DEL A — `platform.js` `appleSignIn.isAvailable()` guard + clear error on iOS when plugin not installed; login.html gates Apple button on iOS. DEL B — `Platform.camera.pick()` + `Platform.camera.upload()` in platform.js; onboarding step 1 shows iOS photo picker replacing emoji grid; child-settings.html "Byt bild" button on iOS; OnboardingChildSchema accepts `avatar_url`; POST /api/onboarding/child stores `avatar_url`. `public/img/avatar-child-default.svg` placeholder asset. ⚠️ Xcode manual: `npm install @capacitor/camera @capacitor-community/apple-sign-in && npx cap sync ios`. Files: public/js/platform.js, public/js/onboarding.js, public/js/child-settings.js, public/onboarding.html, public/login.html, public/child-settings.html, src/lib/schemas.js, src/routes/onboarding.js, CLAUDE.md.
- 2026-05-29: Feature — Child avatar upload backend (SW v140): `child.avatar_url TEXT NULL` via migration; `POST /api/upload/avatar` (2MB, jpeg/png/webp magic-byte validation); `CreateChildSchema`/`UpdateChildSchema` accept `avatar_url`; GET /children and GET /children/:id include `avatar_url`; avatar deleted on child removal. Files: migrations/1748940780_add_child_avatar_url.sql, src/routes/upload.js, src/routes/children.js, src/lib/schemas.js, CLAUDE.md.
- 2026-05-29: Feature — Child avatar display fallback chain (SW v139): `child.avatar_url` column added; `renderChildAvatar(child, size)` helper in `dom-utils.js` (avatar → emoji → ⭐-placeholder). Updated all child-list views: dashboard.js, family.js, reports.js, daily-log.js, calendar.html, pedagog-oversikt.html, family-week.html. Files: migrations/1780045136_add_child_avatar_url.js, public/js/dom-utils.js, CLAUDE.md.
- 2026-05-29: Bugfix — Apple Sign In module resolution error (SW v137): `platform.js` använde `await import('@sign-in-with-apple/native')` — en fabricerad bare-specifier som inte finns. Capacitor WebView (remote URL) har ingen bundler. Ersatt med `Capacitor.Plugins.SignInWithApple.authorize()` via bridge. Mappade `.response.identityToken` + `.response.fullName` till existerande return-format. Files: public/js/platform.js, public/sw.js, CLAUDE.md.
- 2026-05-29: Feature — Native vs Webb platform CSS gates (SW v134): `public/js/platform-theme.js` synkront IIFE (`.platform-native/.platform-ios/.platform-android/.platform-web/.platform-pwa` på `<html>`, native redirect `/`→`/login`). `public/css/platform-native.css` gömmer hero/hamburger/web payment, safe-area insets, tap-highlight, user-select. `src/middleware/platform-html.js` wrappar `res.send` och injicerar scripts i alla HTML responses (idempotent). Server.js monterar `platformHtmlInject` efter `globalLimiter`. `.web-payment-only` på upgrade.html-prissektion. Files: server.js, src/middleware/platform-html.js, public/js/platform-theme.js, public/css/platform-native.css, public/upgrade.html, public/sw.js, CLAUDE.md.
- 2026-05-29: Feature — "Kolla din inkorg"-banner i onboarding (SW v133): Dismissible banner above content in onboarding.html tells unverified parents to check inbox for verification email from info@mystarday.se. Shows only when `verified=false`. Includes "Skicka igen" button calling `POST /api/auth/resend-verification`. Swedish copy, email masked in UI. Banner state not persisted (re-shows on revisit). Files: public/onboarding.html, public/js/onboarding.js, CLAUDE.md.
- 2026-05-28: Hotfix — Registrering kraschade (SW v132): auth.js INSERT INTO family använde 'trial'/'beta' som subscription_status, men CHECK constraint (från IAP-migration v127) tillåter bara 'none'|'active'|'expired'|'grace_period'|'cancelled'. Ändrat till 'none' för både vanlig och Apple-registrering. Files: src/routes/auth.js, public/sw.js, CLAUDE.md.
