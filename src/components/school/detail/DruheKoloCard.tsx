import type { DruheKoloNabidky } from '@/lib/druhe-kolo';
import { vetyDruhehoKola, VYSVETLENI_DRUHEHO_KOLA } from '@/lib/druhe-kolo-vyklad';

interface DruheKoloCardProps {
  data: DruheKoloNabidky | null;
}

/** Starší podoba stránky oboru (bez souhrnu 1. kola); věty sdílí s novými stránkami přes druhe-kolo-vyklad. */
export function DruheKoloCard({ data }: DruheKoloCardProps) {
  if (!data) return null;
  const v = vetyDruhehoKola(data);
  return (
    <section className="my-6 rounded-xl bg-white p-6">
      <h2 className="font-semibold text-lg">Druhé kolo · {data.rok}</h2>
      <div className="mt-3 space-y-2 text-slate-800">
        <p>{v.hlavni}</p>
        {v.doplnky.map(d => <p key={d}>{d}</p>)}
      </div>
      {v.predchozi && <p className="mt-3 text-slate-700">{v.predchozi}</p>}
      <p className="mt-4 text-sm text-slate-500">{VYSVETLENI_DRUHEHO_KOLA}</p>
    </section>
  );
}
