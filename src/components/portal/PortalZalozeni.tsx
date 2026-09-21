'use client';

import { useState } from 'react';
import type { PortalAuth } from '@/components/portal/PortalEditace';
import type { IdentifikaceSkoly } from '@/lib/portal-identifikace';
import { PortalHlavickaSkoly } from '@/components/portal/PortalHlavickaSkoly';

// ============================================================================
// Založení správce profilu školy (docs/ucty-portalu-skol-2027.md, 2.2).
// První, kdo kód nebo odkaz použije, se stane správcem a může pozvat další.
// Souhlas se zveřejněním jména je dobrovolný a jde kdykoli odvolat.
// ============================================================================

interface PortalZalozeniProps {
  nazevSkoly: string;
  /**
   * Jen kód nebo odkaz z e-mailu. Varianta `{ucet}` z `PortalAuth` sem nepatří:
   * kdo účet má, správce už nezakládá — a hlavička by mu psala o kódu, který
   * nedostal. Zúžení tu drží text hlavičky a skutečnost pohromadě.
   */
  auth: Extract<PortalAuth, { kod: string } | { magic: string }>;
  predvyplnenyEmail?: string;
  /**
   * Plný název, adresa a IČO z rejstříku. Bez nich by tu stál jen zkrácený
   * název z katalogu („Gymnázium“), podle kterého škola poznat nejde — a člověk
   * se chystá stát jejím správcem. Null, když se identifikace nepodařila načíst.
   */
  skola?: IdentifikaceSkoly | null;
  /**
   * Úroveň nadpisů. Na samostatné stránce /pro-skoly/<kód> je formulář hned pod
   * h1 hlavičky, takže h2. V kartě na /pro-skoly visí pod h2 „Upravit profil
   * školy“ a h3 „Máme přihlašovací kód“, takže h4.
   */
  uroven?: 'h2' | 'h3' | 'h4';
}

const POLE = 'w-full rounded-lg border border-[#c9d4e1] px-4 py-3 focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200';

export const PortalZalozeni = ({ nazevSkoly, auth, predvyplnenyEmail = '', skola = null, uroven = 'h2' }: PortalZalozeniProps) => {
  const Nadpis = uroven;
  // Kdo přišel odkazem z rejstříkového e-mailu, žádný kód nedostal. Mluvit na
  // něj o kódu ho pošle hledat něco, co neexistuje.
  const vstup = 'magic' in auth ? 'odkaz' : 'kód';
  const vstupVelky = vstup === 'odkaz' ? 'Odkaz' : 'Kód';
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
      {/* Chybí-li název, hlavička pořád nese REDIZO, adresu a větu pro případ cizí
          školy — zahodit ji celou kvůli prázdnému nadpisu by sebralo i je. */}
      {skola && <PortalHlavickaSkoly skola={skola} vstup={vstup} uroven={uroven} />}
      <div>
        <Nadpis className="text-lg font-semibold text-slate-900">Staňte se správcem profilu</Nadpis>
        <p className="mt-1 text-sm text-slate-600">
          {/* S hlavičkou nad sebou nemá smysl školu jmenovat podruhé, navíc jinak:
              hlavička nese plný název z rejstříku, tohle jen zkratku z katalogu. */}
          {(skola ? '' : nazevSkoly.trim()) || 'Tato škola'} zatím správce nemá. Kdo {vstup} použije první, stane se
          správcem profilu a může pozvat kolegy. {vstupVelky} tím přestane platit.
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
