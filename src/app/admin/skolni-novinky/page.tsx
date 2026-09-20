import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCasCz, formatDatumCz, overAdminToken } from '@/lib/admin';
import { jeDbNastavena } from '@/lib/novinky-db';
import {
  souhrnNovinek,
  rozpadPodleZobrazeni,
  rozpadPodleTridy,
  rozpadPodleStavu,
  posledniBehy,
  chybneZdroje,
  polozkyProAdmin,
  prepinace,
  type PolozkaProAdmin,
  type RozpadRadek,
} from '@/lib/skolni-novinky-admin';

// ============================================================================
// Přehled školních novinek z RSS pro administraci.
//
// Stránka odpovídá na jedinou otázku: **co jsme ze zdrojů vyčetli a co jsme
// si z toho odvodili.** Veřejný blok na stránce školy ukazuje jen výsledek;
// tady je vidět i cesta k němu – třída zprávy, jistota, stav sdělení, termíny
// a důvod, proč položka skončila kartou, odkazem nebo v seznamu.
//
// Neveřejná stránka: `robots: noindex` a bez platného `admin_token` vrací 404,
// stejně jako zbytek administrace.
// ============================================================================

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Školní novinky z RSS',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ zobrazeni?: string; trida?: string; redizo?: string; limit?: string }>;
}

/** Barvy podle publikačního rozhodnutí – karta s termínem je to, kvůli čemu blok existuje. */
const ZOBRAZENI_BADGE: Record<string, string> = {
  karta_terminu: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  karta: 'bg-blue-50 text-blue-700 border-blue-200',
  odkaz: 'bg-amber-50 text-amber-700 border-amber-200',
  seznam: 'bg-slate-50 text-slate-600 border-slate-200',
};

function Sekce({ titulek, popis, children }: { titulek: string; popis?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-xl font-semibold text-slate-900">{titulek}</h2>
      {popis && <p className="mt-1 mb-4 text-sm text-slate-500">{popis}</p>}
      <div className={popis ? '' : 'mt-4'}>{children}</div>
    </section>
  );
}

function Udaj({ popisek, hodnota, poznamka }: { popisek: string; hodnota: string | number; poznamka?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <div className="text-2xl font-semibold text-slate-900">{hodnota}</div>
      <div className="text-sm text-slate-600">{popisek}</div>
      {poznamka && <div className="text-xs text-slate-400">{poznamka}</div>}
    </div>
  );
}

function Stitek({ text, trida }: { text: string; trida?: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${trida ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {text}
    </span>
  );
}

function Rozpad({ radky, odkazKlic }: { radky: RozpadRadek[]; odkazKlic?: 'zobrazeni' | 'trida' }) {
  if (radky.length === 0) return <p className="text-sm text-slate-500">Zatím nic.</p>;
  const nejvic = Math.max(...radky.map((r) => r.pocet));
  return (
    <ul className="space-y-1">
      {radky.map((r) => (
        <li key={r.klic} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate">
            {odkazKlic ? (
              <a href={`?${odkazKlic}=${encodeURIComponent(r.klic)}`} className="text-blue-600 hover:underline">{r.klic}</a>
            ) : (
              r.klic
            )}
          </span>
          <span className="h-2 rounded bg-slate-300" style={{ width: `${Math.max(2, (r.pocet / nejvic) * 100)}%` }} />
          <span className="tabular-nums text-slate-600">{r.pocet.toLocaleString('cs')}</span>
        </li>
      ))}
    </ul>
  );
}

/** Jistota je slovník dílčích skóre; vypisuje se tak, jak ji klasifikace uložila. */
function Jistota({ jistota }: { jistota: Record<string, unknown> }) {
  const polozky = Object.entries(jistota);
  if (polozky.length === 0) return null;
  return (
    <span className="text-xs text-slate-500">
      jistota: {polozky.map(([k, v]) => `${k} ${typeof v === 'number' ? v.toFixed(2) : String(v)}`).join(', ')}
    </span>
  );
}

function Polozka({ p, nazev }: { p: PolozkaProAdmin; nazev: string }) {
  return (
    <li className={`border-t border-slate-100 py-3 ${p.zneplatneno ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <Stitek text={p.zobrazeni} trida={ZOBRAZENI_BADGE[p.zobrazeni]} />
        <a href={p.url} rel="noopener noreferrer" target="_blank" className="font-medium text-slate-900 hover:underline">
          {p.titulek}
        </a>
        <span className="text-xs text-slate-500">
          {p.publikovano ? formatDatumCz(p.publikovano.slice(0, 10)) : 'bez data'}
        </span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        <a href={`/skola/${p.redizo}`} className="text-blue-600 hover:underline">{nazev || p.redizo}</a>
        {' · '}
        <a href={`?redizo=${p.redizo}`} className="hover:underline">jen tuhle školu</a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {p.tridy.map((t) => (
          <a key={t} href={`?trida=${encodeURIComponent(t)}`}><Stitek text={t} trida="bg-indigo-50 text-indigo-700 border-indigo-200" /></a>
        ))}
        {p.stav && <Stitek text={`stav: ${p.stav}`} />}
        {p.terminy.length > 0 && (
          <Stitek text={`termín: ${p.terminy.map((t) => formatDatumCz(t)).join(', ')}`} trida="bg-emerald-50 text-emerald-700 border-emerald-200" />
        )}
        {p.zpusobilyEmail && <Stitek text="způsobilý pro e-mail" trida="bg-violet-50 text-violet-700 border-violet-200" />}
        {p.verzi > 1 && <Stitek text={`${p.verzi} verze obsahu`} trida="bg-orange-50 text-orange-700 border-orange-200" />}
        {p.zneplatneno && <Stitek text="zneplatněno" trida="bg-red-50 text-red-700 border-red-200" />}
        <Jistota jistota={p.jistota} />
      </div>
      {p.duvod && <p className="mt-1 text-xs text-slate-600">důvod rozhodnutí: {p.duvod}</p>}
      <p className="mt-1 text-xs text-slate-400">
        platí do {p.konecPlatnosti ? formatDatumCz(p.konecPlatnosti.slice(0, 10)) : 'neurčeno'} · pravidla {p.verzePravidel}
      </p>
    </li>
  );
}

/** Názvy škol z katalogu najednou; `getNazevSkoly` by soubor četl pro každou položku znovu. */
async function nazvySkol(): Promise<Map<string, string>> {
  try {
    const raw = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'public', 'schools_data.json'), 'utf-8'),
    ) as Record<string, Array<Record<string, unknown>>>;
    return new Map((raw['2026'] || []).map((s) => [String(s.redizo), String(s.nazev)]));
  } catch {
    return new Map();
  }
}

export default async function Stranka({ searchParams }: Props) {
  if (!overAdminToken((await cookies()).get('admin_token')?.value)) notFound();
  const filtr = await searchParams;

  if (!jeDbNastavena()) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <p>Databáze novinek není nastavena (chybí <code>DATABASE_URL</code>).</p>
        </main>
        <Footer />
      </>
    );
  }

  const limit = Math.min(Number(filtr.limit) || 100, 500);
  const [souhrn, dleZobrazeni, dleTridy, dleStavu, behy, chybne, vypinace, polozky, nazvy] = await Promise.all([
    souhrnNovinek(),
    rozpadPodleZobrazeni(),
    rozpadPodleTridy(),
    rozpadPodleStavu(),
    posledniBehy(10),
    chybneZdroje(50),
    prepinace(),
    polozkyProAdmin({ zobrazeni: filtr.zobrazeni, trida: filtr.trida, redizo: filtr.redizo, limit }),
    nazvySkol(),
  ]);

  const jeFiltr = Boolean(filtr.zobrazeni || filtr.trida || filtr.redizo);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Školní novinky z RSS</h1>
          <p className="mt-1 text-sm text-slate-600">
            Co jsme ze školních webů sklidili a co jsme z toho odvodili.{' '}
            <a href="/admin" className="text-blue-600 hover:underline">zpět na administraci</a>
          </p>
        </div>

        {souhrn && (
          <Sekce titulek="Souhrn">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Udaj popisek="aktivních zdrojů" hodnota={souhrn.zdrojuCelkem.toLocaleString('cs')} poznamka={`${souhrn.zdrojuOk} naposledy v pořádku, ${souhrn.zdrojuSChybou} s chybou`} />
              <Udaj popisek="uložených položek" hodnota={souhrn.polozekCelkem.toLocaleString('cs')} poznamka={`${souhrn.polozekZneplatnenych} zneplatněných`} />
              <Udaj popisek="platných k dnešku" hodnota={souhrn.polozekPlatnych.toLocaleString('cs')} poznamka="jen tyhle se mohou zobrazit" />
              <Udaj popisek="vydaných za 7 dní" hodnota={souhrn.polozek7dni.toLocaleString('cs')} poznamka={souhrn.posledniSklizen ? `poslední sklizeň ${formatDatumCasCz(souhrn.posledniSklizen)}` : 'sklizeň zatím neproběhla'} />
            </div>
          </Sekce>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Sekce titulek="Publikační rozhodnutí" popis="Co se z položky na webu stane.">
            <Rozpad radky={dleZobrazeni} odkazKlic="zobrazeni" />
          </Sekce>
          <Sekce titulek="Třídy zpráv" popis="Položka může nést víc tříd, součet je proto vyšší než počet položek.">
            <Rozpad radky={dleTridy} odkazKlic="trida" />
          </Sekce>
          <Sekce titulek="Stav sdělení" popis="Oznámeno, zrušeno, přesunuto – zjištěno z textu.">
            <Rozpad radky={dleStavu} />
          </Sekce>
        </div>

        <Sekce titulek="Poslední běhy sklízeče" popis="GitHub Actions nezaručují čas běhu; vynechaný běh se pozná jen odsud.">
          {behy.length === 0 ? (
            <p className="text-sm text-slate-500">Zatím žádný zaznamenaný běh.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1">zahájeno</th><th>zdrojů</th><th>ok</th>
                  <th>nových</th><th>změněných</th><th>pravidla</th><th>chyba</th>
                </tr>
              </thead>
              <tbody>
                {behy.map((b) => (
                  <tr key={b.zahajeno} className="border-t border-slate-100">
                    <td className="py-1">{formatDatumCasCz(b.zahajeno)}</td>
                    <td className="tabular-nums">{b.zdrojuZkouseno}</td>
                    <td className="tabular-nums">{b.zdrojuOk}</td>
                    <td className="tabular-nums">{b.polozekNovych}</td>
                    <td className="tabular-nums">{b.polozekZmenenych}</td>
                    <td className="text-xs text-slate-500">{b.verzePravidel ?? '–'}</td>
                    <td className="text-xs text-red-600">{b.chyba ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sekce>

        <Sekce titulek={`Zdroje, které neodpovídají (${chybne.length})`} popis="Výpadek zdroje neskrývá dříve uložené položky – ty se zobrazují dál s datem poslední úspěšné kontroly.">
          {chybne.length === 0 ? (
            <p className="text-sm text-slate-500">Všechny zdroje naposledy odpověděly.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr><th className="py-1">škola</th><th>feed</th><th>odkud adresa</th><th>chyb v řadě</th><th>naposledy ok</th><th>poslední chyba</th></tr>
              </thead>
              <tbody>
                {chybne.map((z) => (
                  <tr key={z.redizo} className="border-t border-slate-100">
                    <td className="py-1"><a href={`?redizo=${z.redizo}`} className="text-blue-600 hover:underline">{nazvy.get(z.redizo) || z.redizo}</a></td>
                    <td className="max-w-xs truncate text-xs"><a href={z.feedUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{z.feedUrl}</a></td>
                    <td className="text-xs text-slate-500">{z.zdroj}</td>
                    <td className="tabular-nums">{z.chybyVRade}</td>
                    <td className="text-xs">{z.naposledyOk ? formatDatumCasCz(z.naposledyOk) : 'nikdy'}</td>
                    <td className="text-xs text-red-600">{z.posledniChyba ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sekce>

        <Sekce titulek={`Zapnuté přepínače (${vypinace.length})`} popis="Vypnutý zdroj, skrytá položka nebo vypnuté zvýrazňování třídy nejsou na položce vidět – bez tohohle výpisu nejde odpovědět, proč se něco nezobrazuje.">
          {vypinace.length === 0 ? (
            <p className="text-sm text-slate-500">Žádný přepínač nastavený; platí výchozí chování.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr><th className="py-1">klíč</th><th>hodnota</th><th>změněno</th><th>kdo</th><th>důvod</th></tr>
              </thead>
              <tbody>
                {vypinace.map((v) => (
                  <tr key={v.klic} className="border-t border-slate-100">
                    <td className="py-1 font-mono text-xs">{v.klic}</td>
                    <td className="font-mono text-xs">{JSON.stringify(v.hodnota)}</td>
                    <td className="text-xs">{formatDatumCasCz(v.zmeneno)}</td>
                    <td className="text-xs">{v.zdrojZmeny}</td>
                    <td className="text-xs text-slate-600">{v.duvod ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sekce>

        <Sekce
          titulek={`Položky (${polozky.length}${polozky.length === limit ? ` z posledních, limit ${limit}` : ''})`}
          popis="Řazeno podle data vydání. Zneplatněné a neplatné se nevynechávají – jinak by nešlo zjistit, proč se něco nezobrazuje."
        >
          {jeFiltr && (
            <p className="mb-2 text-sm">
              Filtr:{' '}
              {filtr.zobrazeni && <Stitek text={`zobrazení = ${filtr.zobrazeni}`} />}{' '}
              {filtr.trida && <Stitek text={`třída = ${filtr.trida}`} />}{' '}
              {filtr.redizo && <Stitek text={`škola = ${nazvy.get(filtr.redizo) || filtr.redizo}`} />}{' '}
              <a href="/admin/skolni-novinky" className="text-blue-600 hover:underline">zrušit filtr</a>
            </p>
          )}
          {polozky.length === 0 ? (
            <p className="text-sm text-slate-500">Nic neodpovídá filtru.</p>
          ) : (
            <ul>
              {polozky.map((p) => <Polozka key={p.id} p={p} nazev={nazvy.get(p.redizo) ?? ''} />)}
            </ul>
          )}
        </Sekce>
      </main>
      <Footer />
    </>
  );
}
