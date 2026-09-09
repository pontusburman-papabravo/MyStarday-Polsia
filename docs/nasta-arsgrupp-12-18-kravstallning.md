# Nästa årsgrupp 12–18 — Spec och kravställning

**Status:** Diskussionsunderlag (ej låst produktbeslut, ej ADR, ej build-spec)  
**Revision:** 2 — 2026-09-09  
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
| **REJECTED** | Tidigare påstående som inte håller efter granskning |

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

1. **Mellan (9–12)** = första kommersiella leverans: ton, startschema, För dig — samma loop som Liten.
2. **Ung architecture spike** = parallell de-risking, **inte** release. Bevisar Noah-scenariot nedan.
3. **Inte** ung vuxen-innehåll (16–18) förrän spike håller.
4. **Marknadsför inte** 13+ förrän Ung-upplevelsen finns och klarar kraven. Det är ett *löftes-* och deklarationskrav — inte att Play/Apple saknar 13+-fack.

**Kritisk arkitekturhypotes (spike, måste kunna falsifieras):**

> Noah, 14, skapar “Matteprov fredag”. Den är privat. Föräldern kan inte läsa eller härleda den via API, Hem, notis, analytics, rapport eller pedagogvy. Samtidigt finns familjeåtagandet “Middag hemma 18:00” som relevant förälder ser. Noah kan själv välja att dela matteprovet för att få hjälp.

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

Eget vuxenkonto. Åtkomst via `parent_child`. Boendeschema speckad (FEAT-1); inte nödvändigtvis live i full form. Hem är neutrala. **OQ:** två hem + Mitt — vems synlighet? §17.9.

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
| Journey | Ja | Samma motor, nya experiences |
| För dig | Ja | Nya mål; filtrera på presentation + policy |
| Trusted device / PIN-gate | Ja | Ung-identitet är OQ |
| IAP | Ja | Familjen betalar |
| Pedagog + rapport | Ja | Får inte se Mitt default |
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

**Läsning:** 9–12 = innehåll/ton (**hypotes** om churn). 13+ = kontrakt (ägande/delning), inte “svårare schema”.

---

## 8. Varför inte “samma app med svårare scheman”

### 8.1 Skifte (produktinferens + evidens)

| Yngre default | Äldre default |
|---------------|---------------|
| Struktur *ges* | Struktur *förhandlas* |
| Vuxen minskar osäkerhet | *Implicit* övervakning kan *öka* osäkerhet |
| Stolthet = klarade momentet | Stolthet = det här är mitt |
| Belöning nära och konkret | Frihet, tid, förtroende — **utan ny valuta i v1** |

**EVIDENCE (teori, inte UI-bevis):** Self-Determination Theory beskriver autonomi, kompetens och tillhörighet som grundbehov (Ryan & Deci 2000). Dagens app är stark på kompetens och tillhörighet; autonomi är medvetet låg. Det är **designstöd**, inte bevis att en viss skärm fungerar.

**EVIDENCE (parental monitoring ≠ kunskap):** Stattin & Kerr (2000) och longitudinell uppföljning (Kerr, Stattin & Burk 2010): det föräldrar *vet* kommer främst från ungdomens *egna avslöjande*, inte från övervakning. Övervakningsåtgärder predicerade inte kunskap över tid i den studien. **Detta är inte kausal evidens för vår UI.** Inferens: implicit full insyn är fel default när personen ska äga mer.

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

policies / capabilities (exempel, inte schema):
        self_planning
        private_items
        family_commitments
        parent_visibility
        pedagogue_visibility
        reward_model
        support_profile   ← orthogonal (NU/NÄSTA, timer, pictogram, …)
```

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

Förälder kan flytta presentation ett steg med preview. Hopp liten→ung kräver varning. **Policy-byte är separat OQ** (vem godkänner `private_items`?).

### 9.4 Internationellt

Hårdkoda inte svensk skolform, “mellanstadium”, vårdnadsmodell eller 13 som policy-tröskel. Landsskillnader = senare policy/config. **LEGAL REVIEW** per marknad.

---

## 10. Objektägande — inte fältvis ACL

### 10.1 Tre begripliga gränser (REK, Ung v1 / spike)

**Mitt**  
Den unga äger objektet. Privat default. Exempel: *Matteprov fredag*, *Plugga 25 min*, *Fotboll*.

**Vårt / Familjeåtagande**  
Överenskommen sak som *relevanta* familjemedlemmar får se (via `parent_child` + ev. boende, inte “alla vuxna”). Exempel: *Middag 18*, *Hämta syskon*, *Ta ut hunden*.

**Delat stöd**  
Den unga *aktivt* delar ett Mitt-objekt för hjälp. Exempel: *Visa mamma matteprovet* · *Påminn mig torsdag* · *Jag vill ha hjälp att komma igång*. Delning med pedagog där tillåtet.

Ingen generell per-fält-matris Bara jag / Familj / Pedagog i v1.

### 10.2 Läckageförbud (P0 för spike)

Privat information får **inte** läcka via:

| Kanal | Förbjudet exempel |
|-------|-------------------|
| API | Parent-endpoint returnerar titel/antal på Mitt |
| Hem | “Noah har 3 privata saker” / tom rad som röjer namn |
| Notis | “Noah klarade Matteprov” till förälder utan delning |
| Analytics | Event med titel, eller `private_item_count` per barn |
| Rapport | Aggregering som röjer Mitt |
| Pedagogvy | Lista eller badge på osedda Mitt-objekt |

**Acceptans:** en testare med förälder-JWT ska inte kunna *härleda* att objektet heter Matteprov eller ens att det finns, utöver det som explicit delats.

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

Samma kontrakt som Liten. Annan *presentation*. **Blockeras inte av Ung.**

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

M-04 veckopeng från rev. 1 **stryks** (scope + OQ 5).

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
| U-07 | `reward_model` default OFF vid ung-policy; kan slås på. **Ingen ny valuta** | P0 |
| U-08 | Identitet: PIN *eller* annat — OQ 1. Inte djuremoji som enda identitet | P1 |
| U-09 | Pedagog/humör inte som spelstatus. Delning aktiv | P0 |
| U-10 | Hög `support_profile` + ung-policy ska kunna samexistera | P0 |
| U-11 | För dig till förälder: skärmtid-avtal, struktur, två hem — P1 | P1 |
| U-12 | För dig till den unga | P2 / OQ (en-coach) |
| U-13 | Notis till den unga om hens objekt. Förälder får inte kopia på Mitt | P0 |
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
| Y-04 | Presentation/policy-sänkning inte tyst | P0 |
| Y-05 | Lämna familj / export | P1 / OQ 11 |
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

---

## 12. Ung-upplevelse (diskussion, inte wireframe)

**P0:** Min dag · Vi hemma.  
**Inte P0:** Mina mål.

**Min dag** kan vara *samma värld som Idag* med annan presentation — föredra återanvändning framför ny flik (**REK**, motverka nav-inflation).

- Vårt: middag, hämtning
- Mitt: matteprov, fotboll (osynligt för förälder)
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

Designa efter: faktisk familjenytta, tillit, vardagseffekt, låg friktion, kontinuitet över år, flera barn, svårighet att bytas ut mot en todo-app.

Pris/packaging = separat beslut.

### 16.1 Frågor varje ny capability måste klara

**International**

- Begripligt utanför Sverige?
- Bundet till svensk skola/familj?
- Copy, kalender, legal, policy utan fork?
- Olika samtyckesåldrar (13 vs 16) utan ny kärna?

**Moat**

- Löser kärnproblemet bättre än Todoist + kalender?
- Förstärker familje-OS?
- Egen domän (ägande + stöd + Journey) eller feature-hög?
- Retention när personen växer?
- Värde av att *hela* familjen är kvar?

**Acquisition-hygien** (lång sikt, inte sprintskäl)

Tydlig domän, dokumenterade policies, config för land, verifierbar säkerhet, mätbar nytta, låg skuld. Inga specialvägar som kräver grundaren.

### 16.2 Kommersiella risker (hittade)

| Risk | Allvar |
|------|--------|
| Ung blir generic todo → inget WTP, ingen moat | Hög om Mina mål/XP smygs in |
| Mellan uteblir medan Ung byggs → 9–12 churn fortsätter | Hög — därför Mellan först |
| Lovar 3–18 i butik innan Ung finns → recension + deklarationsbrott | Hög |
| Två appar → dödar Hem | Hög |
| Familjer lämnar p.g.a. ton (**NOT_VERIFIED**) — vi kan ha fel problem | Medium |
| Internationell fork på “mellanstadium” / 13-konto | Medium |

**REK kvar:** största *troliga* vinst per vecka är Mellan (samma betalande förälder). Det är en **hypotes**, inte FACT.

---

## 17. Open Questions (grundare)

Agent får inte gissa.

1. **Identitet/konto 13+.** `child`+PIN vs ungdomskonto med e-post. GDPR-13 avgör **inte** detta.
2. **Default privacy Mitt vs Vårt.** REK: Mitt privat; Vårt synligt för relevant vuxen.
3. **Får Ung skapa Mitt utan godkännande?** REK: ja.
4. **Stjärnor OFF default vid ung-policy?** REK: ja. Produktantagande — ska valideras.
5. **Veckopeng / IRL-pengar?** REK: nej v1.
6. **Exakt store-gate** för att *marknadsföra* 13+ (upplevelse + deklaration + ev. Families/Kids).
7. **Vilka capabilities följer autonomi/policy vs presentation?**
8. **Ung privacy + hög NPF-support** — vem slår på stöd? REK: förälder *eller* den unga, utan att sänka privacy.
9. **Regler för explicit delning** till vuxen/pedagog (återkalla, tid, två hem).
10. **Legal/security per marknad** för ungdomsidentitet (verifiering, avtalspart, rättslig grund).
11. **Lämna familjen / export** senare.
12. **Vad vårdnadshavare måste kunna se** trots privat default — **NOT_VERIFIED** tills legal review.
13. **Namn i UI** för presentation (inte “barnläge 3”).
14. **Presentation-default utan födelsedag.**
15. **Pedagog på gymnasiet** — in eller ut tills P-krav sitter.

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
| H1 | Familjer lämnar ~10–12 primärt p.g.a. ton/copy | Mellan-innehåll räcker inte; annat problem |
| H2 | Mellan ökar retention 9–12 | Stoppa vidare Mellan-yta; mät annat |
| H3 | 13–15 värderar Mitt + Vårt | Ung-release stopp |
| H4 | Stjärnor OFF ökar Ung-acceptans | Tillåt ON default i testarm |
| H5 | Explicit delning räcker för föräldernytta | Hem blir värdelöst → omdesign eller inget Ung |
| H6 | NPF-stöd går att återanvända med vuxnare presentation | Annars risk att NPF = liten |

Framtida build-spec ska ange: baseline, mätetal, stop/go, guardrails, segment per presentation/policy — **inga känsliga teen scores**.

---

## 20. Kvalitetstester (dokumentet måste klara)

**Olle 7:** ingen försämring av Idag, NU/NÄSTA, stjärnor, Skatt, handoff.

**Noah 11:** ingen förskolekänsla; bild/stjärnor kvar om de hjälper.

**Noah 14:** Mitt privat + Vårt synligt + Delat stöd samtidigt; nolläckage.

**Noah 14 + hög NPF-support:** samma rätt till privacy; NU/NÄSTA, timer, pictogram, delsteg, en sak, reducerad stimuli, förutsägbarhet.

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

Undvik arkitektur som hårdkodar svensk ålder, familjemodell, skolterminologi eller legalmodell.

---

## 22. App Store / Google Play

Skilj: (1) produktmålgrupp (2) deklarerad target audience (3) content/age rating (4) Kids/Families-program.

**FACT (Play):** deklarera målgrupp; appar som inkluderar barn ska följa Families Policy; välj bara grupper appen *faktiskt* är designad för. Grupper inkluderar 5 and under, 6–8, 9–12, **13–15**, **16–17**, 18+. 13–15/16–17 *kan* räknas som barn i vissa länder. Google granskar att deklarationen stämmer. [support.google.com, answer/9867159]

**FACT (Apple):** Kids-kategori = appar för **11 år och yngre**; band 5 and under / 6–8 / 9–11; separat från vanlig age rating; Made for Kids kan inte ändras efter godkännande. [developer.apple.com/app-store/categories]

**REK:** marknadsför inte 13+ förrän Ung finns och klarar kraven.  
**REJECTED som FACT:** “store rating blockerar 13+”.

---

## 23. Evidensregister

| Hypotes | Status | Källa/typ | Produktkonsekvens |
|---------|--------|-----------|-------------------|
| Autonomi blir mer salient i adolescens | **EVIDENCE** (teori) | SDT, Ryan & Deci 2000 | Mindre implicit kontroll; inte bevis för en skärm |
| “Parental monitoring” är inte ett fenomen | **EVIDENCE** | Stattin & Kerr 2000; Kerr et al. 2010 | Särskilj kunskap via avslöjande från övervakning |
| NU/NÄSTA hjälper *alla* NPF-ungdomar | **NOT_VERIFIED** som generell effekt | Etablerad design/praktik | Behåll som stöd; inget medicinskt löfte |
| Visuellt schema/timer hjälper exekutiv funktion | **EVIDENCE** (praktik + delvis forskning) | Etablerad NPF/TEACCH-nära design; **inga effektpåståenden här** | Orthogonal support_profile |
| 13 = eget konto enligt GDPR | **REJECTED** | GDPR art. 8; SFS 2018:218 2:4; IE DPA s.31 | Separat OQ 1 + 10 |
| Store saknar 13+-fack | **REJECTED** | Play 13–15 / 16–17 | Deklaration ska matcha app |
| Stjärnor fungerar dåligt från exakt 13 | **NOT_VERIFIED** | Produktantagande | Default OFF vid ung-policy; validera |
| Churn 10–12 p.g.a. ton | **NOT_VERIFIED** | Ingen mätning här | H1 |
| Explicit delning räcker för förälder | **NOT_VERIFIED** | H5 | Spike + mätning |
| Objektgränser är begripliga för familjer | **NOT_VERIFIED** | — | Testa språk Mitt/Vårt/Delat |

Vetenskap ska **falsifiera och informera**, inte dekorera beslut.

---

## 24. DoD för denna spec-runda

Grundaren kan säga:

1. Jag ser presentation ≠ policy.
2. Jag ser Mitt / Vårt / Delat — inte fält-ACL.
3. Mellan kan shippas utan Ung-release.
4. Ung-spike har ett falsifierbart Noah-scenario.
5. Legal/store är inte maskerade som produktfakta.
6. Liten är skyddad.
7. Inga OQ är antagna som beslut.
8. Ingen kod, ingen ADR.

**Nästa (inte nu):** Mellan-innehållsspec · ev. ADR för C-01-omtolkning + server-policies · legal memo per marknad · spike-kontrakt.

---

## 25. Kvarvarande motsägelser (ärliga)

1. **Hem vs privacy.** Om allt hos 14-åringen är Mitt blir Hem tomt → H5. Inte löst; därför spike före release.
2. **C-01 vs self_planning.** Skapa Mitt-objekt är ett slags “formulär”. Kräver ADR-omtolkning — inte smygbeslut.
3. **En Journey vs ung-coach.** U-12 medvetet P2.
4. **Förälder slår på NPF-stöd vs ung äger upplevelsen.** OQ 8.
5. **Vad vårdnadshavare måste se.** OQ 12. Produkten får inte låtsas att svaret är noll eller allt.
6. **Moat.** Utan mål och stjärnor *kan* Ung bli en dagslista. Motdrag: Vårt + stöd + samma OS som Liten — **NOT_VERIFIED** att det räcker.

---

## 26. Sista motbevisning (innan “redo”)

**Motargument:** “Skippa Ung helt. Bara Mellan-copy. Privacy är för dyrt.”  
**Svar:** Då växer 14-åringen ur er *och* ni har ingen arkitektur när ni behöver den. Spike är billigare än fel release. Mellan blockeras inte.

**Motargument:** “Ge föräldern spegling — annars betalar de inte.”  
**Svar:** Då är ni en övervakningsapp. Stattin/Kerr talar emot att mer tracking ger mer kunskap. H5 måste mätas, inte antas åt båda håll.

**Motargument:** “Ett läge per ålder är enklare att bygga.”  
**Svar:** Enklare och fel för NPF-14-åringen. Det är den kombinationen som differentierar mot todo-appar.

**Motargument:** “Börja i Sverige med 13 hårdkodat.”  
**Svar:** Irland 16 gör det till en fork. Config från dag ett på *regeln*, inte på hela produkten.

Dokumentet är redo för nästa fas i den mening §24 kräver — **inte** för att alla håller med.

---

## 27. Självgranskning

| Hatt | Resultat |
|------|----------|
| CPO | Mellan först; Ung spike; inget 3–18-löfte |
| UX | Explicit delning; 07:15; Liten skyddad |
| Game | Ingen ny valuta; mål ute ur P0 |
| Security | S-06 policies på server; läckageförbud |
| Legal | 13 avgränsat; LEGAL REVIEW flaggad |
| QA | Tester i §20; spike falsifierbar |
| International | SE/FI 13, IE 16 som exempel |
| AISA | Inte över POS; ingen ADR |

**POS:** Constitution 1–5, First Success, P-02, C-01/C-03/C-04, PA-01/06, G-01, R-02, hub-/barnvisioner, NPF 3–12.

**Bekräftelse:** ingen produktkod · ingen ADR · inga OQ antagna som beslut.

---

*Diskussionsunderlag. Inte implementationskontrakt.*
