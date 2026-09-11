/** Uložený výběr nemá produktový strop: rodina smí zvažovat desítky kandidátů.
 * Mez existuje jen jako pojistka proti poškozenému úložišti, ne jako pravidlo výběru.
 */
export const MAX_SELECTION = 300;

/** Sdílený odkaz omezuje délka adresy, nikoli počet oborů. Identifikátory mají
 * různou délku, takže se měří hotová adresa, ne počet položek.
 */
export const MAX_SHARE_URL_LENGTH = 1900;

export function readScore(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 50 ? number : null;
}

/** Nové odkazy používají JSON pole: názvy zaměření mohou obsahovat čárku.
 * Staré odkazy s čárkovým oddělovačem zůstávají čitelné.
 */
export function readSchoolIds(value: string | null, limit = 200): string[] {
  let ids: unknown;
  if (value?.trim().startsWith('[')) {
    try { ids = JSON.parse(value); } catch { return []; }
  } else ids = (value || '').split(',');
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.filter((id): id is string => typeof id === 'string')
    .map(id => id.trim()).filter(id => id.length > 0 && id.length <= 220))).slice(0, limit);
}

export function readSelection(value: string | null): string[] {
  return readSchoolIds(value, MAX_SELECTION);
}

/** Odkaz nese jen tolik oborů, kolik se do adresy vejde celé.
 * Zkrácení je vždy viditelné: volající musí rozdíl proti uloženému výběru sdělit.
 */
export function selectionForShare(ids: string[], origin: string, maxLength = MAX_SHARE_URL_LENGTH): string[] {
  const fits = (count: number) => shareUrlFor(ids.slice(0, count), origin).length <= maxLength;
  if (!ids.length || fits(ids.length)) return ids;
  let low = 0, high = ids.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(middle)) low = middle; else high = middle - 1;
  }
  return ids.slice(0, low);
}

/** Jediné místo, kde vzniká podoba sdíleného odkazu; měření i sdílení musí souhlasit. */
export function shareUrlFor(ids: string[], origin: string): string {
  const shared = new URLSearchParams();
  if (ids.length) shared.set('skoly', JSON.stringify(ids));
  shared.set('vyber', '1');
  return `${origin}/simulator?${shared}`;
}

/** Sdílení obsahuje jen veřejné nastavení simulátoru, nikoli jiné parametry URL. */
export function sharedSimulatorParams(params: URLSearchParams): URLSearchParams {
  const shared = new URLSearchParams();
  for (const key of ['cj', 'ma']) {
    const score = readScore(params.get(key));
    if (score !== null) shared.set(key, String(score));
  }
  const ids = readSelection(params.get('skoly'));
  if (ids.length) shared.set('skoly', JSON.stringify(ids));
  if (params.get('srovnani') === '1') shared.set('srovnani', '1');
  return shared;
}
