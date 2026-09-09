# Nästa årsgrupp 12–18 — De-risk och nästa fas

**Status:** **GODKÄND** operativ plan · uppdaterad 2026-09-09 (grundarbeslut: Ung v1 parallellt bakom grind)  
**Typ:** Operativ plan · **inte** spec-revision · **inte** ADR  
**Auktoritet:** Stängd spec `docs/nasta-arsgrupp-12-18-kravstallning.md` (rev. 3). Detta dokument **ändrar inte** den specen och **öppnar inte** OQ.

**Syfte:** Ta bort osäkerhet med artefakter och tester — inte med mer kravtext.

---

## 0. Vad som redan är låst

| Låst | Innebörd |
|------|----------|
| Spec-runda **STÄNGD** | Ingen revision 4. OQ lämnas öppna tills rätt spår stänger dem. |
| Mellan | Byggs för **bred produktion nu**. Blockeras inte av Ung. |
| Ung | Byggs **parallellt som riktig v1**, bakom feature flag / allowlist, med hårdare release-gates. Inte “byggs inte”. Inte heller bred 13+-store. |
| S-10 + inference leakage | **P0** för all Ung-kod. |
| Identity / privacy / access | Styrs av **legal memo + ADR**. Inte av flagg eller födelsedag. |
| Legal exceptions | Inte uppfunna i spec. Kommer bara från legal memo + explicit policy. |

**Operativt beslut (ersätter “Ung byggs inte”):** Ung byggs parallellt för verklig produktionsvalidering, men releaseomfånget begränsas av legal-, privacy-, security- och architecture-gates. Mellan får inte blockeras av Ung.

Detaljer: `docs/nasta-arsgrupp-12-18-ung-v1-build-release.md`.

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

Gör **inte** fem saker i serie om de är oberoende. Mellan väntar **inte** på Ung. Bred Ung-release väntar på gates.

```
NU, parallellt
  ├─ A. Mellan — bred produktion (innehållsspec finns)
  ├─ B. H1 — produktion först
  ├─ C. Legal memo SE / FI / IE
  └─ G. Ung v1 bakom flag/allowlist
         (build-kontrakt; inte bred store 13+)

INNAN BRED UNG-RELEASE (kan löpa parallellt med G)
  ├─ D. ADR: identity / ownership / sharing / transitions
  └─ F. Mätplan H4, H5, H7, moat (+ H3)
```

**REK:** A shippas till alla. G får *byggas* nu. Bred Ung-yta och 13+-butik blockeras av C+D + S-10 + inference + allowlist-gates. G får inte stjäla Mellan-P0.

---

## 3. Riskregister → vilket spår som tar bort den

| Risk (ur stängd spec) | Tas bort av | Stop om |
|-----------------------|-------------|---------|
| 9–12 lämnar p.g.a. ton *eller* kontrakt (H1) | A + B | Mellan-copy shippas som om H1 vore avgjord |
| Mellan uteblir medan Ung diskuteras | A | Ung-arbete stjäl Mellan-P0 |
| C-01 vs skapa egna objekt | D | Self-planning kodas utan ADR |
| Tyst övergång 12→13 (S-10 vs U-07) | D + G | Födelsedag ändrar `reward_model` / Mitt-default |
| Obligatorisk vårdnadshavarinsyn okänd (OQ 12) | C | “Aldrig läsrätt” eller full spegling kodas |
| Identitet 13+ / avtalspart (OQ 1) | C sedan D | `child`+PIN eller e-post antas p.g.a. GDPR-13 |
| Delat stöd: återkalla, historik, export (OQ 6–7) | C + D | Policy uppfinns i Ung-kod |
| Inference leakage | G + kontrakt | Ung “klar” utan metadata-test |
| Hem tomt för förälder till 14-åring (H5) | G + F | Bred Ung-release utan förälder-värde |
| Betalande vuxen tappar WTP (H7) | F (förbered), G (signal) | Packaging antas oförändrad |
| Ung = Reminders (moat) | G + F | P0 blir privata todos / Mina mål / XP |
| Mitt/Vårt/Delat inte begripligt / inte internationellt | A (sv copy 9–12), F (språktest), inte fork | Termer hårdkodas som evig sanning |
| Store lovar 13+ innan gates är gröna | Butikstext orörd | Deklaration/copy utökas |
| Familje-OS / samma Journey till 18 | F efter G | Behandlas som FACT |

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

## 7. Spår G — Ung v1 (build vs release)

**När:** nu, parallellt med Mellan. Inte efter att “allt legal är klart” — men **bred yta** väntar på gates.

**Artefakt:** `docs/nasta-arsgrupp-12-18-ung-v1-build-release.md`

Noah-scenariot (Mitt + Vårt + Delat stöd + inference + S-10) är fortfarande det som måste kunna *underkännas*. Det är release-gate, inte skäl att vänta med all kod.

Identity / privacy / access **kodas inte som sanning** förrän C+D sagt ramar. Self-planning väntar på C-01-ADR. Flagga och allowlist får byggas före det.

**Utanför v1 oavsett flagga:** Mina mål, socialt, hälsa/GPS, ny valuta, 13+-butikscopy, pedagog-exportpolicy (OQ 7).

---

## 8. Spår B + F — Mätplan

Ingen framgångssiffra hittas på här. Planen ska bara göra hypoteserna **omöjliga att “känna” till sanning**.

Skriv mätplanen **innan** ni drar produkt-slutsats. H1 körs i produktion på 9–12. H4/H5/H7/moat mäts på **allowlist-Ung**, inte efter bred 13+-store.

| ID | Fråga | Baseline (före slutsats) | Vad ni tittar på | Guardrail / stop | Inte |
|----|-------|--------------------------|------------------|------------------|-----|
| **H1** | Ton *eller* ägarskapskontrakt hos 9–12? | Prod-beteende per band *nu* (se h1-audit §2) | Retention, rutiner, barnvy vs vuxen-bock, senare M-06 | Shippa bara copy om *beteende* lutar kontrakt | Teen scores; anta ton; “bara förälder redigerar” = cirkel; ledande intervju |
| **H2** | Ökar Mellan retention 9–12? | Samma band *före* Mellan-P0 | Kvarvaro / veckoaktivitet efter innehåll | Stoppa mer Mellan-yta om ingen rörelse | Blanda ihop med Ung |
| **H4** | Är stjärnor OFF rätt *när ung-policy antagits*? | Allowlist med båda defaults | Acceptans, inte födelsedagsmagi | ON-default i testarm om OFF sänker användning utan vinst | Auto-OFF på födelsedag |
| **H5** | Räcker Vårt + explicit delning för föräldernytta? | Förälderns Hem-jobb idag (07:15) | Kan hen fortfarande ta *ett* nästa steg? | Inget Ung-ship om Hem är tomt | Spegling som “fix” |
| **H7** | Fortsätter betalande vuxen se premiumvärde utan implicit insyn? | Varför de betalar *nu* (struktur, blandade barn, Journey, koordinering) | Samma skäl kvar utan Mitt-insyn? | Annan packaging / inte samma erbjudande | Hitta på WTP-% |
| **Moat** | Varför inte Reminders + kalender + SMS? | Familjens faktiska alternativ | Åtaganden + övergång + NPF + syskon + ett OS | Feature som är en påminnelse-app → ute | “Vi har privata todos” |
| **H3** | Värderar 13–15 Mitt+Vårt? | Allowlist, inte före | Använder båda gränserna | Bred Ung-release stopp | Bygg mål-yta för att rädda |

**H6** (NPF + vuxnare presentation) valideras i Mellan (stöd kvar) och på Ung-allowlist (Noah 14 + support_profile). Inte kliniskt löfte.

**Segment:** presentation/policy, inte “teen engagement score”. Inga känsliga ungdomsmetriker.

**DoD mätplan:** varje hypotes ovan har ägare, datakälla, och en mening om vad som får er att *sluta* — innan någon kallar resultatet bevis.

---

## 9. Vad som medvetet *inte* görs i denna fas

- Revision 4 av kravställningen. Inga OQ stängda i chatt.
- Bred 13+ i butikstext / Families / Kids innan gates är gröna.
- Ung utan flagga/allowlist. Ung som blockerar Mellan.
- Mina mål, socialt, hälsa/GPS, habit tracker, ny valuta — även “för att vi ändå bygger”.
- ADR som påstår legal sanning. Safeguarding-feature.
- Self-planning / Mitt-access som om legal och C-01 vore klara.

---

## 10. DoD för de-risk-fasen (inte för specen)

Mellan har *lyckats operativt* när P0-innehåll är i bred produktion och H1 körs mot prod-beteende.

Ung får *byggas* nu (G). Ung har *lyckats som bred release* först när C + D + S-10 + inference + allowlist-lärande (F) är gröna. Noah-scenariot måste kunna underkännas.

**Mellan är bred produkt. Ung är v1 bakom grind — inte tyst 13+-lansering.**

---

## 11. Pekare

| Dokument | Roll |
|----------|------|
| `docs/nasta-arsgrupp-12-18-kravstallning.md` | Stängd spec (rev. 3) — OQ, H1–H7, S-10, läckagekanaler |
| Detta dokument | Godkänd operativ plan (Ung parallellt bakom grind) |
| `docs/nasta-arsgrupp-12-18-mellan-innehall.md` | Spår A — Mellan innehållsspec |
| `docs/nasta-arsgrupp-12-18-h1-audit.md` | Spår B — H1 produktion först |
| `docs/nasta-arsgrupp-12-18-ung-v1-build-release.md` | Spår G — vad som får byggas nu vs vad som blockerar bred release |
| `docs/adr/` | Kommande D — skriv inte förrän C gett ramar |
| `docs/p-ie-launch/track-1-legal-compliance/` | Befintlig IE-lansering 3–12; inte Ung-svar |
| `docs/adr/ADR-018-family-market-jurisdiction.md` | Land ≠ språk; återanvänd |

---

*Ingen produktkod. Ingen ADR. Inga OQ antagna som beslut. Ingen revision av den stängda specen.*
