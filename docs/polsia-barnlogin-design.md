# Polsia — Barnlogin redesign ("Stjärnutforskare")

**Skapad:** 2026-05-29  
**Sida:** `/child-login` → `public/child-login.html`  
**API:** `POST /api/auth/child-login` (oförändrat — `{ username, pin }`)

Designreferens: **bifogad mockup** (mobil barnvy — lila/rosa solnedgång, avatar, namn + PIN, rund siffertavla). Bifoga samma bild i Polsia-uppgiften.

---

## 1. Mål

Ge barn en **lekfull, mobil-först** inloggning som matchar mockupen:

- Stjärnig natthimmel (lila → orange/rosa)
- Stor rund **avatar** (selfie/foto, emoji eller illustration)
- **Byt barn** — familjer med flera barn ska kunna välja vem som loggar in
- **"Hej kompis!"** + personlig hälsning (t.ex. "Hej Astrid!")
- Vit kort-yta: **Ditt namn** + **Din pinkod** (prickar, inte klartext)
- **Egen siffertavla** — stora runda knappar, lila siffror, stjärn-knapp + radera
- Ingen systemtangentbord för PIN på mobil (native + touch)

**Behåll all befintlig auth-logik:** lockout, försöksräknare, `POST /api/auth/child-login`, redirect till barn-dashboard, safe-area på iOS.

---

## 2. Nuläge (idag)

| Aspekt | Idag |
|--------|------|
| Layout | Ljus bakgrund, navy text, emoji "Hej, Stjärnutforskare!" |
| Namn | Vanlig `<input type="text">` |
| PIN | `<input type="tel">` — systemtangentbord |
| Siffertavla | ❌ Finns inte |
| Flera barn | ❌ Bara fritext namn — ingen väljare |
| Selfie/foto | ❌ Bara emoji |
| JS | Inline i `child-login.html` (~200 rader) |
| CSS | Tailwind + inline `<style>` |

---

## 3. Mål-design (enligt mockup)

### 3.1 Bakgrund & header

- Gradient: mörklila (#3D2B7A) → varm orange/rosa (#FF8C69 / #FFB347)
- Små stjärnor + mjuka moln (CSS eller lätt SVG)
- **Tillbaka** (vänster): rund mörk knapp, pil ← — länk till `/` eller `/login`
- **Logo** (top center): gul leende stjärna + text **"Stjärndag"** (vit, rund sans-serif)
- Tagline diskret om plats: *"TILLSAMMANS LYSER VI"* (valfritt)

### 3.2 Avatar (selfie / foto / emoji)

Stor cirkel (~120–140px) med **vit glödande ring** — uppdateras när barn byts.

**Fallback-kedja (prioritet):**

1. **`avatar_url`** — selfie/foto uppladdad av förälder (iOS kamera) eller barn i inställningar
2. Barnets **`emoji`** (t.ex. 🧒)
3. Neutral illustration / stjärna

Foto ska visas **object-fit: cover** i cirkeln (som mockup med Astrid).

**Selfie — var laddas den upp?**

- **Inte** vid själva login-skärmen (barnet är inte inloggat än)
- Förälder laddar upp under **Inställningar → Barn → [barn] → Profilbild** (iOS: kamera, webb: filväljare)
- Efter uppladdning syns fotot på barnlogin nästa gång barnet väljs

### 3.3 Byt barn (flera barn i familjen)

En familj kan ha **flera barn** som delar samma iPad/telefon. Barnlogin ska göra det enkelt att byta.

**UI — horisontell barnväljare** (ovanför eller under avatar):

```
[ Astrid 🖼️ ]  [ Erik 🦁 ]  [ + Annat ]
     ● aktiv      inaktiv
```

- Rund mini-avatar per barn (foto eller emoji)
- Namn under eller i tooltip
- Tap → byter **valt barn**, uppdaterar stor avatar, namnfält och nollställer PIN-prickar
- Aktivt barn markeras med lila ring / prick under

**Var kommer barnlistan ifrån? (tre källor, i prioritet)**

| Källa | När | Data |
|-------|-----|------|
| **1. Förälder inloggad** | `GET /api/auth/me` returnerar `children[]` | name, username, emoji, avatar_url |
| **2. localStorage** | Tidigare lyckade inloggningar på enheten | `stjarndag_known_children` — array max 8 |
| **3. Fritext** | "+ Annat" / redigera namnfält | Som idag — skriv namn manuellt |

**localStorage-format** (`stjarndag_known_children`):

```json
[
  { "username": "astrid", "name": "Astrid", "emoji": "👧", "avatar_url": "https://r2.../x.jpg", "lastLoginAt": 1730000000 }
]
```

Uppdatera listan efter **varje lyckad** child-login (merge på `username`, uppdatera avatar_url/emoji).

**Hälsning:** När barn valt → **"Hej Astrid!"** istället för generiskt "Hej kompis!" (fallback: "Hej kompis!" om inget barn valt).

### 3.4 Hälsning & undertitel

- Rubrik: **"Hej [namn]!"** eller **"Hej kompis!"**
- Undertext: **"Logga in för att fortsätta"** (vit/mjuk, 90% opacity)

### 3.5 Inloggningskort (vit, rundade hörn ~20px)

Två rader i samma kort:

**Rad 1 — Ditt namn**

- Label: *Ditt namn*
- Vänster: liten person-ikon (lila)
- Värde: barnets namn (t.ex. "Astrid") — redigerbart vid tap
- Höger: **lila bock** ✓ när namn ≥ 2 tecken
- Tap på rad → fokus/redigera namn (textfält eller modal — diskret)

**Rad 2 — Din pinkod**

- Label: *Din pinkod*
- **Fyra prickar** (grå tomma → lila fyllda när siffra anges)
- Höger: **öga-ikon** — toggla visning av PIN (endast föräldramode/debug OFF som default; barn ser normalt bara prickar)
- **Ingen** synlig siffror i standardläge

### 3.6 Siffertavla (custom keypad)

- Tar **nedre ~45%** av skärmen på mobil
- Knappar: **runda**, vita, skugga, min **72×72px** touch target
- Siffror **1–9** i 3×3, **0** centrerad nederst
- Siffror i **mjuk lila** (#7B61FF eller liknande)
- **Nederst vänster:** gul leende stjärna (samma som logo) — tap = rensa PIN eller "hjälp"-animation ( välj: **rensa PIN** )
- **Nederst höger:** lila rund knapp med **backspace** (⌫)
- Vid 4 siffror: **auto-submit** till `POST /api/auth/child-login` (samma som idag)
- På **desktop**: samma tavla (centrerad) ELLER behåll tangentbord — mockup är mobil-fokus; tavla ska alltid synas på `Platform.isNative()` och smala viewports (`max-width: 768px`)

### 3.7 Typografi & färger

| Token | Värde |
|-------|-------|
| Primär lila | #7B61FF |
| Bakgrund gradient | #2D1B69 → #FF7E5F |
| Kort | #FFFFFF, radius 20px |
| Text på mörk | #FFFFFF |
| PIN-prickar tom | #D1D5DB |
| PIN-prickar fylld | #7B61FF |

Font: **Outfit** (rubriker) + **Plus Jakarta Sans** (brödtext) — redan i projektet.

---

## 4. Teknik — filer (ny struktur)

**Skapa nya filer** (håll `child-login.html` smal):

| Fil | Roll |
|-----|------|
| `public/css/child-login-magic.css` | All ny visuell styling |
| `public/js/child-login.js` | Keypad, PIN-state, form submit, lockout UI |

**Ändra minimalt:**

| Fil | Ändring |
|-----|---------|
| `public/child-login.html` | Ny HTML-struktur, länka CSS/JS, **ta bort** inline script (flytta till .js) |
| `public/sw.js` | Bump `CACHE_NAME` |
| `src/middleware/platform-html.js` | Injicera nya assets om sidan går via middleware (samma mönster som login-magic) |

**Rör INTE (Phase 1 UI):**

- PIN-lockout backend
- `ChildLoginSchema` validering

**Minimal backend (Phase 2 — avatar, se §12):**

- Migration `child.avatar_url`
- Inkludera `avatar_url` i child-login **response** `user`-objekt
- Upload-endpoint för förälder

---

## 5. Beteende (behåll + förbättra)

### 5.1 Auth-flöde

```
Välj barn (väljare eller fritext) + 4 PIN på tavla
  → POST /api/auth/child-login { username, pin }
  → 200: spara barn i localStorage, Auth.setAuth, redirect child-dashboard
  → 401/429: fel PIN, lockout, shake på prickar
```

`username` skickas som barnets **username** om känt från väljaren, annars det användaren skrivit (som idag — matchar namn eller username server-side).

### 5.2 localStorage & barnväljare

- **`stjarndag_known_children`** — array med barn som loggat in på enheten (se §3.3)
- **`stjarndag_selected_child`** — senast valda `username` (förifyll vid reload)
- Spara **inte** PIN
- Vid init: ladda known_children → rendera väljare; om parent-session → merge med `/api/auth/me` children (rikare data, alla syskon)

### 5.3 Keypad-logik (`child-login.js`)

```text
pinDigits = []  // max 4
onDigit(d): push, uppdatera prickar, if length===4 → submitLogin()
onBackspace(): pop, uppdatera prickar
onStarClear(): pinDigits=[], uppdatera prickar
submitLogin(): anropa befintlig fetch mot /api/auth/child-login
```

### 5.4 Lockout & försök

- Behåll `#lockoutPanel`, `#attemptCounter`, `#attemptDots`, countdown-ring
- Styla om så de passar mörk bakgrund (vit text, lila accenter)
- Under lockout: **inaktivera** siffertavla

### 5.5 Safe area (iOS native)

- `padding-bottom: env(safe-area-inset-bottom)` på keypad-container
- Minst 44px touch targets (Apple HIG)

### 5.6 Tillgänglighet

- `aria-label` på varje siffra
- `role="button"` på keypad
- Fokus synlig för tillbaka-knapp

---

## 6. HTML-struktur (skiss)

```html
<div class="child-login-scene">
  <header><!-- back, logo Stjärndag --></header>
  <main>
    <div class="child-picker" id="childPicker"><!-- horisontella barn-chips --></div>
    <div class="child-avatar-ring" id="childAvatarRing"><!-- foto / emoji --></div>
    <h1 id="childGreeting">Hej kompis!</h1>
    <p class="subtitle">Logga in för att fortsätta</p>
    <div class="child-login-card">
      <div class="field-name">...</div>
      <div class="field-pin"><!-- 4 dots + eye --></div>
    </div>
    <!-- error, lockout, loading — befintliga id behålls -->
  </main>
  <div class="child-keypad" id="childKeypad">
    <!-- 1-9, star, 0, backspace -->
  </div>
</div>
```

**Element-id att behålla** (för minimal regressionsrisk):  
`username`, `pin` (dold input eller data-attribut), `childLoginForm`, `errorAlert`, `lockoutPanel`, `loadingSpinner`, `successAlert`, `attemptCounter`.

---

## 7. Plattform

| Plattform | Keypad |
|-----------|--------|
| iOS native | Alltid custom keypad |
| Android native | Alltid custom keypad |
| Mobil webb | Custom keypad |
| Desktop webb | Custom keypad OK (mockup är mobil; centrera) |

Dölj **support-bubble** på barnlogin om den stör (valfritt — matcha login-magic).

---

## 8. SW & cache

- Bump `CACHE_NAME` i `public/sw.js`
- Lägg till i precache om applicable: `child-login-magic.css`, `child-login.js`

---

## 9. Testplan

1. **En familj, två barn:** barnväljare visar båda; byt → avatar + namn uppdateras; rätt PIN per barn
2. **Förälder inloggad → child-login:** alla barn från `/api/auth/me` syns i väljaren
3. **Selfie:** efter upload i inställningar → foto syns i ring på barnlogin
4. **Mobil (iPhone):** tavla → barn-dashboard
5. **Fel PIN:** shake, lockout
6. **localStorage:** tredje besöket — senaste barn förvalt
7. **App Review:** Anna PIN **4455**

---

## 10. Phase 2 — Selfie / avatar (backend)

**Kan levereras i samma Polsia-uppdrag eller direkt efter Phase 1 UI.**

### 10.1 Migration

```sql
ALTER TABLE child ADD COLUMN avatar_url TEXT;
```

### 10.2 Upload (förälder)

- `POST /api/children/:childId/avatar` — `requireParent`, multipart, R2 via Polsia proxy (samma mönster som övriga uploads)
- iOS native: `@capacitor/camera` i **child-settings** (föräldervy), inte på barnlogin
- Webb: `<input type="file" accept="image/*">`

### 10.3 Child-login response

I `POST /api/auth/child-login` success — utöka `user`:

```json
{ "id", "name", "emoji", "username", "type": "child", "avatar_url": "https://..." }
```

SELECT ska inkludera `avatar_url` från `child`.

### 10.4 GET /api/auth/me (parent)

Inkludera `avatar_url` per barn i `children[]` så barnväljaren får foto innan första login.

### 10.5 Barnets egen profil (valfritt senare)

Inloggat barn kan byta emoji — foto ändras av förälder tills vidare.

---

## 11. Framtida (INTE i detta uppdrag)

- Ljud/haptic vid knapptryck (`Platform.haptics.light()`)
- Barn tar egen selfie efter inloggning (ej på login-skärmen)

---

## 12. Leveranschecklista Polsia

**Phase 1 — UI**

- [ ] `child-login-magic.css` + `child-login.js`
- [ ] Mockup-layout + custom keypad
- [ ] **Barnväljare** (localStorage + parent `/me`)
- [ ] Personlig hälsning "Hej [namn]!"
- [ ] Avatar-ring med emoji-fallback
- [ ] SW bump

**Phase 2 — Selfie**

- [ ] Migration `child.avatar_url`
- [ ] Upload i child-settings (iOS kamera)
- [ ] `avatar_url` i child-login + `/me` children
- [ ] Foto i avatar-ring på barnlogin

---

*Referens: samma visuella språk som login "magisk natt" (`login-magic.css`) men barn-anpassat.*
