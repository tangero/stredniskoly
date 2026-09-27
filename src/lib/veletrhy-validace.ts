// ============================================================================
// Validace akcí a návrhů změn veletrhů (docs/veletrhy-api-2027.md, oddíl 5).
//
// Čisté funkce bez databáze a bez závislostí: volá je API při založení
// návrhu (proti stavu v tu chvíli) i schválení (znovu proti aktuálnímu
// stavu), a testy. Výsledek dělí na chyby, které návrh blokují, a varování,
// která jen dostane schvalovatel do e-mailu.
//
// Tvar akce je rozhraní `Veletrh` z ./veletrhy.ts. Neznámé pole se odmítne:
// Eduarda zpracovává cizí e-maily a whitelist je jedna z obran proti tomu,
// aby na web prošlo něco, co tam nikdo nezamýšlel.
// ============================================================================

import { krajNames } from './kraje.mjs';
import type { Veletrh } from './veletrhy.ts';

/** Datum existuje v kalendáři: 2026-02-30 ani 2026-99-99 neprojde. */
export function jeDatumPlatne(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Adresa musí být http(s) a rozeberatelná; „https://a b“ neprojde. */
export function jeUrlPlatna(url: string): boolean {
  if (url.length > 500 || /\s/.test(url)) return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export interface Chyba {
  pole: string;
  zprava: string;
}

export interface VysledekValidace {
  chyby: Chyba[];
  varovani: Chyba[];
}

/** Pole akce, která se smějí zapsat. Cokoli dalšího je chyba. */
export const POLE_AKCE = [
  'id', 'nazev', 'poradatel', 'mesto', 'online', 'krajKod', 'misto', 'start', 'end', 'datum', 'cas',
  'terminPotvrzen', 'terminPribligny', 'zdrojJenAgregator', 'poznamkaTerminu', 'url', 'zdrojOvereni',
  'overeno', 'cekaNa',
] as const;

const TEXTOVA_POLE = ['nazev', 'poradatel', 'misto', 'mesto', 'datum', 'cas', 'poznamkaTerminu', 'zdrojOvereni', 'cekaNa'] as const;
const LOGICKA_POLE = ['online', 'terminPotvrzen', 'terminPribligny', 'zdrojJenAgregator'] as const;
const MAX_TEXT = 200;
const MAX_DLOUHY_TEXT = 500;

/** Slug `veletrh-vzdelavani-trebic-2026`: malá písmena, číslice, pomlčky. */
const RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Osobní údaje ve veřejném poli. Repo je veřejné a snímek JSON se do něj
 * commituje, kontakty na lidi na web nepatří (docs/veletrhy-skol-2027.md § 8.5).
 * Telefon se pozná podle předvolby nebo tří trojic číslic; PSČ (dvě skupiny)
 * ani čísla popisná tím neprojdou jako falešný poplach.
 */
const RE_EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const RE_TELEFON = /(\+420|00420)\s?\d{3}|\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/;

export function obsahujeKontakt(text: string): boolean {
  return RE_EMAIL.test(text) || RE_TELEFON.test(text);
}

/** Malá písmena bez diakritiky a bez okolních mezer: pro hledání duplicit. */
export function normalizuj(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Tvar jedné akce, bez ohledu na ostatní. `dnes` je český den (YYYY-MM-DD),
 * předává ho volající. `povolitMinulou` pouští opravu historie.
 */
export function overAkci(
  vstup: unknown,
  { dnes, povolitMinulou = false }: { dnes: string; povolitMinulou?: boolean },
): VysledekValidace {
  const chyby: Chyba[] = [];
  const varovani: Chyba[] = [];
  const ch = (pole: string, zprava: string) => chyby.push({ pole, zprava });
  const va = (pole: string, zprava: string) => varovani.push({ pole, zprava });

  if (vstup === null || typeof vstup !== 'object' || Array.isArray(vstup)) {
    ch('akce', 'Akce musí být objekt.');
    return { chyby, varovani };
  }
  const a = vstup as Record<string, unknown>;

  for (const klic of Object.keys(a)) {
    if (!(POLE_AKCE as readonly string[]).includes(klic)) ch(klic, 'Neznámé pole.');
  }

  if (typeof a.id !== 'string' || !RE_ID.test(a.id) || a.id.length > 80) {
    ch('id', 'Id musí být slug z malých písmen, číslic a pomlček, nejvýš 80 znaků.');
  }
  for (const pole of ['nazev', 'poradatel', 'misto'] as const) {
    if (typeof a[pole] !== 'string' || !(a[pole] as string).trim()) ch(pole, 'Povinné pole.');
  }
  for (const pole of TEXTOVA_POLE) {
    const h = a[pole];
    if (h === undefined || h === null) continue;
    if (typeof h !== 'string') {
      ch(pole, 'Musí být text.');
      continue;
    }
    const max = pole === 'poznamkaTerminu' || pole === 'cekaNa' ? MAX_DLOUHY_TEXT : MAX_TEXT;
    if (h.length > max) ch(pole, `Nejvýš ${max} znaků.`);
    if (/[\u0000-\u001f\u007f]/.test(h)) ch(pole, 'Pole nesmí obsahovat odřádkování ani řídicí znaky.');
    if (obsahujeKontakt(h)) ch(pole, 'Veřejné pole nesmí obsahovat e-mail ani telefon; patří do zdrojEmail nebo poznamka návrhu.');
  }
  for (const pole of LOGICKA_POLE) {
    if (a[pole] !== undefined && typeof a[pole] !== 'boolean') ch(pole, 'Musí být true, nebo false.');
  }
  if (typeof a.terminPotvrzen !== 'boolean') ch('terminPotvrzen', 'Povinné pole (true/false).');

  if (typeof a.krajKod !== 'string' || !Object.hasOwn(krajNames, a.krajKod)) {
    ch('krajKod', 'Neznámý kód kraje.');
  }
  if (a.mesto === undefined) ch('mesto', 'Povinné pole (u online akce null).');
  if (a.mesto === null && a.online !== true && a.terminPotvrzen === true) {
    ch('mesto', 'Potvrzená akce, která není online, musí mít město.');
  }

  for (const pole of ['start', 'end', 'overeno'] as const) {
    const h = a[pole];
    if (h === undefined || h === null) continue;
    if (typeof h !== 'string' || !jeDatumPlatne(h)) ch(pole, 'Datum ve tvaru YYYY-MM-DD.');
  }
  const start = typeof a.start === 'string' && jeDatumPlatne(a.start) ? a.start : null;
  const end = typeof a.end === 'string' && jeDatumPlatne(a.end) ? a.end : null;
  if (start && end && end < start) ch('end', 'Konec nemůže být dřív než začátek.');
  if (typeof a.overeno === 'string' && a.overeno > dnes) ch('overeno', 'Datum ověření nemůže být v budoucnosti.');

  if (a.url !== undefined && a.url !== null && (typeof a.url !== 'string' || !jeUrlPlatna(a.url))) {
    ch('url', 'Neplatná adresa (http/https, nejvýš 500 znaků).');
  }

  if (a.terminPotvrzen === true) {
    for (const pole of ['start', 'datum', 'url', 'zdrojOvereni', 'overeno'] as const) {
      if (a[pole] === undefined || a[pole] === null || a[pole] === '') {
        ch(pole, 'Potvrzená akce musí mít termín, datum slovy, odkaz, zdroj a datum ověření.');
      }
    }
  } else if (a.terminPotvrzen === false && (typeof a.cekaNa !== 'string' || !a.cekaNa.trim())) {
    ch('cekaNa', 'Nepotvrzená akce musí říct, na co čeká.');
  }
  if ((a.terminPribligny === true || a.zdrojJenAgregator === true) && !a.poznamkaTerminu) {
    ch('poznamkaTerminu', 'Přibližný termín nebo termín z agregátoru potřebuje veřejnou poznámku.');
  }

  const posledni = end ?? start;
  if (posledni && posledni < dnes && !povolitMinulou) {
    ch('start', 'Akce už proběhla. Oprava historie potřebuje "povolitMinulou": true.');
  }

  // Varování: nic neblokují, jen je uvidí schvalovatel.
  if (start && typeof a.datum === 'string' && !a.datum.includes(String(Number(start.slice(8, 10))))) {
    va('datum', 'Datum slovy neobsahuje den ze startu.');
  }
  if (typeof a.datum === 'string' && /\d{1,2}[:.]\d{2}/.test(a.datum)) {
    va('datum', 'Čas patří do pole cas, ne do datum.');
  }
  if (start) {
    const [od, doDne] = hraniceSezony(dnes);
    if (start < od || start > doDne) va('start', `Termín mimo sezónu (${od} až ${doDne}).`);
  }
  if (typeof a.url === 'string' && jeUrlPlatna(a.url)) {
    const u = new URL(a.url);
    if ((u.pathname === '/' || u.pathname === '') && !u.search) {
      va('url', 'Odkaz vede jen na titulní stránku webu, ne na stránku akce.');
    }
  }
  return { chyby, varovani };
}

/**
 * Sezóna přijímaček: od 1. 8. do 31. 7. Veletrhy pro přijímačky 2027 se
 * konají na podzim 2026 a v zimě 2027, takže se sezóna odvozuje od dneška.
 */
export function hraniceSezony(dnes: string): [string, string] {
  const rok = Number(dnes.slice(0, 4));
  const od = dnes.slice(5) >= '08-01' ? rok : rok - 1;
  return [`${od}-08-01`, `${od + 1}-07-31`];
}

// ----------------------------------------------------------------------------
// Operace návrhu
// ----------------------------------------------------------------------------

export type Operace =
  | { op: 'pridat'; akce: Veletrh; povolitMinulou?: boolean }
  | { op: 'upravit'; id: string; ocekavanaVerze: number; zmeny: Partial<Veletrh>; povolitMinulou?: boolean }
  | { op: 'odebrat'; id: string; duvod: string };

/** Stav akce, proti kterému se návrh ověřuje. */
export interface StavAkce {
  data: Veletrh;
  verze: number;
  smazano: boolean;
}

/** Jedna položka diffu pro Eduardu a pro schvalovací e-mail. */
export interface ZmenaAkce {
  op: Operace['op'];
  id: string;
  pred: Veletrh | null;
  po: Veletrh | null;
  /** U úpravy verze v databázi, ze které změna vychází. */
  verze?: number;
}

export interface VysledekNavrhu extends VysledekValidace {
  /** Chyba vzniklá kolizí s daty (id existuje, verze nesedí): HTTP 409. */
  konflikt: boolean;
  diff: ZmenaAkce[];
}

export const MAX_OPERACI = 20;

/**
 * Ověří celý návrh proti stavu akcí (mapa id → stav, včetně smazaných).
 * Operace se aplikují postupně na kopii stavu, takže „odebrat + přidat“
 * v jednom návrhu funguje a duplicita se hledá i mezi novými akcemi.
 */
export function overNavrh(
  vstup: unknown,
  stav: Map<string, StavAkce>,
  dnes: string,
): VysledekNavrhu {
  const vysledek: VysledekNavrhu = { chyby: [], varovani: [], konflikt: false, diff: [] };
  const ch = (pole: string, zprava: string) => vysledek.chyby.push({ pole, zprava });

  if (!Array.isArray(vstup) || vstup.length === 0 || vstup.length > MAX_OPERACI) {
    ch('operace', `Návrh musí mít 1 až ${MAX_OPERACI} operací.`);
    return vysledek;
  }

  const pracovni = new Map(stav);
  let pocetKonfliktu = 0;

  vstup.forEach((o: unknown, i: number) => {
    const p = `operace[${i}]`;
    if (o === null || typeof o !== 'object' || Array.isArray(o)) {
      ch(p, 'Operace musí být objekt.');
      return;
    }
    const op = o as Record<string, unknown>;
    const povolitMinulou = op.povolitMinulou === true;
    const pridejVysledek = (r: VysledekValidace) => {
      for (const c of r.chyby) ch(`${p}.${c.pole}`, c.zprava);
      for (const v of r.varovani) vysledek.varovani.push({ pole: `${p}.${v.pole}`, zprava: v.zprava });
    };

    if (op.op === 'pridat') {
      const neznama = Object.keys(op).filter((k) => !['op', 'akce', 'povolitMinulou'].includes(k));
      if (neznama.length) ch(p, `Neznámá pole operace: ${neznama.join(', ')}.`);
      const r = overAkci(op.akce, { dnes, povolitMinulou });
      pridejVysledek(r);
      if (r.chyby.length) return;
      const akce = op.akce as Veletrh;
      if (pracovni.has(akce.id)) {
        ch(`${p}.id`, pracovni.get(akce.id)!.smazano
          ? 'Id patří odebrané akci a znovu se nepoužívá.'
          : 'Akce s tímto id už existuje; na změnu slouží „upravit“.');
        vysledek.konflikt = true;
        pocetKonfliktu++;
        return;
      }
      zkontrolujDuplicity(akce, pracovni, p, vysledek);
      pracovni.set(akce.id, { data: akce, verze: 1, smazano: false });
      vysledek.diff.push({ op: 'pridat', id: akce.id, pred: null, po: akce });
      return;
    }

    if (op.op === 'upravit') {
      const neznama = Object.keys(op).filter((k) => !['op', 'id', 'ocekavanaVerze', 'zmeny', 'povolitMinulou'].includes(k));
      if (neznama.length) ch(p, `Neznámá pole operace: ${neznama.join(', ')}.`);
      const id = typeof op.id === 'string' ? op.id : '';
      const puvodni = pracovni.get(id);
      if (!puvodni || puvodni.smazano) {
        ch(`${p}.id`, 'Akce s tímto id neexistuje.');
        vysledek.konflikt = true;
        pocetKonfliktu++;
        return;
      }
      if (!Number.isInteger(op.ocekavanaVerze)) {
        ch(`${p}.ocekavanaVerze`, 'Povinné: verze akce, ze které změna vychází.');
        return;
      }
      if (op.ocekavanaVerze !== puvodni.verze) {
        ch(`${p}.ocekavanaVerze`, `Akce se mezitím změnila (aktuální verze ${puvodni.verze}).`);
        vysledek.konflikt = true;
        pocetKonfliktu++;
        return;
      }
      if (op.zmeny === null || typeof op.zmeny !== 'object' || Array.isArray(op.zmeny) || !Object.keys(op.zmeny).length) {
        ch(`${p}.zmeny`, 'Změny musí být neprázdný objekt.');
        return;
      }
      if ('id' in (op.zmeny as object)) {
        ch(`${p}.zmeny.id`, 'Id se nemění.');
        return;
      }
      const po = { ...puvodni.data, ...(op.zmeny as Partial<Veletrh>) };
      // Hodnota null v „zmeny“ pole maže, pokud je volitelné.
      for (const [k, v] of Object.entries(op.zmeny as Record<string, unknown>)) {
        if (v === null && ['cas', 'poznamkaTerminu', 'cekaNa', 'terminPribligny', 'zdrojJenAgregator', 'online'].includes(k)) {
          delete (po as Record<string, unknown>)[k];
        }
      }
      const r = overAkci(po, { dnes, povolitMinulou });
      pridejVysledek(r);
      if (r.chyby.length) return;
      const ostatni = new Map(pracovni);
      ostatni.delete(id);
      zkontrolujDuplicity(po, ostatni, p, vysledek);
      pracovni.set(id, { data: po, verze: puvodni.verze + 1, smazano: false });
      vysledek.diff.push({ op: 'upravit', id, pred: puvodni.data, po, verze: puvodni.verze });
      return;
    }

    if (op.op === 'odebrat') {
      const neznama = Object.keys(op).filter((k) => !['op', 'id', 'duvod'].includes(k));
      if (neznama.length) ch(p, `Neznámá pole operace: ${neznama.join(', ')}.`);
      const id = typeof op.id === 'string' ? op.id : '';
      const puvodni = pracovni.get(id);
      if (!puvodni || puvodni.smazano) {
        ch(`${p}.id`, 'Akce s tímto id neexistuje.');
        vysledek.konflikt = true;
        pocetKonfliktu++;
        return;
      }
      if (typeof op.duvod !== 'string' || !op.duvod.trim()) {
        ch(`${p}.duvod`, 'Odebrání musí mít důvod.');
        return;
      }
      pracovni.set(id, { ...puvodni, smazano: true });
      vysledek.diff.push({ op: 'odebrat', id, pred: puvodni.data, po: null });
      return;
    }

    ch(`${p}.op`, 'Operace musí být pridat, upravit, nebo odebrat.');
  });

  // Konflikt je 409 jen tehdy, když jiné chyby nejsou: tvarová chyba má přednost.
  if (vysledek.konflikt && vysledek.chyby.length > pocetKonfliktu) vysledek.konflikt = false;
  return vysledek;
}

function prekryv(a: Veletrh, b: Veletrh): boolean {
  if (!a.start || !b.start) return false;
  return a.start <= (b.end ?? b.start) && b.start <= (a.end ?? a.start);
}

/**
 * Přesná duplicita (týž den, město a název) blokuje. Týž den a město, nebo
 * překryv termínů v jednom městě je jen varování: Jeseník má dvě různé
 * akce v říjnu a obě jsou pravé.
 */
function zkontrolujDuplicity(akce: Veletrh, stav: Map<string, StavAkce>, p: string, v: VysledekNavrhu): void {
  if (!akce.mesto || !akce.start) return;
  const mesto = normalizuj(akce.mesto);
  for (const [id, s] of stav) {
    if (s.smazano || normalizuj(s.data.mesto) !== mesto) continue;
    if (s.data.start === akce.start && normalizuj(s.data.nazev) === normalizuj(akce.nazev)) {
      v.chyby.push({ pole: `${p}.akce`, zprava: `Stejná akce už existuje: ${id}.` });
      return;
    }
    if (s.data.start === akce.start || prekryv(s.data, akce)) {
      v.varovani.push({ pole: `${p}.akce`, zprava: `Možná duplicita: ${id} (${s.data.nazev}, ${s.data.datum ?? s.data.start}).` });
    }
  }
}

// ----------------------------------------------------------------------------
// Automatické zveřejnění (docs/veletrhy-api-2027.md, oddíl 8)
// ----------------------------------------------------------------------------

/** Pole, jejichž změna smí jít na web bez člověka: odkaz a čas u potvrzené akce. */
export const AUTO_POLE = ['url', 'cas'] as const;
/** Pole, která se smějí změnit spolu s nimi (doklad o ověření). */
const AUTO_DOPROVODNA = ['overeno', 'zdrojOvereni'] as const;

/**
 * Smí návrh jít na web bez schválení? Jen když všechny operace upravují
 * existující potvrzenou akci, mění jen odkaz nebo čas (plus datum a zdroj
 * ověření) a validace nevrátila žádné varování. Nikdy: přidání, odebrání,
 * termín, datum slovy, potvrzení termínu, název, město, kraj.
 */
export function jeKAutopublikaci(diff: ZmenaAkce[], varovani: Chyba[]): boolean {
  if (diff.length === 0 || varovani.length > 0) return false;
  const povolena = new Set<string>([...AUTO_POLE, ...AUTO_DOPROVODNA]);
  return diff.every((z) => {
    if (z.op !== 'upravit' || !z.pred || !z.po) return false;
    if (z.pred.terminPotvrzen !== true || z.po.terminPotvrzen !== true) return false;
    const pred = z.pred as unknown as Record<string, unknown>;
    const po = z.po as unknown as Record<string, unknown>;
    const zmenena = [...new Set([...Object.keys(pred), ...Object.keys(po)])]
      .filter((k) => JSON.stringify(pred[k]) !== JSON.stringify(po[k]));
    return zmenena.length > 0
      && zmenena.every((k) => povolena.has(k))
      && zmenena.some((k) => (AUTO_POLE as readonly string[]).includes(k));
  });
}

/** Je automatické zveřejnění zapnuté? Chybějící nebo jiná hodnota = vypnuto. */
export function jeAutopublikaceZapnuta(hodnota = process.env.VELETRHY_AUTOPUBLIKACE): boolean {
  return hodnota === 'zapnuto';
}
