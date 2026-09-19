'use client';

import { useEffect, useState } from 'react';

interface NalezenaSkola {
  redizo: string;
  nazev: string;
  obec: string;
  spravuje: string | null;
}

/** Vyhledání školy a stav jejího profilu: kdo ho spravuje, nebo výzva k přihlášení. */
export const PortalHledaniSkoly = () => {
  const [dotaz, setDotaz] = useState('');
  const [skoly, setSkoly] = useState<NalezenaSkola[]>([]);
  const [hledam, setHledam] = useState(false);

  useEffect(() => {
    const cisty = dotaz.trim();
    if (cisty.length < 3) {
      setSkoly([]);
      return;
    }
    const zruseni = new AbortController();
    const casovac = setTimeout(async () => {
      setHledam(true);
      try {
        const res = await fetch(`/api/portal/skoly?q=${encodeURIComponent(cisty)}`, { signal: zruseni.signal });
        const data = await res.json();
        setSkoly(data.skoly ?? []);
      } catch {
        // Přerušené hledání nebo výpadek: seznam necháme, jak je.
      }
      setHledam(false);
    }, 250);
    return () => {
      clearTimeout(casovac);
      zruseni.abort();
    };
  }, [dotaz]);

  return (
    <div className="space-y-3">
      <label htmlFor="portal-hledani" className="sr-only">
        Název školy nebo obec
      </label>
      <input
        id="portal-hledani"
        type="search"
        value={dotaz}
        onChange={(e) => setDotaz(e.target.value)}
        placeholder="Název školy nebo obec"
        className="w-full rounded-lg border border-[#c9d4e1] px-4 py-3 focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {hledam && <p className="text-sm text-slate-500">Hledám…</p>}
      {skoly.length > 0 && (
        <ul className="divide-y divide-[#e3e9f1] rounded-lg border border-[#e3e9f1] bg-white">
          {skoly.map((s) => (
            <li key={s.redizo} className="px-4 py-3 text-sm">
              <span className="font-medium text-slate-900">{s.nazev}</span>
              <span className="text-slate-500"> · {s.obec}</span>
              <span className={`block ${s.spravuje ? 'text-green-700' : 'text-slate-600'}`}>
                {s.spravuje ?? (
                  <>
                    Škola se zatím nepřihlásila.{' '}
                    <a href="#vstup" className="text-blue-700 hover:underline">
                      Přihlaste se odkazem na e-mail z rejstříku
                    </a>
                    .
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!hledam && dotaz.trim().length >= 3 && skoly.length === 0 && (
        <p className="text-sm text-slate-500">Žádnou školu jsme nenašli.</p>
      )}
    </div>
  );
};
