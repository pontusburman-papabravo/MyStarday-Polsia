# Ung v1 — Build- och release-kontrakt

**Status:** Operativt grundarbeslut (2026-09-09) · **inte** spec-revision · **öppnar inte** OQ  
**Auktoritet:** Stängd spec rev. 3 (krav, P0, Noah). De-risk-plan (körordning). Legal memo + ADR styr identity/privacy/access när de finns.

**Beslut:** Ung byggs parallellt för verklig produktionsvalidering, bakom feature flag / allowlist. Releaseomfånget begränsas av legal-, privacy-, security- och architecture-gates. **Mellan får inte blockeras.**

Detta är **inte** “spec klar ⇒ alla får Ung”. Det är **inte** heller “Ung byggs inte”.

---

## 1. Två omfång

| | **Bygg nu** (allowlist) | **Bred release** |
|--|------------------------|------------------|
| Vem | Utvalda familjer / intern allowlist | Alla som produkten *lovar* Ung |
| Store / marknadsföring | Ingen 13+-målgrupp, ingen “för 3–18” | Först när §4 är grön |
| Kod i main | Ja, bakom flagga. Default **av** | Flagga får öppnas per marknad |
| Syfte | Validera Noah, S-10, inference, H5/H7 | Kommersiellt Ung-löfte |

Mellan shippas till **alla** oberoende av denna tabell.

---

## 2. Vad som får byggas nu

Bakom **en** feature flag + **familje-allowlist**. Ingen födelsedag tänder Ung (S-10).

**Tillåtet**

- Flagga, allowlist, server som auktoritet för “Ung-yta synlig”.
- Presentation `ung` för allowlistade (copy, densitet) — **inte** tyst policy-byte.
- Min dag + Vi hemma genom att återanvända Idag / Mina personer där det går.
- Vårt / familjeåtagande som *synlig* yta när objektmodellen finns.
- Testharness för Noah, inference-kanaler, födelsedagsnatt.
- NPF-stöd (`support_profile`) + ung presentation samtidigt.

**Tillåtet att *förbereda* men inte att låtsas beslutat**

- Mitt / privat default / Delat stöd — bara med **konservativ** default (ingen ny läcka, ingen tyst vuxeninsyn, ingen tyst stjärnor-OFF på födelsedag).
- `self_planning` (skapa Mitt) — **inte** förrän C-01-ADR. Utan ADR: ingen barn-skapayta.

**Identity / privacy / access** implementeras mot legal memo + ADR. Saknas de: bygg inte “föräldern ser aldrig” och inte “föräldern ser allt”. Bygg flaggan och testerna. Lämna OQ öppna.

---

## 3. Vad som *inte* får smyga in bara för att Ung byggs

Samma förbud som stängd spec. Flagga ändrar inte scope.

- Mina mål / habit tracker
- Socialt, chatt, feed, klassrum
- Hälsa, mens, vikt, terapi, GPS
- Ny valuta, XP, veckopeng, trust score
- Fältvis ACL (Bara jag / Familj / Pedagog)
- Safeguarding-feature
- 13+ i butikstext, Play Families-deklaration eller Apple Kids-omdöme
- Nytt bundle-id
- Pedagog-exportpolicy (OQ 7) påhittad i kod

---

## 4. Gates som blockerar *bred* release

Alla måste vara gröna. Mellan väntar inte på dem.

| Gate | Grön när | Röd om |
|------|----------|--------|
| **Legal** | Memo SE/FI/IE svarar på rättslig grund *per behandling*; art. 8 bara där den gäller | 13 hårdkodas som access/konto |
| **ADR** | Presentation ≠ policy; S-10; access från relation+objekt; C-01-omtolkning om self_planning finns | Self-planning utan ADR |
| **S-10** | Noah fyller 13 på natten: ingen tyst rights/privacy/`reward_model`-change | Födelsedag slår på ung-policy |
| **Inference** | Obehörig kan inte läsa *eller härleda* Mitt via API, counts, timestamps, summary, SSE, notis, analytics, rapport, export, Hem, pedagogvy, sök, cache, synlig audit | “Känns privat” utan test |
| **Noah** | Mitt privat default + Vårt synligt + Delat stöd explicit, på allowlist | Läckage eller Hem tomt (H5) |
| **H7 / moat** | Allowlist-signal, inga påhittade % | Bred ship för att “vi redan byggt” |
| **Store** | Deklaration = faktisk bred yta | Copy säger 13+ / 3–18 innan detta |

Allowlist-validering **är** avsedd produktion. Den **ersätter inte** raderna ovan för bred yta.

---

## 5. Stop-regler (daglig utveckling)

- Mellan-P0 går före Ung om de krockar om tid.
- Ingen Ung-kod utan flagga som default av.
- Ingen allowlist → alla 13-åringar.
- Ingen “Mina mål bara bakom flagga” som smyg-scope.
- OQ 1, 6–8, 12–13 uppfinns inte i PR-beskrivningar.

---

## 6. DoD

**Build-DoD (nu):** flagga + allowlist + detta kontrakt följs; Mellan opåverkad; Olle 7 grön.

**Release-DoD (bred):** §4 alla gröna. Först då får butik och standard-onboarding lova Ung.

---

*Ändrar inte rev. 3. Stänger inga OQ. Ingen kod i detta dokument.*
