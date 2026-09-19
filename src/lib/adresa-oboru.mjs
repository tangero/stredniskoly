/**
 * Adresa stránky školy a oboru: jediné místo, které ji skládá.
 *
 * Do 19. 9. 2026 ji skládala tři různá místa — `data.ts` ji rozpoznávalo z letošního ročníku,
 * vyhledávací API a generátor sitemapy ji stavěly z loňského. Výsledkem byly adresy, které už
 * na obor nevedly, a stránky s loňskými čísly. Rozbor: docs/adresa-oboru-2027.md.
 *
 * **Proč čisté JavaScript a ne TypeScript.** Modul používá i generátor sitemapy, který běží
 * pod `node` při buildu. Import TypeScriptu by vyžadoval odstraňování typů, které umí až
 * Node 22.6 a novější; workflow projektu běží na Node 20. Typy proto nese JSDoc.
 *
 * @typedef {{ obor: string, zamereni?: string, delka_studia?: number }} NabidkaProAdresu
 */

/**
 * Text do adresy. Kopie pravidel z `createSlug` v utils.ts; ta ho odsud přebírá,
 * aby obě strany skládaly adresu stejně.
 *
 * @param {string} text
 * @param {number} [maxDelka]
 * @returns {string}
 */
function slugify(text, maxDelka) {
  let slug = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (maxDelka && slug.length > maxDelka) {
    slug = slug.substring(0, maxDelka);
    const posledniPomlcka = slug.lastIndexOf('-');
    if (posledniPomlcka > maxDelka * 0.6) slug = slug.substring(0, posledniPomlcka);
  }
  return slug;
}

/**
 * Adresa z názvu školy, oboru a zaměření. Délka adresy je omezená kvůli souborovému systému.
 *
 * @param {string} nazev
 * @param {string} [obor]
 * @param {string} [zamereni]
 * @param {number} [delkaStudia]
 * @returns {string}
 */
export function createSlug(nazev, obor, zamereni, delkaStudia) {
  let slug = slugify(nazev, 60);

  if (obor) {
    let oborSlug = slugify(obor, 40);
    if (delkaStudia) oborSlug = `${oborSlug}-${delkaStudia}lete`;
    slug = `${slug}-${oborSlug}`;
  }
  if (zamereni) slug = `${slug}-${slugify(zamereni, 40)}`;

  if (slug.length > 150) {
    slug = slug.substring(0, 150);
    const posledniPomlcka = slug.lastIndexOf('-');
    if (posledniPomlcka > 100) slug = slug.substring(0, posledniPomlcka);
  }
  return slug;
}

/**
 * Délka studia patří do adresy jen tehdy, když by bez ní byla adresa nejednoznačná:
 * u nabídky se zaměřením rozhoduje počet nabídek téže dvojice obor + zaměření,
 * u nabídky bez zaměření počet nabídek téhož oboru bez zaměření.
 *
 * @param {NabidkaProAdresu} nabidka
 * @returns {string}
 */
function klic(nabidka) {
  return nabidka.zamereni ? `${nabidka.obor}|${nabidka.zamereni}` : nabidka.obor;
}

/**
 * @param {NabidkaProAdresu[]} nabidky
 * @returns {Map<string, number>}
 */
export function pocetStejnychAdres(nabidky) {
  const pocty = new Map();
  for (const n of nabidky) {
    const k = klic(n);
    pocty.set(k, (pocty.get(k) ?? 0) + 1);
  }
  return pocty;
}

/**
 * Adresa přehledu školy, tedy `<redizo>-<název školy>`.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @returns {string}
 */
export function adresaPrehledu(redizo, nazevSkoly) {
  return `${redizo}-${createSlug(nazevSkoly)}`;
}

/**
 * Kanonická adresa nabídky. `pocty` je výsledek `pocetStejnychAdres` nad množinou,
 * vůči které se posuzuje jednoznačnost.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @param {NabidkaProAdresu} nabidka
 * @param {Map<string, number>} pocty
 * @returns {string}
 */
export function adresaNabidky(redizo, nazevSkoly, nabidka, pocty) {
  const sDelkou = (pocty.get(klic(nabidka)) ?? 0) > 1;
  return `${redizo}-${createSlug(nazevSkoly, nabidka.obor, nabidka.zamereni, sDelkou ? nabidka.delka_studia : undefined)}`;
}

/**
 * Všechny adresy školy, které mají vracet 200: přehled a každá nabídka ročníku.
 * Záměrně **nevrací základní adresu oboru bez zaměření** u školy, která takovou nabídku nemá —
 * ta se od 19. 9. 2026 trvale přesměrovává a do sitemapy nepatří.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @param {NabidkaProAdresu[]} nabidky
 * @returns {string[]}
 */
export function adresySkoly(redizo, nazevSkoly, nabidky) {
  const adresy = new Set([adresaPrehledu(redizo, nazevSkoly)]);
  const seZamerenim = nabidky.filter(n => n.zamereni);
  const bezZamereni = nabidky.filter(n => !n.zamereni);
  const poctyZamereni = pocetStejnychAdres(seZamerenim);
  const poctyBez = pocetStejnychAdres(bezZamereni);
  for (const n of seZamerenim) adresy.add(adresaNabidky(redizo, nazevSkoly, n, poctyZamereni));
  for (const n of bezZamereni) adresy.add(adresaNabidky(redizo, nazevSkoly, n, poctyBez));
  return [...adresy];
}
