import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { getAllSchools, getAllSchoolsForSearch, getAllKraje } from '@/lib/data';

export default async function HomePage() {
  const schools = await getAllSchoolsForSearch();
  const kraje = await getAllKraje();

  // Počet unikátních škol (podle REDIZO), ne zaměření
  const totalSchools = new Set(schools.map(s => s.id.split('_')[0])).size;
  const totalKraje = kraje.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight" style={{ color: '#28313b' }}>
            Najdi si svou střední školu <br /> a výsledky přijímaček 2026
          </h1>

          {/* Výsledky 2026 — dvoupanelová sekce hned pod nadpisem */}
          <div className="mb-8" style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              Novinky · 15. května 2026
            </div>
            <h2 className="font-black mb-1" style={{ fontSize: '20px', color: '#ffffff' }}>
              Víme, kolik bodů stačilo na každou školu v Česku
            </h2>
            <p className="mb-5" style={{ fontSize: '13px', color: '#94a3b8' }}>
              CERMAT zveřejnil skóre přijatých uchazečů. 3&nbsp;080 škol, aktuální data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/skoly"
                className="block no-underline p-4 transition-opacity hover:opacity-90"
                style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: '8px' }}
              >
                <div style={{ fontSize: '9px', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  📊 Výsledky konkrétní školy
                </div>
                <div className="font-black mb-2" style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1.3 }}>
                  Kolik bodů stačilo na vaši školu?
                </div>
                <div className="mb-4" style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                  Najdi školu, zjisti průměrné skóre přijatých uchazečů a srovnej s loňskem.
                </div>
                <div className="inline-block font-bold" style={{ background: '#22c55e', color: '#fff', fontSize: '12px', padding: '8px 16px', borderRadius: '6px' }}>
                  Hledat školu →
                </div>
              </Link>
              <Link
                href="/vysledky-2026"
                className="block no-underline p-4 transition-opacity hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px' }}
              >
                <div style={{ fontSize: '9px', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  🎯 Chystáš se na přijímačky?
                </div>
                <div className="font-black mb-2" style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1.3 }}>
                  Co bude důležité pro přijímačky 2027?
                </div>
                <div className="mb-4" style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                  Matematika vzrostla o 6 bodů. Žebříčky škol, trendy a rady pro přípravu.
                </div>
                <div className="inline-block font-bold" style={{ background: '#3b82f6', color: '#fff', fontSize: '12px', padding: '8px 16px', borderRadius: '6px' }}>
                  Zobrazit přehled výsledků →
                </div>
              </Link>
            </div>
          </div>

          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#818c99' }}>
            Přehledná data všech středních škol a maturitních oborů v České republice.
            Pozor: nejsou zde školy, kde se dělají jen talentové zkoušky! Chybí konzervatoře, sportovní a umělecké školy, cca 130 škol, nemají jednotné přijímačky.
            Simulátor, kam se dostanete podle výsledků zkoušek nanečisto využívá reálná data z jednotných přijímacích zkoušek. Autor: <a href="https://cs.wikipedia.org/wiki/Patrick_Zandl" style={{ color: '#0074e4' }}>Patrick Zandl</a>, kvůli svým dětem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/simulator"
              className="inline-block text-white px-8 py-3.5 font-semibold text-base no-underline uppercase tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: '#0074e4', borderRadius: '4px', letterSpacing: '1px' }}
            >
              Spustit simulátor
            </Link>
            <Link
              href="/skoly"
              className="inline-block px-8 py-3.5 font-semibold text-base no-underline uppercase tracking-wide transition-all hover:opacity-80"
              style={{ color: '#0074e4', border: '2px solid #0074e4', borderRadius: '4px', letterSpacing: '1px' }}
            >
              Prozkoumat školy
            </Link>
            <Link
              href="https://skola.prolnuto.cz"
              className="inline-block px-8 py-3.5 font-semibold text-base no-underline uppercase tracking-wide transition-all hover:opacity-80"
              style={{ color: '#0074e4', border: '2px solid #0074e4', borderRadius: '4px', letterSpacing: '1px' }}
            >
              Letní škola AI
            </Link>
          </div>

          {/* Novinka: výsledky 2026 */}
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid #e0e6ed' }}>
            <Link
              href="/vysledky-2026"
              className="inline-flex items-center gap-2 text-base no-underline group font-semibold"
              style={{ color: '#16a34a' }}
            >
              <span>Výsledky přijímaček 2026 jsou venku — porovnej výsledky své školy</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
            <p className="mt-1 text-sm" style={{ color: '#818c99' }}>
              Průměrné skóre ČJ+MA přijatých na každé škole. Data CERMAT, 15. 5. 2026.
            </p>
          </div>

          {/* Průvodce link */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e0e6ed' }}>
            <Link
              href="/jak-vybrat-skolu"
              className="inline-flex items-center gap-2 text-base no-underline group"
              style={{ color: '#0074e4' }}
            >
              <span>Jak vybrat školu a uspět u přijímaček – praktický průvodce</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Odkaz na dopravní analýzu */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e0e6ed' }}>
            <Link
              href="/dostupnost"
              className="inline-flex items-center gap-2 text-base no-underline group"
              style={{ color: '#0074e4' }}
            >
              <span>Do jaké školy ve vašem okolí se dostanete MHD za rozumnou dobu?</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold" style={{ color: '#28313b' }}>{totalSchools.toLocaleString('cs-CZ')}</div>
              <div className="text-sm" style={{ color: '#818c99' }}>Škol a oborů</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold" style={{ color: '#28313b' }}>{totalKraje}</div>
              <div className="text-sm" style={{ color: '#818c99' }}>Krajů ČR</div>
            </div>
            <div className="text-center">
              <div className="relative inline-block">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: '#16a34a' }}>2026 ✓</div>
                <span className="absolute -top-2 -right-4 text-white font-bold rounded"
                      style={{ backgroundColor: '#22c55e', fontSize: '8px', padding: '2px 4px', lineHeight: 1 }}>
                  NOVÉ
                </span>
              </div>
              <div className="text-sm font-medium" style={{ color: '#16a34a' }}>Aktuální výsledky</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vyhledávání škol */}
      <section className="py-12" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4" style={{ color: '#28313b' }}>Najdi svou školu</h2>
          <p className="text-center mb-8" style={{ color: '#818c99' }}>
            Hledej podle názvu školy, oboru, města nebo kraje
          </p>
          <SchoolSearch schools={schools} kraje={kraje} />
        </div>
      </section>

      {/* Vibecoding promo */}
      <section className="py-4 pb-8" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4">
          <VibecordingPromo />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" style={{ backgroundColor: '#f2f5f7' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: '#28313b' }}>Jak to funguje?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Zadej své body', description: 'Vlož očekávané body z českého jazyka a matematiky (každý test max. 50 bodů).' },
              { step: 2, title: 'Vyber školy', description: 'Filtruj podle kraje, obce nebo typu školy. Vyber školy, které tě zajímají.' },
              { step: 3, title: 'Uvidíš své šance', description: 'Simulátor ti ukáže, kam bys byl přijat na základě loňských dat.' },
            ].map(item => (
              <div key={item.step} className="text-center p-6 bg-white" style={{ borderRadius: '4px' }}>
                <div
                  className="w-12 h-12 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4"
                  style={{ backgroundColor: '#0074e4' }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#28313b' }}>{item.title}</h3>
                <p style={{ color: '#818c99' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Color coding */}
      <section className="py-16" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: '#28313b' }}>Co znamenají barvy?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 flex items-center gap-4" style={{ borderRadius: '4px', border: '1px solid #e0e6ed' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: '#38caaa' }}>&#10003;</div>
              <div>
                <h4 className="font-semibold" style={{ color: '#28313b' }}>Přijat</h4>
                <p className="text-sm" style={{ color: '#818c99' }}>Body 10+ nad minimem</p>
              </div>
            </div>
            <div className="bg-white p-6 flex items-center gap-4" style={{ borderRadius: '4px', border: '1px solid #e0e6ed' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#ffbf66', color: '#28313b' }}>~</div>
              <div>
                <h4 className="font-semibold" style={{ color: '#28313b' }}>Na hraně</h4>
                <p className="text-sm" style={{ color: '#818c99' }}>V rozmezí &plusmn;10 bodů</p>
              </div>
            </div>
            <div className="bg-white p-6 flex items-center gap-4" style={{ borderRadius: '4px', border: '1px solid #e0e6ed' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: '#ff525b' }}>&#10007;</div>
              <div>
                <h4 className="font-semibold" style={{ color: '#28313b' }}>Nepřijat</h4>
                <p className="text-sm" style={{ color: '#818c99' }}>Body 10+ pod minimem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regions preview */}
      <section className="py-16" style={{ backgroundColor: '#f2f5f7' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4" style={{ color: '#28313b' }}>Přehled podle regionů</h2>
          <p className="text-center mb-12" style={{ color: '#818c99' }}>Prohlédněte si školy ve vašem kraji</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {kraje.slice(0, 14).map(kraj => (
              <Link
                key={kraj.kod}
                href={`/regiony/${kraj.slug}`}
                className="p-4 bg-white text-center no-underline transition-colors hover:opacity-80"
                style={{ borderRadius: '4px', border: '1px solid #e0e6ed' }}
              >
                <div className="font-semibold text-sm" style={{ color: '#28313b' }}>{kraj.nazev}</div>
                <div className="text-xs mt-1" style={{ color: '#818c99' }}>{kraj.count} oborů</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-white" style={{ backgroundColor: '#0074e4' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Vyzkoušej zdarma</h2>
          <p className="opacity-90 mb-8">Žádná registrace, žádné reklamy. Jen ty a tvoje šance.</p>
          <Link
            href="/simulator"
            className="inline-block bg-white px-8 py-3.5 font-semibold text-base no-underline uppercase tracking-wide transition-all hover:opacity-90"
            style={{ color: '#0074e4', borderRadius: '4px', letterSpacing: '1px' }}
          >
            Spustit simulátor
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
