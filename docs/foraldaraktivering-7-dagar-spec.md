# Föräldaraktivering — 7-dagarsprogram

**Skapad:** 2026-05-30  
**Senast reviderad:** 2026-05-30 (v3 — vanebildning, datamodell, A/B, aha-UX)  
**Status:** Produktdesign (spec klar för implementation)  
**Feature slug:** `foraldaraktivering_7d`  
**Relaterat:** onboarding, push-reminder-scheduler, win-back, retention-dashboard

---

## 0. Vad det här är (och inte är)

Det här är **inte** ett retention-flöde i win-back-stil ("kom tillbaka efter 18 dagar").

Det är ett **vanebildningssystem med mätbar hypotes:**

> Föräldrar som lyckas bygger en vana under vecka 1.  
> Föräldrar som churnar gör det **innan** vanan uppstår.

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

---

## 2. Mål och KPI-hierarki

### North Star (enda KPI som avgör framgång)
**Day 14 cohort retention** — andel familjer fortfarande aktiva 14 dagar efter registrering.

Jämförs via **treatment vs control** (se §13) — inte bara absolut förbättring. Utan kontrollgrupp riskerar teamet optimera dag 2-login och dag 7-completion utan att retention faktiskt förbättras.

### Leading indicators (diagnostiska, inte mål i sig)
- Parent login dag 2–7
- **`parent_aha_moment`** — internt produktkoncept; DB-event: `parent_first_completion_seen`
- Dag 7 värde-score ("Har appen gjort vardagen enklare?")
- Program completion rate

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
- Målgrupp: primär förälder med aktivt program (treatment-arm)
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
                     CHECK (status IN ('active', 'completed', 'opted_out', 'expired')),
  cohort_arm       TEXT NOT NULL DEFAULT 'treatment'
                     CHECK (cohort_arm IN ('treatment', 'control')),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_day    SMALLINT NOT NULL DEFAULT 1 CHECK (last_seen_day BETWEEN 1 AND 7),
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
```

**Ingen `current_day`-kolumn.** Tidigare v2 hade två sanningar (`effective_day` + `current_day`) — risk för desync i scheduler/admin. v3 eliminerar det.

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

## 8. Aha-signal: `parent_first_completion_seen`

**Internt koncept:** `parent_aha_moment`  
**DB/analytics:** `parent_first_completion_seen`

### Trigger

Vid dashboard-load (`GET /api/me/daily-log` eller `/new-completions`):

1. Hämta nya `daily_log_item` med `completed = true`
2. Exkludera redan sedda ( `parent_seen_completion`)
3. För varje ny:
   - Emit analytics
   - Visa **celebratory card** (§5.3)
   - Insert `parent_seen_completion`

### Metadata

`{ child_id, daily_log_item_id, activity_name, effective_day }`

---

## 9. API

| Method | Path | Beskrivning |
|--------|------|-------------|
| `GET` | `/api/me/activation-program` | Program, effective day, content; uppdaterar `last_seen_day` |
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

Control-arm (`cohort_arm: "control"`): `active: false`, ingen banner — men rad finns för cohort-analys.

### Enrollment (Fas 4)

Vid `POST /api/onboarding/complete`:
1. A/B-assign `cohort_arm` (§13)
2. Om `treatment` → skapa program, track `activation_program_started`
3. Om `control` → skapa rad med `status = 'active'`, `cohort_arm = 'control'`, **ingen banner** (passiv holdout)

---

## 10. Scheduler / push (Fas 5)

Sekundär kanal. Använder endast `getEffectiveProgramDay()` — aldrig `last_seen_day`.

Risk: medel (spam, timing). Byggs efter banner + aha bevisats.

---

## 11. Analytics

| event_type | metadata |
|------------|----------|
| `activation_program_started` | `{ cohort_arm }` |
| `activation_program_day_done` | `{ day, auto, trigger? }` |
| `activation_program_day_skipped` | `{ day }` |
| `activation_program_day_solo` | `{ day }` |
| `activation_program_opted_out` | `{ day }` |
| `activation_program_completed` | `{ reflection_score }` |
| `child_view_opened` | `{ child_id, source: 'day1_cta' }` |
| **`parent_first_completion_seen`** | `{ child_id, activity_name, effective_day }` |
| `parent_aha_moment_dismissed` | `{ daily_log_item_id }` |

### Day 14 cohort (North Star)

```
Kohort: familjer registrerade vecka W
Treatment: cohort_arm = 'treatment' (oavsett complete/opt-out)
Control:   cohort_arm = 'control'
Metric:    aktiv dag 14 ±1 (login_event OR daily_log_item.completed)
```

---

## 12. Admin

- Funnel dag 1–7 (treatment only)
- **Day 14: treatment vs control** (North Star)
- Aha-rate per kohort
- Dag 7 score-distribution
- Export reflektioner + aha-events

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

**Control-familjer:** rad i DB med `cohort_arm = 'control'`, ingen banner, ingen push — lever normalt. Möjliggör Day 14-jämförelse utan retroaktiv kontrollgrupp.

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
- [ ] Migration (utan `current_day`; med `last_seen_day`, `cohort_arm`)
- [ ] `getEffectiveProgramDay()` + tester (DST)
- [ ] `assignCohortArm()`

**Fas 2 (~5h)**
- [ ] `parent_seen_completion` + `parent_first_completion_seen`
- [ ] Celebratory card UI (`activation-program-aha-card.js`)
- [ ] `child_view_opened` event (dag 1)

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
2. `last_seen_day` används enbart för UI-animation
3. `cohort_arm` sätts deterministiskt vid enroll; control ser ingen banner
4. Celebratory card visas vid första unseen completion
5. Dag 1 CTA → barnvy; mät `child_view_opened`
6. Dag 2: login anytime; dag 6: solo; dag 7: värde-fråga
7. Miss → program fortsätter, ingen negativ copy
8. `ACTIVATION_PROGRAM_TREATMENT_PCT` fungerar (100 och 50 testade)

---

## 16. Success metrics

| Metric | Typ | Mål |
|--------|-----|-----|
| **Day 14 retention (treatment vs control)** | North Star | Signifikant högre treatment |
| `parent_first_completion_seen` rate | Leading | >30% enrolled |
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

## 18. Filer

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

## 19. Öppna frågor

1. **Inline barnvy-preview på dag 1** — eller endast länk till `/child-login`?
2. **Retroaktiv enroll för churn-risk** — admin-trigger v1.1
3. **Celebratory card: modal vs inline card** — A/B-testa i Fas 2?
4. **När aktivera 50/50 A/B** — efter 2 veckor med 100% treatment baseline?

---

## 20. Revisionslogg

| Version | Datum | Ändring |
|---------|-------|---------|
| v1 | 2026-05-30 | Initial spec |
| v2 | 2026-05-30 | Värdepress; solo dag 6; aha-event; build order; day 14 |
| v3 | 2026-05-30 | Vanebildning-framing; `last_seen_day` (ej `current_day`); dag 1 barnvy; celebratory card; A/B `cohort_arm`; `parent_aha_moment` koncept; PO risktabell |

---

*Produktdesign klar för implementation. Hypotes: föräldrar som lyckas bygger vana vecka 1; churn sker innan vanan uppstår.*
