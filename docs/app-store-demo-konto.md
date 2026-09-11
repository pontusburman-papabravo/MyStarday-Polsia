# App Store Review — Test Accounts

> Test account **references** for Apple App Store and Google Play reviewers.
> English — Apple reviewers read English.
>
> **Cursor / Cloud Agents:** use [`founder-qa-test-account.md`](founder-qa-test-account.md) (`FOUNDER_QA_*`) for routine QA — **not** these accounts unless the task is App Store / release QA.

**Values are stored outside the repository** in approved secret management. See [`secret-references.md`](secret-references.md).

---

## Two accounts — do not mix them up

Use these **exact labels** in App Store Connect Review Information:

| Label in ASC | Secret names | Purpose |
|--------------|--------------|---------|
| **IN-APP PURCHASE REVIEW ACCOUNT — USE THIS ACCOUNT TO REVIEW PREMIUM MONTHLY / PREMIUM YEARLY** | `APP_REVIEW_IAP_EMAIL` / `APP_REVIEW_IAP_PASSWORD` | **Only** account that can reach Premium Monthly + Premium Yearly in Apple's sandbox while public billing stays off. |
| **COMPLIMENTARY DEMO ACCOUNT — PREMIUM ALREADY INCLUDED; DO NOT USE THIS ACCOUNT TO REVIEW IN-APP PURCHASES** | `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD` | Full free Premium for routine parent/child testing. **No** Monthly/Yearly purchase UI — grandfathered family. |

When Apple asks to locate In-App Purchases (Guideline 2.1(b)), give them the **IAP review** credentials and the navigation in [`app-store-review-notes.md`](app-store-review-notes.md) (Build 1.4.3 / 1160 section). Complete the approval gate in [`runbooks/APP-REVIEW-IAP-FAMILY.md`](runbooks/APP-REVIEW-IAP-FAMILY.md) first — including **Paid Apps Agreement = Active**.

---

## Complimentary review account

| Field | Secret / reference |
|-------|---------------------|
| Parent email | `APP_REVIEW_EMAIL` |
| Parent password | `APP_REVIEW_PASSWORD` |
| Child name | Anna (public) |
| Child PIN | `APP_REVIEW_CHILD_PIN` |
| Parent app-lock PIN | `APP_REVIEW_PARENT_PIN` (when parental gate is used) |

### How to log in

1. Open the configured live app URL from App Store Connect / Play Console notes.
2. Parent login: `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD`.
3. Child login: select **Anna** → PIN from `APP_REVIEW_CHILD_PIN`.

### What the parent sees

- Family name (Review Family)
- Child profile **Anna** with an active weekly schedule
- Example schedule and rewards (Skattkammaren)
- **Premium included permanently** — no subscription purchase required or shown

---

## IAP review account (subscriptions)

| Field | Secret / reference |
|-------|---------------------|
| Parent email | `APP_REVIEW_IAP_EMAIL` |
| Parent password | `APP_REVIEW_IAP_PASSWORD` |

This family is on the server sandbox allowlist only (`REVENUECAT_SANDBOX_FAMILY_IDS`). It is **not** grandfathered and **not** lifetime free.

### Locate Premium Monthly / Premium Yearly (native iOS)

1. Launch the app and sign in with `APP_REVIEW_IAP_EMAIL` / `APP_REVIEW_IAP_PASSWORD`.
2. Tap **Inställningar** (Settings) in the bottom navigation.
3. Tap **Premium**.
4. Tap **Aktivera Premium** (or **View subscriptions** in English).
5. On the subscription screen, select **Premium Yearly** or **Premium Monthly**, then tap **Fortsätt**.
6. Apple's sandbox purchase sheet opens. **Restore Purchases** is on the same screen.

No production charge occurs during review. Public billing remains disabled for all other users. <!-- pragma: allowlist secret -->

### Verify before replying to Apple

```bash
APP_REVIEW_IAP_EMAIL=... APP_REVIEW_IAP_PASSWORD=... \
  node scripts/ops/verify-app-review-iap-path.cjs
```

Optional: also pass `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD` to confirm the complimentary account stays purchase-blocked.

---

## Store Connect / Play Console

Paste **secret names** in internal runbooks; paste **actual values** only in App Store Connect / Play Console secure fields or 1Password — never in git.

For IAP submissions, App Review Information should list **both** accounts with clear labels:

- **Routine testing** → complimentary account
- **In-App Purchases (Premium Monthly / Premium Yearly)** → IAP review account + steps above

## Rotation

If review credentials may have been exposed, rotate via `scripts/ops/rotate-compromised-credentials.mjs` on the server (see ops runbook) and update App Store Connect / Play Console demo account fields. After rotating the IAP account, update `REVENUECAT_SANDBOX_FAMILY_IDS` with the new family UUID (see [`runbooks/APP-REVIEW-IAP-FAMILY.md`](runbooks/APP-REVIEW-IAP-FAMILY.md)).

## Related

- [`app-store-review-notes.md`](app-store-review-notes.md)
- [`runbooks/APP-REVIEW-IAP-FAMILY.md`](runbooks/APP-REVIEW-IAP-FAMILY.md)
- [`google-play-review-notes.md`](google-play-review-notes.md)
