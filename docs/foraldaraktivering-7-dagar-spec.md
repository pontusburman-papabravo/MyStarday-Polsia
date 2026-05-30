# Föräldaraktivering — 7-dagarsprogram

**Skapad:** 2026-05-30  
**Senast reviderad:** 2026-05-30 (v3.5 — rena dataaxlar, child_first_completion, Retention Wall 2×2)  
**Status:** Implementation-ready (experimentdesign för retention)  
**Feature slug:** `foraldaraktivering_7d`  
**Relaterat:** onboarding, push-reminder-scheduler, win-back, retention-dashboard

---

## 0. Vad det här är (och inte är)

Det här är **inte** en feature-spec eller ett retention-flöde i win-back-stil.

Det är en **experimentdesign för retention** — byggd för att svara på:

> *Har vi identifierat den kausala mekanismen bakom retention, och kan vi mäta om vi påverkar den?*

| v1-fråga | v3.2-fråga |
|----------|------------|
| "Hur får vi föräldrar att komma tillbaka?" | "Vilken mekanism gör att de stannar — och rör vår intervention den?" |

**Kausal hypotes:**

> Föräldrar som stannar upplever ett tidigt bevis på att de **slipper tjata**.

Hela systemet är byggt för att **skapa**, **förstärka** och **mäta** det ögonblicket — inte för att maximera klick genom ett program.

| Retention-initiativ (typiskt) | Det här experimentet |
|-------------------------------|----------------------|
| Completion rate blir North Star | Day 14 cohort retention är North Star |
| Reagerar på inaktivitet | Förebygger innan vanan saknas |
| Push som primär kanal | Celebratory card + banner som primär kanal |
| Design för implementation | Design för **lärande** (A/B från dag 1) |

Hela specifikationen är organiserad runt att skapa den vanan dag 1–7 — inte att rädda användare vecka 3.

| Retention-initiativ (typiskt) | Det här systemet |
|-------------------------------|------------------|
| Reagerar på inaktivitet | Förebygger innan vanan saknas |
| Mäter logins | Mäter beteendeförändring + aha-ögonblick |
| Optimerar dag 7-completion | Optimerar **Day 14 cohort retention** |
| Push som primär kanal | Banner + celebratory card som primär kanal |

---

## 1. Problembeskrivning

Retention-vyn visar ~93 familjer i "Risk för churn" (>72h inaktivitet eller aldrig). Samtidigt kommer entusiastisk feedback från aktiva familjer — särskilt föräldrar till barn med autistisk utmattning som beskriver omedelbar positiv effekt.

**Hypotes:** Flaskhalsen ligger hos **förälderns vana**, inte barnets förmåga att använda appen.

| Signal | Tolkning |
|--------|----------|
| Status "Aldrig" | Föräldern registrerade sig men loggade aldrig in igen |
| Aktivitetsindex 0 + gammal login | Schema/onboarding klart, men ingen daglig uppföljning |
| Högt aktivitetsindex + färsk login | Barnet (eller medförälder) driver — primärföräldern behöver inte agera |
| Nöjda citat ("vi behövde inte ens påminna") | Föräldern har byggt en intern morgon-/kvällsvana |

Nuvarande onboarding sätter upp barnets schema på ~6 steg och markerar `onboarding_completed`. Därefter finns inget strukturerat stöd för att få **föräldern** att återkomma dag 2–7.

### Designprincip: stödjande, inte dömande

Programmet **fortsätter vid miss** — en missad dag markeras internt men påverkar aldrig copy, progress eller tillgång till nästa dag. I en vardag med NPF-utmaningar är flexibilitet inte en feature, det är en **förutsättning**.

### Produktprincip: samma beteende ≠ samma problem

Två familjer kan båda vara inaktiva idag — men orsaken kan vara helt olika:

| Typ | Verkligt problem | v1-program |
|-----|------------------|------------|
| **Ny familj** (Grupp A) | Vanan hann aldrig bildas | `onboarding_7d` |
| **Churnad familj** (Grupp C) | Vanan bildades aldrig eller dog ut | `reactivation_3d` (v1.2) |
| **Aktiv familj** (Grupp B) | Behöver kanske inget stöd | Inget program |

Behandlar man alla tre likadant blir resultatet ofta mediokert för alla.

### 1.1 Tre användargrupper — strategisk avgränsning (v3.3)

Majoriteten av churn-risk-familjerna (~93 i retention-vyn) är **inte** nya registreringar. De har redan:

```
Onboardade → barn → schema → använder inte appen
```

Det är en **annan psykologi** än nya familjer:

| | Grupp A (nya) | Grupp C (befintliga risk) |
|--|---------------|----------------------------|
| Kontext | Hopp — "här är en karta" | Besvikelse — "jag misslyckades redan" |
| Problem | Ingen vana ännu | Vanan dog ut |
| Program | Vanebildning (7 dagar) | Återaktivering (nystart) |

**Att blanda ihop dem förorenar experimentet** — Day 14 North Star blir omöjlig att tolka.

#### Grupp A — Nya familjer *(v1.0 — huvudexperimentet)*

```
Onboarding complete → auto-enroll → onboarding_7d (7 dagar)
```

Endast familjer som **just slutfört onboarding** i denna session. Ingen retroaktiv enroll.

#### Grupp B — Befintliga aktiva familjer *(gör ingenting)*

Har redan byggt vanan. Behöver inte aktiveringsprogram. Celebratory card kan fortfarande visas (aha-moment är universellt) — men **inget dagsprogram**.

#### Grupp C — Befintliga riskfamiljer *(v1.2 — separat program)*

**Inte** auto-enrolla i experimentet. **Inte** trycka in i 7-dagarsprogrammet.

**Men inte "slå dövörat till":** Grupp C är fortfarande värdefull — bara **utanför effektmätningen**:

| Gör | Gör inte |
|-----|----------|
| Visa i retention-dashboard | Inkludera i onboarding_7d-kohort |
| Följ utveckling över tid | Retroaktiv auto-enroll |
| Manuell outreach (export, win-back) | Blanda in i Day 14 A/B-analys |
| Supportintervjuer, kvalitativ analys | Påverka utvärdering av nya familjer |

Analogi: medicinskt test — Grupp A = nya patienter, B = kontroll, C = redan lämnat behandling. Man lär sig av C, men blanda inte in dem i första effektmätningen.

Senare: **`reactivation_3d`** — eget program, egen copy, samma motor. **Mål (v1.2):** inte bara *"få tillbaka föräldern"* utan *"få föräldern att uppleva ett nytt aha-moment"* — om data visar att `parent_first_completion_seen` är starkaste retention-prediktorn.

| Dag | Fokus |
|-----|--------|
| 1 | "Stämmer tiderna fortfarande? Justera en sak." |
| 2 | "Visa barnet att appen är vaken igen." |
| 3 | "Har appen hjälpt?" (värde-reflektion) |

**Trigger (v1.2):** `last_login > 14 dagar` AND `has_schema = true` → banner vid nästa login: *"Vill ni prova en 3-dagars nystart?"*

#### v1.0-beslut (låst)

| | Beslut |
|--|--------|
| Nya familjer | ✅ Auto-enroll `onboarding_7d` vid onboarding complete |
| Befintliga aktiva | ✅ Ingen enroll |
| Befintliga risk (~93) | ❌ **Ej i experimentet** — retention-vy, export, intervjuer; `reactivation_3d` v1.2 |
| Experimentdata | ✅ Endast post-launch nyregistreringar i kohort-analys |

#### Roadmap (prioriterad)

```
Nu (v1.0)
  ├── Fas 1–4: onboarding_7d, endast Grupp A
  ├── A/B-test (cohort_arm)
  └── Mät Day 14 retention vs control

Efter 4–6 veckor — forskningsfas (v1.1)
  ├── Korrelerar parent_first_completion_seen med Day 14?
  ├── Analysera "Retention Wall" (se nedan)
  └── Räkna Grupp C-segment (barn + schema + 0 aktivitet 14d)

Därefter (v1.2)
  └── Designa reactivation_3d — optimerat för nytt aha-moment om datan stödjer
```

#### Forskningsfas: "Retention Wall" (v1.1, vecka 4–6)

**Officiell forskningsfråga:** Var bryts kedjan — och är completion ens relevant för retention?

Fyrfältsschema bland **Grupp A** (post-launch, `onboarding_7d`):

| | **Retained dag 14** | **Churned dag 14** |
|--|---------------------|---------------------|
| **Program completed** | ✅ Ideal — mekanismen fungerade | ❌ **Retention Wall** — viktigaste insiktskällan |
| **Program incomplete** | ✅ Programmet var inte nödvändigt | ❌ Programmet hjälpte inte |

De flesta tittar bara på *completed vs not completed*. **Completed + churned** är ofta där de stora produktproblemen bor:

- De förstod onboarding
- De såg programmet
- De använde produkten
- **De lämnade ändå** → kärnprodukten saknar långsiktigt värde

**Kvalitativ prioritet v1.1:** intervjua *Complete + Churned* före alla andra segment.

Möjliga strukturella orsaker (hypoteser):
- Belöningssystemet enformigt efter vecka 1
- Schemat för statiskt
- Barnet engageras inte långsiktigt
- Förälder får otillräckligt värde efter dag 7

> Fixa läckan i hinken (onboarding) innan du hämtar tillbaka vattnet som runnit ut (churn).

---

## 2. Mål och KPI-hierarki

### North Star (enda KPI som avgör framgång)
**Day 14 cohort retention** — andel familjer fortfarande aktiva 14 dagar efter registrering.

Jämförs via **treatment vs control** (se §13) — inte bara absolut förbättring. Utan kontrollgrupp riskerar teamet optimera dag 2-login och dag 7-completion utan att retention faktiskt förbättras.

### Leading indicators (diagnostiska, inte mål i sig)

```
North Star
  └── Day 14 retention (treatment vs control)

Leading indicators
  ├── child_first_completion (barnet lyckas)
  ├── parent_first_completion_seen (förälder upptäcker — aha)
  ├── hours_since_completion (tid barn → förälder)
  ├── enrollment → first_banner_seen gap
  ├── Day 7 value score
  └── Program completion rate (diagnostisk — troligen svagare prediktor än aha)
```

**Hypotes (v3.5):** `parent_first_completion_seen` predikterar Day 14 bättre än `activation_program_completed`. Completion = kognitiv börda; aha = emotionell lättnad. Admin ska kunna gruppera Day 14 retention by aha-sett så fort data finns.

Många team optimerar **completion rate** som North Star och får folk att klicka igenom utan retention-effekt. Den fällan är undvikbar via hierarkin ovan.

### Kausal kedja (hypotes)

```
1. Exponering     → first_banner_seen
2. Barn agerar    → child_first_completion        ← NY (v3.5)
3. Förälder ser   → parent_first_completion_seen  ← aha
4. Värde-kvitto   → dag 7-reflektion
5. Retention      → aktiv dag 14 (North Star)
```

**Två distinkta fel:** utan `child_first_completion` kan vi inte skilja:
- *Aktiveringsproblem* — barnet gjorde aldrig något
- *Exponeringsproblem* — barnet gjorde något, föräldern såg det aldrig

Tid mellan steg 2 och 3 (`hours_since_completion`) driver push-strategi (Fas 5).

### Icke-mål (v1)
- Trappa upp barnets schema gradvis
- Ersätta onboarding-wizard
- Win-back-ersättning
- Co-parent-specifik progression

---

## 3. Produktidé

Ett **7-dagars vaneprogram för föräldrar** som startar vid slutförd onboarding.

| Kanal | Prioritet | Roll |
|-------|-----------|------|
| **Celebratory card** (aha-ögonblick) | Högst | Emotionellt värde — viktigare än push |
| **Dashboard-banner** | Hög | Daglig coach; förvandlar tom dashboard till guide |
| **Push** (Fas 5) | Låg | Påminnelse, inte drivkraft |
| **Dag 7-reflektion** | Mätning | Value proposition-kvitto |

Barnets schema förblir oförändrat efter onboarding. Fokus: **förälderns beteende**.

---

## 4. Sju dagars innehåll

| Dag | Rubrik | Push (Fas 5) | Uppdrag | Mätning |
|-----|--------|--------------|---------|---------|
| **1** | Dag 1 — kika tillsammans | *(ingen)* | Öppna barnläget och visa första aktiviteten tillsammans | `child_view_opened` eller `child_login` |
| **2** | Dag 2 — morgonkollen | "God morgon! Kolla [barn]s schema — tar 30 sek 🌅" | Öppna dashboarden någon gång under dygnet | `parent_login` dygn 2 |
| **3** | Dag 3 — fira en stjärna | "Har [barn] fått en stjärna idag? Fira tillsammans ⭐" | Fira avklarad aktivitet | `parent_first_completion_seen` |
| **4** | Dag 4 — er app | "Något som känns fel? Byt ut en aktivitet ✏️" | Justera en aktivitet vid behov | `schedule_edit` eller `parent_login` |
| **5** | Dag 5 — belöning | "Kolla Skattkammaren — vad drömmer [barn] om? 🎁" | Öppna belöningsvy | `parent_login` + skattkammaren |
| **6** | Dag 6 — dela ansvaret | "Vill du dela ansvaret med någon? 👥" | Bjud in **eller** "Jag kör solo!" | `family_invite_created` / solo-dismiss |
| **7** | En vecka! 🎉 | "Grattis! Hur har veckan varit?" | Värde-reflektion (§5.2) | `activation_program_completed` |

### Dag 1 — kika tillsammans (v3)

**Varför ändrat:** "Visa PIN-inloggningen" ger föräldern inget direkt värde. Dag 1 ska optimera för:

> **Föräldern ser barnvyn.**

Copy: *"Öppna barnläget och visa första aktiviteten — tillsammans."*

CTA: "Öppna barnläget" → `/child-login` eller inline preview om tillgängligt.

Mätning: `child_view_opened` (ny analytics-event) eller `child_login`. Skapar första visuella "aha" — *så här ser barnet det*.

### Dag 2 — närvaro, inte tidspress

Push kl 08:00 = påminnelse. Mätning: `parent_login` någon gång under dygn 2.

### Dag 6 — dela ansvaret

| Action | Resultat |
|--------|----------|
| "Bjud in någon" | → invite-flöde |
| **"Jag kör solo!"** | → dag `done` omedelbart (positiv handling) |

### Dag 7 — värdepress

*"Har appen gjort vardagen enklare?"* (skala 1–5)

| Score | Tolkning |
|-------|----------|
| 4–5 | Value proposition landar |
| 3 | Delvis — förbättra copy/onboarding |
| 1–2 + genomfört program | Pedagogisk/teknisk tröskel, inte brist på vilja |

---

## 5. Användarupplevelse

### 5.1 Dashboard-banner

- Placering: överst på `/dashboard`
- Målgrupp: primär förälder med `status = 'active' AND cohort_arm = 'treatment'`
- Progress: `Dag 3 av 7`
- Actions: dag-CTA, "Hoppa över idag", dag 6 "Jag kör solo!", opt-out "Jag klarar mig själv"
- **Dags-byte-animation:** triggas när `effective_day > last_seen_day` vid banner-load (§7.2)

### 5.2 Dag 7 — värde-reflektion

Modal/inline: skala 1–5, valfri fritext (500 tecken), → `completed`.

### 5.3 Celebratory card — parent aha-ögonblick (v3)

**Viktigaste emotionella skärmen i vecka 1.** Viktigare än push-notiser.

När `parent_first_completion_seen` triggas — visa **dedikerad celebratory card** (inte bara banner-text):

```
┌─────────────────────────────────────────┐
│  🎉                                     │
│  Estelle klarade "Borsta tänderna"      │
│                                         │
│  Utan att du behövde påminna.          │
│                                         │
│  [ Toppen! ]                            │
└─────────────────────────────────────────┘
```

- Placering: modal eller prominent card ovanför banner (engångs per completion)
- Dismiss → sparad i `parent_seen_completion`
- Kan triggas dag 1+ om barnet hinner checka av före dag 3
- Design: varm, stor emoji, barnets namn + aktivitet — **fira stunden**

Internt produktkoncept: **`parent_aha_moment`**.  
DB/analytics-eventnamn: `parent_first_completion_seen` (behålls för konsistens).

> Användare köper inte appen. De köper: *"Jag slipper tjata."*  
> Det här UI:t är det ögonblicket.

### 5.4 Onboarding-val (v1.1)

Default auto-enroll i treatment. Control via A/B (§13).

---

## 6. Affärsregler

| Regel | Värde |
|-------|-------|
| Programlängd | 7 kalenderdagar från `started_at` |
| Daggräns | Midnatt i `family.timezone` |
| **Enda sanningen för dag** | `getEffectiveProgramDay()` — runtime |
| Missad dag | `missed` internt — programmet fortsätter |
| Push | Max 1/dag, dag 2–7, Fas 5 |
| A/B | `cohort_arm` sätts vid enroll — se §13 |

### Dag-avklarning

Dag `done` om: login, manuell complete, dag-specifikt event, solo-dismiss (dag 6), eller aha (dag 3+).  
Annars `missed` vid midnatt — **ingen UI-konsekvens**.

---

## 7. Datamodell

### 7.1 Tabell: `parent_activation_program`

```sql
CREATE TABLE parent_activation_program (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id        UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN (
                       'active',      -- program pågår (treatment + control)
                       'completed', 'opted_out', 'expired'
                     )),
  cohort_arm       TEXT NOT NULL DEFAULT 'treatment'
                     CHECK (cohort_arm IN ('treatment', 'control')),
  program_type     TEXT NOT NULL DEFAULT 'onboarding_7d'
                     CHECK (program_type IN ('onboarding_7d', 'reactivation_3d')),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_banner_seen_at TIMESTAMPTZ,  -- NULL tills treatment-förälder ser banner första gången
  last_seen_day    SMALLINT NOT NULL DEFAULT 0 CHECK (last_seen_day >= 0),
  completed_at     TIMESTAMPTZ,
  opted_out_at     TIMESTAMPTZ,
  day_status       JSONB NOT NULL DEFAULT '{}',
  reflection_score SMALLINT CHECK (reflection_score BETWEEN 1 AND 5),
  reflection_text  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX parent_activation_program_active_family
  ON parent_activation_program (family_id)
  WHERE status = 'active';
CREATE INDEX parent_activation_program_type_status
  ON parent_activation_program (program_type, status);
CREATE INDEX parent_activation_program_cohort
  ON parent_activation_program (cohort_arm, status);
```

**Två separata axlar (v3.5 — håll domänen ren):**

| Axel | Värden | Betydelse |
|------|--------|-----------|
| **`cohort_arm`** | `treatment` \| `control` | Experimentarm — *får de behandling?* |
| **`status`** | `active` \| `completed` \| `opted_out` \| `expired` | Programmets livscykel |

`control_holdout` som status **tas bort** — leaky abstraction. Control = `cohort_arm = 'control'`, `status = 'active'`.

**Queries:**

```sql
-- Banner (behandling)
WHERE status = 'active' AND cohort_arm = 'treatment'

-- Alla aktiva i experimentet
WHERE status = 'active'

-- Day 14 kohort
WHERE cohort_arm IN ('treatment', 'control')
```

**`program_type`** — samma tabell och motor, olika innehåll:

| program_type | Längd | Enroll-trigger (v1) | Målgrupp |
|--------------|-------|---------------------|----------|
| `onboarding_7d` | 7 dagar | `POST /api/onboarding/complete` | Grupp A — nya familjer |
| `reactivation_3d` | 3 dagar | Login efter 14d inaktivitet *(v1.2)* | Grupp C — riskfamiljer |

`getEffectiveProgramDay()` tar `program_type` och cap:ar vid programlängd (7 resp. 3).  
Content hämtas från `activation-program-content.js` per typ.

**Status × cohort (v3.5):**

| status | cohort_arm | Banner | Betydelse |
|--------|------------|--------|-----------|
| `active` | `treatment` | Ja | Pågående behandling |
| `active` | `control` | Nej | Kontroll — med i experiment, ingen intervention |
| `completed` | `treatment` | Nej | Dag 7 klar |
| `opted_out` | `treatment` | Nej | Frivillig exit |
| `expired` | * | Nej | >7 dagar utan completion |

**Ingen `current_day`-kolumn.** v3 eliminerar dubbel sanning.

### 7.2 En sanning: `effective_day` + `last_seen_day`

```js
/**
 * Enda sanningen för vilken programdag vi är på.
 * @returns {number} 1–7; >7 → program expired/completable
 */
function getEffectiveProgramDay(program, timezone) { /* ... */ }
```

**`last_seen_day`** — endast UI-state:
- Uppdateras vid GET `/api/me/activation-program` (banner visad)
- Syfte: trigga dags-byte-animation när `effective_day > last_seen_day`
- Scheduler, admin och affärslogik använder **aldrig** `last_seen_day`

**Midnight rollover (lazy, vid GET):**
1. `effectiveDay = getEffectiveProgramDay(...)`
2. Föregående dag → `missed` om `pending`
3. Om `effectiveDay > last_seen_day` → response flag `day_advanced: true` (animation)
4. Efter banner render → POST eller GET uppdaterar `last_seen_day = effectiveDay`

#### Implementation: timezone-safe dagberäkning

Använd etablerat bibliotek (**luxon** eller **date-fns-tz**) — undvik manuell DST-offset som i win-back-schedulern.

```js
// src/lib/activation-program.js
const { DateTime } = require('luxon');

function getEffectiveProgramDay(program, timezone = 'Europe/Stockholm') {
  const duration = program.program_type === 'reactivation_3d' ? 3 : 7;
  const startLocal = DateTime.fromJSDate(program.started_at, { zone: 'utc' })
    .setZone(timezone)
    .startOf('day');
  const nowLocal = DateTime.now().setZone(timezone).startOf('day');
  const diffDays = Math.floor(nowLocal.diff(startLocal, 'days').days);
  return Math.min(Math.max(diffDays + 1, 1), duration);
}
// >7 hanteras av caller → status 'expired' eller dag-7-reflektion kvar
```

**Logik i klartext:**
1. Ta `started_at` (UTC) → konvertera till `family.timezone` start-of-day
2. Ta `now()` → samma timezone start-of-day
3. Diff i hela dygn + 1 = `effective_day`

**Tester (obligatoriska i Fas 1):**
- Enroll kl 23:30 → fortfarande dag 1
- Rollover vid midnatt lokal tid (inte UTC)
- DST-skifte (mars/oktober) — luxon hanterar; skriv ett test per skifte

### 7.3 Tabell: `parent_seen_completion`

```sql
CREATE TABLE parent_seen_completion (
  parent_id         UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  daily_log_item_id UUID NOT NULL REFERENCES daily_log_item(id) ON DELETE CASCADE,
  seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, daily_log_item_id)
);
```

---

## 8. Completion-kedjan: barn → förälder → retention

### 8.1 `child_first_completion` (v3.5)

**Analytics-only** — triggas när ett barn checkar av en aktivitet **första gången** under programperioden (per familj, per programkörning).

```json
{
  "child_id": "...",
  "daily_log_item_id": "...",
  "activity_name": "Borsta tänderna",
  "effective_day": 2,
  "program_type": "onboarding_7d"
}
```

**Trigger:** vid `daily_log_item` completion (befintlig check-off path) — emit om familj har aktivt program och eventet inte redan loggats för denna körning.

**Varför:** skiljer *aktiveringsproblem* (barnet gör aldrig) från *exponeringsproblem* (barnet gör, förälder ser aldrig).

### 8.2 `parent_first_completion_seen` (aha)

**Internt koncept:** `parent_aha_moment`  
**DB/analytics:** `parent_first_completion_seen`

### Trigger

Vid dashboard-load (`GET /api/me/daily-log` eller `/new-completions`):

1. Hämta nya `daily_log_item` med `completed = true`
2. Exkludera redan sedda ( `parent_seen_completion`)
3. För varje ny:
   - Emit analytics (inkl. `hours_since_completion`)
   - Visa **celebratory card** (§5.3)
   - Insert `parent_seen_completion`

### Metadata

```json
{
  "child_id": "...",
  "daily_log_item_id": "...",
  "activity_name": "Borsta tänderna",
  "effective_day": 3,
  "hours_since_completion": 4.2
}
```

`hours_since_completion` = `(now - daily_log_item.completed_at)` i timmar, avrundat 1 decimal.

**Analytiskt värde:** Om retention korrelerar med snabb exponering (t.ex. 60% inom 2h vs 25% nästa dag) vet vi att Fas 5-push ska optimeras för:

> *"Estelle blev precis klar! Gå in och se hennes stjärna."*

— inte generisk "kom ihåg att öppna appen". Tid är kritisk faktor i dopamin-loopen.

### 8.3 Fullständig kedja

```
child_first_completion
        ↓  (hours_since_completion)
parent_first_completion_seen
        ↓
day_14_retention
```

Hypotes: aha-prediktion > completion-prediktion. Se §12 admin-vy.

---

## 9. API

| Method | Path | Beskrivning |
|--------|------|-------------|
| `GET` | `/api/me/activation-program` | Returns program if `status='active' AND cohort_arm='treatment'`; else `active: false` |
| `POST` | `/api/me/activation-program/skip-day` | `skipped` |
| `POST` | `/api/me/activation-program/complete-day` | `done` |
| `POST` | `/api/me/activation-program/solo-day` | Dag 6 solo |
| `POST` | `/api/me/activation-program/opt-out` | `opted_out` |
| `POST` | `/api/me/activation-program/reflection` | Dag 7 → `completed` |
| `GET` | `/api/me/activation-program/new-completions` | Aha-kandidater |
| `GET` | `/api/admin/activation-program/stats` | Funnel + day 14 cohort |

### Response (förenklad)

```json
{
  "active": true,
  "cohort_arm": "treatment",
  "effective_day": 3,
  "last_seen_day": 2,
  "day_advanced": true,
  "day_status": { "1": "done", "2": "done", "3": "pending" },
  "content": { "title": "Dag 3 — fira en stjärna", "body": "...", "cta_label": "...", "cta_url": "..." },
  "aha_moments": [
    { "child_name": "Estelle", "activity_name": "Borsta tänderna", "daily_log_item_id": "..." }
  ]
}
```

Control-arm: `active: false`, `cohort_arm: "control"`, `status: "active"` — ingen banner, rad finns för kohort-analys.

### Enrollment (Fas 4) — endast Grupp A i v1.0

**Eligibility (allt måste vara sant):**

```js
function canEnrollOnboardingProgram(parent, family) {
  return (
    ACTIVATION_PROGRAM_ENABLED === true &&
    parent.onboarding_completed === true &&  // just satt i samma request
    !familyHasActiveProgram(family.id) &&
    isNewEnrollmentSession()  // endast vid POST /api/onboarding/complete — aldrig retroaktivt
  );
}
```

Vid `POST /api/onboarding/complete`:
1. Om **inte** eligible → inget program (befintliga familjer som redan onboardat: skip tyst)
2. A/B-assign `cohort_arm` (§13)
3. Skapa rad: `program_type = 'onboarding_7d'`
4. Om **treatment:** `status = 'active'`, `cohort_arm = 'treatment'` → track `activation_program_started`
5. Om **control:** `status = 'active'`, `cohort_arm = 'control'` → track `activation_program_started`

**Explicit exkludering v1.0:**
- Familjer som onboardade före `ACTIVATION_PROGRAM_ENABLED` launch-datum
- Familjer som redan har `onboarding_completed = true` vid annan login (ingen re-enroll)
- Admin bulk-enroll av retention-listan — **inte i v1.0** (ev. manuell research-cohort i v1.1)

**`activation_program_started`** = enroll i experimentet (dag 0). Metadata: `{ cohort_arm, program_type }`.
**`activation_program_first_banner_seen`** = första gång treatment-förälder exponeras för banner (sätts `first_banner_seen_at`, separat event).

Gapet *started → first_banner_seen* isolerar om problemet är:
- att de aldrig hittar tillbaka till dashboarden efter onboarding, eller
- att de kommer tillbaka men ignorerar bannern.

Många av de 93 "Väntar"-familjerna är **Grupp C** — de får **inte** onboarding_7d. De adresseras via retention-export / win-back nu, och `reactivation_3d` efter att Grupp A-data bevisat mekaniken.

### Reactivation (v1.2 — spec-skiss, ej v1.0)

```
Trigger: last_parent_login > 14d AND has_weekly_schedule AND NOT active program
Action:  Val-banner "Vill ni prova en 3-dagars nystart?"
Enroll:  program_type = 'reactivation_3d', opt-in (inte auto)
```

Copy-fokus: *"Vi såg att ni redan har ett schema"* — nystart, inte skuld.  
Återanvänder: banner, celebratory card, aha-tracking, cohort_arm, scheduler — ny content-fil.

---

## 10. Scheduler / push (Fas 5)

Sekundär kanal. Använder endast `getEffectiveProgramDay()` — aldrig `last_seen_day`.

Risk: medel (spam, timing). Byggs efter banner + aha bevisats.

---

## 11. Analytics

### Experiment-events (dag 0 / exponering)

| event_type | metadata | När |
|------------|----------|-----|
| **`activation_program_started`** | `{ cohort_arm, program_type }` | Enroll (treatment + control) |
| **`activation_program_first_banner_seen`** | `{ effective_day, hours_since_enroll }` | Första banner-render (treatment only) |

### Program-events (dag 1–7)

| event_type | metadata |
|------------|----------|
| `activation_program_day_done` | `{ day, auto, trigger? }` |
| `activation_program_day_skipped` | `{ day }` |
| `activation_program_day_solo` | `{ day }` |
| `activation_program_opted_out` | `{ day }` |
| `activation_program_completed` | `{ reflection_score }` |
| `child_view_opened` | `{ child_id, source: 'day1_cta' }` |
| **`child_first_completion`** | `{ child_id, activity_name, effective_day, program_type }` |
| **`parent_first_completion_seen`** | `{ child_id, activity_name, effective_day, hours_since_completion }` |
| `parent_aha_moment_dismissed` | `{ daily_log_item_id }` |
| `activation_program_push_sent` | `{ day }` |
| `activation_program_push_clicked` | `{ day }` |

### Admin-funnel (diagnostik)

```
activation_program_started
  → activation_program_first_banner_seen   ← enrollment gap
  → child_first_completion               ← barnet lyckas
  → parent_first_completion_seen         ← aha (tid sedan child_first_completion)
  → activation_program_completed
  → day_14_active                        ← North Star
```

Segmentera på `cohort_arm`. **Prioritera aha-sett framför completion** i admin.

### Day 14 cohort (North Star)

```
Kohort: familjer registrerade vecka W (post-launch only)
Filter: program_type = 'onboarding_7d'  -- exkludera framtida reactivation_3d
Treatment: cohort_arm = 'treatment'
Control:   cohort_arm = 'control' (status = 'active', ingen banner)
Metric:    aktiv dag 14 ±1 (login_event OR daily_log_item.completed)
```

Befintliga pre-launch familjer ingår **inte** i kohort — annars förorenas experimentet.

Om 6 månader: *Fungerade programmet? Hur mycket? Påverkades olika familjetyper olika?* — utan att bygga om analysmodellen.

---

## 12. Admin

- Funnel dag 0–7 (treatment: `status = 'active' AND cohort_arm = 'treatment'`)
- **Enrollment gap:** started vs first_banner_seen
- **Aha-timing:** `child_first_completion` → `parent_first_completion_seen` (hours_since_completion)
- **Day 14 retention grouped by `parent_first_completion_seen`** *(prioriterad vy — v3.5)*
  - Hypotes: aha-sett >> program-completed som prediktor
  - Bygg in Fas 6 så fort första kohort har dag-14-data
- **Retention Wall 2×2** (§1.1): complete/incomplete × retained/churned
- Dag 7 score-distribution
- Export reflektioner + completion-kedja-events

---

## 13. Feature flag och A/B (v3 — definieras före launch)

### Feature slug

`foraldaraktivering_7d` i `family_features` + `ACTIVATION_PROGRAM_ENABLED`.

### A/B vid enrollment (bygg in från dag 1, även om 100% treatment initialt)

```js
// src/lib/activation-program-enroll.js
function assignCohortArm(familyId) {
  const pct = parseInt(process.env.ACTIVATION_PROGRAM_TREATMENT_PCT ?? '100', 10);
  // Deterministisk hash på family_id → reproducerbar arm
  return hashToPercent(familyId) < pct ? 'treatment' : 'control';
}
```

| Env | Betydelse |
|-----|-----------|
| `ACTIVATION_PROGRAM_ENABLED=true` | Master switch |
| `ACTIVATION_PROGRAM_TREATMENT_PCT=100` | Launch: alla treatment (default) |
| `ACTIVATION_PROGRAM_TREATMENT_PCT=50` | A/B-test: 50/50 |

**Control-familjer:** `status = 'active'`, `cohort_arm = 'control'`. Ingen banner, ingen push. Inkluderas i retention-joins.

**Viktigt:** Sätt `cohort_arm` **vid enroll**, inte vid first banner view — annars blir kontrollgruppen biased.

---

## 14. Build order

| Fas | Innehåll | Risk |
|-----|----------|------|
| **1** | Migration + `getEffectiveProgramDay()` + A/B helper | Låg |
| **2** | Aha-tracking + celebratory card | Låg |
| **3** | Dashboard-banner | Låg |
| **4** | Auto-enrollment + cohort_arm | Låg |
| **5** | Push-scheduler | Medel |
| **6** | Admin + Day 14-analys | Medel |

**Effekt på retention:** hög potential — hårt kopplat till observerat beteende (vanor vs churn före vana).

### Checklistor

**Fas 1 (~3h)**
- [ ] Migration (`program_type`, `last_seen_day`, `cohort_arm`, `first_banner_seen_at`)
- [ ] `getEffectiveProgramDay()` + tester (DST)
- [ ] `assignCohortArm()`

**Fas 2 (~5h)**
- [ ] `child_first_completion` event (check-off hook)
- [ ] `parent_seen_completion` + `parent_first_completion_seen` (med `hours_since_completion`)
- [ ] Celebratory card UI (`activation-program-aha-card.js`)
- [ ] `activation_program_first_banner_seen` vid banner-mount

**Fas 3 (~4h)**
- [ ] Banner + dag 1 "kika tillsammans"
- [ ] Dags-byte-animation via `day_advanced`
- [ ] Solo-knapp, dag 7-reflektion

**Fas 4 (~2h)**
- [ ] Enroll hook i onboarding complete
- [ ] Feature seed + env vars

**Fas 5 (~4h)** — Push

**Fas 6 (~4h)** — Admin cohort dashboard

---

## 15. Acceptanskriterier (MVP = Fas 1–4)

1. `getEffectiveProgramDay()` — enda sanningen; inget `current_day` i DB
2. `last_seen_day` enbart UI; två axlar: `status` + `cohort_arm` (ej `control_holdout`)
3. Control: `status = 'active'`, `cohort_arm = 'control'` — ingen banner
4. `child_first_completion` + `parent_first_completion_seen` — separata events
5. Banner-query: `status = 'active' AND cohort_arm = 'treatment'`
6. Celebratory card vid första unseen completion
7. Dag 1 → barnvy; dag 2 login anytime; dag 6 solo; dag 7 värde-fråga
8. Miss → program fortsätter, ingen negativ copy
9. Befintliga pre-launch familjer enrollas **inte** retroaktivt
10. Endast `program_type = onboarding_7d` skapas i v1.0

---

## 16. Success metrics

| Metric | Typ | Mål |
|--------|-----|-----|
| **Day 14 retention (treatment vs control)** | North Star | Signifikant högre treatment |
| `parent_first_completion_seen` rate | Leading | >30% enrolled |
| **`hours_since_completion` median** | Leading | TBD — driver push-strategi Fas 5 |
| **Enrollment → banner gap** | Leading | Minimera andel started-never-seen |
| Dag 7 score ≥4 | Value | >50% responders |
| Dag 2 parent login | Leading | +20% vs control |
| Opt-out | Guardrail | <25% |

---

## 17. Riskbedömning (produktägare)

| Del | Risk |
|-----|------|
| Datamodell | Låg |
| Banner | Låg |
| Enrollment + A/B | Låg |
| Aha-tracking + celebratory card | Låg |
| Push | Medel |
| Day 14-analys | Medel |
| **Effekt på retention** | **Hög potential** |

---

## 18. Arkitektur-check (v3.5)

| Komponent | Beslut |
|-----------|--------|
| Dataaxlar | `cohort_arm` (experiment) separerad från `status` (livscykel) |
| Barn-event | `child_first_completion` (analytics) före parent aha |
| Tracking | `hours_since_completion` = tid barn → förälder |
| Analys-fokus | Day 14 grouped by aha-sett > completion |
| Forskning | Retention Wall 2×2; intervjua Complete+Churned |
| Hjärta | Celebratory card vid första osedda logg-item |
| Dag-logik | Runtime via Luxon |
| Modulärhet | Parent Program Engine — content utbytbart per `program_type` |

---

## 19. Parent Program Engine (plattform, inte feature)

`program_type` avslöjar framtida produktarkitektur — datamodellen behöver inte målas om:

```
Parent Program Engine
├── onboarding_7d      ← v1.0 (vanebildning)
├── reactivation_3d    ← v1.2 (nystart, nytt aha)
├── summer_break_5d    ← framtida (sommaromställning)
├── school_restart_7d  ← framtida (skolstartsångest)
└── custom_admin_program ← framtida (admin-initierade kampanjer)
```

Samma motor per program:
- `getEffectiveProgramDay()` + luxon
- Banner + celebratory card
- `cohort_arm` / experiment-ramverk
- `day_status`, analytics, scheduler
- Content per typ i `activation-program-content.js`

**Bygg inte allt nu.** Bygg motorn + första programmet. Nya livscykel-moment = ny content-fil + ny `program_type`, inte ny infrastruktur.

### Modulär blueprint (implementation)

Bygg modulärt så innehåll kan bytas utan att röra infrastruktur:

```
src/lib/activation-program.js          ← dag-logik, rollover, status
src/lib/activation-program-enroll.js   ← A/B, cohort_arm
src/lib/activation-program-content.js  ← per program_type (onboarding_7d | reactivation_3d)
src/lib/activation-program-scheduler.js← push (Fas 5)
```

Framtida program återanvänder samma motor — ny content-fil + `program_type`, samma experiment-ramverk.

---

## 20. Filer

| Fil | Fas |
|-----|-----|
| `migrations/*_parent_activation_program.js` | 1 |
| `src/lib/activation-program.js` | 1 |
| `src/lib/activation-program-enroll.js` | 1 |
| `src/lib/activation-program-content.js` | 3 |
| `db/parent-activation-program.js` | 1 |
| `db/parent-seen-completion.js` | 2 |
| `src/routes/activation-program.js` | 2–3 |
| `public/js/activation-program-banner.js` | 3 |
| `public/js/activation-program-aha-card.js` | 2 |
| `src/routes/onboarding.js` | 4 |
| `src/lib/activation-program-scheduler.js` | 5 |
| `src/routes/admin/activation-program.js` | 6 |

---

## 21. Öppna frågor (implementation, ej arkitektur)

1. **Inline barnvy-preview på dag 1** — eller endast länk till `/child-login`?
2. **Celebratory card: modal vs inline card** — A/B-testa i Fas 2?
3. **När aktivera 50/50 A/B** — efter 2 veckor med 100% treatment baseline?
4. **Launch-datum cutoff** — exakt env var (`ACTIVATION_PROGRAM_LAUNCH_AT`?) för att exkludera pre-launch familjer från kohort

**Besvarade (v3.3 — ej öppna):**
- ~~Retroaktiv enroll för churn-risk~~ → **Nej i v1.0**; `reactivation_3d` i v1.2
- ~~Befintliga familjer i samma program~~ → **Nej**; tre grupper, separata program

---

## 22. Revisionslogg

| Version | Datum | Ändring |
|---------|-------|---------|
| v1 | 2026-05-30 | Initial spec |
| v2 | 2026-05-30 | Värdepress; solo dag 6; aha-event; build order; day 14 |
| v3 | 2026-05-30 | Vanebildning; `last_seen_day`; dag 1 barnvy; celebratory card; A/B |
| v3.1 | 2026-05-30 | Luxon `getEffectiveProgramDay()` + DST-tester |
| v3.2 | 2026-05-30 | Experimentdesign; `control_holdout`; analytics enrichment |
| v3.3 | 2026-05-30 | Tre grupper; `program_type`; enrollment endast nya |
| v3.4 | 2026-05-30 | Tre grupper; Program Engine; Retention Wall; kausal kedja |
| v3.5 | 2026-05-30 | Rena axlar (ej control_holdout); `child_first_completion`; Retention Wall 2×2; Day14 by aha |

---

*Implementation-ready v3.5. Fas 1 kan starta.*
