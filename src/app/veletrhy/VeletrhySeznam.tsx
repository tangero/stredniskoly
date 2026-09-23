'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn, createKrajSlug } from '@/lib/utils';
import { nadpisKraje } from '@/lib/kraje.mjs';
// Listový modul bez dat: `@/lib/veletrhy` by do prohlížeče vzal celý JSON
// akcí a přes registr sad i `fs`, na kterém `next build` spadne.
import { akci, cesskyDen, seskupPodleKraje } from '@/lib/veletrhy-pocty';

export interface VeletrhKarta {
  id: string;
  /** Poslední den konání; podle něj klient odfiltruje proběhlé akce. */
  end: string;
  nazev: string;
  poradatel: string;
  mesto: string | null;
  online?: boolean;
  krajKod: string;
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
  /**
   * Všech čtrnáct krajů, i bez akce: kotva `#liberecky` na kraj, kterému
   * akce už proběhly, musí ukázat „teď o žádné nevíme“ s odkazem na stránku
   * kraje, ne tiše celý seznam. Čipy se kreslí jen krajům s akcí.
   */
  kraje: { kod: string; nazev: string }[];
  /** Den, se kterým stránku sestavil server. Drží první render shodný. */
  den: string;
}

// Totéž, co dává `Intl.DateTimeFormat('cs-CZ', { month: 'short' })`; napevno
// proto, aby dlaždice nezávisela na ICU datech prohlížeče.
const MESICE = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

/** Město pro řádek i kartu; série bez rozepsaných měst nese totéž na obou místech. */
const BEZ_MESTA = 'místo upřesní pořadatel';

/**
 * Dlaždice s datem: den a měsíc; u vícedenní akce rozsah dnů, aby v jejím
 * průběhu nesvítil první den jako něco, co už bylo. Přes hranici měsíce
 * se ukáže i druhý měsíc. Šířka dlaždice je pevná, aby karty v oddílu
 * začínaly textem na stejné svislici; delší rozsah dostane menší písmo.
 */
function dlazdice(start: string, end: string): { den: string; mesic: string } {
  const [, m1, d1] = start.split('-');
  const [, m2, d2] = end.split('-');
  if (end === start) return { den: String(Number(d1)), mesic: MESICE[Number(m1) - 1] };
  if (m1 === m2) return { den: `${Number(d1)}–${Number(d2)}`, mesic: MESICE[Number(m1) - 1] };
  return { den: `${Number(d1)}–${Number(d2)}`, mesic: `${MESICE[Number(m1) - 1]}–${MESICE[Number(m2) - 1]}` };
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

  // Kotva v adrese (#jihocesky ze stránky kraje) kraj předvybere a po
  // překreslení na něj posune. Čte se až po připojení, na serveru kotva
  // není. Změna adresy za běhu se sleduje dvěma cestami: `hashchange`
  // (zpět/vpřed, ruční změna) a `navigation.currententrychange` — Next
  // při odkazu na tutéž stránku jen s jinou kotvou volá `pushState`, po
  // kterém `hashchange` nepřijde a komponenta zůstane připojená.
  // Cizí kotva (jiný prvek na stránce) výběr nechá být; jen prázdná
  // adresa ho ruší. Posun je stav: každé čtení kotvy založí nový objekt,
  // takže efekt níže proběhne i pro kraj, který už byl vybraný, a
  // proběhne až po překreslení se zúženým seznamem.
  const [posun, setPosun] = useState<{ kod: string } | null>(null);
  useEffect(() => {
    const predvyber = () => {
      const kotva = window.location.hash.replace(/^#/, '');
      const shoda = kraje.find((k) => createKrajSlug(k.kod, k.nazev) === kotva);
      if (!shoda && kotva) return;
      setKraj(shoda ? shoda.kod : '');
      if (shoda) setPosun({ kod: shoda.kod });
    };
    predvyber();
    // Navigation API zatím není v typech DOM; kde chybí (starší Firefox),
    // zůstává jen `hashchange`.
    const navigace = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener('hashchange', predvyber);
    navigace?.addEventListener('currententrychange', predvyber);
    return () => {
      window.removeEventListener('hashchange', predvyber);
      navigace?.removeEventListener('currententrychange', predvyber);
    };
  }, [kraje]);

  useEffect(() => {
    if (!posun) return;
    const k = kraje.find((x) => x.kod === posun.kod);
    if (k) document.getElementById(createKrajSlug(k.kod, k.nazev))?.scrollIntoView();
  }, [posun, kraje]);

  /** Výběr čipem se propíše do adresy, aby ho reload i sdílený odkaz zachovaly. Bez posunu. */
  function vyber(kod: string) {
    setKraj(kod);
    const k = kraje.find((x) => x.kod === kod);
    const cil = k ? `#${createKrajSlug(k.kod, k.nazev)}` : window.location.pathname + window.location.search;
    window.history.replaceState(null, '', cil);
  }

  const probihajici = useMemo(() => akce.filter((a) => a.end >= dnes), [akce, dnes]);

  // Počty u krajů se počítají z právě probíhajících akcí, ne ze serverového
  // seznamu — jinak by po půlnoci čip sliboval akci, která už zmizela.
  const oddily = useMemo(() => {
    const podleKraje = seskupPodleKraje(probihajici);
    return kraje
      .filter((k) => podleKraje.has(k.kod))
      .map((k) => {
        const seznam = podleKraje.get(k.kod)!;
        // Města v pořadí, v jakém se v kraji konají — čtenář je pak
        // potká v kartách pod řádkem ve stejném sledu.
        const mesta = [...new Set(seznam.map((a) => (a.online ? 'Online' : a.mesto || BEZ_MESTA)))];
        return { ...k, pocet: seznam.length, akce: seznam, mesta, slug: createKrajSlug(k.kod, k.nazev) };
      });
  }, [kraje, probihajici]);

  // Součet přes oddíly, ne délka seznamu: akce s krajem mimo číselník by
  // se jinak započítala, ale nikde nevykreslila.
  const celkem = oddily.reduce((s, o) => s + o.pocet, 0);

  const vybrane = kraj ? oddily.filter((o) => o.kod === kraj) : oddily;
  const vybrany = kraje.find((k) => k.kod === kraj);
  const vybranyBezAkci = vybrany !== undefined && vybrane.length === 0;

  const cip = (aktivni: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
      aktivni
        ? 'border-blue-700 bg-blue-700 text-white'
        : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:text-blue-700',
    );
  const pocitadlo = (aktivni: boolean) =>
    cn('rounded-full px-1.5 text-xs font-semibold', aktivni ? 'bg-white/20' : 'bg-gray-100 text-gray-600');
  const zrusitFiltr = (
    <button type="button" onClick={() => vyber('')} className="text-blue-600 hover:underline">
      Zrušit filtr
    </button>
  );

  return (
    <div className="space-y-8">
      <nav aria-label="Kraje s akcemi">
        <p className="text-sm font-medium text-gray-700 mb-2">Kde se veletrh koná</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={kraj === ''}
            onClick={() => vyber('')}
            className={cip(kraj === '')}
          >
            Všechny kraje
            <span className={pocitadlo(kraj === '')}>{celkem}</span>
          </button>
          {vybranyBezAkci && (
            <button
              type="button"
              aria-pressed
              onClick={() => vyber('')}
              className={cip(true)}
              data-kraj={kraj}
              data-pocet={0}
            >
              {vybrany.nazev}
              <span className="text-xs">(bez aktuálních akcí)</span>
            </button>
          )}
          {oddily.map((o) => (
            <button
              key={o.kod}
              type="button"
              aria-pressed={kraj === o.kod}
              onClick={() => vyber(kraj === o.kod ? '' : o.kod)}
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

      {vybrany && !vybranyBezAkci && (
        <p className="text-sm text-gray-600">
          Zobrazujeme jen {nadpisKraje(vybrany.kod)}. {zrusitFiltr}
        </p>
      )}

      {vybrane.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700">
          <p className="font-medium text-gray-900">
            {vybrany ? `${nadpisKraje(vybrany.kod)}: teď o žádné akci nevíme.` : 'O žádné akci teď nevíme.'}
          </p>
          <p className="mt-2 text-sm">
            Neznamená to, že se žádná nekoná — znamená to, že jsme ji nedohledali.{' '}
            <Link href="/veletrhy/nahlasit" className="text-blue-600 hover:underline">
              Víte o akci, která tu chybí? Nahlaste nám ji
            </Link>
            {' '}— před zveřejněním ji ověříme na stránce pořadatele.
          </p>
          {vybrany && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link
                href={`/regiony/${createKrajSlug(vybrany.kod, vybrany.nazev)}`}
                aria-label={`Střední školy: ${nadpisKraje(vybrany.kod)}`}
                className="text-blue-600 hover:underline"
              >
                Střední školy v kraji
              </Link>
              {zrusitFiltr}
            </p>
          )}
        </div>
      )}

      {vybrane.map((o) => (
        <section key={o.kod} id={o.slug} className="scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {nadpisKraje(o.kod)}
              <span className="ml-2 text-base font-normal text-gray-500">{akci(o.pocet)}</span>
            </h2>
            {/* Čtrnáct odkazů se stejným textem: čtečka potřebuje v názvu odkazu kraj. */}
            <Link
              href={`/regiony/${o.slug}`}
              aria-label={`Střední školy: ${nadpisKraje(o.kod)}`}
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
              const dl = dlazdice(a.start, a.end);
              const denDlazdice = `${a.terminPribligny ? '~' : ''}${dl.den}`;
              const velikost = denDlazdice.length <= 2 ? 'text-xl' : denDlazdice.length <= 5 ? 'text-lg' : 'text-base';
              return (
                <li
                  key={a.id}
                  className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 transition-colors"
                >
                  <time
                    dateTime={a.start}
                    className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-800"
                    title={a.datum}
                  >
                    <span className={`${velikost} font-bold leading-none`}>{denDlazdice}</span>
                    <span className="text-xs uppercase tracking-wide">{dl.mesic}</span>
                  </time>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {a.online ? 'Online' : a.mesto || BEZ_MESTA}
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
              právě zjistil, že jeho město chybí, je ten, kdo akci nahlásí.
              Pojem „nahlásit akci“ nese v každém bloku svou větu ze slovníku:
              nahlášení není zveřejnění. */}
          <p className="mt-3 text-sm text-gray-600">
            Víme jen o {o.pocet === 1 ? 'této akci' : `těchto ${o.pocet} akcích`} s potvrzeným termínem.{' '}
            <Link href="/veletrhy/nahlasit" className="text-blue-600 hover:underline">
              Chybí vám nějaká? Nahlaste nám ji
            </Link>
            {' '}— před zveřejněním ji ověříme na stránce pořadatele.
          </p>
        </section>
      ))}
    </div>
  );
}
