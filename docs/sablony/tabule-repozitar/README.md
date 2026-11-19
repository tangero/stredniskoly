# Šablona tabule pro další repozitáře

Přidá issues dalšího repozitáře na společnou tabuli vlastníka (projekt 1 na účtu `tangero`) a srovná u nich stav
karty, pole „Pro lidi“ a „Čeká na“. Vznikla v #561 (etapa E3) po pilotu v tomto repozitáři. Logiku štítků brány
sloučení nemá; ta platí jen tady.

| soubor | kam v cílovém repozitáři |
|---|---|
| `tabule.yml` | `.github/workflows/tabule.yml` |
| `tabule.mjs` | `.github/tabule/tabule.mjs` |

Postup nasazení, co skript dělá a co musí nastavit vlastník: [Spolupráce na GitHubu](../../spoluprace-na-githubu.md),
oddíl 3, „Šablona pro další repozitáře“. Testy šablony: `tests/tabule-sablona.test.mjs`.
