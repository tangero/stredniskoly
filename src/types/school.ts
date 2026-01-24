export interface School {
  id: string;
  redizo: string;
  kod_oboru: string;
  nazev: string;
  obor: string;
  obec: string;
  okres: string;
  orp: string;
  kraj: string;
  kraj_kod: string;
  adresa: string;
  adresa_plna: string;
  zrizovatel: string;
  typ: string;
  delka_studia: number;
  min_body: number;
  prumer_body: number;
  kapacita: number;
  prihlasky: number;
  prijati: number;
  index_poptavky: number;
  obtiznost: number;
  total_applicants: number;
  priority_counts: number[];
  priority_pcts: number[];
  category_code: 'first_choice' | 'preferred' | 'balanced' | 'backup';
  category_name: string;
}

export interface SchoolAnalysis {
  [key: string]: School;
}

export interface SchoolData {
  id: string;
  redizo: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  obec: string;
  okres: string;
  kraj: string;
  kraj_kod: string;
  typ: string;
  typ_full: string;
  delka_studia: number;
  kapacita_2025: number;
  prihlasky_2025: number;
  prijati_2025: number;
  min_body_2025: number;
  prumer_2025: number;
  index_poptavky_2025: number;
  kapacita_2024?: number;
  prihlasky_2024?: number;
  prijati_2024?: number;
  min_body_2024?: number;
  prumer_2024?: number;
  index_poptavky_2024?: number;
  mestska_cast?: string;
}

export interface SchoolsData {
  [key: string]: SchoolData;
}

export type CategoryCode = 'first_choice' | 'preferred' | 'balanced' | 'backup';

export const categoryLabels: Record<CategoryCode, string> = {
  first_choice: 'První volba',
  preferred: 'Preferovaná',
  balanced: 'Vyvážená',
  backup: 'Záložní'
};

export const categoryColors: Record<CategoryCode, { bg: string; text: string }> = {
  first_choice: { bg: 'bg-green-100', text: 'text-green-800' },
  preferred: { bg: 'bg-blue-100', text: 'text-blue-800' },
  balanced: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  backup: { bg: 'bg-red-100', text: 'text-red-800' }
};

export const krajNames: Record<string, string> = {
  'CZ010': 'Praha',
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
