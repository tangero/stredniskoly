'use client';

import { useState } from 'react';
import { MATOMO_KATEGORIE_ODBERU } from '@/lib/novinky-zdroje';
import type { SkolaKHlidani } from '@/lib/simulator-hlidani';
import { TEXT_SOUHLASU_HLIDANI } from '@/components/novinky/HlidatSkolu';

// ============================================================================
// Výběr škol k hlídání v simulátoru (zadání #523, E6b).
//
// Simulátor blok ukáže jen ve zvažovaných oborech a jen po zadání výsledku
// cvičného testu (K15). Školy nejsou předem zaškrtnuté; „Hlídat všechny školy
// ze zvažovaných oborů“ je zaškrtne naráz. Jinak stejné jako tlačítko na stránce
// školy: jedno pole na e-mail, souhlas, skryté pole proti robotům a hlídání
// začne až po potvrzení odkazem z e-mailu.
// ============================================================================

export const ZDROJ_HLIDANI_SIMULATOR = 'simulator-hlidat';

type Stav = 'formular' | 'posilam' | 'poslano';

export function HlidatZvazovaneSkoly({ skoly }: { skoly: SkolaKHlidani[] }) {
  const [vybrane, setVybrane] = useState<string[]>([]);
  const [stav, setStav] = useState<Stav>('formular');
  const [email, setEmail] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);

  // Vybrané držíme jen mezi školami, které jsou ve zvažovaných teď.
  const platneVybrane = vybrane.filter(r => skoly.some(s => s.redizo === r));
  const vsechnyVybrane = skoly.length > 0 && platneVybrane.length === skoly.length;

  function prepni(redizo: string, zapnout: boolean) {
    setVybrane(zapnout ? [...platneVybrane, redizo] : platneVybrane.filter(r => r !== redizo));
  }

  async function odesli(e: React.FormEvent) {
    e.preventDefault();
    setChyba(null);
    if (!platneVybrane.length) {
      setChyba('Vyber prosím aspoň jednu školu.');
      return;
    }
    if (!souhlas) {
      setChyba('Bez souhlasu hlídání nezaložíme.');
      return;
    }
    setStav('posilam');
    try {
      const odpoved = await fetch('/api/novinky/hlidat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, skoly: platneVybrane, zdroj: ZDROJ_HLIDANI_SIMULATOR, souhlas: true, website: honeypot }),
      });
      if (!odpoved.ok) {
        const data = (await odpoved.json().catch(() => ({}))) as { error?: string };
        setChyba(data.error ?? 'Zkus to prosím za chvíli.');
        setStav('formular');
        return;
      }
      // Matomo: místo formuláře, bez adresy a bez škol.
      const paq = (window as unknown as { _paq?: unknown[][] })._paq;
      paq?.push(['trackEvent', MATOMO_KATEGORIE_ODBERU, 'formular_odeslan', ZDROJ_HLIDANI_SIMULATOR]);
      setStav('poslano');
    } catch {
      setChyba('Nepovedlo se odeslat. Zkontroluj připojení.');
      setStav('formular');
    }
  }

  return (
    <section aria-labelledby="hlidat-zvazovane" data-clarity-mask="true" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-[15px] text-slate-700 sm:p-5">
      <h2 id="hlidat-zvazovane" className="text-xl font-bold text-slate-900">Hlídat školy ze zvažovaných oborů</h2>
      {stav === 'poslano' ? (
        <div className="mt-2">
          <p className="font-semibold text-slate-900">Potvrď hlídání v e-mailu.</p>
          <p>Poslali jsme ti odkaz. Hlídání začne, až na něj klikneš; bez potvrzení ti nic nepřijde.</p>
        </div>
      ) : (
        <form onSubmit={odesli} className="mt-2">
          <p className="mb-3">
            Když se u vybraných škol na webu něco změní (dny otevřených dveří, kritéria přijetí, nová data),
            pošleme ti jeden souhrnný e-mail denně. V den bez změny nepřijde nic. Hlídání zrušíš jedním
            kliknutím v každém e-mailu.
          </p>
          <fieldset>
            <legend className="text-sm font-medium text-slate-900">Které školy hlídat</legend>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-700"
                checked={vsechnyVybrane}
                onChange={(e) => setVybrane(e.target.checked ? skoly.map(s => s.redizo) : [])}
              />
              Hlídat všechny školy ze zvažovaných oborů ({skoly.length})
            </label>
            <ul className="ml-6">
              {skoly.map(s => (
                <li key={s.redizo}>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-700"
                      checked={platneVybrane.includes(s.redizo)}
                      onChange={(e) => prepni(s.redizo, e.target.checked)}
                    />
                    {s.nazev}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tvůj e-mail"
              autoComplete="email"
              aria-label="E-mail pro hlídání škol"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={stav === 'posilam'}
              className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {stav === 'posilam' ? 'Posílám…' : 'Hlídat vybrané školy'}
            </button>
          </div>
          {/* Skryté pole proti robotům; člověk ho nevidí a nevyplní. */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} className="mt-0.5" />
            <span>{TEXT_SOUHLASU_HLIDANI}</span>
          </label>
          {chyba && <p className="mt-2 text-sm text-red-600">{chyba}</p>}
        </form>
      )}
    </section>
  );
}
