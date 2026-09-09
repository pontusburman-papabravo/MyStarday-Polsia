# H1-audit — Ton eller kontrakt hos 9–12?

**Status:** Spår B igång · **H1 fortfarande NOT_VERIFIED** · ingen framgångssiffra  
**Hypotes (spec H1):** Familjer med barn ~9–12 lämnar eller slutar använda *primärt* för att ytan känns barnslig — **eller** för att kontraktet “förälder bygger, barnet utför” redan skaver.

**Varför nu:** Ni har redan 9–12 i produkten. Det här behöver ingen ADR, ingen legal, ingen Ung-kod.

**Koppling till Mellan:** `docs/nasta-arsgrupp-12-18-mellan-innehall.md` P0 är content. Om auditen visar **kontrakt**, räcker inte copy — då viktas M-06 upp. Om den visar **ton**, är content-only rätt första ship.

---

## 0. Vad den här filen är

1. **Produktbaseline (FACT)** — vad 9–12 möter i koden idag.  
2. **Kodningsschema** — hur ett familjeskäl klassas.  
3. **Instrument** — kort audit mot befintliga familjer (förälder, ev. barnet).  
4. **Stop-regler** — när ni inte får kalla H1 avgjord.

Det här är **inte** en ny plan och **inte** ett påstående att familjer redan är intervjuade.

**NOT_VERIFIED i denna revision:** faktiska churn-skäl i live-familjer. Den här miljön har ingen produktionssökning av användare. Instrumentet är klart att köras av grundare / QA mot befintliga 9–12-konton.

---

## 1. Produktbaseline (FACT) — varför H1 är öppen åt båda håll

### 1.1 Evidens som *stödjer* ton-armen

| Observation | Varför det kan kännas barnsligt för 9–12 |
|-------------|------------------------------------------|
| `Skola vardag` kväll = Pyjamas + Sagostund | Skolstart-gate: 11–13 får lågstadiecopy |
| Onboarding-preview skola slutar på Sagostund | `onboarding-sv-SE.json` |
| För dig 9–12 ≈ Motivation + “Extra saga” | `for-dig-config.js` `ageMax` |
| Skolansvar / samarbete hemma slutar vid 9 | Samma fil |
| Startpaket 9–12 = samma som yngre skolbarn | `starter-plan-meta.js` `ageMax: 12` |
| Förälder-journey: “Visa barnet”, “Låt barnet testa” | `journey-sv-SE.json` |

En 11-åring *kan* alltså möta saga/pyjamas/“barnet” utan att kontraktet är problemet.

### 1.2 Evidens som *stödjer* kontrakt-armen

| Observation | Varför kontraktet kan skava före 13 |
|-------------|-------------------------------|
| C-01: barnet skapar inte, redigerar inte | POS / barnvy |
| Förälder äger schema, belöningar, stöd-toggles | L-06 |
| Inget M-06 live | Inget officiellt “förslag från barnet” |
| Implicit full förälderinsyn | Default för alla `child` |
| Gapmatrisen själv: “Förälder bygger, barn utför — börjar skava” vid 9–12 | Spec §7 — **hypotes**, inte mätning |

En 11-åring *kan* alltså vara less på att bara utföra, även om copy byts.

### 1.3 Vad baseline **inte** är

Ingen retentionkurva per åldersband finns i detta underlag. Ingen exit-enkät. **Hitta inte på %.**

---

## 2. Kodningsschema (ett skäl, en primär kod)

Varje familj / citat får **en primär** kod. Sekundär tillåten.

| Kod | Primär signal | Exempel (förälder eller barn) |
|-----|---------------|-------------------------------|
| **TONE** | Ytan, språket, bilderna, sagor, “för småbarn” | “För barnsligt.” “Sagostund.” “Känns som femåring.” |
| **CONTRACT** | Vem som bestämmer, vem som får skapa, insyn | “Hen vill lägga in själv.” “Jag måste göra allt.” “Hen hatar att jag ser allt.” |
| **MIX** | Båda, ungefär lika | Anteckna båda citaten |
| **OTHER** | Tid, NPF-stöd, syskon, pris, bugg, skola | “Vi har inte tid.” “Funkar inte med ADHD-grejer.” |
| **NONE** | Använder, inget 9–12-problem | — |
| **SKIP** | Ingen 9–12, eller går inte att koda | — |

**Regler**

- “Barnslig” utan ägarskapsord → TONE.  
- “Får inte bestämma / jag styr allt / hen vill gömma” → CONTRACT.  
- Pris eller “ser för lite” hos *föräldern* är **inte** H7 (det är Ung). Här: bara 9–12.  
- Inga teen scores. Inga känsliga hälsosvar.

---

## 3. Instrument (befintliga familjer)

**Urval:** barn med ålder 9–12 (födelsedag eller onboarding-band). Blandade syskon OK — koda *det* barnet.

**Inte:** App Store-reviewkontot. Inte destruktiva tester. Inte påhittade citat.

### 3.1 Förälder (≤5 min)

1. Använder ni fortfarande Idag / schemat med NN (9–12)? Om nej: varför slutade ni?  
2. Om ni skulle sluta: vore det mest för att det *känns för ungt*, eller för att NN *inte får äga* sin dag?  
3. Vill NN lägga in egna saker? Får hen det idag?  
4. Känns det okej att du ser allt NN bockar — eller börjar det skava?  
5. (Valfritt) Ett konkret exempel från senaste veckan.

### 3.2 Barn 9–12 om det är naturligt (kort, frivilligt)

1. Känns appen för barnslig, lagom, eller mest som att någon annan bestämmer?  
2. Finns det något du skulle vilja lägga in själv?

PIN-gate och ingen barn-admin. Inget formulär-labb. Muntligt eller förälder antecknar.

### 3.3 Produktkoll per familj (utan intervju)

Om ni bara har tid till observation:

| Check | TONE-signal | CONTRACT-signal |
|-------|-------------|-----------------|
| Vilket startschema / aktiviteter syns? | Sagostund, Pyjamas som kvällsnamn, Extra saga | — |
| Vem ändrade senast schemat? | — | Bara förälder, barnet bad men nej |
| Finns läxa / träning / skärm som *deras* rader? | Saknas = content-gap (ton+innehåll) | Finns men barnet får inte röra = kontrakt |
| För dig visat | Bara Motivation / 3–7-mål | — |

---

## 4. Avläsning (utan påhittade trösklar)

Skriv en rad per familj: `id-anonym | ålder | primär kod | ett citat | content-gap ja/nej`.

**Ni får säga “H1 lutar TONE”** när en tydlig majoritet av *kodade* 9–12-skäl är TONE och CONTRACT är sällsynt.

**Ni får säga “H1 lutar CONTRACT”** när CONTRACT (eller MIX med stark ägarskapsdel) inte är sällsynt — även om copy också klagas på.

**Ni får inte** shippa Mellan som om H1 vore avgjord.  
**Ni får inte** ersätta detta med intuition eller %.  
**Ni får inte** dra Ung-slutsats (H5/H7) från 9–12-svar.

### Vad Mellan då gör

| Lutning | Mellan P0 | M-06 |
|---------|-----------|------|
| TONE / content-gap | Shippa innehållsspecen som den är | Kvar P1 |
| CONTRACT | Shippa innehållet *ändå* (gapet är verkligt) | Ta fram som första autonomisteg; fortfarande inte Ung |
| Oklart / för få | Shippa P0 content | P1; samla fler rader |

“För få” är bättre än påhittad n.

---

## 5. Första avläsning i denna revision

| Påstående | Status |
|-----------|--------|
| 9–12-innehåll är Liten-ton med skolnamn | **FACT** (produkt) |
| Därför är problemet ton | **NOT_VERIFIED** |
| Därför är problemet kontrakt | **NOT_VERIFIED** |
| Familjer i prod är kodade | **Inte gjort här** |

Nästa handling: fyll §3 mot riktiga 9–12-familjer. Klistra in den anonymiserade radlistan i en uppföljning — inte en ny plan.

---

*Ingen produktkod. Inga OQ stängda. Ingen Ung-start.*
