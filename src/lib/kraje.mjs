/**
 * Název kraje pro nadpis: „Středočeský kraj“, „Kraj Vysočina“, „Hlavní
 * město Praha“. Používá přehled veletrhů. Stránka kraje a hlavička mají
 * zatím vlastní starší podobu („Vysočina“ bez slova kraj); sjednocení je
 * samostatná změna, protože mění titulky indexovaných stránek.
 */
export function nadpisKraje(nazev) {
  if (nazev === 'Vysočina') return 'Kraj Vysočina';
  if (nazev === 'Hlavní město Praha') return nazev;
  return `${nazev} kraj`;
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
