import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-3">O projektu</h3>
            <p className="text-slate-400 text-sm mb-3">
              Simulátor přijímacích zkoušek využívá reálná data z CERMAT pro odhad
              šancí na přijetí na střední školy v ČR.
            </p>
            <p className="text-slate-400 text-sm">
              <strong className="text-slate-300">Autor:</strong> Patrick Zandl
              <br />
              <span className="text-xs">Jde o experiment, data nemusí být přesná.</span>
              <br />
              <a href="mailto:patrick@zandl.cz" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                patrick@zandl.cz
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Rychlé odkazy</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/simulator" className="text-slate-400 hover:text-white transition-colors">
                  Simulátor
                </Link>
              </li>
              <li>
                <Link href="/skoly" className="text-slate-400 hover:text-white transition-colors">
                  Analýza škol
                </Link>
              </li>
              <li>
                <Link href="/praha-dostupnost" className="text-slate-400 hover:text-white transition-colors">
                  Školy dostupné MHD
                </Link>
              </li>
              <li>
                <Link href="/regiony" className="text-slate-400 hover:text-white transition-colors">
                  Přehled regionů
                </Link>
              </li>
              <li>
                <Link href="/jak-vybrat-skolu" className="text-slate-400 hover:text-white transition-colors">
                  Jak vybrat a uspět
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Zdroje dat</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://prijimacky.cermat.cz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  CERMAT - Přijímací zkoušky
                </a>
              </li>
              <li>
                <a
                  href="https://data.cermat.cz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  data.cermat.cz
                </a>
              </li>
            </ul>

            <h3 className="font-semibold mb-3 mt-6">Projekt</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/changelog" className="text-slate-400 hover:text-white transition-colors">
                  Changelog (v1.5.1)
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/tangero/stredniskoly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Zdrojový kód
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 pt-6 text-center text-slate-400 text-sm">
          <p>
            Simulátor slouží pouze k orientačním účelům. Skutečné výsledky se mohou lišit.
          </p>
          <p className="mt-2">
            Data z let 2024-2025 | © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
