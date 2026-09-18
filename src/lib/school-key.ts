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

/**
 * Z mapy nabídek (public/offer_mapping_{rok}.json) index normalizovaný klíč stránky → normalizovaný
 * klíč nabídky v ročníku. Stránka nese loňský klíč katalogu, zdroje ročníku klíč z dat CERMAT;
 * klíč, na který by mířily dvě nabídky, v indexu není.
 */
export function indexKlicuRocniku(mapa: Record<string, { katalog_id?: string } | null>): Map<string, string> {
  const index = new Map<string, string>();
  const kolize = new Set<string>();
  for (const [ident, zaznam] of Object.entries(mapa)) {
    if (!zaznam?.katalog_id) continue;
    const stranka = normalizeSchoolKey(zaznam.katalog_id);
    if (index.has(stranka)) kolize.add(stranka);
    else index.set(stranka, normalizeSchoolKey(ident));
  }
  kolize.forEach(k => index.delete(k));
  return index;
}

/**
 * Klíč záznamu zdroje ročníku pro stránku. Přednost má letošní nabídka podle mapy nabídek,
 * pak vlastní klíč stránky; bere se první, pro který zdroj nese data zobrazeného ročníku.
 * `indexZdroje` vede normalizovaný klíč na klíč ve zdroji.
 */
export function klicZdrojeProStranku(
  programId: string,
  indexRocniku: Map<string, string>,
  indexZdroje: Map<string, string>,
  maRocnik: (klic: string) => boolean,
): string | undefined {
  const vlastni = normalizeSchoolKey(programId);
  return [indexRocniku.get(vlastni), vlastni]
    .map(k => (k ? indexZdroje.get(k) : undefined))
    .find((k): k is string => k !== undefined && maRocnik(k));
}
