import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCz, formatDatumCasCz } from '@/lib/admin';
import { vyzadujAdmina } from '@/lib/admin-relace';
import { nactiOsloveneSkoly } from '@/lib/admin-oslovene';
import { filtrujOslovene, filtrZAdresy, souhrnVln, vlnaSkoly, type FiltrOslovenych } from '@/lib/portal-oslovene';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Oslovené školy portálu',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ spravce?: string; vlna?: string }>;
}

function adresa(f: FiltrOslovenych): string {
  const p = new URLSearchParams();
  if (f.jenSeSpravcem) p.set('spravce', '1');
  if (f.vlna !== null) p.set('vlna', String(f.vlna));
  const q = p.toString();
  return `/admin/portal/oslovene${q ? `?${q}` : ''}`;
}

function Prepinac({ href, aktivni, children }: { href: string; aktivni: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-current={aktivni ? 'page' : undefined}
      className={`inline-block px-3 py-1 rounded border text-sm ${
        aktivni ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </a>
  );
}

export default async function OsloveneSkolyPage({ searchParams }: Props) {
  await vyzadujAdmina();
  const filtr = filtrZAdresy(await searchParams);
  const skoly = await nactiOsloveneSkoly();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <div>
            <p className="text-sm mb-2">
              <a href="/admin" className="text-slate-500 underline">Administrace</a>
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Oslovené školy portálu</h1>
            <nav className="flex flex-wrap gap-4 text-sm" aria-label="Portál škol">
              <a href="/admin/portal" className="text-slate-900 underline">Všechny účty</a>
              <a href="/admin/portal/pozvanky" className="text-slate-900 underline">Pozvánky školám</a>
            </nav>
          </div>

          {skoly === null ? (
            <p className="text-sm text-slate-500 italic">Databáze účtů není nastavena nebo neodpovídá.</p>
          ) : skoly.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Seznam oslovených škol (data/portal/pilot.json) není k dispozici.</p>
          ) : (
            <Obsah skoly={skoly} filtr={filtr} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Obsah({ skoly, filtr }: { skoly: NonNullable<Awaited<ReturnType<typeof nactiOsloveneSkoly>>>; filtr: FiltrOslovenych }) {
  const { vlny, celkem } = souhrnVln(skoly);
  const vybrane = filtrujOslovene(skoly, filtr);

  return (
    <>
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Souhrn po vlnách</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4 font-medium">Vlna</th>
                <th className="py-2 pr-4 font-medium text-right">Osloveno</th>
                <th className="py-2 pr-4 font-medium text-right">Se správcem</th>
                <th className="py-2 font-medium text-right">Poslalo návrh</th>
              </tr>
            </thead>
            <tbody>
              {[...vlny, celkem].map((v) => (
                <tr key={v.vlna} className={`border-b border-slate-50 ${v.vlna === 0 ? 'font-semibold' : ''}`}>
                  <td className="py-2 pr-4">{v.vlna === 0 ? 'celkem' : `${v.vlna}.`}</td>
                  <td className="py-2 pr-4 text-right">{v.osloveno}</td>
                  <td className="py-2 pr-4 text-right">
                    {v.seSpravcem}
                    <span className="text-slate-400"> ({v.osloveno ? Math.round((v.seSpravcem / v.osloveno) * 100) : 0} %)</span>
                  </td>
                  <td className="py-2 text-right">{v.sNavrhem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Školy</h2>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Prepinac href={adresa({ ...filtr, jenSeSpravcem: false })} aktivni={!filtr.jenSeSpravcem}>všechny</Prepinac>
          <Prepinac href={adresa({ ...filtr, jenSeSpravcem: true })} aktivni={filtr.jenSeSpravcem}>jen se správcem</Prepinac>
          <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
          <Prepinac href={adresa({ ...filtr, vlna: null })} aktivni={filtr.vlna === null}>všechny vlny</Prepinac>
          {vlny.map((v) => (
            <Prepinac key={v.vlna} href={adresa({ ...filtr, vlna: v.vlna })} aktivni={filtr.vlna === v.vlna}>
              {v.vlna}. vlna
            </Prepinac>
          ))}
        </div>
        <p className="text-sm text-slate-500 mb-3">
          {vybrane.length} z {skoly.length} škol · nahoře školy se správcem a s posledním přihlášením
        </p>
        {vybrane.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Filtru neodpovídá žádná škola.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4 font-medium">Škola</th>
                  <th className="py-2 pr-4 font-medium">Vlna</th>
                  <th className="py-2 pr-4 font-medium">Pozvánka</th>
                  <th className="py-2 pr-4 font-medium">Správce</th>
                  <th className="py-2 pr-4 font-medium">Editoři</th>
                  <th className="py-2 pr-4 font-medium">Poslední přihlášení</th>
                  <th className="py-2 font-medium">Návrhy</th>
                </tr>
              </thead>
              <tbody>
                {vybrane.map(({ skola, stav }) => (
                  <tr key={skola.redizo} className="border-b border-slate-50">
                    <td className="py-2 pr-4">
                      <a href={`/admin/portal?redizo=${skola.redizo}`} className="text-blue-600 hover:underline">
                        {skola.nazev}
                      </a>
                      <span className="block text-xs text-slate-500">
                        {skola.mesto} · {skola.typ}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{vlnaSkoly(skola)}.</td>
                    <td className="py-2 pr-4">{skola.pozvanka_odeslana ? formatDatumCz(skola.pozvanka_odeslana) : '–'}</td>
                    <td className="py-2 pr-4">{stav?.spravce ?? '–'}</td>
                    <td className="py-2 pr-4">{stav?.editori ?? 0}</td>
                    <td className="py-2 pr-4">
                      {stav?.posledni_prihlaseni ? formatDatumCasCz(new Date(stav.posledni_prihlaseni).toISOString()) : '–'}
                    </td>
                    <td className="py-2">{stav?.navrhy ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
