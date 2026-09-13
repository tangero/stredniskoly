'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PortalKodForm() {
  const router = useRouter();
  const [kod, setKod] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cisty = kod.trim();
    if (!cisty) return;
    router.push(`/pro-skoly/${encodeURIComponent(cisty)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <label htmlFor="portal-kod" className="sr-only">
        Přihlašovací kód
      </label>
      <input
        id="portal-kod"
        type="text"
        value={kod}
        onChange={(e) => setKod(e.target.value)}
        placeholder="XXXX-XXXX-XXXX"
        autoComplete="off"
        className="flex-1 rounded-lg border border-[#c9d4e1] px-4 py-3 text-lg tracking-widest uppercase focus:border-[#0074e4] focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="submit"
        disabled={!kod.trim()}
        className="rounded-lg bg-[#0074e4] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#005fbd] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Otevřít profil
      </button>
    </form>
  );
}
