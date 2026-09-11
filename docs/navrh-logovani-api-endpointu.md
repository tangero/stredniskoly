# Měření strojových přístupů přes existující BetterStack drain

Verze **1.3 / R3**, 11. 9. 2026. **Stav: potřebná pole ověřena v exportu, uložený analytický dotaz zatím nepřipraven.** Vlastní logovací modul a nová databáze se pro tento účel neplánují. Původní návrh [v1.2](historie/rozvoj-2027-r3-vstup/navrh-logovani-api-endpointu.md) je zachován; jeho starší návrhy implementace nejsou aktuálním zadáním.

## 1. Co máme doloženo

[Kontrola původního NDJSON](podklady/oponentura-2027-r3-betterstack.json) potvrzuje 43 polí, 14 logových řádků a 12 různých request ID. `vercel.proxy.user_agent` je vyplněn ve 14 řádcích, `vercel.proxy.referer` v devíti. Export obsahuje veřejnou cestu `/skola/[slug].md` s 200 a dřívější chybu OG obrázku u deklarovaného `facebookexternalhit`. Jednoprvkové seznamy polí je při čtení nutné normalizovat; schéma výpisu v UI není úplné schéma exportu.

**Tento vzorek neprokazuje úplnost provozu.** Všech 14 řádků má MISS. Pokrytí HIT, retence a případný limit/výběr exportu musí projít kontrolou před objemovými závěry. Časové okno v názvu exportu není důkaz, že soubor obsahuje všechny události tohoto okna.

## 2. Co má uložený dotaz dělat

1. Omezit projekt, produkční prostředí, doménu a explicitní období; uložit časové pásmo, filtry a verzi dotazu.
2. Normalizovat cestu bez query a rozlišit veřejné `/skola/*.md`, `/skola/*.json`, `/api/schools/search` i případné interní rewrite varianty `/api/skola/*`. Nezapočítat veřejnou a interní stopu téhož požadavku dvakrát.
3. Počítat požadavky podle vhodného request ID v kontextu projektu/deploymentu; logové zprávy nejsou jednotlivá stažení. Záznam bez ID nebo statusu evidovat zvlášť, nedosazovat automaticky úspěch ani nulu.
4. Vytvořit oddělené součty podle formátu, statusu, deklarované třídy UA a HIT/MISS. Neznámé či prázdné pole je samostatná kategorie. Nejprve ověřit známý testovací MISS a následný HIT ve výstupu drainu, bez vypínání cache.
5. UA klasifikovat podle explicitních pravidel a ověřené dokumentace příslušného provozovatele. Řetězec podobný prohlížeči není důkaz člověka; jméno robota není důkaz skutečné identity, tréninku modelu ani konkrétní otázky uživatele. Původní přiřazení všech crawlerů k „bere do znalostí“ se ruší.
6. Do souhrnu neposílat IP, surové referery, volné dotazy nebo identifikátory osob. Vynechání IP ve výsledném dotazu nemění skutečnost, že ji původní drain uchovává. Před běžným používáním určit účel, přístup a přiměřenou retenci skutečně ukládaných dat.

Není zadána změna sběru, blokování botů, nová rozesílka ani automatický alert. Rozsah tří skupin cest je filtr **analytického dotazu**, nikoli tvrzení, že existující drain sbírá jen tyto cesty.

## 3. Co z výsledků smíme vyvodit

Nenulový ověřený záznam dokládá požadavek s danými vlastnostmi. Nula v omezeném vzorku nedokládá nepoužívání formátů, zbytečnost jejich vytvoření ani nečtení llms.txt. Tento dotaz neporovnává celý HTML provoz; bez jeho doplnění nerozhodne, že bot preferuje HTML před JSON. Ani úspěšný download nedokazuje další použití obsahu modelem.

Měsíční vyhodnocovací okno je navržený požadavek; dostupnou retenci účtu je potřeba ověřit. Odhad 1–2 hodiny pro první konfiguraci z v1.2 je pracovní předpoklad, nikoli doložené dokončení nebo garantovaný čas validace.

## 4. Oddělené stavy

- **Matomo:** ověřený rutinní čtecí klient podle [návodu](matomo-pristup.md). M0 pro měření navigace a úkonů nadále nehotovo.
- **Vercel Web Analytics:** [programový přístup k účtu zatím neověřen](vercel-analytics-pristup.md). Hypotéza, že 404 vyžaduje vyšší tarif, byla v R3 stažena; nejde o hotovou integraci.
- **Vercel projekt:** místní propojení bylo v R2 opraveno na `stredniskoly`; správnou identitu ověřovat před prací s prostředím.
- **OG obrázky:** HTTP výpadek O-19 opraven a veřejně ověřen; vizuální vady mají samostatný O-21.
- **Pořadí:** oprava O-13 má přednost. Tato konfigurace drainu nenahrazuje M0 ani neblokuje návrh Mého výběru.

## 5. Historie

| Verze | Změna |
|---|---|
| 1.0–1.1 | Původní návrh vlastního logování při neúplné znalosti zdrojů; nepoužívat jako aktuální zadání. |
| 1.2 | Oponent doložil NDJSON s UA/refererem; vlastní implementace přestala být odůvodněná. Přesný vstup uložen ve snímku R3. |
| 1.3 / R3 | Nezávisle ověřen export, odstraněny rozporné aktivní pokyny k vlastnímu modulu/tarifu a nulovým vzorkům. Zadán dotaz s normalizací polí, deduplikací a kontrolou HIT/retence. |
