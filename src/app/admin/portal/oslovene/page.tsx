import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCz, formatDatumCasCz } from '@/lib/admin';
import { vyzadujAdmina } from '@/lib/admin-relace';
import { nactiOsloveneSeStavem } from '@/lib/portal-oslovene-stav';
import { filtrujOslovene, filtrZAdresy, souhrnPoVlnach } from '@/lib/portal-oslovene';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Oslovené školy portálu',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ filtr?: string; vlna?: string }>;
}

export default async function OsloveneSkolyPage({ searchParams }: Props) {
  await vyzadujAdmina();
  const filtr = filtrZAdresy(await searchParams);
  const vse = await nactiOsloveneSeStavem();

  const radky = vse?.map((r) => ({ ...r, vlna: r.skola.vlna, spravce: r.stav?.spravce ?? null, navrhy: r.stav?.navrhy ?? 0 }));
  const souhrn = radky ? souhrnPoVlnach(radky) : [];
  const zobrazene = radky ? filtrujOslovene(radky, filtr) : [];
  const aktivni = (ano: boolean) => (ano ? 'font-semibold text-slate-900' : 'text-blue-600 hover:underline');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Oslovené školy portálu</h1>
            <nav className="text-sm flex flex-wrap gap-4" aria-label="Administrace">
              <a href="/admin" className="underline">Administrace</a>
              <a href="/admin/portal" className="underline">Všechny účty</a>
              <a href="/admin/portal/pozvanky" className="underline">Pozvánky školám</a>
            </nav>
          </div>

          {radky === null || radky === undefined ? (
            <p className="text-sm text-slate-500 italic">Databáze účtů není nastavena nebo neodpovídá.</p>
          ) : radky.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Seznam oslovených škol (data/portal/pilot.json) není k dispozici.</p>
          ) : (
            <>
              <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Souhrn po vlnách</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-4 font-medium">Vlna</th>
                        <th className="py-2 pr-4 font-medium">Osloveno</th>
                        <th className="py-2 pr-4 font-medium">Se správcem</th>
                        <th className="py-2 font-medium">Poslalo návrh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {souhrn.map((s) => (
                        <tr key={s.vlna} className="border-b border-slate-50">
                          <td className="py-2 pr-4">
                            <a href={`/admin/portal/oslovene?vlna=${s.vlna}`} className="text-blue-600 hover:underline">{s.vlna}. vlna</a>
                          </td>
                          <td className="py-2 pr-4">{s.osloveno}</td>
                          <td className="py-2 pr-4">{s.seSpravcem}</td>
                          <td className="py-2">{s.poslaloNavrh}</td>
                        </tr>
                      ))}
                      <tr className="font-medium">
                        <td className="py-2 pr-4">Celkem</td>
                        <td className="py-2 pr-4">{souhrn.reduce((a, s) => a + s.osloveno, 0)}</td>
                        <td className="py-2 pr-4">{souhrn.reduce((a, s) => a + s.seSpravcem, 0)}</td>
                        <td className="py-2">{souhrn.reduce((a, s) => a + s.poslaloNavrh, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Školy</h2>
                <p className="text-sm text-slate-500 mb-3 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Filtr:</span>
                  <a href="/admin/portal/oslovene" className={aktivni(filtr.typ === 'vse')}>všechny</a>
                  <a href="/admin/portal/oslovene?filtr=spravce" className={aktivni(filtr.typ === 'spravce')}>jen se správcem</a>
                  {souhrn.map((s) => (
                    <a key={s.vlna} href={`/admin/portal/oslovene?vlna=${s.vlna}`} className={aktivni(filtr.typ === 'vlna' && filtr.vlna === s.vlna)}>
                      {s.vlna}. vlna
                    </a>
                  ))}
                  <span>· zobrazeno {zobrazene.length} z {radky.length}</span>
                </p>
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
                      {zobrazene.map(({ skola, stav }) => (
                        <tr key={skola.redizo} className="border-b border-slate-50">
                          <td className="py-2 pr-4">
                            <a href={`/admin/portal?redizo=${skola.redizo}`} className="text-blue-600 hover:underline">{skola.nazev}</a>
                            <span className="block text-xs text-slate-500">{skola.mesto} · {skola.typ}</span>
                          </td>
                          <td className="py-2 pr-4">{skola.vlna}</td>
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
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
