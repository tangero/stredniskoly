export const MAX_SELECTION = 30;

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
