import type { KriteriaOboru } from './prevod-testu-vypocet';

// ============================================================================
// Štítek „extra body“ (slovník pojmů): přepis kritérií boduje i něco jiného
// než jednotnou přijímací zkoušku. Sdílí ho stránka oboru (KdeStojim) a index
// simulátoru; Python kopie v scripts/build-simulator-pasma.py, shodu hlídá
// tests/simulator-pasma.test.mjs.
// ============================================================================

/**
 * Sankce za chování: název mluví o chování a o snížení bodů, ne o prospěchu. Směr bodování
 * o extra bodech nerozhoduje (odečet za průměr je hodnocení prospěchu); „průměr bez známky
 * z chování“ sankce není, stejně jako bonus za chování.
 */
const RE_CHOVANI = /chování|chovani|kázeň|kazen|důtk|dutk/i;
const RE_SNIZENI = /odeč|odpoč|sníž|sniz|penaliz|záporn|srážk|srazk|uspokoj/i;
const RE_PROSPECH = /prospěch|prospech|průměr|prumer|vzdělávání|výsledk|bonus/i;
export const srazka = (x: KriteriaOboru['prepisy'][number]['slozky'][number]) =>
  RE_CHOVANI.test(x.nazev) && RE_SNIZENI.test(x.nazev) && !RE_PROSPECH.test(x.nazev);

/** Přepis boduje i něco jiného než jednotnou přijímací zkoušku (extra body ve slovníku pojmů). */
export const extraBody = (p: KriteriaOboru['prepisy'][number]) =>
  // Složky mimo JPZ, i s neznámým směrem (odečet průměru je také extra body); jen doložené srážky, například za chování, ne.
  p.rezim === 'jine' && (p.chybi_slozky || p.slozky.some(x => x.max !== 0 && !srazka(x)));
