'use client';

import { useState } from 'react';

type Stav = 'formular' | 'odesilam' | 'odeslano' | 'chyba';

export function PortalMagicForm() {
  const [email, setEmail] = useState('');
  const [stav, setStav] = useState<Stav>('formular');
  const [chyba, setChyba] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cisty = email.trim();
    if (!cisty) return;
    setStav('odesilam');
    setChyba('');
    try {
      const res = await fetch('/api/portal-magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cisty }),
      });
      if (res.ok) {
        setStav('odeslano');
      } else {
        const data = await res.json().catch(() => ({}));
        setChyba(data.error || 'Nepodařilo se odeslat odkaz. Zkuste to prosím znovu.');
        setStav('chyba');
      }
    } catch {
      setChyba('Chyba připojení. Zkuste to prosím znovu.');
      setStav('chyba');
    }
  };

  if (stav === 'odeslano') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        Pokud adresu známe, poslali jsme na ni odkaz pro úpravu profilu školy. Odkaz platí 72 hodin.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="portal-email" className="sr-only">
          E-mail školy z rejstříku MŠMT
        </label>
        <input
          id="portal-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-mail školy z rejstříku MŠMT"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={stav === 'odesilam' || !email.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stav === 'odesilam' ? 'Odesílám…' : 'Poslat odkaz'}
        </button>
      </div>
      {chyba && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {chyba}
        </div>
      )}
    </form>
  );
}
