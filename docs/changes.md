# Změny chování

Záznam změn chování systému: požadavek, co se změnilo a proč, datum. Nejnovější nahoře.

## 2026-10-17: ruční oprava názvu školy v portálu bez ulice a obce (#374)

- **Požadavek:** hlášení #374 (profil RED IZO 600171388 v portálu ukazoval „Střední škola řemesel Gen. Krátkého,
  Šumperk“ místo „Střední škola řemesel, Šumperk“) a rozhodnutí vlastníka ze 17. 10. 2026.
- **Co:** když má škola ruční opravu názvu (`src/data/opravy-nazvu-skol.json`), nadpis profilu
  (`/pro-skoly/profil`), přepínač škol a další místa s `getNazevSAdresou` ukážou opravu přesně, bez doplněné ulice
  a obce. Týká se i Gymnázia Čáslav (#476). Přibyl záznam opravy pro 600171388 (portál bere název z katalogu, ne
  z rejstříku). Školy bez opravy mají název s ulicí a obcí beze změny.
- **Proč:** oprava je úplný úřední název; doplněná ulice z něj dělala jiný, neúřední název.

## 2026-10-17: upozornění na data po očekávaném termínu (#355, etapa 3)

- **Požadavek:** projekt #355, etapa 3 (čerstvost dat), kritéria K16 a K17.
- **Co:** týdenní přehled má oddíl Čerstvost dat se sadami z `public/stav_datovych_sad.json`, jejichž
  `ocekavano.kdy` minul a web pořád ukazuje starší období; ve zvýšeném režimu je kontrola dostupnosti pošle do
  Telegramu jednou za sadu a období (`scripts/provoz/cerstvost.mjs`).
- **Proč:** Datová linka hlídá zveřejnění nových dat, ale nikdo neupozornil, když očekávaný termín minul a web data
  pořád nemá (například výsledky 1. kola, cíl „na webu do 24 h“).

## 2026-10-15: datová linka předává schválený graf spojení a přepočítá zastávky škol (#500)

- **Požadavek:** interní zadání #500 po obnově grafu v #426.
- **Co:** předání úlohy `doprava-gtfs` bere výstupy z artefaktu běhu, který úlohu připravil, místo nového stažení;
  zpracování přepočte zastávky škol (`data/school_locations.json`) a oznámení hlásí změnu ID zastávek a školy se
  vzdálenou zastávkou; `zamítám KÓD` ukončí schválenou úlohu s chybou předání.
- **Proč:** schválení s odstupem přes noc nešlo předat (zdroj vychází denně), PR linky neprošel testy po změně
  ID zastávek a úlohy s chybou předání shazovaly každý běh linky.

## 2026-10-15: graf spojení z aktuálních jízdních řádů (#426)

- **Požadavek:** hlášení #426 (Dostupnost nabízela zaniklou linku XB od Divadla Gong) a rozhodnutí vlastníka
  z 12. 10. 2026 obnovit celá dopravní data.
- **Co:** `data/transit_graph.json` z úlohy datové linky MUCR9 (spojenka.cz, vydání 15. 10. 2026, referenční
  pondělí 19. 10. 2026); sada `doprava-gtfs` přepnuta na 2026-10-15. Zastávky škol v `data/school_locations.json`
  přepočtené na nová ID zastávek (`scripts/prepocet_zastavek_skol.py`). `public/pid_stops_compact.json` ze
  `stops.json` PID z 9. 10. 2026 a jeho generátor `scripts/build_pid_stops_compact.py`.
- **Proč:** graf byl z února 2026. Spojenka mezitím změnila ID zastávek, takže bez přepočtu by školy odkazovaly
  na zastávky, které v grafu nejsou.
