export const NEARBY_MINUTES = 10;

/** Neznámé párování není dojezd mimo limit. Ostatní filtry se aplikují předem. */
export function splitByCommute<T extends { id: string }>(
  schools: T[], limit: number,
  minutesFor: (school: T) => number | undefined,
  isMapped: (school: T) => boolean,
) {
  const within: T[] = [], near: T[] = [], unknown: T[] = [];
  for (const school of schools) {
    const minutes = minutesFor(school);
    if (minutes !== undefined && Number.isFinite(minutes) && minutes >= 0) {
      if (minutes <= limit) within.push(school);
      else if (minutes <= limit + NEARBY_MINUTES) near.push(school);
    } else if (!isMapped(school)) unknown.push(school);
  }
  const byTime = (a: T, b: T) => (minutesFor(a) ?? Infinity) - (minutesFor(b) ?? Infinity);
  return { within: within.sort(byTime), near: near.sort(byTime), unknown };
}
