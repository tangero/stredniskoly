'use client';

import { useState } from 'react';
import Link from 'next/link';

/** Odhlášení potvrzuje člověk kliknutím; GET sám nic nemění. */
export function OdhlaseniKlient() {
  const [stav, setStav] = useState<'formular' | 'posilam' | 'hotovo' | 'chyba'>('formular');
  const [co, setCo] = useState<'terminy' | 'hlidani' | null>(null);

  async function odhlas() {
    setStav('posilam');
    // Token už v adrese není: obslužná cesta ho vyměnila za krátkou relaci.
    const odpoved = await fetch('/api/novinky/odhlasit', { method: 'POST' });
    if (odpoved.ok) {
      const data = (await odpoved.json().catch(() => ({}))) as { co?: 'terminy' | 'hlidani' | null };
      setCo(data.co ?? null);
    }
    setStav(odpoved.ok ? 'hotovo' : 'chyba');
  }

  if (stav === 'hotovo') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
          Odhlášeno
        </h1>
        <p className="text-slate-700">
          {co === 'hlidani'
            ? 'Hlídání škol jsme zrušili, souhrny o školách už ti posílat nebudeme.'
            : 'Připomínky termínů už ti posílat nebudeme.'}{' '}
          Kdyby ti ještě dorazil e-mail, který byl v tu chvíli na cestě, další už nepřijde. Ostatní
          odběry zůstávají, upravit je jde ve{' '}
          <Link href="/novinky/sprava" className="underline text-blue-700">
            správě odběru
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
        Odhlásit e-maily z tohoto odběru?
      </h1>
      <p className="text-slate-700 mb-6">
        Zrušíme jen ten odběr, ze kterého e-mail přišel: připomínky termínů, nebo hlídání škol.
        Druhý odběr zůstane; všechno najednou jde odhlásit ve{' '}
        <Link href="/novinky/sprava" className="underline text-blue-700">
          správě odběru
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={odhlas}
        disabled={stav === 'posilam'}
        className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
      >
        {stav === 'posilam' ? 'Odhlašuji…' : 'Odhlásit'}
      </button>
      {stav === 'chyba' && (
        <p className="mt-4 text-sm text-red-600">
          Odkaz nefunguje. Otevři ho prosím přímo z e-mailu.
        </p>
      )}
    </div>
  );
}
