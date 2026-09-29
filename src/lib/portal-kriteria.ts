import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Spojeni } from './novinky-db.ts';
import { ocekavaneObdobi, zobrazeneObdobi } from './stav-datovych-sad.ts';
import type { DolozenePravidlo } from './kriteria-stav.ts';
import {
  overStrukturu, poznamkaZPrepisu, souhrnBodovani, strukturaZPrepisu,
  type PrepisProPredvyplneni, type StrukturaKriterii,
} from './kriteria-struktura.ts';

/** Klíč oboru vzniká z identifikace školy, oboru, formy a délky, nikoli z UUID kola. */
export interface OborProKriteria {
  klic: string;
  redizo: string;
  nazev: string;
  zamereni: string;
  kkov: string;
  podkladRok: number;
  zdrojId: string;
  zdrojKolo: number;
  zdrojTyp: 'katalog' | 'dipsy';
  konaJPZ: boolean | null;
  izo: string;
  forma: string;
  delkaStudia: number;
}

export type IdentitaOboruKriterii = Pick<OborProKriteria,
  'redizo' | 'izo' | 'kkov' | 'zamereni' | 'forma' | 'delkaStudia' | 'zdrojId' | 'podkladRok'>;

/** Export pro scripts/dipsy-shoda-kliku.mjs — měření shody klíčů s DiPSy musí počítat stejným klíčem jako portál. */
export function klicOboru(redizo: string, izo: string, kkov: string, zamereni: string, forma: string, delka: number): string {
  const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs-CZ');
  const raw = [redizo, izo.replace(/\D/g, ''), norm(kkov), norm(zamereni), norm(forma).replace('formastudia/', ''), delka];
  return createHash('sha256').update(JSON.stringify(raw)).digest('hex');
}

interface SouborNabidek {
  meta: { rok: number; kolo: number };
  data: Array<{ id: string; source_id: string; redizo: string; izo: string; obor: string; zamereni?: string; kkov: string; forma: string; delka_studia: number }>;
}

interface DipsyNabidka {
  id: string;
  skolniRok: number;
  kolo: number;
  zamereni?: string;
  konaJPZ?: boolean;
  skolniObor?: { kod: string; nazev: string; formaStudia: string; delkaStudia: number };
  skola?: { izo: string };
  reditelstviSkoly?: { redizo: string };
}

export function mapujDipsyNabidky(cards: DipsyNabidka[], redizo: string, rok: number): OborProKriteria[] {
  return cards.filter((c) => c && c.skolniRok === rok && Number.isInteger(c.kolo) && c.kolo >= 1 && c.reditelstviSkoly?.redizo === redizo &&
    typeof c.skolniObor?.kod === 'string' && typeof c.skolniObor?.formaStudia === 'string' && Number.isInteger(c.skolniObor?.delkaStudia) &&
    typeof c.skola?.izo === 'string').map((c) => ({
    klic: klicOboru(redizo, c.skola!.izo, c.skolniObor!.kod, c.zamereni ?? '', c.skolniObor!.formaStudia, c.skolniObor!.delkaStudia),
    redizo,
    nazev: c.skolniObor!.nazev,
    zamereni: c.zamereni ?? '',
    kkov: c.skolniObor!.kod,
    podkladRok: rok,
    zdrojId: c.id,
    zdrojKolo: c.kolo,
    zdrojTyp: 'dipsy',
    konaJPZ: typeof c.konaJPZ === 'boolean' ? c.konaJPZ : null,
    izo: c.skola!.izo,
    forma: c.skolniObor!.formaStudia,
    delkaStudia: c.skolniObor!.delkaStudia,
  }));
}

async function nactiDipsyNabidky(redizo: string, rok: number): Promise<OborProKriteria[]> {
  try {
    const cards = await Promise.all([1, 2, 3].map(async (kolo) => {
      try {
        const url = new URL(`https://api.dipsy.gov.cz/v1/skol-oboro-forma/kolo/${kolo}/search/`);
        url.searchParams.set('keywords', redizo);
        url.searchParams.set('skolniRok', String(rok));
        const response = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
        if (!response.ok) return [];
        const body = await response.json() as { data?: DipsyNabidka[]; meta?: { totalCount?: number } };
        if (!Array.isArray(body.data)) return [];
        if (typeof body.meta?.totalCount === 'number' && body.meta.totalCount !== body.data.length) {
          console.error(`Portál: neúplný seznam DiPSy pro rok ${rok}, kolo ${kolo}, REDIZO ${redizo}`);
          return [];
        }
        return body.data;
      } catch (error) {
        console.error(`Portál: DiPSy pro rok ${rok}, kolo ${kolo} a školu nejde načíst`, error);
        return [];
      }
    }));
    return mapujDipsyNabidky(cards.flat(), redizo, rok);
  } catch (error) {
    console.error(`Portál: DiPSy nabídky ${rok} pro školu nejdou načíst`, error);
    return [];
  }
}

// Katalog nabídek se za běhu instance nemění; chybějící soubor se zkusí znovu.
const cacheNabidek = new Map<number, Promise<SouborNabidek | null>>();

async function nactiNabidkySoubor(rok: number): Promise<SouborNabidek | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', `applications_${rok}.json`), 'utf8');
    const data = JSON.parse(raw) as SouborNabidek;
    if (data.meta.rok !== rok || data.meta.kolo !== 1 || !Array.isArray(data.data)) return null;
    return data;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

function nactiNabidky(rok: number): Promise<SouborNabidek | null> {
  let slib = cacheNabidek.get(rok);
  if (!slib) {
    // Chybějící soubor (nový ročník ještě nevyšel) se neukládá, ať se objeví po nasazení.
    slib = nactiNabidkySoubor(rok).then((d) => { if (!d) cacheNabidek.delete(rok); return d; },
      (error) => { cacheNabidek.delete(rok); throw error; });
    cacheNabidek.set(rok, slib);
  }
  return slib;
}

/** Nový ročník před vydáním nabídky může použít obory předchozího roku jako plánované. */
export async function oboryProKriteria(redizo: string, rok: number, { online = true } = {}): Promise<OborProKriteria[]> {
  const aktualni = await nactiNabidky(rok);
  const podklad = aktualni ?? await nactiNabidky(rok - 1);
  const obory: OborProKriteria[] = (podklad?.data ?? []).filter((r) => r.redizo === redizo).map((r) => ({
    klic: klicOboru(redizo, r.izo, r.kkov, r.zamereni ?? '', r.forma, r.delka_studia),
    redizo: r.redizo,
    nazev: r.obor,
    zamereni: r.zamereni ?? '',
    kkov: r.kkov,
    podkladRok: podklad!.meta.rok,
    zdrojId: r.source_id,
    zdrojKolo: 1,
    zdrojTyp: 'katalog',
    // Katalog CERMATu nese i nabídky bez JPZ; bez karty DiPSy to nevíme.
    konaJPZ: null,
    izo: r.izo,
    forma: r.forma,
    delkaStudia: r.delka_studia,
  }));
  const dipsy = online ? await nactiDipsyNabidky(redizo, rok) : [];
  // Aktuální karta DiPSy má přednost před plánovanou nabídkou z loňska.
  // Pro společný obor se použije nejnižší dostupné kolo jako popis nabídky.
  const merged = new Map<string, OborProKriteria>(obory.map((o) => [o.klic, o]));
  for (const o of [...dipsy].sort((a, b) => b.zdrojKolo - a.zdrojKolo)) merged.set(o.klic, o);
  // Dvě různé nabídky téhož oboru ve stejném kole neslučujeme automaticky.
  const pocty = new Map<string, number>();
  for (const obor of dipsy) {
    const key = `${obor.klic}:${obor.zdrojKolo}`;
    pocty.set(key, (pocty.get(key) ?? 0) + 1);
  }
  const nejednoznacne = new Set([...pocty].filter(([, count]) => count > 1).map(([key]) => key.slice(0, 64)));
  return [...merged.values()].filter((o) => !nejednoznacne.has(o.klic));
}

/**
 * Ročníky, pro které škola zadává kritéria: očekávané období sady `dipsy-kriteria`
 * (nové řízení) a zobrazené období (oprava minulého). Nejnovější první.
 */
export async function rokyKriterii(): Promise<{ roky: number[]; rokPrepisu: number | null }> {
  const [zobrazeno, ocekavano] = await Promise.all([zobrazeneObdobi('dipsy-kriteria'), ocekavaneObdobi('dipsy-kriteria')]);
  const rokPrepisu = zobrazeno ? Number(zobrazeno) : null;
  const roky = [...new Set([ocekavano, zobrazeno].filter(Boolean).map(Number))].sort((a, b) => b - a);
  return { roky, rokPrepisu };
}

export type RezimKriterii = 'pouze_jpz' | 'jine';

export interface KriteriaSkoly {
  id: string;
  redizo: string;
  obor_klic: string;
  rok: number;
  kolo: number | null;
  rezim: RezimKriterii;
  popis: string;
  odkaz: string;
  podklad_rok: number;
  obor_identita: IdentitaOboruKriterii | null;
  /** Strukturované bodování; null u záznamů z doby před strukturou. */
  struktura: StrukturaKriterii | null;
  platne_od: string;
}

export interface ZadaniKriterii {
  redizo: string;
  oborKlic: string;
  rok: number;
  kolo: number | null;
  rezim: RezimKriterii;
  popis: string;
  odkaz: string;
  podkladRok: number;
  struktura: StrukturaKriterii;
  oborIdentita: IdentitaOboruKriterii;
  roleId: string;
  ocekavaneId: string | null;
}

/**
 * Ověří zadání z formuláře. Povolené ročníky určuje volající z registru
 * (sada `dipsy-kriteria`: zobrazené a očekávané období), ne kód.
 * Režim se odvozuje ze struktury, aby „jen JPZ“ nešlo tvrdit vedle dalších bodů.
 */
export function overZadani(raw: Record<string, unknown>, povoleneRoky: number[]):
  | { ok: true; value: Pick<ZadaniKriterii, 'oborKlic' | 'rok' | 'kolo' | 'rezim' | 'popis' | 'odkaz' | 'ocekavaneId' | 'struktura'> }
  | { ok: false; error: string } {
  const oborKlic = typeof raw.oborKlic === 'string' ? raw.oborKlic : '';
  const rok = raw.rok;
  const kolo = raw.kolo;
  const popis = typeof raw.popis === 'string' ? raw.popis.trim() : '';
  const odkaz = typeof raw.odkaz === 'string' ? raw.odkaz.trim() : '';
  const ocekavaneId = raw.ocekavaneId;
  if (!oborKlic || oborKlic.length > 300 || typeof rok !== 'number' || !povoleneRoky.includes(rok))
    return { ok: false, error: `Vyberte obor a ročník ${povoleneRoky.join(' nebo ')}.` };
  if (kolo !== null && (!Number.isInteger(kolo) || Number(kolo) < 1 || Number(kolo) > 3))
    return { ok: false, error: 'Vyberte všechna kola nebo konkrétní kolo 1–3.' };
  let struktura: StrukturaKriterii;
  try { struktura = overStrukturu(raw.struktura); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Neplatné bodování.' }; }
  const rezim: RezimKriterii = souhrnBodovani(struktura).jenJpz ? 'pouze_jpz' : 'jine';
  if (popis.length > 3000)
    return { ok: false, error: 'Další pravidla a výjimky popište nejvýše 3000 znaky.' };
  if (odkaz.length > 500) return { ok: false, error: 'Odkaz může mít nejvýše 500 znaků.' };
  if (odkaz) {
    try {
      const url = new URL(odkaz);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch { return { ok: false, error: 'Odkaz na kritéria musí být platná adresa HTTP nebo HTTPS.' }; }
  }
  if (ocekavaneId !== null && (typeof ocekavaneId !== 'string' || !/^[\da-f-]{36}$/i.test(ocekavaneId)))
    return { ok: false, error: 'Otevřete formulář znovu a zopakujte změnu.' };
  return { ok: true, value: { oborKlic, rok, kolo: kolo as number | null, rezim, popis, odkaz, struktura, ocekavaneId: ocekavaneId as string | null } };
}

export async function kriteriaSkoly(s: Spojeni, redizo: string, rok: number): Promise<KriteriaSkoly[]> {
  const result = await s.dotaz<KriteriaSkoly>(
    `select id, redizo, obor_klic, rok, kolo, rezim, popis, odkaz, podklad_rok, obor_identita, struktura, platne_od
       from portal_kriteria where redizo = $1 and rok = $2 and zneplatneno is null order by poradi`,
    [redizo, rok],
  );
  return result.rows;
}

/** Poslední ověřené pozorování a příznak pozdější změny téhož zdroje. */
export async function overenePodkladyKriterii(s: Spojeni, redizo: string, roky: number[]): Promise<DolozenePravidlo[]> {
  type Radek = DolozenePravidlo & { zdrojId: string; stav: 'kandidat' | 'overeno' | 'rozpor'; obsahSha256: string | null };
  const result = await s.dotaz<Radek>(
    `select id, obor_klic as "oborKlic", rok, kolo, rezim, popis, zdroj,
            zdroj_url as "zdrojUrl", pozorovano_at as "zjistenoAt",
            publikovano_at as "publikovanoAt", overeno_at as "overenoAt",
            zdroj_id as "zdrojId", obsah_sha256 as "obsahSha256", stav
       from kriteria_podklad where redizo = $1 and rok = any($2::integer[])
       order by pozorovano_at desc, vytvoreno_at desc`,
    [redizo, roky],
  );
  const podleZdroje = new Map<string, Radek[]>();
  for (const row of result.rows) {
    const key = JSON.stringify([row.zdroj, row.zdrojId, row.oborKlic, row.rok, row.kolo]);
    const group = podleZdroje.get(key) ?? [];
    group.push(row);
    podleZdroje.set(key, group);
  }
  const pravidla: DolozenePravidlo[] = [];
  for (const group of podleZdroje.values()) {
    const overeny = group.find((row) => row.stav === 'overeno');
    if (!overeny || !overeny.rezim) continue;
    const posledni = group[0];
    const bezeZmeny = posledni.id === overeny.id ||
      (posledni.stav === 'kandidat' && posledni.obsahSha256 !== null && posledni.obsahSha256 === overeny.obsahSha256);
    const { zdrojId: _zdrojId, stav: _stav, obsahSha256: _hash, ...pravidlo } = overeny;
    void _zdrojId; void _stav; void _hash;
    pravidla.push({ ...pravidlo, novaVerzeAt: bezeZmeny ? null : posledni.zjistenoAt });
  }
  return pravidla;
}

/** Konkrétní kolo má přednost před záznamem platným pro všechna kola. */
export function vyberKriteria(zaznamy: KriteriaSkoly[], oborKlic: string, rok: number, kolo: number): KriteriaSkoly | null {
  const dane = zaznamy.filter((z) => z.obor_klic === oborKlic && z.rok === rok);
  return dane.find((z) => z.kolo === kolo) ?? dane.find((z) => z.kolo === null) ?? null;
}

/** Append-only zápis uvnitř transakce; starý formulář nepřepíše novější verzi. */
export async function zapisKriteria(s: Spojeni, z: ZadaniKriterii): Promise<KriteriaSkoly> {
  await s.dotaz(`select pg_advisory_xact_lock(hashtext($1)::bigint)`, [`portal_kriteria:${z.redizo}:${z.oborKlic}:${z.rok}:${z.kolo ?? 0}`]);
  const current = await s.dotaz<KriteriaSkoly>(
    `select id, redizo, obor_klic, rok, kolo, rezim, popis, odkaz, podklad_rok, obor_identita, struktura, platne_od
       from portal_kriteria where redizo = $1 and obor_klic = $2 and rok = $3
       and kolo is not distinct from $4 and zneplatneno is null`,
    [z.redizo, z.oborKlic, z.rok, z.kolo],
  );
  const previous = current.rows[0] ?? null;
  if ((previous?.id ?? null) !== z.ocekavaneId) throw new Error('Údaj se mezitím změnil. Otevřete formulář znovu.');
  if (previous) await s.dotaz(`update portal_kriteria set zneplatneno = clock_timestamp() where id = $1`, [previous.id]);
  const id = randomUUID();
  const result = await s.dotaz<KriteriaSkoly>(
    `insert into portal_kriteria
       (id, redizo, obor_klic, rok, kolo, rezim, popis, odkaz, podklad_rok, obor_identita, role_id, nahrazuje_id, struktura)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13::jsonb)
       returning id, redizo, obor_klic, rok, kolo, rezim, popis, odkaz, podklad_rok, obor_identita, struktura, platne_od`,
    [id, z.redizo, z.oborKlic, z.rok, z.kolo, z.rezim, z.popis, z.odkaz, z.podkladRok,
      JSON.stringify(z.oborIdentita), z.roleId, previous?.id ?? null, JSON.stringify(z.struktura)],
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Předvyplnění ze strojového přepisu PDF z DiPSy
// ---------------------------------------------------------------------------

export interface Predvyplneni {
  /** Rok kritérií, ze kterých přepis vznikl (registr, sada dipsy-kriteria). */
  rok: number;
  struktura: StrukturaKriterii;
  popis: string;
}

interface SouborPrepisu { rok: number; data: Record<string, { prepisy: (PrepisProPredvyplneni & { source_id: string })[] }> }
interface SouborPredvyplneni { data: Record<string, { jpz: PrepisProPredvyplneni['jpz']; rovnost: string[] }> }

async function nactiJson<T>(soubor: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', soubor), 'utf8')) as T; }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs-CZ');

/**
 * Předvyplnění pro obory školy z přepisu roku `rokPrepisu` (klíč oboru portálu → návrh).
 * Obor s více zaměřeními bere přepis svého zaměření; bez shody jen jediný přepis oboru.
 */
export async function predvyplneniZPrepisu(obory: OborProKriteria[], rokPrepisu: number): Promise<Record<string, Predvyplneni>> {
  const [prepis, doplnky] = await Promise.all([
    nactiJson<SouborPrepisu>(`kriteria_prijeti_${rokPrepisu}.json`),
    nactiJson<SouborPredvyplneni>(`kriteria_predvyplneni_${rokPrepisu}.json`),
  ]);
  if (!prepis) return {};
  const vysledek: Record<string, Predvyplneni> = {};
  for (const o of obory) {
    const prepisy = prepis.data[`${o.redizo}_${o.kkov}`]?.prepisy ?? [];
    const shoda = prepisy.filter((p) => norm(p.zamereni) === norm(o.zamereni));
    const p = shoda[0] ?? (prepisy.length === 1 ? prepisy[0] : undefined);
    if (!p) continue;
    const doplnek = doplnky?.data[p.source_id];
    const zdroj = { ...p, jpz: doplnek?.jpz ?? null, rovnost: doplnek?.rovnost ?? [] };
    vysledek[o.klic] = { rok: prepis.rok, struktura: strukturaZPrepisu(zdroj), popis: poznamkaZPrepisu(zdroj) };
  }
  return vysledek;
}
