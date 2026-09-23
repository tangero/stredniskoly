/** Kraje, jejichž název nenese slovo „kraj“ jako přívlastek za jménem. */
const BEZ_PRIVLASTKU_KRAJ = new Set(['Hlavní město Praha', 'Vysočina']);

/**
 * Název kraje pro nadpis: „Středočeský kraj“, „Kraj Vysočina“, „Hlavní
 * město Praha“. Jediné místo pro tohle pravidlo; stránka kraje i přehled
 * veletrhů ho berou odsud.
 */
export function nadpisKraje(nazev) {
  if (nazev === 'Vysočina') return 'Kraj Vysočina';
  return BEZ_PRIVLASTKU_KRAJ.has(nazev) ? nazev : `${nazev} kraj`;
}

/** @type {Record<string, string>} */
export const krajNames = {
  'CZ010': 'Hlavní město Praha',
  'CZ020': 'Středočeský',
  'CZ031': 'Jihočeský',
  'CZ032': 'Plzeňský',
  'CZ041': 'Karlovarský',
  'CZ042': 'Ústecký',
  'CZ051': 'Liberecký',
  'CZ052': 'Královéhradecký',
  'CZ053': 'Pardubický',
  'CZ063': 'Vysočina',
  'CZ064': 'Jihomoravský',
  'CZ071': 'Olomoucký',
  'CZ072': 'Zlínský',
  'CZ080': 'Moravskoslezský'
};
