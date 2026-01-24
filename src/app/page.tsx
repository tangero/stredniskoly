import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllSchools, getAllKraje } from '@/lib/data';

export default async function HomePage() {
  const schools = await getAllSchools();
  const kraje = await getAllKraje();

  const totalSchools = schools.length;
  const totalKraje = kraje.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Zjisti své šance na přijetí na střední školu
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Simulátor využívá reálná data z jednotných přijímacích zkoušek.
            Zadej své body a zjisti, kam máš největší šanci.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/simulator"
              className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-all hover:scale-105 shadow-lg"
            >
              Spustit simulátor
            </Link>
            <Link
              href="/skoly"
              className="inline-block bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Prozkoumat školy
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">{totalSchools.toLocaleString('cs-CZ')}</div>
              <div className="text-sm opacity-80">Škol a oborů</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">{totalKraje}</div>
              <div className="text-sm opacity-80">Krajů ČR</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">2024-2025</div>
              <div className="text-sm opacity-80">Data z let</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Jak to funguje?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Zadej své body',
                description: 'Vlož očekávané body z českého jazyka a matematiky (každý test max. 50 bodů).',
              },
              {
                step: 2,
                title: 'Vyber školy',
                description: 'Filtruj podle kraje, obce nebo typu školy. Vyber školy, které tě zajímají.',
              },
              {
                step: 3,
                title: 'Uvidíš své šance',
                description: 'Simulátor ti ukáže, kam bys byl přijat na základě loňských dat.',
              },
            ].map(item => (
              <div key={item.step} className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Color coding */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Co znamenají barvy?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
              <div>
                <h4 className="font-semibold">Přijat</h4>
                <p className="text-sm text-slate-600">Body 10+ nad minimem</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">~</div>
              <div>
                <h4 className="font-semibold">Na hraně</h4>
                <p className="text-sm text-slate-600">V rozmezí ±10 bodů</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">✗</div>
              <div>
                <h4 className="font-semibold">Nepřijat</h4>
                <p className="text-sm text-slate-600">Body 10+ pod minimem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regions preview */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Přehled podle regionů</h2>
          <p className="text-center text-slate-600 mb-12">Prohlédněte si školy ve vašem kraji</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {kraje.slice(0, 14).map(kraj => (
              <Link
                key={kraj.kod}
                href={`/region/${kraj.slug}`}
                className="p-4 bg-slate-50 rounded-xl text-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <div className="font-semibold text-sm">{kraj.nazev}</div>
                <div className="text-xs text-slate-500 mt-1">{kraj.count} oborů</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Vyzkoušej zdarma</h2>
          <p className="opacity-90 mb-8">Žádná registrace, žádné reklamy. Jen ty a tvoje šance.</p>
          <Link
            href="/simulator"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-all hover:scale-105 shadow-lg"
          >
            Spustit simulátor
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
