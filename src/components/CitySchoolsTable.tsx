'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CitySchoolRow } from '@/lib/cityData';
import {
  cislo, zOd, ZARAZENI_POPISEK, PORADI_OBTIZNOSTI, VYSVETLENI_SOUTEZICICH,
  type ZarazeniObtiznosti,
} from '@/lib/obor-profil';

const TYPE_LABELS: Record<string, string> = {
  GY4: 'GY 4-leté', GY6: 'GY 6-leté', GY8: 'GY 8-leté',
  LYC: 'Lyceum', SOS: 'SOŠ', SOU: 'SOU', NAS: 'Nástavba',
};

/**
 * Odstíny jedné barvy od nejtěžšího po nejsnazší. Záměrně **není semafor**:
 * obor, kam se dostal každý, není horší škola, jen jiná poptávka. Stupeň nese
 * slovo, odstín jen napovídá pořadí.
 */
const ODSTIN_OBTIZNOSTI: Record<ZarazeniObtiznosti, string> = {
  velmi_tezke: 'bg-slate-800 text-white',
  tezke: 'bg-slate-600 text-white',
  stredne_tezke: 'bg-slate-400 text-white',
  vetsina_uspela: 'bg-slate-200 text-slate-800',
  kapacita_nerozhodovala: 'bg-slate-100 text-slate-700',
};

/** Odznak obtížnosti přijetí. V tabulce stačí krátký popisek (slovník pojmů). */
function OdznakObtiznosti({ zarazeni }: { zarazeni: ZarazeniObtiznosti | null }) {
  if (!zarazeni) {
    return <span className="text-[12px] text-slate-500">bez údaje</span>;
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${ODSTIN_OBTIZNOSTI[zarazeni]}`}
    >
      {ZARAZENI_POPISEK[zarazeni]}
    </span>
  );
}

/** Věta „přijato X ze Y soutěžících uchazečů“ a předchozí ročník, jak žádá slovník. */
function PodilPrijatych({ row }: { row: CitySchoolRow }) {
  if (row.soutezici === null || row.prijatiZeSoutezicich === null) return null;
  if (row.zarazeni === 'kapacita_nerozhodovala') return null;
  const loni = row.zarazeniPredchozi && row.predchoziRok
    ? ` · v roce ${row.predchoziRok} ${ZARAZENI_POPISEK[row.zarazeniPredchozi]}`
    : '';
  return (
    <span className="text-[12px] text-slate-500">
      přijato {cislo(row.prijatiZeSoutezicich)} {zOd(row.soutezici)} {cislo(row.soutezici)}
      {loni}
    </span>
  );
}

interface Props {
  schools: CitySchoolRow[];
  /** Zobrazený ročník z registru; nikdy se nepíše napevno. */
  rok: number;
}

type SortKey = 'nazev' | 'kapacita' | 'prihlasky' | 'index';

interface SkolaSkupina {
  redizo: string;
  nazev: string;
  ulice: string;
  zrizovatel: string;
  slug: string;
  nabidky: CitySchoolRow[];
}

export function CitySchoolsTable({ schools, rok }: Props) {
  const [filtrTypu, setFiltrTypu] = useState<string>('vse');
  const [filtrObtiznosti, setFiltrObtiznosti] = useState<ZarazeniObtiznosti | 'vse'>('vse');
  const [sort, setSort] = useState<SortKey>('nazev');

  const typy = useMemo(
    () => [...new Set(schools.map(s => s.typ))].filter(Boolean).sort(),
    [schools],
  );

  /** Počty nabídek po stupních obtížnosti. Nabídky bez údaje se nepočítají nikam. */
  const rozlozeni = useMemo(() => {
    const m = new Map<ZarazeniObtiznosti, number>();
    for (const s of schools) {
      if (s.zarazeni) m.set(s.zarazeni, (m.get(s.zarazeni) ?? 0) + 1);
    }
    return m;
  }, [schools]);

  const sZarazenim = [...rozlozeni.values()].reduce((a, b) => a + b, 0);

  const filtrovane = useMemo(() => schools.filter(s =>
    (filtrTypu === 'vse' || s.typ === filtrTypu)
    && (filtrObtiznosti === 'vse' || s.zarazeni === filtrObtiznosti),
  ), [schools, filtrTypu, filtrObtiznosti]);

  /** Jedna karta = jedna škola. Rodina hledá školu, ne řádek nabídky. */
  const skoly = useMemo(() => {
    const m = new Map<string, SkolaSkupina>();
    for (const r of filtrovane) {
      const s = m.get(r.redizo) ?? {
        redizo: r.redizo,
        nazev: r.nazev_display,
        ulice: r.ulice,
        zrizovatel: r.zrizovatel,
        slug: r.slug,
        nabidky: [],
      };
      s.nabidky.push(r);
      m.set(r.redizo, s);
    }
    const seznam = [...m.values()];
    for (const s of seznam) {
      // V kartě nejtěžší nabídka první, aby bylo vidět, co škola nabízí nahoře.
      s.nabidky.sort((a, b) => {
        const ia = a.zarazeni ? PORADI_OBTIZNOSTI.indexOf(a.zarazeni) : 99;
        const ib = b.zarazeni ? PORADI_OBTIZNOSTI.indexOf(b.zarazeni) : 99;
        return ia - ib || a.obor.localeCompare(b.obor, 'cs');
      });
    }
    // Řadí se jen tím, co je na to doložené. Podle obtížnosti přijetí se neřadí:
    // pořadí se mezi ročníky přehazuje (slovník ukazatelů, pořadí v kraji).
    const soucet = (s: SkolaSkupina, vyber: (r: CitySchoolRow) => number | null) =>
      s.nabidky.reduce((a, r) => a + (vyber(r) ?? 0), 0);
    seznam.sort((a, b) => {
      if (sort === 'nazev') return a.nazev.localeCompare(b.nazev, 'cs');
      if (sort === 'kapacita') {
        return soucet(b, r => r.kapacita2026 ?? r.kapacita2025) - soucet(a, r => r.kapacita2026 ?? r.kapacita2025);
      }
      if (sort === 'prihlasky') {
        return soucet(b, r => r.prihlasky2026 ?? r.prihlasky2025) - soucet(a, r => r.prihlasky2026 ?? r.prihlasky2025);
      }
      const nejvyssi = (s: SkolaSkupina) => Math.max(
        ...s.nabidky.map(r => r.index2026 ?? r.index2025 ?? 0),
      );
      return nejvyssi(b) - nejvyssi(a);
    });
    return seznam;
  }, [filtrovane, sort]);

  const tlacitkoFiltru = (aktivni: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      aktivni ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

  return (
    <div>
      {/* Rozložení obtížnosti: odpověď na „kam je snadné se dostat a kam těžké“. */}
      {sZarazenim > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-1 font-semibold text-slate-900">
            Jak se sem uchazeči dostali v 1. kole {rok}
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Obtížnost přijetí říká, kolik <b>soutěžících uchazečů</b> se na obor dostalo,{' '}
            {VYSVETLENI_SOUTEZICICH}. Popisuje jeden ročník, ne kvalitu školy ani obtížnost studia.
          </p>
          <ul className="space-y-1.5">
            {PORADI_OBTIZNOSTI.map(z => {
              const pocet = rozlozeni.get(z) ?? 0;
              const podil = sZarazenim > 0 ? (pocet / sZarazenim) * 100 : 0;
              const aktivni = filtrObtiznosti === z;
              return (
                <li key={z}>
                  <button
                    type="button"
                    onClick={() => setFiltrObtiznosti(aktivni ? 'vse' : z)}
                    disabled={pocet === 0}
                    aria-pressed={aktivni}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      pocet === 0 ? 'cursor-default opacity-50' : 'hover:bg-slate-50'
                    } ${aktivni ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                  >
                    <span className="w-28 shrink-0 text-sm text-slate-700">
                      {ZARAZENI_POPISEK[z]}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded bg-[#e3e9f1]">
                      <span
                        className="block h-full rounded bg-[#0074e4]"
                        style={{ width: `${podil}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {pocet}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            {sZarazenim === schools.length
              ? `Ze všech ${cislo(schools.length)} nabídek ve městě.`
              : `Údaj máme u ${cislo(sZarazenim)} nabídek ${zOd(schools.length)} ${cislo(schools.length)}. Chybějící údaj neznamená, že se tam dostal každý.`}
            {filtrObtiznosti !== 'vse' && ' Klikem na stupeň filtr zrušíš.'}
          </p>
        </div>
      )}

      {/* Filtry a řazení */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFiltrTypu('vse')} className={tlacitkoFiltru(filtrTypu === 'vse')}>
            Všechny typy ({schools.length})
          </button>
          {typy.map(t => (
            <button key={t} type="button" onClick={() => setFiltrTypu(t)} className={tlacitkoFiltru(filtrTypu === t)}>
              {TYPE_LABELS[t] || t} ({schools.filter(s => s.typ === t).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Řadit školy:</span>
          {([['nazev', 'podle názvu'], ['kapacita', 'podle počtu míst'], ['prihlasky', 'podle přihlášek'], ['index', 'podle přihlášek na místo']] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                sort === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Karty škol */}
      <div className="space-y-3">
        {skoly.map(s => (
          <div key={s.redizo} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[17px] font-bold leading-snug text-[#16325c]">
                <Link href={`/skola/${s.slug}`} className="hover:underline">
                  {s.nazev}
                </Link>
              </h3>
              <span className="text-xs text-slate-500">
                {s.nabidky.length === 1 ? '1 nabídka' : `${s.nabidky.length} nabídky`}
              </span>
            </div>
            {(s.ulice || s.zrizovatel) && (
              <p className="mb-3 text-[13px] text-slate-500">
                {[s.ulice, s.zrizovatel && `zřizovatel: ${s.zrizovatel}`].filter(Boolean).join(' · ')}
              </p>
            )}
            <ul className="divide-y divide-slate-100">
              {s.nabidky.map(r => {
                const kapacita = r.kapacita2026 ?? r.kapacita2025;
                const idx = r.index2026 ?? r.index2025;
                const chybi2026 = r.prihlasky2026 === null;
                return (
                  <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[15px] font-medium text-slate-900">
                        {r.obor}{r.zamereni ? ` — ${r.zamereni}` : ''}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        {TYPE_LABELS[r.typ] || r.typ}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <OdznakObtiznosti zarazeni={r.zarazeni} />
                      <PodilPrijatych row={r} />
                    </div>
                    <div className="mt-1 text-[13px] text-slate-600">
                      {kapacita !== null && <>{cislo(kapacita)} míst</>}
                      {idx !== null && <> · {cislo(idx, 1)} přihlášky na místo</>}
                      {r.avgCjMa2026 !== null && (
                        <> · spolužáci sem přišli s výsledky kolem {cislo(r.avgCjMa2026, 1)} bodů ze 100</>
                      )}
                      {chybi2026 && (
                        <span className="text-amber-700"> · obor v 1. kole {rok} nevypsán, údaje jsou starší</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {skoly.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Pro zvolený filtr tu není žádná škola.
        </p>
      )}
    </div>
  );
}
