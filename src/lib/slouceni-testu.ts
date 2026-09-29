/**
 * Jak se víc zadaných výsledků cvičných testů slučuje do jednoho čísla.
 * Stránka oboru bere prostřední hodnotu (u dvou průměr), simulátor nejhorší výsledek.
 */
export type SlouceniTestu = 'median' | 'nejhorsi';

/** Popis sloučení do věty „{kde} … (N bodů)“; vrací text bez počtu bodů. */
export function popisSlouceni(slouceni: SlouceniTestu, pocet: number): string {
  if (slouceni === 'nejhorsi') return pocet === 2 ? 'horším z obou výsledků' : `nejhorším z ${pocet} výsledků`;
  return pocet === 2 ? 'průměr obou výsledků' : `prostřední z ${pocet} výsledků`;
}

/** Hodnota, se kterou se po sloučení počítá. */
export function slouceneBody(slouceni: SlouceniTestu, body: number[], median: (x: number[]) => number | null): number | null {
  if (!body.length) return null;
  return slouceni === 'nejhorsi' ? Math.min(...body) : median(body);
}
