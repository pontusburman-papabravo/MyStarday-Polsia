# Mellan — Innehållsspec (9–12)

**Status:** Byggbar innehållsspec · **ingen produktkod i detta dokument** · **inte Ung**  
**Spår:** A (de-risk-plan, godkänd)  
**Auktoritet:** Stängd spec rev. 3 §11.2 (M-01–M-10). Detta dokument *fyller* innehållet. Det *ändrar inte* kontraktet.

**Leverans:** presentation och innehåll för 9–12. Samma v1-kontrakt som Liten: förälder bygger, barnet utför. NPF-stöd kvar. Ingen Mitt-privacy, ingen ung-policy, ingen 13+-butikscopy.

**H1-beroende:** hur *mycket* som får vara content-only avgörs av `docs/nasta-arsgrupp-12-18-h1-audit.md`. P0 nedan shippas även om H1 inte är klar. M-06 viktas upp om auditen visar kontraktsskov.

---

## 0. Vad som är FACT i produkten idag

| Yta | Vad 9–12 faktiskt får | Källa |
|-----|----------------------|--------|
| Startpaket | Samma `ageMax` 12 som 6–8. Inget eget 9–12-paket. | `config/starter-plan-meta.js` |
| “Skola vardag” | En mall för 6–12. Kväll: Pyjamas + Sagostund (`bedtime_reading`). Läxor `is_optional`. | `config/standard-library/v1.1.json` · skolstart-gate |
| Onboarding-preview | Skola-rad slutar på Sagostund. Kväll = Middag, tänder, Pyjamas, Sagostund, Sova. | `config/i18n/onboarding-sv-SE.json` |
| För dig | Inget mål med `ageMax` ≥ 10 utom **Motivation** (3–12, “Extra saga”). Skolansvar slutar vid **9**. Samarbete hemma slutar vid **9**. | `src/lib/for-dig-config.js` |
| Förälder-copy | “barnet”, “Visa barnet”, “Låt barnet logga in själv”. | `config/i18n/journey-sv-SE.json`, onboarding |
| Store | 3–12 / 3–10 förskoleåldern. | Play/App Store-metadata i repo |

**Slutsats (produkt, inte familjeintervju):** 9–12 får **Liten-innehåll med skolnamn**. Det är tillräckligt för att *börja* Mellan som content. Det bevisar **inte** H1.

---

## 1. Icke-förhandlingsbart

- Olle 7 oförändrad (L-01–L-08).
- Samma tre världar, samma loop (M-01).
- Stjärnor **på** (M-07). Ingen ny valuta. Ingen stjärnor-OFF.
- NPF-stöd förstklassigt (M-10): NU/NÄSTA, timer, pictogram, delsteg, en-i-taget — valfria, inte borttagna.
- Inga Ung-OQ öppnas (konto, Mitt, Delat stöd, legal).
- Inget “mellanstadium” som domännamn. Land-lokaliserbar *etikett*.
- Presentation får föreslås av ålder. Access/policy ändras inte (S-10).

---

## 2. Presentation 9–12 (P0)

Default `presentation_mode = mellan` *som förslag* när åldersband är 9–12. Inte tyst policy-byte.

| Yta | Liten (kvar för 3–8) | Mellan |
|-----|----------------------|--------|
| Tilltal förälder | barnet, visa barnet | {{namn}} / hen / “er 11-åring” — inte “lilla barnet” |
| Tilltal barn | du + ev. mjuk saga | du. Ingen sagostund som *identitet* |
| Idag | bild + NU/NÄSTA default | text+bild OK; bildstöd **kvar som val** (M-05) |
| Samling | mjukare/nalle-ton OK | diplom / år / “det du klarat” — inte nalle-first (M-08, P1) |
| Hem | funkar | samma jobb; copy utan baby-ton (M-09, P1) |

**Ord som inte får vara default i Mellan-startinnehåll:** sagostund, pyjamas som kvällens *titel*, extra saga, nalle, “förskoleåldern”, “be en vuxen” i barnets *primära* loop (PIN-fel och vuxen-exit får behålla vuxenhjälp).

**Ord som överlever:** vad nu / sen, du klarade det, ändra senare, ingen skam, en sak i taget, stjärnor som bränsle.

---

## 3. Startschema P0 (M-03)

**Nytt preset** för band 9–12. Inte samma identitet som “Skola vardag” för 6–8.

| Fält | Värde |
|------|--------|
| Intern nyckel | `school_weekday_9_12` (förslag) |
| Visningsnamn sv-SE | **Skolvardag** |
| Visningsnamn en-GB | **School day** |
| Inte | “Mellanstadium”, “Högstadium”, “Pyjamas-first” |
| Veckodagar | må–fre kärna; helg = separat kort preset eller återanvänd Helg utan sagokärna |
| Support default | medium; NU/NÄSTA på för nya (samma som skolstart-gate) |

**Morgon (kärna):** Vakna · Klä på dig · Frukost · Tänder · Packa väska · Ytterkläder · Gå.

**Dag (kärna):** Skola (block) · Mellanmål · Läxor (**inte** gömd optional som enda läxrad).

**Dag (valfritt, av):** Fritid/träning · Skärm *efter* läxa/avtal · Eget rum/städa.

**Kväll (kärna, inte saga-identitet):** Middag · Tänder · Skärm av / lugn stund · Sova.

**Kväll (valfritt):** Dusch · Läsa (inte döpt Sagostund som default) · Pyjamas *som steg under “Gör dig iordning”*, inte som kvällens namn.

Onboarding-preview för 9–12 ska **inte** sluta på Sagostund. Ersätt skola-raden i `onboarding-sv-SE` preview när band = `9-12`.

Befintlig `Skola vardag` lämnas för 6–8.

---

## 4. För dig P0 (M-04)

Idag: 9–12 som *bara* träffar **Motivation** (3–12) + ev. utgångna mål om födelsedag saknas. Det är gapet.

Tre **nya** mål. Höj inte `skolansvar.ageMax` i tysthet — 6–8 ska inte få 11-årscopy.

| Slug (förslag) | Headline | Ålder | Problem | Aktiverar | Inte |
|----------------|----------|-------|---------|-----------|-----|
| `laxor-utan-tjat` | Få läxorna gjorda utan kvällskrig | 9–12 | Läxor skjuts, tjat, osämja | Läxa som synlig dag-rad + kort eftermiddagsrutin | Veckopeng, betyg, “mina mål” |
| `skarm-som-avtal` | Skärmtid som en överenskommen rutin | 9–12 | Skärm som förhandling varje kväll | Aktivitet “Skärm (avtalad)” *efter* överenskommen sak | App-blockering, parental control-marknadsföring |
| `komma-ivag-traning` | Komma iväg på träning utan strid | 9–12 | Väska, tider, “jag vill inte” | Packa träningsväska + gå / hämtning | Resultat, lag-chat |

**Motivation (3–12):** byt *default-exempel* när barnet är 9–12: inte “Extra saga”. Använd filmkväll, extra skärm *enligt avtal*, välja lördag. Samma slug, åldersgrenad exempel-lista. Inte nytt motivationssystem.

**Copy-regel För dig (mellan):** “Hjälper {{namn}} att:” — inte “Hjälper barnet att:” när presentation=mellan.

---

## 5. M-06 — grodd till “Göra tillsammans” (P1, viktas av H1)

Förälder är fortfarande huvudbyggare. Barnet **föreslår** aktivitet eller belöning. Förälder godkänner.

| | |
|--|--|
| Vad | En tydlig handling: “Föreslå något till schemat / kistan” |
| Inte | Barnet redigerar veckan, skapar Mitt-objekt, byter privacy |
| Mått | Andel 9–12-familjer där minst ett förslag skickats och hanterats |
| Om H1 = mest ton | M-06 får vänta som P1 |
| Om H1 = kontrakt skaver | M-06 blir *första* autonomisteget i samma kärna — fortfarande inte Ung |

Utan C-01-ADR: förslaget är **förälder-yta som tar emot barnets input**, inte ett barnformulär-labb. Exakt UI låses i implementation, inte här som ADR.

---

## 6. Copy-lista att byta (sv-SE, Mellan)

Byt när `presentation_mode = mellan` *eller* när innehållet *bara* träffar 9–12 (startschema, nya För dig-mål). Liten-strängar orörda.

| ID | Nu (FACT) | Mellan |
|----|-----------|--------|
| C-FD-1 | `goal.helpsChild`: “Hjälper barnet att:” | “Hjälper {{namn}} att:” |
| C-FD-2 | `goal.ageRange`: “För barn {{min}}–{{max}} år” | “För {{min}}–{{max}} år” |
| C-ON-1 | Preview `skola` slutar Sagostund | Slutar läxor / skärm av / sova |
| C-ON-2 | Preview `kvall` = … Pyjamas, Sagostund | … tänder, skärm av, sova |
| C-JO-1 | Journey “Låt barnet testa” / “Visa barnet” | “Låt {{namn}} testa” / “Öppna Idag” |
| C-HE-1 | Hem-copy som kallar 11-åring “liten” / sagoton | Neutral 07:15-copy |
| C-CH-1 | Barnvy-default som *bara* saga-ekonomi | Stjärnor kvar; copy “du klarade det” |

English overlay (`en-GB`) får samma *innebörd*, inte svensk skolform.

---

## 7. Acceptans

**Noah 11:** Idag på 5 s utan förskolekänsla. Minst ett För dig-mål som inte är 3–7. Bild/stjärnor/NU-NÄSTA *kan* vara på. Liten-syskon oförändrat.

**Jenny (förälder, 07:15):** ett nästa steg. Inte ny teen-flik. Inte tom Hem för att copy bytts.

**Olle 7:** ingen ändring av Idag, Skatt, handoff.

**Internationellt:** samma nycklar; namn/kalender via i18n. Ingen fork.

---

## 8. Utanför denna spec

Ung, Mitt/Vårt, stjärnor OFF, veckopeng, socialt, 13+ i butik, ny kärnmodell, C-01-ADR, legal memo.

---

## 9. Implementationsordning (när kod väl tillåts)

1. För dig-mål + Motivation-exempel 9–12 (ingen schema-kärna).  
2. Startschema + onboarding-preview för band `9-12`.  
3. Copy-gren presentation=mellan (C-* ovan).  
4. M-06 efter H1-avläsning.

Ingen av stegen kräver Ung-spike.

---

*Inte implementationskontrakt för Ung. Inte beslut om H1.*
