'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { tvar } from '@/lib/cesky-tvar';
import {
  median, poradiMeziSoutezicimi, prevedBody, TRIDA_TAU,
  type DruhTestu, type KriteriaOboru, type PoziceOboru, type PrevodDruhu,
} from '@/lib/prevod-testu-vypocet';
import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';

// ============================================================================
// Kde stojím: pásmový proužek jednoho oboru s výsledkem cvičného testu
// (docs/navrh-kde-stojim-2027.md, docs/navrh-pasmovy-prouzek-2027.md).
//
// Proužek je vidět i bez zadaných bodů jako obrázek pásem. Zadané testy
// TAU se převedou na body roku pásem (*Převedený výsledek testu*) a ukáže
// se poloha a *Pořadí mezi soutěžícími*. Sdílí ho stránka oboru a prototyp.
// ============================================================================

const NALEZ_TEXT = 'Při kontrole se přepis v něčem neshodl s PDF.';

/** Kritéria předchozího ročníku rozhodovala jen přijímačkami (prostým součtem). */
export function jenPrijimacky(k: KriteriaOboru | null | undefined): boolean {
  // Všechna zaměření: u společné stránky nesmí jedno „jen JPZ“ skrýt bodování jiného.
  return Boolean(k && k.prepisy.length > 0
    && k.prepisy.every(p => p.rezim === 'pouze_jpz' && p.jpz_navic.length === 0 && !p.chybi_slozky));
}

/**
 * Blok kritérií jen tam, kde nerozhodovala jen JPZ (rozhodnutí zadavatele
 * 28. 9. 2026). U „jen JPZ“ jedna věta, bez přepisu nic.
 */
function Kriteria({ k }: { k: KriteriaOboru }) {
  // U víc zaměření ukázat to, které boduje i něco dalšího; jinak první.
  const p = k.prepisy.find(x => x.rezim === 'jine' || x.jpz_navic.length > 0 || x.chybi_slozky) ?? k.prepisy[0];
  if (!p) return null;
  const noveRizeni = (
    <>Kritéria pro nové přijímací řízení se teprve vyhlásí{k.noveKriteria ? `; školy je zveřejní ${k.noveKriteria}` : ''}.</>
  );
  if (jenPrijimacky(k)) {
    return (
      <p className="text-sm text-slate-600">
        Podle kritérií {k.rok}, tedy pravidel, podle kterých škola v roce {k.rok} řadila uchazeče, škola přijímala
        podle jednotné přijímací zkoušky. {noveRizeni}{' '}
        <span className="text-amber-800">
          {p.prepis === 'strojovy' ? 'Přepsal to z PDF počítač a může obsahovat chybu.' : 'Přepsáno ručně z PDF a může obsahovat chybu.'}
          {p.nalezy.length > 0 && ` ${NALEZ_TEXT}`} Ověřte si to v kritériích školy.
        </span>
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
      <h3 className="text-base font-semibold text-slate-900">Co kromě přijímaček rozhodovalo v roce {k.rok}</h3>
      <p className="text-slate-500">
        Kritéria {k.rok}, tedy pravidla, podle kterých škola v roce {k.rok} řadila uchazeče; pro nové přijímací
        řízení platí nová.
      </p>
      {p.jpz_navic.length > 0 && (
        <>
          <p>Přijímačky ale podle PDF nepočítala prostým součtem, takže pořadí se od součtu na proužku může lišit (podrobnosti v kritériích školy):</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.jpz_navic.map((x, i) => (
              <li key={i}>{x.nazev}</li>
            ))}
          </ul>
        </>
      )}
      {p.rezim === 'jine' && (
        <>
          <p>
            {p.chybi_slozky
              ? <>Kromě přijímaček škola podle PDF bodovala i další věci (například prospěch nebo pohovor), náš přepis je ale nezachytil. </>
              : p.podil_jpz_pct !== null
                ? <>Přijímačky tvořily asi <b>{p.podil_jpz_pct} %</b> bodů. </>
                : <>Kromě přijímaček škola bodovala i další věci; jejich váhu jsme z PDF nepřečetli celou. </>}
            O pořadí proto rozhodoval i zbytek bodů, nejen test.
          </p>
          {p.slozky.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5">
              {p.slozky.filter(x => x.max !== 0).map((x, i) => (
                <li key={i}>{x.nazev}{x.max === null ? '' : x.max < 0 ? `: srážka až ${-x.max} bodů` : `: až ${x.max} bodů`}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {p.minima.length > 0 && <div>
          <p>Minimální podmínky:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.minima.map((m, i) => <li key={i}>{m.replace(/\.$/, '')}</li>)}
          </ul>
        </div>}
      {k.prepisy.length > 1 && <p className="text-slate-500">Obor má víc zaměření a kritéria se mezi nimi můžou lišit; ukazujeme {p.zamereni ? `zaměření ${p.zamereni}` : 'jedno z nich'}.</p>}
      <p className="text-amber-800">
        {p.prepis === 'strojovy' ? 'Přepsal to z PDF počítač a může obsahovat chybu: při kontrole vzorku byl podstatně chybný zhruba každý desátý přepis.' : 'Přepsáno ručně z PDF a může obsahovat chybu.'}
        {p.nalezy.length > 0 && ` ${NALEZ_TEXT}`} Ověřte si to v kritériích školy.
      </p>
      <p className="text-slate-500">{noveRizeni} Až budou, doplníme je.</p>
    </div>
  );
}

const MAX_BODU = 100;

/** Poloha vlastního výsledku vůči pásmu nejistoty. */
type Poloha = 'pod' | 'v_pasmu' | 'nad' | 'nezadano';

function urciPolohu(body: number | null, lo: number, hi: number | undefined): Poloha {
  if (body === null) return 'nezadano';
  if (body < lo) return 'pod';
  if (hi === undefined || body > hi) return 'nad';
  return 'v_pasmu';
}

/** Procento osy; body 0–100 se mapují přímo, ale škálu držíme na jednom místě. */
const naOsu = (body: number) => Math.max(0, Math.min(100, (body / MAX_BODU) * 100));

/** „1 bod“, „2 body“, „5 bodů“; desetinné číslo „1,5 bodu“. */
function bodu(n: number): string {
  const text = n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
  return `${text} ${Number.isInteger(n) ? tvar(n, 'bod', 'body', 'bodů') : 'bodu'}`;
}

function Veta({ poloha, body, lo, hi, data, rok, dalsiKriteria }: {
  poloha: Poloha; body: number | null; lo: number; hi?: number; data: PasmaPrijetiObor; rok: number;
  /** Škola podle kritérií bodovala i něco jiného než přijímačky. */
  dalsiKriteria: boolean;
}) {
  const soutezilo = data.pasmo_nejistoty_soutezilo ?? 0;
  const prijato = data.pasmo_nejistoty_prijato ?? 0;

  if (poloha === 'nezadano') {
    return (
      <p className="text-slate-600">
        Zadej výsledek testu a uvidíš, kam bys mezi uchazeče roku {rok} padl.
      </p>
    );
  }
  if (poloha === 'nad') {
    // Když hi < lo, mezi mezemi nikdo nebyl. Mluvit o „nad hi“ by odporovalo
    // proužku, kde zelená začíná až na lo — a tvrdilo by to víc, než data nesou.
    const mezera = hi !== undefined && hi < lo;
    return (
      <p className="text-lg font-semibold text-green-800">
        {mezera
          ? `Nad ${lo} bodů se v roce ${rok} dostali všichni; mezi ${hi} a ${lo} body nebyl nikdo.`
          : hi !== undefined
            ? `Nad ${hi} bodů se v roce ${rok} dostali všichni.`
            : `Nad ${lo} bodů se v roce ${rok} dostali všichni.`}
      </p>
    );
  }
  if (poloha === 'pod') {
    const chybi = body !== null ? Math.round((lo - body) * 10) / 10 : 0;
    return (
      <div>
        <p className="text-lg font-semibold text-slate-900">
          Pod {lo} body z přijímaček se v roce {rok} nedostal nikdo.{' '}
          {/* Konkrétní cíl místo verdiktu: rozdíl mezi „nemáš na to“ a „chybí ti
              12 bodů, zbývá pět měsíců“ je u čtrnáctiletého zásadní. */}
          <span className="text-amber-800">Chybí ti {bodu(chybi)} z jednotné přijímací zkoušky.</span>
        </p>
        {dalsiKriteria && (
          <p className="mt-1 text-sm text-slate-600">
            Škola bodovala i další věci, ale ani s nimi se v roce {rok} nikdo s nižším výsledkem přijímaček
            nedostal. Jinými body se tenhle rozdíl tehdy dohnat nepodařilo nikomu; je to popis roku {rok},
            ne pravidlo školy.
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="text-lg font-semibold text-amber-900">
      Jsi v rozmezí, kde se v roce {rok} {soutezilo > 0 ? `ze ${soutezilo} uchazečů dostalo ${prijato}` : 'rozhodovalo i něco jiného'}.
      <span className="block text-sm font-normal text-slate-600 mt-1">
        O zbytku rozhodla další kritéria školy.
      </span>
    </p>
  );
}

/** Jeden zadaný test: který termín a body z obou předmětů. */
export interface ZadanyTest { test: string; cj: string; ma: string }

const JINY = 'jiny';

/**
 * Klíč úložiště podle druhu a ročníku testu: výsledek pro 9. třídu platí pro všechny
 * čtyřleté obory; po přepnutí tabulek na jiný ročník testu se starý nepoužije.
 */
const klicUlozeni = (druh: DruhTestu, rokTestu: number | undefined) => `kde-stojim:testy:v1:${druh}:${rokTestu ?? 'bez-prevodu'}`;

function cislo(t: string): number | null {
  const n = Number(t.replace(',', '.'));
  return t.trim() && !Number.isNaN(n) && n >= 0 && n <= 50 ? n : null;
}

function nactiUlozene(klic: string): ZadanyTest[] | null {
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

export interface KdeStojimProps {
  data: PasmaPrijetiObor;
  /** Rok zobrazených pásem, z registru. */
  rok: number;
  /** Druh testu, který píší uchazeči o obor. */
  druh: DruhTestu;
  /** Převodní tabulky testů TAU pro tento druh; bez nich jen přímé body. */
  prevod: PrevodDruhu | null;
  pozice?: PoziceOboru | null;
  kriteria?: KriteriaOboru | null;
  /** Zobrazit sloupce rozdělení nad proužkem. */
  ukazRozdeleni?: boolean;
  /** Zadání testů rozbalené hned; na stránce oboru se rozbaluje tlačítkem. */
  vstupOtevreny?: boolean;
  /** Pamatovat si výsledky v prohlížeči (localStorage). */
  pamatovat?: boolean;
}

export function KdeStojim({
  data: d, rok, druh, prevod: prevodVstup, pozice, kriteria,
  ukazRozdeleni = true, vstupOtevreny = true, pamatovat = false,
}: KdeStojimProps) {
  // Pořadí useState drží test (tests/pasmovy-prouzek.test.mjs): 1 = testy, 2 = rozbalené zadání.
  const [testy, setTesty] = useState<ZadanyTest[]>(() => [{ test: '1-radny', cj: '', ma: '' }]);
  const [otevreno, setOtevreno] = useState(vstupOtevreny);
  const nacteno = useRef(false);
  const klic = klicUlozeni(druh, prevodVstup?.rok_testu);

  // Uložené výsledky se čtou až po hydrataci, server o nich neví.
  useEffect(() => {
    if (!pamatovat) return;
    const ulozene = nactiUlozene(klic);
    if (ulozene) {
      // Čtení až po hydrataci je záměr: v počátečním stavu by se server a prohlížeč rozešly.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTesty(ulozene);
      setOtevreno(true);
    }
  }, [pamatovat, klic]);

  useEffect(() => {
    if (!pamatovat) return;
    // První běh má ještě počáteční prázdné testy; zápis by smazal uložené dřív, než se načtou.
    if (!nacteno.current) {
      nacteno.current = true;
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

  const smazat = () => {
    try {
      window.localStorage.removeItem(klic);
    } catch {
      // viz výše
    }
    setTesty([{ test: prevod?.terminy[0]?.klic ?? JINY, cj: '', ma: '' }]);
  };

  // Tabulky převádějí na konkrétní rok; s pásmy jiného roku by číslo lhalo.
  const jinyRokCile = Boolean(prevodVstup && prevodVstup.rok_cile !== rok);
  const prevod = jinyRokCile ? null : prevodVstup;

  /** Každý vyplněný test převedený na body roku pásem; jiný test bez převodu. */
  const vysledky = useMemo(() => testy.map((t) => {
    const c = cislo(t.cj);
    const m = cislo(t.ma);
    if (c === null || m === null) return null;
    const termin = prevod?.terminy.find(x => x.klic === t.test);
    const soucet = c + m;
    return {
      soucet,
      prevedeno: termin ? prevedBody(termin.body_cil, soucet) : soucet,
      termin: termin ?? null,
    };
  }), [testy, prevod]);

  const platne = vysledky.filter((v): v is NonNullable<typeof v> => v !== null);
  const body = median(platne.map(v => v.prevedeno));
  const jenJiny = platne.length > 0 && platne.every(v => v.termin === null);
  const nespolehlivy = platne.some(v => v.termin && !v.termin.spolehlive);
  const ulozenoNeco = testy.some(t => t.cj.trim() || t.ma.trim());

  const zmen = (i: number, zmena: Partial<ZadanyTest>) =>
    setTesty(ts => ts.map((t, j) => (j === i ? { ...t, ...zmena } : t)));

  const lo = d.pasmo_nejistoty?.[0] ?? d.min_prijaty;
  const hi = d.pasmo_nejistoty?.[1];
  const poloha = urciPolohu(body, lo, hi);
  // Pásmo se nekreslí, když mezi hi a lo nikdo nebyl (hi < lo).
  const maPasmo = hi !== undefined && hi >= lo;
  const maxSoutezilo = Math.max(1, ...(d.pasma ?? []).map(p => p.soutezilo));

  return (
    <div className="space-y-5">
      <div>
        {ukazRozdeleni && d.pasma && (
          <p className="text-xs text-slate-500">
            Sloupce: kolik soutěžících uchazečů roku {rok}, tedy těch, kdo splnili požadavky školy a nedostali se
            na obor, který měli na přihlášce výš, mělo výsledek v daném rozmezí bodů. Tmavá část jsou ti,
            kdo se dostali. Po najetí myší uvidíš čísla.
          </p>
        )}
        {ukazRozdeleni && d.pasma && (
          <div className="relative mt-2 h-16">
            {d.pasma.map(p => {
              const x = naOsu(p.od);
              const w = naOsu(p.do) - naOsu(p.od);
              const vyska = (p.soutezilo / maxSoutezilo) * 100;
              const podil = p.soutezilo ? p.prijato / p.soutezilo : 0;
              return (
                <div
                  key={`${p.od}-${p.do}`}
                  className="absolute bottom-0"
                  style={{ left: `${x}%`, width: `${w}%`, height: `${vyska}%` }}
                  title={`${p.od}–${p.do} bodů: ${p.soutezilo} ${tvar(p.soutezilo, 'soutěžící', 'soutěžící', 'soutěžících')}, dostalo se ${p.prijato}`}
                  aria-label={`${p.od} až ${p.do} bodů: ${p.soutezilo} soutěžících, dostalo se ${p.prijato}`}
                >
                  <div className="mx-[1px] h-full rounded-t bg-slate-200">
                    {/* Podíl přijatých uvnitř sloupce, aby byl vidět přechod. */}
                    <div className="w-full rounded-t bg-slate-400" style={{ height: `${podil * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vlastní proužek */}
        <div className="relative mt-1 h-10 overflow-hidden rounded-lg bg-slate-200">
          {maPasmo && hi !== undefined && (
            <div
              className="absolute inset-y-0 bg-amber-200"
              style={{ left: `${naOsu(lo)}%`, width: `${naOsu(hi) - naOsu(lo)}%` }}
            />
          )}
          <div
            className="absolute inset-y-0 bg-green-200"
            style={{ left: `${naOsu(maPasmo && hi !== undefined ? hi : lo)}%`, right: 0 }}
          />
          {platne.length > 1 && (
            <div
              className="absolute bottom-1 h-1.5 rounded-full bg-slate-900/40"
              style={{
                left: `${naOsu(Math.min(...platne.map(v => v.prevedeno)))}%`,
                width: `${naOsu(Math.max(...platne.map(v => v.prevedeno))) - naOsu(Math.min(...platne.map(v => v.prevedeno)))}%`,
              }}
              title="Rozsah tvých výsledků"
            />
          )}
          {body !== null && (
            <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `${naOsu(body)}%` }}>
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                ty: {body}
              </span>
            </div>
          )}
        </div>

        {/* Legenda místo popisků nad zónami: u úzkého pásma se popisek nevejde. */}
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" /> nedostal se nikdo
          </li>
          {maPasmo && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" /> rozmezí, kde rozhodovalo i něco jiného
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-200" /> dostali se všichni
          </li>
        </ul>

        {/* Osa */}
        <div className="relative mt-1 h-5 text-xs tabular-nums text-slate-600">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2 font-semibold" style={{ left: `${naOsu(lo)}%` }}>{lo}</span>
          {maPasmo && hi !== undefined && hi !== lo && (
            <span className="absolute -translate-x-1/2 font-semibold" style={{ left: `${naOsu(hi)}%` }}>{hi}</span>
          )}
          <span className="absolute right-0">100</span>
        </div>
      </div>

      {!otevreno ? (
        <button
          type="button"
          onClick={() => setOtevreno(true)}
          className="rounded-lg border border-[#0074e4] px-4 py-2 text-sm font-semibold text-[#0074e4] hover:bg-blue-50"
        >
          Zadej výsledek testu a uvidíš, kde bys stál
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">
            Tvoje výsledky z cvičného testu, tedy testu z minulých přijímaček v aplikaci CERMAT TAU
            {prevod && (
              <span className="block font-normal text-slate-500">
                Nejpřesnější je test {prevod.rok_testu} pro {TRIDA_TAU[druh]}. třídu z aplikace{' '}
                <a href={`https://tau.cermat.cz/vyber.php?trida=${TRIDA_TAU[druh]}&predmet=cj`} className="underline" rel="noopener noreferrer" target="_blank">CERMAT TAU</a>
                {' '}(řádný termín): celý test, na čas (matematika 70 minut, čeština 60 minut), bez opravování, poprvé.
                Víc testů dá přesnější obrázek.
              </span>
            )}
          </p>
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
                    <option value={JINY}>Jiný test</option>
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
            {pamatovat && ulozenoNeco && (
              <button type="button" onClick={smazat} className="text-sm text-slate-500 underline">
                Smazat uložené výsledky
              </button>
            )}
          </div>
          {pamatovat && (
            <p className="text-xs text-slate-500">
              Výsledky si pamatuje jen tenhle prohlížeč, nikam je neposíláme. Platí pro všechny obory se stejným testem.
            </p>
          )}
          {platne.length > 1 && (
            <p className="text-sm text-slate-600">
              {platne.length === 2
                ? <>Na proužku je průměr obou výsledků ({bodu(body!)}).</>
                : <>Na proužku je prostřední z {platne.length} výsledků ({bodu(body!)}).</>}
              {' '}Výsledky se pohybují mezi {Math.min(...platne.map(v => v.prevedeno))} a {Math.max(...platne.map(v => v.prevedeno))} body;
              {' '}rozsah je na proužku vyznačený pod značkou.
            </p>
          )}
          {jinyRokCile && (
            <p className="text-sm text-amber-800">
              Převodní tabulky jsou spočítané pro rok {prevodVstup?.rok_cile}, pásma jsou z roku {rok}. Dokud se
              nepřepočítají, výsledky testů se porovnávají bez převodu.
            </p>
          )}
          {jenJiny && (
            <p className="text-sm text-amber-800">
              Jiný test neumíme převést. Srovnání platí jen tehdy, pokud je výsledek ze stejně těžkého testu,
              jako byla jednotná zkouška v roce {rok}.
            </p>
          )}
          {!jenJiny && platne.some(v => v.termin === null) && (
            <p className="text-sm text-amber-800">
              Výsledky z jiného testu jsou započítané bez převodu a srovnání s nimi nemusí být přesné.
            </p>
          )}
          {nespolehlivy && (
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
      )}

      {otevreno && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <Veta poloha={poloha} body={body} lo={lo} hi={hi} data={d} rok={rok} dalsiKriteria={Boolean(kriteria?.prepisy.some(x => x.rezim === 'jine'))} />
          {body !== null && pozice && (() => {
            const p = poradiMeziSoutezicimi(pozice, body);
            return (
              <p className="mt-3 text-sm text-slate-700">
                Mezi {p.celkem} soutěžícími uchazeči roku {rok}, tedy těmi, kdo splnili požadavky školy a nedostali se
                na obor, který měli na přihlášce výš, mělo vyšší výsledek <b>{p.vyssi}</b>
                {p.stejny > 0 ? <> a stejný {p.stejny}</> : null}. Přijato jich bylo {d.prijatych}.
              </p>
            );
          })()}
        </div>
      )}

      {kriteria && <Kriteria k={kriteria} />}

      {/* Výhrady patří na obrazovku, ne do dokumentace. */}
      <ul className="space-y-1 text-sm text-slate-500">
        <li>Popisuje 1. kolo roku {rok}. Není to hranice ani předpověď.</li>
        <li>Hranice se mezi ročníky posouvá i proto, že se mění obtížnost samotné zkoušky.</li>
        {d.vice_zamereni && <li>Údaje platí za celý obor školy, zdroj zaměření nerozlišuje.</li>}
        {d.talentova_zkouska && <li>O přijetí rozhoduje i talentová zkouška, o které data nemáme.</li>}
        {d.rozhodl_test !== undefined && d.rozhodl_test < 0.85 && (
          <li className="text-amber-800">
            O pořadí rozhodlo z velké části něco jiného než test — proužek je jen orientační.
          </li>
        )}
      </ul>
    </div>
  );
}
