import { dotaz, vTransakci } from './novinky-db.ts';
import {
  najdiServisniPolozky,
  predejDavku,
  pripravDavku,
  uzavriDavku,
} from './novinky-fronta.ts';
import {
  LIMIT_NA_ADRESU,
  najdiAktivniZadost,
  odhlas,
  potvrd,
  prehledPodlePolozky,
  prihlas,
  uklid,
} from './novinky-odber.ts';
import { dokonciUcinkyWebhooku, obnovUviznute, uklidOdesilace } from './novinky-odesilac.ts';
import { limitRozpoctu, obdobiKRezervaci } from './novinky-rozpocet.ts';
import { otisk } from './novinky-token.ts';

// ============================================================================
// Kouřová zkouška odběru proti skutečné databázi.
//
// Proč existuje: jednotkové testy odběru běží proti falešnému spojení, které
// dotazy nekontroluje. První skutečné volání formuláře na produkci proto spadlo
// na `42P18 could not determine data type of parameter $2` — dotaz předával
// parametr, který v jeho textu nebyl. Takovou chybu odhalí jedině Postgres.
//
// Zkouška projde celou cestou člověka (přihlášení → dávka → potvrzení → správa
// → odhlášení → úklid) a **neposílá žádný e-mail**: Resend se nevolá a dávka se
// uzavře jako chybná, takže se položka vrátí do fronty.
//
// Po sobě uklidí všechny své záznamy. Zkušební adresa je z domény
// `example.com` (RFC 2606) a IP z rozsahu 203.0.113.0/24 (RFC 5737), takže
// nemůže patřit nikomu skutečnému.
// ============================================================================

export interface Krok {
  popis: string;
  ok: boolean;
  detail?: string;
}

export interface VysledekZkousky {
  ok: boolean;
  adresa: string;
  kroky: Krok[];
  poklid: Record<string, number>;
  chyba?: string;
}

const IP_ZKOUSKY = '203.0.113.7';

/** Adresa jedné zkoušky; časová značka odděluje běhy od sebe. */
function zkusebniAdresa(): string {
  return `kourova-zkouska-${Date.now()}@example.com`;
}

/**
 * Projde cestu odběru proti databázi. Nevyhazuje: každý krok se zapíše jako
 * splněný nebo nesplněný, aby bylo vidět, kde přesně se to láme. Fatální chybu
 * (třeba nedostupnou databázi) vrátí v poli `chyba`.
 */
export async function kourovaZkouska(kdy = new Date()): Promise<VysledekZkousky> {
  const adresa = zkusebniAdresa();
  const kroky: Krok[] = [];
  const tvrd = (popis: string, ok: boolean, detail?: string) => {
    kroky.push({ popis, ok, detail });
  };
  let chyba: string | undefined;

  try {
    // --- Rozpočet: řádky si zakládá rezervace sama, nic se tu nepřipravuje. --
    // Zkouška je schválně nezakládá: kdyby to udělala, zakryla by tím past,
    // kvůli které vznikla — potvrzení z formuláře v novém dni nebo měsíci
    // nemělo kam rezervovat, protože řádek zakládal jen cron.
    const obdobi = obdobiKRezervaci(kdy, 'potvrzeni');
    const radky = await dotaz<{ obdobi: string; ucel: string; limit_pocet: number }>(
      `select obdobi, ucel, limit_pocet from rozpocet_emailu where obdobi = any($1::text[])`,
      [obdobi.map((o) => o.obdobi)],
    );
    tvrd(
      'rozpočet zjištěn (řádky smí i chybět)',
      true,
      `${radky.rows.length} z ${obdobi.length}: ${radky.rows.map((r) => `${r.ucel} ${r.limit_pocet}`).join(', ') || 'žádný'}`,
    );

    // --- Krok 1: přihlášení -------------------------------------------------
    const prihlaseni = await prihlas({ email: adresa, zdroj: 'novinky', ip: IP_ZKOUSKY });
    tvrd('přihlášení založilo žádost', prihlaseni.poslat === true, prihlaseni.duvod);
    tvrd('žádost má jti', Boolean(prihlaseni.jti));
    tvrd('vznikla položka fronty', Boolean(prihlaseni.polozkaId));
    if (!prihlaseni.jti) {
      return { ok: false, adresa, kroky, poklid: await poklid(adresa, kdy), chyba: 'bez žádosti' };
    }

    const nactena = await najdiAktivniZadost(prihlaseni.jti);
    tvrd('žádost se dá načíst', nactena?.email === adresa);

    // Počitadlo limitu: LIMIT_NA_ADRESU povolených, další už ne.
    for (let i = 1; i < LIMIT_NA_ADRESU; i += 1) {
      await prihlas({ email: adresa, zdroj: 'novinky', ip: IP_ZKOUSKY });
    }
    const nadLimit = await prihlas({ email: adresa, zdroj: 'novinky', ip: IP_ZKOUSKY });
    tvrd('limit na adresu drží', nadLimit.poslat === false, nadLimit.duvod);

    // --- Dávka: kroky A, B, C bez volání Resendu ----------------------------
    const pripravena = await vTransakci((s) =>
      pripravDavku(s, {
        zprava: 'novinky/potvrzeni',
        ucel: 'potvrzeni',
        otiskObsahu: 'kourova-zkouska',
        max: 5,
        kdy,
        telo: (polozky) => JSON.stringify(polozky.map((p) => ({ id: p.id }))),
      }),
    );
    tvrd('dávka se připravila (A)', pripravena !== null);
    if (pripravena) {
      const predano = await vTransakci((s) => predejDavku(s, pripravena.davka, kdy, 'potvrzeni'));
      tvrd('dávka se předala (B)', predano.predano === true, predano.duvod);

      // Uzavření na `chyba` znamená „prokazatelně neodesláno“: položky se vrátí
      // do fronty a rezervace se uvolní, takže nic neodešlo a nic nezůstalo
      // rozpracované.
      const uzavreno = await vTransakci((s) =>
        uzavriDavku(s, pripravena.davka.id, pripravena.davka.pokus, 'chyba'),
      );
      tvrd('dávka se uzavřela jako chybná (C)', uzavreno === true);

      const zpet = await dotaz<{ stav: string }>(
        `select stav from polozka_odeslani where id = any($1::uuid[])`,
        [pripravena.polozky.map((p) => p.id)],
      );
      tvrd(
        'položky se vrátily do fronty',
        zpet.rows.length > 0 && zpet.rows.every((r) => r.stav === 'ceka'),
        zpet.rows.map((r) => r.stav).join(','),
      );
      const rez = await dotaz<{ nevyporadano: number }>(
        `select count(*)::int as nevyporadano from rezervace_kvoty
          where davka_id = $1 and vyporadano is null`,
        [pripravena.davka.id],
      );
      tvrd('rezervace jsou vypořádané', rez.rows[0]?.nevyporadano === 0);
    }

    // --- Krok 4: potvrzení --------------------------------------------------
    const potvrzeni = await potvrd(prihlaseni.jti);
    tvrd('potvrzení prošlo', potvrzeni.ok === true, potvrzeni.duvod);
    tvrd('vznikl odběratel', Boolean(potvrzeni.odberatelId));
    tvrd('vzniklo uvítání', Boolean(potvrzeni.uvitaniPolozkaId));
    tvrd(
      'uvítání nese jti v identifikátoru',
      potvrzeni.uvitaniZprava === `novinky/uvitani/${prihlaseni.jti}`,
      potvrzeni.uvitaniZprava,
    );
    const podruhe = await potvrd(prihlaseni.jti);
    tvrd('týž odkaz podruhé neprojde', podruhe.ok === false, podruhe.duvod);

    if (potvrzeni.odberatelId) {
      const doklady = await dotaz<{ pocet: number }>(
        `select count(*)::int as pocet from doklad_souhlasu where odberatel_id = $1`,
        [potvrzeni.odberatelId],
      );
      tvrd('doklad souhlasu je zapsaný', doklady.rows[0]?.pocet === 1);
    }

    // --- Kroky 6 a 7: správa a odhlášení -----------------------------------
    if (potvrzeni.uvitaniPolozkaId) {
      const prehled = await prehledPodlePolozky(potvrzeni.uvitaniPolozkaId);
      tvrd('přehled vidí adresu', prehled?.email === adresa);
      tvrd('přehled vidí aktivní odběr', prehled?.odebira === true);

      const odhlaseno = await odhlas(potvrzeni.uvitaniPolozkaId);
      tvrd('odhlášení prošlo', odhlaseno.ok === true, odhlaseno.duvod);

      const zbyly = await dotaz<{ pocet: number }>(
        `select count(*)::int as pocet from odber_novinek where odberatel_id = $1`,
        [potvrzeni.odberatelId],
      );
      tvrd('odběr je zrušený', zbyly.rows[0]?.pocet === 0);
      const identita = await dotaz<{ pocet: number }>(
        `select count(*)::int as pocet from odberatel where id = $1`,
        [potvrzeni.odberatelId],
      );
      tvrd('osiřelá identita je smazaná', identita.rows[0]?.pocet === 0);
      const doklad = await dotaz<{ zaniklo: string | null; smazat_po: string | null }>(
        `select zaniklo, smazat_po from doklad_souhlasu
          where email_otisk = $1 and odberatel_id is null`,
        [otisk(`email:${adresa}`)],
      );
      tvrd(
        'doklad zůstal bez adresy a má lhůtu',
        doklad.rows.length > 0 && doklad.rows.every((r) => r.zaniklo && r.smazat_po),
        `${doklad.rows.length}`,
      );
    }

    // --- Cesty, které jinak spustí až cron ---------------------------------
    const u = await uklid();
    tvrd('denní úklid proběhl', typeof u.zadosti === 'number', JSON.stringify(u));
    const obnova = await obnovUviznute(kdy);
    tvrd('obnova uvíznutých dávek proběhla', obnova !== null, JSON.stringify(obnova));
    const ucinky = await dokonciUcinkyWebhooku();
    tvrd('dokončení účinků webhooku proběhlo', typeof ucinky === 'number', String(ucinky));
    const uo = await uklidOdesilace(kdy);
    tvrd('úklid odesílače proběhl', uo !== null, JSON.stringify(uo));
    const servisni = await vTransakci((s) => najdiServisniPolozky(s, 5));
    tvrd('hledání servisních položek proběhlo', Array.isArray(servisni), `${servisni.length}`);

    // --- Limity rozpočtu: musí odpovídat tomu, co říká modul ---------------
    // Řádek se zakládá jednou a `do nothing` ho nikdy nepřepíše, takže špatný
    // limit by v tabulce zůstal do konce období, aniž by si toho kdokoli všiml.
    // Právě to se stalo prvním během této zkoušky, který si řádky zakládal sám.
    const poRezervaci = await dotaz<{ obdobi: string; ucel: string; limit_pocet: number }>(
      `select obdobi, ucel, limit_pocet from rozpocet_emailu where obdobi = any($1::text[])`,
      [obdobi.map((o) => o.obdobi)],
    );
    for (const { obdobi: o, ucel: u } of obdobi) {
      const radek = poRezervaci.rows.find((r) => r.obdobi === o && r.ucel === u);
      const ocekavany = limitRozpoctu(u);
      tvrd(
        `limit rozpočtu ${u} odpovídá modulu`,
        radek !== undefined && radek.limit_pocet === ocekavany,
        radek ? `má ${radek.limit_pocet}, čeká ${ocekavany}` : 'řádek chybí',
      );
    }
    const cizi = poRezervaci.rows.filter((r) => r.ucel !== 'celkem' && r.ucel !== 'potvrzeni');
    tvrd('v rozpočtu nejsou řádky s neznámým účelem', cizi.length === 0, cizi.map((r) => r.ucel).join(','));
  } catch (e) {
    chyba = e instanceof Error ? e.message : String(e);
  }

  const uklizeno = await poklid(adresa, kdy).catch((e) => {
    chyba = `${chyba ? `${chyba}; ` : ''}poklid selhal: ${e instanceof Error ? e.message : e}`;
    return {};
  });

  return {
    ok: chyba === undefined && kroky.every((k) => k.ok),
    adresa,
    kroky,
    poklid: uklizeno,
    chyba,
  };
}

/**
 * Smaže všechno, co zkušební adresa v databázi zanechala. Maže se podle otisku
 * adresy a podle adresy samotné, protože obojí se v tabulkách vyskytuje.
 *
 * Uklízí i **prázdné řádky rozpočtu** období, kterých se zkouška dotkla. Bez
 * toho by příští běh už nezkoušel to podstatné — že si rezervace řádek umí
 * založit sama — protože by ho našel hotový. Řádek s nulovým limitem je ruční
 * pojistka a nemaže se; ostatní prázdné řádky nedrží žádnou spotřebu, takže se
 * smazáním nic neztrácí a vzniknou znovu se správným limitem.
 */
async function poklid(adresa: string, kdy: Date): Promise<Record<string, number>> {
  const otiskEmailu = otisk(`email:${adresa}`);
  const otiskIp = otisk(`ip:${IP_ZKOUSKY}`);
  const obdobi = obdobiKRezervaci(kdy, 'potvrzeni').map((o) => o.obdobi);
  return vTransakci(async (s) => {
    const polozky = await s.dotaz<{ davka_id: string | null }>(
      `delete from polozka_odeslani where adresat_otisk = $1 returning davka_id`,
      [otiskEmailu],
    );
    const davky = [...new Set(polozky.rows.map((r) => r.davka_id).filter(Boolean))] as string[];
    for (const id of davky) {
      await s.dotaz(`delete from rezervace_kvoty where davka_id = $1`, [id]);
      await s.dotaz(`delete from davka where id = $1`, [id]);
    }
    const zadosti = await s.dotaz(`delete from zadost_o_potvrzeni where email = $1`, [adresa]);
    const doklady = await s.dotaz(`delete from doklad_souhlasu where email_otisk = $1`, [otiskEmailu]);
    const odberatele = await s.dotaz(`delete from odberatel where email = $1`, [adresa]);
    const limity = await s.dotaz(`delete from limit_potvrzeni where otisk = any($1::text[])`, [
      [otiskEmailu, otiskIp],
    ]);
    const rozpocty = await s.dotaz(
      `delete from rozpocet_emailu
        where obdobi = any($1::text[]) and rezervovano = 0 and spotrebovano = 0
          and limit_pocet > 0`,
      [obdobi],
    );
    return {
      polozky: polozky.rowCount,
      davky: davky.length,
      zadosti: zadosti.rowCount,
      doklady: doklady.rowCount,
      odberatele: odberatele.rowCount,
      limity: limity.rowCount,
      rozpocty: rozpocty.rowCount,
    };
  });
}
