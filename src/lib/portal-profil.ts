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
    `select ${SLOUPCE} from portal_profil where zneplatneno is null order by redizo, poradi`,
  );
  return slozZaznamy(r.rows);
}

/** Jedna škola. Pro administraci a testy; web čte mapu za celý web najednou. */
export async function udajeSkoly(s: Spojeni, redizo: string): Promise<PortalZaznam | null> {
  const r = await s.dotaz<RadekProfilu>(
    `select ${SLOUPCE} from portal_profil where redizo = $1 and zneplatneno is null order by poradi`,
    [redizo],
  );
  return slozZaznamy(r.rows)[redizo] ?? null;
}

// ----------------------------------------------------------------------------
// Zápis
// ----------------------------------------------------------------------------

const UNIKATNI_PORUSENI = '23505';

/**
 * Serializuje operace nad jedním polem jedné školy po dobu transakce.
 *
 * `select … order by poradi desc limit 1 for update` sám nestačí: v režimu
 * READ COMMITTED Postgres po uvolnění zámku přečte novou verzi **uzamčeného
 * řádku**, ale `limit 1` znovu nevyhodnotí. Souběžná operace by tak mohla
 * pracovat s řádkem, který už nejnovější není — a obnova předchozí verze by
 * přeskočila hodnotu, která mezitím vznikla. Poradní zámek tenhle závod ruší
 * dřív, než se první řádek vůbec vybere; drží se do konce transakce.
 *
 * Zámek je zároveň důvod, proč `poradi` (bigserial) odpovídá skutečnému pořadí
 * zápisů: číslo se přiděluje při vložení, tedy až pod tímhle zámkem.
 */
async function zamkniPole(s: Spojeni, redizo: string, pole: string): Promise<void> {
  await s.dotaz(`select pg_advisory_xact_lock(hashtext($1)::bigint)`, [`portal_profil:${redizo}:${pole}`]);
}

export interface ZmenaProfilu {
  redizo: string;
  nazev: string;
  verze_prijimani: string;
  /** Hodnoty polí; prázdný řetězec pole maže. Pole, která tu nejsou, se nemění. */
  udaje: Record<string, string>;
  /**
   * Hodnoty, které měl odesílatel před sebou, když formulář otevřel. Chrání
   * novější opravu před přepsáním ze zastaralého formuláře: pole, kterého se
   * odesílatel nedotkl, se nechá být, a pole, které změnil na základě staré
   * hodnoty, skončí chybou místo tichého přepisu.
   */
  ocekavane?: Record<string, string>;
  /**
   * Id poslední verze pole, na kterou má zápis navazovat. Používá obnova
   * předchozí hodnoty: mezi jejím čtením a zápisem nesmí vzniknout další verze,
   * jinak by ji obnova přeskočila.
   */
  ocekavanePosledni?: Record<string, string | null>;
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
    await zamkniPole(s, z.redizo, pole);

    // Nejnovější řádek pole, i zneplatněný: platná hodnota se z něj pozná podle
    // `zneplatneno` a zároveň je to řádek, který nový zápis nahrazuje.
    const stav = await s.dotaz<{ id: string; hodnota: string; zneplatneno: string | null }>(
      `select id, hodnota, zneplatneno from portal_profil
        where redizo = $1 and pole = $2 order by poradi desc limit 1`,
      [z.redizo, pole],
    );
    const posledni = stav.rows[0] ?? null;
    const platny = posledni && !posledni.zneplatneno ? posledni : null;
    const soucasna = platny?.hodnota ?? '';

    // Volající očekává, že pole navazuje na konkrétní verzi (obnova předchozí
    // hodnoty). Když se poslední verze mezitím změnila, zápis se neprovede.
    const ocekavanePosledni = z.ocekavanePosledni?.[pole];
    if (ocekavanePosledni !== undefined && (posledni?.id ?? null) !== ocekavanePosledni) {
      throw new PortalChyba(
        'profil_zmenen',
        'Údaj se mezitím změnil. Otevřete prosím profil znovu a zopakujte to.',
      );
    }

    // Hodnota, kterou chceme zapsat, už v databázi je: není co dělat, a není
    // to ani konflikt (typicky opakované odeslání téhož formuláře).
    if (soucasna === nova) continue;
    if (!platny && !nova.trim()) continue;

    const ocekavana = z.ocekavane?.[pole];
    if (ocekavana !== undefined && soucasna !== ocekavana) {
      // Pole se mezitím změnilo. Když ho odesílatel nechal tak, jak ho viděl,
      // novější hodnotu mu nepřepíšeme; když ho měnil, ať to vidí.
      if (nova === ocekavana) continue;
      throw new PortalChyba(
        'profil_zmenen',
        'Někdo mezitím údaje profilu změnil. Načtěte prosím stránku znovu a zadejte změnu ještě jednou.',
      );
    }

    if (platny) {
      await s.dotaz(`update portal_profil set zneplatneno = now() where id = $1`, [platny.id]);
    }
    // I smazání zakládá řádek (prázdná hodnota, rovnou zneplatněná), jinak by se
    // ztratilo, kdo pole smazal a proč, a nebylo by co vracet zpět.
    try {
      await s.dotaz(
        `insert into portal_profil
           (id, redizo, pole, hodnota, nazev, verze_prijimani, zdroj, role_id, nahrazuje_id, zmenu_provedl, duvod, zneplatneno)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          randomUUID(),
          z.redizo,
          pole,
          nova,
          z.nazev,
          z.verze_prijimani,
          z.zdroj ?? 'skola',
          z.roleId ?? null,
          posledni?.id ?? null,
          z.zmenuProvedl,
          z.duvod ?? null,
          nova.trim() ? null : new Date().toISOString(),
        ],
      );
    } catch (e) {
      if ((e as { code?: string }).code === UNIKATNI_PORUSENI) {
        throw new PortalChyba('profil_zmenen', 'Údaj mezitím změnil někdo jiný. Načtěte prosím profil znovu.');
      }
      throw e;
    }
    zmenena.push(pole);
  }
  return zmenena;
}

export interface HistorieHodnoty {
  id: string;
  pole: string;
  hodnota: string;
  zdroj: PortalHodnota['zdroj'];
  platne_od: string;
  zneplatneno: string | null;
  zmenu_provedl: string;
  duvod: string | null;
  jmeno: string | null;
}

/** Celá historie profilu školy od nejnovější, i se jménem editora. */
export async function historieProfilu(s: Spojeni, redizo: string): Promise<HistorieHodnoty[]> {
  const r = await s.dotaz<HistorieHodnoty>(
    `select p.id, p.pole, p.hodnota, p.zdroj, p.platne_od, p.zneplatneno, p.zmenu_provedl, p.duvod, r.jmeno
       from portal_profil p left join portal_role r on r.id = p.role_id
      where p.redizo = $1 order by p.poradi desc`,
    [redizo],
  );
  return r.rows;
}

/**
 * Vrátí pole na hodnotu, kterou ta poslední nahradila. Historie se nepřepisuje:
 * poslední verze se zneplatní a předchozí se vloží jako nový řádek. Funguje
 * i pro smazané pole — smazání je taky verze, takže jde vrátit zpátky.
 * Vrací obnovenou hodnotu, nebo null, když předchůdce neexistoval.
 */
export async function vratPredchozi(
  s: Spojeni,
  z: { redizo: string; nazev: string; verze_prijimani: string; pole: string; kdo: string; duvod: string },
): Promise<string | null> {
  if (!z.duvod.trim()) throw new PortalChyba('neplatne_udaje', 'Návrat k předchozí verzi musí nést důvod.');

  // Zámek drží celé čtení i zápis: bez něj by mezi zjištěním předchozí hodnoty
  // a jejím zápisem mohla vzniknout další verze, kterou by obnova přeskočila.
  await zamkniPole(s, z.redizo, z.pole);

  const r = await s.dotaz<{ id: string; predchozi: string | null }>(
    `select p.id, s.hodnota as predchozi
       from (select id, nahrazuje_id from portal_profil
              where redizo = $1 and pole = $2 order by poradi desc limit 1) p
       left join portal_profil s on s.id = p.nahrazuje_id`,
    [z.redizo, z.pole],
  );
  if (r.rows.length === 0) throw new PortalChyba('profil_zmenen', 'Pole nemá žádnou historii, není co vracet.');

  const predchozi = r.rows[0].predchozi ?? '';
  await zapisUdaje(s, {
    redizo: z.redizo,
    nazev: z.nazev,
    verze_prijimani: z.verze_prijimani,
    udaje: { [z.pole]: predchozi },
    // Zápis musí navázat právě na verzi, ze které se předchozí hodnota četla.
    ocekavanePosledni: { [z.pole]: r.rows[0].id },
    zdroj: 'redakce',
    zmenuProvedl: `admin:${z.kdo}`,
    duvod: z.duvod,
  });
  return predchozi || null;
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
