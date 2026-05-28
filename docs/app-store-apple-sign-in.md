# Apple Sign In — App Store Review & Architecture Documentation

**Författare:** Engineering agent
**Datum:** 2026-05-28
**Version:** 1.0

---

## Översikt

Min Stjärndag stödjer "Logga in med Apple" (Sign in with Apple) enligt Apples krav för alla appar med sociala inloggningsalternativ. Implementeringen använder JWT-verifikation mot Apples publika JWKS-nycklar — ingen hemlig nyckel på servern, ingen omdirigering.

---

## Arkitektur

### Frontend → Backend-flöde

```
┌─────────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│  Native iOS-klient  │        │   Webbläsare (iOS)    │        │  Backend (Node) │
│                     │        │                      │        │                  │
│ window.Platform     │        │ window.Platform       │        │  verifyAppleIdToken()
│ .appleSignIn.signIn │        │ .appleSignIn.signIn  │        │  (fetch JWKS +  │
│                     │        │                      │        │   RSA verify)   │
│ @sign-in-with-apple │        │ appleid.apple.com    │        │                  │
│ /native             │        │ /auth/js             │        │ POST /api/auth/apple
│                     │        │                      │        │   → scenario    │
│   idToken + name    │───────▶│   idToken            │───────▶│   routing       │
└─────────────────────┘        └──────────────────────┘        └────────┬────────┘
                                                                         │
                                                                         ▼
                                                                ┌──────────────────┐
                                                                │  parent table    │
                                                                │                  │
                                                                │ apple_user_id    │
                                                                │ apple_email     │
                                                                │ (UNIQUE)        │
                                                                └──────────────────┘
```

### Plattformspecifik beteende

**`public/js/platform.js`** exponerar `window.Platform.appleSignIn.signIn()`:

| Plattform | Implementation | Klient-ID |
|-----------|---------------|-----------|
| **Native iOS** (Capacitor) | `@sign-in-with-apple/native` plugin | `se.mystarday.app` |
| **Web / iOS Safari** | Dynamiskt laddad `https://appleid.apple.com/auth/js` | `se.mystarday.app` |
| Android / Desktop | Knappen visas INTE (se `login.html` rad 281) | — |

Villkoret för att visa Apple-knappen:
```js
if (window.Platform && (window.Platform.isIOS() || window.Platform.isNative())) {
  // visa appleLoginSection / appleRegisterSection
}
```

### Backend: Token-verifikation

**`src/routes/auth.js`** — `verifyAppleIdToken()` (rad 1305):

1. **Dekoda JWT-header** → hämta `kid` (key ID) och `alg` (måste vara `RS256`)
2. **Hämta Apples publika nycklar** → `GET https://appleid.apple.com/auth/keys`
3. **Cachning** → 24 timmar i minnet (`_appleJwksCache`)
4. **RSA-verifikation** → bygger PEM från JWK, verifierar signatur
5. **Claim-kontroll** → `issuer: https://appleid.apple.com`, `audience: se.mystarday.app`
6. **Returnerar** `payload` med `{ sub, email, ... }`

### Databasschema

**`migrations/1787770000000_apple_sign_in.js`**:

```sql
ALTER TABLE parent
  ADD COLUMN apple_user_id VARCHAR(255) UNIQUE,  -- Apples "sub" (subject identifier)
  ADD COLUMN apple_email   VARCHAR(255)           -- Privatlänkad e-post från Apple

CREATE INDEX idx_parent_apple_user_id ON parent(apple_user_id)
```

**`db/parent.js`** — tre funktioner:

| Funktion | SQL | Används i |
|----------|-----|-----------|
| `getParentByAppleUserId(appleUserId)` | `WHERE apple_user_id = $1` | `/api/auth/apple` — Scenario 1 |
| `getParentByEmail(email)` | `WHERE email = $1` | `/api/auth/apple` — Scenario 3 |
| `linkAppleUserId(parentId, appleUserId, appleEmail)` | `SET apple_user_id, apple_email` | `/api/auth/apple/link` |

---

## De Tre Scenarierna

### Scenario 1: Befintlig Apple-användare → 200 Inloggning

```
Användare trycker "Logga in med Apple"
  → Native/webb hämtar idToken från Apple
  → POST /api/auth/apple med idToken

Backend:
  1. verifyAppleIdToken() → { sub: "001xxx", email: "ann@example.com" }
  2. getParentByAppleUserId("001xxx") → parent-rad hittad
  3. completeLogin() → Bearer-token + httpOnly-refresh-cookie
  → 200 { user, csrfToken, expiresAt }
```

**Existerande Apple-användare:** Hen har redan `apple_user_id` i databasen. Hen loggas in direkt utan att behöva skapa nytt konto eller hantera e-postkonflikt.

---

### Scenario 2: Ny användare → 201 Skapa konto

```
POST /api/auth/apple med idToken

Backend:
  1. verifyAppleIdToken() → { sub: "002yyy", email: "new@example.com" }
  2. getParentByAppleUserId("002yyy") → null
  3. getParentByEmail("new@example.com") → null  ← ingen befintlig e-post
  4. createParentWithApple() → INSERT parent + family
  5. completeLogin()
  → 201 { user, csrfToken, expiresAt }
```

**Ny användare:** `verified = true` (Apple är identity provider), `has_password = false`, `subscription_status = 'beta'` + `family_subscriptions` sätts till `lifetime_free`.

---

### Scenario 3: E-postkonflikt → 409 + länkningsprompt

```
POST /api/auth/apple med idToken

Backend:
  1. verifyAppleIdToken() → { sub: "003zzz", email: "existing@example.com" }
  2. getParentByAppleUserId("003zzz") → null
  3. getParentByEmail("existing@example.com") → parent-rad med has_password = true
  → 409 { code: "email_conflict", email: "existing@example.com" }

Frontend i login.html (rad 443-446):
  409 + code === 'email_conflict'
    → spara idToken + email i _applePendingIdToken + _applePendingEmail
    → visa appleLinkingPrompt (Ja, länka / Avbryt)
```

**Länkningsflöde (`handleAppleLink()`):**

```
POST /api/auth/apple/link
  Headers: Cookie med befintlig session (password-konto)
  Body: { identityToken: "...", email: "existing@example.com" }

Backend:
  1. verifyAppleIdToken() → { sub: "003zzz", email: "existing@example.com" }
  2. Kontrollera att req.user är inloggad (type === 'parent')
  3. getParentByAppleUserId("003zzz") → null (ännu inte linkat)
  4. linkAppleUserId(req.user.id, "003zzz", "existing@example.com")
  → 200 { message: "Apple-konto länkat!" }

Framtida inloggningar → Scenario 1 direkt.
```

---

## Flödesdiagram

```
                    Apple ID trycks
                         │
            ┌────────────┴────────────┐
            │                         │
    ┌───────▼──────────┐    ┌─────────▼──────────┐
    │ Native (iOS)     │    │ Web (iOS Safari)    │
    │ @sign-in-with-   │    │ appleid.apple.com   │
    │ apple/native     │    │ /auth/js popup      │
    └───────┬──────────┘    └─────────┬──────────┘
            │                         │
            └──────────┬──────────────┘
                       │ idToken
                       ▼
            ┌──────────────────────┐
            │ POST /api/auth/apple │
            │ { idToken, name? }   │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
  ┌─────▼─────┐  ┌────▼────┐  ┌─────▼──────┐
  │  apple_   │  │ email   │  │ Inget      │
  │  user_id  │  │ finns,  │  │ finns →    │
  │  hittas   │  │ has_pw  │  │ Skapa konto│
  │  → 200    │  │ = true  │  │ → 201      │
  └───────────┘  │ → 409   │  └────────────┘
                 └────┬────┘
                      │
                 appleLinkingPrompt
                      │
              ┌────────▼────────┐
              │ POST /api/auth/│
              │ apple/link     │
              │ (med cookie    │
              │  för befintligt│
              │  konto)        │
              └───────┬────────┘
                      │
             apple_user_id
             updaterad
             → Framtida 200
```

---

## Apple Review-instruktioner

Apple granskar Sign in with Apple-implementationer enligt App Store Review Guideline 4.8. Testpersonen behöver ett Apple-ID som **inte** är kopplat till ett befintligt Min Stjärndag-konto.

### Steg-för-steg testguide

**Testa Scenario 1 (befintlig Apple-användare):**

1. Öppna appen → startsida → "Logga in" → "Logga in med Apple"
2. Välj befintligt Apple-ID → godkänn datadelning
3. Förväntat: direkt inloggning → dashboard
4. Verifiera: meny → kontoinställningar → Apple-ikonen syns (inget lösenordsfält)

**Testa Scenario 2 (nytt konto):**

1. Logga ut om inloggad
2. "Registrera" → "Registrera med Apple"
3. Välj nytt Apple-ID (eller samma Apple-ID efter att Scenario 1-linkning är avbruten)
4. Förväntat: konto skapas, redirect till onboarding
5. Verifiera: nytt familjekonto i databasen

**Testa Scenario 3 (länkning):**

1. Skapa ett konto med e-post + lösenord manuellt
2. Logga ut → "Logga in med Apple" med samma Apple-ID som i Scenario 2
3. Förväntat: 409-prompt visas: "Ett konto med denna e-postadress finns redan. Vill du länka?"
4. Tryck "Ja, länka"
5. Förväntat: omdirigering till dashboard (samma session som password-konto)
6. Verifiera: länkat konto får `apple_user_id` i databasen

### Observera för granskare

- **E-post-validering:** Apple döljer e-postadressen och kan erbjuda en privat relay (`@privaterelay.appleid.com`). Appen hanterar detta — `apple_email`-kolumnen kan vara `null` vid privat relay.
- **Namn:** Endast `firstName` skickas (av Capacitor/native SDK). `lastName` hanteras inte — backend bygger `displayName` som `${firstName} ${lastName || ''}`.
- **Webbsimulation:** Apple granskar endast den iOS-nativa versionen, men webbsidan (`login.html`) använder samma backend-slutpunkt och beter sig identiskt.

---

## Slutvalidering — login.html & register.html

Genomförd 2026-05-28. Resultat nedan.

### login.html

| Kontroll | Status | Anteckning |
|----------|--------|------------|
| Formuläret har alla obligatoriska fält | ✅ | email + password, required-attribut |
| Form-submit: event.preventDefault() | ✅ | Rad 292 |
| `setLoading()`-funktionsnamn korrekt | ✅ | Definerad i auth.js rad 434 |
| `showError()` / `hideError()` korrekta ID:ar | ✅ | `loginError`, `appleLoginError` |
| `Auth.isLoggedIn()`, `Auth.getUser()` | ✅ | Från auth.js, finns i global scope |
| `apiFetch()`-anrop korrekt | ✅ | Rad 305, raw Response → `.json().catch(()=>({}))` |
| 409 med `code === 'email_conflict'` | ✅ | Rad 443 |
| appleLinkingPrompt visas vid 409 | ✅ | Rad 446 |
| `handleAppleLink()` → POST `/api/auth/apple/link` | ✅ | Rad 467 |
| `dismissAppleLinking()` nollställer state | ✅ | Rad 489-492 |
| Apple-knapp: `onclick="handleAppleLogin()"` | ✅ | Rad 92 |
| `Platform.appleSignIn.signIn()` korrekt metod | ✅ | Rad 424 |
| `idToken` key i request body | ✅ | Rad 430 |
| `result.idToken` guard för avbruten inloggning | ✅ | Rad 425 |
| Error-guards: `catch(err) { showError }` | ✅ | Rad 450-451 |
| `handleAppleLink` har `event.target` referens | ⚠️ | Rad 461 — `event` implicit global; fungerar i allefallen |
| CSS: `.hidden` används konsekvent | ✅ | Tailwind-hidden-klass |
| Script-ordning: platform.js → auth.js → i18n.js → auth inline | ✅ | Rad 19, 45-46, 242-493 |
| Service worker registration | ✅ | Rad 498 |
| Cookie-banner | ✅ | Rad 63 |
| Stängnings-html-taggar | ✅ | </body>, </html> |

### register.html

| Kontroll | Status | Anteckning |
|----------|--------|------------|
| Formuläret har alla obligatoriska fält | ✅ | name + email + password + confirmPassword |
| Client-side validation (längd, match) | ✅ | Rad 362-388 |
| `Auth.api()` används korrekt (kastar på fel) | ✅ | Rad 394-401 |
| `Auth.setAuth()` efter register + login | ✅ | Rad 413 |
| `Auth.redirectToDashboard()` → /onboarding | ✅ | Rad 416 |
| Meta Pixel `.lead()` vid signup | ✅ | Rad 415 |
| Apple-knapp: `onclick="handleAppleRegister()"` | ✅ | Rad 81 |
| 409 hanteras som `APPLE_EMAIL_EXISTS` | ✅ | Rad 456 |
| Felmeddelande tydligt för 409 | ✅ | Rad 457-458 |
| Error guard: `catch(err) { showError }` | ✅ | Rad 462-463 |
| `Platform.appleSignIn.signIn()` korrekt | ✅ | Rad 436 |
| `idToken` guard vid cancel | ✅ | Rad 437 |
| Script-ordning: platform.js → auth.js → i18n.js → inline | ✅ | Rad 19, 45-46, 253-468 |
| Service worker registration | ✅ | Rad 473 |
| Stängnings-html-taggar | ✅ | </body>, </html> |

### Cross-platform-observationer

| Check | login.html | register.html |
|-------|-----------|--------------|
| Apple-knapp döljs på icke-iOS | ✅ `Platform.isIOS() || Platform.isNative()` | ✅ Samma villkor |
| `platform.js` laddas före Apple-handlers | ✅ Rad 19 → rad 242 | ✅ Rad 19 → rad 253 |
| `auth.js` laddas före `Auth.*` i inline script | ✅ Rad 45 → rad 242 | ✅ Rad 45 → rad 253 |
| Inga saknade script-referenser | ✅ | ✅ |

---

## Bilaga: Miljövariabler

| Variabel | Beskrivning | Finns |
|----------|-------------|-------|
| `APPLE_CLIENT_ID` | Service identifier (`se.mystarday.app`) | Backend läser via `process.env.APPLE_CLIENT_ID` |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Endast på native (Capacitor) |
| Inget hemligt nyckelvärde på servern | Apple kräver inte det för Sign in with Apple Web | ✅ |

---

## Bilaga: Ändringshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-26 | Första implementation: `migrations/1769900000000_apple_sign_in.js` (draft schema) |
| 2026-05-26 | Production schema: `migrations/1787770000000_apple_sign_in.js` med UNIQUE + index |
| 2026-05-28 | Dokumentation + slutvalidering |