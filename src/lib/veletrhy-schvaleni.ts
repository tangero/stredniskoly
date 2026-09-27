import { overToken, vytvorToken, NOVINKY_BASE_URL } from './novinky-token.ts';
import type { Navrh } from './veletrhy-sklad.ts';
import type { Chyba, ZmenaAkce } from './veletrhy-validace.ts';
import type { Veletrh } from './veletrhy.ts';

// ============================================================================
// Schvalování návrhů změn veletrhů (docs/veletrhy-api-2027.md, oddíl 4.3).
//
// Po založení návrhu jde schvalovateli e-mail s čitelným diffem a podepsaným
// odkazem na /admin/veletrhy/rozhodnuti. GET té stránky nic nemění (poštovní
// skenery odkazy otevírají předem), rozhoduje až POST z formuláře.
//
// Token je HMAC se `VELETRHY_SECRET` ve stejném tvaru jako odkazy novinek.
// Nese jen id návrhu a expiraci; jednorázovost hlídá stav návrhu v databázi.
// ============================================================================

export const PLATNOST_ODKAZU_MS = 14 * 24 * 60 * 60 * 1000;
const VYCHOZI_SCHVALOVATEL = 'patrick@zandl.cz';
/** Schránka Eduardy. Schvalovací odkaz tam nesmí dojít, jinak by si návrh schválila sama. */
const SCHRANKA_EDUARDY = 'eda@prijimackynaskolu.cz';

export function tajemstviSchvaleni(): string | null {
  return process.env.VELETRHY_SECRET || null;
}

/** Účel v podepsaném obsahu: token odkazu novinek tu neprojde ani při shodném tajemství. */
const UCEL = 'veletrh-navrh:';

export function odkazNaRozhodnuti(navrhId: string, secret: string, base = NOVINKY_BASE_URL): string {
  const token = vytvorToken(`${UCEL}${navrhId}`, PLATNOST_ODKAZU_MS, secret);
  return `${base}/admin/veletrhy/rozhodnuti?t=${encodeURIComponent(token)}`;
}

/**
 * Odkaz do zprávy na Telegram: podepsaný jako v e-mailu, aby šel otevřít
 * a schválit rovnou z telefonu bez přihlášení do /admin (rozhodnutí
 * 27. 9. 2026). Chat s botem čte jen zadavatel; kdo zprávu vidí, může
 * návrh schválit. Bez `VELETRHY_SECRET` odkaz do /admin, který potřebuje
 * přihlášení.
 */
export function odkazDoTelegramu(navrhId: string, base = NOVINKY_BASE_URL): string {
  const secret = tajemstviSchvaleni();
  return secret ? odkazNaRozhodnuti(navrhId, secret, base) : `${base}/admin/veletrhy/rozhodnuti?id=${navrhId}`;
}

/** Id návrhu z tokenu, nebo null (podpis, expirace, chybějící tajemství). */
export function navrhZTokenu(token: string | null | undefined): string | null {
  const secret = tajemstviSchvaleni();
  if (!token || !secret) return null;
  const obsah = overToken(token, secret);
  return obsah?.startsWith(UCEL) ? obsah.slice(UCEL.length) : null;
}

/**
 * Adresa schvalovatele. Null znamená chybu konfigurace: adresa je Eduardina
 * (nebo míří do její domény přes alias eda@), a odkaz se proto neposílá.
 */
export function schvalovatel(nastaveny = process.env.VELETRHY_SCHVALOVATEL): string | null {
  const adresa = (nastaveny || VYCHOZI_SCHVALOVATEL).trim().toLowerCase();
  if (adresa === SCHRANKA_EDUARDY || adresa.startsWith('eda@')) return null;
  return adresa;
}

/**
 * Text od Eduardy do e-mailu na jeden řádek. Pochází z cizích e-mailů
 * (prompt injection): s odřádkováním by uměl podvrhnout „Varování: žádná“
 * nebo vlastní odkaz „Schválit“.
 */
function radek(v: unknown, max = 500): string {
  const t = v === undefined || v === null ? '–' : typeof v === 'string' ? v : JSON.stringify(v);
  return t.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').slice(0, max);
}

function hodnota(v: unknown): string {
  return radek(v);
}

/** Diff jako řádky textu: u úprav jen změněná pole „před → po“. */
export function diffTextem(diff: ZmenaAkce[]): string[] {
  const radky: string[] = [];
  for (const z of diff) {
    if (z.op === 'pridat') {
      radky.push(`+ PŘIDAT ${z.id}`);
      for (const [k, v] of Object.entries(z.po as Veletrh)) radky.push(`    ${k}: ${hodnota(v)}`);
    } else if (z.op === 'odebrat') {
      radky.push(`- ODEBRAT ${z.id} (${radek(z.pred?.nazev ?? '')}, ${radek(z.pred?.datum ?? z.pred?.start ?? '')})`);
    } else {
      radky.push(`~ UPRAVIT ${z.id}`);
      const pred = (z.pred ?? {}) as Record<string, unknown>;
      const po = (z.po ?? {}) as Record<string, unknown>;
      for (const k of new Set([...Object.keys(pred), ...Object.keys(po)])) {
        if (JSON.stringify(pred[k]) !== JSON.stringify(po[k])) {
          radky.push(`    ${k}: ${hodnota(pred[k])} → ${hodnota(po[k])}`);
        }
      }
    }
  }
  return radky;
}

export function textEmailu(n: Navrh, diff: ZmenaAkce[], varovani: Chyba[], odkaz: string, automaticky = false): string {
  return [
    automaticky
      ? `Změna veletrhů od ${radek(n.autor)} ZVEŘEJNĚNA AUTOMATICKY (mění jen odkaz nebo čas potvrzené akce).`
      : `Nový návrh změny veletrhů od: ${radek(n.autor)}`,
    '',
    ...diffTextem(diff),
    '',
    'Text od Eduardy (neověřený, jeden řádek na pole):',
    `  Zdroj: ${radek(n.zdroj_url)}`,
    `  E-mail / reference: ${radek(n.zdroj_email)}`,
    n.poznamka ? `  Poznámka: ${radek(n.poznamka, 2000)}` : '',
    varovani.length ? `\nVarování validátoru:\n${varovani.map((v) => `  ! ${radek(v.pole)}: ${radek(v.zprava)}`).join('\n')}` : '\nVarování validátoru: žádná',
    '',
    automaticky
      ? `Vrátit změnu (jediný platný odkaz, vede na www.prijimackynaskolu.cz/admin): ${odkaz}`
      : `Schválit nebo zamítnout (jediný platný odkaz, vede na www.prijimackynaskolu.cz/admin): ${odkaz}`,
    'Odkaz platí 14 dní. Otevření stránky nic nemění, rozhoduje až tlačítko.',
  ].filter((r) => r !== '').join('\n');
}

/** Pošle schvalovací e-mail přes Resend. Best-effort: selhání vrací false. */
export async function posliKeSchvaleni(n: Navrh, diff: ZmenaAkce[], varovani: Chyba[], automaticky = false): Promise<boolean> {
  const secret = tajemstviSchvaleni();
  const komu = schvalovatel();
  const klic = process.env.RESEND_API_KEY;
  if (!secret || !komu) {
    console.error('❌ Veletrhy: schvalovací e-mail nejde poslat (chybí VELETRHY_SECRET nebo platný schvalovatel).');
    return false;
  }
  const text = textEmailu(n, diff, varovani, odkazNaRozhodnuti(n.id, secret), automaticky);
  if (!klic) {
    console.log(`[veletrhy] návrh ${n.id} čeká na schválení (Resend není nastaven).`);
    return false;
  }
  try {
    const odpoved = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${klic}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Přijímačky na školu <noreply@prijimackynaskolu.cz>',
        to: komu,
        subject: `Veletrhy: ${automaticky ? 'zveřejněno automaticky' : 'návrh ke schválení'} (${diff.map((z) => z.id).join(', ').slice(0, 120)})`,
        text,
      }),
    });
    if (!odpoved.ok) console.error(`❌ Veletrhy: Resend odmítl schvalovací e-mail (HTTP ${odpoved.status}).`);
    return odpoved.ok;
  } catch (e) {
    console.error('❌ Veletrhy: schvalovací e-mail neodešel', e);
    return false;
  }
}

/** Výsledek rozhodnutí, jak ho trasa vrací stránce. Text je jen tady. */
export const VYSLEDKY = {
  provedeno: { ok: true, text: 'Provedeno. Změna je na webu do pár minut.' },
  zamitnuto: { ok: true, text: 'Návrh zamítnut.' },
  'uz-rozhodnuto': { ok: true, text: 'O návrhu už bylo rozhodnuto, nic se nezměnilo.' },
  'nelze-provest': { ok: false, text: 'Návrh proti dnešnímu stavu neprošel, nic se nezměnilo. Zamítněte ho, Eduarda pošle nový.' },
  'chybi-duvod': { ok: false, text: 'Zamítnutí musí mít důvod.' },
  'neznama-akce': { ok: false, text: 'Neznámá akce.' },
  nenalezen: { ok: false, text: 'Návrh neexistuje.' },
  'bez-db': { ok: false, text: 'Databáze není nastavena.' },
  selhalo: { ok: false, text: 'Rozhodnutí selhalo, podrobnosti jsou v logu.' },
  vraceno: { ok: true, text: 'Vráceno. Akce jsou ve stavu před návrhem, web se obnoví do pár minut.' },
  'uz-vraceno': { ok: true, text: 'Návrh už byl vrácen, nic se nezměnilo.' },
  'nelze-vratit': { ok: false, text: 'Návrh nejde vrátit: jde jen provedený návrh a jen dokud se jeho akce od té doby nezměnily. Pošlete nový návrh.' },
} as const;

export type KodVysledku = keyof typeof VYSLEDKY;
