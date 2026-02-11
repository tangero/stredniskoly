import Link from 'next/link';

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#f2f5f7' }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          {/* Sloupec 1 */}
          <div>
            <h3 className="font-semibold mb-3 text-sm" style={{ color: '#28313b' }}>O projektu</h3>
            <p className="text-sm mb-3" style={{ color: '#818c99' }}>
              Stránka využívá reálná data z CERMAT a ČŠI pro zobrazení dat a odhad
              šancí na přijetí na střední školy v ČR.
            </p>
            <p className="text-sm" style={{ color: '#818c99' }}>
              <strong style={{ color: '#28313b' }}>Autor:</strong> <a href="https://cs.wikipedia.org/wiki/Patrick_Zandl">Patrick Zandl</a> a <a href="https://www.hlidacstatu.cz">Hlídač státu</a>
            </p>
            <a href="mailto:patrick@zandl.cz" className="text-sm no-underline mt-1 inline-block" style={{ color: '#0074e4' }}>
              patrick@zandl.cz
            </a> | <a href='https://www.vibecoding.cz'>Vibecoding.cz</a>

            {/* Logo Hlídače státu */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #e0e6ed' }}>
              <a
                href="https://www.hlidacstatu.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-80"
                aria-label="Hlídač státu"
              >
                <img
                  src="https://www.hlidacstatu.cz/content/hlidacloga/Hlidac-statu-ctverec-norm.svg"
                  alt="Logo Hlídač státu"
                  width="48"
                  height="48"
                  className="rounded"
                />
              </a>
              <p className="text-xs mt-2" style={{ color: '#818c99' }}>
                Pro hlášení chyb použijte prosím tlačítko Hlásit chybu vpravo dole
              </p>
            </div>
          </div>

          {/* Sloupec 2 */}
          <div>
            <h3 className="font-semibold mb-3 text-sm" style={{ color: '#28313b' }}>Rychlé odkazy</h3>
            <ul className="space-y-2 text-sm list-none p-0">
              {[
                { href: '/simulator', label: 'Simulátor' },
                { href: '/skoly', label: 'Analýza škol' },
                { href: '/dostupnost', label: 'Školy dostupné MHD' },
                { href: '/regiony', label: 'Přehled regionů' },
                { href: '/jak-vybrat-skolu', label: 'Jak vybrat a uspět' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="no-underline transition-colors hover:opacity-80" style={{ color: '#0074e4' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sloupec 3 */}
          <div>
            <h3 className="font-semibold mb-3 text-sm" style={{ color: '#28313b' }}>Zdroje dat</h3>
            <ul className="space-y-2 text-sm list-none p-0">
              <li>
                <a href="https://prijimacky.cermat.cz/" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ color: '#0074e4' }}>
                  CERMAT - Přijímací zkoušky
                </a>
              </li>
              <li>
                <a href="https://data.cermat.cz/" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ color: '#0074e4' }}>
                  data.cermat.cz
                </a>
              </li>
            </ul>

            <h3 className="font-semibold mb-3 mt-6 text-sm" style={{ color: '#28313b' }}>Projekt</h3>
            <ul className="space-y-2 text-sm list-none p-0">
              <li>
                <Link href="/changelog" className="no-underline" style={{ color: '#0074e4' }}>
                  Changelog (v2.4.0)
                </Link>
              </li>
              <li>
                <a href="https://github.com/tangero/stredniskoly" target="_blank" rel="noopener noreferrer" className="no-underline inline-flex items-center gap-1.5" style={{ color: '#0074e4' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Zdrojový kód
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #e0e6ed' }}>
          <p className="text-xs" style={{ color: '#818c99' }}>
            Stránka slouží pouze k orientačním účelům. Skutečné výsledky záleží hlavně na výsledcích žáka. | Data z let 2024-2025 | &copy; {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#818c99' }}>Projekt</span>
            <a
              href="https://www.hlidacstatu.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline px-2 py-1 rounded"
              style={{ color: '#0074e4', border: '1px solid #0074e4' }}
            >
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L4 16H10V34H18V25H22V34H30V16H36L20 4Z" fill="#0074e4" />
              </svg>
              Hlídače státu
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
