import { getKontextPrihlasek } from '@/lib/kontext-prihlasek';
import { getSoubezneObce, type SoubezneObce } from '@/lib/okruhy-oboru';
import { kontextNaStranku, okruhNaStranceOboru, type OkruhNaStranceOboru, type ProfilOboruData } from '@/lib/obor-profil-data';
import { getWebSkoly } from '@/lib/skoly-web';
import { adresaPrehledu, adresySkolyMapa } from '@/lib/adresa-oboru.mjs';
import { kanonickeNazvySkol, nazvySkolKatalogu } from '@/lib/okruhy-podklad';
import { getSchoolsData, type SchoolProgram } from '@/lib/data';
import {
  domovyMladeze, nastavbyNedenni, obtiznostBezJpz, rokBezJpz,
  type DomovMladeze, type NabidkaBezJpz,
} from '@/lib/obory-bez-jpz';
import type { ZarazeniObtiznosti } from '@/lib/obor-profil';

/**
 * Data stránky učebního oboru a ostatních nabídek bez jednotné zkoušky (issue #244, etapa 3a).
 * Pět otázek rodiny podle docs/navrh-obory-bez-jpz-2027.md, oddíly 10 a 11: je tam místo, stojí
 * o obor někdo, kam se hlásí ostatní, co přijde potom, jak se tam dostat. Nic z toho nestojí na
 * bodech jednotné zkoušky (oddíl 10.2).
 */
export interface Nastavba {
  obor: string;
  skola: string;
  obec: string;
  forma: 'denní' | 'dálková' | 'kombinovaná' | 'distanční' | string;
  kapacita: number | null;
  href: string | null;
}

export interface ProfilUcebnihoOboruData {
  rok: number;
  predchoziRok: number;
  nabidka: NabidkaBezJpz;
  zarazeni: ZarazeniObtiznosti | null;
  soutezici: number | null;
  kontext: ProfilOboruData['kontext'];
  soubezneObce: SoubezneObce | null;
  okruh: OkruhNaStranceOboru | null;
  /** Kam dál po výučním listu (jen H a E): nástavby téže školy, jinak téhož oborového dvojčíslí v kraji. */
  nastavby: { skoly: Nastavba[]; kraj: Nastavba[] } | null;
  domovy: DomovMladeze[];
  web: string | null;
}

const FORMY: Record<string, string> = { den: 'denní', dal: 'dálková', komb: 'kombinovaná', dist: 'distanční' };

export async function getProfilUcebnihoOboru(program: SchoolProgram, programySkoly: SchoolProgram[]): Promise<ProfilUcebnihoOboruData | null> {
  const n = program.bezJpz;
  const rok = await rokBezJpz();
  if (!n || !rok) return null;

  const [kontextVysledek, soubezneObce, okruh, domovy, web] = await Promise.all([
    getKontextPrihlasek(n.id), getSoubezneObce(n.id), okruhNaStranceOboru(n.id), domovyMladeze(n.redizo), getWebSkoly(n.redizo),
  ]);

  let nastavby: ProfilUcebnihoOboruData['nastavby'] = null;
  if (n.kategorie === 'H' || n.kategorie === 'E') {
    // Denní nástavby jsou v katalogu mezi nabídkami se zkouškou, nedenní jen v datech bez JPZ.
    const jpz = programySkoly.filter(p => !p.bezJpz);
    const adresy = new Map([...adresySkolyMapa(n.redizo, program.nazev, jpz)].map(([a, p]) => [p as SchoolProgram, a]));
    const denni: Nastavba[] = jpz
      .filter(p => /-L\/5\d$/.test(p.id.split('_')[1] ?? '') && !p.nevypsano_2026)
      .map(p => ({ obor: p.obor, skola: program.nazev, obec: p.obec, forma: 'denní', kapacita: p.kapacita, href: adresy.get(p) ? `/skola/${adresy.get(p)}` : null }));
    const [nedenni, nazvy, kanonicke] = await Promise.all([
      nastavbyNedenni(n.redizo, n.kraj, n.kkov.slice(0, 2)), nazvySkolKatalogu(), kanonickeNazvySkol(),
    ]);
    const prevod = (x: NabidkaBezJpz): Nastavba => {
      const kanonicky = kanonicke.get(x.redizo);
      return {
        obor: x.obor, skola: nazvy.get(x.redizo) ?? x.redizo, obec: x.obec, forma: FORMY[x.forma] ?? x.forma, kapacita: x.kapacita,
        href: kanonicky ? `/skola/${adresaPrehledu(x.redizo, kanonicky)}` : null,
      };
    };
    const skoly = [...denni, ...nedenni.skoly.map(x => ({ ...prevod(x), skola: program.nazev }))];
    // Kraj jen tehdy, když škola sama nástavbu nemá (návrh, oddíl 10.6): denní z katalogu, nedenní z dat bez JPZ.
    let kraj: Nastavba[] = [];
    if (skoly.length === 0) {
      const katalog = ((await getSchoolsData()) as unknown as Record<string, { redizo: string; kkov: string; obor: string; obec: string; kraj: string; kapacita: number }[]>)[String(rok)] ?? [];
      const denniKraj: Nastavba[] = katalog
        .filter(r => r.redizo !== n.redizo && (r.kraj ?? '').trim() === n.kraj && /-L\/5\d$/.test(r.kkov ?? '') && r.kkov.startsWith(n.kkov.slice(0, 2)))
        .map(r => {
          const kanonicky = kanonicke.get(r.redizo);
          return { obor: r.obor, skola: nazvy.get(r.redizo) ?? r.redizo, obec: r.obec, forma: 'denní', kapacita: r.kapacita, href: kanonicky ? `/skola/${adresaPrehledu(r.redizo, kanonicky)}` : null };
        });
      kraj = [...denniKraj, ...nedenni.kraj.map(prevod)]
        .sort((a, b) => a.obec.localeCompare(b.obec, 'cs') || a.skola.localeCompare(b.skola, 'cs') || a.forma.localeCompare(b.forma, 'cs'));
    }
    nastavby = { skoly, kraj };
  }

  return {
    rok,
    predchoziRok: rok - 1,
    nabidka: n,
    zarazeni: obtiznostBezJpz(n),
    soutezici: n.prijati !== null && n.nepr_kapacita !== null ? n.prijati + n.nepr_kapacita : null,
    kontext: await kontextNaStranku(kontextVysledek),
    soubezneObce,
    okruh,
    nastavby,
    domovy,
    web,
  };
}
