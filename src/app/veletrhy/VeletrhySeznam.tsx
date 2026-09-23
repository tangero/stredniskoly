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

const MESICE = ['led', 'úno', 'bře', 'dub', 'kvě', 'čer', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

/** „1 akce“, „3 akce“, „5 akcí“. */
export function akci(n: number): string {
  if (n === 1) return '1 akce';
  if (n >= 2 && n <= 4) return `${n} akce`;
  return `${n} akcí`;
}

/** „Středočeský kraj“, ale „Hlavní město Praha“ beze změny. */
export function nadpisKraje(nazev: string): string {
  return nazev.includes('Praha') ? nazev : `${nazev} kraj`;
}

/**
 * Osou stránky je kraj, ne datum. Rodina se ptá „co je blízko nás“, a až
 * potom „kdy“: čtrnáct krajů s jednou až sedmi akcemi se přehlédne rychleji
 * než jeden chronologický seznam, ve kterém je město až na druhém řádku.
 * Uvnitř kraje se řadí podle data — stejně jako dřív celý seznam.
 *
 * Řazení podle priority nepřipadá v úvahu: sloupec `priorita` ve zdrojovém
 * xlsx je pořadník pro obesílání pořadatelů, ne pořadí užitku pro rodinu.
 *
 * Proběhlé akce filtruje i klient, ne jen server: stránka se přestavuje
 * po hodinách, takže by akce po svém posledním dni chvíli visela dál.
 */
export function VeletrhySeznam({ akce, kraje, den }: Props) {
  const [kraj, setKraj] = useState('');

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

  // Odkaz s kotvou (#jihocesky ze stránky kraje) předvybere kraj. Čte se
  // až po připojení, na serveru kotva není.
  useEffect(() => {
    const predvyber = () => {
      const kotva = window.location.hash.replace(/^#/, '');
      if (!kotva) return;
      const shoda = kraje.find((k) => createKrajSlug(k.kod, k.nazev) === kotva);
      if (shoda) setKraj(shoda.kod);
    };
    predvyber();
  }, [kraje]);

  const probihajici = useMemo(() => akce.filter((a) => a.end >= dnes), [akce, dnes]);

  // Počty u krajů se počítají z právě probíhajících akcí, ne ze serverového
  // seznamu — jinak by po půlnoci čip sliboval akci, která už zmizela.
  const oddily = useMemo(() => {
    const podleKraje = new Map<string, VeletrhKarta[]>();
    for (const a of probihajici) {
      const seznam = podleKraje.get(a.krajKod) ?? [];
      seznam.push(a);
      podleKraje.set(a.krajKod, seznam);
    }
    return kraje
      .filter((k) => podleKraje.has(k.kod))
      .map((k) => {
        const seznam = podleKraje.get(k.kod)!;
        // Města v pořadí, v jakém se v kraji konají — čtenář je pak
        // potká v kartách pod řádkem ve stejném sledu.
        const mesta = [...new Set(seznam.map((a) => (a.online ? 'online' : a.mesto)).filter(Boolean))] as string[];
        return { ...k, pocet: seznam.length, akce: seznam, mesta, slug: createKrajSlug(k.kod, k.nazev) };
      });
  }, [kraje, probihajici]);

  const vybrane = kraj ? oddily.filter((o) => o.kod === kraj) : oddily;
  const vybranyBezAkci = kraj !== '' && !oddily.some((o) => o.kod === kraj);
  const nazevVybraneho = kraje.find((k) => k.kod === kraj)?.nazev ?? kraj;

  const cip = (aktivni: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      aktivni
        ? 'border-blue-700 bg-blue-700 text-white'
        : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:text-blue-700'
    }`;
  const pocitadlo = (aktivni: boolean) =>
    `rounded-full px-1.5 text-xs font-semibold ${aktivni ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`;

  return (
    <div className="space-y-8">
      <nav aria-label="Kraje s akcemi">
        <p className="text-sm font-medium text-gray-700 mb-2">Kde se veletrh koná</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={kraj === ''}
            onClick={() => setKraj('')}
            className={cip(kraj === '')}
          >
            Všechny kraje
            <span className={pocitadlo(kraj === '')}>{probihajici.length}</span>
          </button>
          {vybranyBezAkci && (
            <button type="button" aria-pressed className={cip(true)} data-kraj={kraj} data-pocet={0}>
              {nazevVybraneho}
              <span className="text-xs">(bez aktuálních akcí)</span>
            </button>
          )}
          {oddily.map((o) => (
            <button
              key={o.kod}
              type="button"
              aria-pressed={kraj === o.kod}
              onClick={() => setKraj(kraj === o.kod ? '' : o.kod)}
              className={cip(kraj === o.kod)}
              data-kraj={o.kod}
              data-pocet={o.pocet}
            >
              {o.nazev}
              <span className={pocitadlo(kraj === o.kod)}>{o.pocet}</span>
            </button>
          ))}
        </div>
      </nav>

      {kraj && (
        <p className="text-sm text-gray-600">
          {vybranyBezAkci
            ? `V kraji ${nazevVybraneho} teď o žádné akci nevíme.`
            : `Zobrazen jen kraj ${nazevVybraneho}.`}{' '}
          <button type="button" onClick={() => setKraj('')} className="text-blue-600 hover:underline">
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
        vybrane.map((o) => (
          <section key={o.kod} id={o.slug} aria-labelledby={`kraj-${o.kod}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-2">
              <h2 id={`kraj-${o.kod}`} className="text-xl font-semibold text-gray-900">
                {nadpisKraje(o.nazev)}
                <span className="ml-2 text-base font-normal text-gray-500">{akci(o.pocet)}</span>
              </h2>
              <Link
                href={`/regiony/${o.slug}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Střední školy v kraji
              </Link>
            </div>
            {o.mesta.length > 1 && (
              <p className="mt-2 text-sm text-gray-600">{o.mesta.join(' · ')}</p>
            )}

            <ol className="mt-4 space-y-3">
              {o.akce.map((a) => {
                const [, m, d] = a.start.split('-');
                return (
                  <li
                    key={a.id}
                    className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 transition-colors"
                  >
                    <time
                      dateTime={a.start}
                      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-800"
                      title={a.datum}
                    >
                      <span className="text-xl font-bold leading-none">
                        {a.terminPribligny ? '~' : ''}
                        {Number(d)}
                      </span>
                      <span className="text-xs uppercase tracking-wide">{MESICE[Number(m) - 1]}</span>
                    </time>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {a.online ? 'Online' : a.mesto}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 hover:underline">
                          {a.nazev}
                        </a>
                      </h3>
                      <p className="mt-1 text-sm text-gray-700">
                        {a.terminPribligny ? 'přibližně ' : ''}
                        {a.datum}
                        {a.cas ? `, ${a.cas}` : ''}
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

                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>Pořádá {a.poradatel}</span>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Stránka akce
                        </a>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Výhrada neúplnosti patří ke každému kraji zvlášť: rodič, který
                právě zjistil, že jeho město chybí, je ten, kdo akci nahlásí. */}
            <p className="mt-3 text-sm text-gray-600">
              Víme jen o {o.pocet === 1 ? 'této akci' : `těchto ${o.pocet} akcích`}.{' '}
              <Link href="/veletrhy/nahlasit" className="text-blue-600 hover:underline">
                Chybí vám nějaká? Nahlaste nám ji.
              </Link>
            </p>
          </section>
        ))
      )}
    </div>
  );
}
