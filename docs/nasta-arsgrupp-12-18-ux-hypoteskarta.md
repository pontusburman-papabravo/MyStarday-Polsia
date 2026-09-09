# Nästa årsgrupp — UX-hypoteskarta

**Status:** **FRYST** 2026-09-09 · research-artefakt · **inte** ADR  
**Auktoritet:** Stängd spec `docs/nasta-arsgrupp-12-18-kravstallning.md` (rev. 3). Detta dokument **ändrar inte** den specen.  
**Operativ plan:** `docs/nasta-arsgrupp-12-18-derisk.md`  
**Fryst plansch v2:** `docs/nasta-arsgrupp-12-18-plansch-v2.png`  
**Visuell karta:** `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.html`  
**Evidenskälla:** `EVIDENCE_SOURCE: founder_observation`

**STOP på UX-plansch.** Nästa värde är Mellan-P0 i produktion + H1-mätning — inte fler pixlar.

---

## 0. Läs detta först

Forskningen och specen **stödjer riktningen**. De **validerar inte skärmar**.

```
Riktning (håller)     Göra åt mig → Göra tillsammans → Äga själv
Ålder                 typisk default — inte låda, inte rättighet
Stödintensitet        orthogonal mot autonomi
Planschen v2          9/10 strategi · 8/10 Mellan-build · 3/10 Ung-build (korrekt)
Forskning             ger riktning. Produktdata avgör.
Nästa värde           shippa Mellan-P0 · mäta H1 · inte iterera planschen
```

**Förbjudet att sluta sig till från planschen v1**

- att 3–8 / 9–12 / 13–18 är tre UI-lådor att bygga
- att Skattkammaren är en tredjedel av Liten
- att Mellan = vuxnare Liten + förslagsknapp
- att Ung = Mitt/Vårt-flikar + yta “Delat stöd” + Face ID + inga stjärnor
- att förälderns Hem redan har tillräckligt värde utan implicit insyn
- att något av ovan är customer-backed

**Inget här får kodas som produkt.** Prototyper är research, inte release.

---

## 1. Founder-score

`EVIDENCE_SOURCE: founder_observation`

### Planschen v1 (ålderslådor)

Kommunikation 8/10 · build-underlag 4/10 · specifika skärmar 2/10.

### Planschen v2 (hypoteser + FACT / BUILD NOW / HYPOTES / OQ) — **fryst**

| Dimension | Score | Läsning |
|-----------|-------|---------|
| Strategi- / beslutsplansch | 9/10 | Rätt typ av artefakt. |
| Forskningsinformerad riktning | 8/10 | Principerna håller. |
| UX vi *vet* fungerar | 5/10 | Fortfarande hypotes utanom Liten. |
| Build-underlag **Mellan** | 8/10 | Innehåll nu. Delaktighet (M-06) testas härnäst. |
| Build-underlag **Ung** | 3/10 | Korrekt — Ung ska inte bredlanseras än. |

**Bra nog att använda nu.** Iterera inte planschen mer innan produktdata.

---

## 2. Vad forskningen faktiskt stöder

Vetenskap **informerar och kan falsifiera**. Den dekorerar inte beslut. Den bevisar inte vår UI.

| Påstående | Status | Källa | Produktkonsekvens |
|-----------|--------|-------|-------------------|
| Autonomistödjande föräldraskap är positivt kopplat till barns/ungdomars välbefinnande; psykologisk kontroll till sämre utfall — över kulturer och utvecklingsperioder | **EVIDENCE** (korrelation, inte kausal UI-sanning) | Bradshaw et al. 2025, *American Psychologist* — meta-analys, k = 238, N = 126 423. DOI `10.1037/amp0001389` | Stödjer principen “mer autonomistöd, mindre kontroll”. **Bevisar inte** Mitt/Vårt, Dela-med-mamma eller någon skärm. |
| Föräldrars kunskap kommer ofta från ungdomens egen disclosure, inte från surveillance | **EVIDENCE** | Stattin & Kerr 2000; Kerr, Stattin & Burk 2010 (redan i stängd spec §8.1) | Stödjer *explicit delning* som inriktning. **Bevisar inte** knappen eller ytan “Delat stöd”. |
| Exekutiva svårigheter är väldokumenterade vid bl.a. ADHD och autism | **EVIDENCE** (klinisk/praktisk) | Etablerad NPF-kunskap; inget universellt effektlöfte | Orthogonal `support_profile`. En 14-åring kan behöva NU/NÄSTA. |
| Evidenskvaliteten för digitala ADHD-interventioner är generellt låg, även när positiva effekter rapporteras | **EVIDENCE** | Conde-Pumpido et al. 2025, *BMC Psychiatry* — review-of-reviews, 26 reviews. DOI `10.1186/s12888-025-06825-0` | NPF-riktningen är rimlig. **Lova inte** klinisk effekt. Bygg inte som om appen är en bevisad intervention. |
| Specifika skärmar på planschen v1 förbättrar vardagen | **NOT_VERIFIED** | Ingen användarstudie | Testa beteende, inte tycke. |
| 9–12-problemet är främst “för barnsligt” (A) snarare än “mamma bestämmer allt” (B) | **NOT_VERIFIED** (H1) | Ingen mätning | M-06 och tre Mellan-varianter är viktigare än vuxnare copy. |
| 13–18 vill ha Mitt/Vårt, Face ID, och stjärnor OFF | **NOT_VERIFIED** | Ingen research | Auth = OQ. Stjärnor = H4. IA = språk att testa. |

---

## 3. Största risken med planschen v1

Planschen visualiserar återigen produkten som:

```
3–8  → detta UI
9–12 → detta UI
13–18 → detta UI
```

Det är **samma arkitektur specen just avvisade**: ålder som låda.

En 14-åring med stort exekutivt stödbehov kan behöva något som *ser ut* som Liten/Mellan.  
En självständig 11-åring kan vilja ha mindre bildstöd.

**Ålder ≠ rättigheter. Ålder ≠ stödbehov.** Ålder får stå som *typisk default*, inte som produktgräns.

---

## 4. Nästa plansch är tvådimensionell

Horisontell axel — **autonomi (policy)**

```
Göra åt mig  →  Göra tillsammans  →  Äga själv
```

Vertikal axel — **stödintensitet (`support_profile`)**

```
Lågt stöd  →  Strukturerat stöd  →  Mycket starkt visuellt / exekutivt stöd
```

Ålder annoteras som **typisk default** i cellen, inte som radrubrik som äger cellen.

| | Göra åt mig | Göra tillsammans | Äga själv |
|--|-------------|------------------|-----------|
| **Lågt stöd** | Olle 7, text+enkel lista | Noah 11 planerar träning tillsammans | Noah 14, textlista, privat default |
| **Strukturerat stöd** | Olle 7 + tider/sektioner | Noah 11 + förslag + bild valfritt | Maja 17 + familjemarkering |
| **Stark visuellt/exekutivt stöd** | Olle 7 default: NU/NÄSTA, pictogram | Noah 11 + en-i-taget + timer | **Noah 14 + NU/NÄSTA + pictogram + fokus** — icke-förhandlingsbar kombination |

Cellen nere till höger är densamma som i stängd spec §9.2. Om den försvinner från kartan har vi återinfört “NPF = yngre barn”.

Tredje axel (inte en tredje produkt): **enhet**

```
Delad familjeenhet  →  blandat  →  egen enhet
```

Påverkar login, push, privacy, handoff, offline, session, personbyte. **Inte** “en annan login-skärm”.

---

## 5. Fem rader — hypoteskarta, inte produktlådor

Ålder är default-annotation. Samma person kan flytta cell. 13–18 är **två research-personas, inte två produkter**.

| Persona (default) | Access-hypotes | Daily core (daily use) | Autonomi-default | Viktigaste test |
|-------------------|----------------|------------------------|------------------|-----------------|
| **Liten ~3–8** | Delad enhet + PIN | NU / NÄSTA → klart → nästa. Skatt **sekundär** | Göra åt mig | Kan barnet göra dagen själv? |
| **Mellan ~9–12** | PIN / ev. egen enhet | Idag + *testa* egna förslag / delat skapande | Göra tillsammans (H1) | Vill barnet börja äga delar — eller är det mest ton? |
| **Ung 13–15 · Noah 14** | Privat access — **exakt auth OQ** | Testa Mitt+Vårt *eller* en tidslinje med familjemarkering | Äga själv | Förstår de privacy/delning? Känns Mitt/Vårt som terapi? |
| **Ung 16–18 · Maja 17** | Egen identitet OQ | Egen dag + familj | Nära full autonomi | Finns Family-OS-värde kvar? |
| **Förälder** | Eget konto | Familjens läge — **inte** surveillance-karta | Coach | Finns betalningsvärde utan implicit insyn? (H5/H7) |

Ovanpå alla rader: **NPF/stöd-slider**. Den går genom Liten, Mellan, Ung och Förälder (föräldern slår på stöd; den unga möter resultatet — OQ 11 vem som äger toggles vid Äga själv).

---

## 6. First use ≠ daily use

Planschen v1 visade återkommande **login**, inte första användning. Varje grupp behöver **två** flöden i prototyperna.

| | First use (förtroendekontrakt) | Daily use (kärnvärde) |
|--|-------------------------------|------------------------|
| **Liten** | Föräldern sätter upp → handoff → barnets första Idag. Barnet onboardas **inte** själv. | Login/PIN/trusted → NU/NÄSTA → klart → nästa. |
| **Mellan** | Hypotes att testa: ska Noah vara med när appen introduceras? T.ex. “Noah, vi har gjort en plan för morgonen. Vill du se den?” — inte bara att mamma installerar ett verktyg som dyker upp. | Idag + ev. förslag / delat skapande. |
| **Ung** | Onboarding **är** förtroendekontraktet. Innan användning måste det vara kristallklart: Vad ser jag? Vad ser mamma? Vad är privat? Vad kan jag dela? Kan mamma ändra mina saker? | Min dag + familjeåtaganden. Delning som *handling på objektet*. |
| **Förälder** | Blandad familj: vad behöver jag veta första kvällen? | 07:15: ett nästa steg, inte en karta över Mitt. |

Om Ung-onboarding inte är kristallklar hjälper inte privacy-designen.

---

## 7. Liten 3–8 — närmast, men inte “perfekt barnapp”

Bygger på produkt som finns. Loop som håller: profil → PIN → Idag → NU/NÄSTA → klart.

**Korrigering mot planschen v1:** visa inte Skattkammaren som tredje obligatoriska exempelbild. Den förstärker att gamification är en tredjedel av produkten.

Konstitution + Idag-vision: **vardagen är spelet, samlingen är belöningen.** På Idag är Skatt under fold.

**Visa i nästa proto:** Login → Idag → klart / förflyttning till nästa.  
**Skatt:** sekundär, inte hero.

---

## 8. Mellan 9–12 — största okända (H1)

Planschen v1 antar: Liten + vuxnare språk + skola/fritid + förslag. Det är en **hypotes**. H1 är öppen.

Vi vet inte om problemet primärt är:

- **A.** “Det här ser barnsligt ut.”
- **B.** “Varför bestämmer mamma fortfarande allt jag ska göra?”

Om B är viktigare räcker inte vuxnare copy. Då är **M-06 och delat skapande** viktigare än planschen antyder.

**Prototypa tre varianter — bygg dem inte som produkt.**

| Variant | Modell | Vem skapar vad |
|---------|--------|----------------|
| **A — vuxnare Liten** | Förälder skapar, Noah utför | Samma kontrakt som Liten, annan ton |
| **B — förslag** | Noah föreslår, förälder accepterar | M-06 |
| **C — delat skapande** | Mamma lägger t.ex. “Packa väskan”, Noah lägger “Fotbollsträning” | Starkare “Göra tillsammans” |

Uppgift i test (inte “vilken design gillar du?”):

> “Planera morgondagen.”

Se vilken mental modell barn och förälder **själva** förstår. Det kan ändra hela Mellan-planen.

---

## 9. Ung 13–18 — mest lovande, minst bevisad

13 och 18 är inte samma persona. Research: **Noah 14** och **Maja 17**. Samma domän, två extrema testfall. Om samma design fungerar för båda är evidensen mycket starkare.

Varje detalj på planschen v1 är ifrågasättbar.

### 9.1 Min dag / Mitt / Vårt

Lovande. Inte användarvaliderat.

Testa minst tre IA-hypoteser:

| ID | Modell | Risk |
|----|--------|------|
| Ux-1 | Flikar **Mitt** / **Vårt** | Känns som familjeterapi? Förstår 14-åringen omedelbart? |
| Ux-2 | **Min dag** / **Hemma** | Annan metafor, samma objektgränser |
| Ux-3 | **En tidslinje** där familjesaker har tydlig familjemarkering | Mindre IA-vikt på två världar |

Objektgränserna Mitt / Vårt / Delat stöd i **specen** är domän. UI-label är **NOT_VERIFIED**.

### 9.2 “Delat stöd” som primäryta

Arkitekturellt bra begrepp. Som IA-label: skeptisk.

En 15-åring tänker sannolikt inte “nu går jag till Delat stöd”. Hen tänker “jag behöver hjälp med den här.”

**REK för proto:** delning är en **handling på objektet**, inte en egen primäryta. Planschen v1 gav Delat stöd för stor informationsarkitektonisk vikt.

### 9.3 Login / Face ID

För tidigt att visa som nästan beslutat. Ungdomsidentitet är **OQ 1**.

Märk i proto och plansch:

> **Egen, privat access — exakt auth OQ.**

Kandidater (ingen låst): egen appsession · device-bound login · passkey · child identity + device unlock · Face ID · något annat.

### 9.4 Stjärnor helt borta

Bra testhypotes (H4). Inte bevisad. Ingen magisk gräns vid 13.

OFF default när ung-policy antagits är rimlig **testarm**. Inte “tonårsdesign = inga stjärnor”. Vissa 13–15 med ADHD kan fortfarande vilja ha tydlig yttre förstärkning.

---

## 10. Förälderns Hem är H5 och H7 i förklädnad

Planschen v1 visar redan elegant:

- Olle 3/5
- Noah 1 familjeåtagande
- Ella klar

Det är **inte** färdig UX. Det är hypoteserna H5 och H7 ritade som Hem.

Kommersiell fråga: om Noahs privata saker är privata — **finns det tillräckligt värde på förälderns Hem?**

Vi måste vara beredda på svaret **nej**. Då ska vi **inte** fylla Hem bara för att det känns tomt.

**Legitimt vuxenvärde att testa (inte att börja bygga):**

- vad familjen gemensamt kommit överens om
- logistiken idag
- saker som kräver vuxenbeslut
- uttryckliga hjälpönskemål
- två-hem-koordination
- yngre syskons struktur
- ett nästa familjesteg

Ingen spegling av Mitt som “fix”.

---

## 11. Stress-tester som saknades på planschen

Inte v1-bygge. **Konceptskärmar / proto-uppgifter** för att avslöja domänfel tidigt.

### 11.1 Pedagog (privacy stress-test för Ung)

- Noah delar en sak med pedagog.
- Vad ser pedagogen?
- Vad händer när Noah slutar dela? (OQ 6 — ingen policy uppfinns här; proto får *visa frågan*.)
- Syns tidigare historik? (OQ 6–7)

### 11.2 Två hem

- Pappa lägger familjeåtagandet *hos pappa*.
- Mamma är också parent.
- Ska mamma se det?

Om svaret alltid är “alla föräldrar ser Vårt” har vi redan fel modell. Specen: synlighet via `parent_child` + ev. boende, inte “alla vuxna”.

---

## 12. Research-protokoll (kvalitativt först)

Inte stora enkäter först. Inte “tycker ni planschen är bra?”.

### 12.1 Rekrytering (ungefär)

- Familjer med barn 9–10
- Familjer 11–12
- Familjer 13–15
- Familjer 16–17
- Med och utan uttalat NPF-stödbehov
- Minst några två-hem-familjer

Intervjua **barn/ungdom och förälder separat först**, sedan tillsammans. En 14-åring ger andra svar om mamma sitter bredvid.

### 12.2 Beteende, inte åsikt

Bygg klickbara prototyper. Ge uppgifter.

| Vem | Uppgift |
|-----|---------|
| **9–12** | “Du har fotboll imorgon och behöver komma ihåg skolväskan. Visa hur du skulle vilja lägga in det.” |
| **14** | “Du har matteprov på fredag. Du vill komma ihåg det men vill inte att pappa ser det.” Sedan: “Nu vill du att pappa hjälper dig plugga torsdag. Vad gör du?” |
| **Förälder** | “Du vill veta om Noah kommer till middagen men inte läsa hans skolplanering. Visa hur du skulle göra.” |
| **Blandad familj** | “Du har Olle 7 och Noah 14. Vad behöver du veta klockan 07:15?” |
| **Mellan A/B/C** | “Planera morgondagen.” — vilken modell förstår de? |
| **Maja 17** | Samma privacy-uppgifter som Noah 14. Fungerar samma yta? |

**Fråga inte:** “Vilken design gillar du?”  
**Titta på:** var de klickar, vad de kallar saker, var de fastnar, om de försöker gömma / dela / be om hjälp på objektet.

### 12.3 Koppling till stängda hypoteser

| Test | Hypotes |
|------|---------|
| Mellan A vs B vs C + “för barnslig” vs “mamma styr allt” | **H1** |
| Noah 14: privat matteprov → dela till plugg | **H3** + Mitt/Vårt-språk |
| Stjärnor synliga vs dolda i Ung-proto | **H4** |
| Förälder 07:15 med Olle + Noah | **H5** |
| Noah 14 + NU/NÄSTA | **H6** |
| “Skulle du fortsätta betala om du inte ser Noahs skola?” | **H7** — kvalitativ signal, ingen WTP-% hittas på |

---

## 13. Fyra till sex klickbara UX-hypoteser (nästa 10/10-steg)

Inte snyggare plansch. Inte produktkod. Lo-fi / mid-fi proto som går att ge uppgifter på.

| # | Proto | Syfte | Får inte låtsas beslutat |
|---|-------|-------|-------------------------|
| **1** | Liten daily: Login → Idag → klart/nästa | Kärnvärde. Skatt inte hero. | — |
| **2** | Mellan A — vuxnare Liten | Isolera H1-A (ton) | Att A är Mellan-v1 |
| **3** | Mellan B — förslag | Isolera M-06 | Att förslag är rätt modell |
| **4** | Mellan C — delat skapande | Isolera H1-B (ägarskap) | Att C är Mellan-v1 |
| **5** | Ung Noah 14: en tidslinje *eller* Mitt/Vårt + delning på objektet + first-use kontrakt | Privacy begripligt? | Face ID, “Delat stöd”-flik, stjärnor OFF som sanning |
| **6** | Förälder Hem + två-hem + pedagog-share som *stress* (kan vara scener i proto 5) | H5/H7 + domänfel | Elegant 3/5-karta som färdig UX |

Proto 5 bör minst ha first-use-skärmen “vad ser jag / vad ser mamma”.  
Noah 14 och Maja 17 kör **samma** Ung-proto — två testfall, inte två appar.

Valfritt sjunde: Ung med stjärnor ON som testarm (H4). Inte en tredje produkt.

---

## 13b. Kvar på v2 — skrivet, inte omritat

Planschen v2 är fryst. Dessa reservationer gäller *när den läses*, inte som skäl att rita om den.

| Reservation | Hur den ska läsas |
|-------------|-------------------|
| Mellan ser för färdig ut | **BUILD NOW: innehåll.** **TEST NEXT: delaktighet (M-06 / H1).** M-06 är den mest intressanta Mellan-hypotesen — inte extra pynt. |
| Ung-skärmar för konkreta | Testa *kontraktet* (Privat / Familj / Dela hjälp), inte pixel-navigation. |
| 13–15 och 16–18 som kolumner | Samma Ung-domän. **Testperson 14** · **stress-test 17**. Inte två produktlägen. En 17-åring kanske inte behöver produkten alls — det är ett giltigt svar. |
| “Privat som standard” | **Privat default — REK, legal review kvar.** Inte låst beslut. |
| Föräldervärde utan Mitt-insyn | **H7 — måste bevisas.** Inte löfte. |
| “Forskning ger riktning” | Lägg till: **Produktdata avgör.** Forskning säger inte var knappen sitter, om 11-åringar vill ha M-06, eller om föräldern betalar. |

## 13c. Vad produktionen ska lära oss

Det som får oss att *ändra riktning* — inte mer plansch.

**Mellan (nu)**

- Använder 9–12 fortfarande appen efter content-fixen?
- Används M-06 när den finns (TEST NEXT)?
- Stannar familjen längre?
- Används stjärnor fortfarande?
- Vilka nya aktiviteter läggs till (läxa, träning, skärm — inte sagostund)?

**Ung (senare, flaggad kohort)**

- Används Mitt? Används Vårt?
- Delas saker frivilligt?
- Tappar föräldern värde? (**H7**)
- Fungerar Family OS fortfarande?
- Vill 17-åringen ha produkten alls?

## 14. Vad som medvetet *inte* görs här

- Revision 4 av den stängda specen.
- Produktkod, Ung i prod, 13+ i butikstext.
- Att låsa auth, Mitt/Vårt-copy, Face ID, stjärnor OFF, eller förälder-Hem.
- Att fylla föräldra-Hem för att undvika tomhet.
- Stora enkäter före kvalitativa uppgifter.
- Att visa planschen v1 och fråga om den är snygg.

---

## 15. DoD för denna artefakt

Klart när:

1. Planschen v1 är märkt som kommunikation, inte build-underlag.
2. Kartan är tvådimensionell (autonomi × stöd) med ålder som default.
3. Fem rader + enhetsaxel + first/daily use finns.
4. Mellan har tre proto-varianter kopplade till H1.
5. Ung-detaljer (IA, delning, auth, stjärnor) är märkta NOT_VERIFIED / OQ.
6. Förälder-Hem är märkt H5/H7.
7. Research-protokoll testar beteende, inte tycke.
8. Planschen v2 är **fryst**. Nästa värde är Mellan-P0 + H1, inte fler pixlar.

Tills produktion svarat: **detta är inte customer-backed för Ung.** Mellan-innehåll får shippas och mätas.

---

*Fryst hypoteskarta. Inte implementationskontrakt för Ung. Inte bevis för vad tonåringar vill ha.*
