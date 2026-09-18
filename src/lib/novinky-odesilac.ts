import { createHash } from 'crypto';
import { dotaz, vTransakci } from './novinky-db.ts';
import type { Spojeni } from './novinky-db.ts';
import {
  jeZpravaPlatna,
  najdiNedokonceneUcinky,
  najdiUviznuteDavky,
  rezervujKvotu,
  pripravDavku,
  predejDavku,
  smiSeOpakovat,
  umazTelaDavek,
  uzavriDavku,
  vyporadejRezervace,
  zahodProsle,
  zapisVysledekPolozky,
  zaradPolozku,
  zrusPripravenouDavku,
} from './novinky-fronta.ts';
import type { DavkaZaznam, Polozka } from './novinky-fronta.ts';
import { odesliDavku, sestavTeloDavky } from './novinky-email.ts';
import { obalka } from './novinky-email.ts';
import { odhlasovaciOdkaz, otisk, vytvorToken, SPRAVA_PLATNOST_MS } from './novinky-token.ts';
import { DAVKA_MAX } from './novinky-rozpocet.ts';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Odesílač obsahových zpráv (docs/novinky-k-prijimackam-2027.md, kroky 5 a 6).
//
// Zprávy se čtou z **manifestu na nasazeném webu**, ne z repozitáře: schválení
// je sloučení pull requestu a nasazení, takže odesílač vidí totéž, co rodina.
// ============================================================================

export interface ZpravaZManifestu {
  zprava: string;
  nazev: string;
  rocnik: string;
  splatnost: string;
  konec_uzitecnosti: string;
  segment: Array<'ss' | 'vicelete'>;
  predmet: string;
  html: string;
  text: string;
  otisk_kalendare: string;
}

export interface Manifest {
  rocnik: string;
  zpravy: Array<{ zprava: string; soubor: string; splatnost: string; konec_uzitecnosti: string }>;
}

/** Otisk kalendáře, ze kterého zpráva vznikla. Změna znamená nové schválení. */
export function otiskKalendare(): string {
  return createHash('sha256').update(JSON.stringify(calendar)).digest('hex');
}

/** Načte manifest a zprávy z nasazeného webu. */
export async function nactiZpravy(base: string, rocnik: string): Promise<ZpravaZManifestu[]> {
  const odpoved = await fetch(`${base}/novinky/${rocnik}/manifest.json`, { cache: 'no-store' });
  if (!odpoved.ok) return [];
  const manifest = (await odpoved.json()) as Manifest;
  const zpravy: ZpravaZManifestu[] = [];
  for (const zaznam of manifest.zpravy ?? []) {
    const detail = await fetch(`${base}/novinky/${rocnik}/${zaznam.soubor}`, { cache: 'no-store' });
    if (!detail.ok) continue;
    zpravy.push((await detail.json()) as ZpravaZManifestu);
  }
  return zpravy;
}

/** Zapíše verzi zprávy, aby platnost mohla kontrolovat databáze. */
export async function zapisVerzi(s: Spojeni, z: ZpravaZManifestu): Promise<string> {
  const otiskObsahu = createHash('sha256').update(`${z.predmet}\n${z.html}\n${z.text}`).digest('hex');
  await s.dotaz(
    `insert into zprava_verze (zprava, otisk_obsahu, otisk_kalendare, splatnost, konec_uzitecnosti)
     values ($1, $2, $3, $4, $5)
     on conflict (zprava, otisk_obsahu) do update
       set otisk_kalendare = excluded.otisk_kalendare,
           splatnost = excluded.splatnost,
           konec_uzitecnosti = excluded.konec_uzitecnosti`,
    [z.zprava, otiskObsahu, z.otisk_kalendare, z.splatnost, z.konec_uzitecnosti],
  );
  return otiskObsahu;
}

/**
 * Naplní frontu: pro každého odběratele v segmentu jedna položka. Vkládá se
 * `on conflict do nothing`, takže opakované naplnění nic nezdvojí.
 */
export async function naplnFrontu(s: Spojeni, z: ZpravaZManifestu): Promise<number> {
  const prijemci = await s.dotaz<{ odberatel_id: string; email: string }>(
    `select distinct o.odberatel_id, u.email
       from odber_novinek o join odberatel u on u.id = o.odberatel_id
      where o.rocnik = $1 and o.druh_studia = any($2::text[])`,
    [z.rocnik, z.segment],
  );
  let pridano = 0;
  for (const p of prijemci.rows) {
    const id = await zaradPolozku(s, {
      zprava: z.zprava,
      ucel: 'obsah',
      odberatelId: p.odberatel_id,
      adresatOtisk: otisk(`email:${p.email}`),
      segment: [...z.segment],
    });
    if (id) pridano += 1;
  }
  return pridano;
}

export interface VysledekBehu {
  zprava: string;
  naplneno: number;
  odeslano: number;
  zahozeno: number;
  chyby: string[];
}

/**
 * Zpracuje jednu zprávu: ověří platnost, naplní frontu a odešle dávky.
 * Platnost se kontroluje při naplnění, při sestavení dávky i před předáním.
 */
export async function zpracujZpravu(
  z: ZpravaZManifestu,
  base: string,
  kdy = new Date(),
): Promise<VysledekBehu> {
  const vysledek: VysledekBehu = { zprava: z.zprava, naplneno: 0, odeslano: 0, zahozeno: 0, chyby: [] };
  const otiskKal = otiskKalendare();

  const priprava = await vTransakci(async (s) => {
    const otiskObsahu = await zapisVerzi(s, z);
    const platnost = await jeZpravaPlatna(s, z.zprava, otiskKal, kdy);
    if (!platnost.platna) {
      const zahozeno = await zahodProsle(s, z.zprava);
      return { pokracovat: false as const, duvod: platnost.duvod ?? 'neplatná', zahozeno, otiskObsahu };
    }
    const naplneno = await naplnFrontu(s, z);
    return { pokracovat: true as const, naplneno, otiskObsahu };
  });

  if (!priprava.pokracovat) {
    vysledek.zahozeno = priprava.zahozeno;
    vysledek.chyby.push(`zpráva se neposílá: ${priprava.duvod}`);
    return vysledek;
  }
  vysledek.naplneno = priprava.naplneno;

  // Dávky posíláme, dokud je co; každá má vlastní transakce A, B a C.
  for (let kolo = 0; kolo < 50; kolo += 1) {
    const pripravena = await vTransakci(async (s) => {
      const platnost = await jeZpravaPlatna(s, z.zprava, otiskKal, new Date());
      if (!platnost.platna) return null;
      return pripravDavku(s, {
        zprava: z.zprava,
        ucel: 'obsah',
        otiskObsahu: priprava.otiskObsahu,
        max: DAVKA_MAX,
        telo: (polozky) => teloProZpravu(z, polozky),
      });
    }).catch((chyba) => {
      vysledek.chyby.push(`dávka se nepřipravila: ${String(chyba)}`);
      return null;
    });
    if (!pripravena) break;

    const odeslanoVDavce = await odesliPripravenouDavku(pripravena.davka, pripravena.polozky, z);
    vysledek.odeslano += odeslanoVDavce.odeslano;
    vysledek.chyby.push(...odeslanoVDavce.chyby);
    if (!odeslanoVDavce.pokracovat) break;
  }
  return vysledek;
}

/** Tělo dávky: adresy a odhlašovací odkazy doplňuje odesílač, ne `public/`. */
function teloProZpravu(z: ZpravaZManifestu, polozky: Polozka[]): string {
  return sestavTeloDavky(
    polozky.map((p) => {
      const token = vytvorToken(p.id, SPRAVA_PLATNOST_MS);
      return {
        polozkaId: p.id,
        email: p.email,
        predmet: z.predmet,
        html: obalka(
          z.html,
          `<a href="https://www.prijimackynaskolu.cz/api/novinky/sprava?t=${encodeURIComponent(token)}" style="color:#0074e4;">Upravit odběr</a> · <a href="${odhlasovaciOdkaz(token)}" style="color:#0074e4;">Odhlásit se</a>`,
        ),
        text: z.text,
        odhlasovaciToken: token,
      };
    }),
  );
}

/** Předá dávku a vypořádá její výsledek podle kroků 5.4 až 5.7. */
export async function odesliPripravenouDavku(
  davka: DavkaZaznam,
  polozky: Polozka[],
  z: ZpravaZManifestu,
): Promise<{ odeslano: number; pokracovat: boolean; chyby: string[] }> {
  const chyby: string[] = [];

  const predano = await vTransakci(async (s) => {
    const platnost = await jeZpravaPlatna(s, z.zprava, otiskKalendare(), new Date());
    if (!platnost.platna) {
      await zrusPripravenouDavku(s, davka.id, davka.pokus);
      return { predano: false, duvod: `platnost skončila: ${platnost.duvod}` };
    }
    return predejDavku(s, davka, new Date());
  });
  if (!predano.predano) {
    chyby.push(`dávka se nepředala: ${predano.duvod}`);
    return { odeslano: 0, pokracovat: false, chyby };
  }

  const odpoved = await odesliDavku(davka.telo, davka.idempotency_key);
  if (odpoved.ok) {
    await vTransakci(async (s) => {
      await uzavriDavku(s, davka.id, davka.pokus, 'odeslana');
      for (let i = 0; i < polozky.length; i += 1) {
        await zapisVysledekPolozky(s, polozky[i].id, odpoved.idEmailu[i] ?? null, 'sent');
      }
    });
    return { odeslano: polozky.length, pokracovat: true, chyby };
  }
  if (odpoved.jistaChyba) {
    await vTransakci((s) => uzavriDavku(s, davka.id, davka.pokus, 'chyba'));
    chyby.push(`Resend odmítl dávku (${odpoved.stav}): ${odpoved.chyba ?? ''}`);
    return { odeslano: 0, pokracovat: false, chyby };
  }
  // Neznámý výsledek: dávka zůstává `predavana`, rezervace platí, obnovu udělá
  // příští běh podle kroku 5.7.
  chyby.push(`neznámý výsledek dávky ${davka.id}, obnoví ji příští běh`);
  return { odeslano: 0, pokracovat: false, chyby };
}

export interface VysledekObnovy {
  dokonceno: number;
  opakovano: number;
  neurcite: number;
  zruseno: number;
}

/**
 * Obnova uvíznuté práce (kroky 5.7 a 5.8). Opakuje se **jen** tělo, které už
 * existuje, jen v okně idempotence a jen když platnost zprávy trvá.
 */
export async function obnovUviznute(kdy = new Date()): Promise<VysledekObnovy> {
  const vysledek: VysledekObnovy = { dokonceno: 0, opakovano: 0, neurcite: 0, zruseno: 0 };
  const davky = await vTransakci((s) => najdiUviznuteDavky(s, kdy));

  for (const d of davky) {
    if (d.stav === 'pripravena') {
      // Pád mezi transakcí A a B: dávku zrušíme a položky se vrátí do fronty.
      const zruseno = await vTransakci((s) => zrusPripravenouDavku(s, d.id, d.pokus));
      if (zruseno) vysledek.zruseno += 1;
      continue;
    }
    if (d.chybi_vysledky === 0) {
      const uzavreno = await vTransakci((s) => uzavriDavku(s, d.id, d.pokus, 'odeslana'));
      if (uzavreno) vysledek.dokonceno += 1;
      continue;
    }
    const platnost = await vTransakci((s) => jeZpravaPlatna(s, d.zprava, otiskKalendare(), kdy));
    if (!smiSeOpakovat(d, kdy) || !platnost.platna || d.telo.length === 0) {
      await vTransakci(async (s) => {
        await uzavriDavku(s, d.id, d.pokus, 'neurcita');
        await s.dotaz(
          `update polozka_odeslani set stav = 'neurcita' where davka_id = $1 and stav = 'predavana'`,
          [d.id],
        );
      });
      vysledek.neurcite += 1;
      continue;
    }
    // Opakování může být první skutečné odeslání. Když spadá do jiného období
    // než původní rezervace, musí mít kapacitu i tam; starou rezervaci
    // neuvolňujeme, protože o jejím odeslání nic nevíme.
    const pocet = await vTransakci(async (s) => {
      const v = await s.dotaz<{ pocet: number }>(
        `select count(*)::int as pocet from polozka_odeslani where davka_id = $1`,
        [d.id],
      );
      return v.rows[0]?.pocet ?? 0;
    });
    const kryti = await vTransakci((s) => rezervujKvotu(s, d.id, d.pokus, pocet, 'obsah', kdy)).catch(
      () => false,
    );
    if (!kryti) {
      await vTransakci(async (s) => {
        await uzavriDavku(s, d.id, d.pokus, 'neurcita');
        await s.dotaz(
          `update polozka_odeslani set stav = 'neurcita' where davka_id = $1 and stav = 'predavana'`,
          [d.id],
        );
      });
      vysledek.neurcite += 1;
      continue;
    }

    const odpoved = await odesliDavku(d.telo, d.idempotency_key);
    if (odpoved.ok) {
      await vTransakci(async (s) => {
        await uzavriDavku(s, d.id, d.pokus, 'odeslana');
        const polozky = await s.dotaz<{ id: string }>(
          `select id from polozka_odeslani where davka_id = $1 order by vlozeno`,
          [d.id],
        );
        for (let i = 0; i < polozky.rows.length; i += 1) {
          await zapisVysledekPolozky(s, polozky.rows[i].id, odpoved.idEmailu[i] ?? null, 'sent');
        }
      });
      vysledek.opakovano += 1;
    }
  }
  return vysledek;
}

/**
 * Dožene účinky webhooků, které se zapsaly, ale nedoběhly (pád mezi commitem
 * a zrušením odběru). Bez toho by nedoručitelná adresa zůstala v odběru.
 */
export async function dokonciUcinkyWebhooku(): Promise<number> {
  const nedokoncene = await vTransakci((s) => najdiNedokonceneUcinky(s, 50));
  let hotovo = 0;
  for (const u of nedokoncene) {
    // Adresu v tabulce nemáme (ukládá se jen otisk), zrušíme proto odběr podle
    // otisku: identitu najdeme přes doklady a položky se stejným otiskem.
    await vTransakci(async (s) => {
      await s.dotaz(
        `delete from odber_novinek
          where odberatel_id in (
            select p.odberatel_id from polozka_odeslani p
             where p.adresat_otisk = $1 and p.odberatel_id is not null)`,
        [u.email_otisk],
      );
      await s.dotaz(`update webhook_udalost set ucinek_hotov = now() where event_id = $1`, [
        u.event_id,
      ]);
    });
    hotovo += 1;
  }
  return hotovo;
}

/** Denní úklid těl dávek a nevypořádaných rezervací uzavřených dávek. */
export async function uklidOdesilace(kdy = new Date()): Promise<{ tela: number; rezervace: number }> {
  return vTransakci(async (s) => {
    const tela = await umazTelaDavek(s, kdy);
    const nevyporadane = await s.dotaz<{ davka_id: string; pokus: number }>(
      `select distinct r.davka_id, r.pokus
         from rezervace_kvoty r join davka d on d.id = r.davka_id
        where r.vyporadano is null and d.stav in ('odeslana', 'chyba', 'zrusena', 'neurcita')`,
    );
    let rezervace = 0;
    for (const r of nevyporadane.rows) {
      rezervace += await vyporadejRezervace(s, r.davka_id, r.pokus);
    }
    return { tela, rezervace };
  });
}

/**
 * Založí řádek rozpočtu, když ještě neexistuje. **Existující limit nepřepisuje**:
 * snížení limitu na nulu je pojistka, kterou má člověk k ruce, aby plošné
 * zprávy pozastavil, zatímco odkazy portálu běží dál. Kdyby ho cron přepsal,
 * pojistka by po dvanácti hodinách zmizela.
 */
export async function zajistiRozpocet(obdobi: string, ucel: string, limit: number): Promise<void> {
  await dotaz(
    `insert into rozpocet_emailu (obdobi, ucel, limit_pocet) values ($1, $2, $3)
     on conflict (obdobi, ucel) do nothing`,
    [obdobi, ucel, limit],
  );
}

