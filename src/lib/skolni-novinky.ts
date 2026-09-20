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

/** Co publikační rozhodnutí sklízeče o položce řeklo. */
export type Zobrazeni = 'karta_terminu' | 'karta' | 'odkaz' | 'seznam';

export interface SkolniNovinka {
  id: string;
  titulek: string;
  url: string;
  publikovano: string | null;
  zobrazeni: Zobrazeni;
  tridy: string[];
  /** Jen budoucí termíny v roli akce; proběhlé se do karty nedostanou. */
  terminy: string[];
  duvod: string | null;
}

export interface NovinkySkoly {
  polozky: SkolniNovinka[];
  /** Kdy se naposled podařilo přečíst feed školy – ne kdy se zobrazuje stránka. */
  zdrojOverenAt: string | null;
  zdrojUrl: string | null;
  /** Zdroj neodpovídá, ale uložené položky platí dál (oddíl 3.2). */
  zdrojVypadek: boolean;
}

/** Kolik položek se vejde do bloku na stránce školy. */
const POCET_POLOZEK = 5;
/**
 * Z kolika posledních položek se těch pět vybírá.
 *
 * Řazení podle data samo o sobě nestačí: pozvánka na den otevřených dveří je
 * často starší než běžné zprávy ze života školy, takže ji pět novějších
 * článků vytlačí ze stránky – a právě termín dne otevřených dveří je jediný
 * údaj, po kterém je poptávka. Okno je proto širší a výběr z něj dává přednost
 * kartám s platným termínem (viz `serad`).
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

/**
 * Karty s platným termínem napřed, zbytek v pořadí podle data.
 *
 * Obojí si uvnitř drží původní pořadí (dotaz vrací od nejnovější), takže mezi
 * kartami ani mezi ostatními zprávami se nic nepřeskupuje – mění se jen to,
 * která skupina má přednost, když se do bloku všechno nevejde.
 */
function serad(polozky: SkolniNovinka[]): SkolniNovinka[] {
  const sTerminem = polozky.filter((p) => p.zobrazeni === 'karta_terminu');
  const ostatni = polozky.filter((p) => p.zobrazeni !== 'karta_terminu');
  return [...sTerminem, ...ostatni];
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
  if (jeVypnuto(prepinace, `skola:${redizo}`)) return { polozky: [], zdrojOverenAt: null, zdrojUrl: null, zdrojVypadek: false };

  const { rows } = await dotaz<RadekNovinky>(
    `select id, titulek, url, publikovano, zobrazeni, tridy, terminy, duvod, konec_platnosti
       from skola_novinka
      where redizo = $1
        and zneplatneno is null
        and (konec_platnosti is null or konec_platnosti > $2)
      order by publikovano desc nulls last, vytvoreno desc
      limit $3`,
    [redizo, ted.toISOString(), OKNO_POLOZEK],
  );

  const dnes = ted.toISOString().slice(0, 10);
  const polozky: SkolniNovinka[] = [];
  for (const r of rows) {
    if (jeVypnuto(prepinace, `polozka:${r.id}`)) continue;
    const tridy = naPole(r.tridy);
    // Budoucí termíny se počítají k času dotazu. Sklízeč běží dvakrát denně,
    // takže „budoucí při sklizni" nestačí – včerejší termín by zůstal pozvánkou.
    const terminy = naPole(r.terminy).filter((t) => t >= dnes);
    let zobrazeni = r.zobrazeni as Zobrazeni;
    if (zobrazeni === 'karta_terminu' && terminy.length === 0) zobrazeni = 'odkaz';
    if (tridy.some((t) => jeVypnuto(prepinace, `trida:${t}`))) {
      zobrazeni = zobrazeni === 'seznam' ? 'seznam' : 'odkaz';
    }
    polozky.push({
      id: r.id,
      titulek: r.titulek,
      url: r.url,
      publikovano: naIso(r.publikovano),
      zobrazeni,
      tridy,
      terminy,
      duvod: r.duvod,
    });
  }

  const feed = await dotaz<{ feed_url: string; naposledy_ok: Date | string | null; chyby_v_rade: number }>(
    `select feed_url, naposledy_ok, chyby_v_rade from skola_feed where redizo = $1`,
    [redizo],
  );
  const f = feed.rows[0];

  return {
    polozky: serad(polozky).slice(0, POCET_POLOZEK),
    zdrojOverenAt: naIso(f?.naposledy_ok ?? null),
    zdrojUrl: f?.feed_url ?? null,
    zdrojVypadek: (f?.chyby_v_rade ?? 0) > 0,
  };
}
