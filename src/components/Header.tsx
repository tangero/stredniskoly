import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold hover:opacity-90 transition-opacity">
            Přijímačky na SŠ
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/simulator" className="hover:underline underline-offset-4">
              Simulátor
            </Link>
            <Link href="/skoly" className="hover:underline underline-offset-4">
              Analýza škol
            </Link>
            <Link href="/regiony" className="hover:underline underline-offset-4">
              Regiony
            </Link>
            <Link href="/jak-funguje-prijimani" className="hover:underline underline-offset-4">
              Jak to funguje?
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
