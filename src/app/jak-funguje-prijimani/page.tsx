import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Jak funguje přijímací řízení na SŠ | Algoritmus rozřazování',
  description: 'Podrobný průvodce algoritmem rozřazování uchazečů na střední školy. Zjistěte, jak funguje systém Deferred Acceptance a proč priorita neovlivňuje vaši šanci na přijetí.',
};

export default function JakFungujePrijimaniPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hlavička */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-indigo-600 mb-4">
          Jak funguje přijímací řízení na SŠ
        </h1>
        <p className="text-lg text-slate-600">
          Průvodce algoritmem rozřazování uchazečů (Deferred Acceptance)
        </p>
        <Link href="/simulator" className="inline-block mt-4 text-indigo-600 hover:underline">
          &larr; Zpět na simulátor
        </Link>
      </div>

      {/* Obsah */}
      <nav className="bg-slate-100 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-3">Obsah</h3>
        <ul className="space-y-2 text-indigo-600">
          <li><a href="#zakladni-princip" className="hover:underline">1. Základní princip</a></li>
          <li><a href="#jak-algoritmus-funguje" className="hover:underline">2. Jak algoritmus funguje krok za krokem</a></li>
          <li><a href="#priklad" className="hover:underline">3. Praktický příklad</a></li>
          <li><a href="#myty" className="hover:underline">4. Mýty vs. realita</a></li>
          <li><a href="#strategie" className="hover:underline">5. Optimální strategie</a></li>
        </ul>
      </nav>

      {/* Sekce 1 */}
      <section id="zakladni-princip" className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
          1. Základní princip
        </h2>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-6">
          <strong className="block text-lg mb-2">Klíčové pravidlo</strong>
          <p>
            Vaše šance na přijetí závisí <strong>výhradně na vašich bodech</strong>, nikoliv na tom,
            jako kolikátou prioritu školu uvedete. Uchazeč s vyšším skóre má VŽDY přednost před
            uchazečem s nižším skóre.
          </p>
        </div>

        <p className="mb-4">
          Od roku 2024 používá CERMAT takzvaný <strong>algoritmus odloženého přijetí</strong>
          (anglicky &quot;Deferred Acceptance&quot;). Tento algoritmus zajišťuje, že:
        </p>

        <ul className="list-disc list-inside space-y-2 mb-6 text-slate-700">
          <li><strong>Pořadí na škole</strong> = určeno pouze podle bodů z přijímacích zkoušek</li>
          <li><strong>Priorita</strong> = určuje pouze vaši preferenci, kam chcete jít</li>
          <li>Nikdo s horším výsledkem vás nemůže &quot;přeskočit&quot; jen kvůli vyšší prioritě</li>
        </ul>

        {/* SVG Diagram */}
        <div className="my-8 overflow-x-auto">
          <svg width="700" height="200" viewBox="0 0 700 200" className="mx-auto">
            <rect x="0" y="0" width="700" height="200" fill="#f8fafc" rx="12"/>

            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
              </marker>
            </defs>

            <rect x="30" y="50" width="180" height="100" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" rx="12"/>
            <text x="120" y="85" textAnchor="middle" fontWeight="bold" fontSize="14" fill="#1e40af">VAŠE BODY</text>
            <text x="120" y="110" textAnchor="middle" fontSize="12" fill="#1e40af">Určují pořadí</text>
            <text x="120" y="130" textAnchor="middle" fontSize="12" fill="#1e40af">na všech školách</text>

            <line x1="220" y1="100" x2="260" y2="100" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead)"/>

            <rect x="270" y="50" width="180" height="100" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" rx="12"/>
            <text x="360" y="85" textAnchor="middle" fontWeight="bold" fontSize="14" fill="#4338ca">ALGORITMUS</text>
            <text x="360" y="110" textAnchor="middle" fontSize="12" fill="#4338ca">Přiřadí vás na</text>
            <text x="360" y="130" textAnchor="middle" fontSize="12" fill="#4338ca">nejlepší možnou školu</text>

            <line x1="460" y1="100" x2="500" y2="100" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead)"/>

            <rect x="510" y="50" width="160" height="100" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" rx="12"/>
            <text x="590" y="85" textAnchor="middle" fontWeight="bold" fontSize="14" fill="#166534">VÝSLEDEK</text>
            <text x="590" y="110" textAnchor="middle" fontSize="12" fill="#166534">Přijetí na školu</text>
            <text x="590" y="130" textAnchor="middle" fontSize="12" fill="#166534">s nejvyšší prioritou</text>

            <rect x="270" y="160" width="180" height="30" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" rx="6"/>
            <text x="360" y="180" textAnchor="middle" fontSize="11" fill="#92400e">Priorita = kam CHCETE jít</text>
          </svg>
        </div>
      </section>

      {/* Sekce 2 */}
      <section id="jak-algoritmus-funguje" className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
          2. Jak algoritmus funguje krok za krokem
        </h2>

        <p className="mb-6">
          Algoritmus probíhá v několika fázích. Klíčové je slovo <strong>&quot;odloženě&quot;</strong> -
          přijetí není finální, dokud algoritmus neskončí.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">Školy sestaví pořadníky</h4>
              <p className="text-slate-600">
                Každá škola seřadí všechny uchazeče podle bodů od nejlepšího po nejhoršího.
                <strong> Priorita uchazeče zde nehraje žádnou roli</strong> - pouze body.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">První kolo - uchazeči žádají o 1. prioritu</h4>
              <p className="text-slate-600">
                Algoritmus &quot;odloženě přijme&quot; uchazeče na jejich 1. prioritu podle pořadí v žebříčku školy.
                Pokud je uchazečů více než míst, přijmou se pouze ti nejlepší.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">Další kola - nepřijatí žádají o další priority</h4>
              <p className="text-slate-600">
                Uchazeči, kteří se nevešli na 1. prioritu, žádají o 2. prioritu.
                Pokud mají <strong>lepší body</strong> než někdo &quot;odloženě přijatý&quot;,
                mohou ho <strong>vytlačit</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h4 className="font-semibold mb-1">Opakování až do ustálení</h4>
              <p className="text-slate-600">
                Proces se opakuje, dokud se všichni nepřiřadí nebo nevyčerpají možnosti.
                Vytlačení uchazeči se posouvají na další priority.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-6 rounded-r-xl mt-6">
          <strong className="block mb-2">Proč &quot;odložené&quot; přijetí?</strong>
          <p className="text-slate-700">
            Přijetí je &quot;odložené&quot;, protože může být kdykoliv zrušeno, pokud přijde uchazeč
            s lepšími body. Finální je až po skončení celého algoritmu.
          </p>
        </div>
      </section>

      {/* Sekce 3 - Příklad */}
      <section id="priklad" className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
          3. Praktický příklad
        </h2>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <h4 className="font-semibold text-indigo-600 mb-4">Situace: Gymnázium X má 2 volná místa</h4>

          <p className="mb-4">Máme tři uchazeče:</p>

          <div className="flex flex-wrap gap-4 justify-center">
            <div className="bg-white border-2 border-pink-400 rounded-lg p-4 text-center min-w-[140px]">
              <div className="font-bold text-lg">Anna</div>
              <div className="text-sm text-slate-600">160 bodů</div>
              <div className="text-xs text-slate-500 mt-1">Priorita 1: Gymn. X</div>
            </div>
            <div className="bg-white border-2 border-blue-400 rounded-lg p-4 text-center min-w-[140px]">
              <div className="font-bold text-lg">Boris</div>
              <div className="text-sm text-slate-600">170 bodů</div>
              <div className="text-xs text-slate-500 mt-1">Priorita 1: Gymn. Y</div>
              <div className="text-xs text-slate-500">Priorita 2: Gymn. X</div>
            </div>
            <div className="bg-white border-2 border-green-400 rounded-lg p-4 text-center min-w-[140px]">
              <div className="font-bold text-lg">Cyril</div>
              <div className="text-sm text-slate-600">150 bodů</div>
              <div className="text-xs text-slate-500 mt-1">Priorita 1: Gymn. X</div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4">Scénář A: Boris se dostane na Gymnázium Y</h3>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-white rounded-lg p-3">
              <div className="font-semibold text-sm text-slate-600">Gymnázium Y</div>
              <div className="text-green-700">Boris (170b) - Přijat</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-semibold text-sm text-slate-600">Gymnázium X</div>
              <div className="text-pink-700">Anna (160b)</div>
              <div className="text-green-700">Cyril (150b)</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="font-semibold text-sm text-green-600">Všichni spokojeni</div>
            </div>
          </div>
          <p className="text-sm text-green-800">
            Boris se dostal na svou 1. prioritu (Gymn. Y) - nepotřebuje Gymn. X.
            Anna a Cyril dostanou místa na Gymn. X.
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-4">Scénář B: Boris se NEDOSTANE na Gymnázium Y</h3>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div className="bg-red-100 rounded-lg p-3">
              <strong>Fáze 1:</strong> Boris žádá o Gymn. Y, ale je odmítnut (všichni přijatí mají 175+ bodů)
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <strong>Fáze 2:</strong> Boris žádá o svou 2. prioritu (Gymn. X)
              <div className="mt-2 text-sm">
                Na Gymn. X jsou Anna (160b) a Cyril (150b). Boris má 170 bodů &gt; 150 bodů.
              </div>
            </div>
            <div className="bg-amber-200 rounded-lg p-3">
              <strong>Výsledek:</strong> Boris (170b) <strong>vytlačí</strong> Cyrila (150b) z Gymnázia X!
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 p-6 rounded-r-xl">
          <strong className="block mb-2">Důležité zjištění</strong>
          <p className="text-slate-700">
            Cyril (150 bodů) byl vytlačen Borisem (170 bodů), přestože Cyril měl Gymnázium X jako
            1. prioritu a Boris jen jako 2. prioritu. <strong>Body rozhodují, ne priorita!</strong>
          </p>
        </div>
      </section>

      {/* Sekce 4 - Mýty */}
      <section id="myty" className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
          4. Mýty vs. realita
        </h2>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-red-700 font-semibold mb-3">
                <span className="text-xl">❌</span> Mýtus
              </h4>
              <p className="text-slate-700">
                &quot;Když dám školu jako 1. prioritu, mám větší šanci na přijetí než někdo,
                kdo ji má jako 2. prioritu.&quot;
              </p>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <span className="text-xl">✓</span> Realita
              </h4>
              <p className="text-slate-700">
                Priorita neovlivňuje vaše pořadí na škole. Rozhodují <strong>pouze body</strong>.
                Uchazeč s vyššími body vás vždy předběhne.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-red-700 font-semibold mb-3">
                <span className="text-xl">❌</span> Mýtus
              </h4>
              <p className="text-slate-700">
                &quot;Když všichni přijatí měli školu jako 1. volbu, musím ji také dát jako 1. volbu.&quot;
              </p>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <span className="text-xl">✓</span> Realita
              </h4>
              <p className="text-slate-700">
                Tato statistika ukazuje pouze, že přijatí uchazeči měli tuto školu jako svou top volbu.
                Neznamená to, že byste museli udělat totéž.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-red-700 font-semibold mb-3">
                <span className="text-xl">❌</span> Mýtus
              </h4>
              <p className="text-slate-700">
                &quot;Když školu dám jako 3. volbu, nemám šanci se dostat.&quot;
              </p>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
              <h4 className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <span className="text-xl">✓</span> Realita
              </h4>
              <p className="text-slate-700">
                Pokud máte dostatek bodů a nedostanete se na 1. a 2. volbu, algoritmus vás
                automaticky přiřadí na 3. volbu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sekce 5 - Strategie */}
      <section id="strategie" className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6 pb-4 border-b-2 border-indigo-600">
          5. Optimální strategie
        </h2>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl mb-6">
          <strong className="block text-lg mb-2">Zlaté pravidlo</strong>
          <p>
            Seřaďte školy podle toho, kam opravdu CHCETE jít. Algoritmus zajistí, že dostanete
            tu nejlepší možnou školu, na kterou máte body.
          </p>
        </div>

        <h3 className="font-semibold text-lg mb-4">Doporučený postup:</h3>

        <ol className="list-decimal list-inside space-y-3 mb-6 text-slate-700">
          <li><strong>1. priorita:</strong> Škola, kam nejvíce chcete (i když je náročná)</li>
          <li><strong>2. priorita:</strong> Další preferovaná škola</li>
          <li><strong>3. priorita:</strong> &quot;Záchranná síť&quot; - škola, kde máte jistotu přijetí</li>
        </ol>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <h4 className="font-semibold text-indigo-600 mb-3">Příklad dobré strategie pro uchazeče se 160 body:</h4>
          <ol className="list-decimal list-inside space-y-2 text-slate-700">
            <li><strong>1. priorita:</strong> Prestižní gymnázium (min. 165b) - ambiciózní volba</li>
            <li><strong>2. priorita:</strong> Kvalitní střední škola (min. 155b) - realistická volba</li>
            <li><strong>3. priorita:</strong> Solidní škola (min. 140b) - jistota</li>
          </ol>
          <p className="mt-4 text-sm text-slate-600">
            <strong>Proč je toto dobré?</strong> Pokud se nedostanete na 1. prioritu, nic neztrácíte -
            algoritmus vás automaticky posune na 2. prioritu se stejnými šancemi.
          </p>
        </div>

        <h3 className="font-semibold text-lg mb-4">Co NEDĚLAT:</h3>

        <ul className="list-disc list-inside space-y-2 text-slate-700">
          <li><strong>Nedávejte &quot;jistotu&quot; jako 1. prioritu</strong> - připravujete se o šanci zkusit náročnější školu</li>
          <li><strong>Nebojte se dát náročnou školu vysoko</strong> - nemůžete tím nic ztratit</li>
          <li><strong>Neřiďte se &quot;statistikami priorit&quot;</strong> - jsou pouze informativní, ne prediktivní</li>
        </ul>
      </section>

      {/* Závěr */}
      <section className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Shrnutí</h2>
        <p className="text-lg opacity-95">
          Vaše šance na přijetí závisí pouze na bodech. Priorita určuje pouze to, kam chcete jít.
          <br />
          Seřaďte školy podle preferencí a nechte algoritmus pracovat pro vás.
        </p>
      </section>

      {/* Zpět na simulátor */}
      <div className="text-center mt-8">
        <Link
          href="/simulator"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Vyzkoušet simulátor &rarr;
        </Link>
      </div>
    </div>
  );
}
