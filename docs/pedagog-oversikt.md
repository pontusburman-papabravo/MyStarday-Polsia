# Pedagogöversikt — krav & idéer

Dokumentation för **översiktsvyn för pedagoger** inom anteckningar och rapportering i Min Stjärndag.

**Status:** Produktionsredo kravspec — **Fas 0 kan starta** (inga blockerande gaps). Fas 1–4 komplett planerade.  
**Relaterad feature-flag:** `pedagoganteckningar` — `dev` tills **Fas 4** (closed beta via `family_features` → `live`)  
**Befintlig sida:** `/pedagog-note` → `public/pedagog-note.html`  
**Senast uppdaterad:** 2026-05-27 (Identity & Access-kapitel, connected_since, educator_profile)

---

## Syfte

Ge pedagoger (konton med roll `pedagog` via `parent_child`) ett **snabbt, mobilvänligt formulär** för dagliga observationer per barn — och en **översikt** där samma pedagog ser **flera barn från olika familjer**.

Föräldrar ska kunna **bjuda in pedagogen** per barn (eller valda barn). Pedagogen ska **inte** bli full medlem i familjen — bara få skriva pedagoganteckningar för de barn hen är inbjuden till.

Formuläret ska gå att fylla i på några sekunder med stora klickytor (segmenterade knappar), sparas automatiskt, och synas i **professionella rapporter** när föräldern delar en länk med `pedagog_notes` aktiverat.

---

## Identity & Access — trust boundary (låst)

Det viktigaste i den här featuren är **inte UX** utan **trust boundary**: endast en förälder med faktisk barnrelation ska kunna initiera pedagog-access.

### Identity & Access Principle

**Pedagog-access är alltid parent-initiated och child-scoped.**

Systemet stödjer **inte**:

- publik pedagogregistrering med accessanspråk
- sökning efter barn/familjer
- inkommande accessförfrågningar från pedagoger
- organisationsbaserad auto-access (domän, skoladmin, klassrum)

All pedagog-access **måste** initieras av en **primary parent** genom explicit inbjudan (`pedagog_invite` → accept / accept-new).

### Varför invitation-only (inte “pedagogportal”)

| Invitation-based (nu) | Publik registrering (avvisad) |
|----------------------|-------------------------------|
| child-scoped | discovery + claims |
| explicit grant per barn | pending requests + verifiering |
| auditbar (`revoked_at`, `revoked_by`) | identitetsgranskning + support |
| revoke-bar | organisationskoppling |
| least privilege | implicit familjeaccess |
| multi-tenant-säker | nästan separat produktspår |

Modellen passar `parent_child.role = 'pedagog'`: **invitation-based trust**, **explicit child grants**, **ingen implicit familjemedlemskap**.

> **Framtida förslag att avvisa med denna princip:** pedagogportal, skoladmin, auto-join via domän, klassrum, organisationshierarkier — kräver ny trust-modell och eget produktspår.

### Produktpositionering (NPF-familjer)

| Modell | Psykologisk känsla |
|--------|-------------------|
| Pedagog registrerar sig själv | *"plattform för pedagoger"* |
| Förälder bjuder in | *"förälderns barnsamarbete"* |

För NPF-familjer är det senare sannolikt **tryggare** att relationen ägs av föräldern — pedagogen **initierar inte** bandet.

### Externa sidor — ingen “Skapa pedagogkonto”

**Fas 0–4:** ingen knapp som skapar pedagogkonto utan inbjudan.

| Yta | Tillåtet | Ej tillåtet |
|-----|----------|-------------|
| [`/pedagoger-och-terapeuter`](/pedagoger-och-terapeuter) | Info + **`professional_interest`** (lead/B2B) | Konto + barnaccess |
| Landning / marketing | *"Har du fått inbjudan?"* → login + accept-token | *"Registrera dig som pedagog"* |
| In-app | Förälder: **Bjud in pedagog** | Pedagog: sök barn/familj |

### Edge case som invitation-only löser

Fri registrering skulle ge: pedagog skapar konto → **noll barn** → tom app → onboarding-loop → fel analytics → fel Stripe.

Nuvarande modell (Fas 0+):

- `account_type` (`educator` / `dual` / `family`)
- `preferred_view_mode`
- redirect till `/pedagog-oversikt` (inte tom dashboard)
- access **endast** efter accept

### Två profilnivåer — blanda inte ihop

| Typ | Tabell / yta | Syfte | Synlighet |
|-----|--------------|--------|-----------|
| **`professional_interest`** | `/pedagoger-och-terapeuter` | Lead / B2B / väntelista till er | Admin internt |
| **`educator_profile`** *(post Fas 4)* | Profil i appen | Förtroende inom aktiv relation | **Relationellt** — se nedan |

**`educator_profile` (scope efter go-live, ej Fas 1–4):**

- Valfria fält: organisation/förskola, titel, telefon (valfritt), övrig kontakt
- Synlig **endast** för familjer med **aktiv** `parent_child (role = 'pedagog', revoked_at IS NULL)`
- **Inte** sökbar, indexerad eller publik profilsida
- E-post: detaljvy/inställningar — **inte** prominent i listan (integritet)

### Förälder ser kopplade pedagoger (Fas 1 UI)

Listan per barn visar **förtroendeinfo**, inte full kontaktkatalog:

```
Lisa Andersson
Pedagog · Kopplad sedan 12 maj 2026
```

| Fält | Källa | Fas |
|------|-------|-----|
| `name` | `parent.name` | 1 |
| `connected_since` | **`parent_child.connected_at`** — sätts vid accept / re-accept (inte kontoskapande) | 1 |
| `email` | `parent.email` — detaljvy, ej list-huvud | 1 |
| `organization`, `phone`, … | `educator_profile` | Post Fas 4 |

**API (`GET /api/family/invite-pedagog`):** returnera `connected_since` per pedagog+barn-koppling.

**Migration (Fas 1A1 / Task 2 — obligatorisk, inte UI-polish):**

```sql
ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;
-- Sätt vid accept INSERT och vid re-accept (UPDATE revoked_at = NULL)
```

> **Dataintegritet:** Fel eller saknat `connected_at` vid **första** accept = förlorad historik (inte bara fattig UX). Kolumn + skrivlogik i **Task 2**; list-visning *"Kopplad sedan"* i **Task 3** (låg UI-prioritet OK).

### QR-inbjudan (post Fas 4 — inte publik onboarding)

**Inte** för att skapa konto utan inbjudan — utan för **friktion i verklig miljö**:

1. Förälder på förskolan → **Bjud in pedagog**
2. **Visa QR** (samma token som e-postinbjudan)
3. Pedagog scannar → login / accept-new

Parent-initierad trust boundary oförändrad. Se *Idéer för senare faser*.

---
## Målgrupp

| Roll | Åtkomst | Behov |
|------|---------|-------|
| Pedagog (`parent_child.role = 'pedagog'`) | Endast barn hen är inbjuden till — **kan komma från flera familjer** | Översikt + snabb daglig loggning |
| Förälder (primär) | Bjuder in pedagog, hanterar åtkomst, delar rapporter | Enkel inbjudan utan att ge bort familjekontroll |
| Förälder (delad) | Ev. samma rättigheter som primär (TBD) | — |
| Terapeut / mottagare av rapport | Läser via `/r/:publicId` | Strukturerad, läsbar sammanställning per dag |

---

## Multi-familj & inbjudan (kärnkrav)

### Pedagog ser flera barn från olika familjer

| Krav | Detalj |
|------|--------|
| **Aggregerad barnlista** | En pedagog ska i samma vy se alla barn där `parent_child.role = 'pedagog'`, oavsett vilken familj barnet tillhör |
| **Familjekontext** | Varje barn ska visa vilken familj det tillhör — se **Familjemärkning & disambiguation** nedan |
| **Dagsstatus per barn** | I översikten: indikator om dagens anteckning är ifylld/ej ifylld per barn |
| **Isolerade anteckningar** | Anteckningar är per `(child_id, pedagog_id, date)` — samma barn kan teoretiskt ha flera pedagogs-konton, var och en med egna rader |
| **Ingen familjedashboard** | Pedagog ska **inte** se familjens schema, belöningar, inställningar eller andra barn hen inte är inbjuden till |

**Exempel:** Pedagog Lisa har tre barn kopplade:

- Alma (Familjen Johansson)
- Olle (Familjen Johansson)
- Maja (Familjen Ek)

Lisa loggar in → ser alla tre i översikten, grupperade eller märkta med familj → väljer barn → fyller i dagens formulär.

### Förälder bjuder in pedagog

| Krav | Detalj |
|------|--------|
| **Separat flöde** | "Bjud in pedagog" ska vara **inte samma sak** som "Bjud in medförälder" (nuvarande `/api/family/invite`) |
| **Välj barn** | Föräldern väljer ett eller flera barn pedagogen ska få access till |
| **E-postinbjudan** | Pedagogen får länk via e-post (samma Polsia-proxy som övriga mail) |
| **Ny eller befintlig pedagog** | Om kontot redan finns (t.ex. redan pedagog åt annat barn) ska inbjudan **lägga till** nya `parent_child`-kopplingar — inte flytta kontot till familjen |
| **Acceptera inbjudan** | Pedagog accepterar → `INSERT parent_child (role = 'pedagog')` för valda barn |
| **Återkalla** | Förälder kan ta bort pedagogens access (radera `parent_child`-rad eller dedikerad revoke-endpoint) |
| **Lista kopplade pedagoger** | Namn + **Kopplad sedan** (`connected_since`) per barn — e-post i detaljvy; se *Identity & Access* |

**Copy-förslag (inbjudan):** *"[Föräldern] bjuder in dig som pedagog för [Barn] i Min Stjärndag. Du kan fylla i dagliga observationer som föräldern kan inkludera i rapporter."*

### Begränsad åtkomst för pedagog-rollen

Pedagog ska **endast** nå:

- Pedagogöversikt / pedagoganteckningar (`/pedagog-note` eller `/pedagog-oversikt`)
- Eget konto (lösenord, utloggning)
- Acceptera inbjudan

Pedagog ska **inte** nå (för barn/familjer där roll = `pedagog`):

- Föräldradashboard med stjärnor/schema
- Redigera schema, belöningar, barninställningar
- Familjeinställningar hos den inbjudande familjen
- Bjud in andra till familjen

> **Teknisk notering:** Idag filtrerar varken `GET /api/family/dashboard-stats` eller barnlistor på `parent_child.role`. Om pedagog-koppling skapas utan övriga ändringar riskerar pedagogen att se full dashboard — **detta är den kritiska flaskhalsen** och måste åtgärdas i Fas A1/A5 innan frontend byggs ut.

---

## Arkitektur & säkerhet (kritiskt)

Cross-family-relationer kräver explicit endpoint-säkring. En query som bara kollar `WHERE parent_id = X` returnerar data pedagogen **inte** får se.

> **Designprincip (låst):** Pedagog är **inte** en familjeroll — det är **scoped child-access**. Se kapitlet *Identity & Access — trust boundary* för grundprincipen. Här: route guards + query guards + rollhierarki + dual-role + revoke + feature isolation per barns familj.

### Endpoint-säkring (skydd mot dataläckage)

Implementera central middleware/helper (t.ex. `verifyFamilyAccess`, `blockPedagogOnFamilyRoutes`) som returnerar **403 Forbidden** om användaren enbart har `pedagog`-access till ett barn men försöker nå familj-scopade endpoints.

**Pedagogens tillåtna API-yta (Fas A):**

| Tillåtet | Blockerat (exempel) |
|----------|---------------------|
| `/api/pedagog-notes/*` | `/api/family/dashboard-stats` |
| `/api/pedagog-invite/*` (accept) | `/api/rewards/manual-stars`, övriga `/api/rewards/*` |
| Konto/auth-endpoints | Schema, daily_log, barninställningar |
| | Familjeinställningar hos inbjudande familj |

**Implementationsprincip (middleware):**

1. Hjälpfunktion `getParentRoles(parentId)` → `{ hasPrimaryOrShared, hasPedagogOnly, pedagogChildIds[], isDualRole }`
2. Middleware `requireNotPedagogOnly` på alla familj-/barn-API:er som inte är pedagog-specifika
3. Alternativt: `requireFamilyMemberRole(['primary','shared'])` per route
4. Penetrationstest + integrationstest: pedagog-konto ska få 403 på minst dashboard-stats, children CRUD, rewards

**Två lager — båda obligatoriska (låst):**

| Lager | Syfte | Implementeras |
|-------|--------|---------------|
| **Middleware** | UX / direktblock (`403`) — pedagog-only når inte familj-routes | Fas 0 |
| **Query-lager** | Faktisk dataseparation — ingen dataläckage även om middleware glöms | Fas 0 |

Middleware-only räcker inte. Query-lager är den verkliga säkerhetsgränsen.

**Query-lager — Identity-Scoped Query Pattern (låst Fas 0):**

Middleware-only är skenbart skydd. Routes ska **inte** prata med breda `WHERE family_id = $1`-queries utan roll-validering.

| Regel | Detalj |
|-------|--------|
| **En central helper** | **`getChildrenForParent()`** är enda stället som JOIN:ar `parent_child` för barnlistor. **`pc.revoked_at IS NULL` får inte dupliceras i routes** — code review blockerar inline-filter |
| **Inga direkta family-queries** | Barn/familjedata hämtas via `parent_id` + `allowedRoles` |
| **Code review-regel** | Ingen SQL får hämta barn enbart på `family_id` utan session validerad mot `parent_child` med `['primary','shared']` |
| **Rollhierarki** | `primary` > `shared` > `pedagog` — degraderas aldrig vid conflict |

```javascript
// db/parent-access.js (ny) — ENDA tillåtna vägen till barn via parent_child
async function getChildrenForParent(parentId, options = { allowedRoles: ['primary', 'shared'] }) {
  // revoked_at IS NULL — centralt, aldrig kopiera till routes
  return db.query(`
    SELECT c.*, pc.role
    FROM child c
    JOIN parent_child pc ON pc.child_id = c.id
    WHERE pc.parent_id = $1
      AND pc.role = ANY($2)
      AND pc.revoked_at IS NULL
  `, [parentId, options.allowedRoles]);
}

async function getPedagogChildIds(parentId) {
  return getChildrenForParent(parentId, { allowedRoles: ['pedagog'] });
}
```

```javascript
async function getParentRoles(parentId) → { hasPrimaryOrShared, hasPedagogOnly, pedagogChildIds[], isDualRole, accountType }
```

**Ordning:** Se **Fas 0** nedan — inga nya sidor före säkerhetslagret.
### Pedagog som också är förälder ("dual role")

Klassiskt scenario: förskollärare använder appen för eget barn (Astrid) och har tre förskolebarn kopplade som `pedagog`.

**Beslut:** Separera vyerna helt via **"Byt vy"** i profilen om kontot har både `primary`/`shared` **och** `pedagog` på minst ett barn.

| Läge | Destination | Navigation |
|------|-------------|------------|
| **Föräldraläge** | `/dashboard` | Vanlig sidomeny, egen familj |
| **Pedagogläge** | `/pedagog-oversikt` | Endast pedagoganteckningar; familjmeny dold |

- **`localStorage`** = optimistisk UI-cache vid app-start (undviker flicker)
- **`parent.preferred_view_mode`** = source of truth (enhetsbyte, native wrapper)
- `POST /api/me/preferences` → `{ preferredViewMode: 'parent' | 'pedagog' }`
- **Boot:** hämta profil → `GET /api/auth/me` (utökas Fas 0) → om `preferred_view_mode` ≠ localStorage, uppdatera klient + mjuk redirect
- Default om null: pedagogläge om **endast** pedagog-kopplingar; annars föräldraläge
- Efter accept av pedagog-inbjudan: redirect till `/pedagog-oversikt` (inte `/dashboard`)

**`syncAccountType(parentId)` — deterministisk derivat (låst):**

`account_type` **beräknas alltid** från aktiva kopplingar (`revoked_at IS NULL`). **Aldrig** sätt manuellt från UI eller accept-flöde. `preferred_view_mode` får vara mutable (användarval).

| Har primary/shared | Har aktiv `pedagog` | `account_type` |
|--------------------|---------------------|----------------|
| ja | nej | `family` |
| nej | ja | `educator` |
| ja | ja | `dual` |

```javascript
// db/parent-access.js — enda skrivare av account_type
async function syncAccountType(parentId) {
  const { hasPrimaryOrShared, pedagogChildIds } = await getParentRoles(parentId);
  const hasPedagog = pedagogChildIds.length > 0;
  let accountType = 'family';
  if (hasPrimaryOrShared && hasPedagog) accountType = 'dual';
  else if (!hasPrimaryOrShared && hasPedagog) accountType = 'educator';
  else if (hasPrimaryOrShared) accountType = 'family';
  await db.query(`UPDATE parent SET account_type = $2 WHERE id = $1`, [parentId, accountType]);
  // preferred_view_mode-validering separat (fallback om pedagog-vy utan barn)
}
```

Anropas efter: accept inbjudan, accept-new, revoke, registrering av eget barn, revoke av sista pedagog-koppling.

**Obligatoriska anrop — code review (låst):**

| Händelse | Måste anropa `syncAccountType(parentId)` |
|----------|------------------------------------------|
| `POST /api/pedagog-invite/accept` | Ja — efter `parent_child` skapats |
| `POST /api/pedagog-invite/accept-new` | Ja — efter konto + koppling (steg 3 i flödet) |
| `POST /api/family/pedagog-access/revoke` | Ja — för pedagog **och** ev. berörd parent |
| Förälder skapar/registrerar eget barn (ny primary) | Ja — kan bli `dual` |
| Sista pedagog-koppling återkallad | Ja — kan bli `family` |

**Enforcement:**

- **Code review:** Blockera `account_type =` / `SET account_type` i routes — endast `db/parent-access.js` → `syncAccountType()`
- **Integrationstester (Task 2 / Fas 1A1 — release-krav, inte separat feature):** verify att accept/accept-new/revoke **anropar** sync och att `account_type` derivat blir rätt — se Task 2 nedan

**Vy-fallback** (`preferred_view_mode`) — livscykel (låst):

| Utgångsläge | Händelse | `account_type` | `preferred_view_mode` | Redirect vid boot |
|-------------|----------|----------------|------------------------|-------------------|
| `educator` | Får eget barn (skapar/registrerar familj) | → `dual` | oförändrat | — (behåll vy; "Byt vy" tillgängligt) |
| `dual` | Tappar **sista** aktiva pedagog-koppling | → `family` | → `parent` **tvingad** | → `/dashboard` |
| `family` / `dual` | `preferred_view_mode = pedagog` men **0** aktiva pedagog-barn | — | → `parent` (server **och** klient) | → `/dashboard` |
| `educator` | 0 aktiva pedagog-barn (alla återkallade) | `educator` | `pedagog` | → `/pedagog-oversikt` (tomt tillstånd — **inte** dashboard) |
| pedagog-only | Försöker nå `/dashboard` | — | — | → `/pedagog-oversikt` |

`POST /api/me/preferences` med `pedagog` → **400** om inga aktiva pedagog-kopplingar. Server skriver `preferred_view_mode = 'parent'` vid `syncAccountType` när pedagog-listan blir tom **och** kontot har primary/shared (`family`/`dual`).

**Frontend-router (klient-JS):**

- Vid sidladdning: hämta `GET /api/auth/me` → `{ account_type, preferred_view_mode, hasPedagogChildren, isDualRole }`
- Om dual-role **och** `localStorage.viewMode === 'pedagog'`: redirect från `/`, `/dashboard` → `/pedagog-oversikt`
- Om pedagog-only (ingen primary/shared): hård redirect till `/pedagog-oversikt` oavsett URL (utom konto/auth)
- "Byt vy" skriver `localStorage` + navigerar direkt — ingen server-side session för vyval

**Sessioner / utloggning:**

- Rensa `viewMode` (och ev. pedagog-specifik cache) vid **logout** — annars kan nästa användare på samma enhet ärva fel vy
- Alternativ: prefixa nyckeln med `parentId` → `viewMode:${parentId}` så kollisioner undviks utan rensning (men logout-rensning rekommenderas ändå)

---

## Placering i produkten

```
Anteckningar & rapportering
├── Förälder: Rapporter (/reports) — skapar delningslänk
├── Förälder: Allmän observation (child_observation, general_observations)
├── Förälder: Inställningar → Bjud in pedagog (NY)
└── Pedagog: Pedagogöversikt (/pedagog-oversikt) — lista alla barn, alla familjer
         └── Pedagoganteckningar (/pedagog-note) — dagformulär per barn+datum
```

**Navigation idag:** Sidomeny i dashboard → "📝 Pedagoganteckningar" (feature-gated).  
**Mål:** Pedagoger med enbart `pedagog`-roll dirigeras till översikten, inte full föräldrapanel.

---
## Funktionella krav

### 0. Pedagogöversikt (startsida)

**Referensmockup:** `docs/mockups/pedagog-oversikt.png`

| Element | Krav |
|---------|------|
| **Header** | Titel + progress: *(2 av 4 klara)* — räknas client-side från `is_draft === false` |
| **Tabellista** | Kolumner: emoji · Barn (namn + familj) · Status. Zebra-rader, valbar rad (ljusblå highlight) |
| **Familjemärkning** | I samma kolumn: *"Alma · Familjen Johansson"* — familj som suffix, **inte** gruppheader. Se disambiguation nedan. |
| **Dagsstatus** | `✓ KLAR · 🙂 · 14:32` / `◐ UTKAST` / `○ SAKNAS` — se `is_draft` nedan |
| **Val + handling** | Under tabellen: **Vald:** [namn] · **Handling:** *Öppna formulär* |
| **Klickyta** | Hela `<tr>` klickbar **och** länken *Öppna formulär* — samma navigation |
| **Datum** | Datepicker längst ned (default idag) — laddar om via overview-API |
| **Filter** | Dropdown *Visa status:* Visa alla · Endast saknas · Endast klara — **client-side** |
| **Tomt tillstånd** | *"Inga barn kopplade. Be en förälder bjuda in dig som pedagog."* |
| **Väntande inbjudningar** | Banner om oaccepterade inbjudningar (fas 1.5) |

**Humör i statuskolumnen** — mappning `mood` → emoji:

| mood | Emoji |
|------|-------|
| 1 | 😫 |
| 2 | 😕 |
| 3 | 😐 |
| 4 | 🙂 |
| 5 | 😄 |

Visning:

- `✓ KLAR · 🙂 · 14:32` — `is_draft = false`; tid från `updated_at` (lokal tid, diskret)
- `◐ UTKAST` — rad finns, `is_draft = true` — **ingen tid** (API kan returnera `saved_at`, UI visar den aldrig)
- `○ SAKNAS` — ingen rad

**Varför tidsstämpel (endast KLAR):** Minskar "sparade jag verkligen Lucas?"-osäkerhet. Tid på utkast tolkas som "klar men gul" — **förbjudet i UI**.

**Tvåstegsmodell (medvetet UX-beslut):** Markera rad → se *Vald* → *Öppna formulär*. Bättre än direkt navigation vid scroll/enhandsgrepp/felklick — power-users kan fortfarande klicka hela raden.

**Interaktion:**

1. Pedagog väljer datum → `GET /api/pedagog-notes/overview?date=` → tabell uppdateras
2. Klick på rad → markerar rad + sätter **Vald** (`cursor: pointer`, `user-select: none` på `<tr>`)
3. Klick på rad **eller** *Öppna formulär* → `/pedagog-note?childId=&date=`
4. Filter *Endast saknas* → client-side på redan laddad lista (ingen extra request)

**Mobil (<360 px):** Dölj emoji-kolumn; visa emoji före namn i Barn-kolumnen.

**ASCII — tabellayout (motsvarar mockup):**

```
Pedagogöversikt — Min Stjärndag          (2 av 4 klara)

| emoji | Barn                    | Status         |
|-------|-------------------------|----------------|
| 👧    | Alma Familjen Johansson | ✓ KLAR · 🙂 · 14:32 |  ← vald rad (ljusblå)
| 👦    | Olle Familjen Johansson | ◐ UTKAST            |
| 👧    | Maja Familjen Ek        | ✓ KLAR · 😐 · 13:05 |
| 👦    | Lucas Familjen Ek       | ○ SAKNAS            |

Vald: Alma          Handling: Öppna formulär

Datum [ 2026-05-27 📅 ]     Visa status [ Visa alla ▼ ]
```

**Visuella regler:**

| Status | Tabell | Badge |
|--------|--------|-------|
| Ifylld (klar) | Vit/grå rad | `✓ KLAR · [emoji] · HH:MM` — grön text (`is_draft = false`) |
| Utkast | Vit/grå rad | `◐ UTKAST` — amber, **utan HH:MM** (`is_draft = true`) |
| Saknas | Vit/grå rad | `○ SAKNAS` — muted `#5A6378` |
| Vald rad | Bakgrund `#E8F0FE` (ljusblå) | — |

**Progress i header:** Räkna endast `is_draft === false` (inte utkast).

**Varför tabell före kort:** Skalar bättre vid 5–15 barn; familj syns i namnet utan extra headers; filter + datum på en rad passar mobil i portrait.

*(Tidigare kort-layout med familjeheaders finns som alternativ vid ≤4 barn — tabell är primär design.)*

**Familjemärkning & disambiguation (låst):**

| Nivå | Regel |
|------|-------|
| **Default** | `family.name` som suffix — t.ex. *"Alma · Familjen Johansson"* |
| **Kollision** | Om overview innehåller **≥2 barn med samma `family.name`**, beräkna `family_label` server-side med primärförälderns namn: *"Alma · Familjen Andersson (Lisa)"* |
| **API-fält** | `family_name` (rå) + `family_label` (visningssträng) — klient använder alltid `family_label` |
| **Framtida** | Om plats/stad finns på familj kan suffix utökas — ej scope Fas A |

### 1. Sidhuvud (dagformulär)

| Element | Krav |
|---------|------|
| Titel | 📝 Pedagoganteckningar |
| Underrubrik | Dagliga observationer |
| Sparindikator | ✓ Sparad — visas kort efter lyckad autosparning/manuell sparning |

### 2. Barn & datum

| Fält | Krav |
|------|------|
| **Barn** | **Dropdown** (native `<select>` eller custom) med familjemärkning (t.ex. "Alma · Familjen Johansson"). Chips endast om ≤4 barn — annars dropdown. |
| Tomt tillstånd | Text: *"Inga barn kopplade till denna pedagog-roll"* — länk/info om att förälder måste bjuda in |
| **Förifyllning** | Om pedagog kommer från översikten: barn och datum förifylls via URL (`?childId=&date=`) |
| **Datum** | Standard: dagens datum (`YYYY-MM-DD`). Datepicker med kalenderikon. |
| Unik rad | En anteckning per `(child_id, pedagog_id, date)` — upsert vid sparning |

**Beteende vid byte av barn/datum:** Ladda befintlig anteckning om den finns, annars tom formulär.

### 3. Dagsstatus & mående — humör

| Fält | Typ | Skala |
|------|-----|-------|
| Humör under dagen | 5 emoji-knappar (single select) | 1 = Mycket dåligt … 5 = Utmärkt |

Emojis: 😫 😕 😐 🙂 😄

### 4. Dagsvila

Ersätter nuvarande fria fält "Sömn-kvalitet" + "Sömn-timmar" med **förskoleanpassade snabbval**.

#### Tid sovit

| Alternativ | Värde (förslag) |
|------------|-----------------|
| Ingen vila | `none` / `0` |
| 30 min | `0.5` |
| 1 tim | `1` |
| 1,5 tim | `1.5` |
| 2 tim+ | `2.0` (NUMERIC i `sleep_hours`) |

Segmenterade knappar — exakt ett val. **Ingen sträng** `"2_plus"` i numerisk kolumn.

#### Komma till ro

| Alternativ | Färg | Värde (förslag) |
|------------|------|-----------------|
| Somnade snabbt | 🟢 | `easy` |
| Tog tid att varva ner | 🟡 | `slow` |
| Somnade ej / Svårt | 🔴 | `difficult` |

Segmenterade knappar — exakt ett val.

### 5. Måltider

Tre separata rader med samma treval per måltid:

| Måltid | Alternativ |
|--------|------------|
| Frukost | 🟢 Åt bra · 🟡 Åt lite · 🔴 Åt ej · *(valfritt)* ⚪ Serverades ej |
| Lunch | 🟢 Åt bra · 🟡 Åt lite · 🔴 Åt ej |
| Mellanmål | 🟢 Åt bra · 🟡 Åt lite · 🔴 Åt ej |

Ersätter nuvarande fritextfält för måltider. **Frukost visas alltid** i Fas B (enkel implementation); "Serverades ej" / "Åt ej" täcker barn som kommer senare.

**Inga förvalda måltidsknappar** när formuläret öppnas — pedagogen måste aktivt välja, så att "Åt bra" inte råkar sparas för måltider barnet inte var med på.

**Lagring:** Ny kolumn `meals_structured` (JSONB). Befintlig `meals` (TEXT) behålls som fallback för äldre data och API-mapper.

```json
{
  "frukost": "good",
  "lunch": "little",
  "mellanmal": "not_served"
}
```

Värden: `good` | `little` | `none` | `not_served`.

### 6. Anmärkningar (fritext)

| Fält | Etikett | Placeholder |
|------|---------|-------------|
| Grupp & lek | 🧠 Dagen i gruppen (Fokus & Lek) | Skriv här… |
| Övrigt | 📋 Övriga noteringar (Hämtning, material etc.) | Skriv här… |

Motsvarar ungefär nuvarande `behavior` respektive `notes` i databasen (se avsnitt Datamodell).

### 7. Sparning

| Krav | Detalj |
|------|--------|
| Autospar | Debounce **~15 s** vid ändring — sparar med `is_draft = true` (så länge raden inte redan är klar) |
| **Markera som klar** | Tydlig knapp sätter `is_draft = false` — checklistan visar `✓ KLAR` |
| **`is_draft` idempotent** | Server: autosave får **aldrig** sätta `is_draft = true` om befintlig rad har `is_draft = false` (se API-regel nedan) |
| **Flush vid app-växling** | `visibilitychange`, `pagehide`, `freeze` (Chrome Android): om dirty → spara omedelbart (draft) |
| Manuell sparning | Valfri tydlig "Spara"-knapp (finns idag) |
| API | `POST /api/pedagog-notes` med `childId`, `date`, övriga fält, valfritt `isDraft` |
| Auth | `requireParent` + feature på **barnets familj** (se beslut) + `verifyPedagogAccess` |
| Fel | Tydligt felmeddelande vid nätverks-/serverfel |

---
## UI/UX-krav

### Layout (mobil-first)

- Maxbredd ~480 px, centrerat innehåll
- Ljusgrå bakgrund (`#F5F4F0`), vita kort (cards) per sektion
- Sektioner: Barn & datum · Humör · Dagsvila · Måltider · Anmärkningar
- Stora touchytor (min ~44 px höjd på knappar)
- Vertikal scroll — inget horisontellt krav

### Segmenterade knappar

När pedagog klickar t.ex. **🟢 Åt bra**:

- Hela knappen får **dämpad pastellton** (mjuk mintgrön), inte skrikig signalgrön
- 🟡 → mjuk amber/gul · 🔴 → mjuk ljusröd/rosa
- Endast ett val aktivt per frågegrupp
- **Måltider:** inget val markerat vid nytt/tomt formulär

Humör-knappar: generösa boxar min **44×44 px** med tydlig `gap` (16 px+) — tummen ska inte träffa fel emoji.

### ASCII-layoutskiss

```
+-----------------------------------------------------+
| 📝 Pedagoganteckningar               [✓ Sparad]     |
| Dagliga observationer                               |
+-----------------------------------------------------+
|                                                     |
|  BARN                                               |
|  [ Välj barn...                                 v ] |
|                                                     |
|  DATUM                                              |
|  [ 2026-05-27                                   📅 ] |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|  😊 HUMÖR UNDER DAGEN                               |
|  +-----+  +-----+  +-----+  +-----+  +-----+        |
|  |  😫  |  |  😕  |  |  😐  |  |  🙂  |  |  😄  |        |
|  +-----+  +-----+  +-----+  +-----+  +-----+        |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|  ⏰ DAGSVILA                                        |
|  Sovit tid:                                         |
|  +--------+ +--------+ +-------+ +--------+         |
|  | Ingen  | | 30 min | | 1 tim | | 1,5t + |         |
|  +--------+ +--------+ +-------+ +--------+         |
|                                                     |
|  Komma till ro:                                     |
|  +------------+  +------------+  +------------+     |
|  | 🟢 Snabbt  |  | 🟡 Varva ner|  | 🔴 Svårt   |     |
|  +------------+  +------------+  +------------+     |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|  🍽️ MÅLTIDER                                        |
|  Frukost:                                           |
|  +------------+  +------------+  +------------+     |
|  | 🟢 Åt bra  |  | 🟡 Åt lite  |  | 🔴 Åt ej   |     |
|  +------------+  +------------+  +------------+     |
|  Lunch:                                             |
|  +------------+  +------------+  +------------+     |
|  | 🟢 Åt bra  |  | 🟡 Åt lite  |  | 🔴 Åt ej   |     |
|  +------------+  +------------+  +------------+     |
|  Mellanmål:                                         |
|  +------------+  +------------+  +------------+     |
|  | 🟢 Åt bra  |  | 🟡 Åt lite  |  | 🔴 Åt ej   |     |
|  +------------+  +------------+  +------------+     |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|  🧠 DAGEN I GRUPPEN (Fokus & Lek)                   |
|  +-----------------------------------------------+  |
|  | Gick jättebra i skogen idag. Hittade en groda |  |
|  | och samarbetade fint med...                   |  |
|  +-----------------------------------------------+  |
|                                                     |
|  📋 ÖVRIGA ANMÄRKNINGAR                             |
|  +-----------------------------------------------+  |
|  | Glöm inte att skicka med nya stövlar till imor|  |
|  +-----------------------------------------------+  |
|                                                     |
+-----------------------------------------------------+
```

### Design-tips (från produktunderlag)

1. **Färgkodade knappar** — grön/gul/röd ger omedelbar feedback vid måltider och dagsvila.
2. **Kort-layout** — gruppera Dagsvila, Måltider och Anmärkningar i egna vita boxar mot ljusgrå bakgrund.
3. **Snabb ifyllnad** — målet är att pedagogen klarar formuläret på några sekunder mellan aktiviteter.

### Tillgänglighet

- Tydliga etiketter ovanför varje knappgrupp (inte bara färg)
- `aria-pressed` / `role="radiogroup"` på segmenterade val
- Tillräcklig kontrast på valda knappar (WCAG AA)

---

## iOS & Android (PWA / Capacitor)

Designen är optimerad för app-miljö — inte bara mobilwebb.

### Varför tabell-checklistan fungerar i app

| Aspekt | Effekt |
|--------|--------|
| **Tabell vs kort** | 10–15 barn utan vertikal "infinite scroll" av stora kort |
| **Filter *Endast saknas*** | Interaktiv att-göra-lista — öppna, spara, listan krymper |
| **44×44 px touch** | Följer Apple HIG + Material — en hand, rörelse i barngrupp |
| **Pastell-toggles** | Omedelbar bekräftelse i periferiseendet |
| **Tvåstegsmodell** | Rad → *Vald* → *Öppna formulär* minskar felnavigering vid scroll; hela raden klickbar för power-users |

### Native-krav (inför utveckling)

**1. Datum — native datepicker**

- Använd `<input type="date">` — **ingen** tung JS-kalender
- iOS/Android visar OS:ets egna hjul/kalender → native känsla, minimal kod

**2. Virtuellt tangentbord (fritextfält)**

- `min-height: 100dvh` / flex-layout så innehåll scrollar ovanför tangentbordet
- Spara-indikator / spara-knapp ska inte hamna under tangentbordet
- Tillräcklig `padding-bottom` på textarea-sektioner så pedagogen ser vad de skriver

**3. Autospar vid app-växling**

iOS PWA / Capacitor: `visibilitychange` och `beforeunload` är **opålitliga** vid app-svepning. Aggressiv debounce (**~15 s**) **plus** flush på flera events:

```javascript
function flushIfDirty() {
  if (!formDirty) return;
  // Försök akut sync — sendBeacon om sidan unloadas (iOS PWA-svep)
  const payload = JSON.stringify(buildNotePayload());
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/pedagog-notes', new Blob([payload], { type: 'application/json' }));
  } else {
    saveNote(false); // fetch med keepalive / synkront sista försök
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushIfDirty();
});
window.addEventListener('pagehide', flushIfDirty);   // iOS Safari / PWA-svep
document.addEventListener('freeze', flushIfDirty);   // Chrome Android — Page Lifecycle API
```

> **Backend:** `POST /api/pedagog-notes` ska acceptera samma payload via sendBeacon (CSRF/cookie-auth — verifiera att beacon-anrop autentiseras i Capacitor/PWA).

> **Produktkritisk:** Utan `visibilitychange` + `pagehide` + `freeze` + sendBeacon tappar pedagoger anteckningar **dagligen** i installerad iOS PWA / Safari — särskilt vid app-svepning. Detta är inte polish; det är dataförlust-prevention.

Gäller PWA på hemskärmen och Capacitor WebView (iOS/Android).

**4. Service Worker**

- Bump `public/sw.js` `CACHE_NAME` vid varje frontend-deploy av pedagog-vyer
- Pedagoger på hemskärmen annars fastnar på gammal cache

**5. Dual role + localStorage**

- `viewMode` persisterar mellan app-öppningar — viktigt i standalone PWA-läge
- Rensa vid logout (se Arkitektur & säkerhet)

---

## Idéer för senare faser

| Idé | Beskrivning | Prioritet |
|-----|-------------|-----------|
| **Veckokalender** | Snabb navigering till tidigare dagar; färgmarkering per humör | Medel |
| **Senaste anteckningar** | Lista 5–7 senaste dagar för valt barn | Medel |
| **Påminnelse push** | Valfri påminnelse kl. 15:00 om dagens anteckning saknas | Låg |
| **Snabbval "Samma som igår"** | Kopiera gårdagens strukturerade val (ej fritext) | Låg |
| **Offline-stöd** | Spara lokalt och synka (PWA / native) | Låg |
| **QR-inbjudan** | Förälder visar QR (samma token som e-post) — pedagog scannar → accept; **inte** fri registrering | Post Fas 4 |
| **educator_profile** | Organisation, titel, telefon — relationellt synlig för inbjudande familjer | Post Fas 4 |
| **Institutionskonto** | Ett pedagogkonto delat av flera personal (TBD — säkerhetsrisk) | Öppen fråga |

---
## Teknisk kontext (befintlig kod)

| Lager | Fil | Ansvar |
|-------|-----|--------|
| HTML | `public/pedagog-note.html` | Formulär, autospar, barnväljare |
| HTML | *(saknas)* `public/pedagog-oversikt.html` | Multi-familj-översikt |
| API | `src/routes/pedagog-notes.js` | CRUD, feature-gate, validering |
| API | `src/routes/family.js` | Medförälder-inbjudan (`role = 'shared'`) — **inte pedagog** |
| DB | `db/pedagog-notes.js` | `getPedagogChildren()` — redan cross-familj-kapabel |
| DB | `parent_child` | `role`: `primary` \| `shared` \| `pedagog` |

> **Framtida skuld (ej blockerande Fas A):** `parent_child.role` bär tre semantiker (familjemedlem, medförälder, extern pedagog-access). **Migrera till `child_access` när första externa rollen utöver `pedagog` introduceras** (logoped, assistent, resurspedagog, habilitering) — inte senare. Se `CLAUDE.md` → Architecture notes.

| DB | `family_invite` | Inbjudningar utan roll-fält — endast medförälder-flöde idag |
| Route | `src/routes/feature-gated-pages.js` | `GET /pedagog-note` |
| Rapporter | `db/professional-share-link.js` | Block `pedagog_notes` i delad rapport |
| PDF/HTML-rapport | `public/professional-report.html` | `renderPedagogNotes()` |
| Feature | `scripts/seed-features.js` | `pedagoganteckningar` |
| Förälder-UI | `public/onboarding.html` | Befintlig medförälder-inbjudan — pedagog-inbjudan saknas |

### Gap: dagens inbjudningsflöde passar inte pedagog

| Befintligt beteende | Varför det blockerar pedagog |
|--------------------|------------------------------|
| `POST /api/family/invite` avvisar e-post som tillhör **annan familj** | Pedagog med eget konto kan inte bjudas in till barn i Familj B |
| `accept-invite` / `accept-new` sätter `parent.family_id` till inbjudande familjen | Pedagog förlorar sitt eget konto/upplägg; blir i praktiken medförälder |
| Inbjudan skapar alltid `parent_child.role = 'shared'` | Pedagog-rollen sätts aldrig via inbjudan |
| Ingen förälder-UI för pedagog-inbjudan | Endast medförälder i onboarding/dashboard |
| Dashboard/API filtrerar inte bort `pedagog`-only-användare | Risk för för bred åtkomst |

### Föreslagen datamodell (inbjudan) — **Beslut: separat tabell `pedagog_invite`**

`family_invite` är hårt knuten till logik som flyttar in någon i en familj (`family_id`). En **separat tabell** undviker regressioner i medföräldra-flödet och hanterar `child_ids[]` tydligare.

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID | PK |
| `family_id` | UUID | Inbjudande familj |
| `inviter_parent_id` | UUID | Vem som bjöd in |
| `email` | TEXT | Pedagogens e-post |
| `invitee_name` | TEXT | Valfritt namn |
| `child_ids` | UUID[] | Barn pedagogen får access till |
| `token` | TEXT | Inbjudningslänk (64 hex) |
| `expires_at` | TIMESTAMPTZ | 7 dagar |
| `accepted` | BOOLEAN | Accepterad |
| `accepted_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | Default NOW() |

**Index (Fas 1 migration — obligatoriskt):**

```sql
CREATE UNIQUE INDEX pedagog_invite_token_unique
  ON pedagog_invite (token);

CREATE INDEX pedagog_invite_email_idx
  ON pedagog_invite (LOWER(email));
```

**Acceptera pedagog-inbjudan (befintligt konto):**

1. Verifiera token + e-post matchar inloggad användare (eller logga in först)
2. Skapa `parent_child`-kopplingar i **en atomär SQL** (inte Node-loop):

```sql
INSERT INTO parent_child (parent_id, child_id, role)
SELECT $1, unnest(pi.child_ids), 'pedagog'
FROM pedagog_invite pi
WHERE pi.id = $2
  AND pi.accepted = false
ON CONFLICT (parent_id, child_id) DO NOTHING;
```

**Beslut (låst):** `ON CONFLICT DO NOTHING` — **ingen** `DO UPDATE`. Accept skapar access **endast om ingen rad finns**. Primary/shared muteras aldrig här; pedagog uppgraderas aldrig här. Om rad finns (t.ex. revoked): separat **re-accept** = `UPDATE parent_child SET revoked_at = NULL, role = 'pedagog' WHERE … AND role IN ('pedagog')` — inte INSERT.

**Skydd:** Inbjudan får **aldrig** degradera `primary`/`shared` till `pedagog` (DO NOTHING garanterar det).

`unnest(child_ids)` expanderar UUID[] till rader direkt i Postgres.

3. **Ändra inte** `parent.family_id`
4. `UPDATE pedagog_invite SET accepted = true, accepted_at = NOW() WHERE id = $2`
5. `syncAccountType($1)` — deterministisk `account_type`
6. Redirect `/pedagog-oversikt`

**Acceptera pedagog-inbjudan (nytt konto):**

1. Skapa `parent` med **egen** `family_id` (minimal "pedagogfamilj") — **sätt inte `account_type` manuellt**
2. Skapa `parent_child` med `role = 'pedagog'` för inbjudna barn
3. `syncAccountType(parentId)` → `educator`
4. Feature-gate kollar **barnets familj** — inte pedagogens tomma familj

**`account_type` på `parent` (Fas 0 — låst):**

Tom "pedagogfamilj" kraschar analytics, Stripe, onboarding. Explicit konto-modell från start:

```sql
ALTER TABLE parent ADD COLUMN account_type TEXT NOT NULL DEFAULT 'family';
-- 'family' | 'educator' | 'dual'
ALTER TABLE parent ADD COLUMN preferred_view_mode TEXT NOT NULL DEFAULT 'parent';
-- 'parent' | 'pedagog'
```

| Värde | När |
|-------|-----|
| `family` | Vanlig förälder (default) |
| `educator` | Konto skapat enbart via pedagog-inbjudan |
| `dual` | Har både egen familj (primary/shared) och pedagog-kopplingar |

Exkludera `account_type = 'educator'` från marknadsföringsmail, Stripe-flöden, föräldra-onboarding tills de blir `dual`.

**Återkalla access (soft revoke — Fas 0 migration, före invite-UI):**

Kolumner på `parent_child` (krävs för partial index + `getChildrenForParent`):

| Kolumn | Beskrivning |
|--------|-------------|
| `revoked_at` | TIMESTAMPTZ — null = aktiv |
| `revoked_by` | UUID — parent_id som återkallade |

```
POST /api/family/pedagog-access/revoke  { parentId, childId }
```

Alla pedagog-queries går via **`getChildrenForParent()`** — aldrig inline `revoked_at`-filter i routes. Behåller revisionshistorik för support/incident.

**Partial unique — aktiva pedagogkopplingar (Fas 0):**

Skyddar mot race som skapar flera **aktiva** pedagograder för samma `(parent_id, child_id)`:

```sql
CREATE UNIQUE INDEX parent_child_unique_active_pedagog
  ON parent_child (parent_id, child_id, role)
  WHERE revoked_at IS NULL
    AND role = 'pedagog';
```

Soft revoke behåller rad med `revoked_at` satt → samma relation kan återbjudas via `UPDATE revoked_at = NULL` (inte parallell INSERT).

**Utöka `GET /api/pedagog-notes/children`:**

Returnera familjekontext:

```json
{
  "children": [
    {
      "id": "...",
      "name": "Alma",
      "emoji": "👧",
      "family_id": "...",
      "family_name": "Familjen Johansson"
    }
  ]
}
```

---
### Befintlig datamodell (`pedagog_notes`)

| Kolumn | Typ | Nuvarande UI | Nytt krav |
|--------|-----|--------------|-----------|
| `mood` | 1–5 | Emoji-knappar ✓ | Oförändrat |
| `sleep_quality` | 1–5 | Sömn-kvalitet (emoji) | → **Komma till ro** (3 nivåer) |
| `sleep_hours` | NUMERIC | Fritt tal | → **Tid sovit** (`0`, `0.5`, `1`, `1.5`, `2.0`) |
| `meals` | TEXT | Fritext | Behålls som fallback |
| `meals_structured` | JSONB | *(ny)* | Frukost/lunch/mellanmål — **objektform för framtida kommentarer** |
| `behavior` | TEXT | Beteende (fritext) | → **Dagen i gruppen** |
| `notes` | TEXT | Övriga anmärkningar ✓ | Oförändrat etikett |
| `is_draft` | BOOLEAN | *(ny, Fas 0)* | `DEFAULT true` — se overview + rapporter |
| Unik nyckel | `(child_id, pedagog_id, date)` | Logisk ✓ | **UNIQUE INDEX i migration** — se SQL nedan |

**Unik nyckel + lookup-index (Fas 0 migration — obligatoriskt, alla tre i samma fil):**

Förhindrar race mellan autosave och "Markera som klar"; garanterar snabb overview även vid många barn.

```sql
ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES parent(id);

-- Garanterar dataintegritet vid autosave/debounce race conditions
CREATE UNIQUE INDEX IF NOT EXISTS pedagog_notes_unique_daily
  ON pedagog_notes (child_id, pedagog_id, date);

-- Optimerar översiktsvyn för pedagoger med många barn
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_role_active
  ON parent_child (parent_id, role)
  WHERE revoked_at IS NULL;

-- Snabbar upp dagsstatus-lookup i LEFT JOIN för översikten
CREATE INDEX IF NOT EXISTS idx_pedagog_notes_lookup
  ON pedagog_notes (pedagog_id, child_id, date);

-- Förhindrar dubbla aktiva pedagog-kopplingar vid accept-race
CREATE UNIQUE INDEX IF NOT EXISTS parent_child_unique_active_pedagog
  ON parent_child (parent_id, child_id, role)
  WHERE revoked_at IS NULL
    AND role = 'pedagog';
```

**`is_draft` — utkast vs klar (Fas 0 migration + Fas B1 UI):**

```sql
ALTER TABLE pedagog_notes ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT true;
```

| Tillstånd | Overview | Trigger |
|-----------|----------|---------|
| *(ingen rad)* | `○ SAKNAS` | — |
| `is_draft = true` | `◐ UTKAST` | Autospar / pågående ifyllnad |
| `is_draft = false` | `✓ KLAR · emoji · tid` | Knappen **"Markera som klar"** (eller explicit Spara som klar) |

- Nya rader via autospar: `is_draft = true`
- **Serverregel (idempotent "Markera som klar"):** vid upsert — om befintlig rad har `is_draft = false`, behåll `false` oavsett inkommande `isDraft: true` från autosave. Endast explicit `isDraft: false` (knappen "Markera som klar") sätter klar-läge.
- **Rapporter** (`professional-share-link`, PDF): `WHERE is_draft = false` — externa parter ser aldrig utkast

> **Risk utan draft:** `(pn.id IS NOT NULL)` → en autosparad humör-klick räknas som KLAR. `is_draft` förhindrar "ghost complete".

**`meals_structured` — extensible JSON (Fas B enkel, API öppet):**

```json
{
  "frukost": { "status": "good", "comment": "" },
  "lunch": { "status": "little", "comment": "ville inte ha fisk" },
  "mellanmal": { "status": "none", "comment": "" }
}
```

Fas B UI kan börja med bara `status`; `comment` ignoreras tills det behövs. **Migration Fas B:** Lägg till `meals_structured JSONB`; mappa inte om befintlig `meals` TEXT automatiskt.

**Migration behövs** för `sleep_quality` semantik (1–3 = easy/slow/difficult). Alternativ: mappa i API-lagret utan schemaändring.

---

## Skillnader mot nuvarande implementation

| Område | Idag (`pedagog-note.html`) | Önskat enligt detta dokument |
|--------|---------------------------|------------------------------|
| Barnväljare | Chips med emoji | **Dropdown** med familjemärkning (5–15 barn) |
| Sömn | Kvalitet 1–5 + timmar (number input) | Dagsvila: tid (5 val) + komma till ro (3 val) |
| Måltider | Ett fritextfält | Frukost / lunch / mellanmål × 3 färgval vardera |
| Beteende | Eget fritextfält "Beteende" | "Dagen i gruppen (Fokus & Lek)" |
| Knappstil | Runda emoji-knappar (amber selected) | Segmenterade rektangulära knappar med grön/gul/röd |
| Rapport | Visar humör, sömn, måltider (text), notes — **inte behavior** | Uppdatera `renderPedagogNotes()` + PDF i `public.js` |

---

## Integration med rapporter

1. Förälder skapar rapport i `/reports` och kryssar i **Pedagoganteckningar** (`fields` innehåller `pedagog_notes`).
2. `db/professional-share-link.js` hämtar anteckningar för datumintervallet.
3. Mottagare ser blocket i `professional-report.html` och PDF.

**Krav vid ombyggnad:**

- Strukturerade måltider ska renderas läsbart (t.ex. "Frukost: Åt bra · Lunch: Åt lite · Mellanmål: Åt ej").
- Dagsvila: visa både tid och "komma till ro" med svenska etiketter.
- Inkludera **Dagen i gruppen** (`behavior`) i rapport — saknas idag.
- **Pedagog-attribution (låst, audit-data):** Varje dag/rad visar vem som skrev — t.ex. *"Pedagog: Lisa Andersson"*. `professional-share-link.js`: JOIN `parent p ON p.id = pn.pedagog_id` → `pedagog_name`. **Obligatoriskt** vid vikarie, flera pedagogkonton, och professionell granskning.
- **Endast klara anteckningar:** `WHERE is_draft = false` i `professional-share-link.js` och PDF
- Bakåtkompatibilitet: gamla fritext-`meals` ska fortfarande visas om JSON-parse misslyckas.

**Strategisk kärna (produkt — större än "dagislogg"):**

Det här är **strukturerad tvärmiljö-observation över tid** — betydligt mer defensibelt än en enkel loggbok:

| Dimension | Värde |
|-----------|-------|
| Hem ↔ förskola | Samma barn, två miljöer, jämförbara fält |
| Sömn ↔ reglering | Dagsvila på förskolan korrelerbar med kväll hemma |
| Mat ↔ beteende | Strukturerade måltider + humör/grupp över veckor |
| Audit | `pedagog_name` + datum = spårbar professionell observation |

Korrelation sömn på förskolan ↔ utbrott/stjärnfall hemma på kvällen är framtida premium-värde för NPF-familjer (ej scope Fas A).

### Borttaget / arkiverat barn (edge case — låst)

| Yta | Beteende |
|-----|----------|
| **Overview / barnlista** | `INNER JOIN child` + aktiv `parent_child` — borttagna barn syns **inte** (idag: hård `DELETE` i `/api/family/children/:id`) |
| **Revoke** | Soft revoke (`revoked_at`) — **behåll** `parent_child`-rad och all `pedagog_notes`-historik |
| **Rapporter (innehåll)** | Se **Rapportåtkomst vs pedagog-API** nedan — medvetet **inte** samma regel |
| **Framtid (arkiv)** | Om `child.archived_at` införs: overview filtrerar `archived_at IS NULL`; rapporter oförändrade |

### Rapportåtkomst vs pedagog-API (låst — säkerhetsmodell)

Revoke och rapporter är **två olika åtkomstvägar**. Blanda dem inte.

| Väg | Vem | Kräver aktiv `parent_child`? | Syfte |
|-----|-----|------------------------------|--------|
| **`/api/pedagog-notes/*`** | Inloggad pedagog | **Ja** (`revoked_at IS NULL` via `getChildrenForParent`) | Live läsa/skriva |
| **Förälder skapar rapport** (`/reports`) | Inloggad förälder | Nej för innehåll — föräldern äger barnets data | Historisk sammanställning |
| **`/r/:publicId` (delningslänk)** | Innehavare av länk + PIN | Nej | Parent-kontrollerad delning |

**Beslut (låst): Rapporter ska INTE filtrera på aktiv `parent_child`.**

`professional-share-link.js` hämtar `pedagog_notes` på `child_id` + datumintervall + `is_draft = false` — **utan** JOIN mot aktiv pedagog-koppling. Det är avsiktligt:

- Föräldern/BUP ska se observationer från perioden då Lisa var pedagog — även om Lisa återkallades i april.
- Revoke betyder **sluta framtida access** — inte radera eller gömma historik i rapporter föräldern delar.

**Är det ett säkerhetsgap för återkallade pedagoger?**

| Scenario | Resultat |
|----------|----------|
| Återkallad pedagog via **eget konto** (`/api/pedagog-notes`) | **Blockerad** — 403, inga nya/läsning av live data |
| Återkallad pedagog via **befintlig delningslänk** (`/r/…` + PIN) | Kan fortfarande **läsa** om föräldern gett hen länken — samma som vilken mottagare som helst. Revoke av pedagog-access **ogiltigförklarar inte** befintliga share links (parent-kontrollerat). |
| Återkallad pedagog utan delningslänk | **Ser inget** |

Om föräldern vill stänga extern åtkomst helt → **revoke share link** (`professional_share_link.revoked_at`), inte pedagog-revoke.

**SQL i rapport (oförändrat princip):**

```sql
SELECT pn.*, p.name AS pedagog_name
FROM pedagog_notes pn
JOIN parent p ON p.id = pn.pedagog_id
WHERE pn.child_id = $1
  AND pn.date BETWEEN $2 AND $3
  AND pn.is_draft = false;
-- INGEN: JOIN parent_child … AND revoked_at IS NULL
```

---
## API — pedagoganteckningar & översikt

### Befintliga endpoints

```
GET  /api/pedagog-notes/children
     → inkl. family_id, family_name per barn

GET  /api/pedagog-notes?childId=&date=
GET  /api/pedagog-notes?childId=&from=&to=
POST /api/pedagog-notes  { childId, date, mood, ..., isDraft?: boolean }
```

**`POST /api/pedagog-notes` — idempotent autosave / "Ghost Draft"-skydd (låst, Fas 0 server):**

Risk: pedagog klickar **Markera som klar** (`is_draft = false`), fortsätter skriva i fritext → debounce 15 s senare skickar payload med default `isDraft: true` → anteckning blir utkast igen.

```javascript
// db/pedagog-notes.js — upsert före skrivning
const existing = await getNote(childId, pedagogId, date);

if (existing && existing.is_draft === false) {
  // Redan KLAR — tvinga false oavsett fördröjd autosave
  incoming.is_draft = false;
} else {
  incoming.is_draft = body.isDraft !== false; // autosave default true
}
```

Frontend (Fas B): efter lyckad "Markera som klar", håll lokal `isDraft = false`; skicka **inte** `isDraft: true` på efterföljande autosaves.

**SQL UPSERT (obligatoriskt med UNIQUE-index — Fas 0):**

Utan `ON CONFLICT` får debounce + sendBeacon **500-race** under parallella sparningar.

```sql
INSERT INTO pedagog_notes (child_id, pedagog_id, date, mood, sleep_quality, sleep_hours, meals, behavior, notes, is_draft, updated_at)
VALUES ($1, $2, $3, ...)
ON CONFLICT (child_id, pedagog_id, date)
DO UPDATE SET
  mood = EXCLUDED.mood,
  sleep_quality = EXCLUDED.sleep_quality,
  sleep_hours = EXCLUDED.sleep_hours,
  meals = EXCLUDED.meals,
  behavior = EXCLUDED.behavior,
  notes = EXCLUDED.notes,
  is_draft = CASE
    WHEN pedagog_notes.is_draft = false THEN false
    ELSE EXCLUDED.is_draft
  END,
  updated_at = NOW()
RETURNING *;
```

Kräver `pedagog_notes_unique_daily`. Ghost Draft-skyddet sitter i `CASE` ovan **och** i applikationslagret.

### `GET /api/pedagog-notes/overview?date=YYYY-MM-DD` (ny, Fas A3)

**Response:**

```json
{
  "success": true,
  "date": "2026-05-27",
  "children": [
    {
      "id": "uuid-1",
      "name": "Alma",
      "emoji": "👧",
      "family_name": "Familjen Johansson",
      "family_label": "Alma · Familjen Johansson",
      "is_draft": false,
      "mood": 4,
      "saved_at": "2026-05-27T14:32:00+02:00"
    },
    {
      "id": "uuid-2",
      "name": "Olle",
      "emoji": "👦",
      "family_name": "Familjen Johansson",
      "is_draft": true,
      "mood": 3,
      "saved_at": "2026-05-27T11:05:00+02:00"
    },
    {
      "id": "uuid-3",
      "name": "Lucas",
      "emoji": "👦",
      "family_name": "Familjen Ek",
      "is_draft": null,
      "mood": null,
      "saved_at": null
    }
  ]
}
```

| Fält | Källa |
|------|-------|
| `family_label` | Server-beräknad visningssträng (disambiguation vid kollision) |
| `is_draft` | `true` \| `false` \| `null` (saknas) från `pedagog_notes.is_draft` |
| `mood` | Från samma rad |
| `saved_at` | `pedagog_notes.updated_at` — **visas i UI endast när `is_draft === false`** (HH:MM i statuskolumn) |
| Progress *(2 av 4 klara)* | **Client-side:** `children.filter(c => c.is_draft === false).length` |

**Beslut (A1b):** Barn vars familj **saknar** `pedagoganteckningar` filtreras bort i SQL — de ska **inte** synas i översikten. Checklistan ska vara 100 % operativ, utan "brus".

**SQL i `db/pedagog-notes.js` — `getOverview(pedagogId, date)`:**

```sql
SELECT
  c.id,
  c.name,
  c.emoji,
  f.name AS family_name,
  pn.is_draft,
  pn.mood,
  pn.updated_at AS saved_at
FROM parent_child pc
JOIN child c ON pc.child_id = c.id
JOIN family f ON c.family_id = f.id
-- Feature-gate: samma logik som hasAccess() — live globalt, dev kräver family_features
JOIN features feat ON feat.slug = 'pedagoganteckningar'
  AND feat.status <> 'off'
  AND (
    feat.status = 'live'
    OR EXISTS (
      SELECT 1 FROM family_features ff
      WHERE ff.family_id = f.id
        AND ff.feature_slug = 'pedagoganteckningar'
    )
  )
-- LEFT JOIN: anteckning för detta datum OCH denna pedagog (isolerat per pedagog)
LEFT JOIN pedagog_notes pn
  ON pn.child_id = c.id
 AND pn.date = $2::DATE
 AND pn.pedagog_id = $1
WHERE pc.parent_id = $1
  AND pc.role = 'pedagog'
  AND pc.revoked_at IS NULL
ORDER BY c.name ASC;
```

| Del | Varför |
|-----|--------|
| **INNER JOIN `features` + EXISTS** | Barn försvinner om familjen inte har access. När flaggan går `live` behövs ingen `family_features`-rad. |
| **`pn.pedagog_id = $1` i LEFT JOIN** | Vikarie + ordinarie ser var sin status — skriver inte över varandra. |
| **`pn.is_draft`** | Separerar utkast (`◐`) från klara (`✓`) — undviker ghost-complete vid autospar. |
| **`saved_at` / `updated_at`** | Tidsstämpel i overview utan extra query. |

> **Schema-notering:** `family_features` använder kolumnen `feature_slug` (inte `feature_name`). Det finns ingen `is_active` — radens existens = aktiverad (dev-läge).

> **`features.status`:** Tabellen använder strängvärden `'dev' | 'live' | 'off'` (se `CLAUDE.md`, `scripts/seed-features.js`). Villkoret `feat.status <> 'off'` är korrekt — ingen boolean.

**Filtrering:** *Visa status* körs **client-side** på `children[]` — ingen `?status=` query-param i Fas A.

### Frontend — statuskolumn (`public/pedagog-oversikt.html`)

```javascript
const MOOD_EMOJIS = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

function renderStatus(child) {
  if (child.is_draft === false) {
    const emoji = MOOD_EMOJIS[child.mood] || '';
    const time = child.saved_at ? formatTime(child.saved_at) : '';
    return `<span class="text-green-600 font-medium">✓ KLAR ${emoji}${time ? ' · ' + time : ''}</span>`;
  }
  if (child.is_draft === true) {
    // saved_at finns i API men visas ALDRIG — undvik "klar men gul"-tolkning
    return '<span class="text-amber-600">◐ UTKAST</span>';
  }
  return '<span class="text-slate-500">○ SAKNAS</span>';
}

const done = children.filter(c => c.is_draft === false).length;
// → `${done} av ${total} klara`
```

**Tabellrad:** `cursor: pointer; user-select: none;` på `<tr>` — klick navigerar till `/pedagog-note?childId=&date=`.

### Pedagog-inbjudan (nytt) — route-split (låst)

**Familj-scopade routes** (`src/routes/family.js` eller mount under `/api/family`):

```
POST   /api/family/invite-pedagog          { email, name?, childIds[] }  ← SKAPA (inte /pedagog-invite)
GET    /api/family/invite-pedagog          → lista väntande + accepterade pedagoger per barn
DELETE /api/family/invite-pedagog/:id      → radera väntande inbjudan
POST   /api/family/pedagog-access/revoke   { pedagogParentId, childId }  → soft revoke
```

**Accept / token** (`src/routes/pedagog-invite.js` — ny fil, mount `/api/pedagog-invite`):

```
GET    /api/pedagog-invite/:token          → publik validering
POST   /api/pedagog-invite/accept          { token }
POST   /api/pedagog-invite/accept-new      { token, password, name? }
```

```
POST /api/me/preferences  { preferredViewMode: 'parent' | 'pedagog' }
```

Alla inbjudnings-endpoints: `requireParent` + **`requirePrimaryParent`** (Fas A).

### Shared-förälder + pedagog-inbjudan (låst Fas A)

Specen säger "enbart primary" — det ska **enforce:as i kod**, inte bara som notering.

| Yta | Beteende |
|-----|----------|
| **`POST /api/family/invite-pedagog`** | **`403 Forbidden`** om anroparen saknar `primary` på minst ett barn i `childIds` |
| **`GET /api/family/invite-pedagog`** | Lista tillåten för primary **och** shared (read-only) |
| **`DELETE …/invite-pedagog/:id`** | **`403`** om inte primary |
| **`POST /api/family/pedagog-access/revoke`** | **`403`** om inte primary |
| **Förälder-UI (A2)** | Dölj "Bjud in pedagog" / revoke-knappar för `shared` — servern är source of truth |

```javascript
// src/middleware/authz.js (eller motsvarande) — Fas 1
async function requirePrimaryParent(req, res, next) {
  const isPrimary = await db.parentAccess.hasRole(req.parentId, 'primary');
  if (!isPrimary) {
    return res.status(403).json({ error: 'ONLY_PRIMARY', message: 'Endast primärförälder kan hantera pedagog-inbjudan.' });
  }
  next();
}
```

**Integrationstest (Fas 1):** Shared-förälder → `POST /api/family/invite-pedagog` → **403** (inte silent fail, inte 200).

Shared kan utökas till samma rättigheter som primary i **Fas B+** — kräver explicit produktbeslut + spec-uppdatering.

---
## Acceptanskriterier

### Fas 0 — Säkerhet & arkitektur (backend only, låst)

**Ingen ny UI före Fas 0 är klar och testad.**

**Migrationer:**

```sql
ALTER TABLE parent ADD COLUMN account_type TEXT NOT NULL DEFAULT 'family';
ALTER TABLE parent ADD COLUMN preferred_view_mode TEXT NOT NULL DEFAULT 'parent';
ALTER TABLE pedagog_notes ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES parent(id);

ALTER TABLE parent ADD CONSTRAINT parent_account_type_check
  CHECK (account_type IN ('family', 'educator', 'dual'));
ALTER TABLE parent ADD CONSTRAINT parent_preferred_view_mode_check
  CHECK (preferred_view_mode IN ('parent', 'pedagog'));

UPDATE pedagog_notes SET is_draft = false;

CREATE UNIQUE INDEX IF NOT EXISTS pedagog_notes_unique_daily
  ON pedagog_notes (child_id, pedagog_id, date);
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_role_active
  ON parent_child (parent_id, role)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pedagog_notes_lookup
  ON pedagog_notes (pedagog_id, child_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS parent_child_unique_active_pedagog
  ON parent_child (parent_id, child_id, role)
  WHERE revoked_at IS NULL AND role = 'pedagog';
```

**DB-helpers + serverregler (`db/parent-access.js`, `db/pedagog-notes.js`):**

- [ ] `getParentRoles(parentId)`
- [ ] `getChildrenForParent(parentId, { allowedRoles })` — **enda** ställe för `revoked_at IS NULL`
- [ ] `getPedagogChildIds(parentId)`
- [ ] `syncAccountType(parentId)` — **deterministisk derivat** (aldrig manuell UI-write)
- [ ] **`GET /api/auth/me`:** `account_type`, `preferred_view_mode`, `hasPedagogChildren` + vy-fallback
- [ ] **`POST /api/pedagog-notes`:** `INSERT … ON CONFLICT DO UPDATE` + idempotent `is_draft`
- [ ] Inga inline `pc.revoked_at` i routes (code review)

**Middleware + deny-by-default:**

- [ ] `requireNotPedagogOnly` på familj-scopade routes

**Integrationstester (obligatoriska):**

```javascript
// Pedagog-konto + session
await GET('/api/family/dashboard-stats').expect(403);
await POST('/api/rewards/manual-stars', { ... }).expect(403);
```

- [ ] Code review-regel dokumenterad i `docs/pedagog-oversikt.md` + ev. `.cursor/rules`

### Fas A — Inbjudan & multi-familj

- [ ] Migration: `pedagog_invite` + **`pedagog_invite_token_unique`** + **`pedagog_invite_email_idx`** *(revoked_at redan i Fas 0)*
- [ ] API: invite / accept / accept-new / revoke
- [ ] **Endpoint-säkring:** pedagog-only → 403 på familj-scopade routes
- [ ] Primärförälder kan bjuda in pedagog via e-post för valda barn
- [ ] **Shared-förälder:** `POST invite-pedagog` → **403** (`ONLY_PRIMARY`)
- [ ] Pedagog med befintligt konto accepterar utan att byta familj
- [ ] Ny pedagog kan skapa konto via inbjudningslänk
- [ ] Accepterad inbjudan skapar `parent_child.role = 'pedagog'` (inte `shared`)
- [ ] Redirect efter accept → `/pedagog-oversikt`
- [ ] Samma pedagog-konto kan ha barn från ≥2 familjer
- [ ] Pedagogöversikt: tabell, progress i header, humör i status
- [ ] Filter *Endast saknas* client-side
- [ ] Hela tabellrad klickbar + *Öppna formulär*
- [ ] Dual-role: "Byt vy" mellan föräldra- och pedagogläge
- [ ] Förälder kan återkalla pedagogens access
- [ ] Inbjudningsmail via Polsia-proxy
- [ ] Accept: `unnest` + **`ON CONFLICT DO NOTHING`** (re-accept = `UPDATE revoked_at = NULL`)
- [ ] **`syncAccountType`** — integrationstester i **Task 2** (accept-new → `educator`, accept dual → `dual`, revoke → omräkning)
- [ ] **`connected_at`** — kolumn + skrivlogik i **Task 2**; API returnerar `connected_since`
- [ ] **`connected_since` UI** — *Kopplad sedan* i förälarlista (**Task 3**, låg UI-prioritet OK)
- [ ] Soft revoke (revoked_at) — inte hård DELETE
- [ ] Overview: `is_draft`, humör + tid i status (**tid endast vid klar**)
- [ ] `family_label` vid kolliderande familjenamn
- [ ] Borttaget barn: overview exkluderar; rapporter behåller historiska `pedagog_notes`
- [ ] Rapport: **ingen** `revoked_at`-filter på innehåll; pedagog-API blockeras vid revoke
- [ ] Penetrationstest: ingen dataläckage via dashboard/manual-stars/rewards
- [ ] Closed beta: admin tilldelar `family_features` efter Fas 1 penetrationstest

### Fas B — Omdesign dagformulär

- [ ] Migration: `meals_structured JSONB` på `pedagog_notes`
- [ ] Pedagog med kopplat barn ser formuläret enligt layoutskiss
- [ ] Dropdown barnväljare med familjekontext
- [ ] Måltider utan förval — aktivt val krävs
- [ ] Pastellfärger på segmentknappar; humör 44×44 px+
- [ ] Alla segmenterade fält sparas och laddas korrekt vid byte av barn/datum
- [ ] Knapp **"Markera som klar"** (`is_draft = false`)
- [ ] Autosave efter klar: server ignorerar `isDraft: true` om rad redan klar
- [ ] ✓ Sparad-indikator efter lyckad sparning
- [ ] Feature-gate: `pedagoganteckningar` på **barnets/inbjudande familj**
- [ ] Data visas korrekt i delad rapport när `pedagog_notes` är valt — **inkl. pedagognamn per rad**
- [ ] Mobilvänligt (touchytor, scroll, inga horisontella overflow)
- [ ] `<input type="date">` — ingen JS-kalender
- [ ] Fritext: layout tål virtuellt tangentbord (`100dvh`, padding-bottom)
- [ ] `visibilitychange` + `pagehide` + `freeze` → omedelbar sparning om dirty
- [ ] Autospar debounce ~15 s + sendBeacon/pagehide/freeze-flush
- [ ] Bump av `public/sw.js` `CACHE_NAME` vid frontend-deploy

### Fas 4 — Release (go-live)

- [ ] Penetration re-run efter Fas 3
- [ ] Admin: `UPDATE features SET status = 'live' WHERE slug = 'pedagoganteckningar'`
- [ ] Bump SW cache
- [ ] Ev. kommunikation till beta-familjer

**Rollback om penetrationstest failar (låst):**

| Situation | Åtgärd | Dataskada? |
|-----------|--------|------------|
| **Penetration röd före go-live** (`status` fortfarande `dev`) | Fixa buggar → kör om test. Beta-familjer behåller `family_features`. **Gå inte till `live`.** | Nej |
| **Penetration röd i beta** (specifik familj) | Admin: ta bort `family_features`-rad för den familjen. Ev. soft-revoke pedagog-kopplingar via revoke-endpoint. | Nej — data kvar |
| **Kritisk bugg efter `live`** (värsta fall) | Admin: `UPDATE features SET status = 'dev'` — feature dold för icke-beta. Behåll `family_features` för beta. **Radera inte** `pedagog_notes` / `parent_child`. | Nej |
| **Dataintegritet okänd** | Stoppa nya inbjudningar (feature `dev` eller `off`). Support granskar manuellt. | — |

> **Princip:** Rollback = **stäng feature-flagga / beta-access** — aldrig DELETE på pedagog-data som redan skapats.

---

## Beslutade frågor (2026-05)

| # | Fråga | Beslut |
|---|-------|--------|
| 1 | Tabell för inbjudan | **Separat `pedagog_invite`** — inte utöka `family_invite` |
| 2 | Vem får bjuda in? | **Enbart `primary`** — **`403 ONLY_PRIMARY`** i API + dold UI för shared |
| 3 | Feature-gate | **`pedagoganteckningar` på barnets/inbjudande familj.** Pedagog med tom "pedagogfamilj" — kolla om något länkat barn har flaggan aktiv |
| 4 | Redirect efter accept | **Ja → `/pedagog-oversikt`** |
| 5 | Pedagog + förälder | **"Byt vy"** i profil: Föräldraläge ↔ Pedagogläge |
| 6 | Dropdown vs chips | **Dropdown** i översikt/dagformulär (5–15 barn) |
| 7 | "2 tim+" | **`2.0` NUMERIC** i `sleep_hours` |
| 8 | Frukost | **Alltid synlig** i Fas B; "Serverades ej" / "Åt ej" för sen ankomst |
| 9 | Måltider migration | **Ny kolumn `meals_structured` (JSONB)**; behåll `meals` TEXT som fallback |
| 10 | Feature-status | **DEV** tills Fas 4 — closed beta via `family_features`; **`live`** efter penetration + checklista |
| 11 | ON CONFLICT vid accept | **`DO NOTHING`** — ingen `DO UPDATE`; re-accept = `UPDATE revoked_at = NULL` |
| 12 | Revoke access | **Soft:** `revoked_at` + `revoked_by`, inte DELETE |
| 13 | Draft vs klar | **`is_draft BOOLEAN`** — Fas 0 migration; UI Fas B1 |
| 14 | viewMode | **`preferred_view_mode`** backend + localStorage cache; `POST /api/me/preferences` |
| 15 | Query-lager | **`getChildrenForParent()`** — Identity-Scoped; inte enbart middleware |
| 16 | account_type | **`family` \| `educator` \| `dual`** — Fas 0 migration på `parent` |
| 17 | Unik nyckel | **`CREATE UNIQUE INDEX pedagog_notes_unique_daily`** — race autosave vs klar |
| 18 | Overview-prestanda | Fas 0: UNIQUE + lookup + **`parent_child_unique_active_pedagog`** · Fas 1: invite token/email |
| 19 | `is_draft` idempotent | Autosave får inte återöppna utkast efter "Markera som klar" |
| 20 | Utkast i UI | **`◐ UTKAST` utan tid** — `saved_at` endast vid `is_draft = false` |
| 21 | Rapport | **Pedagognamn** per anteckningsrad (JOIN `parent` på `pedagog_id`) |
| 22 | Familjenamn | **`family_label`** med primärförälder vid kollision |
| 23 | Vy-lifecycle | **`syncAccountType`** + fallback `preferred_view_mode → parent` |
| 24 | `parent_child.role` | OK Fas A; **`child_access` vid första roll utöver pedagog** |
| 25 | `pedagog_invite.token` | **`UNIQUE INDEX pedagog_invite_token_unique`** + `LOWER(email)`-index |
| 26 | Aktiva pedagog-rader | **`parent_child_unique_active_pedagog`** partial unique |
| 27 | `account_type` | **Derivat** via `syncAccountType()` — aldrig manuell UI-write |
| 28 | `revoked_at`-filter | **Endast** i `getChildrenForParent()` — aldrig duplicera i routes |
| 29 | Säkerhet | **Middleware + query-lager** — båda obligatoriska |
| 30 | `pedagog_notes` POST | **`INSERT … ON CONFLICT DO UPDATE`** — krävs med UNIQUE-index |
| 31 | Borttaget barn | Overview exkluderar; revoke behåller historik; rapporter renderar historik |
| 32 | Implementationsdisciplin | Alla framtida routes **måste** använda Fas 0 helpers |
| 33 | Rapport vs revoke | **Rapporter:** ingen aktiv-koppling-filter. **Pedagog-API:** kräver aktiv koppling |
| 34 | Feature go-live | **Fas 4:** closed beta (`family_features`) → penetration → `status = 'live'` |
| 35 | Rollback | Stäng flagga / beta — **aldrig** DELETE pedagog-data |
| 36 | Shared + inbjudan | **`requirePrimaryParent`** + integrationstest 403 |
| 37 | `syncAccountType` | Code review + **integrationstester i Task 2** — enforcement, inte egen produktfeature |
| 38 | Trust boundary | **Parent-initiated, child-scoped** — ingen publik pedagogregistrering |
| 39 | Externa sidor | Intresseformulär OK; **ingen** “Skapa pedagogkonto” Fas 0–4 |
| 40 | `connected_since` | **`connected_at` i Task 2 DB**; UI *Kopplad sedan* i Task 3 |
| 41 | Profilnivåer | **`professional_interest`** ≠ **`educator_profile`** (relationellt, post Fas 4) |

---
## Implementationsspår

**Fas 0 först. Inga nya sidor före säkerhet.**

| Fas | Innehåll | Gate |
|-----|----------|------|
| **0** | DB-migration + `getChildrenForParent()` + guards + integrationstester (403) | **Blockerande** — allt annat väntar |
| **1** | Inbjudan (A1) + overview-API (A3) + förälder-UI (A2) | Penetrationstest → closed beta |
| **2** | `pedagog-oversikt.html` — tabellen | Kräver Fas 1 beta |
| **3** | Dagformulär + `meals_structured` + rapportrendering | Kräver Fas 2 |
| **4** | **Release:** `pedagoganteckningar` dev → live | Kräver Fas 3 + penetration re-run |

### Feature-flag — `pedagoganteckningar` (dev → live)

Under utveckling: `features.status = 'dev'` (seeded i `scripts/seed-features.js`). Gate sker på **barnets familj** — inte pedagogens konto.

| Steg | När | `features.status` | Vem ser featuren |
|------|-----|-------------------|------------------|
| **Utveckling** | Fas 0 | `dev` | Ingen produktion-UI |
| **Closed beta** | Efter Fas 1 + penetrationstest grönt | `dev` | Endast familjer med rad i `family_features` (admin tilldelar) |
| **Fas 2–3** | Beta fortsätter | `dev` | Samma — beta-familjer + inbjudna pedagoger |
| **Go-live (Fas 4)** | Fas 3 klar + penetration re-run + checklista | **`live`** | Alla familjer (ingen `family_features`-rad krävs) |

**Fas 4 — Go-live checklista (admin/manuellt):**

- [ ] Penetrationstest: pedagog-only 403 på familj-routes; ingen dataläckage
- [ ] Invite-flöde testat med riktiga e-postadresser (minst 2 familjer)
- [ ] Overview + dagformulär + rapport i beta utan P0-buggar
- [ ] Admin: `UPDATE features SET status = 'live' WHERE slug = 'pedagoganteckningar'`
- [ ] Bump `public/sw.js` `CACHE_NAME`
- [ ] Ev. nyhetsbrev / dagens nyhet (ej scope spec)

**Om penetration failar:** se **Rollback** under Acceptanskriterier → Fas 4 (stäng flagga/beta — radera inte data).

> **Not:** `live` slår på feature **globalt** för alla familjer. Closed beta **före** live sker enbart via `family_features` medan status fortfarande är `dev`.

| Fas | Steg | Innehåll |
|-----|------|----------|
| **0** | — | Migration: kolumner + **revoked_at** + **alla index** + idempotent `is_draft` på server |
| **0** | — | `getChildrenForParent()`, guards, integrationstester (403) |
| **1** | A1 | `pedagog_invite` + token/email-index, accept (`DO NOTHING`), revoke-endpoint |
| **1** | A3 | `GET /overview` + `POST /api/me/preferences` |
| **1** | A2 | Förälder-UI: bjud in, lista, återkalla |
| **2** | A4 | `pedagog-oversikt.html` — tabell, `is_draft`, saved_at |
| **3** | B1–B4 | Dagformulär, **Markera som klar**, `meals_structured`, rapport (`is_draft = false`) |
| **4** | — | **Release:** penetration re-run → `features.status = 'live'` |

### Fas 0 — slutlig låsning (implementationsredo)

| # | Område | Beslut |
|---|--------|--------|
| 1 | **Index** | Fas 0: pedagog_notes UNIQUE + lookup + partial unique pedagog · Fas 1: pedagog_invite token/email |
| 2 | **Ghost Draft + UPSERT** | `ON CONFLICT DO UPDATE` + `is_draft` CASE — **Fas 0 server** |
| 3 | **`syncAccountType`** | Deterministisk derivat från roller — aldrig manuell write |
| 4 | **Access** | `getChildrenForParent()` = enda ställe för `revoked_at IS NULL` |
| 5 | **Säkerhet** | Middleware (UX) + query-lager (data) — båda |
| 6 | **Accept** | `ON CONFLICT DO NOTHING` |
| 7 | **PWA-flush** | 15 s debounce + pagehide/freeze/sendBeacon — dataförlust-prevention |
| 8 | **Framtid** | `child_access` **vid första roll utöver pedagog** |

### Implementationsdisciplin (största kvarvarande risk)

Arkitekturen är redo. Risken är **disciplin** — att nya routes glömmer identity-scoped helpers inom 6 månader.

| Krav | Enforcement |
|------|-------------|
| Barnlistor | Endast `getChildrenForParent()` |
| `account_type` | Endast `syncAccountType()` |
| Pedagog-only block | Middleware **och** query-lager |
| Code review | Blockera `pc.revoked_at` inline; blockera `WHERE family_id` utan rollcheck; blockera `SET account_type` utanför `syncAccountType()` |

**Fasordning (låst — gör inte tvärtom):**

```
datamodell → query isolation → deny-by-default → tester → invitation flow → UI
```

**Ingen ny UI före steg 3 är grönt.**

### Atomära commits — Fas 0 (implementationsordning)

Varje steg = en commit. **Ingen UI före steg 3 är grönt.**

**Commit 1 — Migration (SQL)**

```sql
ALTER TABLE parent ADD COLUMN account_type TEXT NOT NULL DEFAULT 'family';
ALTER TABLE parent ADD COLUMN preferred_view_mode TEXT NOT NULL DEFAULT 'parent';
ALTER TABLE pedagog_notes ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE parent_child ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES parent(id);

ALTER TABLE parent ADD CONSTRAINT parent_account_type_check
  CHECK (account_type IN ('family', 'educator', 'dual'));
ALTER TABLE parent ADD CONSTRAINT parent_preferred_view_mode_check
  CHECK (preferred_view_mode IN ('parent', 'pedagog'));

UPDATE pedagog_notes SET is_draft = false;

CREATE UNIQUE INDEX IF NOT EXISTS pedagog_notes_unique_daily
  ON pedagog_notes (child_id, pedagog_id, date);
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_role_active
  ON parent_child (parent_id, role)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pedagog_notes_lookup
  ON pedagog_notes (pedagog_id, child_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS parent_child_unique_active_pedagog
  ON parent_child (parent_id, child_id, role)
  WHERE revoked_at IS NULL AND role = 'pedagog';
```

**Commit 2 — DB-helpers + UPSERT + idempotent autosave**

- `db/parent-access.js`: `getParentRoles`, `getChildrenForParent`, `syncAccountType` (deterministisk)
- `db/pedagog-notes.js`: `INSERT … ON CONFLICT DO UPDATE` + Ghost Draft CASE
- `src/routes/auth.js`: utöka `GET /api/auth/me` med `account_type`, `hasPedagogChildren`, vy-fallback

**Commit 3 — Röda tester → middleware → grönt**

1. Skriv integrationstester (ska **faila** på master utan middleware):
   - Pedagog-only token → `GET /api/family/dashboard-stats` → **403**
   - Pedagog-only token → `POST /api/rewards/manual-stars` → **403** *(inte `/api/stars` — den routen finns inte)*
2. Applicera `requireNotPedagogOnly` på familj-scopade parent-routes tills testerna passerar.

---

## Engineering tasks (1996217–1996222)

Handoff till implementation — synkad med spec + kodbas-konventioner.

### Befintliga filer — utöka, inte parallellt

| Fil | Åtgärd |
|-----|--------|
| `src/middleware/authz.js` | **Utöka** med `requireNotPedagogOnly`, `requirePrimaryParent` |
| `test/pedagog-access.test.js` | **Skapa** (mönster: `test/authz.test.js`) |
| `migrations/*.js` | **node-pg-migrate** — inte `db/migrations/*.sql` |
| `db/parent-access.js` | **Ny** |
| `GET /api/auth/me` | **Utöka** (`src/routes/auth.js`) — inte ny `/api/me`-route |

### Testmetod — röda → grönt per task

- Task 1 skriver tester som **failar på master** tills respektive kod deployas.
- Exempel: `POST /api/family/invite-pedagog → 403` (shared) **skrivs i Task 1**, blir **grönt i Task 2** när routen finns.
- Detta är avsiktligt (samma mönster som Fas 0 commit 3).

### Task-beroenden ("Kräver")

| Task | ID | Kräver | Estimat |
|------|-----|--------|---------|
| **1** Fas 0: migration + guards + tester | 1996217 | — | ~4h |
| **2** Fas 1A1: pedagog_invite + accept/revoke | 1996218 | 1 | ~4h |
| **3** Fas 1A2/A3: förälder-UI + overview + view-mode | 1996219 | 1 + 2 | ~4h |
| **4** Fas 2: pedagog-oversikt.html | 1996220 | 3 | ~3h |
| **5** Fas 3: dagformulär + rapport | 1996221 | 4 | ~4h |
| **6** Fas 4: penetration + go-live | 1996222 | 1–5 + penetration grönt | ~3h |

**Kritisk path:** 1 → 2 → 3 → 4 → 5 → 6 (~22h).

### Task 1 — extra: profil + vy-fallback (backend)

Utöka **`GET /api/auth/me`** (Fas 0, backend — UI boot i Task 3):

```json
{
  "account_type": "educator",
  "preferred_view_mode": "pedagog",
  "hasPedagogChildren": true,
  "isDualRole": false
}
```

**Serverregel vid profil-hämtning:**

- Om `preferred_view_mode = 'pedagog'` men `hasPedagogChildren = false` → server sätter `preferred_view_mode = 'parent'` + anropar `syncAccountType(parentId)`.
- Returnera **effektiv** vy till klienten (efter fallback).

### Task 1 — commits (sammanfattning)

1. Migration SQL (se Atomära commits ovan)
2. `db/parent-access.js` + UPSERT i `db/pedagog-notes.js` + utöka `GET /api/auth/me`
3. Utöka `authz.js` + integrationstester → grönt

**Task 1 acceptans (kort):** migration OK · `getChildrenForParent` central · `syncAccountType` enda skrivare · pedagog-only 403 på dashboard-stats + manual-stars · UPSERT ghost-draft · UNIQUE race OK.

### Task 2 — Fas 1A1 (1996218): obligatoriska synktester + `connected_at`

**Migration (samma deploy som `pedagog_invite`):**

- `pedagog_invite` + index
- `ALTER TABLE parent_child ADD COLUMN connected_at TIMESTAMPTZ`

**`syncAccountType` — integrationstester (måste vara gröna före Task 3, inte “senare release”):**

```javascript
// accept-new → educator (ingen manuell SET account_type i route)
await POST('/api/pedagog-invite/accept-new', { token, password }).expect(201);
assert((await GET('/api/auth/me')).account_type === 'educator');

// befintlig primary accepterar pedagog-inbjudan → dual
await POST('/api/pedagog-invite/accept', { token }).expect(200);
assert((await GET('/api/auth/me')).account_type === 'dual');

// revoke sista pedagog-koppling → family + preferred_view_mode parent
```

**`connected_at` — integrationstest:**

- Efter accept: `GET /api/family/invite-pedagog` returnerar `connected_since` ≈ accept-tidpunkt
- Efter re-accept (efter revoke): `connected_at` uppdateras (ny grant)

### Task 2–6

Se Polsia/Linear tasks 1996218–1996222 för detaljer (routes enligt **route-split** ovan, rollback Fas 4, SW bump).

---

## Referenser

- Produktkontext: `CLAUDE.md` → tabell `pedagog_notes`, `professional_interest`
- Identity & Access: avsnitt *Identity & Access — trust boundary* (grundprincip)
- Engineering tasks: Linear **1996217–1996222** (detaljer i avsnitt *Engineering tasks* ovan)
- Feature-dokumentation: `scripts/seed-features.js` → `pedagoganteckningar`
- UI-mockup översikt: `docs/mockups/pedagog-oversikt.png`
- Befintlig mockup-stil: `docs/mockups/foraldra.html` (telefonram, färgvariabler)
- Native app-plan: `docs/app.md` (Capacitor, PWA)
