import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { getAllKraje, getAllSchoolsForSearch } from '@/lib/data';
import { getKrajPrehled } from '@/lib/krajData';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { cislo, PORADI_OBTIZNOSTI, ZARAZENI_POPISEK, type ZarazeniObtiznosti } from '@/lib/obor-profil';
import { tvar } from '@/lib/cesky-tvar';

export const metadata: Metadata = {
  alternates: { canonical: '/regiony' },
  title: 'Přehled regionů',
  description: 'Střední školy podle krajů ČR: jak těžké bylo se dostat, kam se hlásí jako na první volbu a maturita.',
  openGraph: {
    title: 'Přehled regionů | Přijímačky na střední školy',
    description: 'Přehled středních škol podle krajů ČR.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Střední školy podle krajů',
    description: 'Prozkoumejte školy, obory a možnosti dojíždění ve svém kraji.',
  },
};

/**
 * Výplň pruhu od nejtěžšího po nejsnazší. Stejné pořadí odstínů jako odznaky obtížnosti,
 * ale nejsvětlejší stupeň je tmavší, aby se na bílé kartě neztratil.
 */
const VYPLN_PRUHU: Record<ZarazeniObtiznosti, string> = {
  velmi_tezke: 'bg-slate-800', tezke: 'bg-slate-600', stredne_tezke: 'bg-slate-400',
  vetsina_uspela: 'bg-slate-300', kapacita_nerozhodovala: 'bg-slate-200',
};

function skol(n: number): string {
  return n === 1 ? 'škola' : n >= 2 && n <= 4 ? 'školy' : 'škol';
}

/** Pruh má stejně úplný textový popis; barva nenese samostatnou informaci. */
export function RozlozeniObtiznostiKraje({ rozlozeni }: { rozlozeni: Map<ZarazeniObtiznosti, number> }) {
  const sUdajem = [...rozlozeni.values()].reduce((a, b) => a + b, 0);
  return (
    <>
      {sUdajem > 0 && (
        <div className="flex h-3 overflow-hidden rounded" aria-hidden="true">
          {PORADI_OBTIZNOSTI.map(z => {
            const n = rozlozeni.get(z) ?? 0;
            return n > 0 ? (
              <span key={z} className={VYPLN_PRUHU[z]} style={{ width: `${(n / sUdajem) * 100}%` }} />
            ) : null;
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {PORADI_OBTIZNOSTI.map(z => `${ZARAZENI_POPISEK[z]}: ${cislo(rozlozeni.get(z) ?? 0)}`).join(' · ')}
      </p>
    </>
  );
}

/**
 * Rozcestník krajů: docs/navrh-stranky-kraje-2027.md, oddíl 4.6.
 *
 * U kraje jen počty a rozložení obtížnosti přijetí. Žádný žebříček krajů ani oborů: dřívější
 * „Top 10 podle přihlášek“ řadil nabídky napříč typy studia podle loňských dat a barvil
 * přihlášky na místo semaforem, což slovník ukazatelů zakazuje.
 */
export default async function RegionsPage() {
  const kraje = await getAllKraje();
  const searchSchools = await getAllSchoolsForSearch();
  const rok = await zobrazeneObdobi('cermat-vysledky');

  const krajStats = await Promise.all(
    kraje.map(async (kraj) => {
      const prehled = await getKrajPrehled(kraj.kod);
      const nabidky = prehled?.skoly.flatMap(s => s.nabidky) ?? [];
      const rozlozeni = new Map<ZarazeniObtiznosti, number>();
      for (const n of nabidky) if (n.zarazeni) rozlozeni.set(n.zarazeni, (rozlozeni.get(n.zarazeni) ?? 0) + 1);
      return { ...kraj, skol: prehled?.skoly.length ?? 0, nabidek: nabidky.length, rozlozeni };
    })
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Střední školy podle krajů</h1>
            <p className="text-blue-200 mb-8">
              Vyberte kraj: uvidíte školy a jejich obory, jak těžké bylo se na ně dostat{rok ? ` v 1. kole ${rok}` : ''} a kam se hlásí jako na první volbu.
            </p>
            <SchoolSearch schools={searchSchools} kraje={kraje} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <VibecordingPromo />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <section>
            <h2 className="text-2xl font-bold mb-2">Kraje České republiky</h2>
            <p className="mb-2 text-sm text-slate-600">
              Pruh ukazuje, kolik nabídek v kraji spadá do jednotlivých stupňů obtížnosti přijetí, od nejtěžšího
              vlevo. Popisuje jeden ročník, ne kvalitu škol.
            </p>
            <ul className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legenda pruhu">
              {PORADI_OBTIZNOSTI.map(z => (
                <li key={z} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-4 rounded-sm ${VYPLN_PRUHU[z]}`} />{ZARAZENI_POPISEK[z]}
                </li>
              ))}
            </ul>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {krajStats.map((kraj) => {
                return (
                  <Link
                    key={kraj.kod}
                    href={`/regiony/${kraj.slug}`}
                    className="group rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                  >
                    <h3 className="mb-1 text-lg font-semibold text-[#16325c] group-hover:underline">{kraj.nazev}</h3>
                    <p className="mb-3 text-sm text-slate-600">
                      {cislo(kraj.skol)} {skol(kraj.skol)} · {cislo(kraj.nabidek)} {tvar(kraj.nabidek, 'nabídka', 'nabídky', 'nabídek')}
                    </p>
                    <RozlozeniObtiznostiKraje rozlozeni={kraj.rozlozeni} />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
