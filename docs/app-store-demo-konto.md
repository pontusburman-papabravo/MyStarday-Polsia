# App Store Review — Test Account

> Test account credentials and step-by-step walkthrough for Apple App Store reviewers.
> English — Apple reviewers read English.

**Production status:** Account created **2026-05-28** on https://mystarday.se via the normal registration/onboarding flow (not a database seed). School and weekend schedules plus Skattkammaren rewards were auto-generated like a real family. `is_lifetime_free=true`.

---

## Credentials

| Field | Value |
|-------|-------|
| Parent email | `review@mystarday.se` |
| Parent password | `AppReview2026!` |
| Child name | Anna |
| Child birthday | 2018-09-08 (~7 years in app) |
| Child PIN | `4455` |
| App URL | https://mystarday.se |
| Legacy PWA URL | https://stjarndag.polsia.app |

---

## How to log in

1. Open **Min Stjärndag** on a simulator or test device.
2. On the login screen, enter:
   - Email: `review@mystarday.se`
   - Password: `AppReview2026!`
3. Tap **Logga in** (Login).
4. You are now in the **parent dashboard**.

---

## What the parent sees

The parent dashboard shows:
- Family name (Review Family)
- 1 child profile: **Anna** (🌟) with an active weekly schedule
- A pre-populated example schedule with 5 activities
- Reward history (Skattkammaren / treasure chamber)
- Notification settings and push toggles

---

## How to switch to the child view

1. As the parent, tap the **child's card** or look for the "Byt till barnvy" (switch to child view) button.
2. Enter PIN: `4455`
3. You are now in the **child's daily view** — a colorful, star-themed interface showing today's schedule.
4. Children can tap activities to mark them complete and earn stars.

---

## Key features to demonstrate

| Feature | How to find it |
|---------|---------------|
| Weekly schedule | Dashboard → Veckoschema tab |
| Daily log | Dashboard → Daglig logg |
| Child view (PIN required) | Tap child avatar → enter `4455` |
| Skattkammaren (rewards) | Hamburger menu → Skattkammaren |
| Settings | Hamburger menu → Inställningar |
| Privacy Policy | `/privacy` on the web, or Settings → Integritetspolicy |
| Terms of Service | `/terms` on the web, or Settings → Användarvillkor |

---

## Test account setup (internal use only)

**Do not SQL-seed.** Create on production so onboarding copies default schedules and rewards:

1. https://mystarday.se/register — `review@mystarday.se` / `AppReview2026!`
2. Verify email from inbox
3. Add child **Anna**, birthday **2018-09-08**, PIN **4455** (avoid `1234` and Swedish special characters in the child name for international reviewers)
4. Confirm `is_lifetime_free` if still under the first 200 families (see `docs/RELEASE.md`)

---

## Expected test flow (App Store reviewer)

1. **Launch app** → see landing page / login screen
2. **Log in** with `review@mystarday.se` / `AppReview2026!`
3. **Parent dashboard** loads — shows family + child
4. **Tap "Byt till barnvy"** on the child card
5. **Enter PIN `4455`** → child daily view with stars
6. **Tap an activity** → it completes, star count increases
7. **Open Settings** → see privacy policy and terms links
8. **Log out** from the sidebar/hamburger menu
9. **Log in again** → verify session persists

---

## Troubleshooting

**Can't log in?**
- Confirm the account exists on production (`review@mystarday.se`, email verified)
- Try password reset at `/login?reset=1`

**Child PIN not working?**
- The PIN is `4455`. If it doesn't work, the child may not be created — check the migration.

**App loads as blank?**
- The app requires JavaScript and a network connection for the initial load.
- If offline, the PWA may show an offline page for non-cached routes.

---

## App URLs

| URL | Purpose |
|-----|---------|
| https://mystarday.se | Main app (production) |
| https://mystarday.se/privacy | Privacy Policy |
| https://mystarday.se/terms | Terms of Service |
| https://stjarndag.polsia.app | Legacy PWA host (redirects) |