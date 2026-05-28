# App Store Review Notes — Min Stjärndag

> English — paste everything below the line into App Store Connect **Review Notes**.
> Last updated: 2026-05-28 | Production: https://mystarday.se | SW v129

---

## App Purpose

**Min Stjärndag** ("My Starday") is a family routine app for parents and children aged 3–10. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber). The app supports Swedish and English, includes PIN-protected child views, and runs as a native iOS app (Capacitor) that loads our production web app.

Key features:
- Parent dashboard with weekly schedule builder
- Child view (PIN-protected) with star rewards
- Push notifications for schedule reminders (APNs on physical devices)
- Sign in with Apple for parents
- Skattkammaren (reward redemption)
- Swedish + English
- In-app subscription via Apple IAP (RevenueCat) — **no Stripe or external payment links in the iOS app**

---

## Test Account

Please use our dedicated App Store review test account (already created on production):

| Field | Value |
|-------|-------|
| **Parent email** | `review@mystarday.se` |
| **Parent password** | `AppReview2026!` |
| **Child name** | Anna |
| **Child date of birth** | 2018-09-08 (age ~7 in the app) |
| **Child PIN** | `4455` |
| **Production URL** | https://mystarday.se |

This account is for review only. It includes standard schedules and rewards like a real family. It has **lifetime free** access (founding-family tier) — no subscription is required to test all features.

---

## How to Test the Full Flow

1. **Open the app** on a physical iPhone (recommended) or simulator
2. **Log in** with `review@mystarday.se` / `AppReview2026!`
3. **Parent dashboard** — one child profile (Anna)
4. **Switch to child view** — tap the child card → enter PIN `4455`
5. **Complete an activity** — mark an activity done to earn a star
6. **Return to parent view** — "Switch back to parent mode" → PIN `4455`
7. **Skattkammaren** — open from the menu; view rewards and redemption
8. **Settings** — Privacy Policy and Terms of Service
9. **Optional:** Sign in with Apple (requires a real Apple ID on a **physical device**)

---

## Child PIN

- **PIN:** `4455`
- **Child:** Anna (no Swedish special characters in the name, for international reviewers)
- Used whenever the app asks for the child PIN (parent ↔ child mode switch)

---

## Build & Technical Notes

| Field | Value |
|-------|-------|
| Bundle ID | `se.mystarday.app` |
| App version | 1.0.0 (Build 1) |
| Backend | https://mystarday.se |
| Sign in with Apple | Enabled (`APPLE_CLIENT_ID=se.mystarday.app`) |
| Subscriptions | Apple IAP via RevenueCat; web Stripe is **not** offered in the iOS app |
| Push | APNs — works on **physical devices** only (not on simulator) |

---

## Notes for the Reviewer

- Default language is Swedish; English is available in parent settings.
- **Push:** Simulators cannot receive APNs — this is an Apple limitation. Use a real device to test notifications.
- **Sign in with Apple:** Requires a physical device and a real Apple ID.
- **Payments:** The review account does not need a purchase; it has lifetime free access. To test IAP, use a Sandbox Apple ID (optional).
- **No external payment:** Stripe and web checkout are hidden on native iOS (App Store Guideline 3.1.1).
- Account deletion: Settings → delete account (Apple Guideline 5.1.1).

---

## Privacy & Compliance

- Family data: names, routines, child profiles (no payment card data in the review account)
- Passwords: bcrypt
- Push tokens: stored per parent; removable on logout/unsubscribe
- GDPR: export/delete via Settings
- Privacy Policy: https://mystarday.se/privacy
- Terms of Service: https://mystarday.se/terms

---

## Contact

- **Email:** support@mystarday.se
- **Website:** https://mystarday.se

We respond to App Store review questions within 24 hours.
