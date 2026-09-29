'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { tvar } from '@/lib/cesky-tvar';
import { median, prevedBody, TRIDA_TAU, type DruhTestu, type PrevodDruhu, type TerminPrevodu } from '@/lib/prevod-testu-vypocet';

// ============================================================================
// Zadání výsledků cvičného testu a návod k testu TAU. Sdílí je stránka oboru
// (proužek „Kde stojím“) a krok 1 Simulátoru přijímaček
// (docs/navrh-simulator-prijimacek-2027.md, oddíl 2). Oba čtou a zapisují
// tentýž klíč úložiště, takže co uchazeč zadá na jednom místě, uvidí i na druhém.
// ============================================================================

/** Úvodní stránka přijímaček v TAU; výběr testu (vyber.php) funguje jen z ní, přímý odkaz ukáže prázdnou stránku. */
const TAU_PRIJIMACKY = 'https://tau.cermat.cz/predmet_prijimacky.php';

/** Jeden zadaný test: který termín a body z obou předmětů. */
export interface ZadanyTest { test: string; cj: string; ma: string }

/** Test mimo převodní tabulky: jiný test nebo odhad, porovnává se bez převodu. */
export const JINY = 'jiny';

/**
 * Klíč úložiště podle druhu a ročníku testu: výsledek pro 9. třídu platí pro všechny
 * čtyřleté obory; po přepnutí tabulek na jiný ročník testu se starý nepoužije.
 * Stránka oboru i simulátor musí používat tento jediný klíč.
 */
export const klicUlozeni = (druh: DruhTestu, rokTestu: number | undefined) => `kde-stojim:testy:v1:${druh}:${rokTestu ?? 'bez-prevodu'}`;

/** Body jednoho předmětu 0–50; prázdné nebo nesmyslné pole je „nevím“, ne nula. */
export function cislo(t: string): number | null {
  const n = Number(t.replace(',', '.'));
  return t.trim() && !Number.isNaN(n) && n >= 0 && n <= 50 ? n : null;
}

export function nactiUlozene(klic: string): ZadanyTest[] | null {
  try {
    const surove = JSON.parse(window.localStorage.getItem(klic) ?? 'null');
    if (!Array.isArray(surove)) return null;
    const testy = surove
      .filter((t): t is ZadanyTest => t && typeof t.test === 'string' && typeof t.cj === 'string' && typeof t.ma === 'string')
      .slice(0, 10)
      .map(t => ({ test: t.test.slice(0, 40), cj: t.cj.slice(0, 6), ma: t.ma.slice(0, 6) }));
    return testy.length ? testy : null;
  } catch {
    return null;
  }
}

/** „1 bod“, „2 body“, „5 bodů“; desetinné číslo „1,5 bodu“. */
export function bodu(n: number): string {
  const text = n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
  return `${text} ${Number.isInteger(n) ? tvar(n, 'bod', 'body', 'bodů') : 'bodu'}`;
}

/** Návod pro termín, který doporučujeme jako první. */
export const nazevDoporucenehoTerminu = (prevod: PrevodDruhu) =>
  prevod.terminy.find(x => x.klic === '1-radny')?.nazev ?? '1. řádný termín';

/**
 * Návod krok za krokem k jedinému testu, který umíme převést: celý test roku
 * převodních tabulek, 1. řádný termín, pro třídu podle druhu oboru.
 */
export function NavodTau({ druh, rokTestu, termin }: { druh: DruhTestu; rokTestu: number; termin: string }) {
  const trida = TRIDA_TAU[druh];
  return (
    <details className="group rounded-xl border border-blue-200 bg-blue-50/60 text-sm text-slate-700">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-[#16325c] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0074e4] text-xs text-white">i</span>
        Který test udělat: doporučujeme TAU {rokTestu}, {trida}. ročník, {termin}
        <span aria-hidden="true" className="ml-auto text-lg leading-none text-[#0074e4] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-2 px-4 pb-4">
        <p>
          Výsledek umíme přepočítat na body roku zobrazených pásem jen u celých testů z roku {rokTestu}: u nich
          víme, jak je napsali skuteční uchazeči, a podle toho body převedeme. Testy z jiných let přepočítat
          a porovnat neumíme. Nejpřesnější je {termin}, proto ho doporučujeme jako první.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Otevřete <a href={TAU_PRIJIMACKY} className="font-medium text-blue-700 underline" rel="noopener noreferrer" target="_blank">CERMAT TAU – přijímačky</a>.
          </li>
          <li>Ve sloupci <b>{trida}. ročník</b> zvolte <b>český jazyk a literatura</b>.</li>
          <li>V části <b>celý test</b> vyberte rok <b>{rokTestu}</b> a <b>{termin}</b> a spusťte ho.</li>
          <li>Pište celý test najednou, na čas jako u skutečné zkoušky, bez opravování chyb a poprvé. Zapište si počet bodů.</li>
          <li>Totéž udělejte pro <b>matematiku</b>: stejný ročník, rok {rokTestu}, {termin}.</li>
          <li>Obě čísla zadejte sem a u testu nechte <b>TAU {rokTestu}, {termin}</b>.</li>
        </ol>
        <p className="text-slate-500">
          Převést umíme i ostatní termíny roku {rokTestu} (u testu je pak vyberte), náhradní ale méně přesně.
          Víc testů dá přesnější obrázek.
        </p>
      </div>
    </details>
  );
}

/** Jeden vyplněný test po převodu na body roku pásem; `termin` null = bez převodu. */
export interface VysledekTestu { soucet: number; prevedeno: number; termin: TerminPrevodu | null }

export interface StavTestu {
  testy: ZadanyTest[];
  setTesty: Dispatch<SetStateAction<ZadanyTest[]>>;
  /** Převodní tabulky, které se opravdu použijí (null, když míří na jiný rok než pásma). */
  prevod: PrevodDruhu | null;
  /** Tabulky převádějí na jiný rok, než je rok pásem. */
  jinyRokCile: boolean;
  /** Výsledek ke každému řádku, null u nevyplněného. */
  vysledky: (VysledekTestu | null)[];
  platne: VysledekTestu[];
  /** Prostřední z převedených výsledků (u dvou jejich průměr); null bez výsledku. */
  body: number | null;
  /** Nejhorší převedený výsledek; null bez výsledku. */
  nejhorsi: number | null;
  /** Všechny výsledky jsou bez převodu (jiný test nebo odhad). */
  jenJiny: boolean;
  /** Aspoň jeden výsledek je bez převodu. */
  nektereJiny: boolean;
  /** Aspoň jeden výsledek je z termínu, který psala malá skupina. */
  nespolehlivy: boolean;
  ulozenoNeco: boolean;
  /** Z úložiště se pro současný klíč načetl aspoň jeden test. */
  nactenoZUlozeni: boolean;
  smazat: () => void;
}

/**
 * Stav zadaných testů. První `useState` v komponentě, která hook volá, jsou
 * testy (na tom stojí tests/pasmovy-prouzek.test.mjs). Uložené výsledky se
 * čtou až po hydrataci, server o nich neví.
 */
export function useZadaneTesty({ druh, prevod: prevodVstup, rok, pamatovat }: {
  druh: DruhTestu;
  prevod: PrevodDruhu | null;
  /** Rok zobrazených pásem, z registru. */
  rok: number;
  pamatovat: boolean;
}): StavTestu {
  const [testy, setTesty] = useState<ZadanyTest[]>(() => [{ test: '1-radny', cj: '', ma: '' }]);
  const nactenyKlic = useRef<string | null>(null);
  const klic = klicUlozeni(druh, prevodVstup?.rok_testu);
  // Klíč, pod kterým se z úložiště načetl aspoň jeden test; stránka oboru podle toho rozbalí zadání.
  const [nactenoPro, setNactenoPro] = useState<string | null>(null);

  useEffect(() => {
    if (!pamatovat) return;
    const ulozene = nactiUlozene(klic);
    // Po změně druhu (simulátor) se musí zahodit testy jiného druhu, ne je přepsat pod nový klíč.
    // Čtení až po hydrataci je záměr: v počátečním stavu by se server a prohlížeč rozešly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTesty(ulozene ?? [{ test: prevodVstup?.terminy[0]?.klic ?? JINY, cj: '', ma: '' }]);
    setNactenoPro(ulozene ? klic : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pamatovat, klic]);

  useEffect(() => {
    if (!pamatovat) return;
    // První běh pro daný klíč má ještě testy z doby před načtením; zápis by smazal uložené dřív, než se načtou.
    if (nactenyKlic.current !== klic) {
      nactenyKlic.current = klic;
      return;
    }
    try {
      const vyplnene = testy.filter(t => t.cj.trim() || t.ma.trim());
      if (vyplnene.length) window.localStorage.setItem(klic, JSON.stringify(vyplnene));
      else window.localStorage.removeItem(klic);
    } catch {
      // Úložiště může být zakázané; stránka funguje i bez paměti.
    }
  }, [testy, pamatovat, klic]);

  // Tabulky převádějí na konkrétní rok; s pásmy jiného roku by číslo lhalo.
  const jinyRokCile = Boolean(prevodVstup && prevodVstup.rok_cile !== rok);
  const prevod = jinyRokCile ? null : prevodVstup;

  const vysledky = useMemo(() => testy.map((t): VysledekTestu | null => {
    const c = cislo(t.cj);
    const m = cislo(t.ma);
    if (c === null || m === null) return null;
    const termin = prevod?.terminy.find(x => x.klic === t.test);
    const soucet = c + m;
    return { soucet, prevedeno: termin ? prevedBody(termin.body_cil, soucet) : soucet, termin: termin ?? null };
  }), [testy, prevod]);

  const platne = vysledky.filter((v): v is VysledekTestu => v !== null);
  const smazat = () => {
    try {
      window.localStorage.removeItem(klic);
    } catch {
      // viz výše
    }
    setTesty([{ test: prevod?.terminy[0]?.klic ?? JINY, cj: '', ma: '' }]);
  };

  return {
    testy, setTesty, prevod, jinyRokCile, vysledky, platne,
    body: median(platne.map(v => v.prevedeno)),
    nejhorsi: platne.length ? Math.min(...platne.map(v => v.prevedeno)) : null,
    jenJiny: platne.length > 0 && platne.every(v => v.termin === null),
    nektereJiny: platne.some(v => v.termin === null),
    nespolehlivy: platne.some(v => v.termin && !v.termin.spolehlive),
    ulozenoNeco: testy.some(t => t.cj.trim() || t.ma.trim()),
    nactenoZUlozeni: nactenoPro === klic,
    smazat,
  };
}

/**
 * Výhrada k výsledku bez převodu. Výrazná, protože srovnání s ní stojí na
 * předpokladu, který nikdo neověřil (*Převedený výsledek testu*, „co neříká“).
 */
export function VyhradaBezPrevodu({ rok, vse }: { rok: number; vse: boolean }) {
  return (
    <div role="note" className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">
        {vse ? 'Tvůj výsledek je bez převodu.' : 'Část tvých výsledků je bez převodu.'}
      </p>
      <p className="mt-1">
        Jiný test nebo odhad neumíme převést na body roku {rok}. Srovnání s ním platí jen tehdy, pokud byl
        test stejně těžký jako jednotná přijímací zkouška v roce {rok}; to ale nikdo neověřil.
        Spolehlivější je cvičný test, tedy test z minulých přijímaček v aplikaci CERMAT TAU, podle návodu výš.
      </p>
    </div>
  );
}

export interface ZadaniTestuProps {
  stav: StavTestu;
  druh: DruhTestu;
  /** Rok zobrazených pásem, z registru. */
  rok: number;
  /** Převodní tabulky tak, jak přišly (kvůli roku v upozornění na jiný rok cíle). */
  prevodVstup: PrevodDruhu | null;
  pamatovat: boolean;
  /** Kde se výsledek ukazuje, do věty o více testech: „Na proužku je“. */
  kdeJeVysledek?: string;
  /** Doplněk věty o úložišti. */
  poznamkaUlozeni?: string;
  /** Doplněk věty o rozsahu výsledků, například kde je rozsah vyznačený. */
  poznamkaRozsahu?: string;
  /** Popisek nad formulářem; bez něj věta ze stránky oboru. */
  nadpis?: ReactNode;
}

/** Formulář výsledků cvičných testů: termín a body z obou předmětů, víc testů, výhrady. */
export function ZadaniTestu({
  stav, druh, rok, prevodVstup, pamatovat, kdeJeVysledek = 'Na proužku je',
  poznamkaUlozeni = 'Platí pro všechny obory se stejným testem.', poznamkaRozsahu, nadpis,
}: ZadaniTestuProps) {
  const { testy, setTesty, prevod, vysledky, platne, body } = stav;
  const zmen = (i: number, zmena: Partial<ZadanyTest>) =>
    setTesty(ts => ts.map((t, j) => (j === i ? { ...t, ...zmena } : t)));

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-700">
        {nadpis ?? 'Tvoje výsledky z cvičného testu, tedy testu z minulých přijímaček v aplikaci CERMAT TAU'}
      </p>
      {prevod && <NavodTau druh={druh} rokTestu={prevod.rok_testu} termin={nazevDoporucenehoTerminu(prevod)} />}
      {testy.map((t, i) => {
        const v = vysledky[i];
        return (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Test</span>
              <select value={t.test} onChange={e => zmen(i, { test: e.target.value })} className="w-64 max-w-full rounded-lg border border-slate-300 px-3 py-2">
                {prevod?.terminy.map(x => (
                  <option key={x.klic} value={x.klic}>
                    TAU {prevod.rok_testu}, {x.nazev}{x.spolehlive ? '' : ' (méně přesné)'}
                  </option>
                ))}
                <option value={JINY}>Jiný test nebo odhad (bez převodu)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Čeština</span>
              <input value={t.cj} onChange={e => zmen(i, { cj: e.target.value })} inputMode="decimal" placeholder="z 50" className="w-20 rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Matematika</span>
              <input value={t.ma} onChange={e => zmen(i, { ma: e.target.value })} inputMode="decimal" placeholder="z 50" className="w-20 rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            {v && (
              <p className="pb-2 text-sm text-slate-700">
                {v.soucet} bodů{v.termin ? <> → <b>{v.prevedeno}</b> bodů roku {rok}</> : ' (bez převodu)'}
              </p>
            )}
            {testy.length > 1 && (
              <button type="button" onClick={() => setTesty(ts => ts.filter((_, j) => j !== i))} className="pb-2 text-sm text-slate-500 underline">
                odebrat
              </button>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={() => setTesty(ts => [...ts, { test: prevod?.terminy[1]?.klic ?? JINY, cj: '', ma: '' }])}
          className="text-sm font-medium text-blue-700 underline"
        >
          + přidat další test
        </button>
        {pamatovat && stav.ulozenoNeco && (
          <button type="button" onClick={stav.smazat} className="text-sm text-slate-500 underline">
            Smazat uložené výsledky
          </button>
        )}
      </div>
      {pamatovat && (
        <p className="text-xs text-slate-500">
          Výsledky si pamatuje jen tenhle prohlížeč, nikam je neposíláme. {poznamkaUlozeni}
        </p>
      )}
      {platne.length > 1 && body !== null && (
        <p className="text-sm text-slate-600">
          {platne.length === 2
            ? <>{kdeJeVysledek} průměr obou výsledků ({bodu(body)}).</>
            : <>{kdeJeVysledek} prostřední z {platne.length} výsledků ({bodu(body)}).</>}
          {' '}Výsledky se pohybují mezi {Math.min(...platne.map(v => v.prevedeno))} a {Math.max(...platne.map(v => v.prevedeno))} body{poznamkaRozsahu ? `; ${poznamkaRozsahu}` : '.'}
        </p>
      )}
      {stav.jinyRokCile && (
        <p className="text-sm text-amber-800">
          Převodní tabulky jsou spočítané pro rok {prevodVstup?.rok_cile}, pásma jsou z roku {rok}. Dokud se
          nepřepočítají, výsledky testů se porovnávají bez převodu.
        </p>
      )}
      {stav.nektereJiny && <VyhradaBezPrevodu rok={rok} vse={stav.jenJiny} />}
      {stav.nespolehlivy && (
        <p className="text-sm text-amber-800">
          Náhradní termín psala malá skupina uchazečů, převod je u něj méně přesný.
        </p>
      )}
      {platne.some(v => v.termin) && (
        <p className="text-xs text-slate-500">
          Převedený výsledek je, kolik bodů by to bylo v roce {rok}: podle toho, kolik uchazečů mělo ve stejném
          testu horší výsledek. Doma a bez stresu se obvykle píše o něco lépe, převedený výsledek proto spíš nadhodnocuje.
        </p>
      )}
    </div>
  );
}
