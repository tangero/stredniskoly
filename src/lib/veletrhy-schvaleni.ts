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

export function odkazNaRozhodnuti(navrhId: string, secret: string, base = NOVINKY_BASE_URL): string {
  const token = vytvorToken(navrhId, PLATNOST_ODKAZU_MS, secret);
  return `${base}/admin/veletrhy/rozhodnuti?t=${encodeURIComponent(token)}`;
}

/** Id návrhu z tokenu, nebo null (podpis, expirace, chybějící tajemství). */
export function navrhZTokenu(token: string | null | undefined): string | null {
  const secret = tajemstviSchvaleni();
  if (!token || !secret) return null;
  return overToken(token, secret);
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

function hodnota(v: unknown): string {
  if (v === undefined) return '–';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

/** Diff jako řádky textu: u úprav jen změněná pole „před → po“. */
export function diffTextem(diff: ZmenaAkce[]): string[] {
  const radky: string[] = [];
  for (const z of diff) {
    if (z.op === 'pridat') {
      radky.push(`+ PŘIDAT ${z.id}`);
      for (const [k, v] of Object.entries(z.po as Veletrh)) radky.push(`    ${k}: ${hodnota(v)}`);
    } else if (z.op === 'odebrat') {
      radky.push(`- ODEBRAT ${z.id} (${z.pred?.nazev ?? ''}, ${z.pred?.datum ?? z.pred?.start ?? ''})`);
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

export function textEmailu(n: Navrh, diff: ZmenaAkce[], varovani: Chyba[], odkaz: string): string {
  return [
    `Nový návrh změny veletrhů od: ${n.autor}`,
    '',
    ...diffTextem(diff),
    '',
    `Zdroj: ${n.zdroj_url ?? '–'}`,
    `E-mail / reference: ${n.zdroj_email ?? '–'}`,
    n.poznamka ? `Poznámka: ${n.poznamka}` : '',
    varovani.length ? `\nVarování:\n${varovani.map((v) => `  ! ${v.pole}: ${v.zprava}`).join('\n')}` : '',
    '',
    `Schválit nebo zamítnout: ${odkaz}`,
    'Odkaz platí 14 dní. Otevření stránky nic nemění, rozhoduje až tlačítko.',
  ].filter((r) => r !== '').join('\n');
}

/** Pošle schvalovací e-mail přes Resend. Best-effort: selhání vrací false. */
export async function posliKeSchvaleni(n: Navrh, diff: ZmenaAkce[], varovani: Chyba[]): Promise<boolean> {
  const secret = tajemstviSchvaleni();
  const komu = schvalovatel();
  const klic = process.env.RESEND_API_KEY;
  if (!secret || !komu) {
    console.error('❌ Veletrhy: schvalovací e-mail nejde poslat (chybí VELETRHY_SECRET nebo platný schvalovatel).');
    return false;
  }
  const text = textEmailu(n, diff, varovani, odkazNaRozhodnuti(n.id, secret));
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
        subject: `Veletrhy: návrh ke schválení (${diff.map((z) => z.id).join(', ').slice(0, 120)})`,
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
