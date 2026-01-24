import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-3">O projektu</h3>
            <p className="text-slate-400 text-sm">
              Simulátor přijímacích zkoušek využívá reálná data z CERMAT pro odhad
              šancí na přijetí na střední školy v ČR.
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
                <Link href="/regiony" className="text-slate-400 hover:text-white transition-colors">
                  Přehled regionů
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
