import { nactiPrevodDruhu } from '@/lib/prevod-testu';
import { kriteriaOboru, poziceOboru } from '@/lib/pozice-kriteria';
import { vsechnaKriteriaSkol } from '@/lib/kriteria-skoly-verejne';
import { maUdajeSkoly, sPrednostiSkoly } from '@/lib/kriteria-skoly-sloucit';
import { druhTestu, type DruhTestu, type KriteriaOboru, type PoziceOboru, type PrevodDruhu } from '@/lib/prevod-testu-vypocet';
import { getSchoolsData, getExtractionsByRedizo, getInspisDataByRedizo } from '@/lib/data';
import { getSouhrnNabidky, nabidkyVeSkupineKraje, souhrnOboru, type SouhrnRocniku } from '@/lib/souhrny-kolo1';
import { getKontextPrihlasek, type KontextPrihlasek } from '@/lib/kontext-prihlasek';
import { getSoubezneObce, type SoubezneObce } from '@/lib/okruhy-oboru';
import { getPasmaPrijeti, getPasmaPrijetiZaRok, celostatniMedianUchazecu, rokPasemPrijeti, type PasmaPrijetiObor } from '@/lib/pasma-prijeti';
import { getDruheKolo, type DruheKoloNabidky } from '@/lib/druhe-kolo';
import { verzeObdobi, zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { klicOboru, rocnikyKatalogu } from '@/lib/school-key';
import { getWebSkoly } from '@/lib/skoly-web';
import { getMaturitaOboru, type MaturitaOboru } from '@/lib/obor-maturita';
import { createSlug } from '@/lib/utils';
import {
  kohortaPozice, nazevSkupiny, poradiVeSkupine, stavNabidky, zarazeniObtiznosti, soutezicichUchazecu, znackaMimoPrehled,
  type KohortaPozice, type Poradi, type StavNabidky, type ZarazeniObtiznosti, type ZnackaMimoPrehled,
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
  /** Obor, který přehled nezahrnuje: bez jednotné zkoušky (například učební obor), nebo z jiného důvodu. */
  mimoPrehled: ZnackaMimoPrehled | null;
}

export interface ProfilOboruData {
  /** Maturita školy ve skupině oborů, do které tenhle obor patří; null, když se nedá říct nic. */
  maturita: MaturitaOboru | null;
  rok: number;
  predchoziRok: number | null;
  aktualni: SouhrnRocniku;
  predchozi: SouhrnRocniku | null;
  stav: StavNabidky;
  zarazeni: ZarazeniObtiznosti | null;
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  /** Kohorta podle pozice na přihlášce, zobrazený a předchozí ročník (slovník ukazatelů). */
  kohorta: KohortaPozice | null;
  kohortaPredchozi: KohortaPozice | null;
  skupina: string;
  skupinaNazev: string;
  krajNazev: string;
  poradiZajem: PoradiVKraji | null;
  poradiVysledky: PoradiVKraji | null;
  pasma: { rok: number; data: PasmaPrijetiObor } | null;
  /**
   * Podklady proužku „Kde stojím“ jen pro tento obor (docs/navrh-kde-stojim-2027.md):
   * převod jen pro druh testu oboru, pořadí soutěžících a kritéria předchozího ročníku.
   */
  kdeStojim: { druh: DruhTestu; prevod: PrevodDruhu | null; pozice: PoziceOboru | null; kriteria: KriteriaOboru | null } | null;
  /**
   * Kritéria zadaná školou v portálu u oboru bez proužku (nikoho neodmítli, málo
   * přijatých, rozpor počtů). Zveřejnění pravidel školy nezávisí na historickém pásmu.
   */
  kriteriaSkoly: KriteriaOboru | null;
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
  /** Souběžné přihlášky podle obce (okruhy oborů, issue #277); blok „Které další obory v okolí uchazeči také volí“. */
  soubezneObce: SoubezneObce | null;
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

/** Popis oboru školy podle klíče REDIZO_KKOV; pravidlo výběru sdílí se scripts/nazvy_oboru.py. */
async function nazvyOboru() {
  if (nazvyCache) return nazvyCache;
  const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
  const mapa = new Map<string, { skola: string; nazev: string; obec: string; obor: string; delka?: number }>();
  for (const rok of rocnikyKatalogu(Object.keys(data), await zobrazeneObdobi('cermat-vysledky'))) {
    for (const z of data[rok] ?? []) {
      const klic = klicOboru(z);
      if (!klic || mapa.has(klic)) continue;
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

/** Jedna definice pořadí v kraji pro stránku oboru i přehled kraje. */
export async function poradi(rok: number, kraj: string, skupina: string, klic: string, pole: 'tlak' | 'umisteni', predchoziRok: number | null): Promise<PoradiVKraji | null> {
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

/** Přepis kritérií pro zaměření stránky; bez shody všechna zaměření (komponenta pak ověřuje všechna). */
function kriteriaZamereni(k: KriteriaOboru | null, zamereni: string | undefined): KriteriaOboru | null {
  if (!k) return null;
  const norm = (t: string | undefined) => (t ?? '').trim().toLocaleLowerCase('cs-CZ');
  const shoda = zamereni ? k.prepisy.filter(p => norm(p.zamereni) === norm(zamereni)) : [];
  return shoda.length ? { ...k, prepisy: shoda } : k;
}

/** Null, když nabídka v zobrazeném ročníku souhrnů není; stránka pak použije starší podobu. */
export async function getProfilOboru(programId: string, zamereni: string | undefined, redizo: string): Promise<ProfilOboruData | null> {
  const souhrn = await getSouhrnNabidky(programId);
  if (!souhrn) return null;
  const [rokPasem, kontextVysledek, druheKolo, web, extrakce, inspis, nazvy, verzeUchazecu, soubezneObce] = await Promise.all([
    rokPasemPrijeti(), getKontextPrihlasek(programId), getDruheKolo(programId, zamereni), getWebSkoly(redizo),
    getExtractionsByRedizo(redizo), getInspisDataByRedizo(redizo), nazvyOboru(),
    verzeObdobi('cermat-uchazeci-kolo1'), getSoubezneObce(programId),
  ]);
  const pasmaData = rokPasem ? await getPasmaPrijeti(programId) : null;

  // Pozice a kritéria mají klíč REDIZO_KKOV bez zaměření, stejně jako pásma.
  const klicPasem = programId.split('_').slice(0, 2).join('_');
  const druh = druhTestu(klicPasem.split('_')[1] ?? '');
  // Bez vypočteného pásma nejistoty by proužek chybějící horní mez četl jako
  // „nad minimem se dostali všichni“, což data nemusí nést; zůstane histogram.
  const kdeStojim: ProfilOboruData['kdeStojim'] = rokPasem && pasmaData?.pasmo_nejistoty
    ? await Promise.all([nactiPrevodDruhu(druh), poziceOboru(klicPasem), kriteriaOboru(klicPasem), vsechnaKriteriaSkol()])
      .then(([prevod, pozice, kriteria, odSkol]) => {
        // Pásma, která počítají uchazeče s více zaměřeními vícekrát (issue #183),
        // se s deduplikovaným pořadím rozcházejí; proužek pak radši vůbec ne.
        const soucet = pozice ? Object.values(pozice).reduce((a, n) => a + n, 0) : null;
        if (soucet !== pasmaData.soutezicich) return null;
        return { druh, prevod, pozice, kriteria: sPrednostiSkoly(kriteriaZamereni(kriteria, zamereni), odSkol, klicPasem, zamereni, rokPasem) };
      })
    : null;

  let kriteriaSkoly: KriteriaOboru | null = null;
  if (!kdeStojim) {
    const [kriteria, odSkol] = await Promise.all([kriteriaOboru(klicPasem), vsechnaKriteriaSkol()]);
    const rokKriterii = rokPasem ?? kriteria?.rok ?? null;
    if (rokKriterii !== null) {
      const k = sPrednostiSkoly(kriteriaZamereni(kriteria, zamereni), odSkol, klicPasem, zamereni, rokKriterii);
      kriteriaSkoly = maUdajeSkoly(k) ? k : null;
    }
  }

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
      const mimo = nazev ? undefined : kontextVysledek.mimoPrehled[k];
      const r = await souhrnOboru(k, kontextVysledek.rok);
      return {
        klic: k, uchazecu: n,
        skola: nazev?.skola ?? mimo?.skola ?? k, obec: nazev?.obec ?? mimo?.obec ?? '', obor: nazev?.obor ?? mimo?.obor ?? '',
        delka: nazev?.delka,
        mimoPrehled: znackaMimoPrehled(Boolean(nazev), mimo),
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

  // Popisky ostatních oborů školy ve skupině. Název oboru je v katalogu pod klíčem bez
  // zaměření, ale rozlišuje je právě zaměření, takže se do popisku přidává.
  const maturita = await getMaturitaOboru(redizo, souhrn.smo16, souhrn.rok, nabidky => nabidky
    .filter(n => n.klic !== souhrn.klic)
    .map(n => {
      const nazev = nazvy.get(`${redizo}_${n.kkov}`)?.obor ?? n.kkov;
      // „Gymnázium · Gymnázium“ vypadá jako chyba; u 124 nabídek se zaměření rovná názvu oboru.
      return n.zamereni && n.zamereni.toLowerCase() !== nazev.toLowerCase() ? `${nazev} · ${n.zamereni}` : nazev;
    }));

  return {
    maturita,
    rok: souhrn.rok,
    predchoziRok: souhrn.predchoziRok,
    aktualni: souhrn.aktualni,
    predchozi: souhrn.predchozi,
    stav: stavNabidky(souhrn.aktualni),
    zarazeni: zarazeniObtiznosti(souhrn.aktualni),
    zarazeniPredchozi: souhrn.predchozi ? zarazeniObtiznosti(souhrn.predchozi) : null,
    kohorta: kohortaPozice(souhrn.aktualni, souhrn.nabidekVeSkupine),
    kohortaPredchozi: souhrn.predchozi ? kohortaPozice(souhrn.predchozi, souhrn.nabidekVeSkupinePredchozi) : null,
    skupina: souhrn.skupina,
    skupinaNazev: nazevSkupiny(souhrn.skupina),
    krajNazev: souhrn.krajNazev,
    poradiZajem,
    poradiVysledky,
    pasma: rokPasem && pasmaData ? { rok: rokPasem, data: pasmaData } : null,
    kdeStojim,
    kriteriaSkoly,
    srovnaniRocniku,
    verzeUchazecu,
    kontext,
    soubezneObce,
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
