'use client';

import { useState } from 'react';
import { PortalZalozeni } from '@/components/portal/PortalZalozeni';
import type { IdentifikaceSkoly } from '@/lib/portal-identifikace';

// Kód se ověřuje přes POST /api/portal/kod, aby nezůstal v adrese stránky,
// historii prohlížeče ani v lozích.

type Vysledek =
  | { stav: 'volny'; nazev: string; kod: string; skola: IdentifikaceSkoly | null }
  | { stav: 'uplatnen' | 'skola_ma_spravce'; nazev: string }
  | { stav: 'neplatny' };

const HLASKY: Record<'uplatnen' | 'skola_ma_spravce', string> = {
  uplatnen:
    'Tento kód už byl použit a profil školy má správce. Pokud jste to vy, přihlaste se odkazem na svůj e-mail níže.',
  skola_ma_spravce:
    'Profil této školy už má správce. Požádejte ho o pozvánku, nebo se přihlaste odkazem na svůj e-mail níže.',
};

export const PortalKodForm = () => {
  const [kod, setKod] = useState('');
  const [overuji, setOveruji] = useState(false);
  const [vysledek, setVysledek] = useState<Vysledek | null>(null);
  const [chyba, setChyba] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cisty = kod.trim();
    if (!cisty) return;
    setOveruji(true);
    setChyba('');
    setVysledek(null);
    try {
      const res = await fetch('/api/portal/kod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kod: cisty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setChyba(data.error || 'Kód se nepodařilo ověřit. Zkuste to prosím znovu.');
      else if (data.stav === 'volny') setVysledek({ stav: 'volny', nazev: data.nazev, kod: cisty, skola: data.skola ?? null });
      else setVysledek(data);
    } catch {
      setChyba('Chyba připojení. Zkuste to prosím znovu.');
    }
    setOveruji(false);
  };

  if (vysledek?.stav === 'volny') {
    // Karta visí pod h2 „Upravit profil školy“ a h3 „Máme přihlašovací kód“.
    return <PortalZalozeni nazevSkoly={vysledek.nazev} skola={vysledek.skola} auth={{ kod: vysledek.kod }} uroven="h4" />;
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="portal-kod" className="sr-only">
          Přihlašovací kód
        </label>
        <input
          id="portal-kod"
          type="text"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          className="flex-1 rounded-lg border border-[#c9d4e1] px-4 py-3 text-lg tracking-widest uppercase focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={!kod.trim() || overuji}
          className="rounded-lg bg-[#0074e4] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#005fbd] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {overuji ? 'Ověřuji…' : 'Použít kód'}
        </button>
      </form>
      {vysledek?.stav === 'neplatny' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Tento kód neznáme, nebo byl zrušený. Zkontrolujte překlepy, kód má tvar XXXX-XXXX-XXXX.
        </div>
      )}
      {vysledek && (vysledek.stav === 'uplatnen' || vysledek.stav === 'skola_ma_spravce') && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {/* Bez názvu by zbyla holá dvojtečka; getNazevSkoly ho u školy mimo
              zobrazovaný ročník katalogu vrátí prázdný. */}
          {vysledek.nazev && <strong>{vysledek.nazev}: </strong>}
          {HLASKY[vysledek.stav]}
        </div>
      )}
      {chyba && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{chyba}</div>
      )}
    </div>
  );
};
