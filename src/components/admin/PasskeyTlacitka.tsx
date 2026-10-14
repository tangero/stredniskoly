'use client';

import { useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// Tlačítka passkey do administrace (#479): přihlášení a registrace nového zařízení.

async function post(url: string, telo: unknown): Promise<Record<string, unknown>> {
  const odp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(telo) });
  const data = (await odp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!odp.ok) throw new Error(typeof data.chyba === 'string' ? data.chyba : 'Něco se nepovedlo.');
  return data;
}

export function PrihlaseniPasskey() {
  const [stav, setStav] = useState<'klid' | 'probiha'>('klid');
  const [chyba, setChyba] = useState('');
  const prihlasit = async () => {
    setStav('probiha');
    setChyba('');
    try {
      const moznosti = await post('/admin/prihlaseni/passkey', { krok: 'moznosti' });
      const odpoved = await startAuthentication({ optionsJSON: moznosti as never });
      await post('/admin/prihlaseni/passkey', { krok: 'overit', odpoved });
      window.location.assign('/admin');
    } catch (e) {
      setChyba(e instanceof Error && e.name !== 'NotAllowedError' ? e.message : 'Přihlášení passkey bylo zrušeno.');
      setStav('klid');
    }
  };
  return (
    <div className="space-y-2">
      <button type="button" onClick={prihlasit} disabled={stav === 'probiha'} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white font-medium hover:bg-slate-700 disabled:opacity-60">
        {stav === 'probiha' ? 'Čekám na passkey…' : 'Přihlásit passkey'}
      </button>
      {chyba && <p role="alert" className="text-sm text-red-700">{chyba}</p>}
    </div>
  );
}

export function RegistracePasskey() {
  const [nazev, setNazev] = useState('');
  const [stav, setStav] = useState<'klid' | 'probiha'>('klid');
  const [zprava, setZprava] = useState('');
  const pridat = async () => {
    setStav('probiha');
    setZprava('');
    try {
      const moznosti = await post('/admin/zabezpeceni/passkey', { krok: 'moznosti' });
      const odpoved = await startRegistration({ optionsJSON: moznosti as never });
      await post('/admin/zabezpeceni/passkey', { krok: 'ulozit', odpoved, nazev });
      window.location.reload();
    } catch (e) {
      setZprava(e instanceof Error && e.name !== 'NotAllowedError' ? e.message : 'Přidání passkey bylo zrušeno.');
      setStav('klid');
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-sm text-slate-700" htmlFor="passkey-nazev">
        Název zařízení
        <input id="passkey-nazev" value={nazev} onChange={(e) => setNazev(e.target.value)} placeholder="Například iPhone" maxLength={60} className="mt-1 block rounded border border-slate-300 px-2 py-1" />
      </label>
      <button type="button" onClick={pridat} disabled={stav === 'probiha'} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60">
        {stav === 'probiha' ? 'Čekám na zařízení…' : 'Přidat passkey'}
      </button>
      {zprava && <p role="alert" className="w-full text-sm text-red-700">{zprava}</p>}
    </div>
  );
}

export function ZrusitPasskey({ id, nazev }: { id: string; nazev: string }) {
  const [potvrdit, setPotvrdit] = useState(false);
  const [chyba, setChyba] = useState('');
  if (!potvrdit) return <button type="button" onClick={() => setPotvrdit(true)} className="text-sm text-red-700 underline">Zrušit</button>;
  return (
    <span className="text-sm">
      Opravdu zrušit „{nazev}“?{' '}
      <button type="button" className="text-red-700 underline" onClick={async () => {
        try { await post('/admin/zabezpeceni/passkey', { krok: 'zrusit', id }); window.location.reload(); } catch (e) { setChyba(e instanceof Error ? e.message : 'Nepovedlo se.'); }
      }}>Ano, zrušit</button>{' '}
      <button type="button" className="underline" onClick={() => setPotvrdit(false)}>Ne</button>
      {chyba && <span role="alert" className="block text-red-700">{chyba}</span>}
    </span>
  );
}
