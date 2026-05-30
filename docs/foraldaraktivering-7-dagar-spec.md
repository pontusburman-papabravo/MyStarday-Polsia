# Föräldaraktivering — 7-dagarsprogram

**Skapad:** 2026-05-30  
**Senast reviderad:** 2026-05-30 (v2 — produktjusteringar)  
**Status:** Utkast (spec)  
**Feature slug (föreslagen):** `foraldaraktivering_7d`  
**Relaterat:** onboarding, push-reminder-scheduler, win-back, retention-dashboard

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

Nuvarande onboarding sätter upp barnets schema på ~6 steg och markerar `onboarding_completed`. Därefter finns inget strukturerat stöd för att få **föräldern** att återkomma dag 2–7. Win-back triggas först efter 18 dagars inaktivitet — för sent för att etablera vecka-1-vanor.

### Designprincip: stödjande, inte dömande

Programmet **fortsätter vid miss** — en missad dag markeras internt men påverkar aldrig copy, progress eller tillgång till nästa dag. I en vardag med NPF-utmaningar är flexibilitet inte en feature, det är en **förutsättning**.

---

## 2. Mål

### Primärt mål
Öka andelen nya familjer som **loggar in minst en gång per dag dag 2–7** efter slutförd onboarding.

### North Star (långsiktig)
**Day 14 cohort retention** — andel familjer som fortfarande är aktiva 14 dagar efter registrering, jämfört med kontrollgruppen (familjer som churnar efter 72h utan program).

### Sekundära mål
- Minska andelen "Aldrig" i retention-vyn
- Fånga **aha-ögonblicket** (`parent_first_completion_seen`) — när föräldern ser att barnet klarat något utan att de behövt tjata
- Samla **värde-feedback** dag 7: landar value proposition?

### Icke-mål (v1)
- Trappa upp barnets schema gradvis (aktivitetsantal per dag)
- Ersätta befintlig onboarding-wizard
- Automatiskt skicka mejl utan godkännande (win-back-flödet behålls separat)
- Co-parent-specifik separat progression (samma program per familj, en aktiv förälder räcker)

---

## 3. Produktidé

Ett **7-dagars föräldrarprogram** som startar automatiskt när onboarding slutförs (`POST /api/onboarding/complete`).

Programmet coachar föräldern med:
1. **Dashboard-banner** *(primär kanal)* — dagens uppdrag; förvandlar dashboarden från "tomt skal" till "coach"
2. **Push-notis** *(sekundär kanal, Fas 2)* — max 1/dag, morgon (default 08:00 Stockholm)
3. **Dag 7-reflektion** — värdefråga + valfri fritext

> **Prioritet:** Bannern är viktigare än push. Den fungerar som trygg handhållning i en miljö som annars kan kännas tom innan man kommit igång.

Barnets schema förblir oförändrat (redan satt i onboarding). Fokus är **förälderns beteende**: öppna appen, kolla läget, fira tillsammans, justera vid behov.

---

## 4. Sju dagars innehåll

| Dag | Rubrik (banner) | Push (Fas 2) | Uppdrag | Mätning |
|-----|-----------------|--------------|---------|---------|
| **1** | Välkommen till vecka 1! | *(ingen push — onboarding nyss klar)* | Visa barnet PIN-inloggningen en gång idag | `parent_login` + ev. `child_login` |
| **2** | Dag 2 — morgonkollen | "God morgon! Kolla [barn]s schema — tar 30 sek 🌅" | Öppna dashboarden någon gång under dygnet | `parent_login` under dygn 2 *(ingen tidsgräns)* |
| **3** | Dag 3 — fira en stjärna | "Har [barn] fått en stjärna idag? Fira tillsammans ⭐" | Markera/fira minst en avklarad aktivitet | `daily_log_item.completed` eller `parent_first_completion_seen` |
| **4** | Dag 4 — er app | "Något som känns fel? Byt ut en aktivitet — tar 1 min ✏️" | Justera en aktivitet om det behövs | `schedule_edit` eller `parent_login` |
| **5** | Dag 5 — belöning | "Kolla Skattkammaren — vad drömmer [barn] om? 🎁" | Öppna belöningsvy / prata om mål | `parent_login` + `/skattkammaren` view |
| **6** | Dag 6 — dela ansvaret | "Vill du dela ansvaret med någon? 👥" | Bjud in medförälder **eller** "Jag kör solo!" | `family_invite_created` **eller** solo-dismiss → `done` |
| **7** | En vecka! 🎉 | "Grattis till en vecka! Hur har det gått?" | Värde-reflektion (se §5.2) | `activation_program_completed` |

**Ton:** Varm, kort, icke-dömande. Aldrig "du har missat X dagar".

**Social proof (valfritt i copy):**  
*"Många föräldrar berättar att barnet klarat tandborstningen första veckan — utan påminnelser."*

### Dag 2 — från tidspress till närvaro

Push skickas kl 08:00 som **påminnelse**, inte deadline. Mätningen är enbart: *loggade föräldern in någon gång under dygn 2?* Ingen bestraffning eller sämre status om de öppnar appen kl 21.

### Dag 6 — inkluderande "Dela ansvaret"

Rubriken **"Dela ansvaret"** (inte "Bjud in partner") — fungerar för alla konstellationer.

| Action | Beteende |
|--------|----------|
| **Primär CTA** | "Bjud in någon" → `/family` invite-flöde |
| **Sekundär CTA** | **"Jag kör solo!"** → flaggar dag 6 som `done` omedelbart |

"Solo" är en **positiv handling** (självständighet), inte ett misslyckande. Ensamstående föräldrar ska aldrig känna att de "misslyckats" med dagen.

### Dag 7 — från "hur känts det?" till värdepress

**Huvudfråga:** *"Har appen gjort vardagen enklare?"*

| Svar | Skala | Tolkning |
|------|-------|----------|
| Ja, tydligt | 5 | Value proposition landar — ambassadör-potential |
| Delvis | 3–4 | Produkt funkar, copy/onboarding kan förbättras |
| Inte ännu | 1–2 | **Viktig signal:** om de ändå genomfört programmet → teknisk/pedagogisk tröskel, inte brist på vilja |

Valfri fritext (max 500 tecken) för djupare insikt.

---

## 5. Användarupplevelse

### 5.1 Dashboard-banner

- Placering: överst på `/dashboard`, under ev. systemmeddelanden
- Visas endast för **primär förälder** (`parent.role = 'primary'`) med aktivt program
- Innehåll:
  - Progress: `Dag 3 av 7` (prickar eller tunn progress-bar)
  - Dagens rubrik + 1 rad brödtext
  - Primär knapp: context-dependent (t.ex. "Gå till schema", "Bjud in någon", "Skicka svar")
  - Sekundär: "Hoppa över idag" (dismiss till midnatt → dag markeras `skipped`)
  - Dag 6 extra: **"Jag kör solo!"** → dag `done` direkt
- Dismiss hela programmet: "Jag klarar mig själv" → `status = opted_out`
- **Grattis-animation:** triggas när `current_day` (DB) advances efter interaktion — se §7.2

### 5.2 Dag 7 — värde-reflektion

Modal eller inline expand:
- Skala 1–5 med etiketter: *"Inte ännu"* ← → *"Ja, tydligt!"*
- Frågetext: **"Har appen gjort vardagen enklare?"**
- Valfri fritext (max 500 tecken)
- Knapp: "Skicka" → avslutar programmet (`status = completed`)
- Tack-meddelande + ev. CTA "Dela appen" / "Lämna recension"

### 5.3 Onboarding — val (v1.1, ej MVP)

Efter steg 6, valfritt:
- **Rekommenderat:** "7-dagars mjuk start" (default på)
- **Alternativ:** "Hoppa över — jag vill köra direkt"

MVP: alla nya som slutför onboarding auto-enrollas (Fas 4 i build order).

---

## 6. Affärsregler

| Regel | Värde |
|-------|-------|
| Programlängd | 7 kalenderdagar från `started_at` (familjens timezone) |
| Daggräns | Midnakt i `family.timezone` (fallback `Europe/Stockholm`) |
| Effektiv dag | Beräknas runtime via `getEffectiveProgramDay()` — se §7.2 |
| En programkörning per familj | Ny körning först efter `completed`/`opted_out` + 90 dagar, eller manuellt av admin |
| Push max | 1 per dag, dag 2–7 (Fas 2) |
| Push-tid | Default 08:00 — påminnelse, **inte** deadline |
| Quiet hours | Respektera befintlig push quiet hours (21:00–07:00) — skjut till 08:00 |
| Kräver | `onboarding_completed = true`, minst 1 barn i familjen |
| Exkludera | Admin-konton, impersonation, arkiverade familjer |
| Medförälder | Ser banner om inloggad; push går till den som slutförde onboarding |
| Missad dag | Markeras `missed` internt — programmet fortsätter, copy ändras inte |

### Dag-avklarning (auto)

En dag räknas som **klar** om minst ett av följande inträffar före midnatt (familj timezone):
- Förälder loggar in (`login_event` role=parent)
- Dagens uppdrag markeras manuellt "Klar" i bannern
- Uppdragets specifika event (t.ex. `parent_first_completion_seen` dag 3)
- Dag 6: "Jag kör solo!" eller `family_invite_created`

Om inget inträffar: dag markeras `missed` — **programmet fortsätter ändå**.

---

## 7. Datamodell

### 7.1 Tabell: `parent_activation_program`

```sql
CREATE TABLE parent_activation_program (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id       UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'opted_out', 'expired')),
  current_day     SMALLINT NOT NULL DEFAULT 1 CHECK (current_day BETWEEN 1 AND 7),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  opted_out_at    TIMESTAMPTZ,
  day_status      JSONB NOT NULL DEFAULT '{}',  -- {"1":"done","2":"missed","3":"skipped",...}
  reflection_score SMALLINT CHECK (reflection_score BETWEEN 1 AND 5),
  reflection_text TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX parent_activation_program_active_family
  ON parent_activation_program (family_id)
  WHERE status = 'active';
```

`day_status` nycklar `"1"`–`"7"`, värden: `pending` | `done` | `missed` | `skipped`.

### 7.2 `current_day` — materialiserad vy + UI-sync

**Sanningen:** effektiv programdag beräknas alltid runtime:

```js
/**
 * @param {{ started_at: Date }} program
 * @param {string} timezone — family.timezone, fallback 'Europe/Stockholm'
 * @returns {number} 1–7 (cap at 7; >7 → program expired/completable)
 */
function getEffectiveProgramDay(program, timezone) {
  // Räkna kalenderdagar mellan started_at (lokal midnatt) och now (lokal midnatt)
  // Timezone-safe via Intl / temporal eller date-fns-tz
}
```

**`current_day` i DB** uppdateras **endast vid förälder-interaktion** (GET `/api/me/activation-program`, complete-day, skip, solo-dismiss, reflection). Syfte:
- Trigga "Grattis, dag X klar!"-animation i bannern
- Undvika att UI hoppar fram utan att föräldern sett det

**Midnight rollover:** lazy — vid nästa GET efter midnatt:
1. Beräkna `effectiveDay = getEffectiveProgramDay(...)`
2. Markera föregående dag `missed` om fortfarande `pending`
3. Synka `current_day` om `effectiveDay > current_day`

Ingen separat midnight-cron krävs för dag-övergång i MVP.

### 7.3 Tabell: `parent_seen_completion` (aha-signal)

Spårar vilka avklaringar föräldern redan sett — för `parent_first_completion_seen`:

```sql
CREATE TABLE parent_seen_completion (
  parent_id         UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  daily_log_item_id UUID NOT NULL REFERENCES daily_log_item(id) ON DELETE CASCADE,
  seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, daily_log_item_id)
);
```

Alternativ (enklare MVP): JSONB-array `seen_completion_ids` på `parent` — men separat tabell skalar bättre.

### Befintliga tabeller (read-only)

- `login_event` — parent login
- `daily_log_item` — barnets avklaringar
- `weekly_schedule` / schedule edits — dag 4
- `family_invite` — dag 6

---

## 8. Aha-signal: `parent_first_completion_seen`

**Mest prediktiva datapunkten** — appens existensberättigande i ett event.

### Trigger-logik

När föräldern öppnar dashboarden (`GET /api/me/daily-log` eller dedikerad check vid banner-load):

1. Hämta `daily_log_item` med `completed = true` för familjens barn idag (eller senaste 7 dagar vid första load)
2. Filtrera bort items redan i `parent_seen_completion`
3. Om ≥1 ny completion finns:
   - Emit `analytics_events`: `parent_first_completion_seen`
   - Metadata: `{ child_id, daily_log_item_id, activity_name, day_of_program }`
   - Insert i `parent_seen_completion`
   - Banner kan visa: *"[Barn] klarade [aktivitet] — utan att du behövde påminna! 🎉"*

### Varför det spelar roll

Det är ögonblicket då föräldern inser: **"Det fungerar. Jag behöver inte tjata."** Korrelerar troligen starkt med day 14 retention.

### Implementation (Fas 2 i build order)

Kan deployas **före bannern** — ger data om aha-frekvens redan under utveckling.

---

## 9. API

Alla endpoints kräver `requireParent` + CSRF där mutating.

| Method | Path | Beskrivning |
|--------|------|-------------|
| `GET` | `/api/me/activation-program` | Program + effective day + dagens content; synkar `current_day` |
| `POST` | `/api/me/activation-program/skip-day` | Markera dag som `skipped` |
| `POST` | `/api/me/activation-program/complete-day` | Manuellt markera dag `done` |
| `POST` | `/api/me/activation-program/solo-day` | Dag 6: "Jag kör solo!" → `done` |
| `POST` | `/api/me/activation-program/opt-out` | Avsluta programmet |
| `POST` | `/api/me/activation-program/reflection` | Dag 7: `{ score, text? }` → `completed` |
| `GET` | `/api/admin/activation-program/stats` | Funnel + day 14 cohort |
| `GET` | `/api/me/activation-program/new-completions` | Nya completions föräldern inte sett *(aha)* |

### `GET /api/me/activation-program` — response

```json
{
  "active": true,
  "effective_day": 3,
  "current_day": 3,
  "total_days": 7,
  "status": "active",
  "day_status": { "1": "done", "2": "done", "3": "pending" },
  "day_advanced": false,
  "content": {
    "title": "Dag 3 — fira en stjärna",
    "body": "Har ditt barn fått en stjärna idag? Ta en stund och fira tillsammans.",
    "cta_label": "Öppna dagens schema",
    "cta_url": "/dashboard",
    "secondary_cta_label": null
  },
  "new_completions": [
    { "child_name": "Estelle", "activity_name": "Tänderna", "completed_at": "..." }
  ]
}
```

`day_advanced: true` när `effective_day > previous current_day` — banner visar grattis-animation.

### Sidoeffekt vid onboarding complete (Fas 4)

I `POST /api/onboarding/complete`:
1. Sätt `onboarding_completed = true` (befintligt)
2. Skapa rad i `parent_activation_program` om ingen aktiv finns
3. Track `activation_program_started`

---

## 10. Scheduler / push (Fas 5)

### Jobb: `activation-program-scheduler.js`

- Körs: kl 08:00 Europe/Stockholm ( eller hooka in i `push-reminder-scheduler`)
- Lock: advisory lock-id `1008` i `scheduler-constants.js`
- Guard: `POLSIA_IN_PROCESS_CRONS_ENABLED=true`

**Per aktiv familj, dag 2–7:**
1. `effectiveDay = getEffectiveProgramDay(program, family.timezone)`
2. Om push inte skickats idag → skicka till `parent_id`
3. Push-typ: `activation_program` i `notification_log`

Push är **påminnelse**, inte krav. Ingen logik kopplad till "miss" om push ignoreras.

Respektera `parent.push_preferences.activation_program` (default `true`).

---

## 11. Analytics

| event_type | metadata | När |
|------------|----------|-----|
| `activation_program_started` | `{ family_id }` | onboarding complete |
| `activation_program_day_done` | `{ day, auto: bool, trigger? }` | dag avklarad |
| `activation_program_day_skipped` | `{ day }` | skip |
| `activation_program_day_solo` | `{ day }` | dag 6 solo |
| `activation_program_opted_out` | `{ day }` | opt-out |
| `activation_program_completed` | `{ reflection_score, reflection_text? }` | dag 7 |
| `activation_program_push_sent` | `{ day }` | scheduler |
| `activation_program_push_clicked` | `{ day }` | push open |
| **`parent_first_completion_seen`** | `{ child_id, activity_name, day_of_program }` | aha-ögonblick |

### Day 14 cohort retention (admin)

```sql
-- Pseudologi för admin stats
-- Kohort: familjer med started_at i vecka W
-- Treatment: parent_activation_program.status = 'completed'
-- Control: onboarding_completed men inget program / opted_out dag 1
-- Metric: ANDEL med login_event ELLER daily_log_item.completed dag 14 ±1
```

Visas i admin under Retention eller ny flik "Aktiveringsprogram":
- Funnel: start → dag 2 login → dag 7 complete → **dag 14 active**
- Jämförelse treatment vs control
- `parent_first_completion_seen` rate per kohort

---

## 12. Admin

### Aktiveringsprogram-vy

- Funnel per dag (1–7)
- Day 14 retention: program complete vs control
- Dag 7 värde-fördelning (1–5 histogram)
- Export: reflektioner + aha-events (CSV)

### Retention-koppling

Kolumn **"Aktiveringsprogram"** i befintlig retention-tabell: dag X/7, complete, opted_out, —.

---

## 13. Feature flag

```js
// scripts/seed-features.js
{
  slug: 'foraldaraktivering_7d',
  name: 'Föräldaraktivering 7 dagar',
  description: 'Coachar nya föräldrar dag för dag i vecka 1 efter onboarding',
  status: 'dev',
  tags: ['retention', 'onboarding'],
  priority: 'high',
  complexity: 5,
  estimated_hours: 20,
}
```

Miljövariabel: `ACTIVATION_PROGRAM_ENABLED=true` (default false tills launch).

---

## 14. Build order (reviderad)

| Fas | Innehåll | Varför denna ordning |
|-----|----------|----------------------|
| **1** | Migration + `getEffectiveProgramDay()` helper | Fundament, timezone-safe |
| **2** | `parent_first_completion_seen` tracking | Data innan banner är live; validerar aha-hypotesen |
| **3** | Dashboard-banner (MVP UI) | Primär kanal; solo-knapp dag 6; dag 7 värde-fråga |
| **4** | Auto-enrollment vid onboarding complete | Kopplar ihop flödet |
| **5** | Push-scheduler | Sekundär kanal; banner bevisad först |
| **6** | Admin funnel + day 14 cohort | Mätning efter launch |

### Fas 1 — Migration & helper (~3h)
- [ ] Migration `parent_activation_program` + `parent_seen_completion`
- [ ] `src/lib/activation-program.js` — `getEffectiveProgramDay()`, day rollover, mark missed
- [ ] `db/parent-activation-program.js` — CRUD

### Fas 2 — Tracking-motorn (~4h)
- [ ] `GET /api/me/activation-program/new-completions`
- [ ] Hook i dashboard daily-log load → `parent_first_completion_seen`
- [ ] Analytics event + `parent_seen_completion` inserts

### Fas 3 — Dashboard-banner (~5h)
- [ ] `public/js/activation-program-banner.js`
- [ ] `GET /api/me/activation-program` + skip/complete/solo/opt-out/reflection
- [ ] Grattis-animation vid `day_advanced`
- [ ] Dag 6 "Jag kör solo!" + dag 7 värde-fråga
- [ ] SW cache bump

### Fas 4 — Auto-enrollment (~2h)
- [ ] Hook i `POST /api/onboarding/complete`
- [ ] Feature seed + `ACTIVATION_PROGRAM_ENABLED` guard

### Fas 5 — Push (~4h)
- [ ] `activation-program-scheduler.js`
- [ ] Push-pref i settings
- [ ] UTM på länkar

### Fas 6 — Admin (~4h)
- [ ] `/api/admin/activation-program/stats` — funnel + day 14 cohort
- [ ] Admin UI (minimal)

---

## 15. Acceptanskriterier (MVP = Fas 1–4)

1. `getEffectiveProgramDay()` returnerar korrekt dag över midnatt och sommartid.
2. `parent_first_completion_seen` fires exakt en gång per ny completion per förälder.
3. Dashboard-banner visar dag 1–7 med korrekt copy och progress.
4. Dag 2: login någon gång under dygnet räcker — ingen tidsgräns i kod eller copy.
5. Dag 6: "Jag kör solo!" markerar dagen `done` utan negativ copy.
6. Dag 7: frågan "Har appen gjort vardagen enklare?" sparas med score 1–5.
7. Missad dag → programmet fortsätter; ingen "miss"-text i UI.
8. Opt-out avslutar programmet permanent för körningen.
9. Auto-enroll vid onboarding complete (med feature flag).
10. Barnvy/pedagog-vy påverkas inte.

---

## 16. Success metrics

| Metric | Baseline | Mål (4 veckor) |
|--------|----------|----------------|
| Parent login dag 2 | TBD | +20% relativt |
| Parent login dag 7 | TBD | +15% relativt |
| **`parent_first_completion_seen` rate** | — | >30% av enrolled dag 1–7 |
| Dag 7 program completion | — | >40% av enrolled |
| **Day 14 retention (treatment vs control)** | TBD | Signifikant högre än control |
| Dag 7 score ≥4 ("vardagen enklare") | — | >50% av responders |
| Opt-out rate | — | <25% |

---

## 17. Risker och mitigering

| Risk | Mitigering |
|------|------------|
| Push-upplevs som spam | Fas 5 efter banner; max 1/dag; opt-out |
| Förälder känner sig tillrättavisad | Ingen miss-copy; program fortsätter; "Hoppa över idag" |
| Dag 6 exkluderar ensamstående | "Jag kör solo!" som positiv exit |
| Tidspress dag 2 | Borttagen — endast närvaro mäts |
| Timezone-buggar | `getEffectiveProgramDay()` + tester för DST |
| Banner känns som tom dashboard | Coach-copy + aha-celebration vid new completion |

---

## 18. Filer att skapa/ändra

| Fil | Fas | Ändring |
|-----|-----|---------|
| `migrations/*_parent_activation_program.js` | 1 | Tabeller |
| `src/lib/activation-program.js` | 1 | `getEffectiveProgramDay()`, rollover |
| `src/lib/activation-program-content.js` | 3 | Dag 1–7 copy |
| `db/parent-activation-program.js` | 1 | CRUD |
| `db/parent-seen-completion.js` | 2 | Seen-tracking |
| `src/routes/activation-program.js` | 2–3 | API |
| `src/routes/onboarding.js` | 4 | Auto-enroll |
| `public/js/activation-program-banner.js` | 3 | Dashboard UI |
| `public/dashboard.html` | 3 | Script + mount |
| `src/lib/activation-program-scheduler.js` | 5 | Push |
| `src/routes/admin/activation-program.js` | 6 | Admin stats |
| `scripts/seed-features.js` | 4 | Feature slug |
| `public/sw.js` | 3 | Cache bump |

---

## 19. Öppna frågor

1. **Medförälder enroll** → Den som anropar `/complete`.
2. **Retroaktiv enroll för churn-risk** → Nej v1; admin-trigger i v1.1.
3. **Dag 4 auto-complete på schedule edit** → Ja, om schedule API anropas samma effective day.
4. **Win-back-koppling** → Separata flows; win-back = 18+ dagar, detta = vecka 1.
5. **A/B av dag 7-frågan** → Ev. testa "enklare vardag" vs "mindre påminnelser" i Fas 6.

---

## 20. Revisionslogg

| Datum | Ändring |
|-------|---------|
| 2026-05-30 | v1 — initial spec |
| 2026-05-30 | v2 — värdepress dag 2/7; solo-knapp dag 6; `parent_first_completion_seen`; `getEffectiveProgramDay()`; day 14 North Star; reviderad build order; banner > push |

---

*Spec utarbetad utifrån retention-data, användarcitat, NPF-perspektiv och befintlig stack (Express, push-scheduler, onboarding, analytics_events).*
