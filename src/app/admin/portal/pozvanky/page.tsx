import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCz, overAdminToken } from '@/lib/admin';
import { nactiPozvanky, kodProSkolu } from '@/lib/portal-pozvanky';
import { pozvankaDoPilotu } from '@/lib/portal-email';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pozvánky školám',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ nahled?: string; ok?: string; chyba?: string }>;
}

const TLACITKO = 'rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700';
const VSTUP = 'rounded border border-slate-300 px-2 py-1 text-sm';

export default async function AdminPozvankyPage({ searchParams }: Props) {
  if (!overAdminToken((await cookies()).get('admin_token')?.value)) notFound();
  const { nahled, ok, chyba } = await searchParams;

  const { radky, chybi, pocty } = await nactiPozvanky();
  // „Hotovo“ jen když opravdu není co poslat a všechno už odešlo. Prázdný pilot
  // ani školy uvázlé na chybějícím kódu se za hotové vydávat nesmí.
  const hotovo = pocty.kOdeslani === 0 && pocty.celkem > 0 && pocty.jizOdeslano === pocty.celkem;
  // Náhled se staví pro konkrétní školu, aby byl vidět skutečný kód i oslovení.
  const proNahled = radky.find((r) => r.redizo === nahled) ?? radky.find((r) => r.maKod && r.email) ?? radky[0];
  const kod = proNahled ? await kodProSkolu(proNahled.redizo) : null;
  const email = proNahled && kod ? pozvankaDoPilotu({ nazevSkoly: proNahled.nazev, osloveni: proNahled.osloveni, kod, vlna: proNahled.vlna }) : null;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="text-sm text-slate-600">
          <Link href="/admin" className="hover:text-blue-600">Administrace</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/portal" className="hover:text-blue-600">Portál</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">Pozvánky školám</span>
        </div>

        <h1 className="text-2xl font-semibold">Pozvánky školám</h1>

        {ok && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{ok}</p>}
        {chyba && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{chyba}</p>}

        {chybi.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
            <p className="font-medium">Odeslat nejde, chybí vstupy:</p>
            <ul className="list-disc pl-5">{chybi.map((c) => <li key={c}>{c}</li>)}</ul>
            <p>
              Kódy v plaintextu a jména ředitelů se schválně nenasazují, takže tahle stránka funguje
              jen lokálně (<code>npm run dev</code>). Na produkci to tak má být.
            </p>
          </div>
        )}

        {/* Hlavní číslo, kvůli kterému se sem chodí. Pozor na nulu: znamená buď
            „hotovo“, nebo „není co poslat“ — velká 0 po úspěšné rozesílce
            vypadá jako selhání, i když je to ten nejlepší možný stav. */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          {hotovo ? (
            <>
              <p className="text-4xl font-semibold text-green-700">Hotovo</p>
              <p className="text-slate-600">
                {pocty.celkem === 1
                  ? 'Pozvánku dostala jediná škola.'
                  : `Pozvánku dostalo všech ${pocty.celkem} ${pocty.celkem < 5 ? 'školy' : 'škol'}.`}{' '}
                Zbývá 0 k odeslání.
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl font-semibold text-slate-900">{pocty.kOdeslani}</p>
              <p className="text-slate-600">
                {pocty.kOdeslani === 1 ? 'škola dostane pozvánku' : pocty.kOdeslani < 5 ? 'školy dostanou pozvánku' : 'škol dostane pozvánku'}
                {' '}z celkem {pocty.celkem} vybraných škol.
              </p>
            </>
          )}
          <ul className="mt-3 text-sm text-slate-600 space-y-1">
            {pocty.jizOdeslano > 0 && <li>{pocty.jizOdeslano} už pozvánku dostalo, znovu se neposílá.</li>}
            {pocty.bezKodu > 0 && <li className="text-amber-800">{pocty.bezKodu} bez kódu – nelze odeslat.</li>}
            {pocty.bezAdresy > 0 && <li className="text-amber-800">{pocty.bezAdresy} bez adresy – nelze odeslat.</li>}
          </ul>
        </section>

        {email && proNahled && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Náhled e-mailu</h2>
            <p className="text-sm text-slate-600">
              Škola <strong>{proNahled.nazev}</strong> · adresát {proNahled.email || '—'} · oslovení „{proNahled.osloveni}“
            </p>
            {/* Řádek „Od“ ředitel uvidí dřív než podpis, takže je to ta část
                pozvánky, kterou je před nevratnou rozesílkou potřeba zkontrolovat
                nejvíc. Chodí ze šablony, ne z odesílací funkce. */}
            <p className="text-sm text-slate-500">Od: <strong>{email.odesilatel}</strong></p>
            <p className="text-sm text-slate-500">Předmět: <strong>{email.subject}</strong></p>
            <iframe
              title="Náhled pozvánky"
              srcDoc={email.html}
              className="w-full h-[640px] rounded-xl border border-slate-200 bg-white"
            />
            <form className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="nahled">Náhled pro jinou školu:</label>
              <select id="nahled" name="nahled" defaultValue={proNahled.redizo} className={VSTUP}>
                {radky.map((r) => (
                  <option key={r.redizo} value={r.redizo}>{r.nazev}</option>
                ))}
              </select>
              <button className={TLACITKO}>Zobrazit</button>
            </form>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Odeslání</h2>

          {/* Zkouška na vlastní adresu nezapisuje datum: škola by se tvářila jako oslovená. */}
          <form method="post" action="/admin/portal/pozvanky/odeslat" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <input type="hidden" name="akce" value="zkouska" />
            <div>
              <label htmlFor="zkouska-na" className="block text-sm font-medium text-slate-700">Zkouška na vlastní adresu</label>
              <p className="text-xs text-slate-500 mb-1">Pošle jednu pozvánku sem, školám nic. Datum odeslání se nezapíše.</p>
              <input id="zkouska-na" name="na" type="email" required placeholder="patrick@zandl.cz" className={`${VSTUP} w-64`} />
            </div>
            <select name="redizo" defaultValue={proNahled?.redizo} aria-label="Která škola" className={VSTUP}>
              {radky.filter((r) => r.maKod).map((r) => (
                <option key={r.redizo} value={r.redizo}>{r.nazev}</option>
              ))}
            </select>
            <button className={TLACITKO}>Poslat zkoušku</button>
          </form>

          <form method="post" action="/admin/portal/pozvanky/odeslat" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <input type="hidden" name="akce" value="ostra" />
            <p className="text-sm text-red-900">
              Ostrá rozesílka <strong>{pocty.kOdeslani}</strong>{' '}
              {pocty.kOdeslani === 1 ? 'škole' : 'školám'} na jejich rejstříkové adresy. Nejde vzít zpět.
            </p>
            <label className="block text-sm text-red-900">
              Pro potvrzení opište počet škol:{' '}
              <input name="potvrzeni" required inputMode="numeric" className={`${VSTUP} w-20`} />
            </label>
            <button
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              disabled={pocty.kOdeslani === 0 || chybi.length > 0}
            >
              Odeslat pozvánky
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Komu se pošle</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4 font-medium">Škola</th>
                  <th className="py-2 pr-4 font-medium">Město</th>
                  <th className="py-2 pr-4 font-medium">Adresa</th>
                  <th className="py-2 pr-4 font-medium">Oslovení</th>
                  <th className="py-2 font-medium">Stav</th>
                </tr>
              </thead>
              <tbody>
                {radky.map((r) => (
                  <tr key={r.redizo} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-slate-900">{r.nazev}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.mesto}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.email || <span className="text-red-700">chybí</span>}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.osloveni}</td>
                    <td className="py-2 text-slate-600">
                      {r.pozvanka_odeslana
                        ? `odesláno ${formatDatumCz(r.pozvanka_odeslana)}`
                        : !r.maKod
                          ? <span className="text-red-700">chybí kód</span>
                          : 'čeká'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
