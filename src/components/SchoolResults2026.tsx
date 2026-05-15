import Link from 'next/link';
import type { SchoolResult } from '@/lib/data';

interface Props {
  results: SchoolResult[];
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (Math.abs(delta) < 1) return <span className="text-slate-400 text-xs">≈ stejné jako loni</span>;
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{delta.toFixed(1)} vs 2025
    </span>
  );
}

function RankBar({ rank, total, schoolType }: { rank: number; total: number; schoolType: string }) {
  const pct = Math.round((1 - (rank - 1) / total) * 100);
  const label = rank === 1 ? '#1' : `#${rank}`;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Pořadí v {schoolType}</span>
        <span className="font-semibold text-slate-700">{label} z {total} škol</span>
      </div>
      <div className="bg-slate-100 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SchoolResult }) {
  const typeLabel: Record<string, string> = {
    GY4: 'gymnázií 4letých', GY6: 'gymnázií 6letých', GY8: 'gymnázií 8letých',
    LYC: 'lyceí', SOS: 'SOŠ', SOU: 'SOU', NAS: 'nástaveb',
  };
  return (
    <div className="border border-emerald-200 rounded-xl overflow-hidden">
      <div className="bg-emerald-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="font-semibold text-white text-sm">
            Výsledky přijímacích zkoušek 2026
            {result.zamereni && <span className="font-normal text-emerald-200 ml-1">— {result.zamereni}</span>}
          </h3>
        </div>
      </div>

      <div className="p-5 bg-white">
        <div className="flex items-end gap-4 mb-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Průměr ČJ+MA — přijatí</div>
            <div className="text-4xl font-black text-emerald-700 leading-none">
              {result.cj_ma_prijati.toFixed(1)}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={result.delta_cj_ma} />
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">{result.cj_prijati.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Český jazyk</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-700">{result.ma_prijati.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Matematika</div>
            </div>
          </div>
        </div>

        {result.rank_in_type && result.type_total && (
          <RankBar
            rank={result.rank_in_type}
            total={result.type_total}
            schoolType={typeLabel[result.school_type] ?? result.school_type}
          />
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Data:{' '}
            <a href="https://data.cermat.cz" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">
              CERMAT
            </a>
            {' '}· přijato {result.prijati} z {result.kapacita} míst
          </p>
          <Link href="/vysledky-2026" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Výsledky všech škol →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SchoolResults2026({ results }: Props) {
  if (!results || results.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 mb-8">
      {results.map((r, i) => (
        <ResultCard key={`${r.kkov}-${r.zamereni}-${i}`} result={r} />
      ))}
    </div>
  );
}
