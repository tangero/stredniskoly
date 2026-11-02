// ============================================================================
// Souhrnný e-mail hlídání škol (docs/sledovani-skol-2027.md, oddíl 3).
//
// Čistá funkce bez databáze a bez sítě: ze seznamu událostí pro školy jednoho
// odběratele složí předmět, text a HTML. Pravidla z návrhu:
//  - jedna věta na typ události, pod ní seznam škol s odkazem,
//  - jeden e-mail, i když se víc událostí týká téže školy,
//  - nejdřív to, co mění rozhodování rodiny, potom inspekce,
//  - bez čísel a bez dat: věta události je hotová z okamžiku publikace
//    a e-mail ji nepřepisuje (P2: termín dne otevřených dveří nikdy nevyhlašuje
//    jako datum, protože ho škola zadává volným textem).
// ============================================================================

export const ZAKLAD_ODKAZU = 'https://www.prijimackynaskolu.cz';

export interface RadekUdalosti {
  udalostId: string;
  typ: string;
  /** Hotová věta souhrnu zapsaná při publikaci. */
  veta: string;
  /** Odkaz na změněnou část stránky; relativní nebo absolutní. */
  odkaz: string | null;
  redizo: string;
}

export interface SkolaSNazvem {
  redizo: string;
  nazev: string;
}

export interface SouhrnHlidani {
  predmet: string;
  text: string;
  /** Tělo bez obálky a bez patičky; patičku skládá odesílač s odkazy odběratele. */
  html: string;
  /** Počet různých škol, kterých se souhrn týká. */
  skol: number;
}

/** Pořadí vět: nejdřív to, co mění rozhodování rodiny, potom inspekce. */
const PORADI_TYPU: Record<string, number> = {
  sada_prepnuta: 0,
  portal_schvalen: 1,
  novinka_skoly: 2,
  inspekce_nova: 3,
};

function poradi(typ: string): number {
  return PORADI_TYPU[typ] ?? 9;
}

function escapuj(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Odkaz do e-mailu: jen adresy webu, relativní se doplní, cizí se zahodí. */
export function odkazDoEmailu(odkaz: string | null, redizo: string): string {
  const vychozi = `${ZAKLAD_ODKAZU}/skola/${encodeURIComponent(redizo)}`;
  if (!odkaz) return vychozi;
  if (odkaz.startsWith('/') && !odkaz.startsWith('//')) return `${ZAKLAD_ODKAZU}${odkaz}`;
  if (odkaz.startsWith(`${ZAKLAD_ODKAZU}/`)) return odkaz;
  return vychozi;
}

/** „na 1 škole“, „na 3 školách“: předmět s počtem hlídaných škol, kterých se týká novinka. */
export function predmetSouhrnu(skol: number): string {
  return skol === 1
    ? 'Novinky na 1 škole, kterou hlídáte'
    : `Novinky na ${skol} školách, které hlídáte`;
}

/**
 * Složí souhrn. Vrací null, když není co poslat (žádná událost), aby se v den
 * bez události nic neposílalo.
 */
export function slozSouhrn(radky: RadekUdalosti[], skoly: SkolaSNazvem[]): SouhrnHlidani | null {
  if (radky.length === 0) return null;
  const nazvy = new Map(skoly.map((s) => [s.redizo, s.nazev]));

  // Skupina = věta události. Tatáž věta u víc událostí (například dvě školy
  // s týmž oznámením) se spojí do jednoho seznamu škol.
  const skupiny = new Map<string, { typ: string; veta: string; skoly: Map<string, string> }>();
  for (const r of radky) {
    const klic = `${r.typ}\n${r.veta}`;
    let g = skupiny.get(klic);
    if (!g) {
      g = { typ: r.typ, veta: r.veta, skoly: new Map() };
      skupiny.set(klic, g);
    }
    // Při víc odkazech téže školy v téže větě platí první.
    if (!g.skoly.has(r.redizo)) g.skoly.set(r.redizo, odkazDoEmailu(r.odkaz, r.redizo));
  }

  const serazene = [...skupiny.values()].sort(
    (a, b) => poradi(a.typ) - poradi(b.typ) || a.veta.localeCompare(b.veta, 'cs'),
  );
  const nazevSkoly = (redizo: string) => nazvy.get(redizo) ?? `Škola ${redizo}`;

  const dotcene = new Set(radky.map((r) => r.redizo));

  const text: string[] = [];
  const html: string[] = [];
  for (const g of serazene) {
    text.push(g.veta);
    html.push(`<p style="margin: 20px 0 6px 0;">${escapuj(g.veta)}</p><ul style="margin: 0; padding-left: 20px;">`);
    const serazeneSkoly = [...g.skoly.entries()].sort((a, b) =>
      nazevSkoly(a[0]).localeCompare(nazevSkoly(b[0]), 'cs'),
    );
    for (const [redizo, odkaz] of serazeneSkoly) {
      text.push(`  · ${nazevSkoly(redizo)}: ${odkaz}`);
      html.push(
        `<li><a href="${escapuj(odkaz)}" style="color:#0074e4;">${escapuj(nazevSkoly(redizo))}</a></li>`,
      );
    }
    html.push('</ul>');
    text.push('');
  }

  return {
    predmet: predmetSouhrnu(dotcene.size),
    text: text.join('\n').trimEnd(),
    html: html.join('\n'),
    skol: dotcene.size,
  };
}
