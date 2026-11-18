// ============================================================================
// Je hlídání škol zapnuté (#523, E6)? Tlačítko „Hlídat tuhle školu“ i přihlášení
// k hlídání potřebují zapnutý odběr (`NOVINKY_ZAPNUTO=1`) a navíc
// `HLIDANI_ZAPNUTO=1`. Druhou proměnnou nastaví vlastník, až v produkci proběhne
// migrace 012 (sloupce `ucel` a `skoly` v žádosti o potvrzení).
// ============================================================================

export function jeHlidaniZapnuto(env: Record<string, string | undefined> = process.env): boolean {
  return env.NOVINKY_ZAPNUTO === '1' && env.HLIDANI_ZAPNUTO === '1';
}
