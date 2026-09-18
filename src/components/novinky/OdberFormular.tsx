'use client';

import { useState } from 'react';

// ============================================================================
// Formulář odběru novinek (docs/novinky-k-prijimackam-2027.md, oddíl 4).
//
// Odběr je **jeden newsletter**: e-mail a souhlas, nic víc. Žádný ročník,
// žádný druh studia, žádný kraj — každé pole navíc sníží podíl vyplněných
// formulářů a odběr běží, dokud se člověk neodhlásí.
//
// Souhlas se zaškrtává vždy v prvním kroku, na každém místě formuláře.
// ============================================================================

export type Varianta = 'karta' | 'stranka';

export interface OdberFormularProps {
  /** Ročník přijímacího řízení z registru; jen do textu, ne do odběru. */
  rocnik: string;
  /** Místo formuláře; ukládá se k odběru, aby bylo vidět, co funguje. */
  zdroj: string;
  varianta: Varianta;
}

type Stav = 'formular' | 'posilam' | 'poslano' | 'chyba';

const TEXT_SOUHLASU = 'Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.';

export function OdberFormular({ rocnik, zdroj, varianta }: OdberFormularProps) {
  const [email, setEmail] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [stav, setStav] = useState<Stav>('formular');
  const [chyba, setChyba] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const naTmavem = varianta === 'karta';

  async function odesli(e: React.FormEvent) {
    e.preventDefault();
    setChyba(null);
    if (!souhlas) {
      setChyba('Bez souhlasu odběr nezaložíme.');
      return;
    }
    setStav('posilam');

    try {
      const odpoved = await fetch('/api/novinky/prihlasit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          zdroj,
          souhlas: true,
          souhlasText: TEXT_SOUHLASU,
          website: honeypot,
        }),
      });
      if (!odpoved.ok) {
        const data = (await odpoved.json().catch(() => ({}))) as { error?: string };
        setChyba(data.error ?? 'Zkus to prosím za chvíli.');
        setStav('chyba');
        return;
      }
      // Matomo: cíl „formulář odeslán“ s dimenzí místa; adresa se neposílá.
      if (typeof window !== 'undefined') {
        const paq = (window as unknown as { _paq?: unknown[][] })._paq;
        paq?.push(['trackEvent', 'Novinky', 'formular_odeslan', zdroj]);
      }
      setStav('poslano');
      try {
        localStorage.setItem('novinky-odber', 'ceka-potvrzeni');
      } catch {
        // Bez úložiště v prohlížeči se jen nezapamatuje stav.
      }
    } catch {
      setChyba('Nepovedlo se odeslat. Zkontroluj připojení.');
      setStav('chyba');
    }
  }

  const stitek = naTmavem ? 'text-slate-200' : 'text-slate-600';
  const vstup = naTmavem
    ? 'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder:text-slate-300'
    : 'w-full rounded-lg border border-slate-300 px-3 py-2';

  if (stav === 'poslano') {
    return (
      <div className={naTmavem ? 'rounded-lg bg-white/10 p-4 text-sm' : 'rounded-lg bg-slate-50 p-4 text-sm'}>
        <p className="font-semibold">Potvrď odběr v e-mailu.</p>
        <p className={stitek}>
          Poslali jsme ti odkaz. Odběr začne, až na něj klikneš; bez potvrzení ti nic dalšího
          nepřijde.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={odesli} className="text-left">
      <p className={`mb-3 text-sm ${stitek}`}>
        Pošleme ti s předstihem termíny přijímacího řízení {rocnik} a napíšeme, co je potřeba
        připravit: kritéria, přihlášky, jednotná zkouška, výsledky a 2. kolo. K tomu zprávu, když na
        web přibudou nová data.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tvůj e-mail"
          autoComplete="email"
          className={vstup}
          aria-label="E-mail pro odběr novinek"
        />
        <button
          type="submit"
          disabled={stav === 'posilam'}
          className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {stav === 'posilam' ? 'Posílám…' : 'Odebírat novinky'}
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

      <label className={`mt-3 flex items-start gap-2 text-xs ${stitek}`}>
        <input
          type="checkbox"
          checked={souhlas}
          onChange={(e) => setSouhlas(e.target.checked)}
          className="mt-0.5"
        />
        <span>{TEXT_SOUHLASU}</span>
      </label>

      <p className={`mt-2 text-xs ${stitek}`}>
        Nejvýš pár e-mailů měsíčně. Odhlásit se jde jedním kliknutím v každém e-mailu.{' '}
        <a href="/ochrana-osobnich-udaju" className="underline">
          Zásady ochrany osobních údajů
        </a>
      </p>

      {chyba && <p className="mt-2 text-xs font-semibold text-red-500">{chyba}</p>}
    </form>
  );
}
