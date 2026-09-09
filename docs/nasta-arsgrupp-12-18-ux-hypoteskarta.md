# Nästa årsgrupp — UX-hypoteskarta

**Status:** **FRYST** 2026-09-09 · research-artefakt · **inte** ADR  
**Auktoritet:** Stängd spec `docs/nasta-arsgrupp-12-18-kravstallning.md` (rev. 3). Detta dokument **ändrar inte** den specen.  
**Operativ plan:** `docs/nasta-arsgrupp-12-18-derisk.md`  
**Fryst plansch v2:** `docs/nasta-arsgrupp-12-18-plansch-v2.png`  
**Visuell karta:** `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.html`  
**Evidenskälla:** `EVIDENCE_SOURCE: founder_observation`

**STOP på UX-plansch.** Kartan styr vad som får shippas för att läras vs provas före exponering. Produktion är primär validering.

---

## 0. Läs detta först

Forskningen och specen **stödjer riktningen**. De **validerar inte skärmar**.

```
Riktning (håller)     Göra åt mig → Göra tillsammans → Äga själv
Ålder                 typisk default — inte låda, inte rättighet
Stödintensitet        orthogonal mot autonomi
Planschen v2          9/10 strategi · 8/10 Mellan-build · 3/10 Ung-build (korrekt)
Forskning             ger riktning. Produktdata avgör.
Nästa värde           Mellan-P0 i produktion · Ung G bakom flagg · mäta H1
Metod                 Default ship-to-learn. Exception: prove-before-ship.
```

**Förbjudet att sluta sig till från planschen v1**

- att 3–8 / 9–12 / 13–18 är tre UI-lådor att bygga
- att Skattkammaren är en tredjedel av Liten
- att Mellan = vuxnare Liten + förslagsknapp
- att Ung = Mitt/Vårt-flikar + yta “Delat stöd” + Face ID + inga stjärnor
- att förälderns Hem redan har tillräckligt värde utan implicit insyn
- att något av ovan är customer-backed

Hypoteskartan styr vilka delar som ska **implementeras reversibelt och instrumenteras**. Produktion är primär valideringsmiljö. Klickbara prototyper eller mänsklig research används endast där produktionsdata inte säkert kan besvara frågan före implementation. Planschen är inte pixel-spec.

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
| Build-underlag **Ung** | 3/10 | Korrekt för *bred* UX — Ung G (shell/ton/instrumentation) får byggas bakom flagg. |

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

Planschen v1 visade återkommande **login**, inte första användning. Varje grupp behöver **två** flöden (first use ≠ daily use) när ytan byggs eller mäts.

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

**I produktion / Liten:** Login → Idag → klart / förflyttning till nästa.  
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

**REK:** delning är en **handling på objektet**, inte en egen primäryta. Planschen v1 gav Delat stöd för stor informationsarkitektonisk vikt.

### 9.3 Login / Face ID

För tidigt att visa som nästan beslutat. Ungdomsidentitet är **OQ 1**.

Märk i karta och cirkulerande material:

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

Inte v1-bygge. Domänfel ska avslöjas i **instrumentation och kohort** — proto bara om produktion inte kan svara före implementation.

### 11.1 Pedagog (privacy stress-test för Ung)

- Noah delar en sak med pedagog.
- Vad ser pedagogen?
- Vad händer när Noah slutar dela? (OQ 6 — ingen policy uppfinns här; ytan får *visa frågan*, inte svara.)
- Syns tidigare historik? (OQ 6–7)

### 11.2 Två hem

- Pappa lägger familjeåtagandet *hos pappa*.
- Mamma är också parent.
- Ska mamma se det?

Om svaret alltid är “alla föräldrar ser Vårt” har vi redan fel modell. Specen: synlighet via `parent_child` + ev. boende, inte “alla vuxna”.

---

## 12. Validering — produktion först

Inte stora enkäter först. Inte “tycker ni planschen är bra?”. Inte 4–6 klickbara prototyper som obligatorisk gate.

### 12.1 Primär metod

| Default | Exception |
|---------|-----------|
| **Ship-to-learn** — copy, layout, startscheman, M-06 bakom flagg, navigation, stödgrad, stjärnor-användning | **Prove-before-ship** — vem som får läsa privat info, ungdomsidentitet, vårdnadshavaraccess, export/deletion, pedagogdelning, automatiska transitions, inference leakage |

Se de-risk-planen §0b.

### 12.2 Vad produktionen ska svara på

| Vem / yta | Fråga i produktion | Hypotes |
|-----------|-------------------|---------|
| **9–12** | Använder de appen efter content-fixen? Vilka aktiviteter läggs till? | **H1 / H2** |
| **M-06 (senare, flaggad)** | Används förslaget? Tar barnet mer ägarskap? | **H1-B** |
| **Ung G (flaggad, reversibel)** | Används Min dag / shell? Behövs mer stöd? | Presentation, inte access |
| **Ung E + kohort** | Används Mitt / Vårt? Delas saker frivilligt? | **H3** |
| **Förälder 07:15** | Finns ett nästa steg när Mitt är dolt? | **H5** |
| **Betalande vuxen** | Kvarstår värdet utan implicit insyn? | **H7 — måste bevisas** |
| **Maja 17** | Vill 17-åringen ha produkten alls? | Samma Ung-domän, inte egen app |

**Fråga inte först:** “Vilken design gillar du?”  
**Titta först på:** retention, vilka ytor som öppnas, vilka objekt som skapas/delas, om föräldern fortfarande har ett jobb klockan 07:15.

### 12.3 Undantag — proto / mänsklig research

Tillåtet **bara** när produktionsdata inte säkert kan besvara frågan *före* implementation — typiskt prove-before-ship-rader. Inte som skäl att rita om Ung eller blockera Mellan.

Om en proto ändå behövs: samma uppgifter som tidigare (matteprov → dela hjälp; förälder vill veta middag inte skolplanering). Barn/ungdom och förälder var för sig. Noah 14 och Maja 17 = samma yta, två testfall.

---

## 13. Implementationsskivor (inte proto-gate)

Kartan A/B/C synliggör H1. Den är **inte** en Figma-backlog som måste köras innan kod.

| # | Skiva | Gate | Får inte låtsas beslutat |
|---|-------|------|-------------------------|
| **1** | Liten daily oförändrad | Redan produktion | — |
| **2** | Mellan content (P0) | Ship-to-learn | Att H1 är “bara ton” |
| **3** | M-06 bakom flagg | Ship-to-learn efter content | Att förslag är Mellan-v1 |
| **4** | Ung G: ton / shell / stöd / Min dag / instrumentation | Flagg + befintlig access | Att shell = privacy-klar |
| **5** | Ung E: Mitt / Vårt / dela hjälp | Prove-before-ship: C + D + inference + S-10 | Face ID, “Delat stöd”-flik, stjärnor OFF |
| **6** | Förälder Hem med blandade barn | Mäts i kohort (H5/H7) | Elegant 3/5-karta som färdig UX |

Noah 14 och Maja 17 kör **samma** Ung-kärna — två produktionsfall, inte två appar.

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

**Ung (G nu bakom flagg · E + kohort efter C→D)**

- Används Mitt? Används Vårt?
- Delas saker frivilligt?
- Tappar föräldern värde? (**H7**)
- Fungerar Family OS fortfarande?
- Vill 17-åringen ha produkten alls?

## 14. Vad som medvetet *inte* görs här

- Revision 4 av den stängda specen.
- Ung-bredd eller 13+ i butikstext.
- Att låsa auth, Mitt/Vårt-copy, Face ID, stjärnor OFF, eller förälder-Hem.
- Att fylla föräldra-Hem för att undvika tomhet.
- Obligatorisk proto-runda innan Mellan eller Ung G.
- Att visa planschen v1 och fråga om den är snygg.

---

## 15. DoD för denna artefakt

Klart när:

1. Planschen v1 är märkt som kommunikation, inte build-underlag.
2. Kartan är tvådimensionell (autonomi × stöd) med ålder som default.
3. Fem rader + enhetsaxel + first/daily use finns.
4. Mellan A/B/C synliggör H1 utan att kräva Figma-runda.
5. Ung-detaljer (IA, delning, auth, stjärnor) är märkta NOT_VERIFIED / OQ.
6. Förälder-Hem är märkt H5/H7.
7. Validering är produktion först; proto bara som undantag.
8. Planschen v2 är **fryst**. Styrning: ship-to-learn vs prove-before-ship.

Tills produktion svarat: **detta är inte customer-backed för Ung-bredd.** Mellan-innehåll och Ung G får byggas. Privat ungdomsdata exponeras inte före C+D+E.

---

*Fryst hypoteskarta. Inte implementationskontrakt för Ung. Inte bevis för vad tonåringar vill ha.*
