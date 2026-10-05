import type { CitySchoolRow } from '@/lib/cityData';
import type { DalsiOborVeMeste } from '@/lib/kontext-prihlasek';
import { adresaPrehledu } from '@/lib/adresa-oboru.mjs';
import { nazevSkolyProRadek, popisOboruOkruhu, uliceZAdresy, type OkruhMesta, type ZaznamKataloguProOkruh } from '@/lib/okruhy-oboru';
import type { ZarazeniObtiznosti } from '@/lib/obor-profil';
import { KATEGORIE_BEZ_JPZ, kategorieOboru } from '@/lib/kontext-prihlasek';
import { jeNastavba, jeVyucniList, smerOboru, SMERY_STUDIA } from '@/lib/smery-studia';
import { druhZrizovatele } from '@/lib/simulator-filter';
import type { KartaSkoly, RadekKarty, VelikostMesta } from '@/components/mesto/SkolyPodleSmeru';

/**
 * Karty škol pro stránku města (docs/navrh-prehled-oboru-ve-meste-2027.md): obory s jednotnou
 * zkouškou z katalogu a obory, které katalog nevede (učební obory, konzervatoře), na jedné kartě
 * školy. Karta se skládá podle REDIZO, ne podle názvu, protože zkrácené názvy se opakují
 * (zdroje dat, oddíl 4, past 7).
 */
export interface PodkladKaret {
  /** REDIZO → název s ulicí z katalogu. */
  nazvyKatalogu: Map<string, string>;
  /** REDIZO → název ze school_analysis.json; z něj se skládá adresa přehledu školy. */
  kanonickeNazvy: Map<string, string>;
  /** REDIZO → adresa sídla z rejstříku, pro školy mimo katalog. */
  adresySidel: Record<string, { adresa: string }>;
  /** REDIZO → zřizovatel z katalogu kteréhokoli ročníku (`zrizovatelPodleRedizo`), pro školy mimo katalog ročníku. */
  zrizovatele?: Map<string, string>;
}

/**
 * Název školy na kartě: plný název z katalogu (`nazev`) a ulice z adresy nabídky bez čísla popisného.
 * Pole `nazev_display` je u části škol zkrácené („Cyrilomet.gymnázium a SOŠ pedagog. Brno“), `nazev`
 * nese plnější tvar („Cyrilometodějské gymnázium, SPedŠ a MŠ Brno“); úplný zkrácený název
 * „Gymnázium“ odliší teprve ulice.
 */
export function nazevSUlici(nazev: string, ulice: string | null | undefined): string {
  // Právní forma (s.r.o., o.p.s., z.ú.) rodině nepomůže školu poznat a název jen prodlouží.
  const bezFormy = nazev.replace(/,?\s*(s\.\s*r\.\s*o\.|o\.\s*p\.\s*s\.|z\.\s*ú\.|z\.\s*s\.)(?=,|$)/g, '').trim();
  const u = uliceZAdresy(ulice ?? '');
  return u && !bezFormy.includes(u) ? `${bezFormy}, ${u}` : bezFormy;
}

/** Velikost města podle počtu nabídek s jednotnou zkouškou (návrh, oddíl 4.3). */
export function velikostMesta(nabidek: number): VelikostMesta {
  if (nabidek <= 12) return 'male';
  if (nabidek <= 60) return 'stredni';
  return 'velke';
}

/** Délka studia a ročník, ze kterého se hlásí (víceletá gymnázia), nebo nástavba. */
export function delkaOboru(r: Pick<CitySchoolRow, 'delka_studia'>, kkov: string): string {
  const casti: string[] = [];
  if (r.delka_studia) casti.push(`${r.delka_studia}leté`);
  if (smerOboru(kkov) === 'viceleta') casti.push(r.delka_studia === 6 ? 'ze 7. třídy' : 'z 5. třídy');
  if (jeNastavba(kkov)) casti.push('nástavba po výučním listu');
  return casti.join(', ');
}

/** Zaměření, když se liší od názvu oboru. */
export function zamereniOboru(r: Pick<CitySchoolRow, 'zamereni' | 'obor'>): string {
  const z = (r.zamereni ?? '').trim();
  return z && z !== r.obor ? z : '';
}

/** Délka, ročník a zaměření jedním řetězcem (pro hledání). */
export function doplnekOboru(r: Pick<CitySchoolRow, 'delka_studia' | 'zamereni' | 'obor'>, kkov: string): string {
  return [delkaOboru(r, kkov), zamereniOboru(r)].filter(Boolean).join(' · ');
}

export function sestavKartySkol(
  nabidky: CitySchoolRow[],
  dalsi: DalsiOborVeMeste[],
  podklad: PodkladKaret,
): KartaSkoly[] {
  const karty = new Map<string, KartaSkoly>();
  const karta = (redizo: string, nazev: string, zrizovatel: string | null | undefined): KartaSkoly => {
    let k = karty.get(redizo);
    if (!k) {
      const kanonicky = podklad.kanonickeNazvy.get(redizo);
      k = {
        redizo, nazev, href: kanonicky ? `/skola/${adresaPrehledu(redizo, kanonicky)}` : null,
        zrizovatel: druhZrizovatele(zrizovatel ?? podklad.zrizovatele?.get(redizo)),
        radky: [],
      };
      karty.set(redizo, k);
    }
    return k;
  };
  // Katalog může nést tutéž nabídku dvakrát se stejným id (2026: SŠ KNIH v Brně); řádek jen jednou.
  const videne = new Set<string>();
  for (const r of nabidky) {
    if (videne.has(r.id)) continue;
    videne.add(r.id);
    const kkov = r.id.split('_')[1] ?? '';
    const radek: RadekKarty = {
      id: r.id,
      obor: r.obor,
      doplnek: doplnekOboru(r, kkov),
      delka: delkaOboru(r, kkov),
      zamereni: zamereniOboru(r),
      smer: smerOboru(kkov),
      druh: 'jpz',
      zarazeni: r.zarazeni,
      mista: r.kapacita2026 ?? r.kapacita2025,
      href: r.adresaOboru ? `/skola/${r.adresaOboru}` : null,
      nevypsano: r.chybiVRocniku,
    };
    karta(r.redizo, nazevSUlici(r.nazev || r.nazev_display, r.ulice), r.zrizovatel).radky.push(radek);
  }
  for (const o of dalsi) {
    const kkov = o.klic.split('_')[1] ?? '';
    const vyucni = jeVyucniList(kkov);
    const nazev = nazevSkolyProRadek(o.redizo, podklad.nazvyKatalogu, {
      skola: o.skola, adresa: podklad.adresySidel[o.redizo]?.adresa,
    }) ?? o.skola;
    karta(o.redizo, nazev, null).radky.push({
      id: o.klic,
      obor: o.obor,
      doplnek: vyucni ? 'výuční list' : '',
      delka: vyucni ? 'výuční list' : '',
      zamereni: '',
      smer: smerOboru(kkov),
      // Obor bez jednotné zkoušky nemá výsledky, takže ani obtížnost přijetí (chybějící údaj není nula).
      druh: o.duvod === 'jiny' ? 'mimo' : vyucni ? 'vyucni' : 'bez_zkousky',
      zarazeni: null,
      mista: null,
      href: null,
      nevypsano: false,
    });
  }
  return [...karty.values()].sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
}

/**
 * Okruhy oborů na stránce města (návrh okruhů, docs/navrh-shluky-oboru-2027.md; návrh přehledu oborů, oddíl 11).
 * Okruh se pojmenuje směry studia, které v něm převažují podle počtu uchazečů: druhý směr se přidá,
 * když má aspoň čtvrtinu uchazečů okruhu. Jméno je odvozené z číselníku oborů, ne ruční, takže platí
 * pro všechna města stejně. Pod ním zůstávají tři největší školy (rozhodnutí z 3. 10. 2026, oddíl 7.4).
 */
export interface RadekOkruhuMesta {
  klic: string;
  skola: string;
  obor: string;
  /** Délka a zaměření, když jsou jednoznačné. */
  doplnek: string | null;
  /** Obec oboru, jen když se liší od města stránky. */
  obec: string | null;
  uchazecu: number;
  zarazeni: ZarazeniObtiznosti | null;
  /** Zaměření téhož oboru mají různou obtížnost přijetí, jedno slovo by lhalo. */
  lisiSe: boolean;
  bezJednotneZkousky: boolean;
  /** Stránka oboru, když klíč vede na jedinou nabídku ve městě; jinak přehled školy; jinak nic. */
  href: string | null;
}

export interface OkruhMestaKZobrazeni {
  id: number;
  nazev: string;
  /** Tři největší školy okruhu, oddělené tečkou. */
  skoly: string;
  uchazecu: number;
  radky: RadekOkruhuMesta[];
  presun: { od: number; do: number } | null;
}

export interface PodkladOkruhu {
  /** REDIZO_KKOV → záznamy katalogu (nejnovější ročník, který obor vede). */
  katalog: Map<string, ZaznamKataloguProOkruh[]>;
  nazvyKatalogu: Map<string, string>;
  kanonickeNazvy: Map<string, string>;
  /**
   * Obtížnost přijetí po klíči REDIZO_KKOV ze souhrnů 1. kola, pro všechny obory okruhu i z jiných obcí:
   * jedna hodnota, když ji mají všechna zaměření stejnou, jinak „lisi_se“.
   */
  obtiznost?: Map<string, ZarazeniObtiznosti | null | 'lisi_se'>;
  /** REDIZO → část obce města („Praha 6“, „Poruba“); rozliší okruhy se stejným jménem (#364). */
  castiObce?: Map<string, string>;
  rejstrik: {
    skoly: Record<string, [string, string]>;
    obory: Record<string, string>;
    identifikace: Record<string, { adresa: string }>;
  };
}

/** Skupiny kmenových oborů (první dvojčíslí KKOV) podle číselníku MŠMT, zkrácené na štítek. */
const SKUPINY_KKOV: Record<string, string> = {
  '16': 'ekologie', '18': 'informatika', '21': 'hornictví a hutnictví', '23': 'strojírenství', '26': 'elektrotechnika',
  '28': 'chemie', '29': 'potravinářství', '31': 'textil a oděvnictví', '32': 'kožedělná výroba', '33': 'dřevo a nábytek',
  '34': 'polygrafie', '36': 'stavebnictví', '37': 'doprava', '39': 'speciální technické obory', '41': 'zemědělství a lesnictví',
  '43': 'veterinářství', '53': 'zdravotnictví', '61': 'teologie', '63': 'ekonomika a administrativa', '64': 'podnikání',
  '65': 'gastronomie a cestovní ruch', '66': 'obchod', '68': 'právo a veřejná správa', '69': 'osobní služby',
  '72': 'publicistika a knihovnictví', '75': 'pedagogika a sociální péče', '78': 'lycea', '79': 'gymnázia', '82': 'umění',
};

type ObVaha = { klic: string; uchazecu: number };

/** Hodnoty seřazené podle součtu uchazečů; druhá se přidá, když má aspoň čtvrtinu. */
function prevazujici(obory: ObVaha[], klic: (kkov: string) => string): string[] {
  const vahy = new Map<string, number>();
  let celkem = 0;
  for (const o of obory) {
    const k = klic(o.klic.split('_')[1] ?? '');
    vahy.set(k, (vahy.get(k) ?? 0) + o.uchazecu);
    celkem += o.uchazecu;
  }
  const poradi = [...vahy.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out = [poradi[0][0]];
  if (poradi[1] && celkem > 0 && poradi[1][1] / celkem >= 0.25) out.push(poradi[1][0]);
  return out;
}

const podil = (obory: ObVaha[], test: (kkov: string) => boolean) => {
  const celkem = obory.reduce((a, o) => a + o.uchazecu, 0);
  return celkem ? obory.filter(o => test(o.klic.split('_')[1] ?? '')).reduce((a, o) => a + o.uchazecu, 0) / celkem : 0;
};

/**
 * Jméno okruhu ze směrů studia vážených počtem uchazečů. Víceletá gymnázia se rozliší délkou,
 * okruh s převahou učebních oborů dostane „učební obory“. Všechno je odvozené z kódu oboru.
 */
export function nazevOkruhu(obory: ObVaha[]): string {
  const smery = prevazujici(obory, smerOboru);
  const nazev = (id: string) => {
    if (id === 'viceleta') {
      if (podil(obory, k => /K\/81$/.test(k)) >= 0.6) return 'Osmiletá gymnázia (z 5. třídy)';
      if (podil(obory, k => /K\/61$/.test(k)) >= 0.6) return 'Šestiletá gymnázia (ze 7. třídy)';
    }
    return SMERY_STUDIA.find(s => s.id === id)?.nazev ?? 'Ostatní obory';
  };
  const jmeno = smery.map(nazev).join(' · ');
  return podil(obory, jeVyucniList) >= 0.5 ? `${jmeno} · učební obory` : jmeno;
}

/** Upřesnění pro okruhy se stejným jménem ve městě: převažující skupiny oborů z číselníku. */
export function upresneniOkruhu(obory: ObVaha[]): string {
  return prevazujici(obory, kkov => SKUPINY_KKOV[kkov.slice(0, 2)] ?? '').filter(Boolean).join(', ');
}

export function sestavOkruhyMesta(
  okruhy: OkruhMesta[],
  obec: string,
  nabidky: CitySchoolRow[],
  podklad: PodkladOkruhu,
): { okruhy: OkruhMestaKZobrazeni[]; nastavby: OkruhMestaKZobrazeni[] } {
  // Obtížnost a odkaz z nabídek města podle klíče REDIZO_KKOV (okruhy zaměření neznají).
  const podleKlice = new Map<string, CitySchoolRow[]>();
  for (const r of nabidky) {
    const k = `${r.redizo}_${r.id.split('_')[1] ?? ''}`;
    podleKlice.set(k, [...(podleKlice.get(k) ?? []), r]);
  }
  const out = { okruhy: [] as OkruhMestaKZobrazeni[], nastavby: [] as OkruhMestaKZobrazeni[] };
  for (const o of okruhy) {
    const radky: RadekOkruhuMesta[] = [];
    for (const x of o.obory) {
      const [redizo, kkov] = x.klic.split('_');
      const popis = popisOboruOkruhu(x.klic, podklad.katalog, podklad.nazvyKatalogu, {
        skola: podklad.rejstrik.skoly[redizo]?.[0], adresa: podklad.rejstrik.identifikace[redizo]?.adresa,
        obor: podklad.rejstrik.obory[kkov],
      });
      if (!popis) continue;
      const mistni = [...new Map((podleKlice.get(x.klic) ?? []).map(r => [r.id, r])).values()];
      const zMest = new Set(mistni.map(r => r.zarazeni));
      const zSouhrnu = podklad.obtiznost?.get(x.klic);
      const zarazeni: ZarazeniObtiznosti | null | 'lisi_se' = zSouhrnu !== undefined
        ? zSouhrnu
        : zMest.size === 1 ? [...zMest][0] : zMest.size > 1 ? 'lisi_se' : null;
      const kanonicky = podklad.kanonickeNazvy.get(redizo);
      radky.push({
        klic: x.klic,
        skola: popis.skola,
        obor: popis.obor,
        doplnek: popis.doplnek,
        obec: x.obec && x.obec !== obec ? x.obec : null,
        uchazecu: x.uchazecu,
        zarazeni: zarazeni === 'lisi_se' ? null : zarazeni,
        lisiSe: zarazeni === 'lisi_se',
        bezJednotneZkousky: KATEGORIE_BEZ_JPZ.has(kategorieOboru(kkov)),
        href: mistni.length === 1 && mistni[0].adresaOboru
          ? `/skola/${mistni[0].adresaOboru}`
          : kanonicky ? `/skola/${adresaPrehledu(redizo, kanonicky)}` : null,
      });
    }
    if (radky.length < 3) continue;
    const skoly = [...new Set(radky.map(r => r.skola))];
    const zaznam: OkruhMestaKZobrazeni = {
      id: o.id,
      nazev: nazevOkruhu(o.obory),
      skoly: skoly.slice(0, 3).join(' · ') + (skoly.length > 3 ? ' a další' : ''),
      uchazecu: o.uchazecu,
      radky,
      presun: o.presunNadSumem && o.rokPresunu ? { od: o.rokPresunu[0], do: o.rokPresunu[1] } : null,
    };
    (o.obory.every(x => jeNastavba(x.klic.split('_')[1] ?? '')) ? out.nastavby : out.okruhy).push(zaznam);
  }
  // Stejné jméno dvou okruhů ve městě čtenáři nic neřekne (na stránce stojí okruhy i nástavby vedle
  // sebe, proto se shody hledají v obou seznamech dohromady). Postupně se doplní: převažující skupina
  // oborů z číselníku, převažující část obce (#364), převažující obor okruhu a nakonec okolí (obec mimo
  // město); okolí je poslední, aby okruh přes jiné město (konzervatoře) nedostal cizí obec za „okolí“.
  const vsechny = [...out.okruhy, ...out.nastavby];
  const upresni = (doplnek: (o: OkruhMestaKZobrazeni) => string | null, oddelovac: string) => {
    const pocty = new Map<string, number>();
    for (const o of vsechny) pocty.set(o.nazev, (pocty.get(o.nazev) ?? 0) + 1);
    const doplnky = new Map<OkruhMestaKZobrazeni, string>();
    for (const o of vsechny) {
      if ((pocty.get(o.nazev) ?? 0) < 2) continue;
      const d = doplnek(o);
      if (d) doplnky.set(o, d);
    }
    // Doplněk, který všem okruhům se stejným jménem dá stejný text, nic nerozliší a jméno jen prodlouží.
    const rozlisuje = new Map<string, Set<string>>();
    for (const [o, d] of doplnky) rozlisuje.set(o.nazev, (rozlisuje.get(o.nazev) ?? new Set()).add(d));
    for (const [o, d] of doplnky) {
      const spolu = [...doplnky.keys()].filter(x => x.nazev === o.nazev).length;
      if (rozlisuje.get(o.nazev)!.size === 1 && spolu === pocty.get(o.nazev)) continue;
      o.nazev = `${o.nazev}${oddelovac}${d}`;
    }
  };
  // Upřesnění, které jen opakuje slovo ze jména („Gymnázia: gymnázia“), se vynechá.
  const nove = (o: OkruhMestaKZobrazeni, text: string) => text
    .split(', ').filter(cast => cast && !o.nazev.toLocaleLowerCase('cs').includes(cast)).join(', ') || null;
  upresni(o => nove(o, upresneniOkruhu(o.radky.map(r => ({ klic: r.klic, uchazecu: r.uchazecu })))), ': ');
  if (podklad.castiObce) upresni(o => castOkruhu(o.radky, podklad.castiObce!), ' · ');
  upresni(o => nove(o, prevazujiciObor(o.radky)), ' · ');
  upresni(o => nove(o, okoliOkruhu(o.radky)), ' · ');
  return out;
}

/** „Říčany a okolí“, když většina uchazečů okruhu míří na obory mimo město; jinak prázdný text. */
function okoliOkruhu(radky: { obec: string | null; uchazecu: number }[]): string {
  const vahy = new Map<string, number>();
  let mistni = 0;
  for (const r of radky) {
    if (r.obec) vahy.set(r.obec, (vahy.get(r.obec) ?? 0) + r.uchazecu);
    else mistni += r.uchazecu;
  }
  const okoli = [...vahy.values()].reduce((a, b) => a + b, 0);
  if (okoli <= mistni) return '';
  const obec = [...vahy.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'))[0][0];
  return `${obec} a okolí`;
}

/** Převažující obor okruhu podle uchazečů, malým písmenem („hudebně dramatické umění“). */
function prevazujiciObor(radky: { obor: string; uchazecu: number }[]): string {
  const vahy = new Map<string, number>();
  for (const r of radky) vahy.set(r.obor, (vahy.get(r.obor) ?? 0) + r.uchazecu);
  const prvni = [...vahy.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'))[0]?.[0] ?? '';
  return prvni.charAt(0).toLocaleLowerCase('cs') + prvni.slice(1);
}

/**
 * Převažující část obce okruhu podle uchazečů místních oborů; druhá, když má aspoň čtvrtinu. Okruh, který
 * se rozkládá po celém městě (první část pod 40 % a první dvě pod 60 %), část obce nedostane: štítek
 * jedné části by u něj klamal.
 */
export function castOkruhu(radky: { klic: string; obec: string | null; uchazecu: number }[], casti: Map<string, string>): string | null {
  const vahy = new Map<string, number>();
  let celkem = 0;
  for (const r of radky) {
    if (r.obec) continue; // obor z jiné obce
    const cast = casti.get(r.klic.split('_')[0]);
    if (!cast) continue;
    vahy.set(cast, (vahy.get(cast) ?? 0) + r.uchazecu);
    celkem += r.uchazecu;
  }
  const poradi = [...vahy.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'));
  if (!poradi.length) return null;
  const prvni = poradi[0][1] / celkem;
  if (prvni < 0.4 && prvni + (poradi[1]?.[1] ?? 0) / celkem < 0.6) return null;
  const vybrane = [poradi[0][0]];
  if (poradi[1] && poradi[1][1] / celkem >= 0.25) vybrane.push(poradi[1][0]);
  return vybrane.join(', ');
}
