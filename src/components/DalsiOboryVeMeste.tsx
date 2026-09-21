import type { DalsiOborVeMeste } from '@/lib/kontext-prihlasek';

/**
 * Obory ve městě, které hlavní přehled nevede.
 *
 * Přehled stojí na denním nezkráceném studiu s povinnou jednotnou zkouškou.
 * V některých městech tím vypadne většina nabídky — v Chomutově 55 %, v České
 * Lípě 52 % —, takže bez tohoto oddílu by rodina neviděla, co se tam dá studovat.
 *
 * Jsou to **jen názvy**. U oborů bez jednotné zkoušky žádné výsledky neexistují,
 * takže tu není a nesmí být obtížnost přijetí: obor bez dat se nesmí tvářit jako
 * snadný (`docs/zdroje-dat.md`, oddíl 4, past 4).
 */
export function DalsiOboryVeMeste({ obory }: { obory: DalsiOborVeMeste[] }) {
  if (obory.length === 0) return null;

  const bezZkousky = obory.filter(o => o.duvod === 'bez_zkousky');
  const jine = obory.filter(o => o.duvod === 'jiny');

  const podleSkoly = (seznam: DalsiOborVeMeste[]) => {
    const m = new Map<string, DalsiOborVeMeste[]>();
    for (const o of seznam) m.set(o.skola, [...(m.get(o.skola) ?? []), o]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'cs'));
  };

  return (
    <section>
      <h2 className="text-2xl font-bold mb-2">Další obory ve městě</h2>
      <p className="text-slate-600 mb-6 text-sm">
        Obory, u kterých se nekoná jednotná přijímací zkouška, nebo které náš přehled
        nevede. <b>Víme o nich jen název</b> — jak těžké bylo se na ně dostat, z dat
        zjistit nejde. Co škola opravdu otevírá a co k přijetí potřebuje, stojí
        v jejích kritériích.
      </p>

      {bezZkousky.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-1 font-semibold text-slate-900">
            Bez jednotné zkoušky ({bezZkousky.length})
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Učební obory s výučním listem a konzervatoře. O přijetí rozhoduje škola
            podle svých kritérií, jednotné testy se nepíšou.
          </p>
          <SeznamSkol skupiny={podleSkoly(bezZkousky)} />
        </div>
      )}

      {jine.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold text-slate-900">
            Mimo náš přehled ({jine.length})
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Jednotná zkouška se u nich koná, ale v našich datech o oborech nejsou —
            bývají to umělecké obory s talentovou zkouškou.
          </p>
          <SeznamSkol skupiny={podleSkoly(jine)} />
        </div>
      )}
    </section>
  );
}

function SeznamSkol({ skupiny }: { skupiny: [string, DalsiOborVeMeste[]][] }) {
  return (
    <div className="space-y-2">
      {skupiny.map(([skola, obory]) => (
        <div key={skola} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[15px] font-medium text-slate-900">{skola}</p>
          <p className="mt-0.5 text-[13px] text-slate-600">
            {obory.map(o => o.obor).sort((a, b) => a.localeCompare(b, 'cs')).join(' · ')}
          </p>
        </div>
      ))}
    </div>
  );
}
