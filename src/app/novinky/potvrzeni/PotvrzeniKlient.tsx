'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Potvrzení odběru je aktivní krok člověka: odkaz z e-mailu jen otevřel tuhle
 * stránku, odběr vzniká až odesláním formuláře (POST). Robot poštovního systému
 * tedy odběr nezaloží.
 */
export function PotvrzeniKlient() {
  const [stav, setStav] = useState<'formular' | 'posilam' | 'hotovo' | 'chyba'>('formular');
  const [chyba, setChyba] = useState<string | null>(null);
  const [rocnik, setRocnik] = useState<string | null>(null);

  async function potvrd() {
    setStav('posilam');
    setChyba(null);
    try {
      const odpoved = await fetch('/api/novinky/potvrdit', { method: 'POST' });
      const data = (await odpoved.json().catch(() => ({}))) as { error?: string; rocnik?: string };
      if (!odpoved.ok) {
        setChyba(data.error ?? 'Potvrzení se nepovedlo.');
        setStav('chyba');
        return;
      }
      setRocnik(data.rocnik ?? null);
      setStav('hotovo');
      try {
        localStorage.setItem('novinky-odber', 'potvrzeno');
      } catch {
        // Bez úložiště se jen nezapamatuje stav.
      }
      const paq = (window as unknown as { _paq?: unknown[][] })._paq;
      paq?.push(['trackEvent', 'Novinky', 'odber_potvrzen']);
    } catch {
      setChyba('Nepovedlo se odeslat. Zkontroluj připojení.');
      setStav('chyba');
    }
  }

  if (stav === 'hotovo') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
          Odběr je potvrzený
        </h1>
        <p className="text-slate-700">
          {rocnik
            ? `Termíny přijímacího řízení ${rocnik} ti pošleme s předstihem. Uvítací e-mail s přehledem už je na cestě.`
            : 'Uvítací e-mail s přehledem termínů už je na cestě.'}
        </p>
        <p className="mt-4">
          <Link href="/prijimacky-2027" className="text-blue-700 underline">
            Prohlédnout kalendář přijímaček
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
        Potvrď odběr termínů
      </h1>
      <p className="text-slate-700 mb-6">
        Kliknutím dole odběr začne. Do té doby jsme nic nezaložili: držíme jen tvou žádost, která
        sama propadne do 72 hodin.
      </p>
      <button
        type="button"
        onClick={potvrd}
        disabled={stav === 'posilam'}
        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
      >
        {stav === 'posilam' ? 'Potvrzuji…' : 'Potvrdit odběr'}
      </button>
      {chyba && (
        <p className="mt-4 text-sm text-red-600">
          {chyba} Zkus se prosím přihlásit znovu na{' '}
          <Link href="/novinky" className="underline">
            stránce odběru
          </Link>
          .
        </p>
      )}
    </div>
  );
}
