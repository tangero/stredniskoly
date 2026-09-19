import type { Spojeni } from './novinky-db.ts';
import type { PortalHodnota, PortalSkolData, PortalZaznam } from './portal-skol.ts';

// ============================================================================
// Obsah profilu škol z databáze (tabulka portal_profil).
//
// Modul je čistě SQL nad dodaným spojením, aby šel testovat nad PGlite a aby ho
// mohly použít i skripty běžící pod `node --experimental-strip-types`. Cache
// a invalidace tagem jsou vedle v portal-profil-verejne.ts; sem `next/cache`
// nepatří, jinak by se rozbily testy a moderační skript.
//
// Platí jen řádky bez `zneplatneno`; historie a opravy se čtou zvlášť
// (administrace), na web jde vždy jen platná hodnota.
// ============================================================================

/** `platne_od` je timestamptz, publikovaný tvar je YYYY-MM-DD. */
export function den(cas: string | Date): string {
  return new Date(cas).toISOString().slice(0, 10);
}

interface RadekProfilu {
  redizo: string;
  pole: string;
  hodnota: string;
  nazev: string;
  verze_prijimani: string;
  zdroj: PortalHodnota['zdroj'];
  platne_od: string;
}

const SLOUPCE = `redizo, pole, hodnota, nazev, verze_prijimani, zdroj, platne_od`;

/** Řádky seřazené od nejstarší změny složí do záznamů po školách. */
function slozZaznamy(rows: RadekProfilu[]): PortalSkolData {
  const data: PortalSkolData = {};
  for (const radek of rows) {
    // Prázdná hodnota se nezapisuje (mazání je zneplatnění), ale kdyby se
    // objevila, na web nepatří – zaznamMaObsah by ji stejně nepustil.
    if (!radek.hodnota.trim()) continue;

    const dnes = den(radek.platne_od);
    const zaznam = (data[radek.redizo] ??= {
      redizo: radek.redizo,
      nazev: '',
      verze_prijimani: radek.verze_prijimani,
      aktualizovano: dnes,
      udaje: {},
    });

    zaznam.udaje[radek.pole] = { hodnota: radek.hodnota, potvrzeno_dne: dnes, zdroj: radek.zdroj };

    // Řádky jdou od nejstaršího, takže poslední přepis je ten nejčerstvější:
    // název školy i ročník přijímacího řízení bereme z poslední změny.
    if (radek.nazev) zaznam.nazev = radek.nazev;
    zaznam.verze_prijimani = radek.verze_prijimani;
    zaznam.aktualizovano = dnes;
  }
  return data;
}

/**
 * Platné údaje všech škol. Jedním dotazem pro celý web, stejně jako
 * `verejniSpravci`: stránky se staví po stovkách a dotaz na školu by znamenal
 * stovky dotazů při buildu.
 */
export async function potvrzeneUdaje(s: Spojeni): Promise<PortalSkolData> {
  const r = await s.dotaz<RadekProfilu>(
    `select ${SLOUPCE} from portal_profil where zneplatneno is null order by redizo, platne_od`,
  );
  return slozZaznamy(r.rows);
}

/** Jedna škola. Pro administraci a testy; web čte mapu za celý web najednou. */
export async function udajeSkoly(s: Spojeni, redizo: string): Promise<PortalZaznam | null> {
  const r = await s.dotaz<RadekProfilu>(
    `select ${SLOUPCE} from portal_profil where redizo = $1 and zneplatneno is null order by platne_od`,
    [redizo],
  );
  return slozZaznamy(r.rows)[redizo] ?? null;
}
