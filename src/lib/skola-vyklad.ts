/**
 * Výklad dat na stránce školy: ročník a délka oboru, typ školy slovy, vzdálenost a směr
 * okolních škol a shrnutí maturity přes roky. Čisté funkce bez přístupu k souborům.
 * Návrh: docs/stranka-skoly-2027.md, pojmy: docs/slovnik-pojmu.md, ukazatele: docs/slovnik-ukazatelu.md.
 */

export interface Poloha {
  lat: number;
  lon: number;
}

/** Vzdálenost vzdušnou čarou v kilometrech. */
export function vzdalenostKm(a: Poloha, b: Poloha): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Směr z a do b ve stupních, 0 = sever, po směru hodinových ručiček. */
export function smerStupne(a: Poloha, b: Poloha): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Ze které třídy se na obor hlásí, podle srovnatelné skupiny souhrnů („GY8_8“). */
export function proKohoObor(skupina: string | null | undefined, delka: number): string {
  const typ = (skupina ?? '').split('_')[0];
  if (typ === 'GY8' || delka === 8) return 'z 5. třídy';
  if (typ === 'GY6' || delka === 6) return 'ze 7. třídy';
  if (typ === 'NAS') return 'po vyučení';
  return 'z 9. třídy';
}

export function delkaSlovy(delka: number): string {
  if (delka === 1) return '1 rok';
  if (delka >= 2 && delka <= 4) return `${delka} roky`;
  return `${delka} let`;
}

const DELKA_PRIDAVNE: Record<number, string> = { 2: 'dvouleté', 3: 'tříleté', 4: 'čtyřleté', 5: 'pětileté', 6: 'šestileté', 8: 'osmileté' };

/**
 * „Gymnázium, Nad Štolou, Praha“: k názvu školy připojí obec, pokud ji název sám neobsahuje.
 * Podle návrhu stránky školy pozná rodina školu právě podle místa, proto patří do hlavičky.
 * Obec se hledá jako celé slovo: podřetězcem by obec „Aš“ seděla na „Vlašim“ a „Bor“ na „Tábor“.
 * Ze 1 120 škol katalogu 2026 má obec v názvu 151, u těch se nic nepřipojuje.
 */
export function nazevSObci(nazev: string, obec: string): string {
  if (!obec) return nazev;
  const bezDiakritiky = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
  const hledana = bezDiakritiky(obec).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const celeSlovo = new RegExp(`(^|[^a-z0-9])${hledana}([^a-z0-9]|$)`);
  return celeSlovo.test(bezDiakritiky(nazev)) ? nazev : `${nazev}, ${obec}`;
}

/**
 * Nadpis stránky školy: plný název z rejstříku škol MŠMT (`identifikace[redizo].uplny_nazev`
 * v data/msmt_rejstrik/nazvy-oboru.json), jinak zkrácený název z katalogu. Obec se připojí jen
 * tehdy, když v názvu není (`nazevSObci`). Zkrácený název („Střední zdravotnická škola, Mládeže“)
 * škola sama nepoužívá; adresa stránky (slug) se nemění.
 */
export function nazevSkolyNadpis(uplnyNazev: string | null | undefined, nazev: string, obec: string): string {
  const uplny = (uplnyNazev ?? '').replace(/\s+/g, ' ').trim();
  return nazevSObci(uplny || nazev, obec);
}

/**
 * Klasické jazyky nejsou cizí jazyky: latina a starořečtina se v profilu InspIS vedou mezi
 * jazyky výuky, ale rodina pod „cizími jazyky“ čeká živé jazyky. Latinu má 178 profilů,
 * hlavně zdravotnické školy a gymnázia.
 */
const KLASICKE_JAZYKY = new Set(['latinský', 'latina', 'starořecký', 'starořečtina', 'klasická řečtina']);

/** Jazyky z profilu školy rozdělené na cizí (živé) a klasické; „jiné“ se vynechá. */
export function rozdelJazyky(jazyky: string[] | null | undefined): { cizi: string[]; klasicke: string[] } {
  const p = (jazyky ?? []).map(j => j.trim()).filter(j => j && j !== 'jiné');
  const klasicky = (j: string) => KLASICKE_JAZYKY.has(j.toLocaleLowerCase('cs-CZ'));
  return { cizi: p.filter(j => !klasicky(j)), klasicke: p.filter(klasicky) };
}

/** „1 cizí jazyk“, „3 cizí jazyky“, „5 cizích jazyků“. */
export function pocetCizichJazyku(n: number): string {
  if (n === 1) return '1 cizí jazyk';
  if (n >= 2 && n <= 4) return `${n} cizí jazyky`;
  return `${n} cizích jazyků`;
}

/** „1 místo“, „3 místa“, „28 míst“. */
export function pocetMist(n: number, format: (n: number) => string = String): string {
  return `${format(n)} ${n === 1 ? 'místo' : n >= 2 && n <= 4 ? 'místa' : 'míst'}`;
}

/**
 * „28 míst Praktická sestra, 28 míst Zdravotnické lyceum“: místa v 1. kole po oborech, aby
 * součet za školu nevypadal jako jedno přijímání. Délka se připíše jen u názvu, který se
 * opakuje; nad `nejvic` oborů zbytek shrne („a 3 další obory“). Obory bez kapacity se vynechají.
 */
export function mistaPoOborech(
  obory: { nazev: string; delka: number; kapacita: number | null }[],
  nejvic = 4,
  format: (n: number) => string = String,
): string {
  const sMisty = obory.filter(o => o.kapacita !== null && o.kapacita > 0);
  const pocetNazvu = new Map<string, number>();
  for (const o of sMisty) pocetNazvu.set(o.nazev, (pocetNazvu.get(o.nazev) ?? 0) + 1);
  const casti = sMisty.map(o => `${pocetMist(o.kapacita!, format)} ${o.nazev}${(pocetNazvu.get(o.nazev) ?? 0) > 1 ? ` (${o.delka}leté)` : ''}`);
  const zbytek = casti.length - nejvic;
  if (zbytek <= 0) return casti.join(', ');
  return `${casti.slice(0, nejvic).join(', ')} a ${zbytek} ${zbytek === 1 ? 'další obor' : zbytek < 5 ? 'další obory' : 'dalších oborů'}`;
}

/**
 * Věta o nejtěžším přijetí v rozcestníku. Obtížnost patří vždy ke konkrétnímu oboru, za
 * školu se nesčítá; název oboru stojí za slovem „obor“, takže ho není třeba skloňovat
 * (dřív „na praktická sestra bylo…“). Při shodě víc oborů na nejvyšší obtížnosti se jmenují
 * dva, u víc oborů jen počet a první z nich.
 */
export function vetaNejtezsihoPrijeti(
  nejtezsi: { nazev: string; delka: number | null }[],
  popisek: string,
  vypsanychOboru: number,
): string {
  if (!nejtezsi.length) return '';
  const jmeno = (o: { nazev: string; delka: number | null }) => `${o.nazev}${o.delka ? ` (${o.delka}leté)` : ''}`;
  if (vypsanychOboru <= 1) return `Přijetí na obor ${jmeno(nejtezsi[0])}: ${popisek}.`;
  if (nejtezsi.length === 1) return `Nejtěžší bylo dostat se na obor ${jmeno(nejtezsi[0])}: ${popisek}.`;
  if (nejtezsi.length === vypsanychOboru) return `Na všechny obory bylo ${popisek} se dostat.`;
  if (nejtezsi.length === 2) return `Nejtěžší bylo dostat se na obory ${jmeno(nejtezsi[0])} a ${jmeno(nejtezsi[1])}: ${popisek}.`;
  return `Nejtěžší bylo dostat se na ${pocetOboru(nejtezsi.length)}, například ${jmeno(nejtezsi[0])}: ${popisek}.`;
}

/** „Gymnázium osmileté a čtyřleté, technické lyceum“: obory školy podle názvu, délky jen u opakovaného názvu. */
export function oboryVetou(obory: { obor: string; delka: number }[], nejvic = 4): string {
  const podleNazvu = new Map<string, number[]>();
  for (const o of obory) {
    const delky = podleNazvu.get(o.obor) ?? [];
    if (!delky.includes(o.delka)) delky.push(o.delka);
    podleNazvu.set(o.obor, delky);
  }
  const casti = [...podleNazvu.entries()].map(([nazev, delky], i) => {
    const jmeno = i === 0 ? nazev : nazev.charAt(0).toLowerCase() + nazev.slice(1);
    if (delky.length < 2) return jmeno;
    const slova = delky.sort((a, b) => b - a).map(d => DELKA_PRIDAVNE[d] ?? `${d}leté`);
    return `${jmeno} ${slova.slice(0, -1).join(', ')} a ${slova.at(-1)}`;
  });
  const zbytek = casti.length - nejvic;
  const zobrazene = casti.slice(0, nejvic);
  if (zbytek > 0) return `${zobrazene.join(', ')} a ${zbytek} ${zbytek === 1 ? 'další obor' : zbytek < 5 ? 'další obory' : 'dalších oborů'}`;
  // Když už část spojku „a“ obsahuje („osmileté a čtyřleté“), další obor se připojí čárkou.
  const spojka = zobrazene.slice(0, -1).some(c => c.includes(' a ')) ? ', ' : ' a ';
  return zobrazene.length > 1 ? `${zobrazene.slice(0, -1).join(', ')}${spojka}${zobrazene.at(-1)}` : zobrazene[0] ?? '';
}

/**
 * Podnadpis pod názvem školy: věta, kterou škola zadala v portálu, jinak automatická
 * věta z oborů. Prázdná hodnota nebo samé mezery znamenají automatický podnadpis.
 */
export function podnadpisSkoly(odSkoly: string | null | undefined, automaticky: string): { text: string; odSkoly: boolean } {
  const vlastni = (odSkoly ?? '').replace(/\s+/g, ' ').trim();
  return vlastni ? { text: vlastni, odSkoly: true } : { text: automaticky, odSkoly: false };
}

export function pocetOboru(n: number): string {
  return `${n} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;
}

// ------------------------------------------------------------------ maturita

export type StavProtiSkupine = 'above' | 'indistinguishable' | 'below';

export interface MaturitaPredmet {
  registered?: number;
  took?: number;
  passed?: number;
  failed?: number;
  absent?: number;
  passRate?: number;
  grossFailureRate?: number;
  nonParticipationRate?: number;
  averagePercentScore?: number;
  standardDeviation?: number;
  averagePercentile?: number;
  subjectChoiceShare?: number;
  quality?: 'complete' | 'small_sample' | 'counts_only' | 'unavailable';
  groupComparison?: { state: StavProtiSkupine; interval: [number, number]; medianPercentScore: number; schools: number };
}

export interface MaturitaSkupinaRoku {
  spolecna_cast?: MaturitaPredmet;
  cj?: MaturitaPredmet;
  ma?: MaturitaPredmet;
}

export interface RokMaturity {
  rok: number;
  zaznam: MaturitaSkupinaRoku | null;
  stav: StavProtiSkupine | null;
}

export interface ShrnutiMaturity {
  smo16: string;
  roky: RokMaturity[];
  posledni: { rok: number; zaznam: MaturitaSkupinaRoku } | null;
  letNad: number;
  letSeZarazenim: number;
}

/**
 * Zařazení školy ve skupině oborů přes posledních `pocet` zveřejněných jarních období.
 * Roky bez zařazení se nepočítají jako „ne nad skupinou“ (slovník ukazatelů, Počet let nad skupinou oborů).
 */
export function shrnutiMaturity(
  rokyZdroje: number[],
  skola: Record<string, Record<string, MaturitaSkupinaRoku>>,
  smo16: string,
  pocet = 4,
): ShrnutiMaturity {
  const roky = [...rokyZdroje].sort((a, b) => a - b).slice(-pocet).map(rok => {
    const zaznam = skola[String(rok)]?.[smo16] ?? null;
    return { rok, zaznam, stav: zaznam?.cj?.groupComparison?.state ?? null };
  });
  const sDaty = roky.filter(r => r.zaznam);
  const posledniRok = sDaty.at(-1);
  return {
    smo16,
    roky,
    posledni: posledniRok ? { rok: posledniRok.rok, zaznam: posledniRok.zaznam! } : null,
    letNad: roky.filter(r => r.stav === 'above').length,
    letSeZarazenim: roky.filter(r => r.stav).length,
  };
}

export const STAV_POPISEK: Record<StavProtiSkupine, string> = {
  above: 'nad středem podobných škol',
  indistinguishable: 'nerozlišitelné od středu',
  below: 'pod středem podobných škol',
};

const SKUPINY_MATURITY: Record<string, string> = {
  GY8: 'osmileté gymnázium', GY6: 'šestileté gymnázium', GY4: 'čtyřleté gymnázium', LYC: 'lyceum',
  // CERMAT jmenuje skupinu „SOŠ zdravotnické“; rodiče hledají obor (#370, rozhodnutí vlastníka: u všech škol).
  SZD: 'praktická sestra',
};

/** Název skupiny oborů pro text stránky: „osmileté gymnázium“; ostatní skupiny podle CERMATu malými písmeny. */
export function nazevSkupinyMaturity(smo16: string, nazevCermat: string | null | undefined): string {
  return SKUPINY_MATURITY[smo16] ?? (nazevCermat ?? smo16).toLocaleLowerCase('cs-CZ');
}

/**
 * Jak často byla škola v češtině nad středem podobných škol, za všechny skupiny oborů dohromady.
 * Jednotkou je hodnocení skupiny oborů v roce; chybějící roky se nepočítají.
 * Null, když žádné hodnocení nemá zařazení.
 */
export function jakCastoNadStredem(skupiny: { letNad: number; letSeZarazenim: number; roky?: { rok: number; stav: string | null }[] }[]): string | null {
  const nad = skupiny.reduce((s, x) => s + x.letNad, 0);
  const celkem = skupiny.reduce((s, x) => s + x.letSeZarazenim, 0);
  if (!celkem) return null;
  const podil = nad / celkem;
  if (podil === 1 && celkem === 1) {
    const rok = skupiny.flatMap(s => s.roky ?? []).find(r => r.stav)?.rok;
    return rok ? `v roce ${rok}` : 'v jediném hodnoceném roce';
  }
  if (podil === 1) return 've všech hodnoceních';
  if (podil >= 0.75) return 'v téměř všech hodnoceních';
  if (podil > 0.5) return 've většině hodnocení';
  if (podil === 0.5) return 'v polovině hodnocení';
  if (podil > 0) return 'jen v některých hodnoceních';
  return 'v žádném hodnocení';
}

/** „ve 3 ze 4 let“, „ve všech 4 letech“, „v roce 2026“. */
export function letNadSlovy(s: ShrnutiMaturity): string {
  if (s.letSeZarazenim === 0) return '';
  if (s.letSeZarazenim === 1) {
    const r = s.roky.find(x => x.stav)!;
    return r.stav === 'above' ? `v roce ${r.rok}` : `v žádném roce, v roce ${r.rok} ${STAV_POPISEK[r.stav!]}`;
  }
  if (s.letNad === s.letSeZarazenim) return `ve všech ${s.letSeZarazenim} letech`;
  const nad = s.roky.filter(r => r.stav === 'above').map(r => r.rok);
  const sZarazenim = s.roky.filter(r => r.stav).map(r => r.rok);
  // Nad skupinou jen v posledních letech za sebou: jmenovat roky místo počtu.
  if (nad.length >= 1 && nad.length <= 2 && sZarazenim.slice(-nad.length).join() === nad.join()) {
    return nad.length === 1 ? `v roce ${nad[0]}` : `v letech ${nad[0]} a ${nad[1]}`;
  }
  if (s.letNad === 0) return `v žádném ze ${s.letSeZarazenim} let`;
  return `${s.letNad >= 2 && s.letNad <= 4 ? 've' : 'v'} ${s.letNad} ze ${s.letSeZarazenim} let`;
}

/**
 * Věta, koho se maturitní výsledek týká na stránce oboru.
 *
 * Číslo platí za skupinu maturitních oborů, ne za jeden obor. Obor, který je ve skupině sám,
 * o sobě mluvit smí; jinak se musí říct, s kým výsledek sdílí. Do tří oborů se vyjmenují,
 * nad tři se uvede počet — u 80 napojených nabídek jich je ve skupině pět a víc a výčet by
 * větu utopil.
 * Rozhodnutí: docs/maturita-na-strance-oboru-2027.md, oddíl 4.
 *
 * `dalsiObory` jsou **ostatní** obory školy ve skupině, bez toho, na jehož stránce čtenář je.
 */
export function kohoSeTykaMaturita(m: { samotny: boolean; dalsiObory: string[] }): string {
  if (m.samotny || m.dalsiObory.length === 0) return 'Maturanti tohoto oboru';
  if (m.dalsiObory.length === 1) return `Maturanti tohoto oboru a oboru ${m.dalsiObory[0]}`;
  if (m.dalsiObory.length <= 3) {
    const bezPosledniho = m.dalsiObory.slice(0, -1).join(', ');
    return `Maturanti tohoto oboru a oborů ${bezPosledniho} a ${m.dalsiObory.at(-1)}`;
  }
  return `Maturanti tohoto a dalších ${m.dalsiObory.length} oborů školy`;
}

/**
 * Ze kterého roku vzít maturitní výsledek skupiny oborů a co se o něm dá říct.
 *
 * Bere **poslední rok se záznamem**, ne zobrazené období: obor, ve kterém letos nikdo
 * nematuroval, jinak tvrdí „nemá maturanty“, zatímco stránka školy u téhož píše „poslední
 * maturita 2025“. Nález 1 review PR #112, 31 nabídek.
 *
 * `nezverejneno` znamená, že maturanti byli, ale pod deseti konajícími se podíly nezveřejňují
 * (maturitní návrh §7); karta pak nesmí vzniknout prázdná, musí říct proč.
 */
export function rokMaturityOboru(
  roky: Record<string, Record<string, MaturitaSkupinaRoku>>,
  smo16: string,
  obdobiRok: number,
): { rok: number | null; nezverejneno: boolean } {
  const rok = Object.keys(roky)
    .map(Number).filter(r => r <= obdobiRok && roky[String(r)]?.[smo16])
    .sort((a, b) => b - a)[0];
  if (rok === undefined) return { rok: null, nezverejneno: false };
  const z = roky[String(rok)][smo16];
  const maCislo = (z.spolecna_cast?.passed !== undefined && z.spolecna_cast?.registered !== undefined)
    || z.cj?.averagePercentScore !== undefined
    || z.ma?.subjectChoiceShare !== undefined;
  return { rok, nezverejneno: !maCislo };
}
