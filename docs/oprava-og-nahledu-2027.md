# Oprava náhledů při sdílení — O-21

Verze 1.0, 11. 9. 2026. Stav před nasazením: implementováno a lokálně ověřeno. Produkční přejímka bude doplněna po zveřejnění.

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

Cache dříve sdílených příspěvků na sociálních sítích je samostatná distribuční vrstva. Návrh nemění pravidla přijímání, datové importy ani výpočty simulátoru.

## Historie

- R3 zachytilo původní vizuální vady v podkladech `oponentura-2027-r3-og-*.png`; ty zůstávají beze změny.
- Tato dodávka opravuje O-21. Uzavření veřejné přejímky vyžaduje kontrolu nasazených obrázků a skutečných odkazů v metadatech.
