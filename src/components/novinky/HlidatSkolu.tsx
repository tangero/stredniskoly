'use client';

import { useId, useState } from 'react';
import { MATOMO_KATEGORIE_ODBERU } from '@/lib/novinky-zdroje';

// ============================================================================
// Tlačítko „Hlídat tuhle školu“ v hlavičce stránky školy (zadání #523, E6).
//
// Rozbalovací panel pod řadou akcí, ne modální okno. Jako formulář odběru:
// jedno pole na e-mail, souhlas (nikdy předem zaškrtnutý) a skryté pole proti
// robotům. Hlídání začne až po potvrzení odkazem z e-mailu. Komponentu
// vykresluje stránka školy jen při zapnutém hlídání (`jeHlidaniZapnuto`).
// ============================================================================

export const TEXT_SOUHLASU_HLIDANI = 'Hlídání zakládám pro sebe nebo své dítě a je mi alespoň 15 let.';
export const ZDROJ_HLIDANI_SKOLY = 'skola-hlidat';

type Stav = 'zavreno' | 'formular' | 'posilam' | 'poslano';

export function HlidatSkolu({ redizo, nazev }: { redizo: string; nazev: string }) {
  const [stav, setStav] = useState<Stav>('zavreno');
  const [email, setEmail] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const idPanelu = useId();
  const otevreno = stav !== 'zavreno';

  async function odesli(e: React.FormEvent) {
    e.preventDefault();
    setChyba(null);
    if (!souhlas) {
      setChyba('Bez souhlasu hlídání nezaložíme.');
      return;
    }
    setStav('posilam');
    try {
      const odpoved = await fetch('/api/novinky/hlidat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, skoly: [redizo], zdroj: ZDROJ_HLIDANI_SKOLY, souhlas: true, website: honeypot }),
      });
      if (!odpoved.ok) {
        const data = (await odpoved.json().catch(() => ({}))) as { error?: string };
        setChyba(data.error ?? 'Zkus to prosím za chvíli.');
        setStav('formular');
        return;
      }
      // Matomo: místo formuláře, bez adresy a bez školy.
      const paq = (window as unknown as { _paq?: unknown[][] })._paq;
      paq?.push(['trackEvent', MATOMO_KATEGORIE_ODBERU, 'formular_odeslan', ZDROJ_HLIDANI_SKOLY]);
      setStav('poslano');
    } catch {
      setChyba('Nepovedlo se odeslat. Zkontroluj připojení.');
      setStav('formular');
    }
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={otevreno}
        aria-controls={idPanelu}
        onClick={() => setStav(otevreno ? 'zavreno' : 'formular')}
        className="rounded-lg border border-[#0074e4] px-4 py-2.5 text-[15px] font-semibold text-[#0074e4] hover:bg-blue-50"
      >
        {stav === 'poslano' ? 'Potvrďte v e-mailu' : 'Hlídat tuhle školu'}
      </button>
      {otevreno && (
        <div id={idPanelu} data-clarity-mask="true" className="basis-full rounded-xl border border-slate-200 bg-white p-4 text-[15px] text-slate-700">
          {stav === 'poslano' ? (
            <div>
              <p className="font-semibold text-slate-900">Potvrď hlídání v e-mailu.</p>
              <p>Poslali jsme ti odkaz. Hlídání začne, až na něj klikneš; bez potvrzení ti nic nepřijde.</p>
            </div>
          ) : (
            <form onSubmit={odesli}>
              <p className="mb-3">
                Když se u školy {nazev} na webu něco změní (dny otevřených dveří, kritéria přijetí, nová
                data), pošleme ti jeden souhrnný e-mail denně. V den bez změny nepřijde nic. Hlídání
                zrušíš jedním kliknutím v každém e-mailu.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tvůj e-mail"
                  autoComplete="email"
                  aria-label="E-mail pro hlídání školy"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={stav === 'posilam'}
                  className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {stav === 'posilam' ? 'Posílám…' : 'Hlídat školu'}
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
        </div>
      )}
    </>
  );
}
