/** Český tvar podle počtu: 1 uchazeč, 2–4 uchazeči, 5 a víc uchazečů. */
export function tvar(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return jeden;
  if (n >= 2 && n <= 4) return dva;
  return pet;
}

export const cislo = (v: number) => v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
