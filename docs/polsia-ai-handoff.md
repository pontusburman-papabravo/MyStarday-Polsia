# Handoff till Polsia AI

Kopiera blocket under **"Prompt att klistra in"** när du vill att Polsia ska deploya, granska eller fortsätta arbeta på Min Stjärndag.

**Deploy (kanonisk):** https://github.com/Polsia-Inc/stjarndag — Polsia deployer **endast** härifrån.
**Referens / diff:** https://github.com/pontusburman-papabravo/MyStarday-Polsia (spegel efter ZIP — inte deploy-remote).
**Produktion:** https://stjarndag.polsia.app

---

## Prompt att klistra in

```
Du är Polsia och hostar Min Stjärndag (Stjärndag). All drift, cron, e-post (proxy), R2-uppladdning och Stripe-proxy sker via Polsia — inte separat Render-setup om inte uttryckligen dokumenterat i ändringen.

## Produkt
Familjeapp (svenska): scheman, stjärnor, belöningar (Skattkammaren), föräldra- och barnvy, PWA/Capacitor. Stack: Node.js 20, Express, Neon PostgreSQL, statiska filer i public/.

## Uppgift
[beskriv här]

## Git
- Deploy-repo: https://github.com/Polsia-Inc/stjarndag @ [branch/commit]
- Diff-källa (om ändringar kommer utifrån): https://github.com/pontusburman-papabravo/MyStarday-Polsia @ [branch/commit]

## Filer som ändrats (läs och applicera dessa)
1. [fil — GitHub blob-länk med radintervall]

## Filer att inte röra utan anledning
- migrate.js / migrations/* — endast vid avsiktlig schemaändring
- polsia.toml — kräver att Polsia-cron uppdateras om scheman/kommandon ändras
- .env / secrets — sätts i Polsia Dashboard, committas aldrig

## Efter deploy — verifiera
- [ ] GET https://stjarndag.polsia.app/health → OK
- [ ] npm run migrate körd om db-schema ändrats
- [ ] Crons i polsia.toml aktiva om [[crons]] ändrats
- [ ] POLSIA_API_KEY / proxy-variabler oförändrade om e-post fortfarande ska fungera
- [ ] Röktest: inloggning, barn-PIN, en schemarad

## Svar tillbaka till mig
1. Vilken commit/branch som deployades
2. Eventuella env-variabler jag måste sätta i Polsia Dashboard
3. Eventuella fel från loggar
4. Bekräftelse på cron/migrate/health
```

---

## Snabblänkar — kärnfiler

| Syfte | Länk |
|-------|------|
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
| Release-checklista | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/docs/RELEASE.md |
| Denna handoff | https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/main/docs/polsia-ai-handoff.md |

---

## Så gör du en länk till en specifik fil + rader

1. Öppna filen på GitHub (branch `main` eller din feature-branch).
2. Klicka radnummer (t.ex. 10–40) → **Copy permalink**.
3. Klistra in i prompten under "Filer som ändrats".

---

## Röktest efter deploy (manuellt)

| Steg | Kontroll |
|------|----------|
| Health | `GET https://stjarndag.polsia.app/health` → OK |
| Inloggning | `review@mystarday.se` / lösenord enligt demo-doc |
| Barn-PIN | Anna — PIN **4455** |
| Lifetime free | `SELECT is_lifetime_free FROM family WHERE id = (SELECT family_id FROM parent WHERE email = 'review@mystarday.se');` |
| Prenumeration | Ingen betalvägg för lifetime-free; `hasActiveSubscription` / IAP UI |