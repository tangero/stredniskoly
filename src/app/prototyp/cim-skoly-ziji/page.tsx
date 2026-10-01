import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllSchools } from '@/lib/data';
import { extractRedizo } from '@/lib/utils';
import { adresaPrehledu } from '@/lib/adresa-oboru.mjs';
import { stavSkol, zpravyOblasti, type StavSkoly, type ZpravaOblasti } from '@/lib/cim-skoly-ziji';
import skolyWeb from '../../../../public/skoly_web.json';
import sondaMimoRss from '../../../../data/sondy/mimo-rss-20261001.json';

// ============================================================================
// Prototyp „Čím školy žijí": zprávy z webů škol podle kraje a obce.
//
// Stránka je nezalistovaná, ne chráněná: nikde na ni nevede odkaz, není
// v sitemapě a nese `robots: noindex`. Do robots.txt ji zapsat **nesmíme**,
// zakázané procházení by vyhledávači zabránilo `noindex` vůbec přečíst.
//
// Dva zdroje, které se nemíchají:
//  1. kanál novinek (RSS/Atom) – průběžná sklizeň v databázi, `skola_feed`
//     a `skola_novinka`; čte se při každém požadavku (přepínače platí hned);
//  2. výpis aktualit u škol bez kanálu – **jednorázová sonda** z 1. 10. 2026
//     (`scripts/sonda-mimo-rss.py`), snímek v data/sondy/. Ukazuje, co by
//     přinesla čtečka výpisu, kdyby běžela v provozu. Neobnovuje se.
//
// Titulky jsou školní, nikdo je ručně nečetl. Perex se nepřebírá (autorská práva).
// ============================================================================

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Prototyp: Čím školy žijí',
  robots: { index: false, follow: false },
};

const DATUM_SONDY = '1. 10. 2026';
const LIMIT_ZPRAV = 120;

interface Skola {
  redizo: string;
  nazev: string;
  obec: string;
  kraj: string;
  krajKod: string;
}

interface PolozkaSondy {
  titulek: string;
  url: string;
  datum: string;
}

interface SkolaSondy {
  redizo: string;
  web: string;
  vypis: { stav: string | null; polozek: number; polozek_30d: number; ukazka: PolozkaSondy[] };
}

const sonda = new Map<string, SkolaSondy>(
  (sondaMimoRss as { skoly: SkolaSondy[] }).skoly.map((s) => [s.redizo, s]),
);
const weby = (skolyWeb as { weby: Record<string, string> }).weby;

/** Štítky podle slovníku pojmů; ostatní třídy k přijímačkám nesou obecný štítek. */
const STITKY: Record<string, string> = {
  dod: 'den otevřených dveří',
  prijimacky_nanecisto: 'přijímačky nanečisto',
  setkani_uchazecu: 'setkání s uchazeči',
  pripravny_kurz: 'přípravný kurz k přijímačkám',
};

function stitek(z: ZpravaOblasti): string | null {
  if (z.zobrazeni === 'seznam') return null;
  for (const t of z.tridy) if (STITKY[t]) return STITKY[t];
  return 'k přijímačkám';
}

function datum(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague', day: 'numeric', month: 'numeric', year: 'numeric' });
}

function procento(a: number, b: number): string {
  return b ? `${Math.round((100 * a) / b)} %` : '–';
}

async function nactiSkoly(): Promise<Skola[]> {
  const mapa = new Map<string, Skola>();
  for (const s of await getAllSchools()) {
    // Záznam analýzy nese REDIZO jen v klíči nabídky, pole `redizo` chybí.
    const redizo = extractRedizo(s.id);
    if (!mapa.has(redizo)) {
      mapa.set(redizo, { redizo, nazev: s.nazev, obec: s.obec, kraj: (s.kraj ?? '').trim(), krajKod: s.kraj_kod });
    }
  }
  return [...mapa.values()];
}

/** Do které skupiny škola patří z pohledu sběru zpráv. */
function skupina(s: Skola, stav: Map<string, StavSkoly>): 'kanal' | 'vypis' | 'necteme' {
  if (stav.get(s.redizo)?.kanal) return 'kanal';
  if ((sonda.get(s.redizo)?.vypis.polozek ?? 0) > 0) return 'vypis';
  return 'necteme';
}

interface PageProps {
  searchParams: Promise<{ kraj?: string; mesto?: string }>;
}

export default async function CimSkolyZijiPage({ searchParams }: PageProps) {
  const { kraj, mesto } = await searchParams;
  const vsechny = await nactiSkoly();
  const kraje = [...new Map(vsechny.map((s) => [s.krajKod, s.kraj])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'cs'));
  const vKraji = kraj ? vsechny.filter((s) => s.krajKod === kraj) : [];
  const obce = [...vKraji.reduce((m, s) => m.set(s.obec, (m.get(s.obec) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'));
  const oblast = mesto ? vKraji.filter((s) => s.obec === mesto) : kraj ? vKraji : vsechny;
  const nazevOblasti = mesto ?? (kraj ? kraje.find(([k]) => k === kraj)?.[1] : null) ?? 'Česko';

  let stav: Map<string, StavSkoly> | null = null;
  let zpravy: ZpravaOblasti[] | null = null;
  let chyba = false;
  try {
    [stav, zpravy] = await Promise.all([
      stavSkol(vsechny.map((s) => s.redizo)),
      zpravyOblasti(oblast.map((s) => s.redizo), kraj ? LIMIT_ZPRAV : 40),
    ]);
  } catch (e) {
    console.error('[cim-skoly-ziji] čtení databáze selhalo', e);
    chyba = true;
  }
  const skolaPodle = new Map(vsechny.map((s) => [s.redizo, s]));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Prototyp, neveřejná stránka. Titulky jsou ze školních webů, sbíráme je automaticky a nikdo je ručně nečetl.
        </p>
        <h1 className="text-3xl font-bold text-[#16325c]">Čím školy žijí: {nazevOblasti}</h1>
        <p className="mt-2 text-slate-600">
          Zprávy, které školy píšou na své weby: akce, soutěže, výlety, projekty i zprávy k přijímačkám.
          Odkazy vedou na web školy.
        </p>

        <nav aria-label="Kraje" className="mt-6 flex flex-wrap gap-2">
          <Link href="/prototyp/cim-skoly-ziji" className={chip(!kraj)}>Celá země</Link>
          {kraje.map(([kod, nazev]) => (
            <Link key={kod} href={`/prototyp/cim-skoly-ziji?kraj=${kod}`} className={chip(kraj === kod)}>
              {nazev}
            </Link>
          ))}
        </nav>
        {kraj && (
          <nav aria-label="Obce" className="mt-3 flex flex-wrap gap-2">
            <Link href={`/prototyp/cim-skoly-ziji?kraj=${kraj}`} className={chip(!mesto, true)}>Celý kraj</Link>
            {obce.filter(([, n]) => n >= 2).map(([obec, n]) => (
              <Link
                key={obec}
                href={`/prototyp/cim-skoly-ziji?kraj=${kraj}&mesto=${encodeURIComponent(obec)}`}
                className={chip(mesto === obec, true)}
              >
                {obec} <span className="text-slate-400">{n}</span>
              </Link>
            ))}
          </nav>
        )}

        {chyba && (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            Zprávy se teď nepodařilo načíst z databáze. Neznamená to, že školy nic nenapsaly.
          </p>
        )}

        {stav && <Pokryti skoly={oblast} stav={stav} />}

        {!kraj && stav && <PrehledKraju skoly={vsechny} kraje={kraje} stav={stav} />}

        {zpravy && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-[#16325c]">
              {kraj ? 'Nejnovější zprávy z kanálů novinek' : 'Nejnovější zprávy z celé země'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Z webu školy, automaticky. Sbíráme je z kanálu novinek školy (RSS) dvakrát denně.
            </p>
            {zpravy.length === 0 ? (
              <p className="mt-4 text-slate-600">Z kanálů novinek škol v této oblasti zatím nemáme žádnou zprávu.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {zpravy.map((z) => {
                  const s = skolaPodle.get(z.redizo);
                  const st = stitek(z);
                  return (
                    <li key={z.id} className="px-4 py-3">
                      <div className="text-xs text-slate-500">
                        {z.publikovano ? datum(z.publikovano) : `objevilo se ${datum(z.objevenoAt)}`}
                        {s && (
                          <>
                            {' · '}
                            <Link href={`/skola/${adresaPrehledu(s.redizo, s.nazev)}`} className="hover:underline">
                              {s.nazev}
                            </Link>
                            {!mesto && <span>, {s.obec}</span>}
                          </>
                        )}
                        {st && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-blue-800">{st}</span>}
                      </div>
                      <a href={z.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 block font-medium text-slate-900 hover:underline">
                        {z.titulek}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {kraj && stav && <ZeSondy skoly={oblast} stav={stav} />}
        {kraj && stav && <Necteme skoly={oblast} stav={stav} />}
      </main>
      <Footer />
    </div>
  );
}

function chip(aktivni: boolean, male = false): string {
  return [
    'rounded-full border px-3 py-1',
    male ? 'text-xs' : 'text-sm',
    aktivni ? 'border-[#16325c] bg-[#16325c] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-[#16325c]',
  ].join(' ');
}

function Pokryti({ skoly, stav }: { skoly: Skola[]; stav: Map<string, StavSkoly> }) {
  const n = skoly.length;
  const kanal = skoly.filter((s) => skupina(s, stav) === 'kanal');
  const cerstve = kanal.filter((s) => (stav.get(s.redizo)?.zprav30 ?? 0) > 0).length;
  const vypis = skoly.filter((s) => skupina(s, stav) === 'vypis').length;
  return (
    <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <p>
        Ve výběru je <strong>{n}</strong> škol. Kanál novinek (RSS) čteme u <strong>{kanal.length}</strong> z nich
        ({procento(kanal.length, n)}), zprávu za posledních 30 dní z něj máme u <strong>{cerstve}</strong>.
      </p>
      <p className="mt-1">
        U dalších <strong>{vypis}</strong> škol bez kanálu jsme {DATUM_SONDY} jednorázově přečetli výpis aktualit na jejich webu.
        Zbylých <strong>{n - kanal.length - vypis}</strong> webů zatím nečteme. Že o nich nic nevíme, neznamená, že se tam nic neděje.
      </p>
    </section>
  );
}

function PrehledKraju({ skoly, kraje, stav }: { skoly: Skola[]; kraje: [string, string][]; stav: Map<string, StavSkoly> }) {
  const radky = kraje.map(([kod, nazev]) => {
    const v = skoly.filter((s) => s.krajKod === kod);
    const kanal = v.filter((s) => skupina(s, stav) === 'kanal');
    return {
      kod,
      nazev,
      n: v.length,
      kanal: kanal.length,
      cerstve: kanal.filter((s) => (stav.get(s.redizo)?.zprav30 ?? 0) > 0).length,
      vypis: v.filter((s) => skupina(s, stav) === 'vypis').length,
      vypisCerstve: v.filter((s) => skupina(s, stav) === 'vypis' && (sonda.get(s.redizo)?.vypis.polozek_30d ?? 0) > 0).length,
    };
  });
  return (
    <section className="mt-8 overflow-x-auto">
      <h2 className="text-xl font-semibold text-[#16325c]">Odkud zprávy máme</h2>
      <table className="mt-3 w-full min-w-[640px] border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-500">
            <th className="py-2 pr-2 font-medium">Kraj</th>
            <th className="px-2 text-right font-medium">Škol</th>
            <th className="px-2 text-right font-medium">Kanál novinek</th>
            <th className="px-2 text-right font-medium">z toho zpráva za 30 dní</th>
            <th className="px-2 text-right font-medium">Výpis aktualit (sonda)</th>
            <th className="px-2 text-right font-medium">z toho zpráva za 30 dní</th>
          </tr>
        </thead>
        <tbody>
          {radky.map((r) => (
            <tr key={r.kod} className="border-b border-slate-100">
              <td className="py-1.5 pr-2">
                <Link href={`/prototyp/cim-skoly-ziji?kraj=${r.kod}`} className="text-[#16325c] hover:underline">{r.nazev}</Link>
              </td>
              <td className="px-2 text-right tabular-nums">{r.n}</td>
              <td className="px-2 text-right tabular-nums">{r.kanal}</td>
              <td className="px-2 text-right tabular-nums">{r.cerstve} <span className="text-slate-400">({procento(r.cerstve, r.n)})</span></td>
              <td className="px-2 text-right tabular-nums">{r.vypis}</td>
              <td className="px-2 text-right tabular-nums">{r.vypisCerstve} <span className="text-slate-400">({procento(r.vypisCerstve, r.n)})</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Procenta jsou ze všech škol kraje. Výpis aktualit je jednorázová sonda z {DATUM_SONDY}, v provozu zatím neběží.
      </p>
    </section>
  );
}

function ZeSondy({ skoly, stav }: { skoly: Skola[]; stav: Map<string, StavSkoly> }) {
  const vypis = skoly
    .filter((s) => skupina(s, stav) === 'vypis')
    .map((s) => ({ s, z: sonda.get(s.redizo)! }))
    .sort((a, b) => (b.z.vypis.ukazka[0]?.datum ?? '').localeCompare(a.z.vypis.ukazka[0]?.datum ?? ''));
  if (vypis.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#16325c]">Ze škol bez kanálu novinek</h2>
      <p className="mt-1 text-sm text-slate-500">
        Jednorázově přečteno z výpisu aktualit na webu školy {DATUM_SONDY}. Ukázka, co by přinesla čtečka výpisu v provozu;
        titulky i data mohou být přečtené chybně.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {vypis.map(({ s, z }) => (
          <div key={s.redizo} className="rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/skola/${adresaPrehledu(s.redizo, s.nazev)}`} className="text-sm font-semibold text-[#16325c] hover:underline">
              {s.nazev}
            </Link>
            <span className="text-xs text-slate-500">, {s.obec}</span>
            <ul className="mt-2 space-y-1.5">
              {z.vypis.ukazka.slice(0, 3).map((p) => (
                <li key={p.url + p.titulek} className="text-sm">
                  <span className="text-xs text-slate-500">{datum(p.datum)} </span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="text-slate-900 hover:underline">
                    {p.titulek}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Necteme({ skoly, stav }: { skoly: Skola[]; stav: Map<string, StavSkoly> }) {
  const necteme = skoly.filter((s) => skupina(s, stav) === 'necteme').sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
  if (necteme.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#16325c]">Weby, které zatím nečteme ({necteme.length})</h2>
      <p className="mt-1 text-sm text-slate-500">
        Nemají kanál novinek a výpis aktualit se nám nepodařilo přečíst, nebo web neodpovídá.
      </p>
      <ul className="mt-3 columns-1 gap-6 text-sm sm:columns-2">
        {necteme.map((s) => {
          const web = weby[s.redizo];
          const stavVypisu = sonda.get(s.redizo)?.vypis.stav;
          return (
            <li key={s.redizo} className="mb-1 break-inside-avoid">
              {web ? (
                <a href={web} target="_blank" rel="noopener noreferrer nofollow" className="text-slate-800 hover:underline">{s.nazev}</a>
              ) : (
                <span className="text-slate-800">{s.nazev}</span>
              )}
              <span className="text-xs text-slate-400"> · {s.obec}{stavVypisu ? ` · ${POPIS_STAVU[stavVypisu] ?? stavVypisu}` : web ? '' : ' · bez webu v rejstříku'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const POPIS_STAVU: Record<string, string> = {
  nerozpoznano: 'výpis nerozpoznán',
  bez_odkazu: 'stránku aktualit jsme nenašli',
  titulka_nedostupna: 'web neodpověděl',
  stranka_404: 'stránka aktualit vrací 404',
};
