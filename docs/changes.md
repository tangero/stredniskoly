# Změny chování

Záznam změn chování systému: požadavek, co se změnilo a proč, datum. Nejnovější nahoře.

## 2026-10-17: počty přihlášek a přijatých na stránce školy označené jako 1. kolo (#226)

- **Požadavek:** hlášení školy #226 (počty přihlášek jsou jen za 1. kolo, školy vypisují i další kola),
  rozhodnutí vlastníka platné pro všechny školy.
- **Co:** na přehledu školy řádek oboru říká „v 1. kole přijato …“ (i záložní nadpis „Přijato … v 1. kole“)
  a úvod oddílu „Co tu lze studovat“ dodává, že počty přihlášek a přijatých jsou z 1. kola a že škola může
  vypsat 2. kolo, jehož výsledky u oboru uvádíme, kde je máme (řádek 2. kola z `public/druhe_kolo.json` tam
  už byl). Na stránce oboru má tabulka „Údaje v číslech“ řádek „Přijatí (1. kolo)“; starší podoba stránky
  oboru má „1. kolo“ v nadpisu přijetí, v počtu přihlášek, ve srovnání ročníků a v blocích podle priority;
  „v 1. kole“ nese i podíl přijatých u souběžných oborů v okolí a popis proužku obtížnosti. Slovník pojmů 1.50.
- **Proč:** počet bez kola působil jako výsledek celého přijímání, i když 2. kolo škola vypsala.

## 2026-10-17: čerstvost dat hlídá i sady bez očekávaného období a porovnává období podle data (#507)

- **Požadavek:** interní zadání #507 (rozhodnutí vlastníka po review PR #506).
- **Co:** `scripts/provoz/cerstvost.mjs` hlásí i sadu s uplynulým `ocekavano.kdy` bez `ocekavano.obdobi`
  („termín minul, nové období nezjištěno“, Telegram ji pošle jednou za sadu a termín). Období se porovnávají podle
  konce (rok, měsíc, den), ne jako text; nerozpoznatelný tvar se nehlásí a vypíše se varováním.
- **Proč:** sady jako `csi-inspekce` nebo `cermat-maturita` administrace po termínu ukazovala, ale přehled ani
  Telegram ne; textové porovnání smíšených tvarů (`2026` proti `2026-09-30`) mohlo vyjít špatně.

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
