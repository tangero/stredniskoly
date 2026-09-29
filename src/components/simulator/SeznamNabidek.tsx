'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  NAZEV_SKUPINY, PORADI_SKUPIN, popisSkupiny, rozdelDoSkupin, vetaPolohy,
  type Poloha, type RadekPasma, type Skupina,
} from '@/lib/poloha-vuci-pasmu';

export interface NabidkaSimulatoru {
  id: string;
  slug: string;
  href?: string;
  nazev: string;
  program: string;
  obec: string;
  zamereni?: string;
}

interface Props {
  nabidky: NabidkaSimulatoru[];
  /** Poloha podle nejhoršího výsledku; null = uchazeč test nezadal, skupiny se neukazují. */
  poloha: ((n: NabidkaSimulatoru) => Poloha) | null;
  radek: (n: NabidkaSimulatoru) => RadekPasma | undefined;
  minuty: (n: NabidkaSimulatoru) => number | undefined;
  rok: number;
  rokKriterii: number | null;
  minPrijatych: number;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  /** Kolik nabídek ukázat v každé skupině na začátku. */
  naStranku?: number;
}

const tlacitko = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600';

const BARVA: Record<Skupina, string> = {
  nad: 'border-emerald-500',
  v: 'border-amber-500',
  pod: 'border-rose-500',
  nikdo_neodmitnut: 'border-sky-500',
  bez_srovnani: 'border-slate-300',
};

function Karta({ n, veta, props }: { n: NabidkaSimulatoru; veta: string | null; props: Props }) {
  const r = props.radek(n);
  const min = props.minuty(n);
  const ulozeno = props.isSaved(n.id);
  const odkaz = n.href ?? `/skola/${n.slug}`;
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={odkaz} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline">{n.nazev}</Link>
          <p className="text-sm text-slate-700">{n.program}</p>
          <p className="text-xs text-slate-500">{n.obec}{min !== undefined ? ` · ${min} min dojezd` : ''}</p>
        </div>
        <button
          type="button" onClick={() => props.onToggleSave(n.id)} aria-pressed={ulozeno}
          aria-label={`${ulozeno ? 'Odebrat z výběru' : 'Uložit do výběru'}: ${n.program}, ${n.nazev}`}
          className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border text-lg focus-visible:outline-2 focus-visible:outline-blue-600 ${ulozeno ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-blue-500 hover:text-blue-700'}`}
        ><span aria-hidden="true">{ulozeno ? '★' : '☆'}</span></button>
      </div>
      {veta && <p className="mt-2 text-sm text-slate-800">{veta}</p>}
      {veta && n.zamereni && <p className="mt-1 text-xs text-slate-500">Data 1. kola neznají zaměření; údaj platí za celý obor školy.</p>}
      {r?.extra_body === true && props.rokKriterii !== null && (
        <p className="mt-2 inline-block rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
          O přijetí rozhodují i extra body <span className="font-normal">(podle kritérií {props.rokKriterii})</span>
        </p>
      )}
      <p className="mt-2 text-sm"><Link href={odkaz} className="text-blue-700 underline">Podrobně na stránce oboru</Link></p>
    </li>
  );
}

function Seznam({ polozky, veta, props, klic }: { polozky: NabidkaSimulatoru[]; veta: (n: NabidkaSimulatoru) => string | null; props: Props; klic: string }) {
  const krok = props.naStranku ?? 20;
  const [pocet, setPocet] = useState(krok);
  return <>
    <ul className="mt-3 grid gap-3">{polozky.slice(0, pocet).map(n => <Karta key={`${klic}:${n.id}`} n={n} veta={veta(n)} props={props} />)}</ul>
    {polozky.length > pocet && <button type="button" className={`${tlacitko} mt-3`} onClick={() => setPocet(pocet + krok)}>Dalších {Math.min(krok, polozky.length - pocet)} z {polozky.length - pocet}</button>}
  </>;
}

/** Seznam nabídek simulátoru: se zadaným testem ve skupinách podle polohy vůči pásmu, bez něj jeden seznam. */
export function SeznamNabidek(props: Props) {
  const { nabidky, poloha, rok, minPrijatych } = props;
  if (!poloha) return <Seznam polozky={nabidky} veta={() => null} props={props} klic="vse" />;
  const skupiny = rozdelDoSkupin(nabidky, poloha);
  return <div className="grid gap-8">
    {PORADI_SKUPIN.map(s => {
      const polozky = skupiny.get(s)!;
      if (!polozky.length) return null;
      const obsah = <>
        <p className="mt-1 text-sm text-slate-600">{popisSkupiny(s, rok)}</p>
        <Seznam polozky={polozky} veta={n => vetaPolohy(poloha(n), rok, minPrijatych)} props={props} klic={s} />
      </>;
      const nadpis = `${NAZEV_SKUPINY[s]} (${polozky.length})`;
      return s === 'bez_srovnani'
        ? <details key={s} className={`border-l-4 pl-4 ${BARVA[s]}`}><summary className="cursor-pointer text-lg font-semibold">{nadpis}</summary>{obsah}</details>
        : <section key={s} aria-label={NAZEV_SKUPINY[s]} className={`border-l-4 pl-4 ${BARVA[s]}`}><h3 className="text-lg font-semibold">{nadpis}</h3>{obsah}</section>;
    })}
  </div>;
}
