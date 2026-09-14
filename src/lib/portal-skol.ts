import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Portál pro školy (pilot 2027) – typy, validace kódů, validace payloadu
// a mapování schválených záznamů do public/portal_skol.json.
// Podklad: docs/portal-pro-skoly-2027.md
// ============================================================================

export const PORTAL_VERZE_PRJIMANI = '2027';
export const INSPIS_EXPORT_LABEL = 'starší údaj z InspIS, export 11. 2. 2026';

// ----------------------------------------------------------------------------
// Editovatelná pole (pilotní sada z §3.2 a §3.3 návrhu)
// ----------------------------------------------------------------------------

export interface PortalPoleDef {
  key: string;
  label: string;
  napoveda: string;
  typ: 'text' | 'textarea' | 'url';
  maxLength: number;
  /** Prezentační pole (§3.3) – na webu se zobrazuje odděleně se značkou „od školy“. */
  prezentacni?: boolean;
}

export const PORTAL_POLE: PortalPoleDef[] = [
  {
    key: 'dny_otevrenych_dveri',
    label: 'Dny otevřených dveří',
    napoveda: 'Termíny včetně roku, např. „18. 11. 2026 a 13. 1. 2027“.',
    typ: 'text',
    maxLength: 300,
  },
  {
    key: 'odkaz_kriteria',
    label: 'Odkaz na kritéria přijímacího řízení 2027',
    napoveda: 'Adresa stránky nebo PDF na webu školy, kde jsou vyhlášená kritéria.',
    typ: 'url',
    maxLength: 500,
  },
  {
    key: 'kriteria_vlastnimi_slovy',
    label: 'Kritéria přijímacího řízení vlastními slovy',
    napoveda: 'Stručně pro rodiče: co se počítá a kolik bodů za co (testy, prospěch, talentová zkouška…).',
    typ: 'textarea',
    maxLength: 2000,
  },
  {
    key: 'pripravne_kurzy',
    label: 'Přípravné kurzy a přijímačky nanečisto',
    napoveda: 'Zda škola pořádá přípravné kurzy nebo modelové přijímací zkoušky, případně termíny a cena.',
    typ: 'text',
    maxLength: 500,
  },
  {
    key: 'ubytovani_poznamka',
    label: 'Poznámka k ubytování',
    napoveda: 'Např. „vlastní kolej, kapacita 80 míst“ nebo „dojezdová kolej v sousedním městě“.',
    typ: 'text',
    maxLength: 300,
  },
  {
    key: 'stravovani',
    label: 'Stravování',
    napoveda: 'Např. „vlastní jídelna, obědy za 45 Kč, výběr ze dvou jídel“ nebo „jídelna sousední školy“.',
    typ: 'text',
    maxLength: 300,
  },
  {
    key: 'skolne',
    label: 'Školné a poplatky',
    napoveda: 'Roční školné, případně další poplatky. U bezplatného vzdělávání napište „zdarma“.',
    typ: 'text',
    maxLength: 300,
  },
  {
    key: 'podpora_svp',
    label: 'Podpora žáků se speciálními vzdělávacími potřebami',
    napoveda: 'Jak škola pracuje se žáky SVP a jaké jsou podmínky upravených testů v praxi.',
    typ: 'text',
    maxLength: 500,
  },
  {
    key: 'kontakt_vychovny_poradce',
    label: 'Kontakt na výchovného poradce',
    napoveda: 'Funkční e-mail nebo telefon pro rodiče, např. „poradce@skola.cz, konzultace po dohodě“. Jméno uvádět nemusíte.',
    typ: 'text',
    maxLength: 300,
  },
  {
    key: 'prestupy',
    label: 'Přestupy v průběhu studia',
    napoveda: 'Zda a za jakých podmínek škola přijímá přestupující žáky.',
    typ: 'text',
    maxLength: 500,
  },
  {
    key: 'popis_skoly',
    label: 'Popis školy vlastními slovy',
    napoveda: 'Prezentační text, který se na webu zobrazí odděleně se značkou „od školy“.',
    typ: 'textarea',
    maxLength: 3000,
    prezentacni: true,
  },
];

const POLE_MAP = new Map(PORTAL_POLE.map((p) => [p.key, p]));

/** Pole „ubytování“ je jediné ne-textové: ano / ne / necháno prázdné. */
export const UBYTOVANI_HODNOTY = ['ano', 'ne'] as const;
export type UbytovaniHodnota = (typeof UBYTOVANI_HODNOTY)[number];

// ----------------------------------------------------------------------------
// Typy publikovaného záznamu (public/portal_skol.json)
// ----------------------------------------------------------------------------

export interface PortalHodnota {
  hodnota: string;
  potvrzeno_dne: string; // YYYY-MM-DD
  zdroj: 'skola';
}

export interface PortalZaznam {
  redizo: string;
  nazev: string;
  verze_prijimani: string;
  aktualizovano: string; // YYYY-MM-DD
  udaje: Partial<Record<string, PortalHodnota>>;
}

export type PortalSkolData = Record<string, PortalZaznam>;

// ----------------------------------------------------------------------------
// Kódy: generátor ukládá jen SHA-256 hash (data/portal/kody.json)
// ----------------------------------------------------------------------------

export interface PortalKodZaznam {
  hash: string;
  redizo: string;
  vytvoreno: string;
  revokovano: boolean;
}

export function normalizeKod(kod: string): string {
  return String(kod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashKod(kod: string): string {
  return createHash('sha256').update(normalizeKod(kod), 'utf8').digest('hex');
}

/**
 * Najde REDIZO podle hashe kódu; respektuje revokaci.
 * Vrací REDIZO nebo null. Volitelně přijímá dataset (testy), jinak čte data/portal/kody.json.
 */
export async function validateKod(kod: string, kody?: PortalKodZaznam[]): Promise<string | null> {
  const normalized = normalizeKod(kod);
  if (normalized.length === 0) return null;
  const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');
  const seznam = kody ?? (await nactiKody());
  const zaznam = seznam.find((k) => k.hash === hash);
  if (!zaznam || zaznam.revokovano) return null;
  return zaznam.redizo;
}

export async function nactiKody(): Promise<PortalKodZaznam[]> {
  try {
    const obsah = await fs.readFile(path.join(process.cwd(), 'data', 'portal', 'kody.json'), 'utf-8');
    return (JSON.parse(obsah).kody || []) as PortalKodZaznam[];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Validace payloadu z formuláře (sdílí API route i testy)
// ----------------------------------------------------------------------------

export interface PortalPayload {
  redizo: string; // doplní server podle kódu, nikdy nepřijímáme z klienta
  nazev: string; // doplní server z katalogu (pro čitelnost issue)
  verze_prijimani: string;
  udaje: Record<string, string>;
  udaje_sedi: boolean;
  nesrovnalost: string;
  souhlas_cc_by: true;
  kontakt_email: string; // interní, nepublikovat
}

export type PayloadVysledek =
  | { ok: true; udaje: Record<string, string>; udaje_sedi: boolean; nesrovnalost: string; kontakt_email: string }
  | { ok: false; error: string };

export function validatePortalPayload(body: unknown): PayloadVysledek {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Neplatný formát dat.' };
  }
  const raw = body as Record<string, unknown>;

  // Souhlas s CC BY 4.0 je povinný (podmínka open data z §5 návrhu)
  if (raw.souhlas_cc_by !== true) {
    return { ok: false, error: 'K odeslání je potřeba souhlas s vydáním obsahu pod licencí CC BY 4.0.' };
  }

  // Kontaktní e-mail editora (interní, nepublikujeme)
  const kontakt_email = String(raw.kontakt_email || '').trim();
  if (!kontakt_email || kontakt_email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kontakt_email)) {
    return { ok: false, error: 'Zadejte platný kontaktní e-mail (slouží jen pro dotazy redakce, nepublikujeme ho).' };
  }

  // Editovatelná pole: jen povolené klíče, ořez, délkové limity, formáty
  const rawUdaje = (raw.udaje && typeof raw.udaje === 'object' ? raw.udaje : {}) as Record<string, unknown>;
  const udaje: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawUdaje)) {
    if (key === 'ubytovani') {
      const v = String(value ?? '').trim().toLowerCase();
      if (v !== '' && !(UBYTOVANI_HODNOTY as readonly string[]).includes(v)) {
        return { ok: false, error: 'Ubytování: vyberte „ano“ nebo „ne“.' };
      }
      udaje.ubytovani = v;
      continue;
    }
    const def = POLE_MAP.get(key);
    if (!def) continue; // neznámá pole ignorujeme
    const v = String(value ?? '').trim();
    if (v.length > def.maxLength) {
      return { ok: false, error: `Pole „${def.label}“ může mít nejvýše ${def.maxLength} znaků.` };
    }
    if (def.typ === 'url' && v !== '') {
      if (!/^https?:\/\//i.test(v)) {
        return { ok: false, error: 'Odkaz na kritéria musí začínat na http:// nebo https://.' };
      }
      try {
        new URL(v);
      } catch {
        return { ok: false, error: 'Odkaz na kritéria není platná adresa URL.' };
      }
    }
    udaje[key] = v;
  }

  // Nesrovnalost v datech katalogu (volitelné)
  const nesrovnalost = String(raw.nesrovnalost || '').trim();
  if (nesrovnalost.length > 2000) {
    return { ok: false, error: 'Popis nesrovnalosti může mít nejvýše 2000 znaků.' };
  }

  // Aspoň něco musí škola poslat: potvrzení dat, nesrovnalost nebo vyplněné pole
  const maVyplneno = Object.values(udaje).some((v) => v !== '');
  const udaje_sedi = raw.udaje_sedi === true;
  if (!maVyplneno && !nesrovnalost && !udaje_sedi) {
    return { ok: false, error: 'Vyplňte alespoň jedno pole, nebo potvrďte, že údaje z datových zdrojů sedí.' };
  }

  return { ok: true, udaje, udaje_sedi, nesrovnalost, kontakt_email };
}

// ----------------------------------------------------------------------------
// Mapování schváleného payloadu do public/portal_skol.json
// (používá moderační skript; člověk schvaluje čtením issue, skript jen převádí)
// ----------------------------------------------------------------------------

export function buildPortalZaznam(
  existing: PortalZaznam | null,
  payload: PortalPayload,
  dnes: string, // YYYY-MM-DD
): PortalZaznam {
  const udaje: Partial<Record<string, PortalHodnota>> = { ...(existing?.udaje || {}) };
  for (const [key, hodnota] of Object.entries(payload.udaje)) {
    if (hodnota === '') {
      // Škola pole vymazala → stávající potvrzenou hodnotu odstraníme
      delete udaje[key];
    } else {
      udaje[key] = { hodnota, potvrzeno_dne: dnes, zdroj: 'skola' };
    }
  }
  return {
    redizo: payload.redizo,
    nazev: payload.nazev || existing?.nazev || '',
    verze_prijimani: payload.verze_prijimani || existing?.verze_prijimani || PORTAL_VERZE_PRJIMANI,
    aktualizovano: dnes,
    udaje,
  };
}

/** Má záznam aspoň jednu neprázdnou hodnotu? Prázdný záznam se na webu nezobrazuje. */
export function zaznamMaObsah(zaznam: PortalZaznam | null): boolean {
  if (!zaznam) return false;
  return Object.values(zaznam.udaje).some((v) => v && v.hodnota.trim() !== '');
}

// ----------------------------------------------------------------------------
// Načítání dat (server-only; stránky jsou ISR/SSR)
// ----------------------------------------------------------------------------

export async function getPortalSkolData(): Promise<PortalSkolData> {
  try {
    const obsah = await fs.readFile(path.join(process.cwd(), 'public', 'portal_skol.json'), 'utf-8');
    return JSON.parse(obsah) as PortalSkolData;
  } catch {
    return {};
  }
}

export async function getPortalZaznam(redizo: string): Promise<PortalZaznam | null> {
  const data = await getPortalSkolData();
  return data[redizo] || null;
}

// ----------------------------------------------------------------------------
// Předvyplněný profil pro editační stránku
// ----------------------------------------------------------------------------

export interface PortalOborKatalog {
  obor: string;
  zamereni: string;
  delka_studia: number;
  kapacita: number;
  prihlasky: number;
}

export interface PredvyplnenaHodnota {
  hodnota: string;
  zdroj: 'portal' | 'inspis';
}

export interface PredvyplnenyProfil {
  redizo: string;
  nazev: string;
  obec: string;
  kraj: string;
  obory: PortalOborKatalog[];
  hodnoty: Record<string, PredvyplnenaHodnota>;
  inspisPoznamka: string;
}

function formatSkolneInspis(rocniSkolne: number | null): string | null {
  if (rocniSkolne === null || rocniSkolne === undefined) return null;
  if (rocniSkolne === 0) return 'Zdarma';
  return `${rocniSkolne.toLocaleString('cs-CZ')} Kč/rok`;
}

/**
 * Předvyplnění editovatelných polí: nejdřív poslední schválená verze
 * (public/portal_skol.json), pak starý snapshot InspIS tam, kde mapování existuje
 * (dny otevřených dveří, přípravné kurzy, školné).
 */
export async function getPredvyplnenyProfil(redizo: string): Promise<PredvyplnenyProfil | null> {
  // Katalog 2026
  const schoolsRaw = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public', 'schools_data.json'), 'utf-8'),
  ) as Record<string, Array<Record<string, unknown>>>;
  const radky = (schoolsRaw['2026'] || []).filter((s) => String(s.redizo) === redizo);
  if (radky.length === 0) return null;

  const prvni = radky[0];
  const obory: PortalOborKatalog[] = radky.map((s) => ({
    obor: String(s.zamereni ? `${s.obor} – ${s.zamereni}` : s.obor),
    zamereni: String(s.zamereni || ''),
    delka_studia: Number(s.delka_studia || 0),
    kapacita: Number(s.kapacita || 0),
    prihlasky: Number(s.prihlasky || 0),
  }));

  const hodnoty: Record<string, PredvyplnenaHodnota> = {};

  // 1. poslední schválená verze z portálu
  const zaznam = await getPortalZaznam(redizo);
  if (zaznam) {
    for (const [key, v] of Object.entries(zaznam.udaje)) {
      if (v && v.hodnota) hodnoty[key] = { hodnota: v.hodnota, zdroj: 'portal' };
    }
  }

  // 2. InspIS snapshot tam, kde portál hodnotu ještě nemá
  try {
    const inspisRaw = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'data', 'inspis_school_profiles.json'), 'utf-8'),
    ) as { schools: Record<string, Record<string, unknown>> };
    const inspis = inspisRaw.schools[redizo];
    if (inspis) {
      const dod = inspis.dny_otevrenych_dveri;
      if (!hodnoty.dny_otevrenych_dveri && typeof dod === 'string' && dod.trim()) {
        hodnoty.dny_otevrenych_dveri = { hodnota: dod.trim(), zdroj: 'inspis' };
      }
      const kurzy = inspis.pripravne_kurzy;
      if (!hodnoty.pripravne_kurzy && typeof kurzy === 'boolean') {
        hodnoty.pripravne_kurzy = { hodnota: kurzy ? 'Ano' : 'Ne', zdroj: 'inspis' };
      }
      const skolne = formatSkolneInspis(inspis.rocni_skolne as number | null);
      if (!hodnoty.skolne && skolne) {
        hodnoty.skolne = { hodnota: skolne, zdroj: 'inspis' };
      }
    }
  } catch {
    // InspIS snapshot není povinný – bez něj se profil předvyplní jen z portálu
  }

  return {
    redizo,
    nazev: String(prvni.nazev),
    obec: String(prvni.obec || ''),
    kraj: String(prvni.kraj || ''),
    obory,
    hodnoty,
    inspisPoznamka: INSPIS_EXPORT_LABEL,
  };
}

/** Název školy z katalogu 2026 (pro čitelný titulek GitHub issue). */
export async function getNazevSkoly(redizo: string): Promise<string> {
  try {
    const schoolsRaw = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'public', 'schools_data.json'), 'utf-8'),
    ) as Record<string, Array<Record<string, unknown>>>;
    const radek = (schoolsRaw['2026'] || []).find((s) => String(s.redizo) === redizo);
    return radek ? String(radek.nazev) : '';
  } catch {
    return '';
  }
}

/** České formátování data YYYY-MM-DD → „13. 9. 2026“ (bez závislosti na locale serveru). */
export function formatDatumCz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`;
}
