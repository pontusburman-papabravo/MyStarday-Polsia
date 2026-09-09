# Nästa årsgrupp 12–18 — Spec och kravställning

**Status:** Diskussionsunderlag (ej låst produktbeslut, ej ADR)  
**Datum:** 2026-09-09  
**Typ:** Spec + krav · **ingen kod**  
**Syfte:** Skriva ut dagens användarupplevelse (barn + förälder + övriga), matcha mot vad som faktiskt finns, och kravställa nästa årsgrupp från pre-teen till ung vuxen.  
**Användning:** Bolla med ChatGPT, Gemini och Cursor. Klistra in hela filen. Be dem attackera rekommendationen, inte parafrasera den.

**Relaterat (auktoritet, inte detta dokument):**

| Dokument | Roll |
|----------|------|
| `docs/PRODUCT-CONSTITUTION.md` | Fem (sex) produktregler |
| `docs/FIRST-SUCCESS.md` | Familjen lyckas med nästa lilla steg |
| `docs/hem-vision.md` · `planering-vision.md` · `beloningar-vision.md` · `familj-vision.md` · `for-dig-vision.md` | Föräldrahubbar |
| `docs/idag-vision.md` · `skattkammaren-vision.md` · `barnets-samling-vision.md` · `barnmeny-v2.md` | Barnytor |
| `docs/npf-arkitektur-v1.md` | NPF-by-default, 3–12 |
| `docs/family-journey-system-spec.md` | En Journey-auktoritet |
| `docs/skolstart-2026-product-gate.md` | Åldersgap i startscheman |
| `docs/google-play-app-content.md` · `docs/app-store-connect-metadata.md` | Butik: 3–12 / 3–10, förskoleton |

**Evidensmarkering i detta dokument**

| Märkning | Betydelse |
|----------|-----------|
| **FACT** | Finns i kod, config, butiksmetadata eller godkänd vision |
| **VISION** | Godkänd produktkompass, men live-UI kan fortfarande skilja sig |
| **REK** | Rekommendation i detta underlag — inte beslut |
| **OQ** | Open Question — får inte uppfinnas i implementation |

---

## 0. Hur du bollar detta med andra modeller

Klistra in dokumentet och ställ **en** av frågorna i taget. Be om oenighet.

1. Är 12–18 en årsgrupp eller tre olika produkter?
2. Vilka av dagens konstitutionsregler måste brytas för 13+ — och vilka får aldrig brytas?
3. Vad är den minsta v1 som är värd att bygga för pre-teen, utan att förstöra 3–8?
4. Vilken motivation ersätter stjärnor/Skattkammaren för 13–15 utan att bli ett vanligt todo-verktyg?
5. Hur ser förälderrollen ut när barnet inte längre *ska* styras, men familjen fortfarande behöver struktur?
6. Vilka juridiska/åldersgränser (GDPR 13, butik 3–12, hälsa, skärm) blockerar vad?

**Detta dokument är inte en build-spec.** Inget här får kodas utan separat beslut + ev. ADR.

---

## 1. Slutsats först (REK)

**Bygg inte en tonårsreskin av dagens barnapp.**

Dagens produkt är *rätt* för ungefär **3–10**, med en *tänjbar* kärna till **11–12**. Den är *fel verktyg* för 16–18 om man bara byter copy och tar bort sagor.

**Gör så här i stället:**

1. Behåll **en familje-OS** (konto, schema, stjärnor som valfritt bränsle, Hem, Journey, medförälder, pedagog).
2. Inför **tre barnlägen** på samma barnpost — inte tre appar:
   - **Liten** (~3–8) — dagens produkt
   - **Mellan** (~9–12) — samma loop, mer ord, mer skolansvar, mindre sagoton
   - **Ung** (13–18) — ny yta: autonomi, integritet, mål, föräldern som coach
3. Dela **Ung** i krav (13–15 vs 16–18) men **inte** i två appar i v1.
4. **Första värdet** är 9–12-stretch (innehåll + ton) + en smal 13–15-spik (integritet + självplanering). Inte ung vuxen först.
5. **Expandera inte butikens målgrupp till 13+** förrän Ung v1 är verklig. Annars lovar vi en förskoleapp till tonåringar.

**Varför:** 12 och 18 är inte samma användare. En 12-åring kan fortfarande behöva NU/NÄSTA och stjärnor. En 17-åring som ser “Sagostund”, PIN-djurikoner och “be en vuxen” tappar förtroendet — och tar med sig yngre syskon ut.

---

## 2. Vad produkten är idag

### 2.1 Ett meningsskapande (FACT + VISION)

Produkten är **inte** ett schemaverktyg. Det är en familjeprodukt som ska göra vardagen lite enklare, lugnare och tydligare.

> First Success = första gången familjen upplever att appen hjälpte dem i vardagen.

Kärnloopen:

```
Förälder sätter struktur
        ↓
Barnet ser vad som händer nu
        ↓
Barnet gör en riktig sak
        ↓
Appen firar kort
        ↓
Stjärnor blir bränsle till något meningsfullt
        ↓
Föräldern ser läget och tar bara vuxenbeslut
```

**Barnet är huvudpersonen. Föräldern är hjälparen.** (First Success lag 4, P-02)

### 2.2 Fem konstitutionsregler (FACT)

1. Produkten leder — användaren ska inte lista ut nästa steg.
2. Produkten överraskar inte.
3. Det finns alltid ett nästa steg, eller en tydlig anledning att inget behövs.
4. Efter varje handling: *jag verkar göra rätt.*
5. Efter registrering ska appen kännas mer färdig än före.

Plus: inga magiska tal i progression.

### 2.3 Vem den är byggd för (FACT)

| Källa | Ålder |
|-------|--------|
| Google Play målgrupp | vuxna + barn **3–12** |
| App Store-beskrivning | **3–10**, “förskoleåldern” |
| NPF-principer (`barnmeny-v2`) | låsta för **NPF 3–12** |
| Startpaket (`starter-plan-meta`) | `ageMin` 3, `ageMax` **12** |
| Onboarding åldersband | `3-5` · `6-8` · `9-12` · **`13+` finns som input** |
| För dig-mål | max **12**, de flesta 3–9 |
| Skolstart-gate | 11–13 får *Skola vardag* med lågstadiecopy (“Sagostund”, “Pyjamas”); **inget teenschema** |

**FACT:** Produkten *accepterar* 13+ i onboarding-input. Den *levererar* inte en 13+-upplevelse.

### 2.4 Vad den medvetet inte är (FACT / VISION)

- Inte ett förälder-dashboard med analytics på Hem
- Inte ett syskonleaderboard
- Inte en butik där stjärnor köps (R-02)
- Inte en fjärde coach
- Inte ett Toca Boca / Animal Crossing-spel
- Inte ett barnformulär / barninställningslabb (C-01)
- Inte skuld vid bruten streak
- Inte login-bonusar (G-01: verklighet före firande)

---

## 3. Alla inblandade idag

| Roll | Vem | Jobb i produkten | Känsla som ska sitta |
|------|-----|------------------|----------------------|
| **Barn** | 3–12, ofta NPF | Göra dagen, samla, spara till belöning | *Det här är min värld. Jag vet vad jag ska göra nu.* |
| **Förälder (primary)** | Skapade familjen | Bygga rutin, se läge, godkänna undantag | *Det här hjälper oss. Jag vet nästa steg.* |
| **Medförälder (shared)** | Inbjuden vuxen, ev. bara vissa barn | Samma föräldrajobb på sina barn | Samma, utan att se barn hen inte har länk till |
| **Pedagog / terapeut** | Inbjuden, `role: pedagog` | Observation, översikt, inte familjeadmin | Professionell, avgränsad |
| **Dual-konto** | Förälder som också är pedagog | Byter helt UI-universum | Inte en sjätte föräldraflik |
| **Familjen som enhet** | `family` | Timezone, prenumeration, Journey-fas | En resa, ett nästa steg |
| **Syskon** | Flera `child` i samma family | Egna scheman, egna stjärnor | Ingen jämförelse |
| **Delad enhet** | En telefon / iPad | Trusted device, byt barn, vuxen-PIN | Tryggt, inte läckande sessioner |
| **Admin** | Intern | Impersonering, bibliotek, flaggor | Inte användarupplevelse |

**OQ för 12–18:** Är den unga personen fortfarande “barn” i datamodellen, eller blir hen en tredje kontotyp (egen e-post, egen GDPR-rätt)?

---

## 4. Förälderns hela upplevelse (idag)

### 4.1 Förälderns jobb (VISION, låst IA)

Fem flikar. Inget “Mer”. Inställningar i avatar.

| Flik | Route | Jobb | Inte |
|------|-------|------|------|
| **Hem** | `/dashboard` | Läget idag, ett nästa steg, undantag | Schemaeditor, analytics, katalog |
| **Planering** | `/planning` → schema, bibliotek, kalender | Bygga och ändra | Daglig coach |
| **Belöningar** | `/rewards` | Godkänna, hantera kista, se stjärnor | Syskonjämförelse, schema |
| **För dig** | `/for-dig` | Problem → färdig rutin att aktivera | Tom tipslista |
| **Familj** | `/family` | Människor: barn, vuxna, pedagoger | Push, GDPR, prenumeration |

**Beslutsregeln på Hem:** högst en komponent får föreslå nästa handling. Godkännanden och inbjudningar är *blockerare*, inte “nästa steg”.

### 4.2 Dag 0 — från noll till rutin (FACT + VISION)

**Målbild (First Success / slim signup):**

1. Förälderns namn, e-post, lösenord, barnets namn. (I ACT-1 även ålder + rutintyp.)
2. Inget tomt verktyg. Familjen får barn + PIN + färdig morgon- eller kvällsrutin + standardbelöningar.
3. Success: *[Barn] är redo* → primär **Visa barnet**, sekundär **Ändra rutinen**.
4. Handoff: barnet ser NU / NÄSTA / SENARE och kan bocka av direkt.

**Tid på dygnet styr första rutinen:** före 15 → morgon *imorgon*; efter 15 → kväll *ikväll*.

**Live-verklighet (ärlig):** det finns fortfarande legacy-wizard, mallväljare och feature-flaggade vägar. Journey-systemet (Fas 1) finns i kod men flaggor default OFF. För kravställning: **målet vinner över wizard-arvet.**

### 4.3 En vanlig vardagsmorgon som förälder

```
07:15  Öppnar Hem på telefon, porträtt, en hand
       Ser per barn: hur går det idag? (utan jämförelse)
       Ser undantag: väntande inlösen, saknad PIN, inbjudan
       Ser ett nästa steg från Journey/coach — eller “inget krävs”
       Kan handoffa: “barnet loggar in” / trusted device
       Kan i undantag bocka av åt barnet (daily-log) — det är vuxenstöd, inte barnets huvudväg
```

Hem ska lämna föräldern med:

- Jag vet hur dagen ser ut per barn
- Jag har gjort det enda vuxenbeslutet som krävdes (eller vet att inget krävs)
- Barnet kan ta över

### 4.4 När vardagen inte fungerar — Planering

Föräldern går inte till Hem för att “bygga”. Hen går till Planering:

- Veckoschema per barn (morgon / dag / kväll)
- Aktivitetsbibliotek (familjens + admin-seedade)
- Särskilda dagar (lov, sjuk, avvikelse)
- Kopiera dag / barn
- Delsteg på aktiviteter
- Bildstöd / `icon_key` / foto
- Timer, NU/NÄSTA, en-i-taget — **föräldern slår på, barnet möter resultatet**

**Mental modell:** Planering = bygg. Hem = kör. För dig = färdigt paket.

### 4.5 För dig — appen gör det svåra

Sex mål, problemorienterade (inte “aktivera mall X”):

| Slug | Headline föräldern ser | Ålder i config |
|------|------------------------|----------------|
| trygga-kvallar | Få lugnare läggningar | 3–5 |
| bra-morgnar | Kom iväg utan morgontjat | 3–6 |
| sjalvstandighet | Få barnet att klä sig själv | 3–7 |
| skolansvar | Få hela skoldagen att flyta | 6–9 |
| samarbete-hemma | Få hjälp med dukning och städning | 4–9 |
| motivation | Hålla motivationen uppe med belöningar | 3–12 |

Tre frågor måste vara besvarade *utan* att öppna detaljer:

1. Vad löser det?
2. Vad händer om jag trycker?
3. Är det säkert? (*du kan ändra senare*)

Aktivering lägger aktiviteter i *barnets* schema. Barnet får en tydligare dag. Föräldern ska känna: *det svåraste är redan gjort.*

**FACT-gap:** Inget För dig-mål täcker 13–18. “Skolansvar” slutar vid 9. “Klä sig själv” är fel problem för en 15-åring.

### 4.6 Belöningar — föräldern styr, barnet upplever

Föräldern:

1. **Godkänner** väntande inlösen (undantag — PA-06)
2. **Hanterar** utbud och stjärnkostnad
3. **Följer** saldo och begäran per barn, utan ranking

Barnet frågar om belöning. Stjärnor dras **först när föräldern godkänt**. Avslag ger ingen skam-UI hos barnet.

Föräldern kan också ge stjärnor manuellt (vuxenberöm) — det är undantag, inte loopen.

### 4.7 Familj, barnprofil, inställningar

**Familj = människor.** Barn, vuxna, pedagoger. Inbjudan medförälder (valfritt per barn). Pedagoglänk.

**Barnprofil** (förälder, inte barnet):

- Namn, emoji/foto, födelsedag, PIN, användarnamn
- Vy: dagssektioner vs NU/NÄSTA/SENARE
- En-i-taget, sekventiellt, timers, visuell timer, minimal UI
- Kortstorlek, tema, element att dölja
- Framsteg / rapporter-länk

**Inställningar (avatar, inte Familj):** push, GDPR-export, radera konto, prenumeration/IAP, byt till pedagogvy.

### 4.8 Medförälder och två hem

- Varje vuxen har eget konto. Ingen delad vuxeninloggning.
- Åtkomst via `parent_child` (primary / shared / pedagog).
- Separerade hushåll stöds tekniskt: pappa kan se Astrid men inte Olle.
- **Boendeschema** är speckad (FEAT-1): barnet ser *sin* dag, föräldern *sitt* ansvar, hem är neutrala. Vanliga kärnfamiljer ska inte påverkas.

**OQ 12–18:** När den unga personen rör sig mellan två hem *och* vill ha privat yta — vems schema vinner? Vem ser läxstatus?

### 4.9 Pedagog

Eget UI-universum: Översikt · Idag · Historik · Inställningar. Inte en föräldraflik.

- Ser tilldelade barn
- Kan skriva `pedagog_notes` (humör, sömn, måltider, beteende)
- Får inte familjeadmin, belöningsgodkännande eller schemaägarskap som förälder
- Förälder kan dela tidsbegränsad rapportlänk (PIN, fältval, 7 dagar)

**G-07:** ingen barn-facing pedagog-gamification.

### 4.10 Notiser, e-post, betalning

- Push: påminnelser, PIN-varning, belöningsbegäran, framsteg (förälder)
- E-post: verifiering, välkomst, inbjudan, win-back, veckosammanfattning
- Betalning: **endast native IAP** (RevenueCat). Ingen webbkassa. Stjärnor köps inte.
- Lifetime-free-familjer finns historiskt.

### 4.11 Förälderns känslomässiga kontrakt

Produkten säljer **lättnad klockan 07:15**, inte kontroll.

Misslyckande idag (som 12–18 kommer förstärka):

- För många “nästa steg” på Hem
- Byggverktyg med intern jargong
- För dig som inte förklarar vad som händer
- Känslan att man måste *ställa in klart* innan något fungerar

---

## 5. Barnets hela upplevelse (idag)

### 5.1 Inloggning (FACT)

```
Appen öppnas
  → Jag är barn
  → Välj vem du är (kända profiler / namn första gången)
  → 4-siffrig PIN
  → Idag
```

- PIN scrypt-hashad. Lockout: 5 fel → 1 min, sedan 5, sedan 15. Vid 3:e felet notifieras förälder.
- Ingen barn-onboarding. Inga formulär utöver PIN (C-01).
- Förälder-exit: vuxenikon → föräldra-PIN → vuxenvy.
- Trusted / family device: delad telefon, byt barn, vuxenprivilegium — PIN-login finns kvar på otröstade enheter.
- Offline: ärlig, inte fejkad “funkar ändå”-magi på native.

**Känsla:** det ska gå för ett förskolebarn på en iPad i hallen.

### 5.2 Tre världar (VISION, låst)

| Värld | Barnets fråga | ~Tid |
|-------|----------------|------|
| ☀️ **Idag** | Vad gör jag nu? | ~80 % |
| 🏰 **Min värld / Skattkammaren** | Varför / vad har jag samlat? | Belöning |
| ❤️ **Mina personer** | Vem finns här? | Tillhörighet |

Landning är **alltid Idag**. Aldrig världskartan först. Ingen “Mer”-flik i målbilden.

**Live-ärlighet:** klassisk toppnav (Idag / Skattkammare / Familj) och magic bottennav (Hem / Schema / Skattkammare / Mer) lever fortfarande sida vid sida. Kravställ 12–18 mot **mål-IA**, inte mot legacy-flikar.

### 5.3 Idag — operativsystemet

Barnet ska inom fem sekunder, utan scroll, veta:

1. Vad ska jag göra nu?
2. Vad får jag?
3. Vad är klart?
4. Vad händer sen?

**En primär handling:** bocka av NU.

Tillstånd:

| Tillstånd | Handling |
|-----------|----------|
| Inga uppgifter | Vänlig tomtext — inte ett tomt formulär |
| Aktivt | Bocka av NU |
| Allt klart | Kort firande ≤2 s, sedan lugn. Ingen “gå till trädgården” |

Stöd som föräldern slår på, barnet *möter*:

- NU / NÄSTA / SENARE
- En-i-taget / fokusläge (en uppgift i stort format)
- Delsteg
- Bild + emoji + ev. foto
- Aktivitetstimer / visuell timer
- Minimal UI (dölj krom)

**Efter sista aktiviteten:** firande → lugn. Rutinen är spelet. Samlingen är belöningen.

### 5.4 Bocka av — kärnloopen (FACT)

1. Barnet trycker klart.
2. Optimistisk kort animation (dopamin-burst / milstolpe, hoppbar, ≤2 s).
3. Server: `daily_log_item` complete, stjärnor enligt `star_value`.
4. Förälder kan få push. SSE uppdaterar Hem.
5. Pausad dag (sjuk/lov) → går inte att bocka.

Stjärnsaldo är **beräknat**: klara + manuella − inlösta. Livstidsstjärnor är monotona (R-06).

Copy-ordning: *Du klarade det!* före siffra.

### 5.5 Skattkammaren (VISION)

Barnet ska se:

- Hur många stjärnor som finns (stjärnburken)
- Vad hen sparar till
- En primär handling: fråga om inlösen **eller** välj mål **eller** samla mer

Inte: butik, schema, vuxengodkännande-UI, syskonjämförelse, skam vid nej.

Status *väntar på svar* är informativ. Genomförd belöning kan bli minneskort.

### 5.6 Min samling / Min värld (VISION, delvis live)

Riktning efter spelgranskning: **samling, inte open-world-spel.**

- Troféer / medaljer vid livstidsstjärnor
- Kedja av dagar (ingen skuldkänsla vid brott)
- Diplom i tid (vecka, månad, år)
- Samlingshylla som fylls automatiskt — inte köp, inte barnval
- Årsbok per månad
- Hus / rum / husdjur / museum finns som motor — ska underordnas “titta vad jag samlat”

**Filter:** hjälper detta barnet *se vad hen åstadkommit*, eller ger det bara en ny uppgift? Ny uppgift hör hemma i Idag.

### 5.7 Mina personer

Familjehall: vilka vuxna och syskon som finns. Hälsningar / tillhörighet. Inte inställningar, inte rapporter.

### 5.8 Vad barnet aldrig gör (FACT / POS)

- Redigerar schema
- Skapar belöningar
- Ändrar syskons data
- Ser förälder-API:er (server-enforced)
- Köper stjärnor
- Fyller i inställningsformulär
- Jämförs mot syskon på stjärnor

### 5.9 En dag som Olle, 7 år

```
Mamma sätter iPad i hallen (trusted device) eller Olle slår PIN
Idag: NU = Klä på dig. +2 ⭐. 1 av 5 klara. Sedan: Frukost.
Olle bockar. Kort stjärnbloss. Nästa blir NU.
Efter sista: “Alla klara!” → lugn.
Senare, om han vill: Skattkammaren — 14 stjärnor, sparar till filmkväll.
Han frågar om inlösen. Status: väntar.
Mamma godkänner på Belöningar. Filmkvällen blir verklig. Inte en loot box.
```

Det är produkten när den är som bäst. Allt 12–18-arbete måste veta vad den *ersätter* hos en 14-åring — inte bara vad den lägger till.

---

## 6. Delade system som 12–18 ärver

Dessa är familje-OS. De ska **återanvändas**, inte kopieras.

| System | Vad det är | Återanvänd för Ung? |
|--------|------------|---------------------|
| Family + parent_child + roller | Vem ser vem | Ja |
| Child-rad + födelsedag | En person, en ålder | Ja — *läge* härleds här |
| Veckoschema + specialdag + exclusion | Vad som gäller vilket datum | Ja, annat språk och tätare |
| Daily log + completion | Sanning om dagen | Ja |
| Stjärnor + rewards + pending | Valfri motivation | **Valfri** från 13, inte default-identitet |
| Journey context | Ett nästa steg för familjen | Ja — nya experiences, inte ny motor |
| För dig-aktivering | Problem → schema | Ja — nya mål |
| Handoff / trusted device | En iPad i köket | Delvis — 16+ vill ha egen telefon |
| PIN-gate vuxen | Skydda förälder-ytor | Ja, men Ung behöver eget konto-OQ |
| IAP / paywall | Familjeprenumeration | Ja — inte “teen IAP för stjärnor” |
| Pedagog + rapportlänk | Skola/stöd | Ja, med mer ungdomsägd delning |
| Boendeschema | Två hem | Ja, viktigare i tonåren |
| `child_view_config` | Adaptiv rendering | Ja — läge styr preset, inte ny tabell först |

---

## 7. Nuläge mot krav — gapmatris

Hur väl dagens produkt uppfyller det en familj med äldre barn faktiskt behöver.

| Behov | 3–8 | 9–12 | 13–15 | 16–18 |
|-------|-----|------|-------|-------|
| Bildstöd, NU/NÄSTA, en-i-taget | **Starkt** | Bra, ska kunna skruvas ner | För barnsligt som default | Fel |
| Förälder bygger, barn utför | **Starkt** | Börjar skava | Fel default | Fel |
| Stjärnor + Skattkammare + saga-copy | **Starkt** | Ok om tonen mognar | Riskerar förlöjligande | Nej |
| C-01 inga barnformulär | Rätt | Rätt | **Konflikt** — 13+ behöver egna val | Konflikt |
| PIN 4 siffror, “jag är barn” | Rätt | Ok | Svagt (kompisar, skärmdump) | Otillräckligt |
| Föräldern ser allt i realtid | Trygghet | Börja dämpa | Känns som övervakning | Oacceptabelt utan samtycke |
| Godkänna varje inlösen | Rätt | Ok | För mycket vuxenmakt | Fel |
| Förskola/lågstadiescheman | Finns | Mellanstadie svagt | **Saknas** | **Saknas** |
| Läxor / plugg / skärm / träning | Svagt | Delvis (skolansvar 6–9) | Saknas | Saknas |
| Integritet, chatt, egen e-post | Ej aktuellt | Ej | **Krävs juridiskt/känslomässigt** | Krävs |
| NPF-stöd (fokus, timer, ingen skam) | **Kärna** | Kärna | Fortfarande kärna — annan yta | Fortfarande kärna |
| Två hem / medförälder | Spec + modell | Samma | Högre konflikt | Högre |
| Pedagoganteckningar om humör/sömn | Ok med förälder | Ok | Känsligt | Mycket känsligt |
| Store 3–12 | Match | Match | **Blockerar löfte** | Blockerar |

**Läsning:** 9–12 är en *innehålls- och tonskuld*. 13+ är en *kontraktsskuld* (vem äger dagen, vem ser vad).

---

## 8. Varför 12–18 inte är “samma app med svårare scheman”

### 8.1 Psykologiskt skifte

| 3–10 | 12–18 |
|------|--------|
| Struktur *ges* | Struktur *förhandlas* |
| Vuxen minskar osäkerhet | Övervakning *ökar* osäkerhet |
| Stolthet = “jag klarade momentet” | Stolthet = “det här är mitt” |
| Belöning = konkret, nära, fysisk | Belöning = frihet, tid, förtroende |
| Bild före ord | Ord, men låg kognitiv last för NPF |
| Familjen är hela världen | Kompisar, skola, identitet, kropp |

Self-determination: **autonomi, kompetens, tillhörighet**. Dagens app är stark på kompetens (klara rutan) och tillhörighet (familj). Autonomi är medvetet låg hos barnet. Från ~12 *måste* autonomi öka, annars blir appen motstånd.

### 8.2 Språkskifte

Dagens copy som **inte** överlever 13+:

- Sagostund, pyjamas, extra saga, glassutflykt som primär belöning
- “Barnet”, “be en vuxen”, “stjärnburken” som enda ekonomi
- Förskole-PIN-väljare som enda identitet
- “Titta vad jag samlat!” som enda samlingskänsla

Språk som **överlever** om det mognar:

- Vad händer nu / sen
- Du klarade det
- Du kan ändra senare
- Ingen skam efter en dålig dag
- En sak i taget

### 8.3 Konstitutionell spänning (måste lösas, inte sopas)

| Regel | 3–12 | 13–18 |
|-------|------|-------|
| C-01 inga barnformulär | Håll | **OQ:** tillåt *få* egna val (mål, synlighet, notiser) — inte ett inställningslabb |
| P-02 barnet är protagonist | Håll | Håll — men kalla personen *ung*, inte barn i UI |
| Förälder är hjälpare | Håll | Håll — hjälpare ≠ operatör |
| PA-06 godkännande = undantag | Håll | Skärp: default ska vara *själv* för vardag, förälder bara vid överenskommet |
| G-01 verklighet före firande | Håll **hårdare** | Inget XP för att öppna appen |
| R-02 stjärnor ej köpbara | Håll | Håll — ev. annan “valuta” är privilegium IRL, inte IAP |
| Ingen syskonjämförelse | Håll | Håll hårdare (tonårsskam) |
| En Journey | Håll | Nya experiences, samma motor |
| Inget Hem-dashboard | Håll | Förälder får *ännu mindre* grafer över den unga |

**REK:** Bryt inte konstitutionen. **Omtolka C-01** via ADR: “inga *vuxenadmin*-formulär i Ung-läge; begränsade självval är tillåtna.”

---

## 9. Rekommenderad årsgruppsmodell

Inte “3–12” vs “12–18”. Fyra band, tre lägen.

```
Ålder     Läge      Default-yta              Förälderroll
3–8       Liten     Idag + Skatt             Operatör / byggare
9–12      Mellan    Idag + Skatt (mogen ton) Med-planerare
13–15     Ung       Min dag + Mina mål       Coach / säkerhetsnät
16–18     Ung       Samma yta, mer privat    Backup / överenskommelse
```

**Varför tre lägen, inte fyra appar:** samma familj har ofta 7-åring + 14-åring. Två appar dödar Hem. Ett läge per barnrad, synligt för föräldern som “Astrid: Liten” / “Noah: Ung”.

**Hur läge väljs (REK):**

1. Default från `birthday` (eller onboarding `ageBand`).
2. Förälder kan flytta ett steg (Liten↔Mellan, Mellan↔Ung) med tydlig preview.
3. **Inte** hoppa Liten → Ung utan varning.
4. Den unga (13+) ska *se* och kunna *begära* läge — förälder bekräftar i v1.
5. 16+ **OQ:** kan hen sätta Ung själv?

**13+ i onboarding idag:** behåll bandet, sluta mappa tyst till lågstadieschema. Antingen Ung-starter eller ärlig copy: *Vi är bäst för 3–12 idag — här är vad du kan använda.*

---

## 10. Krav per läge

Krav-ID: `L` Liten · `M` Mellan · `U` Ung · `F` Förälder · `P` Pedagog · `S` System.  
Prioritet: **P0** måste för v1 av läget · **P1** samma år · **P2** senare.

### 10.1 Liten (~3–8) — bevara, inte urvattna

Detta är produkten ni *har*. Nästa årsgrupp får **inte** göra Liten sämre.

| ID | Krav | P |
|----|------|---|
| L-01 | Idag default: bild, NU/NÄSTA, en primär handling | P0 |
| L-02 | Inga barnformulär, ingen schemaedit | P0 |
| L-03 | Firande ≤2 s, hoppbart, ingen skam | P0 |
| L-04 | Skattkammare + stjärnor som default-motivation | P0 |
| L-05 | PIN + ev. trusted device | P0 |
| L-06 | Förälder äger schema, belöningar, vy-stöd | P0 |
| L-07 | NPF-by-default (fokus, timer, delsteg) | P0 |
| L-08 | Syskon syns inte som tävling | P0 |

**Acceptans:** Olle-testet på Idag och Skattkammaren oförändrat efter att Mellan/Ung shippas.

### 10.2 Mellan (~9–12) — första steget värt att bygga

Samma kontrakt som Liten, annan *yta*.

| ID | Krav | P |
|----|------|---|
| M-01 | Samma tre världar, samma loop | P0 |
| M-02 | Copy utan sagodominans: läxor, väska, träning, skärmtid, eget rum | P0 |
| M-03 | Startschema “Mellanstadium vardag” (inte Pyjamas-first) | P0 |
| M-04 | För dig-mål: läxor, skärmtid, träning, veckopeng-koppling IRL | P0 |
| M-05 | Valfri texttyngre Idag (mindre pictogram-first, bild kvar som stöd) | P0 |
| M-06 | Barnet kan *föreslå* aktivitet/belöning; förälder godkänner | P1 |
| M-07 | Stjärnor kvar men copy: *bränsle till det du sparar till*, inte “stjärnburk-barn” | P1 |
| M-08 | Min samling mer “diplom/årbok” än nallehylla | P1 |
| M-09 | Hem: föräldern ser läxor/kväll, inte en baby-readiness-rad | P1 |
| M-10 | NPF-stöd kvar och förstklassigt — 9–12 med ADHD är kärna, inte edge | P0 |

**Acceptans (Jenny + Noah 11):**

- Inom 5 s på Idag: vad nu, vad sen, utan att skämmas om någon tittar över axeln.
- För dig har minst ett mål som inte låter som förskola.
- Liten-syskonet oförändrat.

**Detta är den kommersiellt rätta v1.** Familjer växer ur er vid ~10–11 p.g.a. *ton och innehåll*, inte p.g.a. saknad social app.

### 10.3 Ung 13–15 — nytt kontrakt

Ny barnyta. Inte en fjärde värld i sagohuset.

**Känsla:** *Det här är mitt. Vuxna ser det vi kommit överens om.*

| ID | Krav | P |
|----|------|---|
| U-01 | Egen yta: **Min dag · Mina mål · Vi hemma**. Inte Skattkammare-first | P0 |
| U-02 | Default-copy: du/jag, aldrig “barnet” i hen:s UI | P0 |
| U-03 | Hen kan lägga egna uppgifter på *sin* dag (läxa, träning, plugg, jobb) | P0 |
| U-04 | Förälder-schema blir *förslag / familjeåtaganden* (middag, hämtning), inte hela dagen | P0 |
| U-05 | Synlighet: tre lägen per fält — Bara jag / Familj / Pedagog. Default: familj ser *klart/inte*, inte klockslag för allt | P0 |
| U-06 | Inlösen: vardagsprivilegium kan vara auto eller veckovis, inte tap-godkänn varje gång | P0 |
| U-07 | Stjärnor **av** som default; kan slås på. Alternativ: avklarat, streak-utan-skam, avtalad frihet | P0 |
| U-08 | Inloggning: PIN *eller* eget lösen / biometri. Inte “välj djuremoji” som enda identitet | P1 |
| U-09 | Inga pedagoganteckningar om humör/sömn synliga som “spelstatus”. Delning = aktiv | P0 |
| U-10 | NPF: fokusläge, en sak, timer, ingen skam — kvar men vuxen visuell ton | P0 |
| U-11 | För dig för *föräldern*: skärmtid-avtal, läxstruktur, sömn, två hem — inte “klä på dig” | P1 |
| U-12 | För dig för *den unga* (valfritt): egna paket. **OQ** om det bryter en-coach | P2 |
| U-13 | Notiser till den unga på *hen:s* enhet. Förälder får inte kopia på allt | P0 |
| U-14 | Hem för förälder: “Noah har 2 familjeåtaganden kvar” — inte live-karta över pluggminuter | P0 |
| U-15 | Chatt/social/feed: **förbjudet i v1** | P0 |
| U-16 | Hälsojournal, mens, vikt, terapianteckningar: **förbjudet** | P0 |

**Acceptans (Noah 14 + Jenny):**

- Noah kan använda Min dag utan att klasskompis skrattar åt UI.
- Jenny vet om *familjeåtaganden* är klara, inte hur många minuter Noah pluggade i hemlighet.
- En dålig dag nollställer inte veckan och ger ingen röd skam.

### 10.4 Ung 16–18 — samma yta, hårdare integritet

Inte ny app. Samma Ung-yta med andra default.

| ID | Krav | P |
|----|------|---|
| Y-01 | Default-synlighet: Bara jag för plugg/jobb; Familj för överenskomna åtaganden | P0 |
| Y-02 | **OQ:** eget konto (e-post) vs barn-PIN. Juridik + radera-mina-data | P0 beslut |
| Y-03 | Körkort, jobb, CSN, plugg — innehåll senare. Struktur först | P2 |
| Y-04 | Förälder kan inte tvinga tillbaka till Liten utan den ungas vetskap | P0 |
| Y-05 | Exit: vid 18 (eller utflytt) — exportera / koppla loss från family | P1 |
| Y-06 | Ingen “barnövervakning”-marknadsföring mot denna grupp | P0 |

**REK:** Bygg inte Y-innehåll förrän U-01–U-10 sitter. Annars bygger ni en dålig Notion för gymnasieelever.

---

## 11. Krav för alla vuxna när Ung finns

### 11.1 Förälder

| ID | Krav | P |
|----|------|---|
| F-01 | Hem visar blandade lägen i samma familj utan att blanda UI-metaforer | P0 |
| F-02 | Ett nästa steg per *familj*, inte en coach per barnläge | P0 |
| F-03 | Planering: “Familjeåtaganden” vs “Noahs egna” — två hyllor, inte en hög | P0 |
| F-04 | Belöningar: för Ung default *avtal* (skärm, tid, pengar IRL), inte bara skattkista | P1 |
| F-05 | För dig-katalog filtreras hårt på ålder. Inga sagomål på 14-åring | P0 |
| F-06 | Familj-hub: läge synligt, byt läge med preview av vad som ändras | P0 |
| F-07 | Ingen ny analytics-flik “tonårsdashboard” | P0 |
| F-08 | Medförälder ärver synlighetsregler — pappa ser inte mer än avtalet | P0 |
| F-09 | Onboarding: om ålder ≥13, lova inte förskole-handoff som enda success | P0 |
| F-10 | Morning-stress-test gäller: 07:15, en hand, inget förhandlande i appen | P0 |

### 11.2 Pedagog

| ID | Krav | P |
|----|------|---|
| P-01 | Ser bara det den unga/föräldern delat | P0 |
| P-02 | Inga humör-skalor som default på 13+ | P0 |
| P-03 | Rapportlänk: den unga (13+) ska veta att den skapats | P1 |

### 11.3 System / legal / butik

| ID | Krav | P |
|----|------|---|
| S-01 | Ingen butikstext “förskoleåldern” samtidigt som 13+ säljs | P0 |
| S-02 | GDPR: under 13 förälder-konto; från 13 **OQ** om eget samtycke | P0 beslut |
| S-03 | Play/App Store målgrupp och IARC uppdateras först när Ung finns | P0 |
| S-04 | Inga nya barn-data-klasser (hälsa, plats, meddelanden) utan ADR | P0 |
| S-05 | Child JWT får inte nå förälder-API — oförändrat | P0 |
| S-06 | Åldersläge server-sanning, inte bara CSS | P0 |
| S-07 | Analytics utan PII; ingen “teen risk score” | P0 |
| S-08 | IAP oförändrad princip: familj betalar, stjärnor köps inte | P0 |

---

## 12. Förslag till Ung-upplevelse (diskussion, inte wireframe)

Tre ytor. Samma beslutregel som idag: **en primär handling**.

### Min dag

- Familjeåtaganden (förälder satte / ni kom överens): *Middag hemma 18:00*, *Hämta Elsa*
- Mina (hen skapade): *Matteprov fredag*, *Fotboll 17*, *Plugga 25 min*
- Fokusläge finns. Default kan vara lista, inte pictogram-hero.
- Klart = verklighet. Eventuellt tyst kvitto, inte konfetti.

### Mina mål

- 1–3 mål i taget (skärmtid, sömn, plugg, träning, sparande IRL)
- Progress mot *avtal*, inte XP-bar som skämt
- Om stjärnor är på: de är bränsle till avtalet, gömda under fold

### Vi hemma

- Vilka som är i familjen
- Vad som är delat den här veckan
- Inte en feed. Inte “mamma tittar på dig”

**Förälder Hem mot samma data:**

- Noah: 1 familjeåtagande kvar
- Elsa (7): 3 av 5 morgon klara
- Undantag: Noah begärde dubbel skärmtid lördag → godkänn

---

## 13. Motivation — vad som ersätter stjärnor

**REK lager, inte antingen/eller:**

| Lager | 3–8 | 9–12 | 13–15 | 16–18 |
|-------|-----|------|-------|-------|
| 1 Verklighet (klart i livet) | Ja | Ja | **Primär** | **Primär** |
| 2 Synlig progress | Stjärnor | Stjärnor + mål | Avtal / delmål | Egna mål |
| 3 Identitet | Samling, hus | Diplom, årsbok | “Jag sköter mitt” | Vuxenkompetens |
| 4 Upptäckt (värld) | Skatt / rum | Valfritt | Av | Av |

**Förbjudet i alla band:** login-bonus, loot box, leaderboard, köpta stjärnor, streak-skam, 5 s blockerande firande.

**OQ:** Får Ung ha “veckopeng-kvitto” kopplat till avklarat? (IRL-pengar, inte IAP.) Risk: appen blir barnarbete-tracker. Default **nej** tills grundare säger ja.

---

## 14. Innehåll vi saknar (startbibliotek)

Idag: Förskola vardag, Skola vardag, Morgon, Kväll, Helg, Lov, sommar/jul. Copy lågstadium.

**Mellan behöver (P0):**

- Mellanstadium vardag (skola, väska, läxa, skärm, träning)
- Kväll utan sagostund som kärna (egen tid, morgondagens väska, sömn)

**Ung behöver (P0 för Ung v1):**

- Familjeåtaganden-mall (middag, disk, syskonhämtning, hund)
- Skolvecka 13–15 (väska, inlämning, pluggpass — *hen äger raderna*)
- Skärmtid-avtal (förälder + ung, inte hemlig parental control)
- Två-hem-vecka (redan speccad boendeschema — koppla)

**Inte i v1:** körlektioner, fest, dating, alkohol, terapiplaner.

---

## 15. Vad som medvetet är utanför scope

- Ny app / nytt bundle-id
- Socialt nätverk, klassrum, chat
- Skolplattforms-integration (Vklass/InfoMentor) i v1
- GPS / “var är Noah”
- Hälsomätning, wearable
- Fjärde coach eller Activation-expansion
- Star IAP, teen battle-pass
- Att döda Liten-produkten
- Att POS-ändras utan ADR
- Kod i detta uppdrag

---

## 16. Kommersiellt och varumärke (REK)

**Största vinst per vecka:** sluta tappa familjer vid 10–12. Det är samma betalande förälder, samma syskon, samma NPF-behov. Ton + mellanstadieschema + För dig-mål är billigare än en tonårsapp.

**Näst största:** 13–15 i familjer som redan betalar, där ett barn *växer in*. Inte förvärv via TikTok-tonårsvarumärke.

**Risk:** sälja “3–18” i butik innan Ung finns → recensioner från tonårsföräldrar som möter Sagostund. Skadar 3–8-förvärv.

**Domän/varumärke:** namnet kan leva för Liten/Mellan. Ung-läget ska **inte** heta “stjärnburken” i UI. Externt: *samma app, olika lägen* — inte ett separat teen-varumärke.

**OQ:** Engelska marknader (3–12 redan svårt). Rekommendera: **inte** lansera Ung internationellt först.

---

## 17. Open Questions (grundare)

Dessa får inte en agent gissa.

1. **Kontomodell 13+:** fortsätta som `child` + PIN, eller eget `parent`-löst ungdomskonto med e-post?
2. **Synlighet default 13–15:** ser föräldern avklarat i realtid, eller bara familjeåtaganden?
3. **Får den unga skapa fria uppgifter utan förälder?** (REK: ja, syns inte default.)
4. **Stjärnor på 13+ default av eller valfritt på?** (REK: av.)
5. **Veckopeng / IRL-pengar i appen?** (REK: nej v1.)
6. **Butik 13+ när?** (REK: efter Ung v1, inte i samma PR som copy.)
7. **Namn i UI:** “Ung” / “Du” / något annat — inte “barnläge 3”.
8. **NPF 13–18:** samma produkt eller separat extra-stöd-yta? (REK: samma, annan ton.)
9. **Ska 11–12 defaultas Mellan även utan födelsedag?**
10. **Pedagog på gymnasiet:** in eller ut tills P-krav sitter?

---

## 18. Diskussionsprotokoll för ChatGPT / Gemini / Cursor

Be modellen svara i detta format:

```
OENIG OM: [påstående i dokumentet]
VARFÖR: [användar- eller juridisk risk]
ALTERNATIV: [ett konkret, inte fem]
VAD SOM MÅSTE LÅSAS AV GRUNDARE: [OQ-nummer]
VAD SOM KAN LÅSAS NU: [krav-ID]
```

**Påståenden att attackera:**

1. Tre lägen på en barnrad slår två appar.
2. 9–12 är rätt v1, inte 16–18.
3. C-01 ska omtolkas via ADR, inte slopas.
4. Stjärnor av som default från 13.
5. Ingen social v1.
6. Förälder ser mindre, inte mer, när barnet blir äldre.
7. Samma Journey-motor, nya experiences.

**Kvalitetstest på motförslag:** Skulle en 7-åring med autism få en sämre morgon? Om ja — underkänn.

---

## 19. Definition of Done för *denna* spec-runda

Spec-rundan är klar när grundaren kan säga:

1. Jag känner igen dagens barn- och föräldraupplevelse — inklusive var vision och live skiljer sig.
2. Jag vet vilka krav som är bevarande (Liten) vs nya (Ung).
3. Jag har valt eller strukit OQ 1–6 tillräckligt för en ev. ADR.
4. Ingen kod har skrivits mot detta dokument.

**Nästa dokument (inte nu):** ADR “Age mode on child” + ev. POS-tillägg för C-01-omtolkning + innehållsspec Mellan-startschema.

---

## 20. Självgranskning av underlaget

| Hatt | Resultat |
|------|----------|
| CPO | Rekommenderar 9–12 först; vägrar 3–18-löfte i butik |
| UX | Bevarar 07:15-testet; Ung = mindre övervakning |
| Game | Verklighet primär från 13; stjärnor valfria |
| Security | Inga nya dataklasser; JWT-gräns kvar; OQ på ungdomskonto |
| Legal | Butik + GDPR 13 flaggade, inte “lösta” |
| QA | Krav är testbara per läge; Liten-regression är P0 |
| AISA | POS citerad; detta dokument är inte ny sanning över POS |

**POS / kompass styrda av:** Constitution 1–5, First Success lag 0–7, P-02, C-01/C-03/C-04, PA-01/PA-06, G-01, R-02, Hem/Planering/Belöningar/För dig/Familj-visioner, NPF 3–12, barnmeny v2.

---

*Slut på diskussionsunderlag. Inte implementationskontrakt.*
