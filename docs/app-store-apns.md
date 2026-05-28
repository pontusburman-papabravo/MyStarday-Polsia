# APNs Push Notifications (iOS)

Min Stjärndag sends push notifications to iOS devices via **Apple Push Notification service (APNs)** using HTTP/2 + token-based authentication (ES256 JWT). No third-party packages required — native Node.js `http2` and `crypto`.

## Environment Variables

All are read from `process.env`. The app logs a warning on startup if APNs is not configured — it will not crash.

| Variable | Required | Example | Description |
|---|---|---|---|
| `APNS_KEY_ID` | Yes | `ABC123DEF4` | 10-character Key ID from Apple Developer → Keys |
| `APNS_TEAM_ID` | Yes | `PQ7M3B7VW5` | Apple Team ID (found in Apple Developer account) |
| `APNS_KEY_PATH` | Yes | `/etc/secrets/apns.p8` | Absolute path to the `.p8` private key file |
| `APNS_BUNDLE_ID` | No | `com.mystarday.app` | App bundle ID (defaults to `com.mystarday.app`) |
| `APNS_SANDBOX` | No | `true` | Set to `"true"` to use sandbox (`api.sandbox.push.apple.com`) instead of production |

## How It Works

1. **JWT creation** — On each request, a short-lived ES256 JWT is created: `iss = TEAM_ID`, `iat = now`. Signed with the `.p8` private key.
2. **HTTP/2 POST** — Sent to `api.push.apple.com/3/device/<deviceToken>` with:
   - `apns-topic: <bundleId>` (required for stateless tokens)
   - `authorization: bearer <jwt>`
   - `content-type: application/json`
3. **Response handling** — Apple returns `200` on success, `4xx` on failure.

## Payload Structure

```json
{
  "aps": {
    "alert": {
      "title": "<title>",
      "body": "<body>"
    },
    "sound": "default",
    "mutable-content": 1
  },
  "data": {
    "url": "/schedule"
  }
}
```

- `mutable-content: 1` — enables the Notification Service Extension (content modification before display)
- `data.url` — deep-link path; the app uses this to navigate to the correct screen when the notification is tapped

## Error Codes & Token Cleanup

| Apple Reason | Meaning | Action |
|---|---|---|
| `BadDeviceToken` | Token is malformed or doesn't match the configured topic | **Delete token from `push_subscriptions`** |
| `Unregistered` | App was uninstalled or token was invalidated | **Delete token from `push_subscriptions`** |
| `TopicDisallowed` | Push to topic not allowed (check entitlements) | Log error, keep token |
| `DeviceTokenNotForTopic` | Token not registered for this bundle ID | Log error, keep token |
| `InternalServerError` | Apple's fault, temporary | Log error, keep token |

`BadDeviceToken` and `Unregistered` are treated as **permanent failures** — the token is immediately deleted from `push_subscriptions`. The `sendPushNotification` caller also removes invalid tokens via `deleteExpiredNativeSubscription`.

## Admin Test Endpoint

**`POST /api/admin/test-push`** (admin auth required)

Send a test push to all iOS/Android devices registered for a specific family.

```json
// Request
{
  "family_id": "uuid-of-family",
  "title": "Test push",
  "body": "Hej! Push fungerar!",
  "url": "/schedule"
}

// Response
{
  "success": true,
  "family_id": "...",
  "family_name": " Familjen",
  "parents_targeted": 2,
  "sent": 3,
  "failed": 0,
  "message": "Push skickad till 3 enheter för familj..."
}
```

## Testing

1. **In sandbox mode** — Set `APNS_SANDBOX=true` in Render env vars to target `api.sandbox.push.apple.com`.
2. **Via admin panel** — Go to `POST /api/admin/test-push` with the family's `family_id`.
3. **Verify token cleanup** — After a BadDeviceToken error, confirm the row is gone:
   ```sql
   SELECT * FROM push_subscriptions WHERE platform = 'ios' AND native_token = '<token>';
   ```
   (should return 0 rows)

## Provisioning Steps (Apple Developer)

1. Go to **Apple Developer → Account → Keys** → create a new Key or use existing
2. Note the **Key ID** (10 chars)
3. Download the `.p8` file — store it securely (e.g. in Render env vars as a multi-line value, or as a file on the server)
4. Set `APNS_KEY_PATH` to the path where the `.p8` file is mounted on the server
5. Ensure the app bundle ID in Xcode matches `APNS_BUNDLE_ID`
6. Enable **Push Notifications** capability in Xcode
7. In production, use a production APNs certificate or token (the `.p8` approach works for both with the right topic)

## App-Side Deep Link Handling

When a push notification is tapped, the app should read `data.url` from the payload and navigate accordingly. Example routing:

| `url` value | Screen |
|---|---|
| `/schedule` | Dagsschema |
| `/dashboard` | Dashboard |
| `/reports` | Rapporter |
| `/settings` | Inställningar |