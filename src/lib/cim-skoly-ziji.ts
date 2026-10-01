// ============================================================================
// Zprávy z webů škol za oblast (kraj, obec) pro prototyp „Čím školy žijí".
//
// Stránka: src/app/prototyp/cim-skoly-ziji/page.tsx (nezalistovaná, noindex).
//
// Pravidla čtení přebírá ze `skolni-novinky.ts`, aby se stránka školy a tento
// přehled nemohly rozejít: přepínače platí při čtení (skrytá položka, vypnutá
// škola, vypnutá třída), převod řádku dělá `naPolozku`. Výpadek databáze se
// propaguje jako výjimka, nikdy jako prázdný seznam (slovník pojmů: „škola nemá
// novinky" nevíme).
// ============================================================================

import { dotaz, jeDbNastavena } from './novinky-db.ts';
import {
  SLOUPCE,
  TYPY_VYPISU,
  jeVypnuto,
  nactiPrepinace,
  naPolozku,
  type RadekNovinky,
  type SkolniNovinka,
} from './skolni-novinky.ts';

export interface ZpravaOblasti extends SkolniNovinka {
  redizo: string;
}

export interface StavSkoly {
  /** Škola má aktivní kanál novinek (RSS/Atom) v `skola_feed`. */
  kanal: boolean;
  /** Škola nemá kanál, ale sklízeč čte výpis aktualit na jejím webu. */
  vypis: boolean;
  /** Zpráv vydaných za posledních 30 dní (bez skrytých škol). */
  zprav30: number;
  /** Datum nejnovější uložené zprávy. */
  posledni: string | null;
  /** Kanál se při poslední sklizni nepodařilo přečíst. */
  vypadek: boolean;
}

const DEN_MS = 24 * 3600 * 1000;

/** Stav sběru zpráv po školách. Školy vypnuté přepínačem vrací bez zpráv. */
export async function stavSkol(redizos: string[], ted: Date = new Date()): Promise<Map<string, StavSkoly> | null> {
  if (!jeDbNastavena()) return null;
  const prepinace = await nactiPrepinace();
  const od30 = new Date(ted.getTime() - 30 * DEN_MS).toISOString();
  const [feedy, zpravy] = await Promise.all([
    dotaz<{ redizo: string; chyby_v_rade: number; aktivni: boolean; typ: string; naposledy_ok: Date | string | null }>(
      `select redizo, chyby_v_rade, aktivni, typ, naposledy_ok from skola_feed where redizo = any($1::text[])`,
      [redizos],
    ),
    dotaz<{ redizo: string; zprav30: string | number; posledni: Date | string | null }>(
      `select redizo,
              count(*) filter (where publikovano > $2) as zprav30,
              max(publikovano) as posledni
         from skola_novinka
        where redizo = any($1::text[]) and zneplatneno is null
        group by redizo`,
      [redizos, od30],
    ),
  ]);
  const out = new Map<string, StavSkoly>();
  for (const f of feedy.rows) {
    const vypis = TYPY_VYPISU.has(f.typ);
    out.set(f.redizo, {
      // Výpis přebírá místo snímku sondy až po prvním úspěšném čtení: záznam
      // vzniká i při chybě, a pak by škola ze sondy zmizela bez náhrady.
      kanal: f.aktivni && !vypis, vypis: f.aktivni && vypis && f.naposledy_ok !== null, zprav30: 0, posledni: null, vypadek: f.chyby_v_rade > 0,
    });
  }
  for (const z of zpravy.rows) {
    if (jeVypnuto(prepinace, `skola:${z.redizo}`)) continue;
    const s = out.get(z.redizo) ?? { kanal: false, vypis: false, zprav30: 0, posledni: null, vypadek: false };
    s.zprav30 = Number(z.zprav30);
    s.posledni = z.posledni ? new Date(z.posledni).toISOString() : null;
    out.set(z.redizo, s);
  }
  return out;
}

/** Nejnovější zprávy škol z výčtu, od nejnovější. */
export async function zpravyOblasti(
  redizos: string[],
  limit: number,
  ted: Date = new Date(),
): Promise<ZpravaOblasti[] | null> {
  if (!jeDbNastavena()) return null;
  const prepinace = await nactiPrepinace();
  const povolene = redizos.filter((r) => !jeVypnuto(prepinace, `skola:${r}`));
  if (povolene.length === 0) return [];
  // Skryté položky odfiltruje až `naPolozku`; rezerva nad limitem je proto,
  // aby je okno nevytlačilo (přepínačů jsou desítky, ne stovky).
  const { rows } = await dotaz<RadekNovinky & { redizo: string }>(
    `select n.redizo, ${SLOUPCE.slice('select '.length)}
      where n.redizo = any($1::text[])
        and n.zneplatneno is null
        and (n.konec_platnosti is null or n.konec_platnosti > $2)
      order by n.publikovano desc nulls last, n.vytvoreno desc
      limit $3`,
    [povolene, ted.toISOString(), limit + 60],
  );
  const dnes = ted.toISOString().slice(0, 10);
  const out: ZpravaOblasti[] = [];
  for (const r of rows) {
    const p = naPolozku(r, prepinace, dnes);
    if (p) out.push({ ...p, redizo: r.redizo });
    if (out.length >= limit) break;
  }
  return out;
}
