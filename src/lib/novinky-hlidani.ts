import type { Spojeni } from './novinky-db.ts';
import type { Polozka } from './novinky-fronta.ts';
import { obalka, sestavTeloDavky } from './novinky-email.ts';
import { odhlasovaciOdkaz, otisk, noveId, vytvorToken, SPRAVA_PLATNOST_MS } from './novinky-token.ts';
import { PREDPONA_ZPRAVY_HLIDANI } from './novinky-odber.ts';
import type { NazevSkoly } from './novinky-odber.ts';
import { slozSouhrn, ZAKLAD_ODKAZU } from './hlidani-souhrn.ts';
import type { RadekUdalosti, SouhrnHlidani } from './hlidani-souhrn.ts';

// ============================================================================
// Denní odesílač hlídání škol (docs/sledovani-skol-2027.md, oddíl 3;
// zadání #523, E5).
//
// Jednou denně dostane odběratel, který hlídá školy, **jeden** souhrn událostí
// od posledního odeslání, které se týkají jeho škol. V den bez události nic.
// Souhrn jde stejnou frontou, dávkami a z téhož rozpočtu jako ostatní zprávy
// novinek; liší se jen zprávou `hlidani-RRRR-MM-DD` a podmínkou odesílatele
// (aspoň jedna hlídaná škola, ne odběr termínů).
//
// Orchestraci běhu (verze zprávy, dávky, odeslání) drží `zpracujHlidani`
// v novinky-odesilac.ts; tady je jen to, co jde testovat nad databází bez sítě.
//
// Okno událostí pro odběratele: od odeslání předchozího souhrnu (přesněji od
// vložení jeho položky) do vložení dnešní položky, a jen události po potvrzení
// hlídání dané školy. Souhrn, který se neodeslal, události nespotřebuje.
// ============================================================================

/** Zpráva dne, pod kterou se souhrny zapisují do evidence odeslání. */
export function zpravaHlidani(den: string): string {
  return `${PREDPONA_ZPRAVY_HLIDANI}${den}`;
}

/**
 * Pojistka proti souběhu: `publikovano` je čas začátku transakce, ne commitu.
 * Událost, jejíž transakce skončí až po sestavení souhrnu, by jinak mohla
 * vypadnout z okna navždy. Obě meze okna se proto posouvají o stejný odstup:
 * událost mladší než odstup počká v dalším souhrnu a okna na sebe navazují
 * bez mezery i bez překryvu.
 */
export const POJISTKA_SOUBEHU_S = 3600;

interface RadekOkna extends RadekUdalosti {
  odberatelId: string;
}

/**
 * Události v okně pro odběratele. Horní mez je vložení dnešní položky, má-li ji
 * odběratel (opakovaný běh téhož dne tak složí totéž), jinak `horniMez`.
 */
export async function udalostiVOkne(
  s: Spojeni,
  zprava: string,
  horniMez: Date,
  odberatele: string[] | null,
): Promise<RadekOkna[]> {
  const v = await s.dotaz<{
    odberatel_id: string;
    udalost_id: string;
    typ: string;
    veta: string;
    odkaz: string | null;
    redizo: string;
  }>(
    `select os.odberatel_id, ud.id as udalost_id, ud.typ, ud.veta, ud.odkaz, us.redizo
       from odber_skoly os
       join udalost_skola us on us.redizo = os.redizo
       join udalost ud on ud.id = us.udalost_id
      where ud.publikovano > os.potvrzeno
        and ud.publikovano <= coalesce(
              (select d.vlozeno from polozka_odeslani d
                where d.odberatel_id = os.odberatel_id and d.zprava = $1), $2::timestamptz)
              - interval '${POJISTKA_SOUBEHU_S} seconds'
        and ud.publikovano > coalesce(
              (select max(p.vlozeno) from polozka_odeslani p
                where p.odberatel_id = os.odberatel_id and p.zprava like 'hlidani-%'
                  and p.zprava <> $1 and p.stav = 'odeslana'), '-infinity'::timestamptz)
              - interval '${POJISTKA_SOUBEHU_S} seconds'
        and ($3::uuid[] is null or os.odberatel_id = any($3::uuid[]))
      order by os.odberatel_id, ud.publikovano, ud.id, us.redizo`,
    [zprava, horniMez.toISOString(), odberatele],
  );
  return v.rows.map((r) => ({
    odberatelId: r.odberatel_id,
    udalostId: r.udalost_id,
    typ: r.typ,
    veta: r.veta,
    odkaz: r.odkaz,
    redizo: r.redizo,
  }));
}

/**
 * Založí dnešní položky: jednu každému odběrateli, který má v okně aspoň
 * jednu událost. Opakovaný běh nic nezdvojí (jedinečný index odběratel + zpráva).
 */
export async function naplnFrontuHlidani(s: Spojeni, zprava: string, kdy: Date): Promise<number> {
  const radky = await udalostiVOkne(s, zprava, kdy, null);
  const ids = [...new Set(radky.map((r) => r.odberatelId))];
  if (ids.length === 0) return 0;
  const adresy = await s.dotaz<{ id: string; email: string }>(
    `select id, email from odberatel where id = any($1::uuid[])`,
    [ids],
  );
  let pridano = 0;
  for (const a of adresy.rows) {
    const v = await s.dotaz(
      `insert into polozka_odeslani (id, zprava, ucel, odberatel_id, adresat_otisk, stav, vlozeno)
       values ($1, $2, 'obsah', $3, $4, 'ceka', $5)
       on conflict do nothing`,
      [noveId(), zprava, a.id, otisk(`email:${a.email}`), kdy.toISOString()],
    );
    pridano += v.rowCount;
  }
  return pridano;
}

export interface SouhrnOdberatele {
  souhrn: SouhrnHlidani;
  /** Kolik škol odběratel hlídá celkem (do patičky). */
  hlidanych: number;
}

/**
 * Souhrny pro čekající položky zprávy. Odběratel, který v okně už nic nemá
 * (zrušil školu po zařazení do fronty), mezi souhrny není a jeho položka se
 * zahodí dřív, než se sestaví dávka.
 */
export async function sestavSouhrny(
  s: Spojeni,
  zprava: string,
  kdy: Date,
  nazevSkoly: NazevSkoly,
): Promise<Map<string, SouhrnOdberatele>> {
  const cekajici = await s.dotaz<{ odberatel_id: string }>(
    `select odberatel_id from polozka_odeslani
      where zprava = $1 and stav = 'ceka' and odberatel_id is not null`,
    [zprava],
  );
  const ids = cekajici.rows.map((r) => r.odberatel_id);
  const vysledek = new Map<string, SouhrnOdberatele>();
  if (ids.length === 0) return vysledek;

  const radky = await udalostiVOkne(s, zprava, kdy, ids);
  const podleOdberatele = new Map<string, RadekOkna[]>();
  for (const r of radky) {
    const sada = podleOdberatele.get(r.odberatelId) ?? [];
    sada.push(r);
    podleOdberatele.set(r.odberatelId, sada);
  }

  const pocty = await s.dotaz<{ odberatel_id: string; pocet: number }>(
    `select odberatel_id, count(*)::int as pocet from odber_skoly
      where odberatel_id = any($1::uuid[]) group by odberatel_id`,
    [ids],
  );
  const hlidanych = new Map(pocty.rows.map((r) => [r.odberatel_id, r.pocet]));

  const nazvy = new Map<string, string>();
  for (const r of radky) {
    if (nazvy.has(r.redizo)) continue;
    const n = await nazevSkoly(r.redizo).catch(() => null);
    if (n) nazvy.set(r.redizo, n);
  }

  for (const [odberatelId, sada] of podleOdberatele) {
    const redizaSkol = [...new Set(sada.map((r) => r.redizo))];
    const souhrn = slozSouhrn(
      sada,
      redizaSkol.map((redizo) => ({ redizo, nazev: nazvy.get(redizo) ?? `Škola ${redizo}` })),
    );
    if (souhrn) vysledek.set(odberatelId, { souhrn, hlidanych: hlidanych.get(odberatelId) ?? 0 });
  }
  return vysledek;
}

function skolStr(n: number): string {
  if (n === 1) return '1 školu';
  if (n >= 2 && n <= 4) return `${n} školy`;
  return `${n} škol`;
}

/** Tělo dávky: každý odběratel dostane vlastní souhrn a vlastní odkazy na správu a odhlášení. */
export function teloHlidani(polozky: Polozka[], souhrny: Map<string, SouhrnOdberatele>): string {
  return sestavTeloDavky(
    polozky.flatMap((p) => {
      const s = p.odberatel_id ? souhrny.get(p.odberatel_id) : undefined;
      if (!s) return [];
      const token = vytvorToken(p.id, SPRAVA_PLATNOST_MS);
      const sprava = `${ZAKLAD_ODKAZU}/api/novinky/sprava?t=${encodeURIComponent(token)}`;
      const odhlaseni = odhlasovaciOdkaz(token);
      const radekPaticky = `Hlídáte ${skolStr(s.hlidanych)}`;
      return [
        {
          polozkaId: p.id,
          email: p.email,
          predmet: s.souhrn.predmet,
          html: obalka(
            s.souhrn.html,
            `${radekPaticky} · <a href="${sprava}" style="color:#0074e4;">Upravit hlídané školy</a> · <a href="${odhlaseni}" style="color:#0074e4;">Přestat hlídat</a>`,
          ),
          text: `${s.souhrn.text}\n\n${radekPaticky}\nUpravit hlídané školy: ${sprava}\nPřestat hlídat: ${odhlaseni}`,
          odhlasovaciToken: token,
        },
      ];
    }),
  );
}
