'use client';

import { useState } from 'react';
import type { PortalPoleDef, PredvyplnenyProfil } from '@/lib/portal-skol';
import type { PortalAuth } from '@/components/portal/PortalEditace';

type StavOdesilani = 'formular' | 'odesilam' | 'odeslano' | 'chyba';

interface Props {
  auth: PortalAuth;
  profil: PredvyplnenyProfil;
  pole: PortalPoleDef[];
}

export function PortalEditForm({ auth, profil, pole }: Props) {
  const [hodnoty, setHodnoty] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { ubytovani: '' };
    for (const p of pole) init[p.key] = '';
    for (const [key, v] of Object.entries(profil.hodnoty)) init[key] = v.hodnota;
    return init;
  });
  const [udajeSedi, setUdajeSedi] = useState<boolean | null>(null);
  const [nesrovnalost, setNesrovnalost] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [stav, setStav] = useState<StavOdesilani>('formular');
  const [chyba, setChyba] = useState('');

  const setHodnota = (key: string, value: string) =>
    setHodnoty((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!souhlas) {
      setChyba('K odeslání je potřeba souhlas s vydáním obsahu pod licencí CC BY 4.0.');
      return;
    }
    setStav('odesilam');
    setChyba('');
    try {
      const res = await fetch('/api/portal-skoly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...auth,
          udaje: hodnoty,
          udaje_sedi: udajeSedi === true,
          nesrovnalost: udajeSedi === false ? nesrovnalost : '',
          souhlas_cc_by: souhlas,
          kontakt_email: email,
          website, // honeypot
        }),
      });
      if (res.ok) {
        setStav('odeslano');
      } else {
        const data = await res.json().catch(() => ({}));
        setChyba(data.error || 'Nepodařilo se odeslat změny. Zkuste to prosím znovu.');
        setStav('chyba');
      }
    } catch {
      setChyba('Chyba připojení. Zkuste to prosím znovu.');
      setStav('chyba');
    }
  };

  if (stav === 'odeslano') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Děkujeme!</h2>
        <p className="text-slate-600 max-w-md mx-auto">
          Vaše změny jsme přijali. Teď je zkontroluje redakce a po schválení se zobrazí na stránce
          školy se značkou „potvrzeno školou“. O výsledku vás můžeme informovat na zadaný e-mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Blok 1: údaje z datových zdrojů – jen ke kontrole */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Údaje z datových zdrojů</h2>
        <p className="text-sm text-slate-500 mb-4">
          Obory, kapacity a přihlášky pro rok 2026 přebíráme z oficiálních dat. Zkontrolujte je –
          měnit je tady nemůžete, ale můžete nahlásit nesrovnalost.
        </p>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4 font-medium">Obor / zaměření</th>
                <th className="py-2 pr-4 font-medium">Délka studia</th>
                <th className="py-2 pr-4 font-medium text-right">Kapacita 2026</th>
                <th className="py-2 font-medium text-right">Přihlášek 2026</th>
              </tr>
            </thead>
            <tbody>
              {profil.obory.map((o, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 pr-4 text-slate-900">{o.obor}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {o.delka_studia} {o.delka_studia === 1 ? 'rok' : o.delka_studia < 5 ? 'roky' : 'let'}
                  </td>
                  <td className="py-2 pr-4 text-slate-600 text-right">{o.kapacita}</td>
                  <td className="py-2 text-slate-600 text-right">{o.prihlasky}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { setUdajeSedi(true); setNesrovnalost(''); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
              udajeSedi === true
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-slate-300 text-slate-700 hover:border-green-500'
            }`}
          >
            ✓ Údaje sedí
          </button>
          <button
            type="button"
            onClick={() => setUdajeSedi(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
              udajeSedi === false
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-slate-300 text-slate-700 hover:border-amber-500'
            }`}
          >
            ⚠ Hlásím nesrovnalost
          </button>
        </div>

        {udajeSedi === false && (
          <div className="mt-4">
            <label htmlFor="nesrovnalost" className="block text-sm font-medium text-slate-700 mb-1">
              Co nesedí? Popište, prosím, co má být jinak.
            </label>
            <textarea
              id="nesrovnalost"
              value={nesrovnalost}
              onChange={(e) => setNesrovnalost(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="např. „Obor 78-42-M/01 už neotevíráme“ nebo „kapacita gymnázia je 60, ne 30“"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="text-xs text-slate-400 mt-1">
              Nesrovnalost předáme redakci – oficiální čísla nepřepisujeme na základě formuláře,
              ale ověříme je u zdroje.
            </p>
          </div>
        )}
      </section>

      {/* Blok 2: editovatelná pole */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Údaje, které znáte nejlíp</h2>
        <p className="text-sm text-slate-500 mb-6">
          Tohle uchazeči potřebují a nikde jinde to není. Vyplňte, co můžete – všechna pole jsou
          nepovinná.
        </p>

        <div className="space-y-5">
          {pole.map((p) => {
            const zdroj = profil.hodnoty[p.key]?.zdroj;
            return (
              <div key={p.key}>
                {/* Ubytování: přepínač ano/ne těsně před poznámkou k ubytování */}
                {p.key === 'ubytovani_poznamka' && (
                  <div className="mb-2">
                    <span className="block text-sm font-medium text-slate-700 mb-1">Ubytování</span>
                    <p className="text-xs text-slate-400 mb-1">
                      Můžou u vás bydlet žáci z jiných obcí (kolej, ubytovna)?
                    </p>
                    <div className="flex gap-2">
                      {(['ano', 'ne'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setHodnota('ubytovani', hodnoty.ubytovani === v ? '' : v)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                            hodnoty.ubytovani === v
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 text-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {v === 'ano' ? 'Ano' : 'Ne'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label htmlFor={`pole-${p.key}`} className="block text-sm font-medium text-slate-700 mb-1">
                  {p.label}
                  {zdroj === 'inspis' && (
                    <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {profil.inspisPoznamka}
                    </span>
                  )}
                </label>
                <p className="text-xs text-slate-400 mb-1">{p.napoveda}</p>
                {p.typ === 'textarea' ? (
                  <textarea
                    id={`pole-${p.key}`}
                    value={hodnoty[p.key] || ''}
                    onChange={(e) => setHodnota(p.key, e.target.value)}
                    rows={p.key === 'popis_skoly' ? 6 : 4}
                    maxLength={p.maxLength}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                ) : (
                  <input
                    id={`pole-${p.key}`}
                    type={p.typ === 'url' ? 'url' : 'text'}
                    value={hodnoty[p.key] || ''}
                    onChange={(e) => setHodnota(p.key, e.target.value)}
                    maxLength={p.maxLength}
                    placeholder={p.typ === 'url' ? 'https://…' : undefined}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Blok 3: souhlas a kontakt */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={souhlas}
              onChange={(e) => setSouhlas(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Souhlasím s vydáním zde uvedených údajů jako otevřených dat pod licencí{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.cs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                CC BY 4.0
              </a>
              . Bez souhlasu údaje nemůžeme publikovat.
            </span>
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="kontakt-email" className="block text-sm font-medium text-slate-700 mb-1">
            Váš pracovní e-mail
          </label>
          <p className="text-xs text-slate-400 mb-1">
            Slouží jen redakci pro případné dotazy k úpravám. Nikde ho nezveřejňujeme.
          </p>
          <input
            id="kontakt-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Honeypot – skryté pole pro boty */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        {chyba && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {chyba}
          </div>
        )}

        <button
          type="submit"
          disabled={stav === 'odesilam'}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {stav === 'odesilam' ? 'Odesílám…' : 'Odeslat ke kontrole'}
        </button>
        <p className="text-xs text-slate-400 mt-3 text-center">
          Změny se na webu nezobrazí hned – nejdřív je zkontroluje redakce.
        </p>
      </section>
    </form>
  );
}
