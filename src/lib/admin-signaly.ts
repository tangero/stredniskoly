// ============================================================================
// Týdenní souhrn signálů v přehledu provozu (#528, /admin/provoz, oddíl 5).
// Zdroj je artefakt `signaly-tyden` z úspěšných běhů workflow Signály týdně na
// main (#326): soubor `souhrn.json` bez hledaných výrazů. Čte se přes GitHub API
// stejně jako zbytek přehledu, s mezipamětí 10 minut; ZIP se rozbalí přes
// node:zlib bez další závislosti. Chyba API ani chybějící artefakt stránku
// neshodí, jen se ukáže poznámka.
// ============================================================================

import { inflateRawSync } from 'node:zlib';

const REPO = 'tangero/stredniskoly';
const WORKFLOW = 'signaly-tyden.yml';
const ARTEFAKT = 'signaly-tyden';
const SOUBOR = 'souhrn.json';
export const MAX_TYDNU = 13;
const MEZIPAMET_S = 600;
const MAX_VELIKOST = 1024 * 1024;

export interface PolozkaStranky { stranka: string; zobrazeni: number }
export interface PolozkaRustu { stranka: string; zobrazeni: number; minulyTyden: number }
export interface PolozkaUdalosti { nazev: string; pocet: number }
export type Hodnoceni = 'dobrá' | 'ke zlepšení' | 'špatná';
export interface RadekRychlosti {
  typ: string;
  zarizeni: string;
  bezDat: boolean;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  hodnoceni: { lcp?: Hodnoceni; inp?: Hodnoceni; cls?: Hodnoceni };
}
export type Rychlost = { obdobi: string | null; radky: RadekRychlosti[] } | { vynechano: string } | null;

/** Souhrn jednoho týdne; null u oddílu znamená, že ho Matomo odmítlo (důvod ve `vynechano`). */
export interface SouhrnSignalu {
  od: string;
  do: string;
  navstevy: { navstevy: number; zobrazeni: number } | null;
  stranky: PolozkaStranky[] | null;
  rust: PolozkaRustu[] | null;
  udalostiKategorie: PolozkaUdalosti[] | null;
  udalostiAkce: PolozkaUdalosti[] | null;
  hledaniBezVysledku: { navstevy: number; vyrazu: number } | null;
  rychlost: Rychlost;
  vynechano: Record<string, string>;
}

export interface TydenSignalu {
  behId: number;
  odkaz: string;
  spusteno: string;
  souhrn: SouhrnSignalu | null;
  poznamka: string | null;
}

export interface Signaly {
  tydny: TydenSignalu[];
  poznamka: string | null;
}

// ----------------------------------------------------------------------------
// ZIP artefaktu: centrální adresář, metoda 0 (uloženo) nebo 8 (deflate).
// upload-artifact zapisuje velikosti až za data (datový popisovač), proto se
// čtou z centrálního adresáře, ne z lokální hlavičky.
// ----------------------------------------------------------------------------

/** Obsah souboru `nazev` z archivu ZIP, nebo null, když v archivu není. Poškozený archiv vyhodí chybu. */
export function souborZeZipu(zip: Uint8Array, nazev: string): Uint8Array | null {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let konec = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { konec = i; break; }
  }
  if (konec < 0) throw new Error('není ZIP');
  const pocet = v.getUint16(konec + 10, true);
  let p = v.getUint32(konec + 16, true);
  const dekoder = new TextDecoder();
  for (let n = 0; n < pocet; n++) {
    if (p + 46 > zip.length || v.getUint32(p, true) !== 0x02014b50) throw new Error('poškozený ZIP');
    const metoda = v.getUint16(p + 10, true);
    const komprimovano = v.getUint32(p + 20, true);
    const velikost = v.getUint32(p + 24, true);
    const delkaJmena = v.getUint16(p + 28, true);
    const delkaExtra = v.getUint16(p + 30, true);
    const delkaKomentare = v.getUint16(p + 32, true);
    const lokalni = v.getUint32(p + 42, true);
    const jmeno = dekoder.decode(zip.subarray(p + 46, p + 46 + delkaJmena));
    p += 46 + delkaJmena + delkaExtra + delkaKomentare;
    if (jmeno.split('/').pop() !== nazev) continue;
    if (velikost > MAX_VELIKOST) throw new Error('soubor v ZIP je příliš velký');
    if (lokalni + 30 > zip.length || v.getUint32(lokalni, true) !== 0x04034b50) throw new Error('poškozený ZIP');
    const zacatek = lokalni + 30 + v.getUint16(lokalni + 26, true) + v.getUint16(lokalni + 28, true);
    const data = zip.subarray(zacatek, zacatek + komprimovano);
    if (metoda === 0) return data;
    if (metoda === 8) return new Uint8Array(inflateRawSync(data, { maxOutputLength: MAX_VELIKOST }));
    throw new Error(`nepodporovaná komprese ${metoda}`);
  }
  return null;
}

// ----------------------------------------------------------------------------
// souhrn.json: bere se jen vyjmenovaný obsah. Hledané výrazy se do administrace
// nedostanou, ani kdyby je JSON omylem obsahoval (P1).
// ----------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const jeObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const cislo = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const cisloNebo = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const text = (x: unknown): string => (typeof x === 'string' ? x : '');
const datum = (x: unknown): string => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '');
const seznam = <T>(x: unknown, fn: (o: Obj) => T): T[] | null => (Array.isArray(x) ? x.filter(jeObj).map(fn) : null);
const HODNOCENI: Hodnoceni[] = ['dobrá', 'ke zlepšení', 'špatná'];
const hodnoceni = (x: unknown): Hodnoceni | undefined => (HODNOCENI.includes(x as Hodnoceni) ? (x as Hodnoceni) : undefined);

function rychlostZJson(x: unknown): Rychlost {
  if (!jeObj(x)) return null;
  if (typeof x.vynechano === 'string') return { vynechano: x.vynechano };
  const radky = seznam(x.radky, (r) => {
    const h = jeObj(r.hodnoceni) ? r.hodnoceni : {};
    return {
      typ: text(r.typ),
      zarizeni: text(r.zarizeni),
      bezDat: r.bez_dat === true,
      lcp: cisloNebo(r.lcp),
      inp: cisloNebo(r.inp),
      cls: cisloNebo(r.cls),
      hodnoceni: { lcp: hodnoceni(h.lcp), inp: hodnoceni(h.inp), cls: hodnoceni(h.cls) },
    };
  });
  return radky ? { obdobi: typeof x.obdobi === 'string' ? x.obdobi : null, radky } : null;
}

/** Souhrn z obsahu souhrn.json (verze 1); null, když JSON nemá očekávanou podobu. */
export function souhrnZJson(x: unknown): SouhrnSignalu | null {
  if (!jeObj(x) || x.verze !== 1 || !datum(x.od) || !datum(x.do)) return null;
  const udalosti = (u: unknown) => seznam(u, (o) => ({ nazev: text(o.nazev), pocet: cislo(o.pocet) }));
  const vynechano: Record<string, string> = {};
  if (jeObj(x.vynechano)) for (const [k, v] of Object.entries(x.vynechano)) if (typeof v === 'string') vynechano[k] = v;
  return {
    od: datum(x.od),
    do: datum(x.do),
    navstevy: jeObj(x.navstevy) ? { navstevy: cislo(x.navstevy.navstevy), zobrazeni: cislo(x.navstevy.zobrazeni) } : null,
    stranky: seznam(x.stranky, (o) => ({ stranka: text(o.stranka), zobrazeni: cislo(o.zobrazeni) })),
    rust: seznam(x.rust, (o) => ({ stranka: text(o.stranka), zobrazeni: cislo(o.zobrazeni), minulyTyden: cislo(o.minuly_tyden) })),
    udalostiKategorie: udalosti(x.udalosti_kategorie),
    udalostiAkce: udalosti(x.udalosti_akce),
    hledaniBezVysledku: jeObj(x.hledani_bez_vysledku) ? { navstevy: cislo(x.hledani_bez_vysledku.navstevy), vyrazu: cislo(x.hledani_bez_vysledku.vyrazu) } : null,
    rychlost: rychlostZJson(x.rychlost),
    vynechano,
  };
}

/** Souhrn z artefaktu (ZIP); poznámka, když v něm souhrn.json chybí nebo je nečitelný. */
export function souhrnZArtefaktu(zip: Uint8Array): { souhrn: SouhrnSignalu | null; poznamka: string | null } {
  try {
    const obsah = souborZeZipu(zip, SOUBOR);
    if (!obsah) return { souhrn: null, poznamka: `artefakt nemá ${SOUBOR} (běh před #528), souhrn je jen v Markdownu u běhu` };
    const souhrn = souhrnZJson(JSON.parse(new TextDecoder().decode(obsah)));
    return souhrn ? { souhrn, poznamka: null } : { souhrn: null, poznamka: `${SOUBOR} má neznámou podobu` };
  } catch (e) {
    return { souhrn: null, poznamka: `artefakt se nepodařilo přečíst (${e instanceof Error ? e.message : 'chyba'})` };
  }
}

// ----------------------------------------------------------------------------
// Načtení z GitHubu: 2 dotazy na seznamy a nejvýš 13 stažení ZIP.
// ----------------------------------------------------------------------------

type FetchFn = typeof fetch;
interface BehApi { id: number; html_url: string; created_at: string; status: string; conclusion: string | null; head_branch?: string }
interface ArtefaktApi { id: number; expired: boolean; workflow_run?: { id?: number } }

const odmitnutoTokenem = (status: number) => status === 401 || status === 403 || status === 404;
const POZNAMKA_TOKEN = 'GitHub odmítl stažení artefaktu: token GITHUB_TOKEN ve Vercelu potřebuje oprávnění ke čtení Actions (fine-grained „Actions: Read“, klasický token scope repo nebo public_repo)';

export async function nactiSignaly({ token = process.env.GITHUB_TOKEN, fetchFn = fetch }: { token?: string; fetchFn?: FetchFn } = {}): Promise<Signaly> {
  const hlavicky = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const dotaz = (cesta: string) => fetchFn(`https://api.github.com/${cesta}`, { headers: hlavicky, next: { revalidate: MEZIPAMET_S } } as RequestInit);

  let behy: BehApi[];
  let artefakty: ArtefaktApi[];
  try {
    const [b, a] = await Promise.all([
      dotaz(`repos/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=main&per_page=30`),
      dotaz(`repos/${REPO}/actions/artifacts?name=${ARTEFAKT}&per_page=100`),
    ]);
    if (!b.ok) return { tydny: [], poznamka: `Běhy workflow Signály týdně se nepodařilo načíst (HTTP ${b.status}).` };
    if (!a.ok) return { tydny: [], poznamka: `Seznam artefaktů se nepodařilo načíst (HTTP ${a.status}).` };
    behy = ((await b.json()) as { workflow_runs?: BehApi[] }).workflow_runs || [];
    artefakty = ((await a.json()) as { artifacts?: ArtefaktApi[] }).artifacts || [];
  } catch (e) {
    return { tydny: [], poznamka: `GitHub API je nedostupné (${e instanceof Error ? e.message : 'chyba'}).` };
  }

  const dokoncene = behy
    .filter((b) => b.status === 'completed' && (!b.head_branch || b.head_branch === 'main') && b.conclusion !== 'skipped' && b.conclusion !== 'cancelled')
    .slice(0, MAX_TYDNU);
  if (!dokoncene.length) return { tydny: [], poznamka: 'Workflow Signály týdně zatím na main neběželo.' };

  let tokenNestaci = false;
  const tydny = await Promise.all(dokoncene.map(async (b): Promise<TydenSignalu> => {
    const zaklad = { behId: b.id, odkaz: b.html_url, spusteno: b.created_at };
    if (b.conclusion !== 'success') return { ...zaklad, souhrn: null, poznamka: 'běh selhal, souhrn nevznikl' };
    const artefakt = artefakty.find((a) => a.workflow_run?.id === b.id);
    if (!artefakt) return { ...zaklad, souhrn: null, poznamka: 'artefakt chybí' };
    if (artefakt.expired) return { ...zaklad, souhrn: null, poznamka: 'artefakt vypršel (uchovává se 90 dní)' };
    try {
      const odp = await dotaz(`repos/${REPO}/actions/artifacts/${artefakt.id}/zip`);
      if (!odp.ok) {
        if (odmitnutoTokenem(odp.status)) tokenNestaci = true;
        return { ...zaklad, souhrn: null, poznamka: `artefakt se nepodařilo stáhnout (HTTP ${odp.status})` };
      }
      return { ...zaklad, ...souhrnZArtefaktu(new Uint8Array(await odp.arrayBuffer())) };
    } catch (e) {
      return { ...zaklad, souhrn: null, poznamka: `artefakt se nepodařilo stáhnout (${e instanceof Error ? e.message : 'chyba'})` };
    }
  }));

  // Ruční opakování téhož týdne: zůstane jen nejnovější běh s přečteným souhrnem.
  const videne = new Set<string>();
  const vysledek = tydny.filter((t) => {
    if (!t.souhrn) return true;
    if (videne.has(t.souhrn.od)) return false;
    videne.add(t.souhrn.od);
    return true;
  });
  return { tydny: vysledek, poznamka: tokenNestaci ? `${POZNAMKA_TOKEN}.` : null };
}
