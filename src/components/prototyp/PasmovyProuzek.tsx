'use client';

import { useMemo, useState } from 'react';
import { tvar } from '@/lib/cesky-tvar';
import {
  median, poradiMeziSoutezicimi, prevedBody,
  type KriteriaOboru, type PoziceOboru, type PrevodTestu,
} from '@/lib/prevod-testu-vypocet';
import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';

// ============================================================================
// Prototyp pásmového proužku (docs/navrh-pasmovy-prouzek-2027.md).
//
// Ukazuje, kam by uchazeč se svými body padl mezi loňské uchazeče o obor.
// Nahrazuje dnešní porovnání s průměrem přijatých, které nezná rozptyl:
// dva obory se stejným průměrem mají pásmo nejistoty 2 body a 44 bodů.
// ============================================================================

export interface UkazkovyObor {
  id: string;
  nazev: string;
  obec: string;
  obor: string;
  data: PasmaPrijetiObor;
  /** Rozdělení výsledků soutěžících; jen u vybraného oboru. */
  pozice?: PoziceOboru | null;
  /** Kritéria předchozího ročníku z PDF v DiPSy; jen u vybraného oboru. */
  kriteria?: KriteriaOboru | null;
}

const NALEZ_TEXT = 'Při kontrole se přepis v něčem neshodl s PDF.';

function Kriteria({ k }: { k: KriteriaOboru }) {
  const p = k.prepisy[0];
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
      <h3 className="text-base font-semibold text-slate-900">Co kromě přijímaček rozhodovalo v roce {k.rok}</h3>
      {!p ? (
        <p>
          {k.pdf
            ? `Kritéria školy z roku ${k.rok} máme jako PDF, ale zatím jsme je nepřepsali.`
            : `Kritéria školy z roku ${k.rok} nemáme.`}{' '}
          Najdete je v <a href="https://www.dipsy.cz/" className="underline" rel="noopener noreferrer" target="_blank">DiPSy</a> u nabídky oboru.
        </p>
      ) : p.rezim === 'pouze_jpz' ? (
        <p>Podle kritérií {k.rok} škola bodovala <b>jen přijímačky</b> (češtinu a matematiku).</p>
      ) : null}
      {p && p.jpz_navic.length > 0 && (
        <>
          <p>Přijímačky ale nepočítala prostým součtem, takže pořadí se od součtu na proužku může lišit:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.jpz_navic.map((x, i) => (
              <li key={i}>{x.nazev}{x.max !== null ? `: až ${x.max} bodů navíc` : ''}</li>
            ))}
          </ul>
        </>
      )}
      {p && p.rezim === 'jine' && (
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
      {p && p.minima.length > 0 && <div>
          <p>Minimální podmínky:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {p.minima.map((m, i) => <li key={i}>{m.replace(/\.$/, '')}</li>)}
          </ul>
        </div>}
      {p && k.prepisy.length > 1 && <p className="text-slate-500">Obor má víc zaměření; ukazujeme první z nich.</p>}
      {p && (
        <p className="text-amber-800">
          {p.prepis === 'strojovy' ? 'Přepsal to z PDF počítač a může obsahovat chybu: při kontrole vzorku byl podstatně chybný zhruba každý desátý přepis.' : 'Přepsáno ručně z PDF a může obsahovat chybu.'}
          {p.nalezy.length > 0 && ` ${NALEZ_TEXT}`} Ověřte si to v kritériích školy.
        </p>
      )}
      <p className="text-slate-500">
        Pro nové přijímací řízení platí nová kritéria{k.noveKriteria ? `; školy je zveřejní ${k.noveKriteria}` : ''}.
        Až budou, doplníme je.
      </p>
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
            nedostal. Tenhle rozdíl se tedy dohánět jinými body nedal, musí přijít z testu.
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
interface ZadanyTest { test: string; cj: string; ma: string }

const JINY = 'jiny';

function cislo(t: string): number | null {
  const n = Number(t.replace(',', '.'));
  return t.trim() && !Number.isNaN(n) && n >= 0 && n <= 50 ? n : null;
}

export function PasmovyProuzek({ obory, rok, prevod: prevodTestu, vybranyObor }: {
  obory: UkazkovyObor[];
  /** Rok zobrazených pásem, z registru. */
  rok: number;
  /** Převodní tabulky testů TAU; bez nich jen přímé body. */
  prevod: PrevodTestu | null;
  vybranyObor?: string;
}) {
  const [vybrany, setVybrany] = useState(vybranyObor ?? obory[0]?.id ?? '');
  const [testy, setTesty] = useState<ZadanyTest[]>([
    { test: prevodTestu?.terminy[0]?.klic ?? JINY, cj: '', ma: '' },
  ]);
  const [ukazRozdeleni, setUkazRozdeleni] = useState(true);

  const obor = obory.find(o => o.id === vybrany) ?? obory[0];
  // Víceletá gymnázia píší jiné testy než čtyřleté, převodní tabulky pro ně neplatí.
  const vicelete = obor ? /-K\/(61|81)$/.test(obor.id) : false;
  const prevod = vicelete ? null : prevodTestu;

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

  const zmen = (i: number, zmena: Partial<ZadanyTest>) =>
    setTesty(ts => ts.map((t, j) => (j === i ? { ...t, ...zmena } : t)));

  if (!obor) return <p>Žádná ukázková data.</p>;
  const d = obor.data;
  const lo = d.pasmo_nejistoty?.[0] ?? d.min_prijaty;
  const hi = d.pasmo_nejistoty?.[1];
  const poloha = urciPolohu(body, lo, hi);
  // Pásmo se nekreslí, když mezi hi a lo nikdo nebyl (hi < lo).
  const maPasmo = hi !== undefined && hi >= lo;
  const maxSoutezilo = Math.max(1, ...(d.pasma ?? []).map(p => p.soutezilo));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-slate-50 p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Obor</span>
          <select
            value={vybrany}
            onChange={e => setVybrany(e.target.value)}
            className="w-80 rounded-lg border border-slate-300 px-3 py-2"
          >
            {obory.map(o => (
              <option key={o.id} value={o.id}>
                {o.nazev} · {o.obec}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={ukazRozdeleni} onChange={e => setUkazRozdeleni(e.target.checked)} />
          Ukázat rozdělení
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-700">
          Tvoje výsledky z testů
          {prevod && (
            <span className="block font-normal text-slate-500">
              Nejpřesnější je test {prevod.rok_testu} z aplikace{' '}
              <a href="https://tau.cermat.cz/vyber.php?trida=9&predmet=cj" className="underline" rel="noopener noreferrer" target="_blank">CERMAT TAU</a>
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
                <select value={t.test} onChange={e => zmen(i, { test: e.target.value })} className="w-64 rounded-lg border border-slate-300 px-3 py-2">
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
        <button
          type="button"
          onClick={() => setTesty(ts => [...ts, { test: prevod?.terminy[1]?.klic ?? JINY, cj: '', ma: '' }])}
          className="text-sm font-medium text-blue-700 underline"
        >
          + přidat další test
        </button>
        {platne.length > 1 && (
          <p className="text-sm text-slate-600">
            {platne.length === 2
              ? <>Na proužku je průměr obou výsledků ({bodu(body!)}).</>
              : <>Na proužku je prostřední z {platne.length} výsledků ({bodu(body!)}).</>}
            {' '}Výsledky se pohybují mezi {Math.min(...platne.map(v => v.prevedeno))} a {Math.max(...platne.map(v => v.prevedeno))} body;
            {' '}rozsah je na proužku vyznačený pod značkou.
          </p>
        )}
        {vicelete && (
          <p className="text-sm text-amber-800">
            Víceleté gymnázium: jeho uchazeči píší jiné testy než čtyřleté obory, a ty zatím převádět neumíme.
            Zadej body z testu pro víceletá gymnázia; porovnají se bez převodu.
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
            Převod: kolik uchazečů mělo v ostrém termínu testu horší výsledek, a kolik bodů měl uchazeč na stejném místě v roce {rok}.
            Doma a bez stresu se obvykle píše o něco lépe, převedený výsledek proto spíš nadhodnocuje.
          </p>
        )}
      </div>

      <div>
        <p className="text-sm text-slate-500">
          {obor.obor} · {obor.nazev}, {obor.obec}
        </p>

        <div className="mt-6" />
        {/* Sloupce rozdělení: kolik uchazečů v pásmu bylo a kolik se jich dostalo */}
        {ukazRozdeleni && d.pasma && (
          <p className="text-xs text-slate-500">
            Sloupce: kolik soutěžících uchazečů roku {rok} mělo výsledek v daném rozmezí bodů. Tmavá část jsou ti,
            kdo se dostali. Po najetí myší uvidíš čísla.
          </p>
        )}
        {ukazRozdeleni && d.pasma && (
          <div className="relative h-16">
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

        {/* Legenda místo popisků nad zónami: u úzkého pásma se popisek nevejde
            a zrovna úzké pásmo je ten nejzajímavější případ. Legenda drží
            výklad barev nezávisle na šířce zón i na šířce obrazovky. */}
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" /> nedostal se nikdo
          </li>
          {maPasmo && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" /> rozhodovalo i něco jiného
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

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Veta poloha={poloha} body={body} lo={lo} hi={hi} data={d} rok={rok} dalsiKriteria={obor.kriteria?.prepisy[0]?.rezim === 'jine'} />
        {body !== null && obor.pozice && (() => {
          const p = poradiMeziSoutezicimi(obor.pozice, body);
          return (
            <p className="mt-3 text-sm text-slate-700">
              Mezi {p.celkem} soutěžícími uchazeči roku {rok}, tedy těmi, kdo splnili požadavky školy a nedostali se
              na obor, který měli na přihlášce výš, mělo vyšší výsledek <b>{p.vyssi}</b>
              {p.stejny > 0 ? <> a stejný {p.stejny}</> : null}. Přijato jich bylo {d.prijatych}.
            </p>
          );
        })()}
      </div>

      {obor.kriteria && <Kriteria k={obor.kriteria} />}

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
