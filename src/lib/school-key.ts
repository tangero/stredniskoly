/** Sjednotí jen zápis zaměření. Zachová REDIZO i KKOV; nepáruje přejmenované obory. */
export function normalizeSchoolKey(id: string): string {
  const [redizo, kkov, ...focus] = id.split('_');
  const suffix = focus.join('_').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return `${redizo}_${kkov}${suffix ? `_${suffix}` : ''}`;
}

/** Kolizi odstraní z indexu místo výběru náhodného zaměření. */
export function uniqueSchoolIndex<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const index = new Map<string, T>();
  const ambiguous = new Set<string>();
  for (const row of rows) {
    const id = normalizeSchoolKey(key(row));
    if (index.has(id)) ambiguous.add(id);
    else index.set(id, row);
  }
  for (const id of ambiguous) index.delete(id);
  return index;
}
