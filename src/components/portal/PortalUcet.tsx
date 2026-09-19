'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Nastavení účtu a týmu školy v /pro-skoly/profil (docs/ucty-portalu-skol-2027.md, 2.3).
// ============================================================================

export interface PortalClen {
  id: string;
  jmeno: string;
  funkce: string;
  email: string;
  role: 'spravce' | 'editor';
  od: string;
}

export interface PortalOtevrenaPozvanka {
  id: string;
  email: string;
  plati_do: string;
}

interface PortalUcetProps {
  redizo: string;
  ja: PortalClen & { zverejnit_jmeno: boolean };
  tym: PortalClen[];
  pozvanky: PortalOtevrenaPozvanka[];
}

const POLE = 'w-full rounded-lg border border-[#c9d4e1] px-3 py-2 focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200';
const TLACITKO = 'rounded-lg bg-[#0074e4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005fbd] disabled:opacity-50';
const ODKAZ = 'text-sm text-blue-700 hover:underline disabled:opacity-50';

const datum = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ');

export const PortalUcet = ({ redizo, ja, tym, pozvanky }: PortalUcetProps) => {
  const router = useRouter();
  const [jmeno, setJmeno] = useState(ja.jmeno);
  const [funkce, setFunkce] = useState(ja.funkce);
  const [zverejnit, setZverejnit] = useState(ja.zverejnit_jmeno);
  const [novyEmail, setNovyEmail] = useState('');
  const [pozvat, setPozvat] = useState('');
  const [pracuji, setPracuji] = useState(false);
  const [zprava, setZprava] = useState<{ ok: boolean; text: string } | null>(null);
  const jeSpravce = ja.role === 'spravce';

  /** Vrací true, když změna prošla. */
  const akce = async (data: Record<string, unknown>, uspech: string, potvrzeni?: string): Promise<boolean> => {
    if (potvrzeni && !window.confirm(potvrzeni)) return false;
    let povedlo = false;
    setPracuji(true);
    setZprava(null);
    try {
      const res = await fetch('/api/portal/ucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, redizo }),
      });
      const odpoved = await res.json().catch(() => ({}));
      if (!res.ok) {
        setZprava({ ok: false, text: odpoved.error || 'Změna se nepovedla. Zkuste to prosím znovu.' });
      } else if (odpoved.presmerovat) {
        window.location.assign(odpoved.presmerovat);
        return true;
      } else {
        setZprava({ ok: true, text: odpoved.zprava || uspech });
        router.refresh();
        povedlo = true;
      }
    } catch {
      setZprava({ ok: false, text: 'Chyba připojení. Zkuste to prosím znovu.' });
    }
    setPracuji(false);
    return povedlo;
  };

  return (
    <div className="space-y-8">
      {zprava && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${zprava.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {zprava.text}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Vaše údaje</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            akce({ akce: 'udaje', jmeno, funkce, zverejnit_jmeno: zverejnit }, 'Údaje jsme uložili.');
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Jméno a příjmení</span>
              <input className={POLE} required value={jmeno} onChange={(e) => setJmeno(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Funkce ve škole</span>
              <input className={POLE} value={funkce} onChange={(e) => setFunkce(e.target.value)} />
            </label>
          </div>
          {jeSpravce && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" checked={zverejnit} onChange={(e) => setZverejnit(e.target.checked)} />
              <span>
                Na stránce školy uvádět „Profil spravuje“ s mým jménem a funkcí. Bez souhlasu uvádíme
                „Profil spravuje škola“.
              </span>
            </label>
          )}
          <button type="submit" className={TLACITKO} disabled={pracuji}>
            Uložit
          </button>
        </form>

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            akce({ akce: 'email', email: novyEmail }, 'Poslali jsme odkaz pro potvrzení.');
          }}
        >
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-slate-700">
              Přihlašovací e-mail: <strong>{ja.email}</strong>. Nová adresa:
            </span>
            <input className={POLE} type="email" required value={novyEmail} onChange={(e) => setNovyEmail(e.target.value)} />
          </label>
          <button type="submit" className={TLACITKO} disabled={pracuji || !novyEmail.trim()}>
            Změnit e-mail
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Kdo profil upravuje</h2>
        <ul className="divide-y divide-[#e3e9f1] rounded-lg border border-[#e3e9f1] bg-white">
          {[ja, ...tym].map((c) => (
            <li key={c.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong>{c.jmeno}</strong>
                {c.funkce && <>, {c.funkce}</>} · {c.role === 'spravce' ? 'správce' : 'editor'}
                {c.id === ja.id && ' (vy)'}
                <span className="block text-slate-500">
                  {c.email} · od {datum(c.od)}
                </span>
              </span>
              {jeSpravce && c.id !== ja.id && (
                <span className="flex gap-4">
                  <button
                    className={ODKAZ}
                    disabled={pracuji}
                    onClick={() =>
                      akce(
                        { akce: 'predat', role_id: c.id },
                        'Správcem je teď kolega. Vy zůstáváte editorem.',
                        `Předat správcovství: ${c.jmeno}? Vy zůstanete editorem.`,
                      )
                    }
                  >
                    Předat správcovství
                  </button>
                  <button
                    className={ODKAZ}
                    disabled={pracuji}
                    onClick={() => akce({ akce: 'odebrat', role_id: c.id }, 'Kolegu jsme z profilu odebrali.', `Odebrat: ${c.jmeno}?`)}
                  >
                    Odebrat
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>

        {jeSpravce && pozvanky.length > 0 && (
          <ul className="space-y-1 text-sm text-slate-600">
            {pozvanky.map((p) => (
              <li key={p.id}>
                Pozvánka pro {p.email}, platí do {datum(p.plati_do)} ·{' '}
                <button className={ODKAZ} disabled={pracuji} onClick={() => akce({ akce: 'zrusit_pozvanku', pozvanka_id: p.id }, 'Pozvánku jsme zrušili.')}>
                  zrušit
                </button>
              </li>
            ))}
          </ul>
        )}

        {jeSpravce ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              akce({ akce: 'pozvat', email: pozvat }, 'Pozvánku jsme poslali.').then((ok) => ok && setPozvat(''));
            }}
          >
            <label className="block flex-1 text-sm">
              <span className="mb-1 block text-slate-700">Pozvat kolegu (e-mail)</span>
              <input className={POLE} type="email" required value={pozvat} onChange={(e) => setPozvat(e.target.value)} />
            </label>
            <button type="submit" className={TLACITKO} disabled={pracuji || !pozvat.trim()}>
              Poslat pozvánku
            </button>
          </form>
        ) : (
          <button
            className={ODKAZ}
            disabled={pracuji}
            onClick={() => akce({ akce: 'odejit' }, '', 'Opravdu chcete přestat upravovat profil této školy?')}
          >
            Přestat upravovat profil školy
          </button>
        )}
      </section>
    </div>
  );
};
