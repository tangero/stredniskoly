import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CitySchoolsTable } from '@/components/CitySchoolsTable';
import { MESTA, getCityStats } from '@/lib/cityData';
import { generateCityNarrative } from '@/lib/cityNarrative';
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
  return {
    title: `Střední školy ${meta.nazev} — přijímačky 2026`,
    description: `Přehled středních škol v ${meta.nazev}. Výsledky přijímacích zkoušek 2026, kapacity, zájem uchazečů a srovnání s ČR.`,
    openGraph: {
      title: `Střední školy ${meta.nazev} | Přijímačky 2026`,
      description: `Jak se daří středním školám v ${meta.nazev}? Aktuální data z přijímacích zkoušek 2026.`,
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

function TrendArrow({ a, b }: { a: number; b: number }) {
  const pct = a > 0 ? ((b - a) / a) * 100 : 0;
  if (Math.abs(pct) < 3) return <span className="text-slate-400 text-xs">≈ stejné</span>;
  const up = pct > 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-red-600' : 'text-green-700'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)} %
    </span>
  );
}

function TypeCard({ t, national }: { t: SchoolTypeStats; national: NationalTypeStats | undefined }) {
  const idx26 = t.kapacita2026 > 0 ? t.prihlasky2026 / t.kapacita2026 : null;
  const idxColor = idx26 === null ? '' : idx26 >= 3 ? 'text-red-600' : idx26 >= 2 ? 'text-orange-600' : 'text-green-700';
  const hasResult = t.avgCjMa2026 !== null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900 mb-4">{TYPE_LABELS[t.typ] || t.label}</h3>

      {/* Kapacita trend */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Kapacita (místa)</div>
        <div className="flex items-end gap-3">
          {[{ rok: 2024, v: t.kapacita2024 }, { rok: 2025, v: t.kapacita2025 }, { rok: 2026, v: t.kapacita2026 }]
            .filter(x => x.v > 0)
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
        <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Zájem 2026</div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-lg font-bold text-slate-900">{fmt(t.prihlasky2026)}</span>
            <span className="text-xs text-slate-400 ml-1">přihlášek</span>
          </div>
          {idx26 !== null && (
            <div className={`text-lg font-bold ${idxColor}`}>{idx26.toFixed(1)}×</div>
          )}
        </div>
      </div>

      {/* CERMAT skóre */}
      {hasResult && (
        <div className="border-t border-slate-100 pt-4 mt-4">
          <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Průměr přijatých (CJ+MA)</div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <span className="text-2xl font-black text-emerald-700">{t.avgCjMa2026!.toFixed(1)}</span>
              <span className="text-xs text-slate-400 ml-1">bodů / 100</span>
            </div>
            {t.avgDelta !== null && Math.abs(t.avgDelta) >= 0.5 && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.avgDelta > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {t.avgDelta > 0 ? '↑' : '↓'} {t.avgDelta > 0 ? '+' : ''}{t.avgDelta.toFixed(1)} vs 2025
              </span>
            )}
          </div>
          {national && (
            <div className="mt-2 text-xs text-slate-500">
              ČR průměr: <span className={`font-semibold ${t.avgCjMa2026! < national.avgCjMa ? 'text-green-700' : 'text-red-600'}`}>
                {national.avgCjMa.toFixed(1)} bodů
              </span>
              {' '}·{' '}
              {t.avgCjMa2026! < national.avgCjMa
                ? `o ${(national.avgCjMa - t.avgCjMa2026!).toFixed(1)} méně = dostupnější`
                : `o ${(t.avgCjMa2026! - national.avgCjMa).toFixed(1)} více = náročnější`}
            </div>
          )}
          {t.avgRankPct !== null && (
            <div className="mt-1 text-xs text-slate-500">
              Percentil v ČR:{' '}
              <span className="font-semibold">{fmt(t.avgRankPct, 0)}. percentil</span>
              {' '}({t.avgRankPct >= 70 ? 'horní třetina' : t.avgRankPct >= 40 ? 'střední pásmo' : 'dolní třetina'})
            </div>
          )}
        </div>
      )}

      {!hasResult && t.totalCount2025 > 0 && (
        <div className="border-t border-slate-100 pt-3 mt-3 text-xs text-slate-400">
          {t.cermatCount === 0
            ? 'Výsledky CERMAT nejsou k dispozici (obory bez JPZ)'
            : `CERMAT data: ${t.cermatCount} z ${t.totalCount2025} oborů`}
        </div>
      )}
    </div>
  );
}

function NarrativeSection({ text, title }: { text: string; title: string }) {
  if (!text) return null;
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-700 leading-relaxed">{text}</p>
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
  const vsNational = cityIndex2026 !== null
    ? cityIndex2026 < totals.nationalIndex2026 ? 'snazší' : 'těžší'
    : null;

  // Generovat narativní text přes Claude API
  let narrative = null;
  try {
    narrative = await generateCityNarrative(stats);
  } catch {
    // fallback – stránka bude fungovat i bez narativu
  }

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
            <p className="text-blue-200 mb-6">{mestoMeta.kraj} · Data přijímacího řízení 2026</p>

            {/* Hero stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-black">{schools.length}</div>
                <div className="text-blue-200 text-sm">oborů / škol</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-black">{fmt(totals.kapacita2026 || totals.kapacita2025)}</div>
                <div className="text-blue-200 text-sm">míst celkem</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-black">{fmt(totals.prihlasky2026 || totals.prihlasky2025)}</div>
                <div className="text-blue-200 text-sm">přihlášek 2026</div>
                <div className="text-xs text-blue-300 mt-0.5">
                  <TrendArrow a={totals.prihlasky2024} b={totals.prihlasky2026 || totals.prihlasky2025} />
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                {cityIndex2026 !== null ? (
                  <>
                    <div className="text-2xl font-black">{cityIndex2026.toFixed(1)}×</div>
                    <div className="text-blue-200 text-sm">index zájmu</div>
                    {vsNational && (
                      <div className="text-xs text-blue-300 mt-0.5">
                        {vsNational} než ČR ({totals.nationalIndex2026.toFixed(1)}×)
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-black">{totals.nationalIndex2026.toFixed(1)}×</div>
                    <div className="text-blue-200 text-sm">ČR průměr</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

          {/* Narativní analýza */}
          {narrative && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Analýza situace</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
                <NarrativeSection text={narrative.celkovyObraz} title="Celkový obraz" />
                <NarrativeSection text={narrative.gymnazia} title="Gymnázia" />
                <NarrativeSection text={narrative.odborneSkoly} title="Odborné školy" />
                <NarrativeSection text={narrative.koneknurence} title="Konkurence a odmítnutí" />
                <NarrativeSection text={narrative.trendVyvoj} title="Vývoj 2024–2026" />
                <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                  Text vygenerován automaticky z dat CERMAT a MŠMT. Vždy ověřte aktuálnost u konkrétní školy.
                </p>
              </div>
            </section>
          )}

          {/* Přehled podle typu školy */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Kapacity a výsledky podle typu školy</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Vývoj kapacit a průměrné výsledky přijatých uchazečů za roky 2024–2026. Srovnání s celorepublikovým průměrem.
            </p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {byType.map(t => (
                <TypeCard key={t.typ} t={t} national={national[t.typ]} />
              ))}
            </div>
          </section>

          {/* Tabulka škol */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Přehled všech škol a oborů</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Data přijímacího řízení 2026 (kde dostupná) nebo 2025. CJ+MA = průměrný součet bodů přijatých uchazečů z přijímacích zkoušek CERMAT (max 100).
            </p>
            <CitySchoolsTable schools={schools} />
          </section>

          {/* Vysvětlivky */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-slate-700">Jak číst tato data</h2>
            <div className="space-y-2">
              <ExplainerBox title="Co je index poptávky?">
                Index poptávky = počet přihlášek ÷ kapacita. Hodnota 2× znamená, že o každé místo se ucházejí 2 uchazeči.
                Celorepublikový průměr v roce 2026 je <strong>2,95×</strong>. Index nad 3× signalizuje vysokou konkurenci.
              </ExplainerBox>
              <ExplainerBox title="Co jsou body CJ+MA?">
                Body z přijímacích zkoušek CERMAT (Jednotná přijímací zkouška – JPZ). Maximální skóre je 100 bodů:
                50 bodů z češtiny + 50 bodů z matematiky. Zobrazený průměr platí pro přijaté uchazeče –
                reálné minimum pro přijetí bývá nižší. JPZ mají gymnázia, lycea a SOŠ s maturitou.
                SOU (učiliště) JPZ nepíší, proto pro ně CERMAT data chybí.
              </ExplainerBox>
              <ExplainerBox title="Co znamená pořadí (percentil) v ČR?">
                Percentil vyjadřuje, jak náročná je škola ve srovnání se školami stejného typu v celé ČR.
                90. percentil = těžší přijímačky než 90 % srovnatelných škol. Zobrazená hodnota „top X %"
                říká, do kolika procent nejtěžších škol daná škola patří.
              </ExplainerBox>
              <ExplainerBox title="Proč mohou chybět data 2026 u některých škol?">
                Data 2026 pocházejí ze dvou zdrojů: přihlášky (CERMAT data.cermat.cz, 1. kolo) a výsledky (CERMAT výsledky).
                Obory bez JPZ (učiliště, SOU) data o přihláškách v systému nemají. U nových oborů otevřených v 2026
                nebo přejmenovaných oborů může dojít k neshodě ID – v takovém případě zobrazujeme data z roku 2025.
              </ExplainerBox>
              <ExplainerBox title="Přihlášky ≠ odmítnuté osoby">
                Každý uchazeč může od roku 2024 podat až 2 přihlášky. Proto počet přihlášek je vyšší než počet uchazečů.
                Počet přijatých ÷ kapacita ≠ přesná míra úspěšnosti. Skutečný podíl nepřijatých uchazečů
                (ne přihlášek) je proto nižší, než by naznačoval prostý součet.
              </ExplainerBox>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
