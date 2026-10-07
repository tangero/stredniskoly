'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn, createKrajSlug } from '@/lib/utils';
import { cipKraje, nadpisKraje, vsechnyKraje } from '@/lib/kraje.mjs';
// Listový modul bez dat: `@/lib/veletrhy` by do prohlížeče vzal celý JSON
// akcí a přes registr sad i `fs`, na kterém `next build` spadne.
import { akci, cesskyDen, seskupPodleKraje } from '@/lib/veletrhy-pocty';
import { MESTA } from '@/lib/mesta.mjs';
import { MapaKraju } from './MapaKraju';

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
  /** Den, se kterým stránku sestavil server. Drží první render shodný. */
  den: string;
  /**
   * Souběžný návrh pro srovnání s veřejnou stránkou. Bez hodnoty zůstává
   * výpis, který berou testy jako smlouvu (`/veletrhy`).
   */
  varianta?: 'b';
  /** „Co si na veletrhu zjistit“. Varianta B to položí vedle seznamu. */
  otazky?: ReactNode;
}

/**
 * Všech čtrnáct krajů se slugem a nadpisem, spočítané jednou. I kraje bez
 * akce: kotva `#liberecky` na kraj, kterému akce už proběhly, musí ukázat
 * „teď o žádné nevíme“ s odkazem na stránku kraje, ne tiše celý seznam.
 */
const KRAJE = vsechnyKraje().map((k) => ({
  ...k,
  cip: cipKraje(k.kod),
  nadpis: nadpisKraje(k.kod),
  slug: createKrajSlug(k.kod, k.nazev),
}));

// Totéž, co dává `Intl.DateTimeFormat('cs-CZ', { month: 'short' })`; napevno
// proto, aby dlaždice nezávisela na ICU datech prohlížeče.
const MESICE = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

/**
 * Místo akce pro řádek měst i první řádku karty — jedna definice, aby si
 * obě místa neodporovala. Série bez rozepsaných měst nese výčet z `misto`
 * (tam pořadatel uvádí města); bez něj zbývá přiznat, že místo upřesní
 * pořadatel.
 */
function mistoAkce(a: VeletrhKarta): string {
  if (a.online) return 'Online';
  return a.mesto || a.misto || 'místo upřesní pořadatel';
}

/**
 * Stránka města podle názvu obce. Jen města ze seznamu MESTA (aspoň tři
 * školy) stránku mají; u ostatních (Vimperk, Kaplice…) zůstává jméno
 * prostým textem. Odkaz na kraj místo města by vedl jinam, než slibuje.
 */
const STRANKA_MESTA = new Map<string, string>(MESTA.map((m) => [m.nazev, `/mesto/${m.slug}`]));

/** Jméno města jako odkaz na jeho stránku, pokud ji má; jinak text. */
function MestoOdkaz({ nazev, className }: { nazev: string; className?: string }) {
  const href = STRANKA_MESTA.get(nazev);
  if (!href) return <>{nazev}</>;
  return (
    <Link href={href} className={className}>
      {nazev}
      {/* Samotné „Pardubice“ by čtečka mohla vyložit jako odkaz na akci. */}
      <span className="sr-only">, střední školy ve městě</span>
    </Link>
  );
}

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

/** Tři nejbližší akce napříč kraji. Doplněk mapy, ne nová osa stránky. */
function NejblizsiAkce({ akce }: { akce: VeletrhKarta[] }) {
  if (akce.length === 0) return null;
  return (
    <section aria-label="Nejbližší akce">
      <h2 className="text-sm font-medium text-gray-700">Nejbližší akce</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {akce.map((a) => {
          const kraj = KRAJE.find((k) => k.kod === a.krajKod);
          if (!kraj) return null;
          const dl = dlazdice(a.start, a.end);
          const denDlazdice = `${a.terminPribligny ? '~' : ''}${dl.den}`;
          return (
            <li key={a.id}>
              <a
                href={`#${kraj.slug}`}
                className="flex h-full gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-800"
                >
                  <span className="text-base font-bold leading-none">{denDlazdice}</span>
                  <span className="text-xs uppercase tracking-wide">{dl.mesic}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {mistoAkce(a)}
                  </span>
                  <span className="mt-0.5 block font-semibold text-gray-900">{a.nazev}</span>
                  <span className="sr-only">, {a.datum}, oddíl kraje</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-gray-600">Seznam níže je podle krajů.</p>
    </section>
  );
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
export function VeletrhySeznam({ akce, den, varianta, otazky }: Props) {
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
  //
  // Zpracovaná kotva se pamatuje: Next po každé změně stavu routeru volá
  // replaceState s nezměněnou adresou (a totéž dělají skripty třetích
  // stran) a Chromium k tomu hlásí `currententrychange`; bez porovnání by
  // každá taková událost znovu posunula na oddíl. Totéž kryje vlastní
  // zápis čipem (`vyber` kotvu zapíše jako zpracovanou) — klik na čip
  // nemá hýbat stránkou.
  const [posun, setPosun] = useState<{ slug: string } | null>(null);
  const zpracovano = useRef<string | null>(null);
  useEffect(() => {
    const predvyber = () => {
      const kotva = window.location.hash.replace(/^#/, '');
      if (kotva === zpracovano.current) return;
      zpracovano.current = kotva;
      const shoda = KRAJE.find((k) => k.slug === kotva);
      if (!shoda && kotva) return;
      setKraj(shoda ? shoda.kod : '');
      if (shoda) setPosun({ slug: shoda.slug });
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
  }, []);

  useEffect(() => {
    if (posun) document.getElementById(posun.slug)?.scrollIntoView();
  }, [posun]);

  /** Výběr čipem se propíše do adresy, aby ho reload i sdílený odkaz zachovaly. Bez posunu. */
  function vyber(kod: string) {
    setKraj(kod);
    const k = KRAJE.find((x) => x.kod === kod);
    // Zapsaná kotva je zpracovaná: v Chromiu tím projde vlastní
    // `currententrychange` bez posunu, a kde Navigation API není, nezůstane
    // stará hodnota, na které by Zpět na prázdnou adresu vypadal jako nic.
    zpracovano.current = k ? k.slug : '';
    window.history.replaceState(null, '', k ? `#${k.slug}` : window.location.pathname + window.location.search);
  }

  const probihajici = useMemo(() => akce.filter((a) => a.end >= dnes), [akce, dnes]);

  // Pořadí háčků drží testy: tohle je výpočet, ne stav. Kraj bez číselníku
  // do pásu nepatří, odkaz by vedl na kotvu, kterou seznam nevykreslí.
  const nejblizsi = useMemo(
    () =>
      [...probihajici]
        .filter((a) => KRAJE.some((k) => k.kod === a.krajKod))
        .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
        .slice(0, 3),
    [probihajici],
  );

  // Počty u krajů se počítají z právě probíhajících akcí, ne ze serverového
  // seznamu — jinak by po půlnoci čip sliboval akci, která už zmizela.
  const oddily = useMemo(() => {
    const podleKraje = seskupPodleKraje(probihajici);
    return KRAJE
      .filter((k) => podleKraje.has(k.kod))
      .map((k) => {
        // Řazení podle data tady, ne spoléhat na volajícího: pořadí karet
        // i řádku měst je smlouva komponenty.
        const seznam = [...podleKraje.get(k.kod)!].sort((a, b) => a.start.localeCompare(b.start));
        // Města v pořadí, v jakém se v kraji konají — čtenář je pak
        // potká v kartách pod řádkem ve stejném sledu.
        return { ...k, pocet: seznam.length, akce: seznam, mesta: [...new Set(seznam.map(mistoAkce))] };
      });
  }, [probihajici]);

  // Součet přes oddíly, ne délka seznamu: akce s krajem mimo číselník by
  // se jinak započítala, ale nikde nevykreslila.
  const celkem = oddily.reduce((s, o) => s + o.pocet, 0);

  const pocty = useMemo(() => new Map(oddily.map((o) => [o.kod, o.pocet])), [oddily]);
  // Kraj pod myší v mapě nebo na čipu; zvýrazní obě podoby najednou.
  // Deklarace za ostatními stavy drží jejich pořadí (testy je čtou podle něj).
  const [najety, setNajety] = useState('');

  const vybrane = kraj ? oddily.filter((o) => o.kod === kraj) : oddily;
  const vybrany = KRAJE.find((k) => k.kod === kraj);
  const vybranyBezAkci = vybrany !== undefined && vybrane.length === 0;

  // Jeden seznam čipů v pořadí číselníku: kraje s akcí a případně vybraný
  // kraj, kterému akce po půlnoci došly — ten zůstává na svém místě
  // viditelný, dokud filtruje; nesmí skočit na začátek řady.
  const cipy = KRAJE.flatMap((k) => {
    const oddil = oddily.find((o) => o.kod === k.kod);
    if (oddil) return [oddil];
    return vybranyBezAkci && k.kod === kraj ? [{ ...k, pocet: 0 }] : [];
  });

  // Od 1024 px stojí čipy ve dvou sloupcích vedle mapy (výškou jí odpovídají)
  // a slouží jako její legenda.
  const cip = (aktivni: boolean, najety = false) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors lg:justify-between',
      aktivni
        ? 'border-blue-700 bg-blue-700 text-white'
        : najety
          ? 'border-blue-400 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:text-blue-700',
    );
  const pocitadlo = (aktivni: boolean) =>
    cn('rounded-full px-1.5 text-xs font-semibold', aktivni ? 'bg-white/20' : 'bg-gray-100 text-gray-600');
  const zrusitFiltr = (
    <button type="button" onClick={() => vyber('')} className="text-blue-600 hover:underline">
      Zrušit filtr
    </button>
  );

  const telo = (
    <>
      <nav id={varianta === 'b' ? 'kde' : undefined} aria-label="Kraje s akcemi">
        <p className="text-sm font-medium text-gray-700 mb-2">Kde se veletrh koná</p>
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-8">
        <div className="mb-4 lg:mb-0">
          <MapaKraju pocty={pocty} vybrany={kraj} najety={najety} onVyber={vyber} onNajeti={setNajety} />
        </div>
        <div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-2 lg:gap-1.5">
          <button
            type="button"
            aria-pressed={kraj === ''}
            onClick={() => vyber('')}
            className={cip(kraj === '')}
          >
            Všechny kraje
            <span className={pocitadlo(kraj === '')}>{celkem}</span>
          </button>
          {cipy.map((o) => (
            <button
              key={o.kod}
              type="button"
              aria-pressed={kraj === o.kod}
              onClick={() => vyber(kraj === o.kod ? '' : o.kod)}
              onMouseEnter={() => setNajety(o.kod)}
              onMouseLeave={() => setNajety('')}
              className={cip(kraj === o.kod, najety === o.kod)}
              data-kraj={o.kod}
              data-pocet={o.pocet}
            >
              {o.cip}
              {o.pocet === 0 ? (
                <span className="text-xs">(bez aktuálních akcí)</span>
              ) : (
                <span className={pocitadlo(kraj === o.kod)}>{o.pocet}</span>
              )}
            </button>
          ))}
        </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Hranice krajů: © ČÚZK, RÚIAN, CC BY 4.0</p>
      </nav>

      {vybrany && !vybranyBezAkci && (
        <p className="text-sm text-gray-600">
          Zobrazujeme jen {vybrany.nadpis}. {zrusitFiltr}
        </p>
      )}

      {vybrane.length === 0 && (
        // Kotva i pro prázdný stav: odkaz #liberecky po skončení jediné akce
        // má na tuhle krabici posunout stejně, jako by posunul na oddíl.
        <div id={vybrany?.slug} className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700 scroll-mt-24">
          <p className="font-medium text-gray-900">
            {vybrany ? `${vybrany.nadpis}: teď o žádné akci nevíme.` : 'O žádné akci teď nevíme.'}
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
              <Link href={`/regiony/${vybrany.slug}`} className="text-blue-600 hover:underline">
                Střední školy v kraji<span className="sr-only"> — {vybrany.nadpis}</span>
              </Link>
              {zrusitFiltr}
            </p>
          )}
        </div>
      )}

      {vybrane.map((o) => (
        <section key={o.kod} id={o.slug} className="scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-2">
            {/* Nadpis je odkazem na přehled škol v kraji. Viditelný text
                (název kraje) zůstává začátkem názvu odkazu kvůli ovládání
                hlasem, skrytý dovětek říká, kam odkaz vede. */}
            <h2 className="text-xl font-semibold text-gray-900">
              <Link href={`/regiony/${o.slug}`} className="hover:text-blue-700 hover:underline">
                {o.nadpis}
                <span className="sr-only">, střední školy v kraji</span>
              </Link>{' '}
              <span className="ml-2 text-base font-normal text-gray-500">{akci(o.pocet)}</span>
            </h2>
          </div>
          {o.mesta.length > 1 && (
            <p className="mt-2 text-sm text-gray-600">
              {o.mesta.map((m, i) => (
                <span key={m}>
                  {i > 0 && ' · '}
                  <MestoOdkaz nazev={m} className="hover:text-blue-700 hover:underline" />
                </span>
              ))}
            </p>
          )}

          <ol className="mt-4 space-y-3">
            {o.akce.map((a) => {
              const dl = dlazdice(a.start, a.end);
              const denDlazdice = `${a.terminPribligny ? '~' : ''}${dl.den}`;
              const velikost = denDlazdice.length <= 2 ? 'text-xl' : denDlazdice.length <= 5 ? 'text-lg' : 'text-base';
              // Řádek s datem opakuje `misto` jen tehdy, když ho neukázala
              // první řádka karty: ta nese město, nebo u série bez měst přímo
              // `misto`; a když je místo totéž co město, nepíše se dvakrát.
              const mistoNaRadku = a.mesto && !a.online && a.misto && a.misto !== a.mesto ? ` — ${a.misto}` : '';
              const mistoNavic = mistoNaRadku.replace(/^ — /, '');
              return (
                <li
                  key={a.id}
                  className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 transition-colors"
                >
                  {/* Dlaždice je jen vizuál; strojové datum nese `<time>` na řádku
                      s datem níže, u rozsahu jako jeho začátek. */}
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-800"
                    title={a.datum}
                  >
                    <span className={`${velikost} font-bold leading-none`}>{denDlazdice}</span>
                    <span className="text-xs uppercase tracking-wide">{dl.mesic}</span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {a.mesto && !a.online ? (
                        <MestoOdkaz
                          nazev={a.mesto}
                          className="underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-blue-700 hover:decoration-blue-700"
                        />
                      ) : (
                        mistoAkce(a)
                      )}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 hover:underline">
                        {a.nazev}
                      </a>
                    </h3>
                    {varianta === 'b' ? (
                      <p className="mt-1 text-sm text-gray-700">
                        <time className="sr-only" dateTime={a.start}>
                          {a.terminPribligny ? 'přibližně ' : ''}
                          {a.datum}
                        </time>
                        {[a.cas, mistoNavic].filter(Boolean).join(' · ')}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-700">
                        {a.terminPribligny ? 'přibližně ' : ''}
                        <time dateTime={a.start}>{a.datum}</time>
                        {a.cas ? `, ${a.cas}` : ''}
                        {mistoNaRadku}
                      </p>
                    )}

                    {(a.zdrojJenAgregator || a.terminPribligny) && (
                      <p
                        className={
                          varianta === 'b'
                            ? 'mt-2 text-sm text-amber-900'
                            : 'mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                        }
                      >
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
    </>
  );

  if (varianta === 'b') {
    return (
      <div className="space-y-8" data-varianta="b">
        <NejblizsiAkce akce={nejblizsi} />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="order-2 min-w-0 space-y-8 lg:order-1">{telo}</div>
          {otazky ? <div className="order-1 lg:sticky lg:top-24 lg:order-2">{otazky}</div> : null}
        </div>
      </div>
    );
  }

  return <div className="space-y-8">{telo}</div>;
}
