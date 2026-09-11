'use client';

import type { ExtendedSchoolStats, SchoolProgram } from '@/lib/data';
import { AdmissionScoreValue } from '@/components/AdmissionScoreValue';

interface StatsTabProps {
  program: Pick<SchoolProgram, 'prihlasky'>;
  extendedStats: ExtendedSchoolStats | null;
}

function count(value: number | undefined): string {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value.toLocaleString('cs-CZ') : 'Údaj není k dispozici';
}

export function StatsTab({ program, extendedStats }: StatsTabProps) {
  const priorities = extendedStats ? Array.from({
    length: Math.max(extendedStats.prihlasky_priority.length, extendedStats.prijati_priority.length),
  }, (_, index) => ({
    applied: extendedStats.prihlasky_priority[index],
    accepted: extendedStats.prijati_priority[index],
  })) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Historické údaje 2025</h3>
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
        <p className="mt-4 text-sm text-slate-600">Historická data nejsou podmínkami přijímacího řízení 2027 ani odhadem vašeho přijetí.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
            <p className="mt-4 text-sm text-slate-600">Počty popisují výsledek minulého řízení. Nevyjadřují osobní šanci na přijetí. Rozhodují podmínky konkrétního oboru; priorita určuje pořadí vašich preferencí.</p>
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
