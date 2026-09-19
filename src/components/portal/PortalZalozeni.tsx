'use client';

import { useState } from 'react';
import type { PortalAuth } from '@/components/portal/PortalEditace';

// ============================================================================
// Založení správce profilu školy (docs/ucty-portalu-skol-2027.md, 2.2).
// První, kdo kód nebo odkaz použije, se stane správcem a může pozvat další.
// Souhlas se zveřejněním jména je dobrovolný a jde kdykoli odvolat.
// ============================================================================

interface PortalZalozeniProps {
  nazevSkoly: string;
  auth: PortalAuth;
  predvyplnenyEmail?: string;
}

const POLE = 'w-full rounded-lg border border-[#c9d4e1] px-4 py-3 focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200';

export const PortalZalozeni = ({ nazevSkoly, auth, predvyplnenyEmail = '' }: PortalZalozeniProps) => {
  const [jmeno, setJmeno] = useState('');
  const [funkce, setFunkce] = useState('');
  const [email, setEmail] = useState(predvyplnenyEmail);
  const [zverejnit, setZverejnit] = useState(false);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState('');

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    setOdesilam(true);
    setChyba('');
    try {
      const res = await fetch('/api/portal/uplatnit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...auth, jmeno, funkce, email, zverejnit_jmeno: zverejnit }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.presmerovat) {
        window.location.assign(data.presmerovat);
        return;
      }
      setChyba(data.error || 'Nepodařilo se založit účet. Zkuste to prosím znovu.');
    } catch {
      setChyba('Chyba připojení. Zkuste to prosím znovu.');
    }
    setOdesilam(false);
  };

  return (
    <form onSubmit={odeslat} className="space-y-4 rounded-xl border border-[#e3e9f1] bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Staňte se správcem profilu</h2>
        <p className="mt-1 text-sm text-slate-600">
          {nazevSkoly} zatím správce nemá. Kdo kód použije první, stane se správcem profilu a může
          pozvat kolegy. Kód tím přestane platit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Jméno a příjmení</span>
          <input className={POLE} required value={jmeno} onChange={(e) => setJmeno(e.target.value)} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Funkce ve škole</span>
          <input
            className={POLE}
            value={funkce}
            onChange={(e) => setFunkce(e.target.value)}
            placeholder="např. zástupkyně ředitele"
            autoComplete="organization-title"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Váš pracovní e-mail</span>
        <input
          className={POLE}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <span className="mt-1 block text-slate-500">
          Na tuto adresu budete dostávat odkazy pro přihlášení. Nejlépe adresu na doméně školy.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={zverejnit}
          onChange={(e) => setZverejnit(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Souhlasím, aby na stránce školy bylo uvedeno „Profil spravuje“ s mým jménem a funkcí.
          Souhlas můžu kdykoli odvolat v nastavení účtu. Bez souhlasu uvedeme jen „Profil spravuje
          škola“.
        </span>
      </label>

      <p className="text-xs text-slate-500">
        Jméno, funkci a e-mail zpracovává Patrick Zandl jako správce osobních údajů, aby vám mohl
        posílat přihlašovací odkazy a u každé změny profilu vést, kdo ji provedl. Uchováváme je po
        dobu trvání účtu a v historii změn profilu, dokud nepožádáte o výmaz. Údaje nepředáváme
        dalším stranám. Zrušení účtu nebo výmaz údajů vyřídíte na{' '}
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
        {odesilam ? 'Zakládám…' : 'Založit účet a pokračovat'}
      </button>
    </form>
  );
};
