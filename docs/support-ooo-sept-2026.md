# Support under bortresa 1–10 september 2026

**Permanent agent:** [`docs/support-agent.md`](support-agent.md). OOO is a timed **mode**, not the agent's lifetime. After 11 September the same daily job continues in `normal` mode (`config/support-agent.js`).

**Uppdrag (OOO-läge t.o.m. 2026-09-11):** Läs allt som kommer in i admin-inkorgen. Svara bara när svaret är verifierat. Hitta inte på. Kan du inte svara: säg att vi är bortresta och återkommer så snart vi kan, senast 11 september.

Betalning är **inte påslagen**.

## Källa

Admin → Meddelanden (`GET /api/admin/contact-messages`). Inloggning: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Detta fångar `/kontakt`, support-bubblan, in-app-feedback och systemhjälp → "Rapportera problem".

**Lucka:** Reply i Mail till supportadressen syns **inte** i inkorgen (ingen inbound-mejl). Användaren får en opaque länk till webtråden (`/support/svar/sr1.…`) redan när ärendet skapas, och igen i våra svar. Där följer de ärendet och skriver tillbaka (`user_reply`). `answered` → `new`. Arkiverade ärenden återöppnas **inte** via länken. Hämta `GET /api/admin/contact-messages/:id` **och** `…/:id/events`.

## Beslut

1. Läs hela ärendet. Kolla ev. kopplad familj. Impersonation är **read-only**.
2. Matcha mot tabellen **Verifierat** först. `message_type=bug` eller formuleringen "jag kan inte" är **inte** skäl att hoppa över hur-till.
3. Känd funktion (t.ex. byta namn, ny PIN): skicka stegen. Om det låter som att de redan försökt: lägg till en fråga om vad som händer (feltext, saknad knapp, namnet hoppar tillbaka). Hitta inte på en orsak.
4. Bara den del du **inte** kan verifiera får OOO-texten:

> Tack för att du hör av dig. Vi är bortresta just nu och återkommer så snart vi kan, senast 11 september.

Engelska ärenden: motsvarande text i `config/support-ooo.js` (`replyFallback`).

5. Klassificera `root_cause` när du är säker. Lämna `unknown` hellre än gissa.
6. Lova inte funktioner, datum eller att data kan återskapas.

## Verifierat (får användas)

| Fråga | Svar |
|-------|------|
| Barnets PIN | Vi kan inte läsa ut PIN (hashad). Föräldern sätter en ny 4-siffrig PIN under barnets inställningar. |
| Byta barnets namn | Familj → barnets kort → fliken med **Namn & emoji** → fältet Barnets namn → spara. |
| Betalning / prenumeration | Betalning är inte påslagen. |
| Vi har tagit emot rapporten | Ja — bekräfta och hänvisa till OOO om du inte kan felsöka klart. |

## Gör inte

- Hitta på workaround eller diagnos
- IAP / återbetalning / App Store-disputes
- Radera konto eller barn utan explicit founder-godkännande
- Skriva under impersonation
- Lova nya funktioner

## Daglig automation (Cursor)

Permanent daglig Cloud Agent ~08:00 Europe/Stockholm. Under OOO-fönstret: prompten nedan. Efter 11 september: byt till prompten i `docs/support-agent.md`. Stäng **inte** av schemat.

```
Läs docs/support-ooo-sept-2026.md och följ den exakt.

1. Logga in mot den live sajten med ADMIN_EMAIL / ADMIN_PASSWORD.
2. Hämta olästa och aktiva contact_messages (inbox=unread och inbox=active).
3. För varje ärende: läs allt — detalj + events. Användarsvar via **Öppna konversationen** ligger i samma ärende (`--- Användarsvar ---` i message, event `user_reply`). Matcha först mot verifierade hur-till i docs/support-ooo-sept-2026.md. "Jag kan inte X" + känd funktion = skicka stegen, inte bara OOO.
4. Bara det du inte kan verifiera får replyFallback från config/support-ooo.js. Hitta inte på.
5. Betalning är inte påslagen.
6. Sammanfatta i svaret: id, typ, vad du svarade eller varför OOO, ev. bugg att fixa.
7. Inga ärenden = skriv det och sluta. Ändra inte produktkod om inget ärende kräver det.
```

Efter 11 september: behåll schemat, byt prompt till `docs/support-agent.md`. Datumstyrd OOO-copy släcks av sig själv.
