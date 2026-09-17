'use client';

import { useEffect, useState } from 'react';

interface Prehled {
  email: string;
  odbery: Array<{ rocnik: string; druh_studia: string; kraj: string | null }>;
  cekaNaKalendar: Array<{ cilovy_rocnik: string; stav: string }>;
}

const NAZEV_DRUHU: Record<string, string> = {
  ss: 'střední škola po 9. třídě',
  vicelete: 'víceleté gymnázium',
};

/** Přehled odběrů se čte z odkazu v e-mailu; token zůstává jen v adrese. */
export function SpravaKlient() {
  const [prehled, setPrehled] = useState<Prehled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [odhlaseno, setOdhlaseno] = useState(false);

  useEffect(() => {
    let zruseno = false;
    const nacti = async () => {
      const token = new URLSearchParams(window.location.search).get('t');
      if (!token) {
        if (!zruseno) setChyba('Odkaz je neúplný. Otevři ho prosím přímo z e-mailu.');
        return;
      }
      try {
        const odpoved = await fetch(`/api/novinky/sprava?t=${encodeURIComponent(token)}`);
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
    const token = new URLSearchParams(window.location.search).get('t');
    if (!token) return;
    const odpoved = await fetch(`/api/novinky/sprava?t=${encodeURIComponent(token)}`, {
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
      <p className="text-slate-700 mb-6">Odběry adresy {prehled.email}:</p>

      {prehled.odbery.length > 0 ? (
        <ul className="mb-6 space-y-1 text-slate-700">
          {prehled.odbery.map((o) => (
            <li key={`${o.rocnik}-${o.druh_studia}`}>
              Termíny přijímacího řízení {o.rocnik}: {NAZEV_DRUHU[o.druh_studia] ?? o.druh_studia}
              {o.kraj ? ` · kraj ${o.kraj}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-6 text-slate-700">Žádný odběr termínů teď nemáš.</p>
      )}

      {prehled.cekaNaKalendar.length > 0 && (
        <ul className="mb-6 space-y-1 text-slate-700">
          {prehled.cekaNaKalendar.map((k) => (
            <li key={k.cilovy_rocnik}>
              Zpráva, až vyjde kalendář ročníku {k.cilovy_rocnik} (stav: {k.stav})
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={odhlasVse}
        className="rounded-lg border-2 border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
      >
        Odhlásit všechno
      </button>
    </div>
  );
}
