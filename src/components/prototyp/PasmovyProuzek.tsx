'use client';

import { useMemo, useState } from 'react';
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

function Veta({ poloha, body, lo, hi, data }: {
  poloha: Poloha; body: number | null; lo: number; hi?: number; data: PasmaPrijetiObor;
}) {
  const soutezilo = data.pasmo_nejistoty_soutezilo ?? 0;
  const prijato = data.pasmo_nejistoty_prijato ?? 0;

  if (poloha === 'nezadano') {
    return (
      <p className="text-slate-600">
        Zadej svoje body a uvidíš, kam bys mezi loňské uchazeče padl.
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
          ? `Nad ${lo} bodů se loni dostali všichni; mezi ${hi} a ${lo} body nebyl nikdo.`
          : hi !== undefined
            ? `Nad ${hi} bodů se loni dostali všichni.`
            : `Nad ${lo} bodů se loni dostali všichni.`}
      </p>
    );
  }
  if (poloha === 'pod') {
    return (
      <p className="text-lg font-semibold text-slate-900">
        Pod {lo} bodů se loni nedostal nikdo.{' '}
        {/* Konkrétní cíl místo verdiktu: rozdíl mezi „nemáš na to“ a „chybí ti
            12 bodů, zbývá pět měsíců“ je u čtrnáctiletého zásadní. */}
        <span className="text-amber-800">Chybí ti {body !== null ? Math.round((lo - body) * 10) / 10 : 0} bodů.</span>
      </p>
    );
  }
  return (
    <p className="text-lg font-semibold text-amber-900">
      Jsi v rozmezí, kde se loni {soutezilo > 0 ? `ze ${soutezilo} uchazečů dostalo ${prijato}` : 'rozhodovalo i něco jiného'}.
      <span className="block text-sm font-normal text-slate-600 mt-1">
        O zbytku rozhodla další kritéria školy.
      </span>
    </p>
  );
}

export function PasmovyProuzek({ obory }: { obory: UkazkovyObor[] }) {
  const [vybrany, setVybrany] = useState(obory[0]?.id ?? '');
  const [cj, setCj] = useState('');
  const [ma, setMa] = useState('');
  const [ukazRozdeleni, setUkazRozdeleni] = useState(true);

  const obor = obory.find(o => o.id === vybrany) ?? obory[0];
  const body = useMemo(() => {
    const c = Number(cj.replace(',', '.'));
    const m = Number(ma.replace(',', '.'));
    if (!cj.trim() || !ma.trim() || Number.isNaN(c) || Number.isNaN(m)) return null;
    if (c < 0 || c > 50 || m < 0 || m > 50) return null;
    return c + m;
  }, [cj, ma]);

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
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Čeština</span>
          <input
            value={cj} onChange={e => setCj(e.target.value)} inputMode="decimal" placeholder="z 50"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Matematika</span>
          <input
            value={ma} onChange={e => setMa(e.target.value)} inputMode="decimal" placeholder="z 50"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={ukazRozdeleni} onChange={e => setUkazRozdeleni(e.target.checked)} />
          Ukázat rozdělení
        </label>
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
        <Veta poloha={poloha} body={body} lo={lo} hi={hi} data={d} />
      </div>

      {/* Výhrady patří na obrazovku, ne do dokumentace. */}
      <ul className="space-y-1 text-sm text-slate-500">
        <li>Popisuje 1. kolo roku, ze kterého data pocházejí. Není to hranice ani předpověď.</li>
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
