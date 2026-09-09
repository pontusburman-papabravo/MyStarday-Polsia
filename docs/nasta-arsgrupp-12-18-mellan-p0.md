# Mellan-P0 — innehåll nu, delaktighet sen

**Status:** BUILD NOW (innehåll) · TEST NEXT (M-06 / H1)  
**Auktoritet:** Stängd spec rev. 3 · de-risk spår A  
**Inte:** Ung-policy · Mitt/Vårt · M-06 i denna leverans · ny plansch

```
BUILD NOW:  innehåll   (copy, För dig 9–12, skolpreview utan sagostund)
TEST NEXT:  delaktighet (M-06 — den mest intressanta Mellan-hypotesen)
```

H1 är öppen. Den här leveransen *antar inte* att 9–12-problemet bara är ton. Den tar bort det observerade gapet att 9–12 saknar eget innehåll. Om familjer fortfarande slutar efter content-fixen är det evidens för H1-B (ägarskap), inte ett skäl att rita om planschen.

---

## P0 i den här leveransen

| ID | Vad | Hur |
|----|-----|-----|
| M-02 / M-03 | Skolpreview slutar inte på sagostund | Onboarding `previewFallback.skola` → Läsa |
| M-04 | För dig täcker 9–12 | `skolansvar` ageMax 12 · nya mål `skarmtid-avtal` · `fritid-traning` |
| M-01 / M-10 | Samma världar, NPF kvar | Ingen ny barnkärna |
| M-05 | Text+bild valfritt | Redan möjligt via stödprofil — ingen ny toggle |

## Inte P0

| ID | Varför |
|----|--------|
| M-06 | TEST NEXT. Mät H1 innan vi bygger förslag som om det vore beslut. |
| Nytt `school_weekday_9_12` i standard library | Fryst kontrakt. Preview + För dig räcker för första content-fix. |
| Ung / privacy / Face ID | Annat spår, annan gate. |

---

## För dig 9–12

| Slug | Headline | Ålder | Aktiverar |
|------|----------|-------|-----------|
| `skolansvar` | Få hela skoldagen att flyta | **6–12** (var 6–9) | Befintlig `Skola vardag` |
| `skarmtid-avtal` | Få skärmtid att bli en tydlig rutin | 9–12 | Läxa + Ledig tid (`homework`, `free_time`) |
| `fritid-traning` | Få träning och fritid in i dagen | 9–12 | Leka utomhus + Kvällsaktivitet |

Skärmtid är *avtalad rutin*, inte veckopeng och inte belöningsmotor.

## Acceptans

- En förälder med barn 10 år ser minst ett För dig-mål som inte är förskola/sagostund.
- Skolpreview i onboarding slutar på Läsa, inte Sagostund.
- Barn 7 år: `trygga-kvallar` / förskolemål oförändrade i åldersfilter.
- Jenny-test på nya mål: problem, vad Aktivera gör, tryggt — utan att öppna detaljer.

## Vad produktionen ska lära oss (H1)

- Ser 9–12-familjer de nya målen?
- Aktiveras `skarmtid-avtal` / `fritid-traning`?
- Vilka aktiviteter läggs till efteråt?
- Retention i bandet 9–12 vs före?

Om content-fixen inte rör retention: stoppa mer Mellan-copy och testa delaktighet (M-06), inte fler sagostund-byten.
