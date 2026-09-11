# Oprava náhledů při sdílení — O-21

Verze 1.1, 11. 9. 2026. **O-21 opraveno, nasazeno a veřejně ověřeno.** [PR #72](https://github.com/tangero/stredniskoly/pull/72), produkční commit `9146ef0`, [deployment READY](podklady/og-oprava-2027/deployment.json).

## Změna

Všechny tři cesty (`/opengraph-image`, `/regiony/opengraph-image`, `/simulator/opengraph-image`) používají společnou šablonu `src/lib/og-image.tsx`. Zůstává formát PNG 1200 × 630 a výchozí Node runtime, který odstranil dřívější HTTP 500.

- Plné lokální Noto Sans Regular/Bold nahrazují výchozí font rendereru bez dostatečného pokrytí češtiny. Font z layoutu webu se do ImageResponse automaticky nepřenášel. Licence a původ jsou v `public/og/README.md`.
- Hlavní náhled rozlišuje „Přijímání 2027“ a „Výsledky 2026“. Rok výsledků čte z metadat datového importu, nikoli z aktuálního kalendářního roku. Odstraněn starý paušální počet oborů.
- Patička je součástí sloupcového rozložení s vyhrazeným prostorem. Nezakrývá titulek ani ilustraci.
- Simulátor neslibuje osobní šanci na přijetí a nezobrazuje nejasný modelový součet 160/200. Obrázek i jeho metadata mluví o historických datech; samotná heuristika aplikace O-13 tím opravena není.
- Společná ilustrace fiktivní školy vznikla vestavěným obrazovým modelem. Text se vykresluje z kódu. [Přesné zadání](podklady/og-oprava-2027/image-prompt.txt); zdrojový asset `public/og/school-illustration.png`.

## Ověření

- Kontrola TypeScriptu a cílený ESLint.
- Produkční sestavení Next.js, včetně předgenerování všech tří obrázků. Trasování závislostí zahrnuje oba fonty i ilustraci.
- [Lokální HTTP kontrola](podklady/og-oprava-2027/local-check.json): tři odpovědi 200, `image/png`, úplné dekódování, rozměry 1200 × 630 a SHA-256.
- Vizuálně prohlédnuté výstupy: [hlavní stránka](podklady/og-oprava-2027/home.png), [kraje](podklady/og-oprava-2027/regiony.png), [simulátor](podklady/og-oprava-2027/simulator.png).
- [Produkční přejímka](podklady/og-oprava-2027/production-check.json): všechny tři veřejné stránky a devět GET obrázků (přímá adresa, `og:image`, `twitter:image`), včetně parametrů a přesměrování. Každý PNG je po bajtech shodný s plně dekódovaným a vizuálně prohlédnutým lokálním výstupem. Popisy metadat neobsahují staré období ani slib osobní šance na přijetí.
- [Kontrola produkční sestavy před nasazením](podklady/og-oprava-2027/build-metadata-check.json) ověřila stejnou shodu. Obrazy mají přibližně 349–351 kB.

Cache dříve sdílených příspěvků na sociálních sítích je samostatná distribuční vrstva. Návrh nemění pravidla přijímání, datové importy ani výpočty simulátoru.

## Historie

- R3 zachytilo původní vizuální vady v podkladech `oponentura-2027-r3-og-*.png`; ty zůstávají beze změny.
- Verze 1.0 dokumentovala implementaci před nasazením (`79e29fc`); doplňující lokální přejímky jsou v `aa85c9e`.
- Verze 1.1 uzavírá O-21 po veřejné přejímce commitu `9146ef0` na deploymentu `dpl_E9D6rFkMvGzAQJHexJeYEZFFe5TM`. O-13 zůstává otevřené; zobrazení historických údajů v náhledu neopravuje heuristiku simulátoru.
