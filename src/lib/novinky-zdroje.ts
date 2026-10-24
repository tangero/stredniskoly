// ============================================================================
// Místa, odkud se dá přihlásit k odběru (#523, E1). Zdroj se ukládá do žádosti,
// odběru i dokladu souhlasu a podle něj se v administraci počítají odběry.
// Hodnota mimo seznam se uloží jako `neznamy`.
// ============================================================================

export const POVOLENE_ZDROJE: readonly string[] = [
  'titulka-karta',
  'titulka-pas',
  'paticka',
  'kalendar',
  'novinky',
  'simulator',
  'pruvodce',
  'skola',
  // Profil školy s kontextovým nadpisem („Termíny a novinky…“). Vlastní zdroj,
  // aby šlo srovnat s původním „skola“; ten zůstává kvůli dřívějším odběrům.
  'skola-kontext',
  // Zdroje dalších míst z #523; formulář na nich přibývá s etapami E2 až E6.
  'simulator-vysledek',
  'simulator-zvazovane',
  'pruvodce-jak-vybrat',
  'kalendar-pripominky',
  'skola-hlidat',
];

export function urciZdroj(hodnota: unknown): string {
  return typeof hodnota === 'string' && POVOLENE_ZDROJE.includes(hodnota) ? hodnota : 'neznamy';
}
