import { timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { PortalSkolData } from './portal-skol';
import { formatDatumCz } from './portal-skol.ts';
import { dotaz, jeDbNastavena } from './novinky-db.ts';

// ============================================================================
// /admin – stavová stránka: přístup přes token v URL, stav moderace,
// datových sad, datové linky a automatizací. Čisté funkce jsou sdílené
// se stránkou i testy; GitHub fetchery jsou server-only.
// ============================================================================

const GITHUB_REPO = 'tangero/stredniskoly';

// ----------------------------------------------------------------------------
// Přístup: token v URL (?k=…) porovnaný s env ADMIN_TOKEN, constant-time.
// Chybějící env → false (stránka pak vrací 404 a neprozrazuje svou existenci).
// ----------------------------------------------------------------------------

export function overAdminToken(
  kandidat: string | undefined | null,
  ocekavany = process.env.ADMIN_TOKEN,
): boolean {
  if (!ocekavany || !kandidat) return false;
  const a = Buffer.from(kandidat);
  const b = Buffer.from(ocekavany);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ----------------------------------------------------------------------------
// Stav datové sady (public/stav_datovych_sad.json)
// ----------------------------------------------------------------------------

export type StavSady = 'zastaralá' | 'po termínu' | 'OK';

export interface AdminSada {
  klic: string;
  nazev: string;
  pouziti: string;
  zobrazujeme: string; // zobrazeno.obdobi
  zobrazujemePlatneK: string | null;
  cekame: string | null; // ocekavano.obdobi
  cekameKdy: string | null; // ocekavano.kdy
  stav: StavSady;
}

/**
 * Stav sady: obnovit_nejpozdeji < dnes → „zastaralá“;
 * ocekavano.kdy („2027-03“ nebo ISO datum) v minulosti → „po termínu“;
 * „neznámo“ a jiné neparsrovatelné hodnoty se ignorují. Jinak OK.
 */
export function stavSady(
  sada: { obnovit_nejpozdeji?: string | null; ocekavano?: { kdy?: string | null } | null },
  dnes: Date,
): StavSady {
  const dnesIso = dnes.toISOString().slice(0, 10); // YYYY-MM-DD
  const dnesMesic = dnesIso.slice(0, 7); // YYYY-MM

  const nejpozdeji = sada.obnovit_nejpozdeji;
  if (nejpozdeji && /^\d{4}-\d{2}-\d{2}$/.test(nejpozdeji) && nejpozdeji < dnesIso) {
    return 'zastaralá';
  }

  const kdy = sada.ocekavano?.kdy;
  if (kdy) {
    if (/^\d{4}-\d{2}$/.test(kdy) && kdy < dnesMesic) return 'po termínu';
    if (/^\d{4}-\d{2}-\d{2}$/.test(kdy) && kdy < dnesIso) return 'po termínu';
  }
  return 'OK';
}

export async function getStavDatovychSad(dnes: Date): Promise<AdminSada[]> {
  try {
    const obsah = await fs.readFile(
      path.join(process.cwd(), 'public', 'stav_datovych_sad.json'),
      'utf-8',
    );
    const data = JSON.parse(obsah) as { sady?: Record<string, Record<string, unknown>> };
    return Object.entries(data.sady || {}).map(([klic, sada]) => {
      const zobrazeno = (sada.zobrazeno || {}) as Record<string, string>;
      const ocekavano = (sada.ocekavano || {}) as Record<string, string>;
      return {
        klic,
        nazev: String(sada.nazev || klic),
        pouziti: String(sada.pouziti || ''),
        zobrazujeme: String(zobrazeno.obdobi || '—'),
        zobrazujemePlatneK: zobrazeno.platne_k || null,
        cekame: ocekavano.obdobi || null,
        cekameKdy: ocekavano.kdy || null,
        stav: stavSady(sada as { obnovit_nejpozdeji?: string | null; ocekavano?: { kdy?: string | null } }, dnes),
      };
    });
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Portál pro školy: schválené profily (public/portal_skol.json)
// ----------------------------------------------------------------------------

export interface AdminPortalZaznam {
  redizo: string;
  nazev: string;
  potvrzenoDne: string; // nejnovější potvrzeno_dne v záznamu
  pocetPoli: number;
}

export async function getPortalPrehled(): Promise<{ pocet: number; posledni: AdminPortalZaznam[] }> {
  try {
    const obsah = await fs.readFile(
      path.join(process.cwd(), 'public', 'portal_skol.json'),
      'utf-8',
    );
    const data = JSON.parse(obsah) as PortalSkolData;
    const posledni = Object.values(data)
      .map((z) => {
        const hodnoty = Object.values(z.udaje || {}).filter(
          (v) => v && typeof v.hodnota === 'string' && v.hodnota.trim() !== '',
        );
        const datumy = hodnoty.map((v) => v!.potvrzeno_dne).filter(Boolean).sort();
        return {
          redizo: z.redizo,
          nazev: z.nazev || z.redizo,
          potvrzenoDne: datumy.at(-1) || z.aktualizovano || '',
          pocetPoli: hodnoty.length,
        };
      })
      .sort((a, b) => b.potvrzenoDne.localeCompare(a.potvrzenoDne))
      .slice(0, 10);
    return { pocet: Object.keys(data).length, posledni };
  } catch {
    return { pocet: 0, posledni: [] };
  }
}

// ----------------------------------------------------------------------------
// Portál pro školy: otevřené návrhy (GitHub issues s labelem portal-skoly)
// Interní obsah těl (kontaktní e-mail editora) se nikam nepropisuje.
// ----------------------------------------------------------------------------

export interface AdminNavrh {
  cislo: number;
  url: string;
  skola: string;
  vytvoreno: string; // ISO datum
  kanal: string | null; // kod | magic-link
  stariDni: number;
}

/** Titulek „[Portál škol] Název (REDIZO)“ → název školy. */
export function extrahujNazevZTitulku(titulek: string): string {
  const m = /^\[Portál škol\]\s*(.+?)\s*\(\d{9,10}\)\s*$/.exec(titulek || '');
  return m ? m[1] : titulek;
}

/** Z těla issue vytáhne jen kanál; nic jiného z těla se nezobrazuje. */
export function extrahujKanalZIssue(body: string | null | undefined): string | null {
  const m = /\*\*Kanál:\*\*\s*([\w-]+)/.exec(body || '');
  return m ? m[1] : null;
}

export function stariVeDnech(isoDatum: string, dnes: Date): number {
  const ms = dnes.getTime() - new Date(isoDatum).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** null = moderace není nakonfigurována (chybí token), jinak seznam (může být prázdný). */
export async function getOtevreneNavrhy(dnes: Date): Promise<AdminNavrh[] | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues?labels=portal-skoly&state=open&per_page=100`,
      { headers: githubHeaders(token), next: { revalidate: 60 } },
    );
    if (!response.ok) return [];
    const issues = (await response.json()) as Array<{
      number: number;
      title: string;
      html_url: string;
      created_at: string;
      body?: string | null;
    }>;
    return issues.map((i) => ({
      cislo: i.number,
      url: i.html_url,
      skola: extrahujNazevZTitulku(i.title),
      vytvoreno: i.created_at.slice(0, 10),
      kanal: extrahujKanalZIssue(i.body),
      stariDni: stariVeDnech(i.created_at, dnes),
    }));
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Datová linka (data/linka/fronta.json – mimo public, čteme přes fs)
// ----------------------------------------------------------------------------

export interface AdminUloha {
  kod: string;
  sada: string;
  druh: string;
  obdobi: string;
  stav: string;
  posledniZmena: string; // ISO
}

export interface AdminBeh {
  cas: string;
  noveUlohy: number;
  informace: number;
  nedostupne: number;
}

export interface AdminLinka {
  pocetDleStavu: Record<string, number>;
  ulohy: AdminUloha[];
  behy: AdminBeh[];
}

export async function getLinkaFronta(): Promise<AdminLinka> {
  const prazdna: AdminLinka = { pocetDleStavu: {}, ulohy: [], behy: [] };
  try {
    const obsah = await fs.readFile(
      path.join(process.cwd(), 'data', 'linka', 'fronta.json'),
      'utf-8',
    );
    const data = JSON.parse(obsah) as {
      ulohy?: Record<string, Record<string, unknown>>;
      behy?: Array<Record<string, unknown>>;
    };
    const ulohy = Object.values(data.ulohy || {}).map((u) => {
      const historie = (u.historie || []) as Array<{ cas?: string }>;
      return {
        kod: String(u.kod || ''),
        sada: String(u.sada || ''),
        druh: String(u.druh || ''),
        obdobi: String(u.obdobi || ''),
        stav: String(u.stav || ''),
        posledniZmena: historie.at(-1)?.cas || String(u.vytvoreno || ''),
      };
    });
    ulohy.sort((a, b) => b.posledniZmena.localeCompare(a.posledniZmena));

    const pocetDleStavu: Record<string, number> = {};
    for (const u of ulohy) {
      pocetDleStavu[u.stav] = (pocetDleStavu[u.stav] || 0) + 1;
    }

    const behy = (data.behy || [])
      .map((b) => ({
        cas: String(b.cas || ''),
        noveUlohy: ((b.nove_ulohy || []) as unknown[]).length,
        informace: ((b.informace || []) as unknown[]).length,
        nedostupne: ((b.nedostupne || []) as unknown[]).length,
      }))
      .sort((a, b) => b.cas.localeCompare(a.cas))
      .slice(0, 5);

    return { pocetDleStavu, ulohy, behy };
  } catch {
    return prazdna;
  }
}

// ----------------------------------------------------------------------------
// Automatizace: poslední běhy GitHub Actions
// ----------------------------------------------------------------------------

export interface AdminBehActions {
  nazev: string;
  vysledek: string; // success | failure | cancelled | in_progress | …
  kdy: string; // ISO
  url: string;
}

/** null = není token; jinak seznam (může být prázdný při chybě API). */
export async function getBehyActions(): Promise<AdminBehActions[] | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=15`,
      { headers: githubHeaders(token), next: { revalidate: 60 } },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      workflow_runs?: Array<{
        name: string;
        conclusion: string | null;
        status: string;
        created_at: string;
        html_url: string;
      }>;
    };
    return (data.workflow_runs || []).map((r) => ({
      nazev: r.name,
      vysledek: r.conclusion || r.status,
      kdy: r.created_at,
      url: r.html_url,
    }));
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Odběr novinek (Neon Postgres přes novinky-db). Adresy se neukazují,
// jen počty a rozpad podle místa přihlášení.
// ----------------------------------------------------------------------------

export interface AdminNovinky {
  /** Aktivní odběry (potvrzené a neodhlášené). */
  odberatele: number;
  nove7: number;
  nove30: number;
  /** Vyplněné formuláře čekající na kliknutí v e-mailu. */
  cekajiciPotvrzeni: number;
  /** Položky ve frontě odesílače (typicky potvrzení k dovozu). */
  frontaCeka: number;
  dleZdroje: Array<{ zdroj: string; pocet: number }>;
}

/** null = odběr není nakonfigurován (chybí DATABASE_URL) nebo se databáze nedá číst. */
export async function getNovinkyPrehled(): Promise<AdminNovinky | null> {
  if (!jeDbNastavena()) return null;
  try {
    const odbery = await dotaz<{ celkem: number; nove7: number; nove30: number }>(
      `select count(*)::int as celkem,
              count(*) filter (where potvrzeno > now() - interval '7 days')::int as nove7,
              count(*) filter (where potvrzeno > now() - interval '30 days')::int as nove30
         from odber_novinek`,
    );
    const zadosti = await dotaz<{ pocet: number }>(
      `select count(*)::int as pocet from zadost_o_potvrzeni
        where spotrebovano is null and plati_do > now()`,
    );
    const fronta = await dotaz<{ pocet: number }>(
      `select count(*)::int as pocet from polozka_odeslani where stav = 'ceka'`,
    );
    const zdroje = await dotaz<{ zdroj: string; pocet: number }>(
      `select zdroj, count(*)::int as pocet from odber_novinek
        group by zdroj order by pocet desc, zdroj`,
    );
    return {
      odberatele: odbery.rows[0]?.celkem ?? 0,
      nove7: odbery.rows[0]?.nove7 ?? 0,
      nove30: odbery.rows[0]?.nove30 ?? 0,
      cekajiciPotvrzeni: zadosti.rows[0]?.pocet ?? 0,
      frontaCeka: fronta.rows[0]?.pocet ?? 0,
      dleZdroje: zdroje.rows,
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Formátování
// ----------------------------------------------------------------------------

export { formatDatumCz };

/** ISO datetime → „13. 9. 2026 11:04“ (UTC čas ponechán, jak je uložen). */
export function formatDatumCasCz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso || '');
  if (!m) return iso;
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]} ${m[4]}:${m[5]}`;
}

/** Relativní stáří česky: „dnes“, „včera“, „před N dny“. */
export function stariSlovy(dni: number): string {
  if (dni <= 0) return 'dnes';
  if (dni === 1) return 'včera';
  return `před ${dni} dny`;
}
