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

## 2026-10-17: úřední názvy škol ze snímku rejstříku MŠMT k 30. 9. 2026 (#478)

- **Požadavek:** interní zadání #478 (hromadná obnova úředních názvů z rejstříku místo ručních oprav), odpověď
  vlastníka 17. 10. 2026: převzít snímek postupem z `docs/zdroje-dat.md`, oddíl 5.
- **Co:** sada `msmt-rejstrik-snimky` přepnuta na snímek k 30. 9. 2026, `data/msmt_rejstrik/nazvy-oboru.json`
  přegenerován; nový skript `scripts/report-nazvy-skol-rejstrik.py` a jeho výstup
  `docs/podklady/nazvy-skol-rejstrik-2026-06-30-2026-09-30.json` (věcná změna proti rozdílu formátu, duplicitní ruční
  opravy). Postup čtvrtletní obnovy v `docs/zdroje-dat.md`, oddíl 2.19a.
- **Proč:** stránky škol nesly úřední názvy ze stavu k 30. 6. 2026, takže změny od 1. 9. 2026 (sloučení Gymnázia
  Čáslav, přejmenování Smíchovské SŠ, SŠ v Kolíně a dalších) chyběly.

## 2026-10-17: párování 1. a 2. kola i při změněném zaměření (#282)

- **Požadavek:** hlášení #282 (Lyceum 600007561 neukazovalo 2. kolo) a odpověď vlastníka z 17. 10. 2026.
- **Co:** `scripts/build-druhe-kolo.py` páruje nabídky, které zůstanou bez protějšku po přesném párování, ještě
  jednou bez zaměření, a to jen když na obou stranách zbývá jediný kandidát (funkce `sparuj`, kterou používá
  i `scripts/build-obory-bez-jpz.py`). Přegenerovány `public/druhe_kolo.json` (2026: 1 039 nabídek s 2. kolem
  místo 886, 2025: 1 042 místo 880) a `src/data/obory-bez-jpz-2026.json` (1 412 místo 1 261).
- **Proč:** školy zaměření mezi koly doplní, vynechají nebo přepíšou (velikost písmen, překlep), a přesné párování
  takovou nabídku ztratilo; web pak u ní tvrdil, že 2. kolo nevypsala.

## 2026-10-17: úspěšnost maturity i z těch, kdo zkoušku konali (#375)

- **Požadavek:** issue #375, rozhodnutí vlastníka 17. 10. 2026 „ukázat obě čísla“.
- **Co:** stránka školy v oddílu o maturitě ukazuje vedle počtu úspěšných z přihlášených i podíl z přihlášených
  (`passRate`) a nový ukazatel *Úspěšnost maturity z konajících* (`passed / took`, `passRateOfTakers`
  v `src/lib/skola-vyklad.ts`): souhrnná věta za celou školu a řádek každé skupiny oborů. Podíly se při méně než
  deseti konajících neukazují (příznak `counts_only`). Zapsáno ve slovníku ukazatelů 1.64, slovníku pojmů 1.50
  a v registru u sady `cermat-maturita`.
- **Proč:** škola hlásila, že úspěšnost na webu je nesprávná; čísla CERMAT platí, ale počítají z přihlášených,
  takže škola s mnoha nekonajícími vypadá hůř, než jak dopadli ti, kdo k maturitě šli.

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
