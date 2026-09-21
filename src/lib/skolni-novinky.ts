// ============================================================================
// Čtení školních novinek pro web.
//
// Návrh: docs/skolske-novinky-rss-2027.md, oddíly 3.4, 3.6 a 3.7.
//
// Tři pravidla, která tenhle modul vynucuje a na kterých stojí, co čtenář uvidí:
//
//  1. **Výpadek databáze není „škola nemá novinky".** Chyba čtení se propaguje
//     ven jako chyba; volající vrátí chybový stav a blok se nezobrazí. Nikdy se
//     nevrací prázdný seznam jako by šlo o zjištěný fakt.
//  2. **Proběhlý termín není pozvánka.** Platnost se počítá k času dotazu, ne
//     k času sklizně: karta zvýrazní jen budoucí termíny a po `konec_platnosti`
//     položka klesne mezi běžné novinky.
//  3. **Přepínač platí při čtení.** Skrytá položka, vypnutý zdroj nebo vypnuté
//     zvýrazňování třídy se musí projevit i na tom, co už v databázi leží –
//     zastavení sklízeče samo o sobě chybnou kartu neskryje.
// ============================================================================

import { dotaz, jeDbNastavena } from './novinky-db.ts';

/**
 * Co publikační rozhodnutí sklízeče o položce řeklo.
 *
 * `karta_terminu` je historická hodnota: do 20. 9. 2026 znamenala kartu, která
 * čtenáři tvrdila datum akce. Datum se už nezobrazuje, takže se při čtení
 * překládá na `karta`. V databázi zůstane, dokud položku nepřepočítá další
 * sklizeň (změna `verze_pravidel` přepočet vyvolá).
 */
export type Zobrazeni = 'karta_terminu' | 'karta' | 'odkaz' | 'seznam';

export interface SkolniNovinka {
  id: string;
  titulek: string;
  url: string;
  publikovano: string | null;
  /**
   * Kdy jsme položku poprvé viděli ve feedu.
   *
   * Není to datum vydání a nesmí ho zastupovat v řazení ani v platnosti. Slouží
   * jedinému účelu: u zprávy bez použitelného data vydání (feed ho neuvedl nebo
   * uvedl datum v budoucnosti) je to jediné, co o jejím stáří pravdivě víme –
   * vyšla někdy mezi předchozí a touhle sklizní.
   */
  objevenoAt: string | null;
  zobrazeni: Zobrazeni;
  tridy: string[];
  duvod: string | null;
  /**
   * Věta s termíny akce, složená sklízečem ze šablony („Škola pořádá dny
   * otevřených dveří 9. 12. 2026 a 7. 1. 2027.").
   *
   * Je naše, ne školy: model odpověděl jen na to, co které datum v článku
   * znamená, a větu z toho složil kód (`scripts/novinky_jev.py`). Proto ji jde
   * zobrazit vedle odkazu, aniž by se přebíral text cizího článku.
   *
   * Co **neříká**: že akce je jediná, ani že se nezměnila. Vyjmenovává data,
   * která škola k té akci uvedla, a zobrazuje se, dokud je aspoň jedno z nich
   * v budoucnu – u série dnů otevřených dveří tedy může jmenovat i termín,
   * který už proběhl. Podrobnosti jsou v článku, na který karta odkazuje.
   */
  souhrn: string | null;
}

export interface NovinkySkoly {
  /** Zprávy k přijímacímu řízení: karty a odkazy. Patří na prominentní místo. */
  polozky: SkolniNovinka[];
  /**
   * Zprávy, které s přijímacím řízením nesouvisejí (výlet primy, olympiáda).
   *
   * Dokreslují, čím škola žije, a proto se nezahazují; nesmí ale konkurovat
   * termínu dne otevřených dveří ani kritériím přijetí. Vedou se odděleně,
   * aby je stránka mohla dát jinam než zprávy k přijímačkám.
   */
  zeZivota: SkolniNovinka[];
  /** Kdy se naposled podařilo přečíst feed školy – ne kdy se zobrazuje stránka. */
  zdrojOverenAt: string | null;
  zdrojUrl: string | null;
  /** Zdroj neodpovídá, ale uložené položky platí dál (oddíl 3.2). */
  zdrojVypadek: boolean;
}

/** Kolik položek k přijímacímu řízení se vejde do bloku na stránce školy. */
const POCET_POLOZEK = 5;
/** Kolik zpráv ze života školy se vypíše v rubrice na konci stránky. */
const POCET_ZE_ZIVOTA = 6;
/**
 * Z kolika posledních položek se těch pět vybírá.
 *
 * Řazení podle data samo o sobě nestačí: pozvánka na den otevřených dveří je
 * často starší než běžné zprávy ze života školy, takže ji pět novějších
 * článků vytlačí ze stránky – a právě ta je to, kvůli čemu rodina na stránku
 * přišla. Okno je proto širší a výběr z něj dává přednost důležitým zprávám
 * k přijímačkám (viz `serad`).
 */
const OKNO_POLOZEK = 30;

interface RadekNovinky {
  id: string;
  titulek: string;
  url: string;
  publikovano: Date | string | null;
  zobrazeni: string;
  tridy: unknown;
  terminy: unknown;
  duvod: string | null;
  konec_platnosti: Date | string | null;
  vytvoreno: Date | string | null;
  souhrn: string | null;
  terminy_akce: unknown;
}

function naIso(v: Date | string | null): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function naPole(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Data z termínů rozboru. Řádek nese objekty `{datum, cas, akce}`, ne řetězce,
 * takže `naPole` by z nich udělala `"[object Object]"` a porovnání s dneškem
 * by tiše nikdy neplatilo.
 */
function dataAkce(v: unknown): string[] {
  const pole = typeof v === 'string' ? JSON.parse(v || '[]') : v;
  if (!Array.isArray(pole)) return [];
  return pole
    .map((t) => (t && typeof t === 'object' ? (t as { datum?: unknown }).datum : null))
    .filter((d): d is string => typeof d === 'string');
}

/** Přepínače jako mapa klíč → hodnota; klíč `trida:dod` vypíná zvýrazňování třídy. */
async function nactiPrepinace(): Promise<Map<string, unknown>> {
  const { rows } = await dotaz<{ klic: string; hodnota: unknown }>(
    `select klic, hodnota from skola_prepinac`,
  );
  return new Map(rows.map((r) => [r.klic, r.hodnota]));
}

function jeVypnuto(prepinace: Map<string, unknown>, klic: string): boolean {
  const h = prepinace.get(klic);
  if (h === undefined) return false;
  if (typeof h === 'boolean') return !h;
  if (h && typeof h === 'object' && 'zapnuto' in h) return !(h as { zapnuto: unknown }).zapnuto;
  return false;
}

/** Společný výběr sloupců pro oba dotazy, aby se nemohly rozejít. */
const SLOUPCE = `select n.id, n.titulek, n.url, n.publikovano, n.vytvoreno, n.zobrazeni,
         n.tridy, n.terminy, n.duvod, n.konec_platnosti,
         r.souhrn, r.terminy as terminy_akce
    from skola_novinka n
    left join skola_novinka_rozbor r on r.novinka_id = n.id`;

/**
 * Řádek na položku pro web. `null` znamená „položka je vypnutá přepínačem".
 *
 * Datum objevení se posílá jen tehdy, když se nedá říct, kdy zpráva vyšla:
 * jinak by stránka měla dvě data a čtenář by nevěděl, které platí.
 */
function naPolozku(
  r: RadekNovinky,
  prepinace: Map<string, unknown>,
  dnes: string,
): SkolniNovinka | null {
  if (jeVypnuto(prepinace, `polozka:${r.id}`)) return null;
  const tridy = naPole(r.tridy);
  // Termíny **ven nejdou**: karta o datu netvrdí nic (rozhodnutí 20. 9. 2026,
  // `rozhodni_publikaci` v scripts/novinky_klasifikace.py). Čtou se jen proto,
  // aby pozvánka na proběhlou akci přestala být zvýrazněná. Budoucnost se
  // počítá k času dotazu: sklízeč běží dvakrát denně, takže „budoucí při
  // sklizni" nestačí – včerejší termín by zůstal pozvánkou.
  const terminy = naPole(r.terminy);
  const jesteBude = terminy.some((t) => t >= dnes);
  let zobrazeni = r.zobrazeni as Zobrazeni;
  // Položka uložená starými pravidly: karta s termínem je dnes prostě karta.
  if (zobrazeni === 'karta_terminu') zobrazeni = 'karta';
  // Pozvánka na akci, jejíž termín jsme přečetli a už proběhl, zvýrazněná
  // nezůstane. Zpráva, u které jsme žádný termín nepřečetli, kartou zůstává:
  // termín v ní být může, jen my ho neumíme vyluštit.
  if (zobrazeni === 'karta' && terminy.length > 0 && !jesteBude) zobrazeni = 'odkaz';
  if (tridy.some((t) => jeVypnuto(prepinace, `trida:${t}`))) {
    zobrazeni = zobrazeni === 'seznam' ? 'seznam' : 'odkaz';
  }
  // Věta s termíny je uložená z doby sklizně, čte se ale dnes. Platí, dokud je
  // aspoň jedno z jmenovaných dat v budoucnu; jinak by karta zvala na akci,
  // která proběhla. Stejná podmínka, jaká větu pustila na svět
  // (`vyber_terminy_akce` v scripts/novinky_klasifikace.py), jen o den později.
  const terminyAkce = dataAkce(r.terminy_akce);
  const souhrnPlati = r.souhrn != null && terminyAkce.some((t) => t >= dnes);
  if (zobrazeni === 'karta' && terminyAkce.length > 0 && !souhrnPlati) zobrazeni = 'odkaz';
  const publikovano = naIso(r.publikovano);
  return {
    id: r.id,
    titulek: r.titulek,
    url: r.url,
    publikovano,
    objevenoAt: publikovano ? null : naIso(r.vytvoreno),
    zobrazeni,
    tridy,
    duvod: r.duvod,
    // Věta patří ke zvýrazněné kartě. U neutrálního odkazu by tvrdila víc,
    // než kolik jsme si o položce jistí.
    souhrn: zobrazeni === 'karta' && souhrnPlati ? r.souhrn : null,
  };
}

/**
 * Důležité zprávy napřed, zbytek v pořadí podle data.
 *
 * Obojí si uvnitř drží původní pořadí (dotaz vrací od nejnovější), takže mezi
 * kartami ani mezi ostatními zprávami se nic nepřeskupuje – mění se jen to,
 * která skupina má přednost, když se do bloku všechno nevejde. Důvod je
 * naměřený: u školy 600011801 přebilo pozvánku na den otevřených dveří pět
 * novějších zpráv ze života školy včetně nabídky práce pro dojiče.
 */
function serad(polozky: SkolniNovinka[]): SkolniNovinka[] {
  const dulezite = polozky.filter((p) => p.zobrazeni === 'karta');
  const ostatni = polozky.filter((p) => p.zobrazeni !== 'karta');
  return [...dulezite, ...ostatni];
}

/**
 * Novinky jedné školy k danému okamžiku.
 *
 * Vrací `null`, když databáze není nakonfigurovaná – to je jiný **stav** než
 * výpadek (ten skončí výjimkou), ale pro web má stejný důsledek: blok se
 * nerenderuje. Rozlišení je pro dohled, ne pro čtenáře.
 */
export async function novinkySkoly(
  redizo: string,
  ted: Date = new Date(),
): Promise<NovinkySkoly | null> {
  if (!jeDbNastavena()) return null;

  const prepinace = await nactiPrepinace();
  if (jeVypnuto(prepinace, `skola:${redizo}`)) {
    return { polozky: [], zeZivota: [], zdrojOverenAt: null, zdrojUrl: null, zdrojVypadek: false };
  }

  // Dva dotazy, ne jeden: zprávy ze života školy jsou v datech drtivá většina
  // (4 108 z 4 554 uložených položek k 20. 9. 2026). Jedno společné okno by u
  // sdílné školy vyplnily ony a zpráva k přijímačkám by se do bloku nedostala –
  // přesně ta chyba, kterou už jednou způsobil `limit 5` podle data.
  const kPrijimackam = await dotaz<RadekNovinky>(
    `${SLOUPCE}
      where redizo = $1
        and zneplatneno is null
        and zobrazeni <> 'seznam'
        and (konec_platnosti is null or konec_platnosti > $2)
      order by publikovano desc nulls last, vytvoreno desc
      limit $3`,
    [redizo, ted.toISOString(), OKNO_POLOZEK],
  );
  const zivot = await dotaz<RadekNovinky>(
    `${SLOUPCE}
      where redizo = $1
        and zneplatneno is null
        and zobrazeni = 'seznam'
        and (konec_platnosti is null or konec_platnosti > $2)
      order by publikovano desc nulls last, vytvoreno desc
      limit $3`,
    [redizo, ted.toISOString(), POCET_ZE_ZIVOTA],
  );

  const dnes = ted.toISOString().slice(0, 10);
  const prevod = (r: RadekNovinky) => naPolozku(r, prepinace, dnes);
  const polozky = kPrijimackam.rows.map(prevod).filter((p): p is SkolniNovinka => p !== null);
  const zeZivota = zivot.rows.map(prevod).filter((p): p is SkolniNovinka => p !== null);

  const feed = await dotaz<{ feed_url: string; naposledy_ok: Date | string | null; chyby_v_rade: number }>(
    `select feed_url, naposledy_ok, chyby_v_rade from skola_feed where redizo = $1`,
    [redizo],
  );
  const f = feed.rows[0];

  return {
    polozky: serad(polozky).slice(0, POCET_POLOZEK),
    zeZivota,
    zdrojOverenAt: naIso(f?.naposledy_ok ?? null),
    zdrojUrl: f?.feed_url ?? null,
    zdrojVypadek: (f?.chyby_v_rade ?? 0) > 0,
  };
}
