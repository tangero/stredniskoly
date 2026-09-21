import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CitySchoolsTable } from '@/components/CitySchoolsTable';
import { MESTA, getCityStats } from '@/lib/cityData';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { CityStats, SchoolTypeStats, NationalTypeStats } from '@/lib/cityData';

interface Props {
  params: Promise<{ mesto: string }>;
}

export async function generateStaticParams() {
  return MESTA.map(m => ({ mesto: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesto: mestoSlug } = await params;
  const meta = MESTA.find(m => m.slug === mestoSlug);
  if (!meta) return { title: 'Město nenalezeno' };
  // Ročník z registru, nikdy napevno (CLAUDE.md, Stav datových sad, pravidlo 1).
  const rok = await zobrazeneObdobi('cermat-vysledky');
  const zaRok = rok ? ` ${rok}` : '';
  return {
    alternates: { canonical: `/mesto/${meta.slug}` },
    title: `Střední školy ${meta.nazev} — kompletní přehled`,
    description: `Přehled středních škol v ${meta.nazev}: jak těžké bylo se na ně dostat v 1. kole${zaRok}, počty míst a přihlášek.`,
    openGraph: {
      title: `Střední školy ${meta.nazev} — kompletní přehled`,
      description: `Které školy v ${meta.nazev} nabízejí co a jak těžké bylo se na ně dostat v 1. kole${zaRok}.`,
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  GY4: 'Gymnázium 4-leté', GY6: 'Gymnázium 6-leté', GY8: 'Gymnázium 8-leté',
  LYC: 'Lyceum', SOS: 'Střední odborná škola', SOU: 'SOU / učiliště', NAS: 'Nástavba',
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

/** Změna mezi krajními ročníky. Bez semaforu: víc míst není špatná zpráva. */
function TrendArrow({ a, b }: { a: number; b: number }) {
  const pct = a > 0 ? ((b - a) / a) * 100 : 0;
  if (Math.abs(pct) < 3) return <span className="text-slate-400 text-xs">≈ stejně</span>;
  return (
    <span className="text-xs font-medium text-slate-500">
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(0)} %
    </span>
  );
}

function TypeCard({ t, national, rok }: { t: SchoolTypeStats; national: NationalTypeStats | undefined; rok: number | null }) {
  const idx26 = t.kapacita2026 > 0 ? t.prihlasky2026 / t.kapacita2026 : null;
  const hasResult = t.avgCjMa2026 !== null;
  // Ročníky v kartě jsou zobrazený rok a dva starší; registr určuje jen ten zobrazený.
  const roky = rok ? [rok - 2, rok - 1, rok] : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900 mb-4">{TYPE_LABELS[t.typ] || t.label}</h3>

      {/* Kapacita trend */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Kapacita (místa)</div>
        <div className="flex items-end gap-3">
          {[t.kapacita2024, t.kapacita2025, t.kapacita2026]
            .map((v, i) => ({ rok: roky[i], v }))
            .filter(x => x.v > 0 && x.rok)
            .map(({ rok, v }) => (
              <div key={rok} className="text-center">
                <div className="text-lg font-bold text-slate-900">{fmt(v)}</div>
                <div className="text-xs text-slate-400">{rok}</div>
              </div>
            ))}
          {t.kapacita2024 > 0 && t.kapacita2026 > 0 && (
            <TrendArrow a={t.kapacita2024} b={t.kapacita2026} />
          )}
        </div>
      </div>

      {/* Přihlášky & index */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
          Zájem{rok ? ` ${rok}` : ''}
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-lg font-bold text-slate-900">{fmt(t.prihlasky2026)}</span>
            <span className="text-xs text-slate-400 ml-1">přihlášek</span>
          </div>
          {idx26 !== null && (
            <div className="text-lg font-bold text-slate-900">
              {fmt(idx26, 1)}
              <span className="ml-1 text-xs font-normal text-slate-400">přihlášky na místo</span>
            </div>
          )}
        </div>
      </div>

      {/* CERMAT skóre */}
      {hasResult && (
        <div className="border-t border-slate-100 pt-4 mt-4">
          <div className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
            S jakými výsledky přišli přijatí
          </div>

          {/* CJ + MA mini-karty */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">
                {t.avgCj2026 !== null ? t.avgCj2026.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Český jazyk</div>
              <div className="text-xs text-slate-400">z&nbsp;max&nbsp;50&nbsp;b.</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-700">
                {t.avgMa2026 !== null ? t.avgMa2026.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Matematika</div>
              <div className="text-xs text-slate-400">z&nbsp;max&nbsp;50&nbsp;b.</div>
            </div>
          </div>

          {/* Celkový součet + delta */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <div>
              <span className="text-2xl font-black text-emerald-700">{t.avgCjMa2026!.toFixed(1)}</span>
              <span className="text-xs text-slate-400 ml-1">b. ČJ+MA celkem (max 100)</span>
            </div>
            {t.avgDelta !== null && Math.abs(t.avgDelta) >= 0.5 && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                {t.avgDelta > 0 ? '↑' : '↓'} {t.avgDelta > 0 ? '+' : ''}{t.avgDelta.toFixed(1)}{rok ? ` proti ${rok - 1}` : ''}
              </span>
            )}
          </div>

          {national && (
            <div className="text-xs text-slate-500">
              V celé zemi <span className="font-semibold">{national.avgCjMa.toFixed(1)}</span>
              {' '}·{' '}
              {Math.abs(t.avgCjMa2026! - national.avgCjMa) < 0.5
                ? 'tady přicházejí s podobnými výsledky'
                : t.avgCjMa2026! < national.avgCjMa
                  ? `tady o ${(national.avgCjMa - t.avgCjMa2026!).toFixed(1)} bodu méně`
                  : `tady o ${(t.avgCjMa2026! - national.avgCjMa).toFixed(1)} bodu více`}
            </div>
          )}
        </div>
      )}

      {!hasResult && t.totalCount2025 > 0 && (
        <div className="border-t border-slate-100 pt-3 mt-3 text-xs text-slate-400">
          {t.cermatCount === 0
            ? 'Obory bez jednotné zkoušky; výsledky testů u nich neexistují'
            : `Výsledky má ${t.cermatCount} z ${t.totalCount2025} oborů`}
        </div>
      )}
    </div>
  );
}

function ExplainerBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border border-slate-200 rounded-lg">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none hover:bg-slate-50">
        <span className="text-slate-400 group-open:rotate-90 transition-transform text-sm">▶</span>
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
        {children}
      </div>
    </details>
  );
}

export default async function MestoPage({ params }: Props) {
  const { mesto: mestoSlug } = await params;
  const mestoMeta = MESTA.find(m => m.slug === mestoSlug);
  if (!mestoMeta) notFound();

  const stats: CityStats | null = await getCityStats(mestoMeta.nazev);
  if (!stats) notFound();

  const { schools, byType, national, totals } = stats;

  const cityIndex2026 = totals.kapacita2026 > 0 ? totals.prihlasky2026 / totals.kapacita2026 : null;

  // Ročník z registru; sady kapacit, přihlášek a výsledků jedou společně,
  // u složeného ukazatele se bere nejstarší ze zobrazených období.
  const rok = Number(await zobrazeneObdobi('cermat-vysledky')) || null;
  const pocetSkol = new Set(schools.map(s => s.redizo)).size;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <nav className="text-sm text-blue-200 mb-4">
              <Link href="/" className="hover:text-white">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/mesto" className="hover:text-white">Města</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{mestoMeta.nazev}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-bold mb-1">
              Střední školy — {mestoMeta.nazev}
            </h1>
            <p className="text-blue-200 mb-6">
              {mestoMeta.kraj} · {fmt(pocetSkol)}{' '}
              {pocetSkol === 1 ? 'škola' : pocetSkol < 5 ? 'školy' : 'škol'}, {fmt(schools.length)}{' '}
              {schools.length < 5 ? 'nabídky' : 'nabídek'}
              {rok ? ` v 1. kole ${rok}` : ''}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-black">{fmt(totals.kapacita2026 || totals.kapacita2025)}</div>
                <div className="text-blue-200 text-sm">míst celkem</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-black">{fmt(totals.prihlasky2026 || totals.prihlasky2025)}</div>
                <div className="text-blue-200 text-sm">přihlášek</div>
              </div>
              {cityIndex2026 !== null && (
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-black">{fmt(cityIndex2026, 1)}</div>
                  <div className="text-blue-200 text-sm">přihlášky na místo</div>
                  <div className="text-xs text-blue-300 mt-0.5">
                    v celé zemi {fmt(totals.nationalIndex2026, 1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

          {/* Školy ve městě */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Které školy tu co nabízejí</h2>
            <p className="text-slate-600 mb-3 text-sm">
              Jedna karta je jedna škola, uvnitř jsou její obory. U každého oboru je obtížnost
              přijetí za 1. kolo{rok ? ` ${rok}` : ''}: kolik soutěžících uchazečů se na něj dostalo.
            </p>
            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <b>Učební obory bez jednotné zkoušky tu nejsou.</b> Přehled stojí na datech
              o denním nezkráceném studiu s povinnou jednotnou zkouškou, takže obory kategorií
              C, E, H a J v něm chybí, i když je škola nabízí. Co škola opravdu otevírá, stojí
              v jejích kritériích.
            </p>
            <CitySchoolsTable schools={schools} rok={rok ?? 0} />
          </section>

          {/* Přehled podle typu školy */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Kapacity a výsledky podle typu školy</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Vývoj kapacit a s jakými výsledky přicházejí přijatí uchazeči. Srovnání s celou zemí.
            </p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {byType.map(t => (
                <TypeCard key={t.typ} t={t} national={national[t.typ]} rok={rok} />
              ))}
            </div>
          </section>

          {/* Vysvětlivky */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-slate-700">Jak číst tato data</h2>
            <div className="space-y-2">
              <ExplainerBox title="Co je obtížnost přijetí?">
                Slovní zařazení podle toho, kolik soutěžících uchazečů se na obor dostalo —
                tedy těch, kdo splnili požadavky školy a nedostali se na obor, který měli
                na přihlášce výš. Stupně jsou: místo pro všechny (nikdo nebyl odmítnut kvůli
                kapacitě), dostala se většina (aspoň dvě třetiny), středně těžké (polovina
                až dvě třetiny), těžké (třetina až polovina) a velmi těžké (méně než třetina).
                Popisuje jeden ročník, ne kvalitu školy ani obtížnost studia, a neříká, jakou
                šanci má konkrétní uchazeč. U oborů s méně než deseti soutěžícími se neuvádí,
                protože jeden uchazeč by přehodil stupeň. Mezi ročníky se zařazení mění, proto
                se u něj uvádí i předchozí rok.
              </ExplainerBox>
              <ExplainerBox title="Co jsou přihlášky na místo?">
                Počet přihlášek dělený počtem míst. Hodnota 2 znamená dvě přihlášky na jedno
                místo. Nadsazuje konkurenci: jeden uchazeč podává víc přihlášek a kdo se dostal
                na obor výš na své přihlášce, o tohle místo už nesoutěžil. Není to osobní
                pravděpodobnost přijetí. V celé zemi je to {totals.nationalIndex2026.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })}.
              </ExplainerBox>
              <ExplainerBox title="Co znamenají body u oboru?">
                Průměr bodů, s jakými přišli přijatí uchazeči: součet češtiny a matematiky,
                každý předmět nejvýš 50 bodů, lepší z obou pokusů. Popisuje, s jakými výsledky
                přicházejí spolužáci — neříká nic o náročnosti studia ani o kvalitě výuky
                a <b>není to hranice přijetí</b>, tu nikdo nezveřejňuje. Body se nesrovnávají
                mezi ročníky, protože odrážejí i obtížnost testu.
              </ExplainerBox>
              <ExplainerBox title="Proč některý obor nemá údaje?">
                Přehled spojuje obory z katalogu s denními nezkrácenými obory s jednotnou
                zkouškou. Obor, který škola v zobrazeném ročníku nevypsala, i nové nebo
                přejmenované zaměření zůstane bez údajů — nepárujeme odhadem.
                <b> Chybějící údaj není nula</b> a neznamená, že se tam dostal každý.
              </ExplainerBox>
              <ExplainerBox title="Přihlášky nejsou unikátní osoby">
                Jeden uchazeč může podat více přihlášek. Rozdíl mezi přihláškami a přijatými proto nelze přepočítat na počet nepřijatých dětí pevným koeficientem. Přihlášky jednotlivých priorit nejsou příslibem přijetí.
              </ExplainerBox>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
