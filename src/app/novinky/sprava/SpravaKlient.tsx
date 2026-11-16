'use client';

import { useEffect, useState } from 'react';

interface HlidanaSkola {
  redizo: string;
  nazev: string;
}

interface Prehled {
  email: string;
  odebira: boolean;
  potvrzeno: string | null;
  skoly: HlidanaSkola[];
}

type Akce = { akce: 'vse' } | { akce: 'terminy' } | { akce: 'hlidani' } | { akce: 'skola'; redizo: string };

const NADPIS = { color: '#28313b' } as const;
const TLACITKO =
  'rounded-lg border-2 border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60';

/** Přehled odběrů se čte z odkazu v e-mailu; token zůstává jen v adrese. */
export function SpravaKlient() {
  const [prehled, setPrehled] = useState<Prehled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [probiha, setProbiha] = useState(false);

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

  async function proved(akce: Akce) {
    setProbiha(true);
    try {
      const odpoved = await fetch('/api/novinky/sprava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(akce),
      });
      const data = (await odpoved.json().catch(() => ({}))) as {
        success?: boolean;
        zbyva?: { terminy: boolean; skoly: number } | null;
      };
      if (!odpoved.ok || !data.success) {
        setChyba('Zrušení se nepovedlo, zkus to prosím znovu.');
        return;
      }
      // Stránka si stav po zrušení odvodí z toho, co zbývá; nic se nepřihlašuje znovu.
      setPrehled((p) => {
        if (!p) return p;
        if (akce.akce === 'vse') return { ...p, odebira: false, skoly: [] };
        if (akce.akce === 'terminy') return { ...p, odebira: false };
        if (akce.akce === 'hlidani') return { ...p, skoly: [] };
        return { ...p, skoly: p.skoly.filter((s) => s.redizo !== akce.redizo) };
      });
    } finally {
      setProbiha(false);
    }
  }

  if (chyba) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={NADPIS}>
          Odkaz nefunguje
        </h1>
        <p className="text-slate-700">{chyba}</p>
      </div>
    );
  }

  if (!prehled) return <p className="text-slate-500">Načítám…</p>;

  const nicNezbylo = !prehled.odebira && prehled.skoly.length === 0;

  if (nicNezbylo) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3" style={NADPIS}>
          Odhlášeno
        </h1>
        <p className="text-slate-700">
          Nic už neodebíráš. <strong>Od nás ti už žádný e-mail nepřijde</strong>, ani potvrzení
          odhlášení. Adresu jsme smazali; doklad souhlasu si podle zásad ještě nějakou dobu držíme,
          ale už jen jako otisk bez adresy.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3" style={NADPIS}>
        Správa odběru
      </h1>
      <p className="text-slate-700 mb-6">
        Na adresu {prehled.email} od nás chodí tohle. Každou položku jde zrušit zvlášť.
      </p>

      <section className="mb-6" aria-labelledby="odber-terminy">
        <h2 id="odber-terminy" className="text-lg font-semibold mb-2" style={NADPIS}>
          Připomínky termínů
        </h2>
        {prehled.odebira ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-slate-700">E-mail před důležitými termíny přijímacího řízení.</p>
            <button type="button" disabled={probiha} onClick={() => proved({ akce: 'terminy' })} className={TLACITKO}>
              Zrušit připomínky termínů
            </button>
          </div>
        ) : (
          <p className="text-slate-600">Termíny neodebíráš.</p>
        )}
      </section>

      <section className="mb-6" aria-labelledby="odber-skoly">
        <h2 id="odber-skoly" className="text-lg font-semibold mb-2" style={NADPIS}>
          Hlídané školy
        </h2>
        {prehled.skoly.length > 0 ? (
          <>
            <p className="text-slate-700 mb-3">
              Pošleme nejvýš jeden e-mail denně, když se u některé z těchto škol něco změní.
            </p>
            <ul className="space-y-2 mb-3">
              {prehled.skoly.map((s) => (
                <li key={s.redizo} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-slate-800">{s.nazev}</span>
                  <button
                    type="button"
                    disabled={probiha}
                    onClick={() => proved({ akce: 'skola', redizo: s.redizo })}
                    className={TLACITKO}
                    aria-label={`Přestat hlídat: ${s.nazev}`}
                  >
                    Přestat hlídat
                  </button>
                </li>
              ))}
            </ul>
            {prehled.skoly.length > 1 && (
              <button type="button" disabled={probiha} onClick={() => proved({ akce: 'hlidani' })} className={TLACITKO}>
                Přestat hlídat všechny školy
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-600">Žádnou školu nehlídáš.</p>
        )}
      </section>

      <div className="border-t border-slate-200 pt-4">
        <button type="button" disabled={probiha} onClick={() => proved({ akce: 'vse' })} className={TLACITKO}>
          Odhlásit vše
        </button>
        <p className="mt-2 text-sm text-slate-600">
          Zruší všechno najednou. Potom ti od nás nepřijde žádný e-mail, ani potvrzení.
        </p>
      </div>
    </div>
  );
}
