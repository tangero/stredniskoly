'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cipKraje, vsechnyKraje } from '@/lib/kraje.mjs';

// Číselník krajů je jeden pro celý web; formulář ho neopisuje. Popisek je
// krátký název jako na čipu, ve stejném pořadí („Praha“ pod P).
const KRAJE = vsechnyKraje();

const vstup =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export function NahlasitForm() {
  const [stav, setStav] = useState<'formular' | 'odesila' | 'hotovo'>('formular');
  const [chyba, setChyba] = useState('');

  async function odesli(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChyba('');
    setStav('odesila');

    const f = new FormData(e.currentTarget);
    const telo = Object.fromEntries(f.entries());

    try {
      const odpoved = await fetch('/api/veletrhy/nahlasit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telo),
      });
      const data = await odpoved.json();
      if (!odpoved.ok) {
        setChyba(data.error || 'Nahlášení se nepodařilo odeslat.');
        setStav('formular');
        return;
      }
      setStav('hotovo');
    } catch {
      setChyba('Nahlášení se nepodařilo odeslat. Zkuste to prosím znovu.');
      setStav('formular');
    }
  }

  if (stav === 'hotovo') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Děkujeme, nahlášení máme.</h2>
        <p className="mt-2 text-gray-700">
          Akci ověříme na stránce pořadatele a teprve potom ji zveřejníme. Když bude něco nejasného, ozveme se
          na adresu, kterou jste zadali.
        </p>
        <p className="mt-4">
          <Link href="/veletrhy" className="text-blue-600 hover:underline">
            Zpět na přehled akcí
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={odesli} className="space-y-5">
      {/* Honeypot: člověk pole nevidí, robot ho vyplní. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] w-px h-px opacity-0"
      />

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Název akce *</span>
        <input name="nazev" required maxLength={200} className={vstup} placeholder="Přehlídka středních škol …" />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Datum konání *</span>
          <input type="date" name="start" required className={vstup} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Konec, je-li vícedenní</span>
          <input type="date" name="end" className={vstup} />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Adresa konání *</span>
        <input name="adresa" required maxLength={200} className={vstup} placeholder="Kongresové centrum, Ulice 1" />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Město *</span>
          <input name="mesto" required maxLength={100} className={vstup} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Kraj *</span>
          <select name="krajKod" required defaultValue="" className={vstup}>
            <option value="" disabled>
              Vyberte kraj
            </option>
            {KRAJE.map((k) => (
              <option key={k.kod} value={k.kod}>
                {cipKraje(k.kod)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Odkaz na stránku akce *</span>
        <input type="url" name="url" required className={vstup} placeholder="https://" />
        <span className="mt-1 block text-sm text-gray-600">Bez odkazu nemůžeme termín ověřit.</span>
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Kdo akci pořádá *</span>
        <input name="poradatel" required maxLength={200} className={vstup} placeholder="Název organizace" />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Popis akce</span>
        <textarea name="popis" rows={4} maxLength={2000} className={vstup} />
        <span className="mt-1 block text-sm text-gray-600">
          Nepovinné. Slouží nám při ověřování; v přehledu se nezobrazuje doslova, aby byly všechny akce
          porovnatelné.
        </span>
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Váš e-mail *</span>
        <input type="email" name="email" required className={vstup} />
        <span className="mt-1 block text-sm text-gray-600">
          Na webu se nezobrazí. Potřebujeme ho, kdybychom se potřebovali na něco zeptat.
        </span>
      </label>

      {chyba && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{chyba}</p>
      )}

      <button
        type="submit"
        disabled={stav === 'odesila'}
        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {stav === 'odesila' ? 'Odesílám…' : 'Nahlásit akci'}
      </button>
    </form>
  );
}
