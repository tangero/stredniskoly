'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { NabidkaKraje, PoradiNabidky, SkolaKraje } from '@/lib/krajData';
import {
  cislo, zOd, nazevSkupiny, textPoradi, vKraji, KOHORTA_NENI_KVALITA, KOHORTA_POPISEK, KOHORTA_VETA,
  PORADI_KOHORT, PORADI_OBTIZNOSTI, VYSVETLENI_SOUTEZICICH, ZARAZENI_POPISEK,
  type KohortaPozice, type ZarazeniObtiznosti,
} from '@/lib/obor-profil';
import { OdznakObtiznosti } from '@/components/nabidka/Odznaky';

/**
 * Přehled škol v kraji: docs/navrh-stranky-kraje-2027.md, oddíl 4.
 *
 * Jeden řádek tabulky je jedna škola, uvnitř její nabídky. Filtry se zapisují do adresy,
 * aby šel výběr sdílet; stránka se ale vykreslí staticky bez nich a adresu čte až
 * v prohlížeči, jinak by vyhledávače viděly jen prázdný zástupný obsah.
 */

/** Srovnatelné skupiny v pořadí, v jakém je rodina hledá. */
const SKUPINY = ['GY8_8', 'GY6_6', 'GY4_4', 'LYC_4', 'SOS_4', 'SOU_4', 'NAS_2'];
const SKUPINA_POPISEK: Record<string, string> = {
  GY8_8: 'Osmileté gymnázium', GY6_6: 'Šestileté gymnázium', GY4_4: 'Čtyřleté gymnázium',
  LYC_4: 'Lyceum', SOS_4: 'Odborná s maturitou', SOU_4: 'Maturitní obor SOU', NAS_2: 'Nástavba',
};
const SKUPINA_KRATCE: Record<string, string> = {
  GY8_8: 'GY 8leté', GY6_6: 'GY 6leté', GY4_4: 'GY 4leté', LYC_4: 'lyceum',
  SOS_4: 'SOŠ', SOU_4: 'SOU', NAS_2: 'nástavba',
};

type Zrizovatel = 'verejna' | 'soukroma' | 'cirkevni';
const ZRIZOVATEL_POPISEK: Record<Zrizovatel, string> = { verejna: 'veřejná', soukroma: 'soukromá', cirkevni: 'církevní' };

function druhZrizovatele(z: string): Zrizovatel | null {
  const t = z.toLocaleLowerCase('cs-CZ');
  if (t.includes('soukrom')) return 'soukroma';
  if (t.includes('církev')) return 'cirkevni';
  if (t.includes('veřejn') || t.includes('státn')) return 'verejna';
  return null;
}

type Razeni = 'nazev' | 'mista' | 'zajem' | 'vysledky';
const RAZENI_POPISEK: Record<Razeni, string> = {
  nazev: 'podle názvu', mista: 'podle počtu míst', zajem: 'pořadí podle zájmu', vysledky: 'pořadí podle výsledků přijatých',
};

interface Filtr {
  skupina: string | null;
  obtiznost: ZarazeniObtiznosti | null;
  kohorta: KohortaPozice | null;
  zrizovatel: Zrizovatel | null;
  okres: string | null;
  /** Starý parametr `?delka=`; zůstává funkční, aby nezmizely sdílené odkazy. */
  delka: number | null;
  razeni: Razeni;
}

const PRAZDNY: Filtr = { skupina: null, obtiznost: null, kohorta: null, zrizovatel: null, okres: null, delka: null, razeni: 'nazev' };
const PO_STRANKACH = 50;

function zAdresy(search: string): Filtr {
  const p = new URLSearchParams(search);
  const jeden = <T extends string>(k: string, povolene: readonly T[]) => {
    const v = p.get(k);
    return v && (povolene as readonly string[]).includes(v) ? v as T : null;
  };
  const delka = Number(p.get('delka'));
  const skupina = jeden('typ', SKUPINY);
  const razeni = jeden('razeni', ['nazev', 'mista', 'zajem', 'vysledky'] as const) ?? 'nazev';
  return {
    skupina,
    obtiznost: jeden('obtiznost', PORADI_OBTIZNOSTI),
    kohorta: jeden('pozice', PORADI_KOHORT),
    zrizovatel: jeden('zrizovatel', ['verejna', 'soukroma', 'cirkevni'] as const),
    okres: p.get('okres'),
    delka: [4, 6, 8].includes(delka) ? delka : null,
    // Pořadí v kraji dává smysl jen uvnitř jedné srovnatelné skupiny (slovník ukazatelů).
    razeni: skupina || (razeni !== 'zajem' && razeni !== 'vysledky') ? razeni : 'nazev',
  };
}

function doAdresy(f: Filtr): string {
  const p = new URLSearchParams();
  if (f.skupina) p.set('typ', f.skupina);
  if (f.obtiznost) p.set('obtiznost', f.obtiznost);
  if (f.kohorta) p.set('pozice', f.kohorta);
  if (f.zrizovatel) p.set('zrizovatel', f.zrizovatel);
  if (f.okres) p.set('okres', f.okres);
  if (f.delka) p.set('delka', String(f.delka));
  if (f.razeni !== 'nazev') p.set('razeni', f.razeni);
  const s = p.toString();
  return s ? `?${s}` : '';
}

function odpovida(n: NabidkaKraje, s: SkolaKraje, f: Filtr): boolean {
  return (!f.skupina || n.skupina === f.skupina)
    && (!f.obtiznost || n.zarazeni === f.obtiznost)
    && (!f.kohorta || n.kohorta === f.kohorta)
    && (!f.zrizovatel || druhZrizovatele(s.zrizovatel) === f.zrizovatel)
    && (!f.okres || s.okres === f.okres)
    && (!f.delka || n.delka === f.delka);
}

/**
 * Zkrácené „jak často nad středem podobných škol“ do buňky tabulky, aby se vešla na řádek.
 * Plná věta ze `jakCastoNadStredem` zůstává v titulku a na stránce školy.
 */
const NAD_STREDEM_KRATCE: Record<string, string> = {
  'každý rok': 'každý rok',
  'téměř každý rok': 'téměř každý rok',
  've většině let': 've většině let',
  'zhruba v polovině let': 'v polovině let',
  'jen v některých letech': 'jen někdy',
  'v žádném ze sledovaných let': 'ani jednou',
};

/** Krátké popisky kohorty do tabulky; celé názvy nese titulek a vysvětlivka. */
const KOHORTA_KRATCE: Record<KohortaPozice, string> = {
  skola_prvni_volby: 'první volby', smisena_pozice: 'smíšená', zalozni_volba: 'záložní',
};

interface SouhrnSkoly {
  typy: string;
  /** Nejtěžší obor školy ve výběru; stupně jsou uspořádané, ne seřazené školy. */
  nejtezsi: ZarazeniObtiznosti | null;
  obtiznostDoplnek: string | null;
  /** Počty oborů podle kohorty. Kohorta patří oboru, ne škole, proto počty, ne jeden štítek. */
  kohorty: [KohortaPozice, number][];
  mista: number | null;
  druheKolo: boolean;
  poradi: { p: PoradiNabidky; predchoziRok: number | null } | null;
}

/** Shrnutí oborů školy ve výběru pro jeden řádek tabulky. */
function souhrnSkoly(s: SkolaKraje, poradiPole: 'poradiZajem' | 'poradiVysledky' | null): SouhrnSkoly {
  const pocty = new Map<string, number>();
  for (const n of s.nabidky) {
    const k = SKUPINA_KRATCE[n.skupina] ?? n.skupina;
    pocty.set(k, (pocty.get(k) ?? 0) + 1);
  }
  const typy = [...pocty].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(', ');

  const sZarazenim = s.nabidky.filter(n => n.zarazeni).map(n => PORADI_OBTIZNOSTI.indexOf(n.zarazeni!));
  const nejtezsi = sZarazenim.length ? PORADI_OBTIZNOSTI[Math.min(...sZarazenim)] : null;
  const nejsnazsi = sZarazenim.length ? PORADI_OBTIZNOSTI[Math.max(...sZarazenim)] : null;
  let obtiznostDoplnek: string | null = null;
  if (s.nabidky.length > 1 && nejtezsi) {
    obtiznostDoplnek = nejsnazsi !== nejtezsi ? `až ${ZARAZENI_POPISEK[nejsnazsi!]}`
      : sZarazenim.length === s.nabidky.length ? `u všech ${s.nabidky.length} oborů` : null;
  }

  const kohorty = PORADI_KOHORT
    .map(k => [k, s.nabidky.filter(n => n.kohorta === k).length] as [KohortaPozice, number])
    .filter(([, n]) => n > 0);

  const mistaHodnoty = s.nabidky.map(n => n.kapacita).filter((v): v is number => v !== null);

  let poradi: SouhrnSkoly['poradi'] = null;
  if (poradiPole) {
    for (const n of s.nabidky) {
      const p = n[poradiPole];
      if (p && (!poradi || p.poradi.od < poradi.p.poradi.od)) poradi = { p, predchoziRok: n.predchoziRok };
    }
  }

  return {
    typy, nejtezsi, obtiznostDoplnek, kohorty,
    mista: mistaHodnoty.length ? mistaHodnoty.reduce((a, b) => a + b, 0) : null,
    druheKolo: s.nabidky.some(n => n.meloDruheKolo),
    poradi,
  };
}

/**
 * Kohorty oborů školy na nejvýš dva řádky: dva stupně každý na svém, třetí se připojí
 * k druhému zkráceně. Počty se píší jen u školy s víc obory.
 */
function radkyKohort(kohorty: [KohortaPozice, number][], sPocty: boolean): string[] {
  const text = ([k, n]: [KohortaPozice, number], kratce: boolean) =>
    `${sPocty ? `${n}× ` : ''}${kratce ? KOHORTA_KRATCE[k] : KOHORTA_POPISEK[k]}`;
  if (kohorty.length <= 2) return kohorty.map(k => text(k, false));
  return [text(kohorty[0], false), `${text(kohorty[1], true)}, ${text(kohorty[2], true)}`];
}

/** Pořadí v buňce: „1. ze 32“ a pod ním předchozí rok, jak žádá slovník ukazatelů. */
function PoradiBunka({ p, predchoziRok }: { p: PoradiNabidky; predchoziRok: number | null }) {
  return (
    <>
      <div className="font-semibold text-[#16325c]">{textPoradi(p.poradi)} {zOd(p.poradi.z)} {cislo(p.poradi.z)}</div>
      {p.predchozi && predchoziRok && (
        <div className="text-slate-500">
          {predchoziRok}: {p.predchozi.od === p.poradi.od && p.predchozi.do === p.poradi.do && p.predchozi.z === p.poradi.z
            ? `také ${textPoradi(p.predchozi)}`
            : `${textPoradi(p.predchozi)} ${zOd(p.predchozi.z)} ${cislo(p.predchozi.z)}`}
        </div>
      )}
    </>
  );
}

interface Props {
  skoly: SkolaKraje[];
  /** Název kraje pro větu o pořadí: „ve Středočeském kraji“, „v Praze“ (`vKraji`). */
  krajNazev: string;
  /** Zobrazený ročník z registru; nikdy se nepíše napevno. */
  rok: number;
  rokDruhehoKola: number | null;
}

export function RegionSchoolsTable({ skoly, krajNazev, rok, rokDruhehoKola }: Props) {
  const [filtr, setFiltr] = useState<Filtr>(PRAZDNY);
  const [zobrazeno, setZobrazeno] = useState(PO_STRANKACH);

  // Adresa se čte až po načtení: statické HTML je přehled bez filtru. Návrat
  // v historii (popstate) filtr obnoví a zruší i rozbalené stránkování, aby
  // se nad cizím výběrem neukazovala dávka, s kterou čtenář nepracoval.
  useEffect(() => {
    const zAdresyNyni = () => {
      setFiltr(zAdresy(window.location.search));
      setZobrazeno(PO_STRANKACH);
    };
    zAdresyNyni();
    window.addEventListener('popstate', zAdresyNyni);
    return () => window.removeEventListener('popstate', zAdresyNyni);
  }, []);

  const zmen = (zmena: Partial<Filtr>) => {
    const novy = { ...filtr, ...zmena };
    if (!novy.skupina && (novy.razeni === 'zajem' || novy.razeni === 'vysledky')) novy.razeni = 'nazev';
    setFiltr(novy);
    setZobrazeno(PO_STRANKACH);
    window.history.replaceState(null, '', `${window.location.pathname}${doAdresy(novy)}`);
  };

  const vsechnyNabidky = useMemo(() => skoly.flatMap(s => s.nabidky.map(n => ({ n, s }))), [skoly]);

  /** Počty pro pruhy a čipy: každý počítá s ostatními filtry, jen bez sebe sama. */
  const pocty = useMemo(() => {
    const bez = (klic: keyof Filtr) => vsechnyNabidky.filter(({ n, s }) => odpovida(n, s, { ...filtr, [klic]: null }));
    const spocti = <K extends string>(seznam: { n: NabidkaKraje; s: SkolaKraje }[], f: (x: { n: NabidkaKraje; s: SkolaKraje }) => K | null) => {
      const m = new Map<K, number>();
      for (const x of seznam) {
        const k = f(x);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const proObtiznost = bez('obtiznost');
    const proKohortu = bez('kohorta');
    return {
      obtiznost: spocti(proObtiznost, x => x.n.zarazeni), zakladObtiznosti: proObtiznost.length,
      kohorta: spocti(proKohortu, x => x.n.kohorta), zakladKohorty: proKohortu.length,
      skupina: spocti(bez('skupina'), x => x.n.skupina),
      zrizovatel: spocti(bez('zrizovatel'), x => druhZrizovatele(x.s.zrizovatel)),
      okres: spocti(bez('okres'), x => x.s.okres || null),
    };
  }, [vsechnyNabidky, filtr]);

  const vybrane = useMemo(() => {
    const seznam = skoly
      .map(s => ({ ...s, nabidky: s.nabidky.filter(n => odpovida(n, s, filtr)) }))
      .filter(s => s.nabidky.length > 0);
    const soucetMist = (s: SkolaKraje) => s.nabidky.reduce((a, n) => a + (n.kapacita ?? 0), 0);
    // Pořadí školy je pořadí její nejlépe umístěné nabídky ve zvolené skupině.
    const nejlepsi = (s: SkolaKraje, pole: 'poradiZajem' | 'poradiVysledky') =>
      Math.min(...s.nabidky.map(n => n[pole]?.poradi.od ?? Infinity));
    // Podle obtížnosti přijetí se neřadí: pořadí se mezi ročníky přehazuje (slovník, pořadí v kraji).
    return seznam.sort((a, b) => {
      if (filtr.razeni === 'mista') return soucetMist(b) - soucetMist(a) || a.nazev.localeCompare(b.nazev, 'cs');
      if (filtr.razeni === 'zajem') return nejlepsi(a, 'poradiZajem') - nejlepsi(b, 'poradiZajem') || a.nazev.localeCompare(b.nazev, 'cs');
      if (filtr.razeni === 'vysledky') return nejlepsi(a, 'poradiVysledky') - nejlepsi(b, 'poradiVysledky') || a.nazev.localeCompare(b.nazev, 'cs');
      return a.nazev.localeCompare(b.nazev, 'cs');
    });
  }, [skoly, filtr]);

  // V Praze mají všechny školy tutéž obec; opakovat ji v každém řádku nic neříká.
  const jednaObec = new Set(skoly.map(s => s.obec)).size === 1;
  const poradiPole = filtr.skupina && filtr.razeni === 'zajem' ? 'poradiZajem' as const
    : filtr.skupina && filtr.razeni === 'vysledky' ? 'poradiVysledky' as const : null;
  const pocetNabidek = vybrane.reduce((a, s) => a + s.nabidky.length, 0);
  const okresy = [...pocty.okres.keys()].sort((a, b) => a.localeCompare(b, 'cs'));
  const aktivniFiltr = filtr.skupina || filtr.obtiznost || filtr.kohorta || filtr.zrizovatel || filtr.okres || filtr.delka;

  const cip = (aktivni: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      aktivni ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

  const pruh = <K extends string>(
    klice: K[], popisek: Record<K, string>, pocet: Map<K, number>, aktivni: K | null, vyber: (k: K | null) => void,
  ) => {
    const celkem = [...pocet.values()].reduce((a, b) => a + b, 0);
    return (
      <ul className="space-y-1.5">
        {klice.map(k => {
          const n = pocet.get(k) ?? 0;
          const jeAktivni = aktivni === k;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => vyber(jeAktivni ? null : k)}
                disabled={n === 0 && !jeAktivni}
                aria-pressed={jeAktivni}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  n === 0 && !jeAktivni ? 'cursor-default opacity-50' : 'hover:bg-slate-50'
                } ${jeAktivni ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
              >
                <span className="w-36 shrink-0 text-sm text-slate-700">{popisek[k]}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded bg-[#e3e9f1]">
                  <span className="block h-full rounded bg-[#0074e4]" style={{ width: `${celkem ? (n / celkem) * 100 : 0}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const sObtiznosti = [...pocty.obtiznost.values()].reduce((a, b) => a + b, 0);
  const sKohortou = [...pocty.kohorta.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Dvě odpovědi hned nahoře; oba pruhy jsou zároveň filtr. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Jak těžké bylo se dostat v 1. kole {rok}</h2>
          <p className="mb-4 text-sm text-slate-600">
            Obtížnost přijetí říká, kolik <b>soutěžících uchazečů</b> se na obor dostalo, {VYSVETLENI_SOUTEZICICH}.
            Popisuje jeden ročník, ne kvalitu školy ani obtížnost studia.
          </p>
          {pruh(PORADI_OBTIZNOSTI, ZARAZENI_POPISEK, pocty.obtiznost, filtr.obtiznost, k => zmen({ obtiznost: k }))}
          <p className="mt-3 text-xs text-slate-500">
            {sObtiznosti === pocty.zakladObtiznosti
              ? `Ze všech ${cislo(pocty.zakladObtiznosti)} nabídek výběru.`
              : `Údaj máme u ${cislo(sObtiznosti)} ${zOd(pocty.zakladObtiznosti)} ${cislo(pocty.zakladObtiznosti)} nabídek; pod deseti soutěžícími se neurčuje. Chybějící údaj neznamená, že se tam dostal každý.`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Kam se hlásí jako na první volbu</h2>
          <p className="mb-4 text-sm text-slate-600">
            Pozice na přihlášce srovnává, jak často si uchazeči obor zapsali jako nejžádanější,
            s obory stejného typu v celé zemi. {KOHORTA_NENI_KVALITA}
          </p>
          {pruh(PORADI_KOHORT, KOHORTA_POPISEK, pocty.kohorta, filtr.kohorta, k => zmen({ kohorta: k }))}
          <p className="mt-3 text-xs text-slate-500">
            {sKohortou === pocty.zakladKohorty
              ? `Ze všech ${cislo(pocty.zakladKohorty)} nabídek výběru, 1. kolo ${rok}.`
              : `Údaj máme u ${cislo(sKohortou)} ${zOd(pocty.zakladKohorty)} ${cislo(pocty.zakladKohorty)} nabídek výběru, 1. kolo ${rok}.`}
          </p>
        </div>
      </div>

      {/* Filtry */}
      <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => zmen({ skupina: null })} className={cip(!filtr.skupina)} aria-pressed={!filtr.skupina}>Všechny typy</button>
          {SKUPINY.filter(k => pocty.skupina.has(k) || filtr.skupina === k).map(k => (
            <button key={k} type="button" onClick={() => zmen({ skupina: filtr.skupina === k ? null : k })} className={cip(filtr.skupina === k)}
              aria-pressed={filtr.skupina === k} data-skupina={k}>
              {SKUPINA_POPISEK[k]} ({pocty.skupina.get(k) ?? 0})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Zřizovatel:</span>
          {(['verejna', 'soukroma', 'cirkevni'] as Zrizovatel[]).filter(z => pocty.zrizovatel.has(z) || filtr.zrizovatel === z).map(z => (
            <button key={z} type="button" onClick={() => zmen({ zrizovatel: filtr.zrizovatel === z ? null : z })}
              aria-pressed={filtr.zrizovatel === z} data-zrizovatel={z}
              className={`rounded-full px-2.5 py-1 transition-colors ${filtr.zrizovatel === z ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {ZRIZOVATEL_POPISEK[z]} ({pocty.zrizovatel.get(z) ?? 0})
            </button>
          ))}
          {okresy.length > 1 && (
            <label className="ml-auto flex items-center gap-2">
              <span className="text-slate-500">Okres:</span>
              <select
                value={filtr.okres ?? ''}
                onChange={e => zmen({ okres: e.target.value || null })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option value="">celý kraj</option>
                {okresy.map(o => <option key={o} value={o}>{o} ({pocty.okres.get(o)})</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Řadit školy:</span>
          {(['nazev', 'mista', 'zajem', 'vysledky'] as Razeni[]).map(r => {
            const jenSeSkupinou = r === 'zajem' || r === 'vysledky';
            const lze = !jenSeSkupinou || !!filtr.skupina;
            return (
              <button key={r} type="button" disabled={!lze} onClick={() => zmen({ razeni: r })}
                aria-pressed={filtr.razeni === r} data-razeni={r}
                title={lze ? undefined : 'Pořadí v kraji se počítá jen mezi obory stejného typu. Nejdřív vyber typ studia.'}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  filtr.razeni === r ? 'bg-slate-800 text-white' : lze ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'cursor-not-allowed bg-slate-50 text-slate-500'
                }`}>
                {RAZENI_POPISEK[r]}
              </button>
            );
          })}
        </div>
        {!filtr.skupina && (
          <p className="text-xs text-slate-500">Pořadí v kraji jde zapnout po výběru typu studia: obory různých typů se mezi sebou neporovnávají.</p>
        )}
        {filtr.delka && (
          <p className="text-sm text-slate-600">
            Jen obory s délkou studia {filtr.delka} let.{' '}
            <button type="button" className="underline" onClick={() => zmen({ delka: null })}>Zrušit</button>
          </p>
        )}
      </div>

      <p className="mb-3 text-sm text-slate-600">
        {cislo(vybrane.length)} {vybrane.length === 1 ? 'škola' : vybrane.length >= 2 && vybrane.length <= 4 ? 'školy' : 'škol'},{' '}
        {cislo(pocetNabidek)} {pocetNabidek === 1 ? 'nabídka' : pocetNabidek >= 2 && pocetNabidek <= 4 ? 'nabídky' : 'nabídek'}
        {aktivniFiltr && (
          <> · <button type="button" className="underline" onClick={() => zmen({ ...PRAZDNY, razeni: filtr.razeni === 'mista' ? 'mista' : 'nazev' })}>zrušit filtry</button></>
        )}
      </p>

      {/* Tabulka škol: jedna škola = jeden řádek, nejvýš dva řádky textu. Obory a věty k nim jsou v detailu školy. */}
      {vybrane.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Škola</th>
                <th className="px-3 py-2">Obtížnost přijetí {rok}</th>
                <th className="px-3 py-2">Pozice na přihlášce</th>
                <th className="px-3 py-2 text-right">Míst</th>
                <th className="px-3 py-2">Maturita</th>
                {poradiPole && <th className="px-3 py-2" title={filtr.razeni === 'vysledky' ? 'Podle průměrného umístění přijatých v celostátním srovnání výsledků jednotné zkoušky, mezi obory stejného typu v kraji' : 'Podle počtu prvních voleb na jedno místo, mezi obory stejného typu v kraji'}>Pořadí v kraji {filtr.razeni === 'vysledky' ? 'podle výsledků' : 'podle zájmu'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vybrane.slice(0, zobrazeno).map(s => {
                const x = souhrnSkoly(s, poradiPole);
                return (
                  <tr key={s.redizo} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/skola/${s.slug}`} className="font-semibold text-[#16325c] hover:underline">{s.nazev}</Link>
                      <div className="text-xs text-slate-500">
                        {[jednaObec ? null : s.obec, x.typy, x.druheKolo && rokDruhehoKola ? `2. kolo ${rokDruhehoKola}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <OdznakObtiznosti zarazeni={x.nejtezsi} />
                      {x.obtiznostDoplnek && <div className="mt-0.5 text-xs text-slate-500">{x.obtiznostDoplnek}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {x.kohorty.length === 0 ? <span className="text-slate-500">bez údaje</span>
                        : radkyKohort(x.kohorty, s.nabidky.length > 1).map(r => <div key={r}>{r}</div>)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <div className="font-medium text-slate-900">{x.mista !== null ? cislo(x.mista) : '-'}</div>
                      <div className="text-xs text-slate-500">{s.nabidky.length === 1 ? '1 obor' : `${s.nabidky.length} ${s.nabidky.length <= 4 ? 'obory' : 'oborů'}`}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {s.maturita?.passed != null && s.maturita.registered != null
                        ? <div title={`Maturitu ${s.maturita.rok} udělalo ${s.maturita.passed} ${zOd(s.maturita.registered)} ${s.maturita.registered} přihlášených, za celou školu`}>udělalo {cislo(s.maturita.passed)} {zOd(s.maturita.registered)} {cislo(s.maturita.registered)}</div>
                        : <span className="text-slate-500">-</span>}
                      {s.maturita?.jakCastoNadStredem && (
                        <div className="whitespace-nowrap text-slate-500" title={`V češtině ${s.maturita.jakCastoNadStredem} nad středem podobných škol (poslední čtyři roky)`}>
                          ČJ nad středem: {NAD_STREDEM_KRATCE[s.maturita.jakCastoNadStredem] ?? s.maturita.jakCastoNadStredem}
                        </div>
                      )}
                    </td>
                    {poradiPole && (
                      <td className="px-3 py-2 text-xs">
                        {x.poradi ? <PoradiBunka p={x.poradi.p} predchoziRok={x.poradi.predchoziRok} /> : <span className="text-slate-500">-</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobil: stejné údaje jako tabulka, zalomené na tři řádky (bez titulků,
              které na mobilu nefungují, a bez zkráceného „ČJ nad středem“). */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {vybrane.slice(0, zobrazeno).map(s => {
              const x = souhrnSkoly(s, poradiPole);
              return (
                <li key={s.redizo} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/skola/${s.slug}`} className="font-semibold leading-snug text-[#16325c] hover:underline">{s.nazev}</Link>
                    <span className="shrink-0"><OdznakObtiznosti zarazeni={x.nejtezsi} /></span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {[
                      jednaObec ? null : s.obec,
                      x.typy,
                      x.druheKolo && rokDruhehoKola ? `2. kolo ${rokDruhehoKola}` : null,
                      x.mista !== null ? `${cislo(x.mista)} míst` : null,
                      s.nabidky.length === 1 ? '1 obor' : `${s.nabidky.length} ${s.nabidky.length <= 4 ? 'obory' : 'oborů'}`,
                    ].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {[
                      x.kohorty.length ? x.kohorty.map(([k, n]) => `${s.nabidky.length > 1 ? `${n}× ` : ''}${KOHORTA_KRATCE[k]}`).join(', ') : 'bez údaje',
                      x.obtiznostDoplnek,
                      s.maturita?.passed != null && s.maturita.registered != null
                        ? `maturitu udělalo ${cislo(s.maturita.passed)} ${zOd(s.maturita.registered)} ${cislo(s.maturita.registered)}`
                        : null,
                      s.maturita?.jakCastoNadStredem ? `ČJ nad středem: ${NAD_STREDEM_KRATCE[s.maturita.jakCastoNadStredem] ?? s.maturita.jakCastoNadStredem}` : null,
                      x.poradi ? `${textPoradi(x.poradi.p.poradi)} ${zOd(x.poradi.p.poradi.z)} ${cislo(x.poradi.p.poradi.z)} v kraji` : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {poradiPole && (
        <p className="mt-2 text-xs text-slate-500">
          Pořadí nejlépe umístěného oboru školy mezi {nazevSkupiny(filtr.skupina!)} {vKraji(krajNazev)}{' '}
          {filtr.razeni === 'vysledky'
            ? <>podle výsledků přijatých v roce {rok}: podle průměrného umístění přijatých v celostátním srovnání výsledků jednotné zkoušky. Popisuje, s jakými výsledky sem přicházejí spolužáci, ne kvalitu školy ani kolik bodů stačí na přijetí.</>
            : <>podle zájmu v roce {rok}: kolik uchazečů si obor zapsalo jako první volbu na jedno místo. Neříká, která škola je lepší.</>}{' '}
          <a
            href={filtr.razeni === 'vysledky' ? '#poradi-vysledky' : '#poradi-zajem'}
            className="underline"
            onClick={() => {
              const d = document.getElementById(filtr.razeni === 'vysledky' ? 'poradi-vysledky' : 'poradi-zajem');
              if (d instanceof HTMLDetailsElement) d.open = true;
            }}
          >Jak se pořadí počítá</a>
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        U školy s více obory je ve sloupci obtížnosti obor, kam bylo nejtěžší se dostat; jednotlivé obory, podíly přijatých
        a předchozí rok najdete v detailu školy. Maturita platí za celou školu.
      </p>

      {vybrane.length > zobrazeno && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setZobrazeno(z => z + PO_STRANKACH)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Zobrazit dalších {cislo(Math.min(PO_STRANKACH, vybrane.length - zobrazeno))} škol ({cislo(vybrane.length - zobrazeno)} zbývá)
          </button>
        </div>
      )}

      {vybrane.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Pro zvolený výběr tu není žádná škola.
        </p>
      )}

      {filtr.kohorta && (
        <p className="mt-4 text-xs text-slate-500">
          {KOHORTA_POPISEK[filtr.kohorta][0].toLocaleUpperCase('cs-CZ') + KOHORTA_POPISEK[filtr.kohorta].slice(1)}: {KOHORTA_VETA[filtr.kohorta]}.
        </p>
      )}
    </div>
  );
}
