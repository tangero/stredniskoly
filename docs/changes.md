# Změny chování

Záznam změn chování systému: požadavek, co se změnilo a proč, datum. Nejnovější nahoře.

## 2026-10-17: párování 1. a 2. kola i při změněném zaměření (#282)

- **Požadavek:** hlášení #282 (Lyceum 600007561 neukazovalo 2. kolo) a odpověď vlastníka z 17. 10. 2026.
- **Co:** `scripts/build-druhe-kolo.py` páruje nabídky, které zůstanou bez protějšku po přesném párování, ještě
  jednou bez zaměření, a to jen když na obou stranách zbývá jediný kandidát (funkce `sparuj`, kterou používá
  i `scripts/build-obory-bez-jpz.py`). Přegenerovány `public/druhe_kolo.json` (2026: 1 039 nabídek s 2. kolem
  místo 886, 2025: 1 042 místo 880) a `src/data/obory-bez-jpz-2026.json` (1 412 místo 1 261).
- **Proč:** školy zaměření mezi koly doplní, vynechají nebo přepíšou (velikost písmen, překlep), a přesné párování
  takovou nabídku ztratilo; web pak u ní tvrdil, že 2. kolo nevypsala.

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
