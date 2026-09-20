// ============================================================================
// Podklady pro administraci školních novinek z RSS.
//
// Rozdíl proti `skolni-novinky.ts`: čtecí vrstva pro veřejný web ukazuje jen
// to, co projde publikačním rozhodnutím, a to schválně – rodič nemá číst, co
// si systém o zprávě myslí. Administrace potřebuje pravý opak: **co přišlo ze
// zdroje a co jsme z toho vydedukovali**, včetně položek, které se nikde
// nezobrazují, a včetně důvodu, proč se nezobrazují.
//
// Proto se tu nefiltruje podle platnosti ani podle přepínačů. Zneplatněné
// položky se ukazují taky, jen označené – zmizení z administrace by zakrylo
// právě ten případ, kvůli kterému se sem člověk dívá.
//
// Návrh: docs/skolske-novinky-rss-2027.md, oddíl 3.7.
// ============================================================================
import { dotaz, jeDbNastavena } from '@/lib/novinky-db';

export interface SouhrnNovinek {
  /** Zdroje v registru a jejich stav. */
  zdrojuCelkem: number;
  zdrojuOk: number;
  zdrojuSChybou: number;
  /** Položky bez ohledu na platnost. */
  polozekCelkem: number;
  polozekPlatnych: number;
  polozek7dni: number;
  polozekZneplatnenych: number;
  posledniSklizen: string | null;
}

export interface RozpadRadek {
  klic: string;
  pocet: number;
}

export interface BehSklizne {
  zahajeno: string;
  dokonceno: string | null;
  zdrojuZkouseno: number;
  zdrojuOk: number;
  polozekNovych: number;
  polozekZmenenych: number;
  verzePravidel: string | null;
  chyba: string | null;
}

export interface ChybnyZdroj {
  redizo: string;
  feedUrl: string;
  /** Odkud se adresa feedu vzala: `deklarovany` z hlavičky webu, jinak odhad. */
  zdroj: string;
  chybyVRade: number;
  posledniChyba: string | null;
  naposledyOk: string | null;
}

export interface Prepinac {
  klic: string;
  hodnota: unknown;
  zmeneno: string;
  zdrojZmeny: string;
  duvod: string | null;
}

export interface PolozkaProAdmin {
  id: string;
  redizo: string;
  titulek: string;
  url: string;
  publikovano: string | null;
  /** Co jsme vydedukovali. */
  tridy: string[];
  jistota: Record<string, unknown>;
  stav: string | null;
  zobrazeni: string;
  zpusobilyEmail: boolean;
  duvod: string | null;
  terminy: string[];
  konecPlatnosti: string | null;
  verzePravidel: string;
  zneplatneno: string | null;
  /** Kolikrát se obsah položky od prvního uložení změnil. */
  verzi: number;
}

const naPole = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const naIso = (v: Date | string | null): string | null => (v === null ? null : v instanceof Date ? v.toISOString() : v);

export async function souhrnNovinek(): Promise<SouhrnNovinek | null> {
  if (!jeDbNastavena()) return null;
  const zdroje = await dotaz<{ celkem: number; ok: number; s_chybou: number }>(
    `select count(*)::int as celkem,
            count(*) filter (where chyby_v_rade = 0 and naposledy_ok is not null)::int as ok,
            count(*) filter (where chyby_v_rade > 0)::int as s_chybou
       from skola_feed where aktivni`,
  );
  const polozky = await dotaz<{ celkem: number; platnych: number; dnu7: number; zneplatnenych: number }>(
    `select count(*)::int as celkem,
            count(*) filter (where zneplatneno is null
                               and (konec_platnosti is null or konec_platnosti > now()))::int as platnych,
            count(*) filter (where publikovano > now() - interval '7 days')::int as dnu7,
            count(*) filter (where zneplatneno is not null)::int as zneplatnenych
       from skola_novinka`,
  );
  const beh = await dotaz<{ zahajeno: Date | string }>(
    `select zahajeno from sklizen_beh order by zahajeno desc limit 1`,
  );
  return {
    zdrojuCelkem: zdroje.rows[0]?.celkem ?? 0,
    zdrojuOk: zdroje.rows[0]?.ok ?? 0,
    zdrojuSChybou: zdroje.rows[0]?.s_chybou ?? 0,
    polozekCelkem: polozky.rows[0]?.celkem ?? 0,
    polozekPlatnych: polozky.rows[0]?.platnych ?? 0,
    polozek7dni: polozky.rows[0]?.dnu7 ?? 0,
    polozekZneplatnenych: polozky.rows[0]?.zneplatnenych ?? 0,
    posledniSklizen: naIso(beh.rows[0]?.zahajeno ?? null),
  };
}

/** Rozpad podle publikačního rozhodnutí: co se kde na webu objeví. */
export async function rozpadPodleZobrazeni(): Promise<RozpadRadek[]> {
  const { rows } = await dotaz<RozpadRadek>(
    `select zobrazeni as klic, count(*)::int as pocet from skola_novinka
      where zneplatneno is null group by zobrazeni order by pocet desc`,
  );
  return rows;
}

/** Rozpad podle třídy zprávy. Položka může nést víc tříd, součet proto přesáhne počet položek. */
export async function rozpadPodleTridy(): Promise<RozpadRadek[]> {
  const { rows } = await dotaz<RozpadRadek>(
    `select trida as klic, count(*)::int as pocet
       from skola_novinka, jsonb_array_elements_text(tridy) as trida
      where zneplatneno is null group by trida order by pocet desc`,
  );
  return rows;
}

/** Rozpad podle stavu sdělení (oznámeno, zrušeno, přesunuto…). */
export async function rozpadPodleStavu(): Promise<RozpadRadek[]> {
  const { rows } = await dotaz<RozpadRadek>(
    `select coalesce(stav, '–') as klic, count(*)::int as pocet from skola_novinka
      where zneplatneno is null group by stav order by pocet desc`,
  );
  return rows;
}

export async function posledniBehy(limit = 10): Promise<BehSklizne[]> {
  const { rows } = await dotaz<{
    zahajeno: Date | string; dokonceno: Date | string | null;
    zdroju_zkouseno: number; zdroju_ok: number; polozek_novych: number; polozek_zmenenych: number;
    verze_pravidel: string | null; chyba: string | null;
  }>(
    `select zahajeno, dokonceno, zdroju_zkouseno, zdroju_ok, polozek_novych, polozek_zmenenych,
            verze_pravidel, chyba
       from sklizen_beh order by zahajeno desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    zahajeno: naIso(r.zahajeno)!,
    dokonceno: naIso(r.dokonceno),
    zdrojuZkouseno: r.zdroju_zkouseno,
    zdrojuOk: r.zdroju_ok,
    polozekNovych: r.polozek_novych,
    polozekZmenenych: r.polozek_zmenenych,
    verzePravidel: r.verze_pravidel,
    chyba: r.chyba,
  }));
}

/** Zdroje, které naposledy neodpověděly. Řadí se podle délky výpadku, ne podle abecedy. */
export async function chybneZdroje(limit = 50): Promise<ChybnyZdroj[]> {
  const { rows } = await dotaz<{
    redizo: string; feed_url: string; zdroj: string; chyby_v_rade: number;
    posledni_chyba: string | null; naposledy_ok: Date | string | null;
  }>(
    `select redizo, feed_url, zdroj, chyby_v_rade, posledni_chyba, naposledy_ok
       from skola_feed
      where aktivni and chyby_v_rade > 0
      order by chyby_v_rade desc, naposledy_ok asc nulls first
      limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    redizo: r.redizo,
    feedUrl: r.feed_url,
    zdroj: r.zdroj,
    chybyVRade: r.chyby_v_rade,
    posledniChyba: r.posledni_chyba,
    naposledyOk: naIso(r.naposledy_ok),
  }));
}

/**
 * Zapnuté provozní přepínače.
 *
 * Patří sem proto, že bez nich se nedá odpovědět na otázku „proč se tahle
 * položka nezobrazuje": vypnutý zdroj, skrytá položka nebo vypnuté
 * zvýrazňování třídy nejsou v položce vidět (oddíl 3.7).
 */
export async function prepinace(): Promise<Prepinac[]> {
  const { rows } = await dotaz<{
    klic: string; hodnota: unknown; zmeneno: Date | string; zdroj_zmeny: string; duvod: string | null;
  }>(`select klic, hodnota, zmeneno, zdroj_zmeny, duvod from skola_prepinac order by zmeneno desc`);
  return rows.map((r) => ({
    klic: r.klic,
    hodnota: r.hodnota,
    zmeneno: naIso(r.zmeneno)!,
    zdrojZmeny: r.zdroj_zmeny,
    duvod: r.duvod,
  }));
}

export interface FiltrPolozek {
  /** Jedna hodnota `zobrazeni`, nebo prázdno pro vše. */
  zobrazeni?: string;
  /** Jedna třída zprávy. */
  trida?: string;
  /** REDIZO jedné školy. */
  redizo?: string;
  limit?: number;
}

/**
 * Položky se vším, co se z nich vydedukovalo.
 *
 * Neplatné ani zneplatněné se nevynechávají: administrace má ukázat i to, co
 * se na web nedostalo, jinak se nedá zjistit proč.
 */
export async function polozkyProAdmin(filtr: FiltrPolozek = {}): Promise<PolozkaProAdmin[]> {
  const podminky: string[] = [];
  const parametry: unknown[] = [];
  if (filtr.zobrazeni) {
    parametry.push(filtr.zobrazeni);
    podminky.push(`n.zobrazeni = $${parametry.length}`);
  }
  if (filtr.trida) {
    parametry.push(filtr.trida);
    podminky.push(`n.tridy ? $${parametry.length}`);
  }
  if (filtr.redizo) {
    parametry.push(filtr.redizo);
    podminky.push(`n.redizo = $${parametry.length}`);
  }
  parametry.push(filtr.limit ?? 100);
  const { rows } = await dotaz<{
    id: string; redizo: string; titulek: string; url: string;
    publikovano: Date | string | null; tridy: unknown; jistota: unknown; stav: string | null;
    zobrazeni: string; zpusobily_email: boolean; duvod: string | null; terminy: unknown;
    konec_platnosti: Date | string | null; verze_pravidel: string;
    zneplatneno: Date | string | null; verzi: number;
  }>(
    `select n.id, n.redizo, n.titulek, n.url, n.publikovano, n.tridy, n.jistota, n.stav,
            n.zobrazeni, n.zpusobily_email, n.duvod, n.terminy, n.konec_platnosti,
            n.verze_pravidel, n.zneplatneno,
            (select count(*)::int from skola_novinka_verze v where v.novinka_id = n.id) as verzi
       from skola_novinka n
       ${podminky.length ? `where ${podminky.join(' and ')}` : ''}
      order by n.publikovano desc nulls last, n.vytvoreno desc
      limit $${parametry.length}`,
    parametry,
  );
  return rows.map((r) => ({
    id: r.id,
    redizo: r.redizo,
    titulek: r.titulek,
    url: r.url,
    publikovano: naIso(r.publikovano),
    tridy: naPole(r.tridy),
    jistota: (r.jistota && typeof r.jistota === 'object' ? r.jistota : {}) as Record<string, unknown>,
    stav: r.stav,
    zobrazeni: r.zobrazeni,
    zpusobilyEmail: r.zpusobily_email,
    duvod: r.duvod,
    terminy: naPole(r.terminy),
    konecPlatnosti: naIso(r.konec_platnosti),
    verzePravidel: r.verze_pravidel,
    zneplatneno: naIso(r.zneplatneno),
    verzi: r.verzi,
  }));
}
