# Polsia — Barnlogin redesign ("Stjärnutforskare")

**Skapad:** 2026-05-29  
**Sida:** `/child-login` → `public/child-login.html`  
**API:** `POST /api/auth/child-login` (oförändrat — `{ username, pin }`)

Designreferens: **bifogad mockup** (mobil barnvy — lila/rosa solnedgång, avatar, namn + PIN, rund siffertavla). Bifoga samma bild i Polsia-uppgiften.

---

## 1. Mål

Ge barn en **lekfull, mobil-först** inloggning som matchar mockupen:

- Stjärnig natthimmel (lila → orange/rosa)
- Stor rund **avatar** ovanför hälsningen
- **"Hej kompis!"** + undertitel
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
| Avatar | ❌ Bara stor emoji 🌟 |
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

### 3.2 Avatar & hälsning

- Stor cirkel (~120–140px) med **vit glödande ring**
- Innehåll (prioritet):
  1. Barnets **emoji** om känt (framtida `avatar_url` — fallback till emoji)
  2. Annars neutral barn-illustration eller stor emoji (t.ex. 👋🌟)
- När användaren skrivit/sparat namn: visa **initial** eller sparat emoji från `localStorage` (`stjarndag_child_login_name`)
- Rubrik: **"Hej kompis!"** (vit, stor, rund font — Outfit)
- Undertext: **"Logga in för att fortsätta"** (vit/mjuk, 90% opacity)

### 3.3 Inloggningskort (vit, rundade hörn ~20px)

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

### 3.4 Siffertavla (custom keypad)

- Tar **nedre ~45%** av skärmen på mobil
- Knappar: **runda**, vita, skugga, min **72×72px** touch target
- Siffror **1–9** i 3×3, **0** centrerad nederst
- Siffror i **mjuk lila** (#7B61FF eller liknande)
- **Nederst vänster:** gul leende stjärna (samma som logo) — tap = rensa PIN eller "hjälp"-animation ( välj: **rensa PIN** )
- **Nederst höger:** lila rund knapp med **backspace** (⌫)
- Vid 4 siffror: **auto-submit** till `POST /api/auth/child-login` (samma som idag)
- På **desktop**: samma tavla (centrerad) ELLER behåll tangentbord — mockup är mobil-fokus; tavla ska alltid synas på `Platform.isNative()` och smala viewports (`max-width: 768px`)

### 3.5 Typografi & färger

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

**Rör INTE:**

- `src/routes/auth.js` — child-login endpoint
- PIN-lockout backend
- `ChildLoginSchema` validering

---

## 5. Beteende (behåll + förbättra)

### 5.1 Auth-flöde (oförändrat)

```
Användare fyller namn + 4 PIN
  → POST /api/auth/child-login { username, pin }
  → 200: Auth.setAuth + redirect child-dashboard
  → 401/423: fel PIN, lockout-panel, shake på prickar
```

### 5.2 localStorage

- Spara senaste **username** (`stjarndag_child_login_name`) — fyll i vid nästa besök (som mockup med "Astrid")
- Spara **inte** PIN

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
    <div class="child-avatar-ring"><!-- emoji/img --></div>
    <h1>Hej kompis!</h1>
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

1. **Mobil (iPhone):** namn → 4 siffror på tavla → barn-dashboard
2. **Fel PIN:** prickar skakar, försöksräknare, lockout efter gräns
3. **Lockout:** keypad disabled, countdown, auto-enable
4. **localStorage:** andra besöket — namn förifyllt
5. **Safe area:** keypad inte klippt av home indicator
6. **Desktop:** tavla användbar med mus
7. **Regressions:** `review@mystarday.se`-familjens barn **Anna** PIN **4455** (App Review)

---

## 10. Framtida (INTE i detta uppdrag)

- Foto-avatar från `child.avatar_url` (iOS kamera-uppdrag)
- Barnväljare om flera barn i familjen delar enhet
- Ljud/haptic vid knapptryck (`Platform.haptics.light()`)

---

## 11. Leveranschecklista Polsia

- [ ] `child-login-magic.css` skapad
- [ ] `child-login.js` skapad (inline script borttagen från HTML)
- [ ] `child-login.html` omstrukturerad enligt mockup
- [ ] Custom keypad fungerar utan system-PIN-tangentbord på mobil
- [ ] Befintlig lockout/felhantering intakt
- [ ] SW v137+ (eller nästa lediga)
- [ ] Ingen backend-ändring

---

*Referens: samma visuella språk som login "magisk natt" (`login-magic.css`) men barn-anpassat — varmare, större touch targets, lekfullare copy.*
