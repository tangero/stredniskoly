'use client';

import type { ExtendedSchoolStats, SchoolProgram, School2026Data, SchoolResult } from '@/lib/data';
import { AdmissionScoreValue } from '@/components/AdmissionScoreValue';

interface StatsTabProps {
  program: Pick<SchoolProgram, 'prihlasky' | 'kapacita' | 'prijati' | 'rok' | 'nevypsano_2026'>;
  extendedStats: ExtendedSchoolStats | null;
  /** Nabídka v 1. kole 2026, pokud ji škola letos vypsala. */
  data2026?: School2026Data;
  /** Výsledky 1. kola 2026 pro tuto nabídku. */
  result2026?: SchoolResult;
  /** Údaje z roku 2025 pro srovnání vývoje mezi ročníky. */
  data2025?: { prihlasky?: number; kapacita?: number; prijati?: number };
}

function count(value: number | undefined | null): string {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value.toLocaleString('cs-CZ') : 'Údaj není k dispozici';
}

function perMisto(prihlasky?: number, kapacita?: number): string | null {
  if (!prihlasky || !kapacita) return null;
  return `${(prihlasky / kapacita).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}×`;
}

/** Řádek srovnání dvou ročníků; chybějící údaj se nedopočítává. */
function Radek({ label, r2025, r2026 }: {
  label: string; r2025: string | null; r2026: string | null;
}) {
  if (!r2025 && !r2026) return null;
  return (
    <tr className="border-t border-slate-100">
      <th scope="row" className="py-2 font-normal text-slate-600">{label}</th>
      <td className="py-2 text-right tabular-nums">{r2025 ?? '—'}</td>
      <td className="py-2 text-right font-semibold tabular-nums">{r2026 ?? '—'}</td>
    </tr>
  );
}

export function StatsTab({ program, extendedStats, data2026, result2026, data2025 }: StatsTabProps) {
  // Čísla záznamu patří ročníku, ze kterého pocházejí. Nadpis proto nesmí být
  // napevno loňský: u nabídky, kterou škola letos nevypsala, jsou údaje loňské,
  // u ostatních letošní.
  const rokUdaju = program.rok ?? 2025;
  const priorities = extendedStats ? Array.from({
    length: Math.max(extendedStats.prihlasky_priority.length, extendedStats.prijati_priority.length),
  }, (_, index) => ({
    applied: extendedStats.prihlasky_priority[index],
    accepted: extendedStats.prijati_priority[index],
  })) : [];

  // Přihlášky podle priority za rok 2026 CERMAT zveřejňuje, přijaté podle priority ne.
  const priority2026 = data2026?.prihlasky_priority?.filter(v => typeof v === 'number') ?? [];
  const kontext = data2026?.admission_context;
  const prijati2026 = kontext?.accepted ?? result2026?.prijati;

  // Srovnání ročníků má smysl jen tam, kde jsou obě strany.
  const srovnani = data2026 && data2025 ? {
    prihlasky: [data2025.prihlasky, data2026.prihlasky] as const,
    kapacita: [data2025.kapacita, data2026.kapacita] as const,
    prijati: [data2025.prijati, prijati2026] as const,
  } : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Údaje z přijímacího řízení {rokUdaju}</h3>
        <dl className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-600">Počet přihlášek</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900">{count(program.prihlasky)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Hranice přijetí</dt>
            <dd className="mt-1 text-sm text-slate-700">Nemáme ověřené minimum pro přijetí.</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-600">
          {program.nevypsano_2026
            ? `Obor se v roce 2026 nevypisoval, proto jsou uvedená čísla z roku ${rokUdaju}. `
            : ''}
          Údaje z minulých řízení nejsou podmínkami přijímacího řízení 2027 ani odhadem vašeho přijetí.
        </p>
      </div>

      {srovnani && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Srovnání ročníků 2025 a 2026</h3>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-left text-sm">
              <thead><tr className="text-slate-600">
                <th scope="col" className="pb-2 font-medium">Údaj</th>
                <th scope="col" className="pb-2 text-right font-medium">2025</th>
                <th scope="col" className="pb-2 text-right font-medium">2026</th>
              </tr></thead>
              <tbody>
                <Radek label="Přihlášky celkem"
                  r2025={srovnani.prihlasky[0] ? count(srovnani.prihlasky[0]) : null}
                  r2026={srovnani.prihlasky[1] ? count(srovnani.prihlasky[1]) : null} />
                <Radek label="Kapacita míst"
                  r2025={srovnani.kapacita[0] ? count(srovnani.kapacita[0]) : null}
                  r2026={srovnani.kapacita[1] ? count(srovnani.kapacita[1]) : null} />
                <Radek label="Přijatí"
                  r2025={srovnani.prijati[0] ? count(srovnani.prijati[0]) : null}
                  r2026={srovnani.prijati[1] ? count(srovnani.prijati[1]) : null} />
                <Radek label="Přihlášky na místo"
                  r2025={perMisto(srovnani.prihlasky[0], srovnani.kapacita[0])}
                  r2026={perMisto(srovnani.prihlasky[1], srovnani.kapacita[1])} />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-600">Srovnání popisuje, jak se nabídka a zájem vyvíjely mezi ročníky. Nevypovídá o podmínkách přijímacího řízení 2027 ani o vaší šanci na přijetí.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {priority2026.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Přihlášky podle priority · 2026</h3>
            <table className="mt-4 w-full text-left text-sm">
              <thead><tr className="text-slate-600">
                <th scope="col" className="pb-2 font-medium">Priorita</th>
                <th scope="col" className="pb-2 text-right font-medium">Přihlášky</th>
              </tr></thead>
              <tbody>{priority2026.map((applied, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <th scope="row" className="py-2 font-normal">{index + 1}.</th>
                  <td className="py-2 text-right tabular-nums">{count(applied)}</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="mt-4 text-sm text-slate-600">
              Kolik uchazečů si obor zapsalo jako první, druhou a další volbu.
              {prijati2026 !== undefined && ` Přijato bylo ${count(prijati2026)} uchazečů.`}
              {' '}Kolik přijatých mělo kterou prioritu, CERMAT za rok 2026 nezveřejňuje.
            </p>
          </div>
        )}

        {result2026 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Průměrné výsledky JPZ · 2026</h3>
            <dl className="mt-4 space-y-3">
              {([
                ['Český jazyk', result2026.cj_prijati],
                ['Matematika', result2026.ma_prijati],
              ] as const).map(([label, hodnota]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-sm text-slate-600">{label}</dt>
                  <dd className="text-lg font-semibold text-slate-900">
                    {typeof hodnota === 'number'
                      ? `${hodnota.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} / 50 bodů`
                      : 'Údaj není k dispozici'}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-slate-600">Průměr přijatých uchazečů v 1. kole 2026 na standardní škále testu. Nevypovídá o obtížnosti testu ani o hranici přijetí.</p>
          </div>
        )}

        {priorities.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Přihlášky a přijatí podle priority · 2025</h3>
            <table className="mt-4 w-full text-left text-sm">
              <thead><tr className="text-slate-600">
                <th scope="col" className="pb-2 font-medium">Priorita</th>
                <th scope="col" className="pb-2 text-right font-medium">Přihlášky</th>
                <th scope="col" className="pb-2 text-right font-medium">Přijatí</th>
              </tr></thead>
              <tbody>{priorities.map((priority, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <th scope="row" className="py-2 font-normal">{index + 1}.</th>
                  <td className="py-2 text-right tabular-nums">{count(priority.applied)}</td>
                  <td className="py-2 text-right tabular-nums">{count(priority.accepted)}</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="mt-4 text-sm text-slate-600">Počty popisují výsledek řízení v roce 2025. Nevyjadřují osobní šanci na přijetí. Rozhodují podmínky konkrétního oboru; priorita určuje pořadí vašich preferencí.</p>
          </div>
        )}

        {extendedStats && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Průměrné výsledky JPZ · 2025</h3>
            <dl className="mt-4 space-y-3">
              {([
                ['Český jazyk', extendedStats.subjectAverages.cj],
                ['Matematika', extendedStats.subjectAverages.ma],
              ] as const).map(([label, score]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-sm text-slate-600">{label}</dt>
                  <dd className="text-lg font-semibold text-slate-900"><AdmissionScoreValue score={score} /></dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-slate-600">Průměr z historického importu vyjádřený na standardní škále testu. Nevypovídá o obtížnosti testu ani o hranici přijetí.</p>
            <details className="mt-4 text-sm text-slate-600">
              <summary className="cursor-pointer text-blue-700">Zdroj a způsob přepočtu</summary>
              <p className="mt-2">Zdroj: schools_data.json, ročník 2025. Procentní skór dělíme dvěma a zaokrouhlujeme na desetinu bodu. Vymezení skupiny a počet osob nejsou v tomto importu doloženy; proto údaj neoznačujeme za průměr přijatých.</p>
              <ul className="mt-2 space-y-1">
                {Object.values(extendedStats.subjectAverages).map(score => (
                  <li key={score.sourceField}>{score.sourceField}: {score.sourceValue === null ? 'chybí' : `${score.sourceValue.toLocaleString('cs-CZ')} % maxima`}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
