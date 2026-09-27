'use client';

import { useMemo, useState } from 'react';
import { median, prevedBody, type PrevodTestu } from '@/lib/prevod-testu-vypocet';
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

function Veta({ poloha, body, lo, hi, data, rok }: {
  poloha: Poloha; body: number | null; lo: number; hi?: number; data: PasmaPrijetiObor; rok: number;
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
    return (
      <p className="text-lg font-semibold text-slate-900">
        Pod {lo} bodů se v roce {rok} nedostal nikdo.{' '}
        {/* Konkrétní cíl místo verdiktu: rozdíl mezi „nemáš na to“ a „chybí ti
            12 bodů, zbývá pět měsíců“ je u čtrnáctiletého zásadní. */}
        <span className="text-amber-800">Chybí ti {body !== null ? Math.round((lo - body) * 10) / 10 : 0} bodů.</span>
      </p>
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
            Na proužku je prostřední z {platne.length} výsledků ({body} bodů).
            {' '}Výsledky se pohybují mezi {Math.min(...platne.map(v => v.prevedeno))} a {Math.max(...platne.map(v => v.prevedeno))} body.
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
          <div className="relative h-16">
            {d.pasma.map(p => {
              const x = naOsu(p.od);
              const w = naOsu(p.do) - naOsu(p.od);
              const vyska = (p.soutezilo / maxSoutezilo) * 100;
              const podil = p.soutezilo ? p.prijato / p.soutezilo : 0;
              return (
                <div key={`${p.od}-${p.do}`} className="absolute bottom-0" style={{ left: `${x}%`, width: `${w}%`, height: `${vyska}%` }}>
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
        <Veta poloha={poloha} body={body} lo={lo} hi={hi} data={d} rok={rok} />
      </div>

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
