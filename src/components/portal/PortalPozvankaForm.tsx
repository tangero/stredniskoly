'use client';

import { useState } from 'react';

interface PortalPozvankaFormProps {
  token: string;
  email: string;
}

const POLE = 'w-full rounded-lg border border-[#c9d4e1] px-4 py-3 focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200';

export const PortalPozvankaForm = ({ token, email }: PortalPozvankaFormProps) => {
  const [jmeno, setJmeno] = useState('');
  const [funkce, setFunkce] = useState('');
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState('');

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    setOdesilam(true);
    setChyba('');
    try {
      const res = await fetch('/api/portal/pozvanka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, jmeno, funkce }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.presmerovat) {
        window.location.assign(data.presmerovat);
        return;
      }
      setChyba(data.error || 'Pozvánku se nepodařilo přijmout. Zkuste to prosím znovu.');
    } catch {
      setChyba('Chyba připojení. Zkuste to prosím znovu.');
    }
    setOdesilam(false);
  };

  return (
    <form onSubmit={odeslat} className="space-y-4 rounded-xl border border-[#e3e9f1] bg-white p-5 text-left">
      <p className="text-sm text-slate-600">
        Přihlašovat se budete adresou <strong>{email}</strong>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Jméno a příjmení</span>
          <input className={POLE} required value={jmeno} onChange={(e) => setJmeno(e.target.value)} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Funkce ve škole</span>
          <input className={POLE} value={funkce} onChange={(e) => setFunkce(e.target.value)} autoComplete="organization-title" />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Jméno, funkci a e-mail zpracovává Patrick Zandl jako správce osobních údajů, aby u každé změny
        profilu vedl, kdo ji provedl. Veřejně je neuvádíme. Výmaz vyřídíte na{' '}
        <a href="mailto:patrick@zandl.cz" className="underline">
          patrick@zandl.cz
        </a>
        .
      </p>
      {chyba && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{chyba}</div>
      )}
      <button
        type="submit"
        disabled={odesilam}
        className="rounded-lg bg-[#0074e4] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#005fbd] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {odesilam ? 'Přijímám…' : 'Přijmout pozvánku'}
      </button>
    </form>
  );
};
