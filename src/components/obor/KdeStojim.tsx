'use client';

import { useState } from 'react';
import { tvar } from '@/lib/cesky-tvar';
import {
  poradiMeziSoutezicimi,
  type DruhTestu, type KriteriaOboru, type PoziceOboru, type PrevodDruhu,
} from '@/lib/prevod-testu-vypocet';
import { bodu, NavodTau, nazevDoporucenehoTerminu, useZadaneTesty, ZadaniTestu } from './ZadaniTestu';
import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';
import { extraBody, srazka } from '@/lib/extra-body';

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

export { extraBody, srazka } from '@/lib/extra-body';
export type { ZadanyTest } from './ZadaniTestu';

/** Jediná odlišnost od prostého součtu je bodování přijímaček (váha, maxima); jiné body nejsou. */
function jenVazeniJpz(p: KriteriaOboru['prepisy'][number]): boolean {
  return p.jpz_navic.length > 0 && !p.chybi_slozky && p.slozky.every(x => x.max === 0);
}

/**
 * Blok kritérií jen tam, kde nerozhodovala jen JPZ (rozhodnutí zadavatele
 * 28. 9. 2026). U „jen JPZ“ jedna věta, bez přepisu nic.
 */
/** Blok kritérií; u zadání školy pro nové řízení ukazuje to (i mimo proužek, například na oboru bez pásma). */
export function BlokKriterii({ kriteria }: { kriteria: KriteriaOboru }) {
  return <Kriteria k={kriteria.nove ? { rok: kriteria.nove.rok, pdf: kriteria.pdf, prepisy: kriteria.nove.prepisy, noveKriteria: null, noveRizeni: true } : kriteria} />;
}

function Kriteria({ k }: { k: KriteriaOboru }) {
  // U víc zaměření ukázat to, které boduje i něco dalšího; jinak první.
  const p = k.prepisy.find(x => x.rezim === 'jine' || x.jpz_navic.length > 0 || x.chybi_slozky) ?? k.prepisy[0];
  if (!p) return null;
  const odSkoly = p.prepis === 'skola';
  // Původ se posuzuje přes všechna zaměření: jedno potvrzené nesmí zakrýt přepis ostatních.
  const vsechnySkola = k.prepisy.every(x => x.prepis === 'skola');
  const zamereniSkoly = k.prepisy.filter(x => x.prepis === 'skola').map(x => x.zamereni || 'bez zaměření');
  const smiseny = zamereniSkoly.length > 0 && !vsechnySkola;
  const vyhradaPrepisu = k.prepisy.find(x => x.prepis !== 'skola');
  const smisenyText = smiseny
    ? <>Podle údajů školy je zaměření {zamereniSkoly.join(', ')}; ostatní zaměření jsou z přepisu PDF. </>
    : null;
  // Škola zadala kritéria pro nové řízení: nic se „teprve nevyhlásí“ a mluví se v přítomném čase.
  const nove = Boolean(k.noveRizeni);
  const noveRizeni = nove ? null : (
    <>Kritéria pro nové přijímací řízení se teprve vyhlásí{k.noveKriteria ? `; školy je zveřejní ${k.noveKriteria}` : ''}.</>
  );
  const zdroj = odSkoly ? 'podle údajů školy' : 'podle PDF';
  const puvod = vsechnySkola ? (
    <p className="text-slate-600">
      Podle údajů školy, které škola sama zadala.
      {p.odkaz && /^https?:\/\//i.test(p.odkaz) && <> <a href={p.odkaz} className="text-blue-700 underline" rel="noopener noreferrer" target="_blank">Kritéria na webu školy</a>.</>}
    </p>
  ) : (
    <p className="text-amber-800">
      {smisenyText}
      {vyhradaPrepisu?.prepis === 'strojovy' ? 'Přepsal to z PDF počítač a může obsahovat chybu: při kontrole vzorku byl podstatně chybný zhruba každý desátý přepis.' : 'Přepsáno ručně z PDF a může obsahovat chybu.'}
      {k.prepisy.some(x => x.prepis !== 'skola' && x.nalezy.length > 0) && ` ${NALEZ_TEXT}`} Ověřte si to v kritériích školy.
    </p>
  );
  if (jenPrijimacky(k)) {
    return (
      <p className="text-sm text-slate-600">
        {nove
          ? <>Podle kritérií {k.rok}, tedy pravidel, podle kterých škola v roce {k.rok} řadí uchazeče, přijímá škola podle jednotné přijímací zkoušky.</>
          : <>Podle kritérií {k.rok}, tedy pravidel, podle kterých škola v roce {k.rok} řadila uchazeče, škola přijímala podle jednotné přijímací zkoušky.</>}
        {' '}{noveRizeni}{' '}
        {vsechnySkola
          ? <span>Podle údajů školy.</span>
          : <span className="text-amber-800">
              {smisenyText}
              {vyhradaPrepisu?.prepis === 'strojovy' ? 'Přepsal to z PDF počítač a může obsahovat chybu.' : 'Přepsáno ručně z PDF a může obsahovat chybu.'}
              {k.prepisy.some(x => x.prepis !== 'skola' && x.nalezy.length > 0) && ` ${NALEZ_TEXT}`} Ověřte si to v kritériích školy.
            </span>}
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5 text-sm text-slate-700">
      {extraBody(p) && (
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950">
          <span aria-hidden="true">★</span> O přijetí rozhodují i extra body
        </p>
      )}
      <h3 className="text-lg font-bold text-[#16325c]">{nove ? `Co kromě přijímaček rozhoduje v roce ${k.rok}` : `Co kromě přijímaček rozhodovalo v roce ${k.rok}`}</h3>
      {extraBody(p) && (
        <p className="font-medium text-slate-800">
          V roce {k.rok} o pořadí {nove ? 'rozhodují' : 'rozhodovaly'} i extra body, tedy body za něco jiného než jednotnou přijímací
          zkoušku, například za prospěch ze základní školy nebo školní přijímací zkoušku. Podle kritérií se
          mohly přičítat i odečítat.
        </p>
      )}
      <p className="text-slate-500">
        {nove
          ? <>Kritéria {k.rok}, tedy pravidla, podle kterých škola v roce {k.rok} řadí uchazeče.</>
          : <>Kritéria {k.rok}, tedy pravidla, podle kterých škola v roce {k.rok} řadila uchazeče; pro nové přijímací řízení platí nová.</>}
      </p>
      {p.jpz_navic.length > 0 && (
        <>
          <p>Přijímačky ale {zdroj} {nove ? 'nepočítá' : 'nepočítala'} prostým součtem, takže pořadí se od součtu na proužku může lišit (podrobnosti v kritériích školy):</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.jpz_navic.map((x, i) => (
              <li key={i}>{x.nazev}</li>
            ))}
          </ul>
        </>
      )}
      {p.rezim === 'jine' && !jenVazeniJpz(p) && (
        <>
          <p>
            {p.chybi_slozky
              ? (odSkoly
                ? <>Kromě přijímaček škola boduje i další věci{p.popis ? "; popsala je slovně níže" : ", podrobnosti neuvedla"}. </>
                : <>Kromě přijímaček škola podle PDF bodovala i další věci (například prospěch nebo pohovor), náš přepis je ale nezachytil. </>)
              : p.slozky.length > 0 && p.slozky.filter(x => x.max !== 0).every(srazka)
                ? <>Kromě přijímaček škola {zdroj} strhávala body jen za chování. </>
              : p.podil_jpz_pct !== null
                ? <>Přijímačky tvořily asi <b>{p.podil_jpz_pct} %</b> bodů. </>
                : <>Kromě přijímaček škola bodovala i další věci; {odSkoly ? 'jejich maxima škola neuvedla všechna' : 'jejich váhu jsme z PDF nepřečetli celou'}. </>}
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
      {odSkoly && p.popis && <p className="whitespace-pre-line">{p.popis}</p>}
      {k.prepisy.length > 1 && <p className="text-slate-500">Obor má víc zaměření a kritéria se mezi nimi můžou lišit; ukazujeme {p.zamereni ? `zaměření ${p.zamereni}` : 'jedno z nich'}.</p>}
      {puvod}
      {noveRizeni && <p className="text-slate-500">{noveRizeni} Až budou, doplníme je.</p>}
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
  // Pořadí useState drží test (tests/pasmovy-prouzek.test.mjs): 1 = testy (v hooku), 2 = rozbalené zadání.
  const stav = useZadaneTesty({ druh, prevod: prevodVstup, rok, pamatovat });
  const [rozbaleno, setOtevreno] = useState(vstupOtevreny);
  // Uložené výsledky zadání rozbalí samy.
  const otevreno = rozbaleno || stav.nactenoZUlozeni;
  const { prevod, platne, body } = stav;

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
      ) : null}
      {!otevreno && prevod && (
        <NavodTau druh={druh} rokTestu={prevod.rok_testu} termin={nazevDoporucenehoTerminu(prevod)} />
      )}
      {otevreno && (
        <ZadaniTestu
          stav={stav} druh={druh} rok={rok} prevodVstup={prevodVstup} pamatovat={pamatovat}
          poznamkaRozsahu="rozsah je na proužku vyznačený pod značkou."
        />
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

      {kriteria && <BlokKriterii kriteria={kriteria} />}

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
