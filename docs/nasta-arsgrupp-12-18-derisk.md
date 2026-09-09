# Nästa årsgrupp 12–18 — De-risk och nästa fas

**Status:** **GODKÄND** operativ plan (2026-09-09) · spec STÄNGD · Ung **inte** startad  
**Typ:** De-risk-plan · **ingen kod** · **ingen ADR** · **ingen spec-revision**  
**Auktoritet:** Stängd spec `docs/nasta-arsgrupp-12-18-kravstallning.md` (rev. 3, merge `17a7c37e`). Detta dokument **ändrar inte** den specen.

**Syfte:** Ta bort osäkerhet med artefakter och tester — inte med mer kravtext.

**UX-plansch v1 är inte evidens.** Founder-review 2026-09-09: ~7/10 som visualisering, 4–5/10 som build-underlag. Får inte behandlas som beslut. Nästa kommunikationsyta är hypoteskartan, inte snyggare appar.

| Dokument | Roll |
|----------|------|
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.md` | Research-protokoll + tvådimensionell karta |
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.html` | Visuell hypoteskarta (inte mockup att koda) |

---

## 0. Vad som redan är låst

| Låst | Innebörd |
|------|----------|
| Spec-runda **STÄNGD** | Ingen revision 4. OQ lämnas öppna tills rätt spår stänger dem. |
| Mellan = första kommersiella leverans | Samma v1-kontrakt som Liten + ton/innehåll + grodd till “Göra tillsammans” (M-06). |
| Ung = architecture spike | Inte release. Inte butikslöfte 13+. |
| S-10 | Ingen tyst rights/privacy-övergång vid födelsedag / `ageBand` / recommended presentation. |
| Presentation ≠ access | Ålder föreslår. Policy/ägarskap/delning styr beteende. |
| Legal exceptions | Inte uppfunna i spec. Kommer bara från legal memo + explicit policy. |

**Förbjudet nu:** bygga Ung-produkt för att specen är klar. Specen säger att Ung ska *de-riskas*. Mellan är det ni ska kunna få ut och lära er kommersiellt av.

---

## 1. Hur en risk faktiskt tas bort

En risk är inte borta för att den är välformulerad. Den är borta när **ett av** följande är sant:

1. **Mätt och håller** — hypotesen har baseline, observation och inte träffat stop-guardrail.
2. **Mätt och falsk** — ni byter riktning (annat Mellan-innehåll, annan vuxennytta, inget Ung-erbjudande, etc.).
3. **Beslutad av rätt ägare** — ADR för produktarkitektur, legal memo för rättslig grund. Inte agentgissning.
4. **Medvetet utanför v1** — t.ex. veckopeng (OQ 15), socialt, ny valuta.

Mer spec-prosa är **inte** en femte väg.

---

## 2. Rekommenderad körordning

Gör **inte** fem saker i serie om de är oberoende. Gör **inte** Ung-kod för att fylla luckor.

```
NU, parallellt
  ├─ A. Mellan innehållsspec          → kommersiell leverans (copy/schema/För dig — inte låst UI)
  ├─ B. Mätplan H1 (ev. H2-upplägg)   → lär av 9–12 som redan finns
  ├─ B2. Kvalitativ UX-research       → hypoteskarta + 4–6 klickbara proto
  └─ C. Legal memo SE / FI / IE       → rättslig grund, inte produktfeatures

DÄREFTER
  └─ D. ADR: identity / ownership / sharing / transitions
         (konsumerar C; uppfinner inte legal)

SEDAN
  ├─ E. Ung spike-kontrakt (Noah + inference + S-10)
  └─ F. Mätplan H4, H5, H7, moat (+ H3)
         måste finnas innan spike får kallas “bevis”
```

**REK:** A är det enda som får bli *produkt* i närtid. **A får inte bygga Mellan-UI som om planschen v1 eller variant B vore vald** — H1 och Mellan A/B/C är öppna. B2 (kvalitativa uppgifter på klickbara proto) tar bort mer UX-osäkerhet än mer skärmdesign. C blockerar D. D + F blockerar att E tolkas som go-ship. E blockerar Ung-release, inte Mellan.

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
| Delat stöd: återkalla, historik, export (OQ 6–7) | C + D | Policy uppfinns i spike-kod |
| Inference leakage | E | Spike “klar” utan metadata-test |
| Hem tomt för förälder till 14-åring (H5) | E + F | Ung-release utan förälder-värde |
| Betalande vuxen tappar WTP (H7) | F (förbered), E (signal) | Packaging antas oförändrad |
| Ung = Reminders (moat) | E + F | P0 blir privata todos / Mina mål / XP |
| Mitt/Vårt/Delat inte begripligt / inte internationellt | A (sv copy 9–12), **B2** (beteendetest), F (språktest), inte fork | Termer hårdkodas som evig sanning |
| Planschen v1 behandlas som build-spec | **B2** | Agent/design “implementerar planschen” |
| H1 avgörs som “bara ton” utan A/B/C-proto | **B2** + B | Mellan shippas som vuxnare Liten |
| Face ID / Mitt-flik / stjärnor OFF låses i UI | **B2** | Ung-detaljer ritas som beslut |
| Store lovar 13+ innan Ung finns | A + butikstext orörd | Deklaration/copy utökas |
| Familje-OS / samma Journey till 18 | F efter E | Behandlas som FACT |

---

## 4. Spår A — Mellan innehållsspec

**Varför först:** samma betalande vuxen, samma Liten-syskon, kortaste vägen till lärande. Blockeras inte av Ung, legal eller ADR.

**Artefakt:** eget dokument (inte rev. 4 av kravställningen). Innehåll, copy, startschema, För dig-mål. Inte ny kärnmodell.

**Måste innehålla**

- P0 från spec: M-01–M-05, M-10 (världar, copy, startschema 9–12, För dig, text+bildstöd, NPF kvar).
- P1 grodd: M-06 som *mätbar* början på “Göra tillsammans” — förslag från barnet, förälder godkänner. Inte dekoration.
- Land-lokaliserbara namn. Inte “mellanstadium” som domän.
- Acceptans: Noah 11 på 5 s utan förskolekänsla; Olle 7 oförändrad.
- Explicit: Mellan v1 **bygger inte** Mitt-privacy eller ung-policy.

**Måste inte** (håller scope)

- Ung-ytor, e-postkonto, stjärnor OFF, Delat stöd, fält-ACL, veckopeng, 13+-butikscopy.

**Osäkerhet den tar bort:** “vi har inget att lära kommersiellt av 9–12.”  
**Osäkerhet den *inte* tar bort:** H1 (behöver mätning), H5/H7 (Ung).

**DoD:** en innehållsspec som en agent kan bygga Mellan-P0 från utan att öppna Ung-OQ.

---

## 5. Spår C — Legal memo (SE, FI, IE)

**Varför före ADR:** ADR får inte “lösa legal med kodantaganden”. Memo är input. Befintlig IE-track (`docs/p-ie-launch/…`) är **lanseringsrisk** för nuvarande 3–12-app — den svarar **inte** automatiskt på Ung-OQ.

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

**ADR ska lämna öppet tills C/F**

- OQ 1, 6–8, 12–13 (konto, återkalla/historik/export, obligatorisk insyn, exit).
- H4/H7 som produktfakta.
- Marknadsföra 13+.

**DoD:** en utvecklare kan inte “råka” koda tyst åldersbehörighet eller förälder=läs-allt. En utvecklare kan heller inte tro att ADR ersätter legal memo.

---

## 7. Spår E — Ung spike-kontrakt

**När:** D har låst presentation/policy/S-10/objektgränser tillräckligt för att *testa*. C har sagt vad som inte får antas.

**Artefakt:** kort kontrakt (acceptanskriterier). Inte release-plan. Inte UI-spec för hela Ung.

**Enda P0-scenariot som måste kunna falsifieras**

1. Noah 14 skapar “Matteprov fredag” = Mitt, privat default, inte implicit delat.
2. “Middag 18:00” = Vårt, synligt för *relevant* vuxen via relation — inte “alla vuxna”.
3. Noah kan dela matteprovet explicit (Delat stöd).
4. Obehörig kan inte **läsa eller härleda** existens/innehåll via: API, counts, timestamps, summary, SSE, notis, analytics, rapport, export, Hem, pedagogvy, sök, cache/offline, användarsynlig audit.
5. Noah fyller 13 på natten: ingen tyst change av ägarskap, privacy, API-access, insyn, notiser, `reward_model`.

**Stoppa Ung-release (inte Mellan) om:** läckage **eller** förälder-Hem blir tomt/värdelöst (H5).

**Utanför spike:** Mina mål, ny valuta, socialt, hälsa/GPS, 13+-storecopy, pedagog-exportpolicy (OQ 7).

**DoD:** någon kan säga nej med evidens. Spike som “känns bra” räcker inte.

---

## 8. Spår B + F — Mätplan

Ingen framgångssiffra hittas på här. Planen ska bara göra hypoteserna **omöjliga att “känna” till sanning**.

Skriv mätplanen **innan** ni drar produkt-slutsats. H1 kan börja på *befintliga* 9–12-familjer innan Mellan shippas. H4/H5/H7/moat väntar på spike eller strukturerad förälder/ung-intervju — inte på en live Ung-release.

| ID | Fråga | Baseline (före slutsats) | Vad ni tittar på | Guardrail / stop | Inte |
|----|-------|--------------------------|------------------|------------------|-----|
| **H1** | Ton *eller* ägarskapskontrakt hos 9–12? | Prod-beteende per band *nu* (se h1-audit §2) | Retention, rutiner, barnvy vs vuxen-bock, senare M-06 | Shippa bara copy om *beteende* lutar kontrakt | Teen scores; anta ton; “bara förälder redigerar” = cirkel; ledande intervju |
| **H2** | Ökar Mellan retention 9–12? | Samma band *före* Mellan-P0 | Kvarvaro / veckoaktivitet efter innehåll | Stoppa mer Mellan-yta om ingen rörelse | Blanda ihop med Ung |
| **H4** | Är stjärnor OFF rätt *när ung-policy antagits*? | Spike/intervju med båda defaults | Acceptans, inte födelsedagsmagi | ON-default i testarm om OFF sänker användning utan vinst | Auto-OFF på födelsedag |
| **H5** | Räcker Vårt + explicit delning för föräldernytta? | Förälderns Hem-jobb idag (07:15) | Kan hen fortfarande ta *ett* nästa steg? | Inget Ung-ship om Hem är tomt | Spegling som “fix” |
| **H7** | Fortsätter betalande vuxen se premiumvärde utan implicit insyn? | Varför de betalar *nu* (struktur, blandade barn, Journey, koordinering) | Samma skäl kvar utan Mitt-insyn? | Annan packaging / inte samma erbjudande | Hitta på WTP-% |
| **Moat** | Varför inte Reminders + kalender + SMS? | Familjens faktiska alternativ | Åtaganden + övergång + NPF + syskon + ett OS | Feature som är en påminnelse-app → ute | “Vi har privata todos” |
| **H3** | Värderar 13–15 Mitt+Vårt? | Efter begriplig proto/spike, inte före | Använder båda gränserna | Ung-release stopp | Bygg mål-yta för att rädda |

**H6** (NPF + vuxnare presentation) valideras i Mellan (stöd kvar) och i spike (Noah 14 + support_profile). Inte kliniskt löfte.

**Segment:** presentation/policy, inte “teen engagement score”. Inga känsliga ungdomsmetriker.

**DoD mätplan:** varje hypotes ovan har ägare, datakälla, och en mening om vad som får er att *sluta* — innan någon kallar resultatet bevis.

---

## 8b. Spår B2 — Kvalitativ UX-research (hypoteskarta)

**Varför nu:** Founder-review av åldersplanschen. Strategin håller. Specifika skärmar är nästan obevisade. Största risken är att en övertygande plansch blir beslut.

**Artefakt:** `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.md` (+ HTML-karta). Inte rev. 4. Inte produktkod.

**Måste innehålla / följa**

- Två axlar: autonomi × stödintensitet. Ålder = typisk default.
- Fem rader: Liten · Mellan · Ung 13–15 (Noah 14) · Ung 16–18 (Maja 17) · Förälder.
- Enhetsaxel och first use ≠ daily use.
- Tre Mellan-proto (A vuxnare Liten / B förslag / C delat skapande) mot H1.
- Ung: testa IA (Mitt/Vårt vs tidslinje); delning på objektet; auth märkt OQ; stjärnor = H4.
- Förälder-Hem märkt H5/H7 — fyll inte tomrum med surveillance.
- Pedagog + två hem som stress-test, inte v1-bygge.
- Rekrytering och *beteendeuppgifter*, inte “tycker ni planschen är snygg?”.

**Nästa 10/10-steg i B2:** 4–6 klickbara UX-hypoteser. Inte snyggare UI.

**Osäkerhet den tar bort:** “vi vet hur 9–17-ytan ska se ut.”  
**Osäkerhet den *inte* tar bort:** legal (C), inference-läckage (E), WTP-siffror (F).

**DoD:** en agent kan inte ärligt säga att planschen v1 är build-underlag. En research-runda kan underkänna Mellan-B, Mitt/Vårt-flikar eller förälder-Hem utan att skriva om specen.

---

## 9. Vad som medvetet *inte* görs i denna fas

- Revision 4 av kravställningen.
- Produktkod, spike-implementation, feature flags för Ung i prod.
- ADR som påstår legal sanning.
- Safeguarding-feature.
- 13+ i butikstext eller Families/Kids-deklaration.
- Nytt bundle-id, socialt, habit tracker, ersättningsvaluta.
- Att stänga OQ i chatt.
- Att behandla åldersplanschen v1 eller hypoteskartan som UI att implementera.

---

## 10. DoD för de-risk-fasen (inte för specen)

De-risk-fasen har *börjat* när A, B, **B2** och C är igång. Den har *lyckats för Mellan* när innehållsspecen är byggbar och H1 inte längre är gissning (B + B2: ton vs ägarskap, inte bara copy). Den har *lyckats för Ung* först när C + D + E + F finns och Noah-scenariot kan underkännas. B2 kan underkänna Mitt/Vårt-flikar och förälder-Hem *innan* E kodas.

Tills dess: **Mellan är produkten. Ung är ett kontrakt att bevisa.**

---

## 11. Pekare

| Dokument | Roll |
|----------|------|
| `docs/nasta-arsgrupp-12-18-kravstallning.md` | Stängd spec (rev. 3) — OQ, H1–H7, S-10, läckagekanaler |
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.md` | Fryst hypoteskarta — inte build-spec |
| `docs/nasta-arsgrupp-12-18-ux-hypoteskarta.html` | Visuell hypoteskarta — inte appar att koda |
| Detta dokument | Godkänd de-risk-plan · hur osäkerhet tas bort |
| `docs/nasta-arsgrupp-12-18-mellan-innehall.md` | Spår A — Mellan innehållsspec |
| `docs/nasta-arsgrupp-12-18-h1-audit.md` | Spår B — H1 produktion först, *varför* bara vid behov |
| `docs/adr/` | Kommande D — skriv inte förrän C gett ramar |
| `docs/p-ie-launch/track-1-legal-compliance/` | Befintlig IE-lansering 3–12; inte Ung-svar |
| `docs/adr/ADR-018-family-market-jurisdiction.md` | Land ≠ språk; återanvänd |

---

*Ingen produktkod. Ingen ADR. Inga OQ antagna som beslut. Ingen revision av den stängda specen.*
