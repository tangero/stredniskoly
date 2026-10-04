import type { CitySchoolRow } from '@/lib/cityData';
import type { DalsiOborVeMeste } from '@/lib/kontext-prihlasek';
import { adresaPrehledu } from '@/lib/adresa-oboru.mjs';
import { nazevSkolyProRadek, uliceZAdresy } from '@/lib/okruhy-oboru';
import { jeNastavba, jeVyucniList, smerOboru } from '@/lib/smery-studia';
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
