# H1-audit — Ton eller kontrakt hos 9–12?

**Status:** Spår B igång · **H1 fortfarande NOT_VERIFIED** · ingen framgångssiffra  
**Hypotes (spec H1):** Familjer med barn ~9–12 lämnar eller slutar använda *primärt* för att ytan känns barnslig — **eller** för att kontraktet “förälder bygger, barnet utför” redan skaver.

**Metod:** produktion först. Minimal mänsklig input bara när beteendet inte kan svara på *varför*.

**Koppling till Mellan:** `docs/nasta-arsgrupp-12-18-mellan-innehall.md` P0 är content. Om **produktionsdata** lutar CONTRACT, räcker inte copy — då viktas M-06 upp. Om den lutar TONE / content-gap, är content-only rätt första ship.

---

## 0. Evidensordning

| Prioritet | Vad | När |
|-----------|-----|-----|
| **Primär** | Beteende i produktion, redan tillåten produktdata | Alltid först |
| **Sekundär** | En öppen kontextfråga | Bara när beteendet inte förklarar *varför* |

Ingen intervju-runda som primär metod. Ingen ledande TONE-vs-CONTRACT-fråga som första fråga.

**NOT_VERIFIED i denna revision:** faktiska prod-siffror. Den här miljön har ingen produktionssökning. §3 är det som ska köras mot live — inte en ny plan.

---

## 1. Produktbaseline (FACT) — varför H1 är öppen åt båda håll

### 1.1 Evidens som *stödjer* att ton/innehåll kan vara problemet

| Observation | Varför |
|-------------|--------|
| `Skola vardag` kväll = Pyjamas + Sagostund | Skolstart-gate: 11–13 får lågstadiecopy |
| Onboarding-preview skola slutade på Sagostund *(P0: nu Läsa)* | `onboarding-sv-SE.json` · `docs/nasta-arsgrupp-12-18-mellan-p0.md` |
| För dig 9–12 *före P0* ≈ Motivation + “Extra saga” *(P0: skolansvar till 12 + skärmtid/träning)* | `for-dig-config.js` · `docs/nasta-arsgrupp-12-18-mellan-p0.md` |
| Samarbete hemma slutar vid 9 | Samma fil |
| Startpaket 9–12 = samma som yngre skolbarn | `starter-plan-meta.js` `ageMax: 12` |
| Förälder-journey: “Visa barnet”, “Låt barnet testa” | `journey-sv-SE.json` |

### 1.2 Produktconstraint — *inte* användarpreferens

Barnet får idag inte redigera schema (C-01, L-06). **“Bara föräldern redigerar” är därför inte CONTRACT-bevis.** Det är hur produkten är byggd. Att använda det som H1-belägg är cirkelbevisning.

Samma sak: implicit full förälderinsyn och avsaknad av M-06 är produktläge, inte observerad preferens.

Kontrakt-armen kräver signal *utöver* den constrainten: t.ex. att 9–12 slutar använda *barnvyn* medan vuxen gör jobbet, eller — när M-06 finns — att förslag faktiskt används.

### 1.3 Vad baseline **inte** är

Ingen retentionkurva per åldersband i detta underlag. **Hitta inte på %.**

---

## 2. Primär evidens — produktion

Urval: `child` med ålder 9–12 (födelsedag eller band). Jämför med yngre band. Inga teen scores. Ingen ny PII. Bara redan tillåten produktdata.

| Signal | Möjlig läsning | Får *inte* läsas som |
|--------|----------------|----------------------|
| Aktivitet / retention 9–12 vs yngre (samma tenure) | Något i 9–12-upplevelsen tappar | TONE eller CONTRACT utan *varför* |
| Vilka rutiner/aktivitetsnamn 9–12 faktiskt har | Content-gap om läxa/träning saknas; ton-gap om Sagostund/Pyjamas/Extra saga fortfarande är kvällsidentitet | Kontrakt |
| Hur ofta förälder ändrar *deras* schema | Hög ändringsfrekvens = schemat passar dåligt (content eller varierad skola) | CONTRACT |
| Läxor / träning / skolrelaterat tillagt manuellt | Behov som mallen inte täcker → content | CONTRACT |
| Stjärnanvändning 9–12 (complete → saldo → inlösen) vs yngre | Stjärnor tappar betydelse = **OTHER**-kandidat, inte automatiskt TONE | CONTRACT |
| Barnvy-session / barn-complete vs förälder som bockar åt 9–12 | Faller tillbaka till att vuxen gör jobbet = *möjlig* CONTRACT- eller friktionssignal | Inte bevis ensamt; kan vara login/handoff (**OTHER**) |
| M-06-förslag skickade/hanterade | Bara **när M-06 finns**. Användning stödjer att grodden behövs | Frånvaro av M-06 idag ≠ CONTRACT |

**Aggegera först, intervju sen.** Om 9–12 har sämre retention *och* kvarvarande sagokväll → TONE/content är den billiga förklaringen att testa med Mellan-P0. Om barnvyn dör men föräldern fortsätter bocka, *och* rutinerna redan är skolmogna → då behövs sekundär *varför*-fråga innan CONTRACT låses.

---

## 3. Kodningsschema — testar H1, inte verkligheten

Koderna TONE / CONTRACT / MIX är **bara** för att testa H1. De är **inte** en uttömmande taxonomi.

| Kod | När (efter beteende, ev. en varför-fråga) |
|-----|-------------------------------------------|
| **TONE** | Yta/språk/saga/“för småbarn” är det som skaver |
| **CONTRACT** | Ägarskap / vem som får påverka — *utöver* att barnet inte får redigera |
| **MIX** | Båda, ungefär lika |
| **OTHER** | Allt som inte är H1 |
| **NONE** | Använder, inget 9–12-problem |
| **SKIP** | Ingen 9–12, eller går inte att koda |

**OTHER är ett giltigt utfall.** Om samma OTHER-skäl återkommer: **rapportera ett nytt mönster / ny hypotes.** Pressa inte in det i TONE eller CONTRACT.

Exempel på OTHER som vore extremt värdefullt:

- appen behövs inte längre varje dag
- skolvardagen är för varierad
- barnet använder egen kalender
- stjärnorna har tappat betydelse
- för mycket login- eller handoff-friktion

**Regler**

- Bara-förälder-redigerar → **inte** CONTRACT.  
- Pris eller “ser för lite” hos föräldern → **inte** H7 (Ung).  
- Inga känsliga hälsosvar. Inga påhittade n.

---

## 4. Sekundär evidens — minimal *varför*

Bara när §2 inte räcker. Inte som default-runda. Inte App Store-reviewkontot. Inte påhittade citat.

**Första frågan är öppen.** Tvinga inte in TONE/CONTRACT.

1. “Vad är det som fungerar sämst för NN i appen idag?”  
2. *Om svaret inte är tydligt:* en neutral probe — utseende/innehåll *eller* möjlighet att påverka dagen. Inte “ungt vs inte får äga”.  
3. Ett konkret exempel från senaste veckan, om det behövs.

Barn 9–12 bara om det är naturligt och frivilligt. Samma ordning: vad som är sämst, inte färdiga hypotesord. PIN-gate. Inget formulär-labb.

---

## 5. Avläsning

En rad per barn i urvalet: `anonym | ålder | primär kod | beteendesignal | ev. ett citat`.

**H1 lutar TONE** när produktionsgapet är innehåll/ton (saga-kväll, inga 9–12-mål) och *varför* (om den behövs) inte pekar på ägarskap.

**H1 lutar CONTRACT** när beteende *utöver* C-01-constraint (t.ex. barnvy dör, vuxen gör jobbet, senare M-06 efterfrågas i *varför*) inte förklaras bättre av OTHER.

**H1 lutar varken** när OTHER dominerar — då öppnas en **ny** hypotes, H1 stängs inte som “ton”.

**Ni får inte** shippa Mellan som om H1 vore avgjord.  
**Ni får inte** ersätta prod-data med intuition eller %.  
**Ni får inte** dra Ung-slutsats (H5/H7) från 9–12.

| Lutning | Mellan P0 | M-06 |
|---------|-----------|------|
| TONE / content-gap | Shippa innehållsspecen | Kvar P1 |
| CONTRACT | Shippa innehållet *ändå* | Ta fram som första autonomisteg; inte Ung |
| OTHER-mönster | Shippa P0 content | P1; ny hypotes, inte H1-stretch |
| Oklart / för få | Shippa P0 content | P1 |

---

## 6. Denna revision

| Påstående | Status |
|-----------|--------|
| 9–12-innehåll är Liten-ton med skolnamn | **FACT** (produkt) |
| Prod-beteende per band är mätt | **NOT_VERIFIED** — kör §2 |
| Problemet är ton | **NOT_VERIFIED** |
| Problemet är kontrakt | **NOT_VERIFIED** |

Nästa handling: kör §2 mot produktion. §4 bara för rader där *varför* saknas.

---

*Ingen produktkod. Inga OQ stängda. Ingen Ung-start.*
