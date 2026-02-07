import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Changelog - Historie verzí',
  description: 'Historie všech změn a verzí aplikace Přijímačky na střední školy.',
};

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'new' | 'fix' | 'improve';
    text: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '2.0.0',
    date: '7. 2. 2026',
    title: 'Transfer-aware Dijkstra v2 a rebranding',
    changes: [
      { type: 'new', text: 'Transfer-aware Dijkstra — realistické přepravní časy s přestupními penalizacemi a čekáním na spoj (headway/2)' },
      { type: 'new', text: 'Zobrazení použitých linek (autobus, vlak, metro) u každé dostupné školy' },
      { type: 'new', text: 'Rozpad času na jízdu, čekání a chůzi u každé trasy' },
      { type: 'new', text: 'Počet přestupů jako badge u každé školy' },
      { type: 'new', text: 'Filtr podle typu školy (GY4, GY8, LYC, SOŠ, SOU...)' },
      { type: 'new', text: 'Kompletní seznam oborů/zaměření u každé školy místo jednoho typu' },
      { type: 'new', text: 'Adresa školy v přehledu dostupnosti' },
      { type: 'new', text: 'Panel „Jak to funguje" s návodem a vysvětlením výpočtu' },
      { type: 'new', text: 'Nová SVG favicon — motiv graduační čepice' },
      { type: 'improve', text: 'Přejmenování serveru na „Přijímačky na střední školy"' },
      { type: 'improve', text: 'Menu: „Dojezdovost ČR" → „Do jaké školy dojedete MHD"' },
      { type: 'improve', text: 'Odebrána položka „Školy dostupné MHD" (nahrazena celostátní dojezdovostí)' },
      { type: 'improve', text: 'Trvalý redirect /praha-dostupnost → /dostupnost' },
      { type: 'improve', text: 'Build skript pro graf z GTFS — 35 575 zastávek, 1 431 linek, headway tabulka' },
      { type: 'new', text: 'Vlastní doména prijimackynaskolu.cz' },
      { type: 'improve', text: 'Nový hlavní titulek: „Najdi si svou střední školu a zjisti své šance"' },
      { type: 'improve', text: 'Aktualizace všech kanonických URL, sitemapy a robots.txt na novou doménu' },
    ],
  },
  {
    version: '1.5.2',
    date: '7. 2. 2026',
    title: 'Optimalizace našeptávače zastávek',
    changes: [
      { type: 'improve', text: 'Předpočítaný index pro vyhledávání zastávek — místo 36k normalizací při každém dotazu jen lookup do Map' },
      { type: 'new', text: 'Klávesová navigace v našeptávači (šipky, Enter, Escape)' },
      { type: 'new', text: 'Zvýraznění matchovaného textu v návrzích zastávek' },
      { type: 'new', text: 'Zobrazení počtu nalezených výsledků a loading stavu' },
      { type: 'improve', text: 'Zavření dropdownu kliknutím mimo oblast' },
      { type: 'improve', text: 'Podpora dlouhých názvů zastávek (např. Brandýs nad Labem-St. Boleslav)' },
      { type: 'improve', text: 'ARIA atributy pro přístupnost (combobox, listbox)' },
      { type: 'fix', text: 'Oprava race condition — abortnutý fetch přepisoval loading stav při rychlém psaní' },
      { type: 'new', text: 'Vyhledávání zastávek i uvnitř názvu — např. „Zahradní město" najde i Brandýs nad Labem-St. Boleslav, Zahradní Město' },
    ],
  },
  {
    version: '1.5.1',
    date: '5. 2. 2026',
    title: 'Rozlišení duplicitních oborů v simulátoru',
    changes: [
      { type: 'fix', text: 'Zobrazení zaměření/pobočky u oborů v simulátoru - odstraněny vizuální duplikáty' },
    ],
  },
  {
    version: '1.5.0',
    date: '5. 2. 2026',
    title: 'UX/UI audit a opravy přístupnosti',
    changes: [
      { type: 'fix', text: 'Přidán Header a Footer na stránku Jak funguje přijímání' },
      { type: 'fix', text: 'Responsivní SVG diagram (nahrazena fixní šířka 700px)' },
      { type: 'new', text: 'Mobilní card view pro Top 50 škol na /skoly' },
      { type: 'new', text: 'Mobilní card view pro Top 10 oborů na /regiony' },
      { type: 'improve', text: 'Numerická mobilní klávesnice pro zadávání bodů v simulátoru' },
      { type: 'improve', text: 'Responsivní legenda na stránce /skoly' },
      { type: 'improve', text: 'Breadcrumb navigace na stránce Jak funguje přijímání' },
      { type: 'improve', text: 'Footer grid layout pro tablety (sm:grid-cols-2)' },
      { type: 'new', text: 'UX/UI audit report (AUDIT.md)' },
    ],
  },
  {
    version: '1.4.0',
    date: '5. 2. 2026',
    title: 'Mobilní responsivita',
    changes: [
      { type: 'improve', text: 'Přidáno hamburger menu pro mobilní zařízení v hlavičce' },
      { type: 'improve', text: 'Responsivní layout tlačítek délky studia v simulátoru' },
      { type: 'improve', text: 'Přepracované karty škol pro mobilní zobrazení (dvouřádkový layout)' },
      { type: 'improve', text: 'Zkrácené texty prioritních tlačítek na mobilech' },
      { type: 'improve', text: 'Kompaktní legenda v přehledu regionů pro malé obrazovky' },
    ],
  },
  {
    version: '1.3.0',
    date: '4. 2. 2026',
    title: 'Nová struktura škol a průvodce',
    changes: [
      { type: 'new', text: 'Nová dvoustupňová struktura stránek škol: Přehled školy + Detail oboru/zaměření' },
      { type: 'new', text: 'Navigace mezi obory školy pomocí tabů' },
      { type: 'new', text: 'Stránka "Jak vybrat školu a uspět u přijímaček" - praktický průvodce' },
      { type: 'new', text: 'Aliasy pro PORG pobočky ve vyhledávání' },
      { type: 'new', text: 'Odkaz na průvodce v hlavičce a patičce' },
      { type: 'fix', text: 'Oprava duplicitních názvů oborů - přidání délky studia pro rozlišení' },
      { type: 'fix', text: 'Oprava duplicitních URL pro programy se stejným názvem' },
      { type: 'fix', text: 'Oprava navigace oborů - rozlišení KKOV vs. zaměření' },
      { type: 'improve', text: 'Varování o extra bodech za prospěch u škol s dodatečnými kritérii' },
    ],
  },
  {
    version: '1.2.0',
    date: '29. 1. 2026',
    title: 'Vyhledávání a opravy bodového systému',
    changes: [
      { type: 'new', text: 'Vyhledávání škol na titulní stránce a stránce /skoly' },
      { type: 'new', text: 'Analýza kohort přijatých studentů' },
      { type: 'fix', text: 'Oprava zobrazení bodů JPZ - převod z procentuálních skórů na skutečné body' },
      { type: 'fix', text: 'Oprava zobrazení minimálních bodů JPZ - skutečná data z raw dat uchazečů' },
      { type: 'fix', text: 'Oprava tabulky regionů - Body min a Body průměr místo Skóre' },
      { type: 'fix', text: 'Oprava simulátoru - použití čistých JPZ bodů místo celkového skóre' },
      { type: 'improve', text: 'Oprava komponenty TestDifficulty pro přesnější zobrazení' },
    ],
  },
  {
    version: '1.1.0',
    date: '25. 1. 2026',
    title: 'Simulátor a rozšířené funkce',
    changes: [
      { type: 'new', text: 'Rozšíření simulátoru se srovnávacími kartami škol a drag & drop řazením' },
      { type: 'new', text: 'Open Graph obrázky pro sdílení na sociálních sítích' },
      { type: 'new', text: 'Rozšířené funkce detailu školy a přehledu regionů' },
      { type: 'fix', text: 'Oprava zobrazení souvisejících škol' },
    ],
  },
  {
    version: '1.0.0',
    date: '24. 1. 2026',
    title: 'První verze',
    changes: [
      { type: 'new', text: 'Simulátor přijímacích zkoušek s reálnými daty z CERMAT' },
      { type: 'new', text: 'Přehled škol podle regionů a krajů' },
      { type: 'new', text: 'Detail školy s bodovými statistikami a indexem poptávky' },
      { type: 'new', text: 'SEO optimalizace s dynamickými URL' },
      { type: 'new', text: 'Migrace na Next.js s App Router' },
    ],
  },
];

const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Nové', color: 'text-green-700', bg: 'bg-green-100' },
  fix: { label: 'Oprava', color: 'text-red-700', bg: 'bg-red-100' },
  improve: { label: 'Vylepšení', color: 'text-blue-700', bg: 'bg-blue-100' },
};

export default function ChangelogPage() {
  const currentVersion = changelog[0].version;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Changelog</h1>
            <p className="text-lg opacity-90">
              Historie změn a verzí aplikace
            </p>
            <div className="mt-4 inline-block bg-white/20 rounded-lg px-4 py-2 text-sm">
              Aktuální verze: <strong>{currentVersion}</strong>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {changelog.map((entry, idx) => (
              <div key={entry.version} className="relative">
                {/* Spojovací linka */}
                {idx < changelog.length - 1 && (
                  <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-slate-200 hidden sm:block" />
                )}

                <div className="flex gap-4">
                  {/* Verze badge */}
                  <div className="hidden sm:flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      idx === 0 ? 'bg-indigo-600' : 'bg-slate-400'
                    }`}>
                      {entry.version.split('.')[1]}
                    </div>
                  </div>

                  {/* Obsah */}
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className={`px-6 py-4 border-b ${idx === 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-xl font-bold ${idx === 0 ? 'text-indigo-600' : 'text-slate-700'}`}>
                          v{entry.version}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-medium">
                            Aktuální
                          </span>
                        )}
                        <span className="text-sm text-slate-500">{entry.date}</span>
                      </div>
                      <h2 className="font-semibold text-slate-900 mt-1">{entry.title}</h2>
                    </div>

                    <div className="px-6 py-4">
                      <ul className="space-y-2">
                        {entry.changes.map((change, changeIdx) => {
                          const t = typeLabels[change.type];
                          return (
                            <li key={changeIdx} className="flex items-start gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${t.bg} ${t.color}`}>
                                {t.label}
                              </span>
                              <span className="text-sm text-slate-700">{change.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Odkaz na GitHub */}
          <div className="mt-12 text-center">
            <a
              href="https://github.com/tangero/stredniskoly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Zdrojový kód na GitHubu
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
