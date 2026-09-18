// ============================================================================
// Připojení k databázi odběru (Neon Postgres).
//
// Postup z docs/novinky-k-prijimackam-2027.md, oddíl 6 potřebuje interaktivní
// transakce (A, B, C), proto `Pool`, ne bezstavové HTTP rozhraní `transaction()`.
// Ovladač se importuje líně, aby se moduly bez databáze daly testovat samostatně.
//
// Bez DATABASE_URL se odběr chová jako nenakonfigurovaný: API vrátí 503,
// stejný vzor jako portál pro školy bez RESEND_API_KEY.
// ============================================================================

export interface Vysledek<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface Spojeni {
  dotaz<T = Record<string, unknown>>(sql: string, hodnoty?: unknown[]): Promise<Vysledek<T>>;
}

/** Je odběr nakonfigurovaný? Bez připojení nesmí formulář nic slibovat. */
export function jeDbNastavena(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

interface PoolLike {
  connect(): Promise<ClientLike>;
  query(sql: string, hodnoty?: unknown[]): Promise<Vysledek>;
}

interface ClientLike {
  query(sql: string, hodnoty?: unknown[]): Promise<Vysledek>;
  release(): void;
}

let pool: PoolLike | null = null;

async function ziskejPool(): Promise<PoolLike> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL není nastaven');
  const { Pool } = (await import('@neondatabase/serverless')) as unknown as {
    Pool: new (config: { connectionString: string }) => PoolLike;
  };
  pool = new Pool({ connectionString: url });
  return pool;
}

/** Jeden dotaz bez transakce. */
export async function dotaz<T = Record<string, unknown>>(
  sql: string,
  hodnoty: unknown[] = [],
): Promise<Vysledek<T>> {
  const p = await ziskejPool();
  return (await p.query(sql, hodnoty)) as Vysledek<T>;
}

/**
 * Interaktivní transakce. Chyba uvnitř znamená `rollback`, takže se nikdy
 * nezapíše polovina přechodu stavu.
 */
export async function vTransakci<T>(prace: (s: Spojeni) => Promise<T>): Promise<T> {
  const p = await ziskejPool();
  const klient = await p.connect();
  const spojeni: Spojeni = {
    dotaz: async (sql, hodnoty = []) => (await klient.query(sql, hodnoty)) as never,
  };
  try {
    await klient.query('begin');
    const vysledek = await prace(spojeni);
    await klient.query('commit');
    return vysledek;
  } catch (chyba) {
    try {
      await klient.query('rollback');
    } catch {
      // Rollback po ztraceném spojení nemá co zachránit.
    }
    throw chyba;
  } finally {
    klient.release();
  }
}

/** Pro testy: vloží připravené spojení místo skutečného poolu. */
export function nastavPoolProTesty(nahrada: PoolLike | null): void {
  pool = nahrada;
}
