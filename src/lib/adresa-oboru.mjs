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
 * @typedef {{ obor: string, zamereni?: string, delka_studia?: number, id?: string }} NabidkaProAdresu
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
 * Zaměření, jak s ním pracuje adresa. Zdrojová data nesou u 53 nabídek koncovou mezeru
 * („všeobecné “ vedle „všeobecné“); bez sjednocení posoudí každá strana jednoznačnost jinak
 * a vznikne adresa, kterou druhá strana nerozpozná.
 */
export function zamereniProAdresu(zamereni) {
  const text = String(zamereni ?? '').trim();
  return text || undefined;
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
 * Adresa nabídky bez ohledu na jednoznačnost. Slouží jako výchozí tvar, který
 * `adresySkolyMapa` podle potřeby doplní o rozlišení.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @param {NabidkaProAdresu} nabidka
 * @param {boolean} sDelkou
 * @returns {string}
 */
function zakladniAdresa(redizo, nazevSkoly, nabidka, sDelkou) {
  const zamereni = zamereniProAdresu(nabidka.zamereni);
  return `${redizo}-${createSlug(nazevSkoly, nabidka.obor, zamereni, sDelkou ? nabidka.delka_studia : undefined)}`;
}

/**
 * Adresy všech nabídek školy jako mapa adresa → nabídka.
 *
 * **Jednoznačnost se posuzuje na hotové adrese, ne na dvojici obor + zaměření.** Adresa vzniká
 * až po odstranění diakritiky, sjednocení velikosti písmen a oříznutí na 40 a 150 znaků, takže
 * dvě různá zaměření mohou skončit na tomtéž textu: „Živé jazyky“ a „živé jazyky“, nebo dvě
 * dlouhá zaměření, která se oříznou na stejném místě. Do 19. 9. 2026 se počítaly surové dvojice,
 * takže takové nabídky nedostaly rozlišení a sdílely jednu stránku — jedna z nich pak ukazovala
 * čísla té druhé. Postup je proto třístupňový: základní tvar, při shodě délka studia, a když ani
 * ta nestačí, pořadí nabídky. Třetí stupeň je ošklivý, ale je to jediné, co zaručí, že **každá
 * nabídka má vlastní adresu**; invariant hlídá tests/catalog-2026.integration.mjs.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @param {NabidkaProAdresu[]} nabidky
 * @returns {Map<string, NabidkaProAdresu>}
 */
export function adresySkolyMapa(redizo, nazevSkoly, nabidky) {
  /** @type {Map<string, NabidkaProAdresu[]>} */
  const podleAdresy = new Map();
  for (const n of nabidky) {
    const a = zakladniAdresa(redizo, nazevSkoly, n, false);
    if (!podleAdresy.has(a)) podleAdresy.set(a, []);
    podleAdresy.get(a).push(n);
  }

  /** @type {Map<string, NabidkaProAdresu>} */
  const vysledek = new Map();
  for (const [adresa, skupina] of podleAdresy) {
    if (skupina.length === 1) {
      vysledek.set(adresa, skupina[0]);
      continue;
    }
    // Druhý stupeň: délka studia.
    /** @type {Map<string, NabidkaProAdresu[]>} */
    const sDelkou = new Map();
    for (const n of skupina) {
      const a = zakladniAdresa(redizo, nazevSkoly, n, true);
      if (!sDelkou.has(a)) sDelkou.set(a, []);
      sDelkou.get(a).push(n);
    }
    for (const [a, podskupina] of sDelkou) {
      if (podskupina.length === 1) {
        vysledek.set(a, podskupina[0]);
        continue;
      }
      // Třetí stupeň: pořadí v rámci shodné adresy, aby na sebe nabídky nepřepsaly.
      // Řadí se podle surových hodnot, ne podle pořadí v souboru: jinak by přegenerování
      // týchž dat mohlo obě adresy prohodit a stránka by se odkazovala na jinou nabídku.
      const stabilni = [...podskupina].sort((x, y) =>
        (x.obor || '').localeCompare(y.obor || '', 'cs')
        || (x.zamereni || '').localeCompare(y.zamereni || '', 'cs')
        || (x.delka_studia ?? 0) - (y.delka_studia ?? 0)
        // Poslední záchrana: dvě nabídky se mohou shodovat i v oboru, zaměření a délce
        // (liší se jen identifikátorem). Bez něj by o pořadí rozhodlo pořadí v souboru.
        || (x.id || '').localeCompare(y.id || ''));
      stabilni.forEach((n, i) => {
        vysledek.set(i === 0 ? a : `${a}-${i + 1}`, n);
      });
    }
  }
  return vysledek;
}

/**
 * Kanonická adresa jedné nabídky mezi nabídkami téže školy.
 *
 * @param {string} redizo
 * @param {string} nazevSkoly
 * @param {NabidkaProAdresu} nabidka
 * @param {NabidkaProAdresu[]} nabidkySkoly
 * @returns {string|null}
 */
export function adresaNabidkyVeSkole(redizo, nazevSkoly, nabidka, nabidkySkoly) {
  for (const [adresa, n] of adresySkolyMapa(redizo, nazevSkoly, nabidkySkoly)) {
    if (n === nabidka) return adresa;
  }
  return null;
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
  return [adresaPrehledu(redizo, nazevSkoly), ...adresySkolyMapa(redizo, nazevSkoly, nabidky).keys()];
}

/**
 * Nabídky, pro které stránka oboru skutečně vznikne.
 *
 * Stránku staví `getProgramsByRedizo`, a ta nabídku **vynechá** ve dvou případech: když její
 * základní klíč (`REDIZO_KKOV`) nezná `school_analysis.json`, a když pod týmž základním klíčem
 * existuje nabídka se zaměřením — pak se holá nabídka bez zaměření zahodí. Kdo to pravidlo
 * neuplatní, vyrobí adresu, která se jen přesměruje: přesně to dělala sitemapa u 43 adres
 * a vyhledávání u části odkazů.
 *
 * @param {NabidkaProAdresu[]} nabidky
 * @param {(zakladniKlic: string) => boolean} znaZakladniKlic
 * @returns {NabidkaProAdresu[]}
 */
export function nabidkySeStrankou(nabidky, znaZakladniKlic) {
  const zaklad = n => String(n.id ?? '').split('_').slice(0, 2).join('_');
  const seZamerenim = new Set(nabidky.filter(n => zamereniProAdresu(n.zamereni)).map(zaklad));
  return nabidky.filter(n => {
    const k = zaklad(n);
    if (!k || !znaZakladniKlic(k)) return false;
    return zamereniProAdresu(n.zamereni) ? true : !seZamerenim.has(k);
  });
}
