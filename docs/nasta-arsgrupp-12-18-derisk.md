# Nästa årsgrupp 12–18 — De-risk och nästa fas

**Status:** Operativ plan efter stängd spec · **ingen spec-revision** · **ingen ADR här**  
**Datum:** 2026-09-09  
**Auktoritet:** Stängd spec `docs/nasta-arsgrupp-12-18-kravstallning.md` (rev. 3, merge `17a7c37e`). Detta dokument **ändrar inte** den specen.  
**Genomförandebeslut (founder, 2026-09-09):** två parallella *build*-spår med olika *release*-gates. Specen öppnas inte.

**Syfte:** Ta bort osäkerhet med produktion och stängda gates — inte med mer kravtext eller obligatorisk mänsklig research.

**UX-plansch v2 och hypoteskartan är FRYSTA.** Founder: 9/10 som hypoteskarta. **STOP på fler planschiterationer.** Forskning ger riktning. Produktdata avgör.

| Dokument | Roll |
|----------|------|
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.md` | Fryst 2D-karta: vad som är reversibelt vs måste provas före exponering |
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.html` | Visuell hypoteskarta (inte mockup att koda) |

---

## 0. Vad som redan är låst

| Låst | Innebörd |
|------|----------|
| Spec-runda **STÄNGD** | Ingen revision 4. OQ lämnas öppna tills rätt spår stänger dem. |
| Mellan = produktion | Byggs för riktiga 9–12-familjer. Bred release när vanliga gates är gröna. |
| Ung = parallell build | Riktig användbar v1-kärna, **inte** bara spike. Bakom feature flag / allowlist. Bredlanseras inte förrän identity + privacy + legal + inference + S-10 tillåter. |
| Ung-personas | Samma domän. **Testperson 14** primär. **Stress-test 17** — om 17-åringen inte vill ha produkten ska vi upptäcka det, inte designa runt det. Inte två produktlägen. |
| S-10 | Ingen tyst rights/privacy-övergång vid födelsedag / `ageBand` / recommended presentation. |
| Presentation ≠ access | Ålder föreslår. Policy/ägarskap/delning styr beteende. |
| Legal exceptions | Inte uppfunna i spec. Kommer bara från legal memo + explicit policy. |

**Mellan och Ung byggs parallellt.** Mellan får bred produktionsrelease när dess vanliga gates är gröna. Ung byggs bakom separat rollout-gate och får endast exponeras i den omfattning legal, identity, privacy, security och S-10 tillåter. **Ung får aldrig blockera Mellan.**

**Förbjudet nu:** bredlansera Ung, lova 13+ i butik, tyst rights-change, behandla planschen som pixel-spec, eller använda riktiga barn som legal-/säkerhetsexperiment. Ung *får* byggas parallellt bakom flagga. Mellan *får inte* vänta på Ung.

---

## 0b. Default: ship-to-learn

```
Default:   ship-to-learn
Exception: prove-before-ship när felet är irreversibelt,
           osäkert, juridiskt consequential eller privacy-förstörande
```

| Ship-to-learn (produktion är primär validering) | Prove / gate före exponering |
|-------------------------------------------------|------------------------------|
| Copy, layout, startscheman | Vem som får läsa privat information |
| M-06 (bakom flagg när det byggs) | Ungdomsidentitet |
| Navigation, stödgrad, visuell ton | Vårdnadshavaraccess |
| Om användare gillar stjärnor (H4 i kohort) | Dataexport / deletion |
| Min dag, shell, instrumentation | Pedagogdelning |
| Familjeåtaganden där *befintlig* accessmodell räcker | Automatiska transitions |
| | Inference leakage |

Byggbarhet och releasebarhet är **två olika gates**. Hypoteskartan styr vilka delar som ska implementeras reversibelt och instrumenteras. Produktion är primär valideringsmiljö. Klickbara prototyper eller mänsklig research används **endast** där produktionsdata inte säkert kan besvara frågan före implementation.

B2 som obligatorisk research-gate (4–6 prototyper + kvalitativ runda *innan* mer UX) är **borttagen**.

---

## 1. Hur en risk faktiskt tas bort

En risk är inte borta för att den är välformulerad. Den är borta när **ett av** följande är sant:

1. **Mätt och håller** — hypotesen har baseline, observation och inte träffat stop-guardrail.
2. **Mätt och falsk** — ni byter riktning (annat Mellan-innehåll, annan vuxennytta, inget Ung-erbjudande, etc.).
3. **Beslutad av rätt ägare** — ADR för produktarkitektur, legal memo för rättslig grund. Inte agentgissning.
4. **Medvetet utanför v1** — t.ex. veckopeng (OQ 15), socialt, ny valuta.

Mer spec-prosa är **inte** en femte väg. En proto-runda är **inte** en sjätte väg om produktion kan svara.

---

## 2. Rekommenderad körordning

```
NU, parallellt
  ├─ A. Mellan build + production learning
  ├─ B. H1 production measurement
  ├─ C. Legal memo SE / FI / IE          → blockerar Ung-exponering av privat data, inte Mellan
  └─ G. Ung implementation foundation
        ├─ presentation / shell
        ├─ support modes
        ├─ instrumentation
        └─ reversible UX
           (befintlig accessmodell; ingen ny privacy-yta mot riktiga ungdomar)

C → D. ADR: identity / ownership / sharing / transition

D → E. Ung privacy/ownership implementation
       + inference security gates

DÄREFTER
  Ung controlled production rollout (allowlist)
  → H4 / H5 / H7 / moat from real use
  → expand or change direction
```

| Spår | Vem | Gate innan |
|------|-----|------------|
| **Mellan-P0** | Relevanta 9–12-familjer | Vanliga produkt-/testgates gröna. H1 *mäts*, avgörs inte i förväg. |
| **Ung G** | Intern / flaggad, ingen ny privat ungdomsdata | Reversibelt. Använder befintlig access. Ingen tyst rights-change. |
| **Ung E + kohort** | Explicit allowlist | C + D + inference + S-10. H7 öppen. |
| **Ung bredd** | Alla | Kohorten håller. Inget butikslöfte 13+ innan. |

**Privat default** är **REK** tills legal review. Inte “privat som standard” i cirkulerande material utan den märkningen.

---

## 3. Riskregister → vilket spår som tar bort den

| Risk (ur stängd spec) | Tas bort av | Stop om |
|-----------------------|-------------|---------|
| 9–12 lämnar p.g.a. ton *eller* kontrakt (H1) | A + B | Mellan-copy shippas som om H1 vore avgjord |
| Mellan uteblir medan Ung diskuteras | A | Ung-arbete stjäl Mellan-P0 |
| C-01 vs skapa egna objekt | D | Self-planning kodas utan ADR |
| Tyst övergång 12→13 (S-10 vs U-07) | D + E | Födelsedag ändrar `reward_model` / Mitt-default |
| Obligatorisk vårdnadshavarinsyn okänd (OQ 12) | C | “Aldrig läsrätt” eller full spegling kodas |
| Identitet 13+ / avtalspart (OQ 1) | C sedan D | `child`+PIN eller e-post antas p.g.a. GDPR-13 |
| Delat stöd: återkalla, historik, export (OQ 6–7) | C + D | Policy uppfinns i kod och exponeras |
| Inference leakage | E | Kohort “klar” utan metadata-test |
| Hem tomt för förälder till 14-åring (H5) | E + kohort | Ung-bredd utan förälder-värde |
| Betalande vuxen tappar WTP (H7) | Kohort (bevisas) | Packaging antas oförändrad. **H7 — måste bevisas.** |
| Ung = Reminders (moat) | E + kohort | P0 blir privata todos / Mina mål / XP |
| Mitt/Vårt/Delat inte begripligt | G (copy/IA bakom flagg) + kohort | Termer hårdkodas som evig sanning |
| Planschen behandlas som build-spec | Fryst karta + denna princip | Agent “implementerar planschen” |
| Face ID / Mitt-flik / stjärnor OFF låses | Prove-before-ship / H4 i kohort | Ung-detaljer ritas som beslut |
| Store lovar 13+ innan Ung finns | A + butikstext orörd | Deklaration/copy utökas |
| Familje-OS / samma Journey till 18 | Kohort efter E | Behandlas som FACT |

---

## 4. Spår A — Mellan build + production learning

**Varför först:** samma betalande vuxen, samma Liten-syskon, kortaste vägen till lärande. Blockeras inte av Ung, legal eller ADR.

**Artefakt:** `docs/nasta-arsgrupp-12-18-mellan-innehall.md` + `docs/nasta-arsgrupp-12-18-mellan-p0.md`. Innehåll, copy, startschema, För dig-mål. Inte ny kärnmodell.

**Måste innehålla**

- P0 från spec: M-01–M-05, M-10 (världar, copy, startschema 9–12, För dig, text+bildstöd, NPF kvar).
- **TEST NEXT (inte P0):** M-06 som *mätbar* början på “Göra tillsammans”, bakom flagg när den byggs.
- Land-lokaliserbara namn. Inte “mellanstadium” som domän.
- Acceptans: Noah 11 på 5 s utan förskolekänsla; Olle 7 oförändrad.
- Explicit: Mellan v1 **bygger inte** Mitt-privacy eller ung-policy.

**Måste inte** (håller scope)

- Ung-ytor, e-postkonto, stjärnor OFF, Delat stöd, fält-ACL, veckopeng, 13+-butikscopy.

**Osäkerhet den tar bort:** “vi har inget att lära kommersiellt av 9–12.”  
**Osäkerhet den *inte* tar bort:** H1 (behöver mätning), H5/H7 (Ung-kohort).

**DoD:** Mellan-P0 kan shippas till relevanta 9–12-familjer utan att öppna Ung-OQ.

---

## 5. Spår C — Legal memo (SE, FI, IE)

**Varför före ADR och före Ung-exponering av privat data:** ADR får inte “lösa legal med kodantaganden”. Memo är input. Befintlig IE-track (`docs/p-ie-launch/…`) är **lanseringsrisk** för nuvarande 3–12-app — den svarar **inte** automatiskt på Ung-OQ.

**Artefakt:** ett memo, tre marknader i samma mall, skillnader per rad. Inte tre produktforkar.

**Varje marknad måste svara, per behandling — inte med features**

| Fråga | Varför |
|-------|--------|
| **Först:** vilken rättslig grund använder produkten för *varje* behandling? | Inte “vad är samtyckesåldern?”. Avtal / berättigat intresse / samtycke är **NOT_VERIFIED** per behandling. |
| **Därefter:** är GDPR art. 8 över huvud taget tillämplig på *just den* behandlingen? | Art. 8 gäller när en kommersiell ISS erbjuds *direkt till barnet* **och** behandlingen *baseras på barnets samtycke*. Art. 8.3 påverkar **inte** nationell avtalsrätt. |
| **Bara om art. 8 gäller:** vilken digital samtyckesålder då? | IMY: 13 i Sverige i just det fallet. FI 13, IE 16 när tjänsten förlitar sig på consent. **Avgör inte** kontoform, avtalspart eller access. |
| Ungdomsidentitet: vad *får* vs *måste* produkten ha | OQ 1 — efter grund, inte före |
| Vårdnadshavarrelation: vilken insyn kan vara obligatorisk | OQ 12 — uppfinna varken noll eller allt |
| Export / delete / separation, inkl. 18+ | OQ 13 |
| Pedagogdelning: ändras grund eller bevarandekrav | OQ 7 |
| Vad som är produktkonstitution vs marknadspolicy | OQ 11 |

**Får inte:** skapa safeguarding-produkt, hårdkoda 13 som access, anta svensk kärnfamilj/skola, översätta Mitt/Vårt till “klart i alla språk”.

**Konsumera:** ADR-018 (`country_code` / `market_region`) — policy/config, inte ny kärna.

**DoD:** grundare + jurist kan peka på vilka OQ som är legal-låsta vs fortfarande produkt. Inga “dolda läsrätter” som sidoeffekt.

**C blockerar inte Mellan. C blockerar inte Ung G (reversibel foundation). C blockerar att privat ungdomsdata exponeras på ett sätt där läckage kan ske.**

---

## 6. Spår D — ADR (identity / ownership / sharing / transitions)

**När:** efter att C gett ramar *eller* tydliga luckor märkta LEGAL. Inte före.

**Artefakt:** en eller få ADR i `docs/adr/` enligt befintlig mall. Citerar stängd spec + legal memo. Ändrar inte POS utan att säga det.

**ADR ska låsa (produktarkitektur)**

- Presentation vs policy (redan REK — gör till beslut).
- Objektgränser: Mitt / Vårt / Delat stöd som *domän*, inte fält-ACL.
- Access härleds: identitet + relation + ägarskap + typ + explicit delning + legal/market policy. Ingen `parent_visibility`-nivå.
- S-10: explicit, begriplig, reversibel transition där legal tillåter. Födelsedag ändrar inte `reward_model` tyst (motsägelse 9 i spec).
- C-01-omtolkning: få självval ≠ vuxenadmin-labb. Utan detta: ingen `self_planning`-kod.
- Server är auktoritet (S-06).

**ADR får föreslå men inte låtsas legal-klart**

- OQ 3–5 (vem skapar/accepterar Mitt vs Vårt).
- OQ 9–10 (presentation-förslag vs transition).
- Identitets*modell* som *alternativ* (fortsatt `child`+PIN vs tredje typ) — valet väntar på C.

**ADR ska lämna öppet tills C / kohort**

- OQ 1, 6–8, 12–13 (konto, återkalla/historik/export, obligatorisk insyn, exit).
- H4/H7 som produktfakta.
- Marknadsföra 13+.

**DoD:** en utvecklare kan inte “råka” koda tyst åldersbehörighet eller förälder=läs-allt. En utvecklare kan heller inte tro att ADR ersätter legal memo.

---

## 7. Spår G — Ung implementation foundation (nu, reversibelt)

**När:** parallellt med Mellan. **Inte** blockerat av C/D så länge ingen ny privat ungdomsdata exponeras.

**Får byggas nu bakom flagg / allowlist**

- Vuxen / neutral visuell ton
- Ung-shell och navigation
- Stödintensitet som *presentation* (NPF kan slås på)
- Min dag
- Familjeåtaganden som koncept där **befintlig** accessmodell räcker
- Instrumentation (användning av ytor — inte PII-läckage)
- Testfamiljer / intern allowlist

**Får inte exponeras mot riktiga ungdomar förrän C + D + E**

- Ny privacy-yta (Mitt som privat default mot vårdnadshavare)
- Ny identitetsmodell
- Ny vårdnadshavaraccess
- Export / deletion-policy för ungdomsobjekt
- Pedagogdelning av privat ungdomsdata
- Automatiska transitions
- Något som kan läcka via inference

**Inte i Ung v1 alls:** Mina mål · social/feed/chat · hälsa/GPS · ny valuta · automatisk rights-change på födelsedag · full 16–18-yta.

---

## 7b. Spår E — Ung privacy/ownership + inference

**När:** efter C → D. Sedan kontrollerad produktionskohort.

**Artefakt:** flaggad produktkärna + acceptanskriterier. Inte butikslöfte. Inte 16–18 som egen app.

**Ung v1-yta (hård scope, efter gates)**

Min dag · egna saker (Mitt, privat default = REK) · familjeåtaganden (Vårt) · explicit “dela för hjälp” på objektet · vuxnare presentation · NPF-stöd kan slås på · device-session när ADR/legal tillåter.

**Enda P0-scenariot som måste kunna falsifieras innan kohorten växer**

1. Noah 14 skapar “Matteprov fredag” = Mitt, privat default, inte implicit delat.
2. “Middag 18:00” = Vårt, synligt för *relevant* vuxen via relation — inte “alla vuxna”.
3. Noah kan dela matteprovet explicit (Delat stöd).
4. Obehörig kan inte **läsa eller härleda** existens/innehåll via: API, counts, timestamps, summary, SSE, notis, analytics, rapport, export, Hem, pedagogvy, sök, cache/offline, användarsynlig audit.
5. Noah fyller 13 på natten: ingen tyst change av ägarskap, privacy, API-access, insyn, notiser, `reward_model`.

**Stoppa Ung-bredd (inte Mellan) om:** läckage **eller** förälder-Hem blir tomt/värdelöst (H5).

**DoD:** någon kan säga nej med evidens från riktig kohort. “Känns bra” räcker inte.

---

## 8. Spår B + kohortmätning

Ingen framgångssiffra hittas på här. Planen ska bara göra hypoteserna **omöjliga att “känna” till sanning**.

H1 mäts på *befintliga* 9–12-familjer och efter Mellan-P0. Se `docs/nasta-arsgrupp-12-18-h1-audit.md`. H4/H5/H7/moat mäts i **kontrollerad Ung-kohort** när E är tillåten — inte i Figma och inte som obligatorisk intervju-runda först.

| ID | Fråga | Baseline (före slutsats) | Vad ni tittar på | Guardrail / stop | Inte |
|----|-------|--------------------------|------------------|------------------|-----|
| **H1** | Ton *eller* ägarskapskontrakt hos 9–12? | Prod-beteende per band *nu* (h1-audit §2) | Retention, rutiner, barnvy vs vuxen-bock, senare M-06 | Shippa bara copy om *beteende* lutar kontrakt | Teen scores; anta ton; “bara förälder redigerar” = cirkel; ledande intervju |
| **H2** | Ökar Mellan retention 9–12? | Samma band *före* Mellan-P0 | Kvarvaro / veckoaktivitet efter innehåll | Stoppa mer Mellan-yta om ingen rörelse | Blanda ihop med Ung |
| **H4** | Är stjärnor OFF rätt *när ung-policy antagits*? | Kohort med båda defaults | Acceptans, inte födelsedagsmagi | ON-default i testarm om OFF sänker användning utan vinst | Auto-OFF på födelsedag |
| **H5** | Räcker Vårt + explicit delning för föräldernytta? | Förälderns Hem-jobb idag (07:15) | Kan hen fortfarande ta *ett* nästa steg? | Inget Ung-ship om Hem är tomt | Spegling som “fix” |
| **H7** | Fortsätter betalande vuxen se premiumvärde utan implicit insyn? | Varför de betalar *nu* | Samma skäl kvar utan Mitt-insyn? | Annan packaging / inte samma erbjudande. **Måste bevisas.** | Hitta på WTP-% |
| **Moat** | Varför inte Reminders + kalender + SMS? | Familjens faktiska alternativ | Åtaganden + övergång + NPF + syskon + ett OS | Feature som är en påminnelse-app → ute | “Vi har privata todos” |
| **H3** | Värderar 13–15 Mitt+Vårt? | Efter begriplig kohort, inte före | Använder båda gränserna | Ung-release stopp | Bygg mål-yta för att rädda |

**H6** (NPF + vuxnare presentation) valideras i Mellan (stöd kvar) och i Ung G/E (Noah 14 + support_profile). Inte kliniskt löfte.

**Segment:** presentation/policy, inte “teen engagement score”. Inga känsliga ungdomsmetriker.

**DoD mätplan:** varje hypotes ovan har ägare, datakälla, och en mening om vad som får er att *sluta* — innan någon kallar resultatet bevis.

Kvalitativa uppgifter eller proto får användas **senare** om produktionen inte kan svara — inte som skäl att rita om Ung eller blockera Mellan.

---

## 9. Vad som medvetet *inte* görs i denna fas

- Revision 4 av kravställningen.
- Ung *bredd* eller 13+ i butikstext innan C+D+E håller.
- Att behandla 13–15 och 16–18 som två produktlägen.
- ADR som påstår legal sanning.
- Safeguarding-feature.
- 13+ i butikstext eller Families/Kids-deklaration.
- Nytt bundle-id, socialt, habit tracker, ersättningsvaluta.
- Att stänga OQ i chatt.
- Att behandla åldersplanschen eller hypoteskartan som UI att implementera.
- Obligatorisk 4–6-proto-runda innan Mellan eller Ung G.

---

## 10. DoD för de-risk-fasen (inte för specen)

De-risk-fasen har *börjat* när A (Mellan-P0) är i produktion, B mäter H1, C är beställd, och G får starta parallellt bakom flagga. Den har *lyckats för Mellan* när 9–12 har eget innehåll och H1 inte längre är gissning. Den har *lyckats för Ung* först när C + D + E finns och Noah-scenariot kan underkännas *i riktig kohort*.

Tills Ung-gates är stängda: **Mellan är bredden. Ung är en kontrollerad produkt under uppbyggnad, inte en plansch och inte en research-proto.**

---

## 11. Pekare

| Dokument | Roll |
|----------|------|
| `docs/nasta-arsgrupp-12-18-kravstallning.md` | Stängd spec (rev. 3) — OQ, H1–H7, S-10, läckagekanaler |
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.md` | Fryst karta + ship-to-learn vs prove-before-ship |
| `docs/nasta-arsgrupp-12-18-plansch-v2.png` | Fryst plansch v2 — inte mer iteration |
| `docs/nasta-arsgrupp-12-18-mellan-innehall.md` | Spår A — Mellan innehållsspec |
| `docs/nasta-arsgrupp-12-18-mellan-p0.md` | Mellan-P0 leverans: BUILD NOW vs TEST NEXT |
| `docs/nasta-arsgrupp-12-18-h1-audit.md` | Spår B — H1 produktion först |
| Detta dokument | Hur osäkerhet tas bort |
| `docs/adr/` | Kommande D — skriv inte förrän C gett ramar |
| `docs/p-ie-launch/track-1-legal-compliance/` | Befintlig IE-lansering 3–12; inte Ung-svar |
| `docs/adr/ADR-018-family-market-jurisdiction.md` | Land ≠ språk; återanvänd |

---

*Ingen revision av den stängda specen. Inga OQ antagna som beslut. Ingen Ung-bredd utan gates. Ingen B2-research-gate.*
