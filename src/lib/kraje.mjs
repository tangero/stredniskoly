/** Kraje, jejichž nadpis není „<název> kraj“. Klíč je kód, ne řetězec názvu. */
const NADPIS_VYJIMKY = {
  CZ010: 'Hlavní město Praha',
  CZ063: 'Kraj Vysočina',
};

/**
 * Název kraje pro nadpis podle kódu: „Středočeský kraj“, „Kraj Vysočina“,
 * „Hlavní město Praha“. Používá přehled veletrhů. Stránka kraje a hlavička
 * mají zatím vlastní starší podobu („Vysočina“ bez slova kraj); sjednocení
 * je samostatná změna, protože mění titulky indexovaných stránek.
 */
export function nadpisKraje(kod) {
  return NADPIS_VYJIMKY[kod] ?? `${krajNames[kod] ?? kod} kraj`;
}

/** Krátký název pro čip nebo štítek: „Praha“, „Vysočina“, „Středočeský“. */
export function cipKraje(kod) {
  return kod === 'CZ010' ? 'Praha' : (krajNames[kod] ?? kod);
}

/**
 * Všech čtrnáct krajů abecedně podle krátkého názvu (Vysočina pod V, i když
 * nadpis zní „Kraj Vysočina“), aby čipy a oddíly šly ve stejném pořadí.
 * Modul je bez dat, takže ho mohou importovat i klientské komponenty.
 */
export function vsechnyKraje() {
  return Object.entries(krajNames)
    .map(([kod, nazev]) => ({ kod, nazev }))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
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
