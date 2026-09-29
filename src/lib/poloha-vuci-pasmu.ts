// ============================================================================
// Poloha vůči pásmu (slovník ukazatelů): kam převedený výsledek uchazeče padá
// proti pásmu 1. kola jednoho oboru. Čistá funkce bez Reactu, aby šla testovat
// na všech krajních případech (návrh simulátoru, oddíl 3, 10 a 12).
//
// Data: kompaktní index public/simulator_pasma_{rok}.json
// (scripts/build-simulator-pasma.py). Rok vždy z indexu, tedy z registru.
// ============================================================================

export type Skupina = 'nad' | 'v' | 'pod' | 'nikdo_neodmitnut' | 'bez_srovnani';

/** Pořadí skupin na stránce. */
export const PORADI_SKUPIN: Skupina[] = ['nad', 'v', 'pod', 'nikdo_neodmitnut', 'bez_srovnani'];

export type DuvodBezSrovnani =
  | 'chybi_data'        // obor v indexu není (bez jednotné zkoušky, bez dat 1. kola)
  | 'talentova'         // rozhoduje talentová zkouška (rozhodnutí zadavatele 7)
  | 'jiny_test'         // obor přijímá podle jiného testu (jiný druh), než uchazeč zadal
  | 'rozpor'            // počty v indexu si odporují
  | 'malo_prijatych'    // méně než MIN_PRIJATYCH_PRO_HRANICI přijatých
  | 'malo_odmitnutych'; // pásmo nejistoty nevzniklo (málo nevešlých), výsledek je nad nejnižším přijatým

/** Jak meze pásma leží: běžně, obě stejné, nebo horní pod dolní (mezi nimi nikdo). */
export type TvarPasma = 'bezne' | 'shodne_meze' | 'mezera';

export interface RadekPasma {
  min_prijaty: number | null;
  dolni_mez: number | null;
  horni_mez: number | null;
  soutezicich: number | null;
  prijatych: number | null;
  neveslo_se: number | null;
  v_pasmu_soutezilo: number | null;
  v_pasmu_prijato: number | null;
  nikdo_neodmitnut: boolean;
  talentova: boolean;
  druh: number | null;
  /** true / false podle kritérií; null = bez přepisu kritérií (chybějící není nula). */
  extra_body: boolean | null;
  obec: string | null;
}

export interface IndexPasem {
  rok: number;
  kolo: number;
  rok_kriterii: number | null;
  min_prijatych_pro_hranici: number;
  obce: string[];
  data: Map<string, RadekPasma>;
}

export interface Poloha {
  skupina: Skupina;
  duvod?: DuvodBezSrovnani;
  tvar?: TvarPasma;
  radek?: RadekPasma;
}

type Hodnota = number | null;
const cisloNeboNull = (x: unknown): Hodnota => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Převede index v podobě souboru (řádky podle `sloupce`) na mapu záznamů. */
export function nactiIndexPasem(json: {
  rok: number; kolo?: number; rok_kriterii?: number | null; min_prijatych_pro_hranici: number;
  sloupce: string[]; obce: string[]; data: Record<string, unknown[]>;
}): IndexPasem {
  const i = (nazev: string) => json.sloupce.indexOf(nazev);
  const sl = Object.fromEntries(['min_prijaty', 'dolni_mez', 'horni_mez', 'soutezicich', 'prijatych', 'neveslo_se',
    'v_pasmu_soutezilo', 'v_pasmu_prijato', 'nikdo_neodmitnut', 'talentova', 'druh', 'extra_body', 'obec']
    .map(n => [n, i(n)])) as Record<string, number>;
  const data = new Map<string, RadekPasma>();
  for (const [klic, r] of Object.entries(json.data)) {
    const hod = (n: string) => (sl[n] < 0 ? null : cisloNeboNull(r[sl[n]]));
    const extra = hod('extra_body');
    const obec = hod('obec');
    data.set(klic, {
      min_prijaty: hod('min_prijaty'),
      dolni_mez: hod('dolni_mez'),
      horni_mez: hod('horni_mez'),
      soutezicich: hod('soutezicich'),
      prijatych: hod('prijatych'),
      neveslo_se: hod('neveslo_se'),
      v_pasmu_soutezilo: hod('v_pasmu_soutezilo'),
      v_pasmu_prijato: hod('v_pasmu_prijato'),
      nikdo_neodmitnut: hod('nikdo_neodmitnut') === 1,
      talentova: hod('talentova') === 1,
      druh: hod('druh'),
      extra_body: extra === null ? null : extra === 1,
      obec: obec === null ? null : json.obce[obec] ?? null,
    });
  }
  return {
    rok: json.rok, kolo: json.kolo ?? 1, rok_kriterii: json.rok_kriterii ?? null,
    min_prijatych_pro_hranici: json.min_prijatych_pro_hranici, obce: json.obce, data,
  };
}

/** Klíč pásem je obor školy bez zaměření: REDIZO_KKOV. */
export function klicPasma(idNabidky: string): string {
  const [redizo, kkov] = idNabidky.split('_');
  return `${redizo}_${kkov}`;
}

/**
 * Řádek pásma pro nabídku jen tehdy, když je vazba doložená: nabídka (včetně formy
 * studia) je v katalogu simulátoru, ze kterého index pásem vznikl. Historicky uložená
 * nabídka dohledaná ve starším katalogu (např. kombinovaná forma) by jinak převzala
 * pásmo jiné nabídky se stejným REDIZO_KKOV; taková zůstane bez srovnání.
 */
export function radekPasmaNabidky(
  idNabidky: string, klicePlatnychNabidek: ReadonlySet<string>, normalizuj: (id: string) => string,
  data: ReadonlyMap<string, RadekPasma> | undefined,
): RadekPasma | undefined {
  if (!data || !klicePlatnychNabidek.has(normalizuj(idNabidky))) return undefined;
  return data.get(klicPasma(idNabidky));
}

/**
 * Poloha výsledku `body` (převedený výsledek, u více testů nejhorší) vůči pásmu oboru.
 * `druhTestu` je druh testu, pro který uchazeč výsledek zadal (4, 6, 8).
 *
 * Chybějící údaj se nikdy nepočítá jako „pod pásmem“: skončí v „Bez srovnání“ s důvodem.
 */
export function polohaVuciPasmu(
  body: number, radek: RadekPasma | undefined, druhTestu: number, minPrijatych: number,
): Poloha {
  if (!radek) return { skupina: 'bez_srovnani', duvod: 'chybi_data' };
  const bez = (duvod: DuvodBezSrovnani): Poloha => ({ skupina: 'bez_srovnani', duvod, radek });
  if (radek.talentova) return bez('talentova');
  if (radek.druh !== null && radek.druh !== druhTestu) return bez('jiny_test');
  const { soutezicich, prijatych, neveslo_se, min_prijaty } = radek;
  if (soutezicich === null || prijatych === null || neveslo_se === null) return bez('chybi_data');
  if (soutezicich !== prijatych + neveslo_se || (radek.nikdo_neodmitnut && neveslo_se !== 0)) return bez('rozpor');
  // Nikdo neodmítnut kvůli počtu míst je fakt o celém oboru, ne hranice: platí i při malém počtu přijatých.
  if (radek.nikdo_neodmitnut) return { skupina: 'nikdo_neodmitnut', radek };
  if (prijatych < minPrijatych) return bez('malo_prijatych');
  if (min_prijaty === null) return bez('chybi_data');
  const { dolni_mez: dolni, horni_mez: horni } = radek;
  if (dolni === null || horni === null) {
    // Bez pásma víme jen, že pod nejnižším přijatým se nedostal nikdo.
    return body < min_prijaty ? { skupina: 'pod', radek } : bez('malo_odmitnutych');
  }
  const vs = radek.v_pasmu_soutezilo, vp = radek.v_pasmu_prijato;
  if (vs === null || vp === null || vp > vs || vs > soutezicich) return bez('rozpor');
  if (horni < dolni) {
    // Mezi mezemi nespadl nikdo: všichni od dolní meze se dostali, do horní nikdo.
    if (body >= dolni) return { skupina: 'nad', tvar: 'mezera', radek };
    if (body <= horni) return { skupina: 'pod', tvar: 'mezera', radek };
    return { skupina: 'v', tvar: 'mezera', radek };
  }
  if (body < dolni) return { skupina: 'pod', tvar: horni === dolni ? 'shodne_meze' : 'bezne', radek };
  if (body > horni) return { skupina: 'nad', tvar: horni === dolni ? 'shodne_meze' : 'bezne', radek };
  return { skupina: 'v', tvar: horni === dolni ? 'shodne_meze' : 'bezne', radek };
}

export const NAZEV_SKUPINY: Record<Skupina, string> = {
  nad: 'Nad pásmem',
  v: 'V pásmu',
  pod: 'Pod pásmem',
  nikdo_neodmitnut: 'Obory, kde nikoho neodmítli',
  bez_srovnani: 'Bez srovnání',
};

const b = (n: number) => `${n.toLocaleString('cs-CZ')} ${n === 1 ? 'bod' : n >= 2 && n <= 4 ? 'body' : 'bodů'}`;

/** Věta u nabídky. Rok je rok pásem z indexu, tedy z registru. */
export function vetaPolohy(p: Poloha, rok: number, minPrijatych: number): string {
  const r = p.radek;
  switch (p.skupina) {
    case 'nad':
      if (p.tvar === 'mezera') return `V 1. kole ${rok} se sem dostali všichni soutěžící uchazeči od ${b(r!.dolni_mez!)} výš (${r!.prijatych} přijatých z ${r!.soutezicich}).`;
      return `V 1. kole ${rok} se sem dostali všichni soutěžící uchazeči s takovým výsledkem (${r!.prijatych} přijatých z ${r!.soutezicich}).`;
    case 'v':
      if (p.tvar === 'mezera') return `Hranice v 1. kole ${rok} ležela právě tady: všichni soutěžící uchazeči od ${b(r!.dolni_mez!)} výš se dostali, s ${b(r!.horni_mez!)} a méně nikdo. S výsledkem mezi tím nesoutěžil nikdo.`;
      if (p.tvar === 'shodne_meze') return `Přesně s tímto výsledkem (${b(r!.dolni_mez!)}) se v 1. kole ${rok} někdo dostal a někdo ne.`;
      return `Rozhodovalo i něco jiného než test: z ${r!.v_pasmu_soutezilo} soutěžících uchazečů v rozmezí ${r!.dolni_mez}–${b(r!.horni_mez!)} se v 1. kole ${rok} dostalo ${r!.v_pasmu_prijato}.`;
    case 'pod':
      return `V 1. kole ${rok} se sem s takovým výsledkem nedostal nikdo (nejnižší výsledek přijatých: ${b(r!.min_prijaty!)}).`;
    case 'nikdo_neodmitnut': {
      const dost = (r!.prijatych ?? 0) >= minPrijatych && r!.min_prijaty !== null;
      return `V 1. kole ${rok} tu nikoho neodmítli kvůli počtu míst: kdo splnil požadavky školy, dostal se (${r!.prijatych} přijatých).` +
        (dost ? ` Nejnižší výsledek přijatých byl ${b(r!.min_prijaty!)}.` : '');
    }
    case 'bez_srovnani':
      return DUVOD_TEXT[p.duvod ?? 'chybi_data'];
  }
}

export const DUVOD_TEXT: Record<DuvodBezSrovnani, string> = {
  chybi_data: 'Pro tento obor nemáme výsledky 1. kola s jednotnou přijímací zkouškou.',
  talentova: 'O přijetí rozhoduje hlavně talentová zkouška, test tu řekne málo.',
  jiny_test: 'Obor přijímá podle jiného testu, než pro který máš zadaný výsledek.',
  rozpor: 'Počty v datech si odporují, proto obor neřadíme.',
  malo_prijatych: 'Přijatých bylo méně než deset; z tak malého počtu hranici neukazujeme.',
  malo_odmitnutych: 'Nevešlo se jen pár uchazečů, rozmezí, kde rozhodovalo i něco jiného, proto nepočítáme. Tvůj výsledek je nad nejnižším výsledkem přijatých.',
};

/** Věta pod názvem skupiny; vysvětluje pojem při prvním výskytu v bloku (slovník pojmů). */
export function popisSkupiny(s: Skupina, rok: number): string {
  switch (s) {
    case 'nad': return `S tvým výsledkem se v 1. kole ${rok} dostali všichni soutěžící uchazeči, tedy ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš.`;
    case 'v': return `Tvůj výsledek padá do rozmezí, kde v 1. kole ${rok} rozhodovalo i něco jiného než test: část soutěžících uchazečů (splnili požadavky školy a nedostali se na obor výš na přihlášce) se dostala a část ne.`;
    case 'pod': return `S tvým výsledkem se v 1. kole ${rok} nedostal nikdo ze soutěžících uchazečů, tedy z těch, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš.`;
    case 'nikdo_neodmitnut': return `V 1. kole ${rok} tu nikoho neodmítli kvůli počtu míst; kdo splnil podmínky, dostal se. Přijímalo se podle podmínek školy (minima, kritéria), ne podle pořadí.`;
    case 'bez_srovnani': return 'U těchto oborů tvůj výsledek s 1. kolem srovnat neumíme. Důvod je u každého oboru.';
  }
}

/**
 * Hodnota pro řazení „od nejvyšší hranice přijetí“; null = patří na konec.
 * Hranici nemají obory, kde o přijetí nerozhodoval test (talentová zkouška), kde nikoho
 * neodmítli kvůli počtu míst (nesoutěžilo se) a obory s rozporem počtů.
 */
export function hodnotaHranice(r: RadekPasma | undefined, minPrijatych: number): number | null {
  if (!r || r.min_prijaty === null || r.prijatych === null || r.prijatych < minPrijatych) return null;
  if (r.talentova || r.nikdo_neodmitnut) return null;
  if (r.soutezicich === null || r.neveslo_se === null || r.soutezicich !== r.prijatych + r.neveslo_se) return null;
  // Rozpor počtů uvnitř pásma: stejná podmínka jako skupina „Bez srovnání“ v polohaVuciPasmu.
  if (r.dolni_mez !== null && r.horni_mez !== null) {
    const vs = r.v_pasmu_soutezilo, vp = r.v_pasmu_prijato;
    if (vs === null || vp === null || vp > vs || vs > r.soutezicich) return null;
  }
  return r.min_prijaty;
}

/**
 * Řazení nabídek: výchozí podle dojezdu (bez dojezdu nic), pak abecedně;
 * „hranice“ nejprve od nejvyššího nejnižšího výsledku přijatých, bez hodnoty na konec.
 * Nikdy podle vzdálenosti uchazeče od hranice (slovník: pásmo neřadí obory).
 */
export function seradNabidky<T>(
  nabidky: T[], zpusob: 'dojezd' | 'hranice',
  o: { minuty: (x: T) => number | undefined; nazev: (x: T) => string; hranice: (x: T) => number | null },
): T[] {
  const cas = (x: T) => o.minuty(x) ?? Infinity;
  return [...nabidky].sort((a, c) => {
    if (zpusob === 'hranice') {
      const ha = o.hranice(a), hc = o.hranice(c);
      if (ha !== hc) {
        if (ha === null) return 1;
        if (hc === null) return -1;
        return hc - ha;
      }
    }
    return (cas(a) - cas(c)) || o.nazev(a).localeCompare(o.nazev(c), 'cs');
  });
}

/** Rozdělí nabídky do skupin v pořadí PORADI_SKUPIN. */
export function rozdelDoSkupin<T>(nabidky: T[], poloha: (x: T) => Poloha): Map<Skupina, T[]> {
  const out = new Map<Skupina, T[]>(PORADI_SKUPIN.map(s => [s, []]));
  for (const n of nabidky) out.get(poloha(n).skupina)!.push(n);
  return out;
}
