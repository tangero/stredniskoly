import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Jak vybrat školu a uspět u přijímaček | Strategie výběru SŠ',
  description: 'Praktické rady pro výběr střední školy a přípravu na přijímací zkoušky. Osvědčené strategie, tipy na přípravu a důležité zdroje pro úspěch.',
  openGraph: {
    title: 'Jak vybrat školu a uspět u přijímaček',
    description: 'Praktické rady pro výběr střední školy a přípravu na přijímací zkoušky.',
    type: 'article',
  },
};

export default function JakVybratSkoluPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            Jak vybrat školu a uspět u přijímaček
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Praktický průvodce strategií výběru střední školy a přípravou na jednotné přijímací zkoušky
          </p>
        </div>
      </section>

      <main className="flex-1 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* Obsah */}
          <nav className="bg-white rounded-xl p-6 mb-8 shadow-sm">
            <h3 className="font-semibold mb-3">Na této stránce</h3>
            <ul className="space-y-2 text-indigo-600">
              <li><a href="#strategie-vyberu" className="hover:underline">1. Strategie výběru škol</a></li>
              <li><a href="#priprava" className="hover:underline">2. Příprava na testy</a></li>
              <li><a href="#vyber-profilu" className="hover:underline">3. Jak vybrat správný profil školy</a></li>
              <li><a href="#prakticke-tipy" className="hover:underline">4. Praktické tipy</a></li>
              <li><a href="#zdroje" className="hover:underline">5. Užitečné zdroje</a></li>
            </ul>
          </nav>

          {/* Klíčové pravidlo */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-8">
            <strong className="block text-lg mb-2 text-green-800">Klíčové pravidlo, které musíte znát</strong>
            <p className="text-green-900">
              O přijetí rozhodují <strong>pouze vaše body z testů</strong>, nikoliv pořadí škol na přihlášce.
              Priorita určuje jen to, kam nastoupíte, pokud se dostanete na více škol najednou.
              Proto se nebojte dát ambiciózní školu na první místo – nic tím neztrácíte!
            </p>
            <Link href="/jak-funguje-prijimani" className="inline-block mt-3 text-green-700 hover:text-green-900 font-medium underline">
              Zjistit více o algoritmu přijímání →
            </Link>
          </div>

          {/* Sekce 1 - Strategie výběru */}
          <section id="strategie-vyberu" className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
              1. Strategie výběru škol
            </h2>

            <p className="mb-6 text-slate-700">
              Na přihlášku uvádíte až 3 školy seřazené podle priority. Zde je osvědčená strategie,
              kterou vidíme u úspěšných uchazečů:
            </p>

            <div className="space-y-6">
              {/* 1. priorita */}
              <div className="flex gap-4 p-5 bg-green-50 rounded-xl border-l-4 border-green-500">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 text-lg mb-2">První priorita: Vaše vysněná škola</h4>
                  <p className="text-slate-700 mb-2">
                    Dejte sem školu, kam opravdu chcete – klidně i tu ambiciózní. Protože o přijetí rozhodují
                    pouze body, <strong>nic neriskujete</strong>. Pokud se nedostanete, algoritmus vás automaticky
                    posune na druhou volbu.
                  </p>
                  <p className="text-sm text-green-700">
                    💡 Tip: Nebojte se dát školu, kde je minimum o 5-10 bodů výš, než kolik očekáváte.
                    U zkoušek můžete překvapit!
                  </p>
                </div>
              </div>

              {/* 2. priorita */}
              <div className="flex gap-4 p-5 bg-yellow-50 rounded-xl border-l-4 border-yellow-500">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800 text-lg mb-2">Druhá priorita: Realistická volba</h4>
                  <p className="text-slate-700 mb-2">
                    Škola, která by vám vyhovovala a kde máte solidní šanci na přijetí.
                    Měla by být o něco méně náročná než první volba.
                  </p>
                  <p className="text-sm text-yellow-700">
                    💡 Tip: Ideálně škola, kde je minimum přibližně na úrovni vašeho očekávaného skóre
                    nebo mírně pod ním.
                  </p>
                </div>
              </div>

              {/* 3. priorita */}
              <div className="flex gap-4 p-5 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 text-lg mb-2">Třetí priorita: Záchranná síť</h4>
                  <p className="text-slate-700 mb-2">
                    Škola, kam byste se měli dostat i v případě horšího výsledku u zkoušek.
                    Měla by to být škola, kterou byste akceptovali – ne jen &quot;něco&quot;.
                  </p>
                  <p className="text-sm text-blue-700">
                    💡 Tip: Vyberte školu s minimem alespoň o 15-20 bodů níž, než kolik očekáváte.
                    Počítejte s rezervou pro horší den.
                  </p>
                </div>
              </div>
            </div>

            {/* Příklad */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="font-semibold text-indigo-600 mb-4">Příklad: Uchazeč očekává 65 bodů</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span><strong>Gymnázium A</strong> – minimum 70 bodů (ambiciózní)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span><strong>Gymnázium B</strong> – minimum 62 bodů (realistická)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span><strong>SOŠ C</strong> – minimum 50 bodů (záchranná síť)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sekce 2 - Příprava */}
          <section id="priprava" className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
              2. Příprava na testy
            </h2>

            <p className="mb-6 text-slate-700">
              Jednotné přijímací zkoušky testují český jazyk a matematiku. Každý test má maximálně 50 bodů,
              celkem tedy můžete získat až 100 bodů. Zde je osvědčený postup přípravy:
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Zjistěte svou aktuální úroveň</h4>
                  <p className="text-slate-600">
                    Udělejte si jeden zkušební test nanečisto bez přípravy. Zjistíte, kde jste a na co se zaměřit.
                    Testy z minulých let najdete na webu CERMATu.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Procvičujte online testy</h4>
                  <p className="text-slate-600">
                    Pravidelně procvičujte na portálu <strong>TAU CERMAT</strong> – oficiální platformě
                    pro přípravu na přijímačky. Testy jsou zdarma a odpovídají skutečnému formátu.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Jděte na testy nanečisto</h4>
                  <p className="text-slate-600">
                    Mnoho škol a organizací pořádá přijímačky nanečisto. Vyzkoušíte si reálné prostředí,
                    časový tlak a zjistíte, jak zvládáte stres. To je k nezaplacení!
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Zaměřte se na slabiny</h4>
                  <p className="text-slate-600">
                    Analyzujte, kde děláte chyby. V matematice? V čtení s porozuměním? V gramatice?
                    Cílená příprava je efektivnější než obecné opakování.
                  </p>
                </div>
              </div>
            </div>

            {/* Důležité upozornění */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-6 rounded-r-xl mt-6">
              <strong className="block mb-2 text-amber-800">Důležité: Počítejte s časem</strong>
              <p className="text-slate-700">
                U přijímaček je často problémem čas, ne obtížnost úloh. Při procvičování si vždy
                měřte čas a snažte se zlepšovat. Test z češtiny trvá 60 minut, z matematiky 70 minut.
              </p>
            </div>
          </section>

          {/* Sekce 3 - Profil školy */}
          <section id="vyber-profilu" className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
              3. Jak vybrat správný profil školy
            </h2>

            <p className="mb-6 text-slate-700">
              Kromě obtížnosti je důležité zvážit, zda vám škola &quot;sedne&quot;. Zde je na co se zaměřit:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="p-5 bg-purple-50 rounded-xl">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔢</span> Matematicky zaměřené školy
                </h4>
                <p className="text-slate-700 text-sm mb-2">
                  Přijatí studenti mají typicky lepší výsledky z matematiky než z češtiny.
                  Vhodné pro ty, kteří uvažují o technických, přírodovědných nebo IT oborech.
                </p>
                <p className="text-purple-700 text-sm">
                  Zjistíte podle &quot;Indexu zaměření&quot; na detailu školy.
                </p>
              </div>

              <div className="p-5 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📚</span> Humanitně zaměřené školy
                </h4>
                <p className="text-slate-700 text-sm mb-2">
                  Přijatí studenti excelují spíše v češtině. Vhodné pro budoucí právníky,
                  novináře, učitele humanitních předmětů nebo diplomaty.
                </p>
                <p className="text-blue-700 text-sm">
                  Zjistíte podle &quot;Indexu zaměření&quot; na detailu školy.
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-4">Na co se ptát při výběru:</h3>

            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Jsou tam studenti s podobným prospěchem?</strong> Podívejte se na profily přijatých – budete se cítit lépe mezi podobně výkonnými spolužáky.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Jaká je atmosféra školy?</strong> Jděte na den otevřených dveří, promluvte si se studenty. Každá škola má svou &quot;kulturu&quot;.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Jak daleko je škola?</strong> Dojíždění 2 hodiny denně vás bude za 4 roky stát spoustu času a energie.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Jaké jsou možnosti po maturitě?</strong> Kam směřují absolventi? Na vysokou školu? Do praxe?</span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
              <p className="text-indigo-800">
                <strong>Tip:</strong> V našem detailu každé školy najdete &quot;Profil náročnosti&quot; včetně
                zaměření školy a srovnání s podobnými školami. Využijte tyto informace při rozhodování.
              </p>
            </div>
          </section>

          {/* Sekce 4 - Praktické tipy */}
          <section id="prakticke-tipy" className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
              4. Praktické tipy
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <span>✓</span> Udělejte
                </h4>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li>• Navštivte den otevřených dveří</li>
                  <li>• Promluvte si s aktuálními studenty</li>
                  <li>• Projděte si cestu do školy v ranní špičce</li>
                  <li>• Začněte s přípravou včas (měsíce, ne týdny)</li>
                  <li>• Udělejte si časový plán přípravy</li>
                  <li>• Odpočiňte si den před zkouškou</li>
                </ul>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <span>✗</span> Vyvarujte se
                </h4>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li>• Nevybírejte školu jen podle prestiže</li>
                  <li>• Nedávejte &quot;jistotu&quot; na první místo</li>
                  <li>• Nepodceňujte třetí volbu</li>
                  <li>• Neučte se noc před zkouškou</li>
                  <li>• Nepanikařte – stres snižuje výkon</li>
                  <li>• Nezapomeňte na povolené pomůcky</li>
                </ul>
              </div>
            </div>

            {/* Den zkoušky */}
            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <h4 className="font-semibold text-indigo-800 mb-3">V den zkoušky</h4>
              <ul className="text-slate-700 space-y-2">
                <li>📝 Vezměte si více tužek a per (i náhradní)</li>
                <li>⏰ Přijďte s dostatečným předstihem</li>
                <li>🍎 Snídejte – mozek potřebuje energii</li>
                <li>💧 Vezměte si pití a malou svačinu</li>
                <li>📱 Vypněte telefon (nebo nechte doma)</li>
                <li>🧘 Zhluboka dýchejte – stres je normální</li>
              </ul>
            </div>
          </section>

          {/* Sekce 5 - Zdroje */}
          <section id="zdroje" className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
              5. Užitečné zdroje
            </h2>

            <div className="space-y-4">
              {/* TAU CERMAT */}
              <a
                href="https://tau.cermat.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-800 text-lg">TAU CERMAT</h4>
                    <p className="text-slate-600 text-sm mt-1">
                      Oficiální portál pro procvičování testů. Zdarma, přesný formát skutečných zkoušek.
                    </p>
                  </div>
                  <span className="text-blue-500 text-2xl">→</span>
                </div>
                <div className="mt-2 text-xs text-blue-600">tau.cermat.cz</div>
              </a>

              {/* To-DAS */}
              <a
                href="https://to-das.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800 text-lg">To-DAS.cz</h4>
                    <p className="text-slate-600 text-sm mt-1">
                      Další zdroj procvičovacích testů a přípravných materiálů na přijímačky.
                    </p>
                  </div>
                  <span className="text-green-500 text-2xl">→</span>
                </div>
                <div className="mt-2 text-xs text-green-600">to-das.cz</div>
              </a>

              {/* CERMAT */}
              <a
                href="https://prijimacky.cermat.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:border-purple-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-purple-800 text-lg">Přijímačky CERMAT</h4>
                    <p className="text-slate-600 text-sm mt-1">
                      Oficiální informace o jednotných přijímacích zkouškách, termíny, vzorové testy.
                    </p>
                  </div>
                  <span className="text-purple-500 text-2xl">→</span>
                </div>
                <div className="mt-2 text-xs text-purple-600">prijimacky.cermat.cz</div>
              </a>

              {/* Náš simulátor */}
              <Link
                href="/simulator"
                className="block p-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white hover:from-indigo-600 hover:to-purple-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">Náš simulátor přijímaček</h4>
                    <p className="text-white/80 text-sm mt-1">
                      Zadejte své očekávané body a zjistěte, na které školy máte šanci.
                    </p>
                  </div>
                  <span className="text-white text-2xl">→</span>
                </div>
              </Link>
            </div>
          </section>

          {/* Závěrečné CTA */}
          <section className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Připraveni začít?</h2>
            <p className="opacity-90 mb-6 max-w-xl mx-auto">
              Vyzkoušejte náš simulátor a zjistěte, na které školy máte šanci.
              Pak se pusťte do přípravy s jasnými cíli.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/simulator"
                className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all"
              >
                Spustit simulátor
              </Link>
              <Link
                href="/skoly"
                className="inline-block bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Prozkoumat školy
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
