// ============================================================================
// Evidence adres, na které už dopis pořadatelům veletrhů odešel.
//
// Rozesílka dřív hlídala jen id adresáta (odeslano.json). Stejná adresa pod
// jiným id — nová akce téhož pořadatele, přejmenovaný záznam, druhý kontakt
// z rešerše — by dopis dostala znovu. Pořadatel, kterého jsme už oslovili,
// se znovu neoslovuje, proto se hlídá adresa, ne záznam.
// ============================================================================

/** Adresa → kdy a pod jakým adresátem jí dopis odešel. */
export type OsloveneAdresy = Record<string, { datum: string; adresat: string }>;

/** Adresy se porovnávají bez ohledu na velikost písmen a okrajové mezery. */
export function normalizujAdresu(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Rozdělí adresy adresáta na ty, které ještě dopis nedostaly, a ty, které ano.
 * Když nezbude žádná nová, adresát se celý přeskočí.
 */
export function rozdelAdresy(
  email: string | string[],
  oslovene: OsloveneAdresy,
): { nove: string[]; uzOslovene: string[] } {
  const znama = new Set(Object.keys(oslovene).map(normalizujAdresu));
  const nove: string[] = [];
  const uzOslovene: string[] = [];
  for (const e of [email].flat()) {
    (znama.has(normalizujAdresu(e)) ? uzOslovene : nove).push(e);
  }
  return { nove, uzOslovene };
}

/**
 * Evidence odvozená ze starého záznamu odeslano.json ({ id: datum }).
 * Rozesílka z 23. 9. 2026 proběhla dřív, než se adresy evidovaly; bez
 * dosévání by se její adresáti tvářili jako neoslovení.
 */
export function osloveneZOdeslanych(
  seznam: { id: string; email: string | string[] }[],
  odeslano: Record<string, string>,
): OsloveneAdresy {
  const vysledek: OsloveneAdresy = {};
  for (const a of seznam) {
    const datum = odeslano[a.id];
    if (!datum) continue;
    for (const e of [a.email].flat()) {
      vysledek[normalizujAdresu(e)] ??= { datum, adresat: a.id };
    }
  }
  return vysledek;
}
