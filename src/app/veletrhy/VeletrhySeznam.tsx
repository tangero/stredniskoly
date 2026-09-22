'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createKrajSlug } from '@/lib/utils';

export interface VeletrhKarta {
  id: string;
  /** Poslední den konání; podle něj klient odfiltruje proběhlé akce. */
  end: string;
  nazev: string;
  poradatel: string;
  mesto: string | null;
  online?: boolean;
  krajKod: string;
  krajNazev: string;
  misto: string;
  start: string;
  datum: string;
  cas?: string;
  url: string;
  terminPribligny?: boolean;
  zdrojJenAgregator?: boolean;
  poznamkaTerminu?: string;
}

interface Props {
  akce: VeletrhKarta[];
  kraje: { kod: string; nazev: string; pocet: number }[];
  mesta: string[];
  /** Den, se kterým stránku sestavil server. Drží první render shodný. */
  den: string;
}

/** Dnešek v českém kalendáři; UTC by mezi půlnocí a ránem lhalo o den. */
function cesskyDen(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Řazení je pevně podle data, ne podle priority ani abecedy. Sloupec
 * `priorita` ve zdrojovém xlsx je pořadník pro obesílání pořadatelů —
 * říká, koho oslovit dřív, ne která akce je pro rodinu lepší. Na web
 * nepatří a nesmí se splést s řazením.
 *
 * Proběhlé akce filtruje i klient, ne jen server: stránka se přestavuje
 * po hodinách, takže by akce po svém posledním dni chvíli visela dál.
 */
export function VeletrhySeznam({ akce, kraje, mesta, den }: Props) {
  const [kraj, setKraj] = useState('');
  const [mesto, setMesto] = useState('');

  // První render musí vyjít stejně na serveru i v prohlížeči, jinak React
  // hlásí nesoulad hydratace. Čas se proto čte až po připojení a pak
  // jednou za minutu, aby seznam otevřený přes půlnoc akci odfiltroval.
  const [dnes, setDnes] = useState(den);
  useEffect(() => {
    const srovnej = () => setDnes((predchozi) => {
      const ted = cesskyDen();
      return ted === predchozi ? predchozi : ted;
    });
    srovnej();
    const casovac = setInterval(srovnej, 60_000);
    return () => clearInterval(casovac);
  }, []);

  const probihajici = useMemo(() => akce.filter((a) => a.end >= dnes), [akce, dnes]);

  const vybrane = useMemo(() => {
    return probihajici.filter((a) => {
      if (kraj && a.krajKod !== kraj) return false;
      if (mesto && a.mesto !== mesto) return false;
      return true;
    });
  }, [probihajici, kraj, mesto]);

  // Počty u krajů se počítají z právě probíhajících akcí, ne ze serverového
  // seznamu — jinak by po půlnoci nabídka slibovala akci, která už zmizela.
  const krajeVNabidce = useMemo(() => {
    const pocty = new Map<string, number>();
    for (const a of probihajici) pocty.set(a.krajKod, (pocty.get(a.krajKod) ?? 0) + 1);
    return kraje
      .filter((k) => pocty.has(k.kod))
      .map((k) => ({ ...k, pocet: pocty.get(k.kod)! }));
  }, [kraje, probihajici]);

  // Města v nabídce se zužují podle vybraného kraje, aby filtr nenabízel
  // kombinaci, která nic nevrátí.
  const mestaVNabidce = useMemo(() => {
    const vKraji = new Set(probihajici.filter((a) => (!kraj || a.krajKod === kraj) && a.mesto).map((a) => a.mesto!));
    return mesta.filter((m) => vKraji.has(m));
  }, [probihajici, kraj, mesta]);

  function zmenKraj(novy: string) {
    setKraj(novy);
    if (novy && mesto) {
      const poradVKraji = probihajici.some((a) => a.krajKod === novy && a.mesto === mesto);
      if (!poradVKraji) setMesto('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1">
          <span className="block text-sm font-medium text-gray-700 mb-1">Kraj</span>
          <select
            value={kraj}
            onChange={(e) => zmenKraj(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Všechny kraje</option>
            {kraj && !krajeVNabidce.some((k) => k.kod === kraj) && (
              <option value={kraj}>{kraje.find((k) => k.kod === kraj)?.nazev ?? kraj} (bez aktuálních akcí)</option>
            )}
            {krajeVNabidce.map((k) => (
              <option key={k.kod} value={k.kod}>
                {k.nazev} ({k.pocet})
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="block text-sm font-medium text-gray-700 mb-1">Město</span>
          <select
            value={mesto}
            onChange={(e) => setMesto(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Všechna města</option>
            {mesto && !mestaVNabidce.includes(mesto) && (
              <option value={mesto}>{mesto} (bez aktuálních akcí)</option>
            )}
            {mestaVNabidce.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(kraj || mesto) && (
        <p className="text-sm text-gray-600">
          {vybrane.length === 0
            ? 'Tomuto výběru neodpovídá žádná akce, o které víme.'
            : `Akcí ve výběru: ${vybrane.length}`}{' '}
          <button
            onClick={() => {
              setKraj('');
              setMesto('');
            }}
            className="text-blue-600 hover:underline"
          >
            Zrušit filtr
          </button>
        </p>
      )}

      {vybrane.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700">
          <p className="font-medium text-gray-900">O žádné akci v tomto výběru nevíme.</p>
          <p className="mt-2 text-sm">
            Neznamená to, že se žádná nekoná — znamená to, že jsme ji nedohledali.{' '}
            <Link href="/veletrhy/nahlasit" className="text-blue-600 hover:underline">
              Víte o akci, která tu chybí?
            </Link>
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {vybrane.map((a) => (
            <li key={a.id} className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 hover:underline">
                    {a.nazev}
                  </a>
                </h3>
                <time dateTime={a.start} className="text-sm font-medium text-blue-700">
                  {a.terminPribligny ? 'přibližně ' : ''}
                  {a.datum}
                  {a.cas ? `, ${a.cas}` : ''}
                </time>
              </div>

              <p className="mt-1 text-sm text-gray-700">
                {a.online ? 'Online' : a.mesto}
                {a.misto && !a.online ? ` — ${a.misto}` : ''}
              </p>

              {(a.zdrojJenAgregator || a.terminPribligny) && (
                <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <strong>{a.zdrojJenAgregator ? 'Termín neověřený u pořadatele.' : 'Termín je přibližný.'}</strong>{' '}
                  {a.poznamkaTerminu} Před cestou si ho ověřte na stránce akce.
                </p>
              )}

              {/* Poznámka bez příznaku nejistoty nese podmínky vstupu (Plzeň:
                  všední dny jen pro školní výpravy s registrací). Dřív se
                  vykreslovala jen spolu s výstrahou, takže ji čtenář nevidel. */}
              {a.poznamkaTerminu && !a.zdrojJenAgregator && !a.terminPribligny && (
                <p className="mt-2 text-sm text-gray-700">{a.poznamkaTerminu}</p>
              )}

              <p className="mt-2 text-sm text-gray-600">
                Pořadatelem je {a.poradatel}, ne tento web.
              </p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Stránka akce
                </a>
                <Link
                  href={`/regiony/${createKrajSlug(a.krajKod, a.krajNazev)}`}
                  className="text-blue-600 hover:underline"
                >
                  Střední školy v kraji {a.krajNazev}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
