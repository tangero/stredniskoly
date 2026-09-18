'use client';

import { useEffect, useState } from 'react';

interface Prehled {
  email: string;
  odebira: boolean;
  potvrzeno: string | null;
}

/** Přehled odběrů se čte z odkazu v e-mailu; token zůstává jen v adrese. */
export function SpravaKlient() {
  const [prehled, setPrehled] = useState<Prehled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [odhlaseno, setOdhlaseno] = useState(false);

  useEffect(() => {
    let zruseno = false;
    const nacti = async () => {
      if (new URLSearchParams(window.location.search).get('stav') === 'neplatny') {
        if (!zruseno) setChyba('Odkaz už neplatí. Otevři prosím odkaz z novějšího e-mailu.');
        return;
      }
      try {
        // Přehled se čte z krátké relace, kterou nastavila obslužná cesta;
        // token v adrese není, aby neskončil v analytice.
        const odpoved = await fetch('/api/novinky/sprava');
        const data = await odpoved.json().catch(() => ({}));
        if (!odpoved.ok) throw new Error((data as { error?: string }).error ?? 'Odkaz vypršel.');
        if (!zruseno) setPrehled(data as Prehled);
      } catch (e) {
        if (!zruseno) setChyba(e instanceof Error ? e.message : 'Odkaz vypršel.');
      }
    };
    void nacti();
    return () => {
      zruseno = true;
    };
  }, []);

  async function odhlasVse() {
    const odpoved = await fetch('/api/novinky/sprava', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'vse' }),
    });
    if (odpoved.ok) setOdhlaseno(true);
    else setChyba('Odhlášení se nepovedlo, zkus to prosím znovu.');
  }

  if (odhlaseno) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
          Odhlášeno
        </h1>
        <p className="text-slate-700">
          Zrušili jsme všechny tvé odběry a adresu smazali. Doklad souhlasu si podle zásad ještě
          nějakou dobu držíme, ale už jen jako otisk bez adresy.
        </p>
      </div>
    );
  }

  if (chyba) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
          Odkaz nefunguje
        </h1>
        <p className="text-slate-700">{chyba}</p>
      </div>
    );
  }

  if (!prehled) return <p className="text-slate-500">Načítám…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#28313b' }}>
        Správa odběru
      </h1>
      <p className="text-slate-700 mb-6">
        Adresa {prehled.email}{' '}
        {prehled.odebira ? 'odebírá novinky k přijímačkám.' : 'novinky teď neodebírá.'}
      </p>

      <button
        type="button"
        onClick={odhlasVse}
        className="rounded-lg border-2 border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
      >
        Odhlásit odběr
      </button>
    </div>
  );
}
