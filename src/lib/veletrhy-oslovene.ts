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
 *
 * Adresy bere z dnešního seznamu, ne z toho, co tehdy odešlo, proto slouží
 * jen k založení evidence (viz `nactiOslovene`). Jakmile evidence existuje,
 * pozdější úpravy seznamu by jinak přepisovaly historii: adresa doplněná
 * k odeslanému adresátovi by se tvářila jako oslovená, aniž co dostala.
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

/**
 * Evidence, podle které se rozesílá: uložená, pokud existuje, jinak odvozená
 * z odeslano.json. Obojí najednou se neslučuje, viz `osloveneZOdeslanych`.
 */
export function nactiOslovene(
  ulozena: OsloveneAdresy | null,
  seznam: { id: string; email: string | string[] }[],
  odeslano: Record<string, string>,
): OsloveneAdresy {
  return ulozena ?? osloveneZOdeslanych(seznam, odeslano);
}

/**
 * Komu dopis v tomto běhu půjde. Adresa se nevybere dvakrát ani v jednom
 * běhu: dva noví adresáti téhož pořadatele se stejnou adresou (dvě burzy
 * s `info@…`) by jinak dostali dopis oba, protože evidence se zapisuje až
 * po odeslání. Hlídá se to i s `znovu`, které obchází jen dřívější rozesílky.
 */
export function vyberAdresaty<A extends { id: string; email: string | string[] }>(
  seznam: A[],
  odeslano: Record<string, string>,
  oslovene: OsloveneAdresy,
  { jen = [], znovu = false }: { jen?: string[]; znovu?: boolean } = {},
): { vyber: A[]; preskoceni: string[] } {
  const vBehu: OsloveneAdresy = {};
  const vyber: A[] = [];
  const preskoceni: string[] = [];
  for (const a of seznam) {
    if (jen.length && !jen.includes(a.id)) continue;
    if (!znovu && odeslano[a.id]) continue;
    const { nove: noveProti, uzOslovene } = znovu
      ? { nove: [a.email].flat(), uzOslovene: [] as string[] }
      : rozdelAdresy(a.email, oslovene);
    const { nove, uzOslovene: vTomtoBehu } = rozdelAdresy(noveProti, vBehu);
    if (nove.length === 0) {
      preskoceni.push(`${a.id}: žádná nová adresa (${[...uzOslovene, ...vTomtoBehu].join(', ')})`);
      continue;
    }
    if (uzOslovene.length) preskoceni.push(`${a.id}: vyřazeno ${uzOslovene.join(', ')}, už osloveno`);
    for (const e of vTomtoBehu) {
      preskoceni.push(`${a.id}: vyřazeno ${e}, dostane dopis v tomto běhu jako ${vBehu[normalizujAdresu(e)].adresat}`);
    }
    for (const e of nove) vBehu[normalizujAdresu(e)] = { datum: 'tento běh', adresat: a.id };
    const zmena = uzOslovene.length + vTomtoBehu.length > 0;
    vyber.push(zmena ? { ...a, email: nove.length === 1 ? nove[0] : nove } : a);
  }
  return { vyber, preskoceni };
}
