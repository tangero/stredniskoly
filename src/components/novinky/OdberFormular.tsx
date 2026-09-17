'use client';

import { useState } from 'react';

// ============================================================================
// Formulář odběru termínů e-mailem
// (docs/novinky-k-prijimackam-2027.md, oddíl 4).
//
// Souhlas se zaškrtává vždy v prvním kroku, na každém místě včetně patičky.
// Druh studia jde zaškrtnout oba (rodina se dvěma dětmi). Kraj je nepovinný
// a nic na něm nestojí. Konzervatoře se nenabízejí a formulář to říká.
// ============================================================================

export type Varianta = 'karta' | 'pas' | 'paticka' | 'stranka';

export interface OdberFormularProps {
  /** Ročník přijímacího řízení z registru stavu datových sad, ne z kódu. */
  rocnik: string;
  /** Místo formuláře; ukládá se k odběru, aby bylo vidět, co funguje. */
  zdroj: string;
  varianta: Varianta;
  kraje?: Array<{ kod: string; nazev: string }>;
}

type Stav = 'formular' | 'posilam' | 'poslano' | 'chyba';

const TEXT_SOUHLASU = 'Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.';

export function OdberFormular({ rocnik, zdroj, varianta, kraje = [] }: OdberFormularProps) {
  const [email, setEmail] = useState('');
  const [ss, setSs] = useState(true);
  const [vicelete, setVicelete] = useState(false);
  const [kraj, setKraj] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [jenKalendar, setJenKalendar] = useState(false);
  const [stav, setStav] = useState<Stav>('formular');
  const [chyba, setChyba] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const kratky = varianta === 'paticka';
  const naTmavem = varianta === 'karta' || varianta === 'pas';

  async function odesli(e: React.FormEvent) {
    e.preventDefault();
    setChyba(null);
    if (!souhlas) {
      setChyba('Bez souhlasu odběr nezaložíme.');
      return;
    }
    setStav('posilam');

    const druhy = [...(ss ? ['ss'] : []), ...(vicelete ? ['vicelete'] : [])];
    try {
      const odpoved = await fetch('/api/novinky/prihlasit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          druhy: jenKalendar ? [] : druhy,
          jenKalendar,
          rocnik,
          kraj: kraj || null,
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

  if (stav === 'poslano') {
    return (
      <div className={naTmavem ? 'rounded-lg bg-white/10 p-4 text-sm' : 'rounded-lg bg-slate-50 p-4 text-sm'}>
        <p className="font-semibold">Potvrď odběr v e-mailu.</p>
        <p className={naTmavem ? 'text-slate-200' : 'text-slate-600'}>
          Poslali jsme ti odkaz. Odběr začne, až na něj klikneš; bez potvrzení ti nic dalšího nepřijde.
        </p>
      </div>
    );
  }

  const stitek = naTmavem ? 'text-slate-200' : 'text-slate-600';
  const vstup = naTmavem
    ? 'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder:text-slate-300'
    : 'w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <form onSubmit={odesli} className="text-left">
      {!kratky && (
        <p className={`mb-3 text-sm ${stitek}`}>
          Pošleme ti s předstihem termíny přijímacího řízení {rocnik} a co je potřeba připravit:
          kritéria, přihlášky, jednotná zkouška, výsledky a 2. kolo.
        </p>
      )}

      {!kratky && !jenKalendar && (
        <fieldset className="mb-3">
          <legend className={`mb-1 text-sm ${stitek}`}>Hlásíš se na:</legend>
          <label className="mr-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ss} onChange={(e) => setSs(e.target.checked)} />
            střední školu po 9. třídě
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vicelete} onChange={(e) => setVicelete(e.target.checked)} />
            víceleté gymnázium
          </label>
          <p className={`mt-1 text-xs ${stitek}`}>
            Konzervatoře zatím neposíláme, protože je web nepokrývá; jejich termíny najdeš v kalendáři.
          </p>
        </fieldset>
      )}

      {!kratky && kraje.length > 0 && !jenKalendar && (
        <label className={`mb-3 block text-sm ${stitek}`}>
          Kraj (nepovinně)
          <select value={kraj} onChange={(e) => setKraj(e.target.value)} className={`mt-1 ${vstup}`}>
            <option value="">nevybráno</option>
            {kraje.map((k) => (
              <option key={k.kod} value={k.kod}>
                {k.nazev}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tvůj e-mail"
          autoComplete="email"
          className={vstup}
          aria-label="E-mail pro odběr termínů"
        />
        <button
          type="submit"
          disabled={stav === 'posilam'}
          className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {stav === 'posilam' ? 'Posílám…' : 'Posílat termíny'}
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

      {!kratky && (
        <p className={`mt-2 text-xs ${stitek}`}>
          Nejvýš pár e-mailů měsíčně, jen do konce přijímacího řízení {rocnik}. Odhlásit se jde jedním
          kliknutím v každém e-mailu.{' '}
          <a href="/ochrana-osobnich-udaju" className="underline">
            Zásady ochrany osobních údajů
          </a>
        </p>
      )}

      {!kratky && (
        <label className={`mt-3 flex items-start gap-2 text-xs ${stitek}`}>
          <input
            type="checkbox"
            checked={jenKalendar}
            onChange={(e) => setJenKalendar(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Přijímačky nás čekají až v dalších letech. Dejte mi vědět, až vyjde kalendář dalšího
            ročníku (jeden e-mail).
          </span>
        </label>
      )}

      {chyba && <p className="mt-2 text-xs font-semibold text-red-500">{chyba}</p>}
    </form>
  );
}
