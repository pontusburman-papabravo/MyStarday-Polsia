# Nästa årsgrupp 12–18 — Spec och kravställning

**Status:** Diskussionsunderlag (ej låst produktbeslut, ej ADR, ej build-spec)  
**Revision:** 3 — 2026-09-09 (kvalitetsrunda; stänger spec-rundan) 
**Typ:** Spec + krav · **ingen kod**  
**Syfte:** Skriva ut dagens användarupplevelse, matcha mot vad som finns, och kravställa nästa årsgrupp så att underlaget överlever kritisk granskning.  
**Användning:** Bolla med ChatGPT, Gemini och Cursor. Klistra in hela filen. Be dem attackera rekommendationen.

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
| `docs/google-play-app-content.md` · `docs/app-store-connect-metadata.md` | Nuvarande butikstexter (3–12 / 3–10) |

**Evidensmarkering**

| Märkning | Betydelse |
|----------|-----------|
| **FACT** | Verifierat i kod, config, butiksmetadata, godkänd vision *eller* primärkälla |
| **VISION** | Godkänd produktkompass; live-UI kan skilja sig |
| **REK** | Rekommendation här — inte beslut |
| **OQ** | Open Question — får inte uppfinnas i implementation |
| **EVIDENCE** | Extern forskning eller officiell policy som *stödjer* ett avgränsat påstående |
| **NOT_VERIFIED** | Rimlig inferens eller produktantagande utan verifierad evidens |
| **NOT_PROVEN** | Specifik produktlösning är inte visad (relation, retention, klinisk effekt) |
| **REJECTED** | Tidigare påstående som inte håller efter granskning |
| **LEGAL REVIEW** | Kräver juridisk genomgång per marknad — inte produktbeslut |

---

## 0. Hur du bollar detta

Klistra in dokumentet och ställ **en** fråga i taget. Be om oenighet.

1. Håller presentation-vs-policy-uppdelningen, eller smyger ålder tillbaka som behörighet?
2. Är objektgränserna Mitt / Vårt / Delat stöd begripliga nog — eller blir de ACL i förklädnad?
3. Är Mellan-först + Ung-spike det minsta säkra scopet?
4. Blir Ung en todo-app om vi tar bort mål och stjärnor?
5. Vilken information *måste* en vårdnadshavare kunna se trots privat default?

**Inget här får kodas utan separat beslut + ev. ADR.**

---

## 0b. Adversarial review (intern, före revision)

Granskningen försökte **motbevisa** revision 1. Resultat som styr revision 2:

| Påstående i rev. 1 | Utfall | Varför |
|--------------------|--------|--------|
| Tre ålderslägen *styr* behörighet | **REJECTED** som behörighetsmodell | Magiska gränser. En 14-åring med NPF behöver Ung-integritet *och* NU/NÄSTA. Ålder får bara föreslå presentation. |
| “Föräldern ser mindre när barnet blir äldre” | **Försvagat** | För grovt. Riskerar att straffa samarbete. Ersatt: mindre *implicit* insyn, mer *explicit* delning. |
| Fältvis ACL (Bara jag / Familj / Pedagog) | **REJECTED** för Ung v1 | Mini-Google-Drive. Läckagerisk via metadata. Ersatt: objektägande. |
| “Mina mål” P0 | **REJECTED** för Ung v1 | Habit tracker. Inför streak, misslyckande, känsliga mål. Flyttas till hypotes. |
| GDPR 13 = eget konto / vuxenstatus | **REJECTED** | Art. 8 + svensk 13-årsregel gäller *samtycke till ISS*, inte avtal, konto eller isolering från vårdnadshavare. Irland = 16. |
| “Store rating blockerar 13+” | **REJECTED** som FACT | Play har målgrupper 13–15 och 16–17. Problemet är *deklaration vs faktisk app*, inte att 13+ saknas som kategori. |
| Stjärnor slutar fungera vid exakt 13 | **NOT_VERIFIED** | Produktantagande. Default OFF för Ung-policy, inte åldersmagi. |
| Familjer lämnar vid 10–12 p.g.a. ton | **NOT_VERIFIED** | Ingen mätning i detta underlag. Hypotes, inte FACT. |
| Ny ersättningsvaluta (frihet/XP/veckopeng) | **REJECTED** för v1 | Nytt motivationssystem utan evidens. Scope-creep. |
| Ung = tre nya ytor inkl. mål | **Försvagat** | P0: Min dag + Vi hemma. Återanvänd Idag/Mina personer om möjligt. |

**Vad som *höll*:** en familje-OS; Liten skyddad; Mellan först kommersiellt; ingen social v1; inga nya hälsodata; stjärnor ej köpbara; C-01 omtolkas via ADR, slopas inte.

**Konflikt flaggad, inte tvingad:** om objektägande + privat default gör Hem värdelöst för föräldern till en 14-åring, då är Ung inte värt att shippa — bara att de-riska. Det är därför Ung är spike, inte release.

---

## 1. Slutsats först (REK)

**Bygg inte en tonårsreskin. Bygg inte heller tre behörighetskaster efter födelsedag.**

Ålder väljer **defaultupplevelse**. Autonomi, ägarskap och delning styr **beteendet**.

Progressionen som produkten ska möjliggöra:

```
Göra åt mig  →  Göra tillsammans  →  Äga själv
```

Liten / Mellan / Ung är **presentations- och innehållspresets**, inte access-modell.

En 14-åring ska kunna ha Ung integritetsmodell *och* NU/NÄSTA, bildstöd, timer, fokusläge, en sak i taget. Stödbehov får inte reducera autonomi.

**Leveransordning (REK):**

1. **Mellan (9–12)** = första kommersiella leverans: ton, startschema, För dig. Samma *v1-kontrakt* som Liten, men designad så “Göra tillsammans” kan valideras senare utan ny kärna. Inte bara vuxnare copy.
2. **Ung architecture spike** = parallell de-risking, **inte** release. Bevisar Noah-scenariot nedan.
3. **Inte** ung vuxen-innehåll (16–18) förrän spike håller.
4. **Marknadsför inte** 13+ förrän Ung-upplevelsen finns och klarar kraven. Det är ett *löftes-* och deklarationskrav — inte att Play/Apple saknar 13+-fack.

**P0-princip (alla åldersövergångar):** En födelsedag, ändrat `ageBand` eller rekommenderat `presentation_mode` får **aldrig tyst** ändra ägarskap, privacy, delning, API-access, vuxen-/pedagoginsyn, notiser, `reward_model` eller annan capability med integritets- eller beteendekonsekvens. Ålder får *föreslå* presentation eller en transition — inte genomföra en dold rättighetsförändring. (S-10; konstitution: produkten överraskar inte.)

**Kritisk arkitekturhypotes (spike, måste kunna falsifieras):**

> Noah, 14, skapar “Matteprov fredag”. Den är Mitt = privat default, inte implicit delad. Rollen förälder/pedagog ger inte automatisk access. Obehörig ska inte kunna *läsa eller härleda* titel, existens eller status via API, Hem, notis, analytics, rapport, export, sök, cache eller pedagogvy — utöver explicit delning och ev. **LEGAL REVIEW**-undantag (inte uppfunna här). Samtidigt finns “Middag hemma 18:00” som Vårt; relevant förälder ser det. Noah kan välja att dela matteprovet för hjälp.

Om hypotesen faller (läckage eller förälder-Hem blir tomt och värdelöst) — **stoppa Ung-release**. Mellan får inte blockeras.

---

## 2. Vad produkten är idag

### 2.1 Mening (FACT + VISION)

Produkten är **inte** ett schemaverktyg. Det är en familjeprodukt som ska göra vardagen lite enklare, lugnare och tydligare.

> First Success = första gången familjen upplever att appen hjälpte dem i vardagen.

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

### 2.2 Konstitution (FACT)

1. Produkten leder.
2. Produkten överraskar inte.
3. Det finns alltid ett nästa steg, eller en tydlig anledning att inget behövs.
4. Efter handling: *jag verkar göra rätt.*
5. Efter registrering ska appen kännas mer färdig än före.

Plus: inga magiska tal i progression.

### 2.3 Vem den är byggd för (FACT)

| Källa | Ålder |
|-------|--------|
| Google Play-deklaration i repo | vuxna + barn **3–12** (`docs/google-play-app-content.md`) |
| App Store-beskrivning i repo | **3–10**, “förskoleåldern” |
| NPF-principer (`barnmeny-v2`) | låsta för **NPF 3–12** |
| Startpaket (`starter-plan-meta`) | `ageMin` 3, `ageMax` **12** |
| Onboarding åldersband | `3-5` · `6-8` · `9-12` · **`13+` finns som input** |
| För dig-mål | max **12**, de flesta 3–9 |
| Skolstart-gate | 11–13 får *Skola vardag* med lågstadiecopy; **inget teenschema** |

**FACT:** Produkten *accepterar* 13+ i onboarding-input. Den *levererar* inte en 13+-upplevelse.

**REJECTED:** att nuvarande store-*rating* i sig blockerar 13+ som teknisk kategori. Se §22.

### 2.4 Vad den medvetet inte är (FACT / VISION)

- Inte ett förälder-dashboard med analytics på Hem
- Inte ett syskonleaderboard
- Inte en butik där stjärnor köps (R-02)
- Inte en fjärde coach
- Inte ett Toca Boca / Animal Crossing-spel
- Inte ett barnformulär / barninställningslabb (C-01)
- Inte skuld vid bruten streak
- Inte login-bonusar (G-01)

---

## 3. Alla inblandade idag

| Roll | Vem | Jobb | Känsla |
|------|-----|------|--------|
| **Barn** | 3–12, ofta NPF | Göra dagen, samla, spara | *Min värld. Jag vet vad jag ska göra nu.* |
| **Förälder (primary)** | Skapade familjen | Bygga, se läge, godkänna undantag | *Det här hjälper oss.* |
| **Medförälder (shared)** | Inbjuden, ev. vissa barn | Samma jobb på sina barn | Utan barn hen inte har länk till |
| **Pedagog / terapeut** | `role: pedagog` | Observation, inte familjeadmin | Professionell, avgränsad |
| **Dual-konto** | Förälder + pedagog | Byter UI-universum | Inte sjätte flik |
| **Familjen** | `family` | Timezone, IAP, Journey | En resa, ett nästa steg |
| **Syskon** | Flera `child` | Egna scheman, egna stjärnor | Ingen jämförelse |
| **Delad enhet** | En iPad | Trusted device, byt barn | Ingen läckande session |
| **Admin** | Intern | Impersonering, bibliotek | Inte UX |

**OQ:** Identitet 13+ — fortfarande `child`+PIN, eller tredje kontotyp? Se §17.1. **Inte** avgjort av GDPR-13.

---

## 4. Förälderns hela upplevelse (idag)

### 4.1 Jobb (VISION, låst IA)

| Flik | Route | Jobb | Inte |
|------|-------|------|------|
| **Hem** | `/dashboard` | Läget, ett nästa steg, undantag | Schemaeditor, analytics |
| **Planering** | `/planning` | Bygga och ändra | Daglig coach |
| **Belöningar** | `/rewards` | Godkänna, kista, stjärnor | Syskonjämförelse |
| **För dig** | `/for-dig` | Problem → färdig rutin | Tom tipslista |
| **Familj** | `/family` | Människor | Push, GDPR, IAP |

**Beslutsregel Hem:** högst en komponent föreslår nästa handling. Godkännanden är *blockerare*.

### 4.2 Dag 0 (FACT + VISION)

Slim signup: namn, e-post, lösen, barnnamn (+ ev. ålder/rutintyp). Familjen får barn + PIN + rutin + standardbelöningar. Success: *Visa barnet*. Handoff till NU/NÄSTA.

**Live:** legacy-wizard och Journey-flaggor default OFF finns kvar. Kravställ mot **målet**.

### 4.3 Morgon 07:15

Hem: läge per barn utan jämförelse; undantag; ett nästa steg eller “inget krävs”; handoff; undantagsbockning åt barnet.

### 4.4 Planering

Veckoschema, bibliotek, särskilda dagar, delsteg, bildstöd, timer, NU/NÄSTA, en-i-taget. **Föräldern slår på stöd; barnet möter resultatet.**

### 4.5 För dig

| Slug | Headline | Ålder i config |
|------|----------|----------------|
| trygga-kvallar | Få lugnare läggningar | 3–5 |
| bra-morgnar | Kom iväg utan morgontjat | 3–6 |
| sjalvstandighet | Få barnet att klä sig själv | 3–7 |
| skolansvar | Få hela skoldagen att flyta | 6–9 |
| samarbete-hemma | Få hjälp med dukning och städning | 4–9 |
| motivation | Hålla motivationen uppe med belöningar | 3–12 |

**FACT-gap:** inget mål täcker 13–18.

### 4.6 Belöningar

Föräldern godkänner väntande inlösen (PA-06), hanterar utbud och följer saldo utan ranking. Stjärnor dras först vid godkännande. Avslag utan skam-UI. Manuella stjärnor = undantag.

### 4.7 Familj, barnprofil, inställningar

Familj = människor. Barnprofil (förälder): namn, foto, födelsedag, PIN, vy, timers, minimal UI, framsteg. Inställningar i avatar: push, GDPR, radera, IAP, pedagogvy.

### 4.8 Medförälder och två hem

Eget vuxenkonto. Åtkomst via `parent_child`. Boendeschema speckad (FEAT-1); inte nödvändigtvis live i full form. Hem är neutrala. **OQ:** två hem + Mitt — vems synlighet? §17.8.

### 4.9 Pedagog

Eget UI: Översikt · Idag · Historik · Inställningar. `pedagog_notes` (humör, sömn, …). Ingen familjeadmin. Rapportlänk tidsbegränsad. G-07: ingen barn-facing pedagog-gamification. På Ung: P-01/P-02.

### 4.10 Notiser, e-post, betalning

Push till förälder idag (påminnelse, PIN, inlösen). Native IAP only. Stjärnor köps inte. Ung: S-07 + U-13 — ingen kopia av Mitt.

### 4.11 Förälderns kontrakt

Produkten säljer **lättnad 07:15**, inte kontroll. Misslyckande idag: flera nästa steg, jargong, För dig som inte förklarar, “ställ in klart först”.

---

## 5. Barnets hela upplevelse (idag)

### 5.1 Inloggning (FACT)

Jag är barn → välj profil → 4-siffrig PIN → Idag. Lockout + förälder-notis. C-01: inga formulär utöver PIN. Trusted device. Förälder-exit via vuxen-PIN.

### 5.2 Tre världar (VISION)

Idag (~80 %) · Min värld/Skattkammare · Mina personer. Landning alltid Idag. Live har fortfarande classic vs magic nav — kravställ mot **mål-IA**.

### 5.3 Idag

Inom fem sekunder: vad nu, vad får jag, vad är klart, vad sen. En primär handling. Stöd föräldern slår på: NU/NÄSTA, en-i-taget, delsteg, bild, timer, minimal UI. Efter sista: firande → lugn.

### 5.4 Bocka av (FACT)

Optimistisk animation ≤2 s → server complete → ev. förälder-push/SSE. Saldo = klara + manuella − inlösta. *Du klarade det!* före siffra.

### 5.5–5.7 Skatt, samling, personer

Stjärnburk + mål + en handling. Samling inte open-world. Mina personer = tillhörighet, inte inställningar.

### 5.8 Vad barnet aldrig gör (FACT / POS)

Inte redigera schema, skapa belöningar, se förälder-API, köpa stjärnor, fylla inställningslabb, jämföras mot syskon.

**Spänning mot Ung:** U-03 (skapa Mitt) kräver C-01-omtolkning via ADR — inte smyg.

### 5.9 Olle, 7 — referensdag som inte får bli sämre

PIN eller trusted device → NU = klä på dig → bocka → stjärnbloss → Skatt → fråga inlösen → mamma godkänner. Verklig filmkväll, inte loot box.

---

## 6. Delade system (familje-OS)

Återanvänd, kopiera inte.

| System | Återanvänd? | Anmärkning |
|--------|-------------|------------|
| Family + parent_child | Ja | Synlighet per länk, inte “alla vuxna” |
| Child-rad + födelsedag | Ja | Föreslår **presentation**, inte access |
| Schema + specialdag | Ja | Internationellt: undvik hårdkodad skolform |
| Daily log | Ja | Completion ≠ läcka av privata objekt |
| Stjärnor + rewards | Valfritt | Styrs av `reward_model`, inte ålder ensam |
| Journey | Ja (**REK**) | Samma motor, nya experiences — **NOT_VERIFIED** att det räcker för Ung |
| För dig | Ja | Nya mål; filtrera på presentation + policy |
| Trusted device / PIN-gate | Ja | Ung-identitet är OQ |
| IAP | Ja | Familjen betalar |
| Pedagog + rapport | Ja | Rollen pedagog ger inte implicit Mitt |
| Boendeschema | Ja | Viktigare när autonomi ökar |
| `child_view_config` | Ja | Presentation/stöd — inte privacy |

---

## 7. Gapmatris (behov vs idag)

| Behov | 3–8 | 9–12 | 13–15 | 16–18 |
|-------|-----|------|-------|-------|
| NU/NÄSTA, bild, en-i-taget | Starkt | Finns; ska kunna skruvas | **Ska kunna kombineras med Ung-policy** | Samma |
| Förälder bygger, barn utför | Starkt | Börjar skava | Fel *default-policy* | Fel |
| Stjärnor + saga-copy | Starkt | Tonmognad | Default OFF (**NOT_VERIFIED**) | Nej som identitet |
| C-01 inga barnformulär | Rätt | Rätt | Konflikt — få självval via ADR | Konflikt |
| Implicit full förälderinsyn | Trygghet | Börja dämpa | Känns som övervakning | Oacceptabelt som default |
| Startinnehåll | Finns | Mellanstadie svagt | Saknas | Saknas |
| NPF-stöd | Kärna | Kärna | Kärna, **orthogonal** | Kärna |
| Store-deklaration vs löfte | Match | Match | Får inte lovas förrän Ung finns | Samma |

**Läsning:** 9–12 = innehåll/ton **och/eller** tidig kontraktsskov (**H1, NOT_VERIFIED**). 13+ = kontrakt (ägande/delning), inte “svårare schema”.

---

## 8. Varför inte “samma app med svårare scheman”

### 8.1 Skifte (produktinferens + evidens)

| Yngre default | Äldre default |
|---------------|---------------|
| Struktur *ges* | Struktur *förhandlas* |
| Vuxen minskar osäkerhet | Implicit full insyn är fel *default* när personen ska äga mer (**REK**, inte kausal sanning) |
| Stolthet = klarade momentet | Stolthet = det här är mitt |
| Belöning nära och konkret | Frihet, tid, förtroende — **utan ny valuta i v1** |

**EVIDENCE (teori, inte UI-bevis):** Self-Determination Theory beskriver autonomi, kompetens och tillhörighet som grundbehov (Ryan & Deci 2000). Dagens app är stark på kompetens och tillhörighet; autonomi är medvetet låg. Teorin **stödjer designriktningen** men bevisar **inte** att vår UI- eller permissionsmodell fungerar.

**EVIDENCE (parental monitoring / knowledge):** Stattin & Kerr (2000) och Kerr, Stattin & Burk (2010): “parental monitoring” är inte ett enhetligt konstrukt. Föräldrars kunskap kommer ofta från ungdomens *egen disclosure*, inte bara från kontroll. **Inte** generell kausal sanning att “övervakning skapar konflikt”.  
**REK:** prioritera transparent och frivillig delning framför dold informationsinhämtning.  
**NOT_PROVEN:** objektbaserad sharing är inte visad förbättra relation, retention eller välmående.

### 8.2 Språk

Överlever inte som Ung-default: sagostund, “barnet”, “be en vuxen”, stjärnburken som enda ekonomi.  
Överlever: vad nu/sen, du klarade det, ändra senare, ingen skam, en sak i taget.

### 8.3 Konstitution

| Regel | Håll | Spänning |
|-------|------|----------|
| C-01 | Håll | **OQ/ADR:** få självval är inte vuxenadmin-labb |
| P-02 | Håll | UI: *du*, inte “barnet”, när presentation=ung |
| PA-06 | Håll | Godkännande = undantag, inte vardagslås |
| G-01, R-02 | Håll hårdare | Ingen XP, inga köpta stjärnor |
| En Journey | Håll | Inte en coach per läge |
| Inget Hem-dashboard | Håll | Inga teen-grafer |

---

## 9. Huvudmodell: presentation skilt från policy

### 9.1 Två lager (REK, koncept — inte DB-fält)

```
presentation_mode ∈ { liten, mellan, ung }
        styr: copy, densitet, visuell ton, nav-default, defaultstöd

policies / capabilities (konceptnamn, inte schema):
        self_planning
        private_items
        family_commitments
        explicit_sharing
        support_profile   ← orthogonal (NU/NÄSTA, timer, pictogram, …)
        reward_model
```

Åtkomst härleds från: autentiserad identitet + relation + objektägande + objekttyp + explicit delning + ev. legal/market policy.  
**Inte** generella personnivåer `parent_visibility` / `pedagogue_visibility` (high/medium/low). Rollen `parent` eller `pedagog` ger **inte i sig** generell insyn i ungdomens privata objekt.

**Progression av policy, inte av ålder:**

```
Göra åt mig        parent-owned schedule, låg self_planning
Göra tillsammans   family_commitments + ev. förslag från den unga
Äga själv          self_planning + private_items + explicit delning
```

Födelsedag / `ageBand` **får föreslå** `presentation_mode`.  
De **får inte ensamt** styra access, privacy eller dataägande.

### 9.2 Kombinationsregeln (P0-krav på modellen)

| | Låg support_profile | Hög support_profile |
|--|---------------------|---------------------|
| Policy: Göra åt mig | Olle 7 default | Olle 7 med extra timer |
| Policy: Äga själv | Noah 14, textlista | **Noah 14 + NU/NÄSTA + pictogram + fokus** |

Cellen nere till höger är **icke-förhandlingsbar** i modellen. Annars blir NPF = “yngre barn”.

### 9.3 Default-förslag (REK, inte access)

| Ålder (förslag) | Default presentation | Default policy-riktning |
|-----------------|----------------------|-------------------------|
| ~3–8 | liten | Göra åt mig |
| ~9–12 | mellan | Göra åt mig, mer med-planering P1 |
| ~13–15 | ung | Äga själv + Vårt synligt |
| ~16–18 | ung | Samma yta, hårdare privat default |

Förälder kan flytta presentation ett steg med preview. Hopp liten→ung kräver varning. Presentation-byte är **förslag**, inte tyst rights-change (S-10). **Policy-byte är separat OQ** (vem godkänner `private_items`?).

### 9.4 Internationellt

Hårdkoda inte svensk skolform, “mellanstadium”, vårdnadsmodell eller 13 som policy-tröskel. Landsskillnader = senare policy/config. **LEGAL REVIEW** per marknad. Copy/policy får ändras utan fork av kärndomänen.

---

## 10. Objektägande — inte fältvis ACL

### 10.1 Tre begripliga gränser (REK, Ung v1 / spike)

**Mitt**  
Den unga äger objektet. **Privat default — inte implicit delat.** Rollen parent ger inte automatisk access. Exempel: *Matteprov fredag*, *Plugga 25 min*, *Fotboll*.  
Undantag får bara komma från explicit produktpolicy, legal policy eller säkerhets-/safeguardingkrav där tillämpligt — **aldrig** som dold sidoeffekt. Inget safeguarding-feature uppfinns här. **LEGAL REVIEW** för ev. obligatorisk vårdnadshavarinsyn (§17.12). **Inte** “föräldern har aldrig läsrätt” innan legal/account-modellen är färdig.

**Vårt / Familjeåtagande**  
Överenskommen sak som *relevanta* familjemedlemmar får se (via `parent_child` + ev. boende, inte “alla vuxna”). Exempel: *Middag 18*, *Hämta syskon*, *Ta ut hunden*.

**Delat stöd**  
Den unga *aktivt* delar ett Mitt-objekt för hjälp. Exempel: *Visa mamma matteprovet* · *Påminn mig torsdag* · *Jag vill ha hjälp att komma igång*. Delning med pedagog där tillåtet.

Ingen generell per-fält-matris Bara jag / Familj / Pedagog i v1.

### 10.2 Läckageförbud inkl. inference (P0 — princip, inte implementation)

Ett privat objekts **existens eller innehåll** ska inte kunna härledas av obehörig via:

| Kanal | Förbjudet exempel |
|-------|-------------------|
| API | Parent-endpoint returnerar titel, antal eller timestamps på Mitt |
| Hem / parent dashboard | “Noah har 3 privata saker” / tom rad som röjer namn |
| Pedagogvy / pedagogue dashboard | Lista eller badge på osedda Mitt-objekt |
| Notis | “Noah klarade Matteprov” till förälder utan delning |
| SSE / event streams | Event som röjer Mitt-titel, existens eller status |
| Analytics | Event med titel, eller `private_item_count` per barn |
| Activity summary | Sammanfattning som röjer privata objekt |
| Rapport / export | Aggregering eller fil som röjer Mitt |
| Sök | Träff på privat titel för obehörig |
| Cache / offline | Lokal kopia läsbar av annan session/roll |
| Audit / historik som användare ser | Synlig logg som röjer Mitt för obehörig |

**Acceptans:** en testare med förälder-JWT ska inte kunna *läsa eller härleda* att objektet heter Matteprov eller ens att det finns, utöver explicit delning och ev. LEGAL REVIEW-undantag (inte uppfunna här). Detta är **P0-krav**, inte FACT.

### 10.3 Vårdnadshavares obligatoriska insyn

**OQ 12 / LEGAL REVIEW:** vilken information en vårdnadshavare *juridiskt eller produktmässigt måste* kunna se trots privat default är **NOT_VERIFIED**. Uppfinn inte “föräldern ser aldrig något”. Uppfinn inte heller full spegling.

---

## 11. Krav

Krav-ID: `L` Liten · `M` Mellan · `U` Ung · `F` Förälder · `P` Pedagog · `S` System · `K` Kvalitet.  
P0 = måste för *den* leveransen · P1 = samma år · P2 = senare.

### 11.1 Liten — bevara

| ID | Krav | P |
|----|------|---|
| L-01 | Idag default: bild, NU/NÄSTA, en primär handling | P0 |
| L-02 | Inga barnformulär, ingen schemaedit | P0 |
| L-03 | Firande ≤2 s, hoppbart, ingen skam | P0 |
| L-04 | Skatt + stjärnor default | P0 |
| L-05 | PIN + ev. trusted device | P0 |
| L-06 | Förälder äger schema, belöningar, stöd-toggles | P0 |
| L-07 | NPF-stöd förstklassigt | P0 |
| L-08 | Ingen syskontävling | P0 |

**Acceptans:** Olle-test oförändrat efter Mellan/spike.

### 11.2 Mellan — första kommersiella leverans

Mellan v1 behåller **huvudsakligen** Liten-kontraktet (förälder fortfarande huvudbyggare). Annan *presentation*. **Blockeras inte av Ung.**

Designkrav: progressionen mot “Göra tillsammans” ska kunna valideras och införas senare **utan ny kärnmodell**. M-06 (förslag från barnet) är början på autonomiprogressionen — inte extra pynt. Mellan får **inte** bli endast “Liten med mörkare färger och vuxnare copy”.

**HYPOTES / NOT_VERIFIED (H1):** Är churn 9–12 faktiskt ett tonproblem, eller börjar även ägarskapskontraktet skava?

| ID | Krav | P |
|----|------|---|
| M-01 | Samma tre världar, samma loop | P0 |
| M-02 | Copy utan sagodominans: läxor, väska, träning, skärm, eget rum | P0 |
| M-03 | Startschema för skolålder 9–12 (land-lokaliserbart namn; inte Pyjamas-first) | P0 |
| M-04 | För dig-mål för 9–12: läxor, skärmtid-avtal *som rutin*, träning — **inte** veckopeng | P0 |
| M-05 | Texttyngre Idag valfritt; bildstöd kvar | P0 |
| M-06 | Föreslå aktivitet/belöning; förälder godkänner | P1 |
| M-07 | Stjärnor kvar; copy mognar | P1 |
| M-08 | Samling mer diplom/årbok än nalle | P1 |
| M-09 | Hem-copy utan baby-ton | P1 |
| M-10 | NPF-stöd förstklassigt | P0 |

**Acceptans (Jenny + Noah 11):** 5 s på Idag utan förskolekänsla; minst ett För dig-mål som inte är förskola; Liten-syskon oförändrat.

M-04 veckopeng från rev. 1 **stryks** (scope + OQ 15).

### 11.3 Ung — kontrakt, inte habit tracker

**Känsla:** *Det här är mitt. Vuxna ser det vi kommit överens om, eller det jag delar.*

P0-yta: **Min dag** + **Vi hemma**. Inte Skatt first. **Inte Mina mål.**

| ID | Krav | P |
|----|------|---|
| U-01 | Min dag + Vi hemma. Inget mål-P0 | P0 |
| U-02 | Copy du/jag i ung presentation | P0 |
| U-03 | `self_planning`: skapa Mitt-objekt utan godkännande (**REK: ja**, OQ 3) | P0 |
| U-04 | Förälderschema → Vårt, inte hela dagen | P0 |
| U-05 | Objektgränser Mitt / Vårt / Delat stöd — **ingen fält-ACL** | P0 |
| U-06 | Inlösen: inte P0. Privilegieavtal = P2/OQ | P2 |
| U-07 | `reward_model` default OFF *när ung-policy antagits*; kan slås på. **Ingen ny valuta.** Får inte smygas in via födelsedag (S-10). **H4 / NOT_VERIFIED** | P0 |
| U-08 | Identitet: PIN *eller* annat — OQ 1. Inte djuremoji som enda identitet | P1 |
| U-09 | Pedagog/humör inte som spelstatus. Delning aktiv | P0 |
| U-10 | Hög `support_profile` + ung-policy ska kunna samexistera | P0 |
| U-11 | För dig till förälder: skärmtid-avtal, struktur, två hem — P1 | P1 |
| U-12 | För dig till den unga | P2 / OQ (en-coach) |
| U-13 | Notis till den unga om hens objekt. Ingen *implicit* förälder-kopia på Mitt (LEGAL REVIEW-undantag inte uppfunna) | P0 |
| U-14 | Hem: Vårt-status, inte live-karta över Mitt | P0 |
| U-15 | Chatt/social/feed förbjudet v1 | P0 |
| U-16 | Hälsa, mens, vikt, terapi, GPS förbjudet | P0 |
| U-17 | Explicit delning: visa / påminn mig / jag vill ha hjälp | P0 |
| U-18 | Mina mål = hypotes, inte P0 | — |

**U-06 från rev. 1** (auto-inlösen) **nedprioriterad** — nytt motivations-/avtalssystem.

### 11.4 Ung 16–18

Samma yta. Hårdare privat default. Inget nytt innehållspaket (körkort, CSN) i v1.

| ID | Krav | P |
|----|------|---|
| Y-01 | Default Mitt för egna; Vårt för åtaganden | P0 (när Ung finns) |
| Y-02 | Konto/e-post = OQ 1 + LEGAL | P0 beslut |
| Y-03 | Innehåll senare | P2 |
| Y-04 | Presentation/policy-sänkning inte tyst — se S-10 | P0 |
| Y-05 | Lämna familj / export | P1 / OQ 13 |
| Y-06 | Ingen barnövervaknings-marknadsföring | P0 |

### 11.5 Förälder när blandade policies finns

| ID | Krav | P |
|----|------|---|
| F-01 | Ett Hem, blandade barn, utan blandade metaforer som krockar | P0 |
| F-02 | Ett Journey-steg för *familjen* | P0 |
| F-03 | Planering: Vårt vs (synliga) egna — inte en hög | P0 när Ung finns |
| F-04 | Ingen ny teen-valuta på Belöningar | P0 |
| F-05 | För dig filtreras på presentation + åldersförslag, inte sagomål på ung-policy | P0 |
| F-06 | Familj visar presentation *och* att policy är separat | P0 när båda finns |
| F-07 | Ingen teen-analytics-flik | P0 |
| F-08 | Medförälder ärver inte mer än länk + Vårt + delat | P0 |
| F-09 | Onboarding ≥13: lova inte förskole-handoff som enda success | P0 |
| F-10 | 07:15-testet | P0 |
| F-11 | Insyn = explicit delning + Vårt; inte “ser mindre för att hen fyllt år” | P0 |

### 11.6 Pedagog

| ID | Krav | P |
|----|------|---|
| P-01 | Bara Delat stöd / explicit till pedagog | P0 |
| P-02 | Inga humörskalor som Ung-default | P0 |
| P-03 | Rapport: den unga ska veta att den skapats när policy = äga själv | P1 |

### 11.7 System

| ID | Krav | P |
|----|------|---|
| S-01 | Ingen butikstext “förskoleåldern” samtidigt som 13+ *säljs som lämplig* | P0 |
| S-02 | Legal grund, samtyckesålder, avtalspart per marknad — **LEGAL REVIEW**, inte hårdkodad 13 | P0 beslut |
| S-03 | Deklarerad store-målgrupp ska matcha faktisk upplevelse (Play Families + Apple) | P0 |
| S-04 | Inga nya dataklasser (hälsa, plats, meddelanden) utan ADR | P0 |
| S-05 | Child JWT når inte förälder-API | P0 |
| S-06 | **Servern är auktoritet för policies och rättigheter.** Presentation/CSS/åldersläge får inte ensamt avgöra access, privacy eller ägande | P0 |
| S-07 | Analytics utan PII; inga teen scores; inga privata räkneverk | P0 |
| S-08 | IAP: familj betalar, stjärnor köps inte | P0 |
| S-09 | Spike måste visa nolläckage i Noah-scenariot innan Ung-release | P0 |
| S-10 | **Explicit transition:** ålders-/livsfasövergångar får inte tyst förändra ägarskap, privacy, delning eller behörighet. Förändringar ska vara explicita, begripliga för berörda användare och reversibla där legal/policy tillåter. Ålder får föreslå presentation eller transition — inte genomföra dold rättighetsändring. (Konstitution: produkten överraskar inte.) | P0 |

---

## 12. Ung-upplevelse (diskussion, inte wireframe)

**P0:** Min dag · Vi hemma.  
**Inte P0:** Mina mål.

**Min dag** kan vara *samma värld som Idag* med annan presentation — föredra återanvändning framför ny flik (**REK**, motverka nav-inflation).

- Vårt: middag, hämtning
- Mitt: matteprov, fotboll (privat default; inte implicit delat)
- Delat stöd: efter aktiv handling
- Fokus/NU/NÄSTA om `support_profile` säger så
- Klart = verklighet. Appen går ur vägen. Ingen konfetti-default.

**Vi hemma** ≈ Mina personer: vilka som är med, vad som är Vårt denna vecka. Inte feed. Inte “mamma tittar”.

**Hem (förälder):** Elsa 3/5 morgon · Noah 1 Vårt kvar · inget Mitt-läckage.

---

## 13. Motivation

**Ung v1-loop:** jag bestämde/accepterade → jag gjorde → jag ser att det är gjort → appen går ur vägen.

Stjärnor: OFF som default när `reward_model` = off (kopplat till ung-policy, **inte** till dagen man fyller 13). Kan slås på som familjestöd.

**Ingen ersättningsvaluta i v1:** inte frihetspoäng, skärmtidsvaluta, veckopengspoäng, trust score, XP, teen currency.

**Förbjudet i alla band:** login-bonus, loot box, leaderboard, köpta stjärnor, streak-skam, blockerande firande.

**SDT som designstöd, inte bevis:** loopen ovan siktar på autonomi (jag valde), kompetens (jag gjorde), tillhörighet (Vårt). Att *denna* UI ökar SDT-behov är **NOT_VERIFIED**.

---

## 14. Innehåll

**Mellan P0:** skolvardag 9–12 (lokaliserbart); kväll utan sagostund som kärna.

**Ung spike/P0:** familjeåtaganden-mall; den unga äger egna rader. Skärmtid som *avtalad rutin* kan vänta till P1. Två-hem kopplas när FEAT-1 + spike samexisterar.

**Inte v1:** körkort, fest, dating, alkohol, terapi, veckopeng-motor.

---

## 15. Utanför scope

- Ny app / bundle-id
- Socialt, klassrum, chat, skolplattform
- GPS, hälsa, wearable
- Fjärde coach, star IAP, habit tracker
- Döda Liten
- POS-ändring utan ADR
- Kod i detta uppdrag
- Fältvis ACL
- Ny valuta
- Marknadsföra 13+ innan Ung finns

---

## 16. Kommersiellt filter (REK)

Designa **inte** efter “dyr app” eller hypotetisk exit.

Designa efter: faktisk familjenytta, tillit, vardagseffekt, låg friktion, kontinuitet över år, flera barn, svårighet att bytas ut mot **gratis reminders + kalender + vanlig kommunikation**.

Pris/packaging = separat beslut.

**Moat-test (varje större Ung-feature):** Varför ska en familj använda den här produkten istället för Apple Reminders, Google Tasks/Keep, Apple/Google Calendar, en familjekalender, vanliga push/SMS och förälderns muntliga samordning?

**Differentiering (HYPOTES / NOT_VERIFIED, inte “vi har privata todos”):** familjeåtaganden + autonomiövergång + NPF-stöd + blandade syskon + ett gemensamt familje-OS. En feature som lika gärna hör hemma i Apple Reminders ska **inte** automatiskt in.

### 16.1 Frågor varje ny capability måste klara

**International**

- Begripligt utanför Sverige?
- Bundet till svensk skola/familj?
- Copy, kalender, legal, policy utan fork?
- Olika samtyckesåldrar (13 vs 16) utan ny kärna?

**Moat**

- Bättre än gratis Reminders + Tasks/Keep + kalender + SMS/muntlig samordning — inte bara “bättre än Todoist”?
- Förstärker familje-OS (åtaganden, autonomiövergång, NPF-stöd, blandade syskon, Journey)?
- Egen domän eller feature-hög / privat todo?
- Retention när personen växer?
- Värde av att *hela* familjen är kvar — inkl. betalande vuxen när implicit insyn försvinner (H7)?

**Acquisition-hygien** (lång sikt, inte sprintskäl)

Tydlig domän, dokumenterade policies, config för land, verifierbar säkerhet, mätbar nytta, låg skuld. Inga specialvägar som kräver grundaren.

### 16.2 Kommersiella risker (hittade)

| Risk | Allvar |
|------|--------|
| Ung blir generic todo / Reminders-kopia → ingen moat | Hög om Mina mål/XP eller “privata todos” smygs in |
| Betalande vuxen tappar WTP när implicit insyn försvinner (H7) | Hög — **NOT_VERIFIED**; kan kräva annan packaging |
| Mellan uteblir medan Ung byggs → 9–12 churn fortsätter | Hög — därför Mellan först |
| Lovar 3–18 i butik innan Ung finns → recension + deklarationsbrott | Hög |
| Två appar → dödar Hem | Hög |
| Familjer lämnar p.g.a. ton — eller p.g.a. ägarskapskontrakt (H1) | Medium — **NOT_VERIFIED** |
| Internationell fork på “mellanstadium” / 13-konto | Medium |

**REK kvar:** största *troliga* vinst per vecka är Mellan (samma betalande förälder). Det är en **hypotes**, inte FACT.

---

## 17. Open Questions (grundare)

Agent får inte gissa. Olösta beslut tas **inte** bort för att dokumentet ska se färdigt ut. Inga svar uppfinns här.

1. **Ungdomsidentitet / kontomodell.** `child`+PIN vs tredje kontotyp / e-post. GDPR-13 avgör **inte** detta. Legal/security (verifiering, avtalspart, rättslig grund) ingår. **LEGAL REVIEW.**
2. **Privat default 13–15 jämfört med 16–17.** Samma modell, eller hårdare default för 16–17? REK i §9.3 är förslag, inte beslut.
3. **Vilka objekt får den unga skapa helt själv?** REK: ja för Mitt (U-03). Inte låst.
4. **Vem får skapa ett familjeåtagande (Vårt)?** Ung, vuxen, båda?
5. **Måste den unga acceptera ett nytt Vårt**, eller kan vuxen lägga det direkt?
6. **Kan Delat stöd återkallas?** Vad händer med redan mottagen historik? Vad händer om relationen tas bort? **Ingen auktoritativ policy i detta dokument — lämnas olöst.**
7. **Vad får pedagog exportera eller bevara** efter Delat stöd / när relationen upphör?
8. **Vad händer med privata objekt** om familjerelationen ändras (länk tas bort, två hem, ny vårdnadshavare)?
9. **`presentation_mode`:** automatisk förändring eller endast förslag? (S-10: aldrig tyst rights-change.)
10. **Hur sker transition 12→13 utan surprise?** Vem ser vad, vem godkänner, vad är reversibelt?
11. **Vilka policies är produktkonstitutionella** och vilka är marknadsspecifika? Vilka capabilities följer policy vs presentation? Vem slår på NPF-stöd utan att sänka privacy?
12. **Vilken vårdnadshavarinsyn kan vara juridiskt obligatorisk** i olika marknader? **LEGAL REVIEW.** Uppfinn inte noll eller allt.
13. **Exit / export / separation vid 18+.**
14. **Stjärnor OFF default** vid ung-policy — fortsatt produktantagande (**NOT_VERIFIED**, H4).
15. **Veckopeng / IRL-pengar** — fortsatt utanför v1.
16. **När får 13+ marknadsföras i butik?** Upplevelse + deklaration + ev. Families/Kids måste matcha.
17. **Vad krävs för att den betalande vuxna ska uppleva fortsatt premiumvärde** när implicit insyn försvinner? (H7)

**Språk / yta (olöst, inte build-spec):** UI-namn för presentation (inte “barnläge 3”); om “Mitt / Vårt / Delat stöd” fungerar per språk (**NOT_VERIFIED**); pedagog på gymnasiet — in eller ut tills P-krav sitter.

---

## 18. Diskussionsprotokoll

```
OENIG OM:
VARFÖR:
ALTERNATIV: [ett]
VAD GRUNDARE MÅSTE LÅSA: [OQ n]
VAD SOM KAN LÅSAS NU: [krav-ID]
```

Attackera särskilt: presentation≠policy; objektgränser; Mellan-först; stjärnor OFF; ingen social; explicit delning; samma Journey.

**Motförslag-test:** blir Olle 7:s morgon sämre? Om ja — underkänn.

---

## 19. Produkthypoteser (inte krav)

Ingen framgångssiffra hittas på.

| ID | Hypotes | Om falsk |
|----|---------|----------|
| H1 | Churn ~9–12 är *primärt* ton/copy — **eller** ägarskapskontraktet börjar redan skava | Om kontraktet skaver räcker inte Mellan-copy; då behövs tidig autonomiprogression (inte Ung-release) |
| H2 | Mellan ökar retention 9–12 | Stoppa vidare Mellan-yta; mät annat |
| H3 | 13–15 värderar Mitt + Vårt | Ung-release stopp |
| H4 | Stjärnor OFF ökar Ung-acceptans | Tillåt ON default i testarm |
| H5 | Explicit delning räcker för föräldernytta | Hem blir värdelöst → omdesign eller inget Ung |
| H6 | NPF-stöd går att återanvända med vuxnare presentation | Annars risk att NPF = liten |
| H7 | **Fortsatt premiumvärde för betalande vuxen:** när ungdomens privata aktivitet inte längre är implicit synlig upplever den betalande vuxna fortfarande tillräckligt värde från familje-OS:et — familjeåtaganden, explicit stöd, blandade syskon, Journey och vardagskoordination — för att vilja fortsätta använda och betala | Ung kan behöva annan packaging, annan vuxennytta, eller kanske inte höra till samma kommersiella erbjudande — trots att privacyarkitekturen fungerar |

Framtida build-spec ska ange: baseline, mätetal, stop/go, guardrails, segment per presentation/policy — **inga känsliga teen scores**.

---

## 20. Kvalitetstester (dokumentet måste klara)

**Olle 7:** ingen försämring av Idag, NU/NÄSTA, stjärnor, Skatt, handoff.

**Noah 11:** ingen förskolekänsla; bild/stjärnor kvar om de hjälper.

**Noah 14:** Mitt privat default + Vårt synligt + Delat stöd samtidigt; nolläckage inkl. inference.

**Noah fyller 13 på natten (S-10):** ingen vuxen eller ungdom vaknar till att tidigare data plötsligt blivit privat/offentlig, eller att API-behörigheter förändrats, utan en uttrycklig transition.

**Noah 14 + hög NPF-support:** samma rätt till privacy; NU/NÄSTA, timer, pictogram, delsteg, en sak, reducerad stimuli, förutsägbarhet. Stöd är **inte** bevisad klinisk effekt (**NOT_VERIFIED**).

**Blandad familj 7+11+14:** ett family, ett Hem, en Journey, ett nästa familjesteg; olika presentation/stöd/ägande.

**Två hem:** vuxna får inte samma insyn bara för att båda är vuxna.

**International:** samma kärndomän i t.ex. Sverige, Finland, Irland utan fork. Policy/config bär ålders- och samtyckesskillnad.

---

## 21. Legal (LEGAL REVIEW — inte produkt-FACT)

### 21.1 Vad 13 år *är* och *inte* är

**FACT (primärkälla):** GDPR art. 8 — när rättslig grund är *samtycke* (art. 6.1 a) för informationssamhällets tjänster direkt till barn är default 16 år; medlemsstater får sänka till lägst 13. Art. 8.3: påverkar **inte** allmän avtalsrätt.

**FACT:** Sverige, lag (2018:218) 2 kap. 4 § — barn som *bor i Sverige* kan själva samtycka till ISS från 13 år; under 13 krävs den med föräldraansvar. [riksdagen.se SFS 2018:218]

**FACT:** IMY — kommersiella ISS till barn som fyllt 13 och bor i Sverige får behandla med *barnets* samtycke; samtycke är ofta *olämplig* grund; ojämlikt maktförhållande undergräver giltighet. [imy.se, uppdaterad 2026-06-15]

**FACT:** Irland, Data Protection Act 2018 s. 31 — ålder för art. 8 är **16**. [irishstatutebook.ie]

**FACT:** Finland, Tietosuojalaki 1050/2018 5 § — ISS direkt till barn, samtycke, barnet minst **13**. [Finlex / valtioneuvosto]

**REJECTED:** 13 = eget konto, avtalsförmåga, betalning, rätt att isolera data från vårdnadshavare, automatisk vuxenstatus.

### 21.2 Per marknad (senare, checklista)

Rättslig grund per behandling · samtyckesålder · verifiering · avtalspart · barnets/ungdomens rättigheter · vårdnadshavares roll · retention/delete/export · om pedagogdelning ändrar grund/ansvar.

Familjeapp med förälder-konto använder ofta **avtal / berättigat intresse** — inte barnets ISS-samtycke. **NOT_VERIFIED** för denna produkt tills legal review. Hårdkoda inte svensk modell.

### 21.3 Internationell produktprincip

Undvik antaganden om: svensk kärnfamilj, svensk skolmodell, samma vårdnadshavarrätt i alla marknader, samma samtyckesålder, samma definition av pedagog/stödperson, samma rättigheter vid 13 / 16 / 18.

Internationalisering ska kunna ändra **copy/policy utan fork** av kärndomänen.

**NOT_VERIFIED:** terminologin och den kulturella förståelsen av “Mitt / Vårt / Delat stöd” måste valideras per språk/marknad även om den underliggande domänmodellen är generell.

---

## 22. App Store / Google Play

Skilj: (1) produktmålgrupp (2) deklarerad target audience (3) content/age rating (4) Kids/Families-program.

**FACT (Play):** deklarera målgrupp; appar som inkluderar barn ska följa Families Policy; välj bara grupper appen *faktiskt* är designad för. Grupper inkluderar 5 and under, 6–8, 9–12, **13–15**, **16–17**, 18+. 13–15/16–17 *kan* räknas som barn i vissa länder. Google granskar att deklarationen stämmer. [support.google.com, answer/9867159]

**FACT (Apple):** Kids-kategori = appar för **11 år och yngre**; band 5 and under / 6–8 / 9–11; separat från vanlig age rating; Made for Kids kan inte ändras efter godkännande. [developer.apple.com/app-store/categories]

**REK:** marknadsför inte 13+ förrän Ung finns och klarar kraven.  
**REJECTED som FACT:** “store rating blockerar 13+”.

---

## 23. Evidensregister

| Påstående | Status | Källa/typ | Produktkonsekvens |
|-----------|--------|-----------|-------------------|
| Autonomi/kompetens/tillhörighet är relevanta designbehov | **EVIDENCE** (teori) | SDT, Ryan & Deci 2000 | Stödjer riktning; **bevisar inte** UI eller permissionsmodell |
| Parental monitoring/knowledge är inte ett enhetligt konstrukt; disclosure är en viktig källa till kunskap | **EVIDENCE** | Stattin & Kerr 2000; Kerr et al. 2010 | **REK:** frivillig delning. **Inte** “övervakning skapar konflikt” som kausal sanning |
| Objektbaserad sharing förbättrar relation/retention/välmående | **NOT_PROVEN** | — | Spike; mät H3/H5/H7 |
| Visuell struktur / exekutivt stöd / förutsägbarhet används i vissa populationer och sammanhang | **EVIDENCE** (praktik + delvis forskning) | Etablerad NPF-nära design; **inga universella effektpåståenden** | Orthogonal `support_profile` |
| Produktens NU/NÄSTA, timer och pictogram ger klinisk effekt | **NOT_VERIFIED** | Ingen effektstudie här | Inget medicinskt löfte |
| “Bildstöd hjälper ungdomar med NPF” som universell sanning | **REJECTED** som generell kausalitet | — | Erbjud stöd; lova inte effekt |
| 13 = eget konto enligt GDPR | **REJECTED** | GDPR art. 8; SFS 2018:218 2:4; IE DPA s.31 | OQ 1 + LEGAL REVIEW |
| Store saknar 13+-fack | **REJECTED** | Play 13–15 / 16–17 | Deklaration ska matcha app |
| Stjärnor OFF är rätt default från 13 | **NOT_VERIFIED** | Produktantagande | H4; knutet till ung-policy, inte födelsedag |
| Churn 9–12 är främst ton | **NOT_VERIFIED** | Ingen mätning här | H1 — kan vara ägarskapskontrakt |
| Explicit delning räcker för förälder / H7 WTP | **NOT_VERIFIED** | H5, H7 | Spike + mätning; inga framgångssiffror |
| Mitt / Vårt / Delat stöd är rätt mental modell | **NOT_VERIFIED** | Ej användartestat; ej validerat per marknad | Testa språk och kultur |
| Ett gemensamt familje-OS räcker till 18 | **NOT_VERIFIED** | Strategisk hypotes | Inte FACT |
| Samma Journey-motor räcker för Ung | **NOT_VERIFIED** | REK tills Ung-kontraktet testats | Inte FACT |

Vetenskap ska **falsifiera och informera**, inte dekorera beslut.

---

## 24. DoD för denna spec-runda

Spec-rundan kan **stängas** (nästa fas = innehåll/ADR/legal/spike — inte mer spec-rewrite) när allt nedan är sant i dokumentet:

1. Presentation och access är separerade.
2. Ingen födelsedag / ageBand / recommended presentation kan orsaka tyst rights/privacy-transition (S-10).
3. Privat objektmodell är sammanhängande; legal exceptions är **inte** uppfunna.
4. Inference leakage är P0.
5. Liten-regression är förbjuden.
6. Mellan är kommersiellt scoped; autonomiprogressionen är erkänd (inte bara ton).
7. Ung architecture spike har ett falsifierbart Noah-scenario.
8. Betalande-förälder-värdet är en testbar hypotes (H7), inte VISION/FACT.
9. Moat är tydligare än “todo-app” / “privata todos”.
10. Internationella antaganden är märkta; Mitt/Vårt-språk är **NOT_VERIFIED** per marknad.
11. Vetenskap är evidens för avgränsade påståenden, inte dekoration eller UI-bevis.
12. Alla olösta beslut är OQ eller LEGAL REVIEW.
13. Inga framtida system beskrivs som FACT.
14. Inga OQ är antagna som beslut. Ingen kod, ingen ADR.

**Nästa (inte nu):** Mellan-innehållsspec · ev. ADR för C-01-omtolkning + server-policies · legal memo per marknad · spike-kontrakt.

---

## 25. Kvarvarande motsägelser (ärliga)

1. **Hem vs privacy.** Om allt hos 14-åringen är Mitt blir Hem tomt → H5/H7. Inte löst; därför spike före release.
2. **C-01 vs self_planning.** Skapa Mitt-objekt är ett slags “formulär”. Kräver ADR-omtolkning — inte smygbeslut.
3. **En Journey vs ung-coach.** U-12 medvetet P2. Samma motor är **REK / NOT_VERIFIED** tills Ung-kontraktet testats.
4. **Förälder slår på NPF-stöd vs ung äger upplevelsen.** OQ 11.
5. **Vad vårdnadshavare måste se.** OQ 12. Produkten får inte låtsas att svaret är noll eller allt. Inget “aldrig läsrätt” som legal FACT.
6. **Moat.** Utan mål och stjärnor *kan* Ung bli Reminders. Motdrag: Vårt + autonomiövergång + NPF-stöd + blandade syskon + samma OS — **NOT_VERIFIED**.
7. **Mellan-ton vs Mellan-kontrakt.** H1 kan vara falsk: 9–12 kan redan skava på ägarskap, inte bara copy.
8. **Ett familje-OS till 18.** Strategisk hypotes, inte sanning.
9. **S-10 vs default ung-policy (U-07).** En kedja födelsedag → proposed ung-presentation → antagen ung-policy → stjärnor OFF / Mitt-default vore en tyst rights-change. Default vid ~13 är *förslag*. Policy-byte (inkl. `reward_model`) kräver explicit transition. Inte löst här (OQ 10).

---

## 26. Sista motbevisning (innan “redo”)

**A. “9–12-problemet är främst ton/copy.”**  
Kan vara falskt. Det kan vara början på autonomiproblemet. **H1 / NOT_VERIFIED.** Mellan v1 behåller Liten-kontrakt men ska kunna validera “Göra tillsammans”.

**B. “Föräldrar kommer fortsätta betala även om de ser mindre.”**  
Ej bevisat. **H7 / NOT_VERIFIED.** Om falsk: annan packaging, annan vuxennytta, eller Ung utanför samma erbjudande.

**C. “Mitt / Vårt / Delat stöd är rätt mental modell.”**  
Lovande men inte användartestad och inte validerad internationellt. **NOT_VERIFIED.**

**D. “Stjärnor OFF är rätt default från 13.”**  
Ej verifierat. **H4.** Default knyts till ung-policy, inte födelsedag.

**E. “Ett gemensamt Family OS räcker hela vägen till 18.”**  
Strategisk hypotes, inte sanning. **NOT_VERIFIED.**

**F. “Samma Journey-motor räcker.”**  
Bra REK, fortfarande hypotes tills Ung-kontraktet testats. **NOT_VERIFIED.**

**Motargument:** “Skippa Ung helt. Bara Mellan-copy. Privacy är för dyrt.”  
**Svar:** Då växer 14-åringen ur er *och* ni har ingen arkitektur när ni behöver den. Spike är billigare än fel release. Mellan blockeras inte.

**Motargument:** “Ge föräldern spegling — annars betalar de inte.”  
**Svar:** Spegling som default gör er till en övervakningsapp. Stattin/Kerr *stödjer inte* att mer tracking ger mer kunskap — de bevisar inte vår modell. H5/H7 måste mätas.

**Motargument:** “Ett läge per ålder är enklare att bygga.”  
**Svar:** Enklare och fel för NPF-14-åringen. Det är den kombinationen som differentierar mot gratis Reminders — **om** H7 och moat-hypotesen håller.

**Motargument:** “Börja i Sverige med 13 hårdkodat.”  
**Svar:** Irland 16 gör det till en fork. Config från dag ett på *regeln*, inte på hela produkten.

Dokumentet är redo att **stänga spec-rundan** i den mening §24 kräver — **inte** för att hypoteserna är sanna.

---

## 27. Självgranskning

| Hatt | Resultat |
|------|----------|
| CPO | Mellan först; Ung spike; H7 öppen; inget 3–18-löfte |
| UX | Explicit delning; 07:15; Liten skyddad; Mellan ≠ bara copy |
| Game | Ingen ny valuta; mål ute ur P0; stjärnor OFF = H4 |
| Security | S-06 + S-10; inference-läckage P0 |
| Legal | 13 avgränsat; LEGAL REVIEW; inget “aldrig läsrätt” |
| QA | Tester i §20 inkl. födelsedagsnatt; spike falsifierbar |
| International | SE/FI 13, IE 16 som exempel; Mitt/Vårt-språk NOT_VERIFIED |
| AISA | Inte över POS; ingen ADR; vetenskap ≠ UI-bevis |

**POS:** Constitution 1–5, First Success, P-02, C-01/C-03/C-04, PA-01/06, G-01, R-02, hub-/barnvisioner, NPF 3–12.

**Bekräftelse:** ingen produktkod · ingen ADR · inga OQ antagna som beslut.

---

*Diskussionsunderlag. Inte implementationskontrakt.*
