'use client';

import Link from 'next/link';
import { NAZEV_SKUPINY, type Skupina } from '@/lib/poloha-vuci-pasmu';
import { zkontrolujStrategii, type PravidlaPrihlasek } from '@/lib/strategie-prihlasek';

export interface PolozkaSeznamu {
  id: string;
  label: string;
  href?: string;
  skupina: Skupina | null;
  talentova: boolean;
}

interface Props {
  polozky: PolozkaSeznamu[];
  pravidla: PravidlaPrihlasek;
  /** Rok pásem 1. kola z registru. */
  rok: number;
  onMove: (id: string, smer: -1 | 1) => void;
  navrhyPojistky: Array<{ id: string; label: string; href?: string }>;
  onAdd: (id: string) => void;
}

const tlacitko = 'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-blue-600';

const prihlasekText = (n: number, talentove: boolean) =>
  `${n} ${n === 1 ? 'přihláška' : n >= 2 && n <= 4 ? 'přihlášky' : 'přihlášek'}${talentove ? ' na obory s talentovou zkouškou' : ' na obory bez talentové zkoušky'}`;

export function StrategiePrihlasek({ polozky, pravidla, rok, onMove, navrhyPojistky, onAdd }: Props) {
  if (!polozky.length) return null;
  const k = zkontrolujStrategii(polozky, pravidla);
  const vejdeSe = new Set([...k.vejdeSeBezne, ...k.vejdeSeTalentove]);
  // Pořadí na přihlášce je společné pro běžné i talentové obory: číslujeme v pořadí seznamu
  // jen ty, které se do přihlášky vejdou (talentový obor nahoře je 1. volba, běžný pod ním 2.).
  const poradi = new Map(polozky.filter(p => vejdeSe.has(p.id)).map((p, i) => [p.id, i + 1]));

  return (
    <section aria-labelledby="strategie" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="strategie" className="text-xl font-bold text-slate-900">2. Seřaď zvažované obory: tvoje pořadí a pojistka</h2>

      <div className="mt-2 max-w-3xl space-y-2 text-sm text-slate-700">
        <p>
          <strong>Nahoru dej obory, kam chceš nejvíc</strong>, i když jsi u nich v pásmu nebo pod ním.
          Pořadí na přihlášce šanci na přijetí nemění, škola řadí jen podle svých kritérií: podle bodů, ne podle toho,
          na kolikátém místě ji máš. Pořadí rozhoduje až tehdy, když tě přijme víc oborů; nastoupíš pak na ten, který máš výš.
          Vyšší ambice ti tedy u oboru níž neublíží.
        </p>
        <p>
          <strong>Přidej pojistku</strong>, tedy obor, kam se v 1. kole {rok} s tvým výsledkem dostali všichni soutěžící uchazeči
          (skupina „Nad pásmem“). Pokud to jde, přidej i obor ze skupiny „Obory, kde nikoho neodmítli“.
        </p>
        <p className="text-slate-600">
          Podle pravidel {pravidla.rok_pravidel} podáš v 1. kole {prihlasekText(pravidla.prihlasek_bezne, false)} a{' '}
          {prihlasekText(pravidla.prihlasek_talentove, true)}.
          {!pravidla.overeno_pro_rizeni && ' Počet pro nové řízení ještě ověřujeme v metodice MŠMT.'}{' '}
          Zvažovat můžeš víc oborů; tento seznam není přihláška.
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {polozky.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-lg border p-2 ${vejdeSe.has(p.id) ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50'}`}>
            <div className="flex shrink-0 gap-1">
              <button type="button" className={tlacitko} disabled={i === 0} onClick={() => onMove(p.id, -1)} aria-label={`Posunout výš: ${p.label}`}><span aria-hidden="true">↑</span></button>
              <button type="button" className={tlacitko} disabled={i === polozky.length - 1} onClick={() => onMove(p.id, 1)} aria-label={`Posunout níž: ${p.label}`}><span aria-hidden="true">↓</span></button>
            </div>
            <div className="min-w-0 flex-1">
              {p.href ? <Link href={p.href} className="block truncate text-sm font-medium text-slate-900 hover:underline">{p.label}</Link>
                : <p className="truncate text-sm font-medium text-slate-900">{p.label}</p>}
              <p className="text-xs text-slate-600">
                {poradi.has(p.id) ? `${poradi.get(p.id)}. na přihlášce` : 'Do přihlášky se nevejde'}
                {p.talentova ? ' · s talentovou zkouškou' : ''}
                {p.skupina ? ` · ${NAZEV_SKUPINY[p.skupina]}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 space-y-2 text-sm">
        {(k.navicBezne > 0 || k.navicTalentove > 0) && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
            Zvažuješ víc oborů, než kolik podáš přihlášek. To je v pořádku; do přihlášky se podle pravidel {pravidla.rok_pravidel} vejde
            prvních {pravidla.prihlasek_bezne} bez talentové zkoušky a {pravidla.prihlasek_talentove} s talentovou zkouškou.
          </p>
        )}
        {!k.znameSkupiny ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">
            Zadej výsledek cvičného testu v kroku 1 a ukážeme, jestli máš mezi prvními {pravidla.prihlasek_bezne} obory pojistku.
          </p>
        ) : k.maPojistku ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
            Pojistku máš: aspoň jeden obor v přihlášce je nad pásmem 1. kola {rok}.
            {!k.maNikdoNeodmitnut && ' Obor ze skupiny „Obory, kde nikoho neodmítli“ v přihlášce nemáš; přidej ho, pokud nějaký takový zvažuješ.'}
          </p>
        ) : (
          <div role="alert" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-amber-950">
            <p className="font-semibold">V přihlášce chybí pojistka.</p>
            <p className="mt-1">
              {k.pojistkaMimoPrihlasku
                ? `Obor nad pásmem 1. kola ${rok} zvažuješ, ale stojí až za ${pravidla.prihlasek_bezne}. místem. Posuň ho výš, jinak se do přihlášky nevejde.`
                : `Žádný z oborů, které se vejdou do přihlášky, není nad pásmem 1. kola ${rok}. Když tě nepřijmou nikam, čeká tě 2. kolo s obory, kde zbyla místa.`}
            </p>
            {!k.pojistkaMimoPrihlasku && navrhyPojistky.length > 0 && (
              <>
                <p className="mt-2">Nejbližší obory nad pásmem z tvého hledání:</p>
                <ul className="mt-1 space-y-1">
                  {navrhyPojistky.map(n => (
                    <li key={n.id} className="flex flex-wrap items-center gap-2">
                      {n.href ? <Link href={n.href} className="underline">{n.label}</Link> : <span>{n.label}</span>}
                      <button type="button" className="min-h-11 rounded-lg border border-amber-500 bg-white px-3 text-xs font-medium hover:bg-amber-100" onClick={() => onAdd(n.id)}>Přidat mezi zvažované</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Skupiny popisují 1. kolo {rok}, ne předpověď; hranice se mezi ročníky posouvá. Šanci na přijetí ani přiřazení ke škole nepočítáme.
        </p>
      </div>
    </section>
  );
}
