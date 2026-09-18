import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { OdberBlok } from '@/components/novinky/OdberBlok';
import { getAllSchoolsForSearch, getAllKraje } from '@/lib/data';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import calendar from '@/data/admissions-2027.json';

export const metadata = {
  title: 'Výběr střední školy a kalendář přijímaček 2027',
  description: 'Termíny přijímaček 2027 podle MŠMT a historické výsledky škol 2024–2026. Prozkoumej obory, porovnej výsledky a naplánuj přihlášky.',
};

// Věta o nabídce oborů závisí na dnešním datu, proto se stránka obnovuje denně.
export const revalidate = 86400;

/**
 * Upozornění, že web ukazuje obory z posledního přijímacího řízení a kdy školy vyhlásí nové.
 * Rok nabídky bere z registru stavu datových sad, termín z kalendáře MŠMT v admissions-2027.json.
 * Po převzetí nové nabídky (registr přepne cermat-prihlasky) upozornění zmizí.
 */
async function nabidkaOboru(): Promise<string | null> {
  const obdobi = await zobrazeneObdobi('cermat-prihlasky');
  const vyhlaseni = calendar.groups
    .find((g) => g.id === 'stredni-skoly')
    ?.events.find((e) => e.id === 'ss-kriteria');
  if (!obdobi || !vyhlaseni) return null;
  const rokNabidky = Number(obdobi);
  const rokNovy = Number(vyhlaseni.start.slice(0, 4));
  if (rokNabidky >= rokNovy) return null;

  const dnes = new Date().toISOString().slice(0, 10);
  const termin = `${vyhlaseni.date} ${rokNovy}`;
  if (dnes < vyhlaseni.start) {
    return `Obory a místa na webu jsou z přijímacího řízení ${rokNabidky}. Nabídku oborů pro rok ${rokNovy}, tedy obory a počet míst, školy zveřejní spolu s kritérii přijetí ${termin}. Do té doby si ověř přímo u školy, jestli obor otevírá.`;
  }
  if (dnes <= (vyhlaseni.end ?? vyhlaseni.start)) {
    return `Školy právě zveřejňují kritéria přijetí a s nimi nabídku oborů pro rok ${rokNovy}, tedy obory a počet míst (${termin}). Obory a místa na webu jsou zatím z přijímacího řízení ${rokNabidky}; ověř si nabídku přímo u školy.`;
  }
  return `Školy zveřejnily kritéria přijetí a nabídku oborů pro rok ${rokNovy} ${termin}. Obory a místa na webu jsou zatím z přijímacího řízení ${rokNabidky}; nové doplníme, až je CERMAT zveřejní v otevřených datech.`;
}

export default async function HomePage() {
  const schools = await getAllSchoolsForSearch();
  const kraje = await getAllKraje();

  // Počet unikátních škol (podle REDIZO), ne zaměření
  const totalSchools = new Set(schools.map(s => s.id.split('_')[0])).size;
  const totalKraje = kraje.length;
  const upozorneniNabidka = await nabidkaOboru();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight" style={{ color: '#28313b' }}>
            Najdi si svou střední školu <br /> připrav se na přijímačky 2027
          </h1>

          <div className="mb-8 rounded-xl bg-slate-900 p-6 text-left text-white">
            <p className="text-blue-300 text-sm mb-2">PŘIJÍMAČKY 2027</p>
            <h2 className="text-2xl font-bold mb-3">Termíny už známe. Výběr školy může začít.</h2>
            <p className="text-slate-300 mb-5">Přihlášky na SŠ: 1.–22. února 2027. Konzervatoře už 1.–30. listopadu 2026.</p>
            {/* Upozornění, z jakého roku jsou obory (větev titulky) */}
            {upozorneniNabidka && (
              <p className="mb-5 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm leading-relaxed text-amber-50">
                {upozorneniNabidka}
              </p>
            )}
            <div className="mb-5">
              {/* Odběr termínů: hlavní místo formuláře (návrh novinek, oddíl 4) */}
              <OdberBlok zdroj="titulka-karta" varianta="karta" nadpis="Termíny přijímaček e-mailem" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/prijimacky-2027" className="rounded-lg bg-blue-700 p-5 hover:bg-blue-600">
                <h3 className="font-bold mb-2">Kalendář přijímaček 2027 →</h3>
                <p className="text-sm text-blue-100">Přihlášky, JPZ, výsledky i druhé kolo. Termíny MŠMT a kalendář ke stažení.</p>
              </Link>
              <Link href="/vysledky/2026" className="rounded-lg border border-slate-600 p-5 hover:bg-slate-800">
                <h3 className="font-bold mb-2">Obnovené výsledky 2026 →</h3>
                <p className="text-sm text-slate-300">Průměrné skóre přijatých podle CERMAT, platnost k 17. srpnu 2026. Průměr není hranice přijetí.</p>
              </Link>
            </div>
          </div>
          <p className="text-lg mb-8 max-w-2xl mx-auto text-slate-600">
            Prozkoumej obory s jednotnou přijímací zkouškou a jejich historické výsledky.
            Přehled zatím nepokrývá všechny formy studia ani obory bez JPZ, například učební obory a konzervatoře.
            Simulátor porovnává cvičné skóre s minulými výsledky; přijetí v roce 2027 závisí na kritériích školy a výsledcích uchazečů.
            Autor: <a href="https://cs.wikipedia.org/wiki/Patrick_Zandl" className="text-blue-700">Patrick Zandl</a>, kvůli svým dětem.
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
              href="/vysledky/2026"
              className="inline-flex items-center gap-2 text-base no-underline group font-semibold"
              style={{ color: '#16a34a' }}
            >
              <span>Výsledky přijímaček 2026 jsou venku — porovnej výsledky své školy</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
            <p className="mt-1 text-sm" style={{ color: '#818c99' }}>
              Průměrné skóre přijatých v denních nezkrácených oborech s JPZ. Data CERMAT k 17. 8. 2026.
            </p>
          </div>

          {/* Přehled měst */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e0e6ed' }}>
            <Link
              href="/mesto"
              className="inline-flex items-center gap-2 text-base no-underline group font-semibold"
              style={{ color: '#0074e4' }}
            >
              <span>Jak si vedou školy ve tvém městě? Přehled 20 největších měst ČR</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
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
              <div className="text-sm" style={{ color: '#818c99' }}>Škol v historickém přehledu</div>
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
      <section id="vyhledavani" className="py-12" style={{ backgroundColor: '#ffffff' }}>
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
          <div className="mt-10 max-w-xl mx-auto text-left">
            {/* Druhá příležitost k odběru pro toho, kdo dočetl titulní stránku */}
            <OdberBlok zdroj="titulka-pas" varianta="pas" nadpis="Ať ti neuteče termín" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
