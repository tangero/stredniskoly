# Měření: shoda obor_klic mezi DiPSy a katalogem 2026 (24. 9. 2026)

Podklad k oponentuře `docs/review-prototyp-kriteria-prijeti.md` (body 5 a 9). Trvanlivá
reprodukce: `scripts/dipsy-shoda-kliku.mjs`, surová data `dipsy-shoda-kliku-2026-09-24.json`
(vedle tohoto souboru).

## Metoda

50 škol — 10 největších podle počtu nabídek v katalogu 2026 (kandidáti na truncaci odpovědi)
a 40 deterministicky náhodných (seed 42). Pro každou školu DiPSy API 1.–3. kolo 2026;
karty filtrované na přesné REDIZO a `skolniRok = 2026`. Klíč oboru počítá importovaný
`klicOboru` ze `src/lib/portal-kriteria.ts`, tedy stejnou funkcí jako portál. Zdroj pravdy
pro rok 2026 je `public/applications_2026.json` (CERMAT).

## Výsledek

- **49/50 škol má karty v DiPSy a u všech sedí 100 % katalogových nabídek** (`shoda = nabidek`,
  nulová částečná shoda). Klíč se zaměřením si proti stejnému ročníku rozumí.
- **1 škola bez karet: Biskupské gymnázium, círk. ZŠ, MŠ a ZUŠ Hradec Králové (691000794)** —
  2 nabídky v katalogu, 0 karet podle REDIZO. Sirotek je reálný stav (2 % vzorku), ne teorie;
  import musí „škola v DiPSy není" umět výslovně.
- **Žádná truncace**: `meta.totalCount = data.length` u všech 150 dotazů (maximum 34 karet
  v jednom kole). „Velké školy" v tomto vzorku problém nejsou; kontrola `totalCount != data.length`
  patří do importního skriptu jako levná pojistka.
- **DiPSy vrací víc než katalog** (např. 50 klíčů proti 9 nabídkám u 600005381): jde o učební
  obory mimo JPZ katalog (kkov 36/23/26/39/65). Rozdíl je rozsah zdrojů, ne chyba.
- **Klíč bez zaměření je horší** (`shodaBezZamereni < shoda` u škol s více zaměřeními téhož
  kódu): zhušťuje různá zaměření do jednoho. Zaměření v klíči zůstává.

## Co měření nezodpovídá

- **Cross-year stabilita** (klíč z katalogu 2026 vs. karta DiPSy 2027): karty 2027 neexistují,
  změří se skriptem `--rok 2027` až po jejich vydání (harmonogram MŠMT: zadání kritérií do DiPSy
  15.–31. 1. 2027). Do té doby má návrh s cross-year shodou počítat jako s neověřeným předpokladem.
- Dostupnost ročníku 2027 vůbec (dokument `docs/prototyp-kriteria-prijeti.md` správně zakazuje
  ji vyvozovat z minulých karet).

## Opakování

```
node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs                     # vzorek 50
node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs --vse               # všechny školy (~3 300 dotazů)
node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs --rok 2027 --vse    # až po vydání karet 2027
```
