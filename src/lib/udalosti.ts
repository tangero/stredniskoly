import { randomUUID } from 'crypto';
import type { Spojeni } from './novinky-db.ts';
import type { TypUdalosti } from './udalosti-schema.ts';

// ============================================================================
// Zápis události pro sledování škol (tabulky `udalost` a `udalost_skola`).
//
// Model a pravidla: docs/sledovani-skol-2027.md, oddíl 2. Událost vzniká jen
// při publikaci změny a nese hotovou větu souhrnu. Odesílač (E5) z ní teprve
// skládá e-mail; tady se nic neposílá.
// ============================================================================

export interface NovaUdalost {
  /** Unikátní klíč; stejná publikace nesmí vyrobit druhou událost. */
  klic: string;
  typ: TypUdalosti;
  sada?: string | null;
  obdobi?: string | null;
  /** Škola, které se událost týká, u událostí jedné školy. */
  redizo?: string | null;
  veta: string;
  odkaz?: string | null;
  /** Dotčené školy (RED IZO); u hromadné události stovky. */
  skoly: string[];
}

/** Počet škol v jednom vložení; drží dotaz hluboko pod limity parametrů. */
const SKOL_NA_DAVKU = 500;

/**
 * Zapíše událost a její školy. Vrací `true`, když vznikla nová; opakovaný
 * zápis téhož `klic` nic nezmění a vrátí `false`. Volá se v transakci.
 */
export async function zapisUdalost(s: Spojeni, u: NovaUdalost): Promise<boolean> {
  const skoly = [...new Set(u.skoly)];
  if (skoly.length === 0) return false;
  const vlozeno = await s.dotaz<{ id: string }>(
    `insert into udalost (id, klic, typ, sada, obdobi, redizo, veta, odkaz)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (klic) do nothing
     returning id`,
    [randomUUID(), u.klic, u.typ, u.sada ?? null, u.obdobi ?? null, u.redizo ?? null, u.veta, u.odkaz ?? null],
  );
  const id = vlozeno.rows[0]?.id;
  if (!id) return false;
  for (let i = 0; i < skoly.length; i += SKOL_NA_DAVKU) {
    await s.dotaz(
      `insert into udalost_skola (udalost_id, redizo)
       select $1, unnest($2::text[]) on conflict do nothing`,
      [id, skoly.slice(i, i + SKOL_NA_DAVKU)],
    );
  }
  return true;
}

/**
 * Totéž jako `zapisUdalost`, ale selhání zápisu události nesmí shodit
 * publikaci, která ji způsobila (uložení profilu školy). Zápis běží
 * v bodu uložení transakce, takže chyba, třeba chybějící tabulka před
 * spuštěním migrace 004, vrátí jen vlastní příkazy a transakce pokračuje.
 */
export async function zapisUdalostNekriticky(s: Spojeni, u: NovaUdalost): Promise<boolean> {
  try {
    await s.dotaz('savepoint zapis_udalosti');
  } catch {
    return false;
  }
  try {
    const nova = await zapisUdalost(s, u);
    await s.dotaz('release savepoint zapis_udalosti');
    return nova;
  } catch (chyba) {
    console.error('Událost sledování se nezapsala', (chyba as { code?: string }).code ?? 'bez kódu');
    try {
      await s.dotaz('rollback to savepoint zapis_udalosti');
    } catch {
      // Spojení je pryč; transakce stejně skončí chybou sama.
    }
    return false;
  }
}
