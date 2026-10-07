/**
 * Titulky a popisy stránek ve výsledcích vyhledávání (#405, fáze 1, SEO audit z 20. 9. 2026, bod 6).
 *
 * Kontrolní audit (#414) ukázal, že dotazy „přijímačky + obec“ mají vysoké pozice a skoro žádné prokliky:
 * titulky stránek měst a škol slovo „přijímačky“ neměly a u škol byly dlouhé přes 100 znaků. Titulek
 * proto začíná tím, co člověk hledá, a vejde se do MAX_TITULEK znaků, popis do MAX_POPIS. Titulky jsou
 * absolutní (bez přípony „| Přijímačky na střední školy“ ze šablony layoutu), aby délku neurčoval layout.
 * Letopočet se nikdy nepíše napevno: rok dat je parametr z registru (null = bez roku).
 */

export const MAX_TITULEK = 60;
export const MAX_POPIS = 155;

/** Zkrátí text na celé slovo a připojí „…“, aby se vešel do `max` znaků. */
export function zkrat(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const rez = t.slice(0, max - 1);
  const mezera = rez.lastIndexOf(' ');
  return `${(mezera > max / 2 ? rez.slice(0, mezera) : rez).replace(/[\s,;:–-]+$/, '')}…`;
}

const vRoce = (rok: string | number | null | undefined) => (rok ? ` ${rok}` : '');

/** Stránka města: „Přijímačky Brno: střední školy a obtížnost přijetí“. */
export function titulekMesta(mesto: string): string {
  const plny = `Přijímačky ${mesto}: střední školy a obtížnost přijetí`;
  return plny.length <= MAX_TITULEK ? plny : zkrat(`Přijímačky ${mesto}: střední školy`, MAX_TITULEK);
}

export function popisMesta(mesto: string, rok: string | number | null): string {
  return zkrat(`Střední školy ${mesto}: obory podle směrů studia, počty míst a jak těžké bylo se na obor dostat v 1. kole${vRoce(rok)}. Učební obory i gymnázia na jednom místě.`, MAX_POPIS);
}

/** Přehled školy: „Přijímačky Lovosice: Gymnázium, Sady pionýrů“ (krátký název školy z katalogu). */
export function titulekSkoly(nazev: string, obec: string): string {
  return zkrat(`Přijímačky ${obec}: ${nazev}`, MAX_TITULEK);
}

export function popisSkoly(nazev: string, obec: string, rok: string | number | null): string {
  return zkrat(`Všechny obory školy ${nazev}, ${obec}: jak těžké bylo se dostat v 1. kole${vRoce(rok)}, počty míst a co o škole víme z veřejných dat.`, MAX_POPIS);
}

/** Stránka oboru: obor, škola, obec a „přijímačky“; u dlouhých názvů „Přijímačky {obec}: {obor} – {škola…}“. */
export function titulekOboru(obor: string, nazevSkoly: string, obec: string): string {
  const plny = `${obor} – ${nazevSkoly}, ${obec}: přijímačky`;
  // U dlouhého názvu školy zůstane na začátku to, co lidé hledají („přijímačky + obec“), zkrátí se název školy.
  return plny.length <= MAX_TITULEK ? plny : zkrat(`Přijímačky ${obec}: ${obor} – ${nazevSkoly}`, MAX_TITULEK);
}

/** Popis stránky oboru se zkouškou: obtížnost přijetí a výsledky přijatých (pojmy ze slovníku pojmů). */
export function popisOboru(obor: string, nazevSkoly: string, obec: string, rok: string | number | null): string {
  return zkrat(`${obor}, ${nazevSkoly}, ${obec}: jak těžké bylo se dostat v 1. kole${vRoce(rok)}, výsledky přijatých, přihlášky a kam se hlásí ostatní uchazeči.`, MAX_POPIS);
}

/** Popis stránky oboru bez jednotné zkoušky: zbylá místa po 1. kole (pojem ze slovníku pojmů). */
export function popisOboruBezJpz(obor: string, druh: string, nazevSkoly: string, obec: string, rok: string | number | null): string {
  return zkrat(`${obor}, ${druh}, ${nazevSkoly}, ${obec}: zbylá místa po 1. kole${vRoce(rok)}, přihlášky a kam se hlásí ostatní uchazeči.`, MAX_POPIS);
}
