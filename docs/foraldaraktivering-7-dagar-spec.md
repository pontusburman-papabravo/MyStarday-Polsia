# Föräldaraktivering — 7-dagarsprogram

**Skapad:** 2026-05-30  
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

---

## 2. Mål

### Primärt mål
Öka andelen nya familjer som **loggar in minst en gång per dag dag 2–7** efter slutförd onboarding.

### Sekundära mål
- Minska andelen "Aldrig" i retention-vyn
- Öka andel barn med minst 1 avklarad aktivitet dag 1–3
- Samla tidig feedback (dag 7) från engagerade familjer

### Icke-mål (v1)
- Trappa upp barnets schema gradvis (aktivitetsantal per dag)
- Ersätta befintlig onboarding-wizard
- Automatiskt skicka mejl utan godkännande (win-back-flödet behålls separat)
- Co-parent-specifik separat progression (samma program per familj, en aktiv förälder räcker)

---

## 3. Produktidé

Ett **7-dagars föräldrarprogram** som startar automatiskt när onboarding slutförs (`POST /api/onboarding/complete`).

Programmet coachar föräldern med:
1. **Dashboard-banner** — dagens uppdrag (1 mening + valfri CTA)
2. **Push-notis** — max 1/dag, morgon (konfigurerbar tid, default 08:00 Stockholm)
3. **Dag 7-reflektion** — enkel fråga + valfri fritext (lagras för admin/feedback)

Barnets schema förblir oförändrat (redan satt i onboarding). Fokus är **förälderns beteende**: öppna appen, kolla läget, fira tillsammans, justera vid behov.

---

## 4. Sju dagars innehåll

| Dag | Rubrik (banner) | Push (förälder) | Uppdrag | Mätning |
|-----|-----------------|-----------------|---------|---------|
| **1** | Välkommen till vecka 1! | *(ingen push dag 1 — onboarding nyss klar)* | Visa barnet PIN-inloggningen en gång idag | `parent_login` + ev. `child_login` |
| **2** | Dag 2 — morgonkollen | "God morgon! Kolla [barn]s schema — tar 30 sek 🌅" | Öppna dashboarden vid frukost | `parent_login` före 10:00 |
| **3** | Dag 3 — fira en stjärna | "Har [barn] fått en stjärna idag? Fira tillsammans ⭐" | Markera/fira minst en avklarad aktivitet | `daily_log_item.completed` |
| **4** | Dag 4 — er app | "Något som känns fel? Byt ut en aktivitet — tar 1 min ✏️" | Justera en aktivitet om det behövs | `schedule_edit` eller `parent_login` |
| **5** | Dag 5 — belöning | "Kolla Skattkammaren — vad drömmer [barn] om? 🎁" | Öppna belöningsvy / prata om mål | `parent_login` + `/skattkammaren` view |
| **6** | Dag 6 — dela ansvar | "Bjud in partnern — två vuxna = enklare vardag 👥" | Bjud in medförälder *(CTA, ej krav)* | `family_invite_created` eller dismiss |
| **7** | En vecka! 🎉 | "Grattis till en vecka! Hur har det gått?" | Svara på kort reflektion (1–5 + valfri text) | `activation_day7_reflection` |

**Ton:** Varm, kort, icke-dömande. Aldrig "du har missat X dagar".

**Social proof (valfritt i copy):**  
*"Många föräldrar berättar att barnet klarat tandborstningen första veckan — utan påminnelser."*

---

## 5. Användarupplevelse

### 5.1 Dashboard-banner

- Placering: överst på `/dashboard`, under ev. systemmeddelanden
- Visas endast för **primär förälder** (`parent.role = 'primary'`) med aktivt program
- Innehåll:
  - Progress: `Dag 3 av 7` (prickar eller tunn progress-bar)
  - Dagens rubrik + 1 rad brödtext
  - Primär knapp: context-dependent (t.ex. "Gå till schema", "Bjud in medförälder", "Skicka svar")
  - Sekundär: "Hoppa över idag" (dismiss till midnatt, räknas inte som miss men dagen markeras `skipped`)
- Dismiss hela programmet: "Jag klarar mig själv" → `status = opted_out`

### 5.2 Dag 7 — reflektion

Modal eller inline expand:
- Skala 1–5: *"Hur har första veckan känts?"*
- Valfri fritext (max 500 tecken)
- Knapp: "Skicka" → avslutar programmet (`status = completed`)
- Tack-meddelande + ev. CTA "Dela appen" / "Lämna recension"

### 5.3 Onboarding — val (v1.1, ej MVP)

Efter steg 6, valfritt:
- **Rekommenderat:** "7-dagars mjuk start" (default på)
- **Alternativ:** "Hoppa över — jag vill köra direkt"

MVP: alla nya som slutför onboarding auto-enrollas.

---

## 6. Affärsregler

| Regel | Värde |
|-------|-------|
| Programlängd | 7 kalenderdagar från `started_at` (familjens timezone) |
| Daggräns | Midnatt i `family.timezone` (fallback `Europe/Stockholm`) |
| En programkörning per familj | Ny körning först efter `completed`/`opted_out` + 90 dagar, eller manuellt av admin |
| Push max | 1 per dag, dag 2–7 |
| Quiet hours | Respektera befintlig push quiet hours (21:00–07:00) — skjut till 08:00 |
| Kräver | `onboarding_completed = true`, minst 1 barn i familjen |
| Exkludera | Admin-konton, impersonation, arkiverade familjer |
| Medförälder | Ser banner om de är inloggade, men push går till den som slutförde onboarding (primär) |

### Dag-avklarning (auto)

En dag räknas som **klar** om minst ett av följande inträffar före midnatt (familj timezone):
- Förälder loggar in (`login_event` role=parent)
- Dagens uppdrag markeras manuellt "Klar" i bannern
- Uppdragets specifika event (t.ex. `daily_log_item.completed` dag 3)

Om inget inträffar: dag markeras `missed` — programmet fortsätter ändå (ingen bestraffning).

---

## 7. Datamodell

### Ny tabell: `parent_activation_program`

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

### Befintliga tabeller (read-only)

- `login_event` — parent login för dag 2+
- `daily_log_item` — completion dag 3
- `weekly_schedule` / schedule edits — dag 4
- `family_invite` — dag 6

---

## 8. API

Alla endpoints kräver `requireParent` + CSRF där mutating.

| Method | Path | Beskrivning |
|--------|------|-------------|
| `GET` | `/api/me/activation-program` | Aktuellt program + dagens innehåll för inloggad förälder |
| `POST` | `/api/me/activation-program/skip-day` | Markera dag som skipped |
| `POST` | `/api/me/activation-program/complete-day` | Manuellt markera dag klar |
| `POST` | `/api/me/activation-program/opt-out` | Avsluta programmet |
| `POST` | `/api/me/activation-program/reflection` | Dag 7: `{ score, text? }` → complete |
| `GET` | `/api/admin/activation-program/stats` | Aggregerad funnel (admin) |

### `GET /api/me/activation-program` — response

```json
{
  "active": true,
  "current_day": 3,
  "total_days": 7,
  "status": "active",
  "day_status": { "1": "done", "2": "done", "3": "pending" },
  "content": {
    "title": "Dag 3 — fira en stjärna",
    "body": "Har ditt barn fått en stjärna idag? Ta en stund och fira tillsammans.",
    "cta_label": "Öppna dagens schema",
    "cta_url": "/dashboard"
  }
}
```

### Sidoeffekt vid onboarding complete

I `POST /api/onboarding/complete`:
1. Sätt `onboarding_completed = true` (befintligt)
2. Skapa rad i `parent_activation_program` om ingen aktiv finns
3. Track `activation_program_started`

---

## 9. Scheduler / push

### Ny jobb: `activation-program-scheduler.js`

- Körs: varje timme (eller hooka in i befintlig `push-reminder-scheduler` kl 08:00)
- Lock: ny advisory lock-id i `scheduler-constants.js` (t.ex. `1008`)
- Guard: `POLSIA_IN_PROCESS_CRONS_ENABLED=true`

**Per aktiv familj, per dag 2–7:**
1. Beräkna `effective_day` utifrån `started_at` + familj timezone
2. Om `effective_day > current_day` → advance day (midnight rollover via separat midnight hook eller lazy vid GET)
3. Om push inte skickats idag för denna typ → skicka till `parent_id`
4. Push-typ: `activation_program` (ny typ i `notification_log`)

**Push-payload exempel:**
```json
{
  "title": "Dag 2 — morgonkollen ☀️",
  "body": "Kolla Estelles schema — tar 30 sekunder.",
  "url": "/dashboard?utm_source=activation&utm_medium=push&utm_campaign=day2"
}
```

Respektera `parent.push_preferences` — ny nyckel `activation_program` (default `true`).

---

## 10. Analytics

Nya events i `analytics_events`:

| event_type | metadata | När |
|------------|----------|-----|
| `activation_program_started` | `{ family_id }` | onboarding complete |
| `activation_program_day_done` | `{ day, auto: bool }` | dag avklarad |
| `activation_program_day_skipped` | `{ day }` | skip |
| `activation_program_opted_out` | `{ day }` | opt-out |
| `activation_program_completed` | `{ reflection_score? }` | dag 7 klar |
| `activation_program_push_sent` | `{ day }` | scheduler |
| `activation_program_push_clicked` | `{ day }` | push open |

### Retention-koppling

Admin retention kan kompletteras med kolumn **"Aktiveringsprogram"** (dag X/7 eller —).

---

## 11. Admin

### Analytics / Retention

- Ny sektion eller filter: familjer per programdag
- Funnel: start → dag 2 login → dag 7 complete
- Exportera dag-7-reflektioner (CSV, anonymiserbar)

### Email-mallar (senare)

Separat mall `activation-program` i `email_templates` — **ej MVP**. Push räcker i v1.

---

## 12. Feature flag

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
  estimated_hours: 16,
}
```

Gate via `family_features` under utveckling; global rollout när metrics ser bra ut.

Miljövariabel (valfri): `ACTIVATION_PROGRAM_ENABLED=true` (default false tills launch).

---

## 13. Implementation — faser

### Fas 1 — MVP (uppskattning ~12–16h)

- [ ] Migration `parent_activation_program`
- [ ] Auto-enroll i `onboarding/complete`
- [ ] `GET /api/me/activation-program` + opt-out/skip/complete/reflection
- [ ] Ny fil `public/js/activation-program-banner.js` + script-tag i `dashboard.html`
- [ ] Midnight/day-advance logik (lazy vid GET räcker i MVP)
- [ ] Analytics events
- [ ] Feature seed + SW cache bump

### Fas 2 — Push (~4–6h)

- [ ] Scheduler + push-typ `activation_program`
- [ ] Inställning under Aviseringar i `settings.html`
- [ ] UTM-tracking på push-länkar

### Fas 3 — Mätning & iteration (~4h)

- [ ] Admin funnel-vy
- [ ] A/B-test copy (hardcoded variants i `src/lib/activation-program-content.js`)
- [ ] Ev. onboarding-val "Hoppa över programmet"

---

## 14. Acceptanskriterier (MVP)

1. När en förälder slutför onboarding skapas ett aktivt 7-dagarsprogram.
2. Dashboard visar banner med korrekt dag 1–7 och progress.
3. Förälder kan opt-out; banner försvinner permanent för den körningen.
4. Dag 7-reflektion sparas och programmet markeras `completed`.
5. Minst `activation_program_started` och `activation_program_day_done` trackas i analytics.
6. Befintlig onboarding, barnvy och schema påverkas inte negativt.
7. Programmet syns inte för barn-inloggning eller pedagog-vy.

---

## 15. Risker och mitigering

| Risk | Mitigering |
|------|------------|
| Push-upplevs som spam | Max 1/dag, dag 2–7; enkel opt-out; respekt för quiet hours |
| Förälder känner sig tillrättavisad | Aldrig "missad dag"-copy; neutral "Hoppa över idag" |
| Dubbel push med schedule_reminder | Separata typer; ev. suppress schedule_reminder dag 1–7 om activation skickats |
| Programmet känns irrelevant för power users | Opt-out synlig; auto-enroll kan stängas av i v1.1 |
| Timezone-buggar | Använd `family.timezone`; test med explicit UTC+2 |

---

## 16. Success metrics (4 veckor efter launch)

| Metric | Baseline (uppskatta) | Mål |
|--------|----------------------|-----|
| Parent login dag 2 | TBD från analytics | +20% relativt |
| Parent login dag 7 | TBD | +15% relativt |
| Andel "Aldrig" i retention | ~X% | −30% relativt |
| Dag 7 program completion | — | >40% av enrolled |
| Opt-out rate | — | <25% |

---

## 17. Filer att skapa/ändra (referens)

| Fil | Ändring |
|-----|---------|
| `migrations/*_parent_activation_program.js` | Ny tabell |
| `db/parent-activation-program.js` | CRUD |
| `src/lib/activation-program-content.js` | Dag 1–7 copy (SWERGE) |
| `src/lib/activation-program-scheduler.js` | Push (fas 2) |
| `src/routes/activation-program.js` | API `/api/me/activation-program/*` |
| `src/routes/onboarding.js` | Auto-enroll vid complete |
| `public/js/activation-program-banner.js` | Dashboard UI |
| `public/dashboard.html` | Script + mount point |
| `scripts/seed-features.js` | Feature slug |
| `public/sw.js` | Cache bump |

---

## 18. Öppna frågor

1. **Ska medförälder auto-enrollas** om de slutför onboarding istället för primär? → Förslag: alltid den som kallar `/complete`.
2. **Ska befintliga familjer erbjudas programmet retroaktivt?** → Förslag: nej i v1; ev. admin-trigger för utvalda churn-risk.
3. **Koppla dag 4 till faktisk schema-edit** eller räcker login? → MVP: login räcker; auto-complete om schedule API anropas samma dag.
4. **Integrera med win-back?** → Separata flows; win-back för 18+ dagar, detta för vecka 1.

---

*Spec utarbetad utifrån retention-data, användarcitat och befintlig stack (Express, push-scheduler, onboarding, analytics_events).*
