/**
 * Dotaz pro hledání na stránce /skoly z adresy (`?search=…`). Na tuto adresu vede hledání v hlavičce
 * po stisku Enter (#571). Bez parametru vrací prázdný text.
 */
export function dotazZAdresy(search: string): string {
  return (new URLSearchParams(search).get('search') ?? '').trim();
}
