import { getSchoolsData, getExtractionsByRedizo, getInspisDataByRedizo } from '@/lib/data';
import { getSouhrnNabidky, nabidkyVeSkupineKraje, souhrnOboru, type SouhrnRocniku } from '@/lib/souhrny-kolo1';
import { getKontextPrihlasek, type KontextPrihlasek } from '@/lib/kontext-prihlasek';
import { getPasmaPrijeti, getPasmaPrijetiZaRok, celostatniMedianUchazecu, rokPasemPrijeti, type PasmaPrijetiObor } from '@/lib/pasma-prijeti';
import { getDruheKolo, type DruheKoloNabidky } from '@/lib/druhe-kolo';
import { verzeObdobi } from '@/lib/stav-datovych-sad';
import { getWebSkoly } from '@/lib/skoly-web';
import { createSlug } from '@/lib/utils';
import {
  nazevSkupiny, poradiVeSkupine, stavNabidky, zarazeniObtiznosti, soutezicichUchazecu,
  type Poradi, type StavNabidky, type ZarazeniObtiznosti,
} from '@/lib/obor-profil';

/**
 * Data stránky oboru podle docs/vrstvy-stranky-oboru-2027.md: vše, co tři otázky
 * potřebují, poskládané z knihoven, které období berou z registru stavu datových sad.
 */
export interface PoradiVKraji {
  poradi: Poradi;
  predchozi: Poradi | null;
  hodnoty: number[];
  hodnota: number;
  hodnotaPredchozi: number | null;
}

export interface OborNaPrihlasce {
  klic: string;
  uchazecu: number;
  skola: string;
  obec: string;
  obor: string;
  delka?: number;
  href: string | null;
  zarazeni: ZarazeniObtiznosti | null;
  prijati: number | null;
  soutezici: number | null;
}

export interface ProfilOboruData {
  rok: number;
  predchoziRok: number | null;
  aktualni: SouhrnRocniku;
  predchozi: SouhrnRocniku | null;
  stav: StavNabidky;
  zarazeni: ZarazeniObtiznosti | null;
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  skupina: string;
  skupinaNazev: string;
  krajNazev: string;
  poradiZajem: PoradiVKraji | null;
  poradiVysledky: PoradiVKraji | null;
  pasma: { rok: number; data: PasmaPrijetiObor } | null;
  /**
   * Bodové výsledky předchozího ročníku vedle zobrazeného, s celostátním
   * mediánem uchazečů obou let. Bez něj by dvojice čísel tvrdila, že se změnily
   * nároky školy, zatímco se změnila obtížnost testu.
   */
  srovnaniRocniku: {
    rok: number;
    predchoziRok: number;
    data: PasmaPrijetiObor;
    predchozi: PasmaPrijetiObor;
    celostatniMedian: number | null;
    celostatniMedianPredchozi: number | null;
  } | null;
  /** Verze dat o uchazečích z registru; nese ji jen předběžný ročník. */
  verzeUchazecu: string | null;
  kontext: { rok: number; data: KontextPrihlasek; vys: OborNaPrihlasce[]; niz: OborNaPrihlasce[] } | null;
  druheKolo: DruheKoloNabidky | null;
  web: string | null;
  inspekce: {
    datum: string;
    souhrn: string;
    silne: string[];
    rizika: string[];
    podpora: string[];
    otazky: string[];
  } | null;
  jazyky: string[] | null;
}

let nazvyCache: Map<string, { skola: string; nazev: string; obec: string; obor: string; delka?: number }> | null = null;

async function nazvyOboru() {
  if (nazvyCache) return nazvyCache;
  const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
  const mapa = new Map<string, { skola: string; nazev: string; obec: string; obor: string; delka?: number }>();
  for (const rok of Object.keys(data).sort().reverse()) {
    for (const z of data[rok] ?? []) {
      const klic = `${z.redizo}_${z.kkov}`;
      if (mapa.has(klic)) continue;
      mapa.set(klic, {
        skola: String(z.nazev_display ?? z.nazev ?? ''),
        nazev: String(z.nazev ?? ''),
        obec: String(z.obec ?? ''),
        obor: String(z.obor ?? ''),
        delka: typeof z.delka_studia === 'number' ? z.delka_studia : undefined,
      });
    }
  }
  nazvyCache = mapa;
  return mapa;
}

async function poradi(rok: number, kraj: string, skupina: string, klic: string, pole: 'tlak' | 'umisteni', predchoziRok: number | null): Promise<PoradiVKraji | null> {
  const skupinaNyni = await nabidkyVeSkupineKraje(rok, kraj, skupina);
  const hodnoty = skupinaNyni.map(n => n[pole]).filter((v): v is number => typeof v === 'number');
  const hodnota = skupinaNyni.find(n => n.klic === klic)?.[pole];
  if (typeof hodnota !== 'number') return null;
  const p = poradiVeSkupine(hodnota, hodnoty);
  if (!p) return null;
  let predchozi: Poradi | null = null;
  let hodnotaPredchozi: number | null = null;
  if (predchoziRok) {
    const skupinaDriv = await nabidkyVeSkupineKraje(predchoziRok, kraj, skupina);
    const drive = skupinaDriv.find(n => n.klic === klic)?.[pole];
    if (typeof drive === 'number') {
      hodnotaPredchozi = drive;
      predchozi = poradiVeSkupine(drive, skupinaDriv.map(n => n[pole]).filter((v): v is number => typeof v === 'number'));
    }
  }
  return { poradi: p, predchozi, hodnoty, hodnota, hodnotaPredchozi };
}

/** Null, když nabídka v zobrazeném ročníku souhrnů není; stránka pak použije starší podobu. */
export async function getProfilOboru(programId: string, zamereni: string | undefined, redizo: string): Promise<ProfilOboruData | null> {
  const souhrn = await getSouhrnNabidky(programId);
  if (!souhrn) return null;
  const [rokPasem, kontextVysledek, druheKolo, web, extrakce, inspis, nazvy, verzeUchazecu] = await Promise.all([
    rokPasemPrijeti(), getKontextPrihlasek(programId), getDruheKolo(programId, zamereni), getWebSkoly(redizo),
    getExtractionsByRedizo(redizo), getInspisDataByRedizo(redizo), nazvyOboru(),
    verzeObdobi('cermat-uchazeci-kolo1'),
  ]);
  const pasmaData = rokPasem ? await getPasmaPrijeti(programId) : null;

  // Předchozí ročník pásem se odvozuje od zobrazeného, ne z napsaného letopočtu;
  // když soubor neexistuje, srovnání se prostě nezobrazí.
  let srovnaniRocniku: ProfilOboruData['srovnaniRocniku'] = null;
  if (rokPasem && pasmaData) {
    const predchoziRokPasem = rokPasem - 1;
    const [predchoziPasma, median, medianPredchozi] = await Promise.all([
      getPasmaPrijetiZaRok(programId, predchoziRokPasem),
      celostatniMedianUchazecu(rokPasem),
      celostatniMedianUchazecu(predchoziRokPasem),
    ]);
    if (predchoziPasma) {
      srovnaniRocniku = {
        rok: rokPasem,
        predchoziRok: predchoziRokPasem,
        data: pasmaData,
        predchozi: predchoziPasma,
        celostatniMedian: median,
        celostatniMedianPredchozi: medianPredchozi,
      };
    }
  }

  const klicSouhrnu = souhrn.klic;

  const [poradiZajem, poradiVysledky] = await Promise.all([
    poradi(souhrn.rok, souhrn.kraj, souhrn.skupina, klicSouhrnu, 'tlak', souhrn.predchoziRok),
    poradi(souhrn.rok, souhrn.kraj, souhrn.skupina, klicSouhrnu, 'umisteni', souhrn.predchoziRok),
  ]);

  let kontext: ProfilOboruData['kontext'] = null;
  if (kontextVysledek) {
    const prevod = async ([k, n]: [string, number]): Promise<OborNaPrihlasce> => {
      const nazev = nazvy.get(k);
      const r = await souhrnOboru(k, kontextVysledek.rok);
      return {
        klic: k, uchazecu: n,
        skola: nazev?.skola ?? k, obec: nazev?.obec ?? '', obor: nazev?.obor ?? '', delka: nazev?.delka,
        href: nazev ? `/skola/${k.split('_')[0]}-${createSlug(nazev.nazev)}` : null,
        zarazeni: r ? zarazeniObtiznosti(r) : null,
        prijati: r?.prijati ?? null,
        soutezici: r ? soutezicichUchazecu(r) : null,
      };
    };
    kontext = {
      rok: kontextVysledek.rok,
      data: kontextVysledek.kontext,
      vys: await Promise.all(kontextVysledek.kontext.obory_vys.map(prevod)),
      niz: await Promise.all(kontextVysledek.kontext.obory_niz.map(prevod)),
    };
  }

  const posledni = [...extrakce].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  const podpora = posledni?.hard_facts?.support_services;

  return {
    rok: souhrn.rok,
    predchoziRok: souhrn.predchoziRok,
    aktualni: souhrn.aktualni,
    predchozi: souhrn.predchozi,
    stav: stavNabidky(souhrn.aktualni),
    zarazeni: zarazeniObtiznosti(souhrn.aktualni),
    zarazeniPredchozi: souhrn.predchozi ? zarazeniObtiznosti(souhrn.predchozi) : null,
    skupina: souhrn.skupina,
    skupinaNazev: nazevSkupiny(souhrn.skupina),
    krajNazev: souhrn.krajNazev,
    poradiZajem,
    poradiVysledky,
    pasma: rokPasem && pasmaData ? { rok: rokPasem, data: pasmaData } : null,
    srovnaniRocniku,
    verzeUchazecu,
    kontext,
    druheKolo,
    web,
    inspekce: posledni ? {
      datum: posledni.date,
      souhrn: posledni.plain_czech_summary,
      silne: (posledni.strengths ?? []).map(s => s.detail ? `${s.tag}: ${s.detail}` : s.tag).slice(0, 3),
      rizika: (posledni.risks ?? []).map(s => s.detail ? `${s.tag}: ${s.detail}` : s.tag).slice(0, 3),
      podpora: Array.isArray(podpora) ? (podpora as string[]).slice(0, 4) : [],
      otazky: (posledni.questions_for_open_day ?? []).slice(0, 3),
    } : null,
    jazyky: inspis?.vyuka_jazyku?.filter(j => j !== 'jiné') ?? null,
  };
}
