# Změny chování

Záznam změn chování systému: požadavek, co se změnilo a proč, datum. Nejnovější nahoře.

## 2026-10-17: úřední názvy škol ze snímku rejstříku MŠMT k 30. 9. 2026 (#478)

- **Požadavek:** interní zadání #478 (hromadná obnova úředních názvů z rejstříku místo ručních oprav), odpověď
  vlastníka 17. 10. 2026: převzít snímek postupem z `docs/zdroje-dat.md`, oddíl 5.
- **Co:** sada `msmt-rejstrik-snimky` přepnuta na snímek k 30. 9. 2026, `data/msmt_rejstrik/nazvy-oboru.json`
  přegenerován; nový skript `scripts/report-nazvy-skol-rejstrik.py` a jeho výstup
  `docs/podklady/nazvy-skol-rejstrik-2026-06-30-2026-09-30.json` (věcná změna proti rozdílu formátu, duplicitní ruční
  opravy). Postup čtvrtletní obnovy v `docs/zdroje-dat.md`, oddíl 2.19a.
- **Proč:** stránky škol nesly úřední názvy ze stavu k 30. 6. 2026, takže změny od 1. 9. 2026 (sloučení Gymnázia
  Čáslav, přejmenování Smíchovské SŠ, SŠ v Kolíně a dalších) chyběly.

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
