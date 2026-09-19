import { randomUUID } from 'crypto';
import type { Spojeni } from './novinky-db.ts';
import type { PortalHodnota, PortalSkolData, PortalZaznam } from './portal-skol.ts';
import { PortalChyba } from './portal-ucty.ts';

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

// ----------------------------------------------------------------------------
// Zápis
// ----------------------------------------------------------------------------

const UNIKATNI_PORUSENI = '23505';

export interface ZmenaProfilu {
  redizo: string;
  nazev: string;
  verze_prijimani: string;
  /** Hodnoty polí; prázdný řetězec pole maže. Pole, která tu nejsou, se nemění. */
  udaje: Record<string, string>;
  zdroj?: PortalHodnota['zdroj'];
  /** Role editora školy, u opravy redakcí null. */
  roleId?: string | null;
  /** Odkud změna přišla: `ucet`, `odkaz`, `kod`, u redakce `admin:<kdo>`. */
  zmenuProvedl: string;
  duvod?: string | null;
}

/**
 * Zapíše hodnoty polí. Nic nepřepisuje: změněné pole dostane nový řádek
 * a starý `zneplatneno`, smazané pole jen `zneplatneno`. Hodnota, která se
 * nezměnila, se nepřepisuje vůbec, aby se datum potvrzení neposouvalo
 * u údaje, kterého se škola ani nedotkla.
 *
 * Volá se uvnitř transakce (`vTransakci`), aby zneplatnění a vložení nešlo
 * rozpojit. Vrací pole, která se opravdu změnila.
 */
export async function zapisUdaje(s: Spojeni, z: ZmenaProfilu): Promise<string[]> {
  if (z.zmenuProvedl.startsWith('admin') && !z.duvod?.trim()) {
    throw new PortalChyba('neplatne_udaje', 'Oprava redakcí musí nést důvod.');
  }

  const zmenena: string[] = [];
  for (const [pole, nova] of Object.entries(z.udaje)) {
    // Zámek na platném řádku pole; dva souběžné zápisy se tak seřadí za sebe.
    const stav = await s.dotaz<{ id: string; hodnota: string }>(
      `select id, hodnota from portal_profil
        where redizo = $1 and pole = $2 and zneplatneno is null for update`,
      [z.redizo, pole],
    );
    const stary = stav.rows[0] ?? null;

    if (stary && stary.hodnota === nova) continue;
    if (!stary && !nova.trim()) continue;

    if (stary) {
      await s.dotaz(`update portal_profil set zneplatneno = now() where id = $1`, [stary.id]);
    }
    if (nova.trim()) {
      try {
        await s.dotaz(
          `insert into portal_profil
             (id, redizo, pole, hodnota, nazev, verze_prijimani, zdroj, role_id, nahrazuje_id, zmenu_provedl, duvod)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            randomUUID(),
            z.redizo,
            pole,
            nova,
            z.nazev,
            z.verze_prijimani,
            z.zdroj ?? 'skola',
            z.roleId ?? null,
            stary?.id ?? null,
            z.zmenuProvedl,
            z.duvod ?? null,
          ],
        );
      } catch (e) {
        if ((e as { code?: string }).code === UNIKATNI_PORUSENI) {
          throw new PortalChyba('profil_zmenen', 'Údaj mezitím změnil někdo jiný. Načtěte prosím profil znovu.');
        }
        throw e;
      }
    }
    zmenena.push(pole);
  }
  return zmenena;
}

/** Zpětná oprava jedné hodnoty redakcí; důvod je povinný. */
export async function opravRedakce(
  s: Spojeni,
  z: { redizo: string; nazev: string; verze_prijimani: string; pole: string; hodnota: string; kdo: string; duvod: string },
): Promise<string[]> {
  return zapisUdaje(s, {
    redizo: z.redizo,
    nazev: z.nazev,
    verze_prijimani: z.verze_prijimani,
    udaje: { [z.pole]: z.hodnota },
    zdroj: 'redakce',
    zmenuProvedl: `admin:${z.kdo}`,
    duvod: z.duvod,
  });
}
