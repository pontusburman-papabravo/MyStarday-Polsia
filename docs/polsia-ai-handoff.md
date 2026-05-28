# Handoff till Polsia AI

Kopiera blocket under **"Prompt att klistra in"** när du vill att Polsia ska deploya, granska eller fortsätta arbeta på Min Stjärndag.

**Repo:** https://github.com/pontusburman-papabravo/MyStarday-Polsia  
**Produktion:** https://stjarndag.polsia.app  
**Gren:** Byt `main` i länkarna till din branch eller commit-SHA om `main` inte är uppdaterad än.

---

## Prompt att klistra in

```
Du är Polsia och hostar Min Stjärndag (Stjärndag). All drift, cron, e-post (proxy), R2-uppladdning och Stripe-proxy sker via Polsia — inte separat Render-setup om inte uttryckligen dokumenterat i ändringen.

## Produkt
Familjeapp (svenska): scheman, stjärnor, belöningar (Skattkammaren), föräldra- och barnvy, PWA/Capacitor. Stack: Node.js 20, Express, Neon PostgreSQL, statiska filer i public/.

## Uppgift
[BESKRIV HÄR: t.ex. "Deploya senaste main", "Kör migrate", "Verifiera cron efter ändring i polsia.toml"]

## Git
- Repo: https://github.com/pontusburman-papabravo/MyStarday-Polsia
- Branch/commit: [main ELLER branch-namn ELLER full commit-SHA]
- PR (om relevant): [länk till PR]

## Filer som ändrats (läs och applicera dessa)
1. [FIL 1 — GitHub blob-länk, gärna med radintervall #L10-L40]
2. [FIL 2]
3. [FIL 3]

## Filer att inte röra utan anledning
- migrate.js / migrations/* — endast vid avsiktlig schemaändring
- polsia.toml — kräver att Polsia-cron uppdateras om scheman/kommandon ändras
- .env / secrets — sätts i Polsia Dashboard, committas aldrig

## Efter deploy — verifiera
- [ ] GET https://stjarndag.polsia.app/health → OK
- [ ] npm run migrate körd om db-schema ändrats
- [ ] Crons i polsia.toml aktiva om [[crons]] ändrats
- [ ] POLSIA_API_KEY / proxy-variabler oförändrade om e-post fortfarande ska fungera
- [ ] Röktest: inloggning, barn-PIN, en schemarad (om UI/backend rörts)

## Svar tillbaka till mig
1. Vilken commit/branch som deployades
2. Eventuella env-variabler jag måste sätta i Polsia Dashboard
3. Eventuella fel från loggar
4. Bekräftelse på cron/migrate/health
```

---

## Snabblänkar — kärnfiler (ersätt `main` vid behov)

| Syfte | Länk |
|--------|------|
| Cron-deklarationer | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/polsia.toml |
| Serverstart | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/server.js |
| DB-migrering | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/migrate.js |
| E-post (Polsia proxy) | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/lib/email.js |
| Auth API | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/routes/auth.js |
| Konfig / env | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/lib/config.js |
| Push-scheduler | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/lib/push-reminder-scheduler.js |
| Midnatt-jobb | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/lib/midnight-scheduler.js |
| Veckosammanfattning | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/lib/weekly-summary-scheduler.js |
| package.json / scripts | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/package.json |
| README | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/README.md |
| Release-checklista | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/docs/RELEASE.md |
| Denna handoff | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/docs/polsia-ai-handoff.md |

### Mappar (tree-länkar)

- Routes: https://github.com/pontusburman-papabravo/MyStarday-Polsia/tree/main/src/routes  
- Frontend: https://github.com/pontusburman-papabravo/MyStarday-Polsia/tree/main/public  
- DB-lager: https://github.com/pontusburman-papabravo/MyStarday-Polsia/tree/main/db  
- Tester: https://github.com/pontusburman-papabravo/MyStarday-Polsia/tree/main/test  

---

## Så gör du en länk till en specifik fil + rader

1. Öppna filen på GitHub (branch `main` eller din feature-branch).
2. Klicka radnummer (t.ex. 10–40) → **Copy permalink**.
3. Klistra in i prompten under "Filer som ändrats".

Exempel:

`https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/src/routes/rewards.js#L120-L185`

---

## Gren med senaste zip-uppackning (tills PR är mergad)

Om `main` bara har ZIP-filen, peka Polsia på:

- Branch: `cursor/extract-stjarndag-zip-2440`  
- PR: https://github.com/pontusburman-papabravo/MyStarday-Polsia/pull/1  
- Exempel-länk: `.../blob/cursor/extract-stjarndag-zip-2440/server.js`

Efter merge: använd alltid `main` (eller tag/commit som Polsia deployar från).
