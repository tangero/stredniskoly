'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Users, Target, AlertTriangle, Info } from 'lucide-react';
import type { School2026Data } from '@/lib/data';

interface Props {
  data2026: School2026Data[];
  totalKapacita2025: number;
  totalPrihlasky2025: number;
  singleProgram?: boolean;
}

export function Applications2026Banner({ data2026, totalKapacita2025, totalPrihlasky2025, singleProgram }: Props) {
  const totalPrihlasky2026 = data2026.reduce((sum, d) => sum + d.prihlasky, 0);
  const totalKapacita2026 = data2026.reduce((sum, d) => sum + d.kapacita, 0);
  const indexPoptavky2026 = totalKapacita2026 > 0 ? totalPrihlasky2026 / totalKapacita2026 : 0;

  // Detekce nových oborů a přejmenovaných zaměření
  const newPrograms = data2026.filter(d => d.is_new);
  const renamedPrograms = data2026.filter(d => d.prev_zamereni_name);
  const hasNewOnly = newPrograms.length === data2026.length;

  // Trend - jen pokud nejsou všechny obory nové (jinak srovnání nemá smysl)
  const prihlaskyChange = (totalPrihlasky2025 > 0 && !hasNewOnly)
    ? ((totalPrihlasky2026 - totalPrihlasky2025) / totalPrihlasky2025) * 100
    : 0;

  const trendUp = prihlaskyChange > 5;
  const trendDown = prihlaskyChange < -5;

  // Úroveň poptávky
  const demandColor = indexPoptavky2026 >= 4 ? 'text-red-600' :
                      indexPoptavky2026 >= 2.5 ? 'text-orange-600' :
                      indexPoptavky2026 >= 1.5 ? 'text-amber-600' :
                      'text-green-600';

  const demandBg = indexPoptavky2026 >= 4 ? 'bg-red-100' :
                   indexPoptavky2026 >= 2.5 ? 'bg-orange-100' :
                   indexPoptavky2026 >= 1.5 ? 'bg-amber-100' :
                   'bg-green-100';

  const demandLabel = indexPoptavky2026 >= 4 ? 'Velmi vysoká' :
                      indexPoptavky2026 >= 2.5 ? 'Vysoká' :
                      indexPoptavky2026 >= 1.5 ? 'Střední' :
                      'Nízká';

  // P1 přihlášky
  const totalP1 = data2026.reduce((sum, d) => sum + (d.prihlasky_priority?.[0] || 0), 0);

  const isOversubscribed = indexPoptavky2026 > 2;

  return (
    <div className="bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm mb-8">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-200" />
          <h3 className="font-semibold text-white text-sm">
            Přihlášky 2026 – 1. kolo
          </h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${demandBg} ${demandColor}`}>
          {demandLabel} konkurence
        </span>
      </div>

      {/* Stats */}
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Přihlášky */}
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{totalPrihlasky2026.toLocaleString('cs-CZ')}</div>
            <div className="text-xs text-slate-500 mb-1">Přihlášek 2026</div>
            {prihlaskyChange !== 0 && (
              <div className={`text-xs font-medium flex items-center justify-center gap-0.5 ${trendUp ? 'text-red-600' : trendDown ? 'text-green-600' : 'text-slate-500'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : trendDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {prihlaskyChange > 0 ? '+' : ''}{prihlaskyChange.toFixed(0)} % vs 2025
              </div>
            )}
          </div>

          {/* Kapacita */}
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{totalKapacita2026.toLocaleString('cs-CZ')}</div>
            <div className="text-xs text-slate-500 mb-1">Míst</div>
            <div className="text-xs text-slate-400">
              (2025: {totalKapacita2025})
            </div>
          </div>

          {/* Index poptávky */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${demandColor}`}>{indexPoptavky2026.toFixed(1)}×</div>
            <div className="text-xs text-slate-500 mb-1">Poptávka</div>
            <div className="text-xs text-slate-400">
              (přihlášek na místo)
            </div>
          </div>

          {/* P1 přihlášky */}
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalP1.toLocaleString('cs-CZ')}</div>
            <div className="text-xs text-slate-500 mb-1">Jako 1. volba</div>
            <div className="text-xs text-slate-400">
              ({totalKapacita2026 > 0 ? (totalP1 / totalKapacita2026).toFixed(1) : '—'}× kapacita)
            </div>
          </div>
        </div>

        {/* Varování při vysoké poptávce */}
        {isOversubscribed && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700">
              {indexPoptavky2026 >= 4
                ? 'Velmi vysoký zájem! Na tuto školu se hlásí výrazně více uchazečů, než kolik je míst. Důkladná příprava na přijímací zkoušky je klíčová.'
                : 'O tuto školu je zvýšený zájem. Doporučujeme mít záložní variantu a připravit se na přijímací zkoušky.'}
            </p>
          </div>
        )}

        {/* Informace o přejmenování zaměření */}
        {singleProgram && renamedPrograms.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm mt-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700">
              Tento obor se v roce 2025 jmenoval <strong>&bdquo;{renamedPrograms[0].prev_zamereni_name}&ldquo;</strong>.
              Historická data výše odpovídají tomuto oboru.
            </p>
          </div>
        )}

        {/* Info o novém oboru bez historie */}
        {singleProgram && hasNewOnly && (
          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg text-sm mt-3">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-slate-600">
              Tento obor je v roce 2026 nový &ndash; historická data z roku 2025 nejsou k dispozici.
              Srovnání s předchozím rokem proto nelze provést.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Data z{' '}
            <a href="https://data.cermat.cz" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">
              data.cermat.cz
            </a>
            . Kapacity se mohou měnit do 7. 5. 2026.
          </p>
          <Link
            href="/moje-sance"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Zjistit moje šance →
          </Link>
        </div>
      </div>
    </div>
  );
}
