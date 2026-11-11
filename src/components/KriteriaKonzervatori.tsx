import data from '@/data/kriteria-konzervatori-2027.json';
import { formatujDen } from '@/lib/veletrhy-pocty';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

type Skola = { redizo: string; nazev: string; obec: string; obory: string[]; url: string | null; poznamka?: string };

/**
 * Odkazy na kritéria přijetí konzervatoří pro nejbližší přijímací řízení (#504). Jen odkazy na web školy,
 * žádné body ani přepis: ten naváže v další etapě zkušebního běhu.
 */
export async function KriteriaKonzervatori() {
  const skoly = data.skoly as Skola[];
  // Období určuje registr datových sad, ne soubor s odkazy.
  const skolniRok = await zobrazeneObdobi('kriteria-konzervatori-odkazy');
  return (
    <div id="kriteria-konzervatori" className="mt-6 rounded-xl border border-slate-200 bg-white p-5 scroll-mt-24">
      <h3 className="font-semibold text-lg">Kritéria přijetí konzervatoří pro školní rok {skolniRok}</h3>
      <p className="text-sm text-slate-600 mt-1">
        Kritéria přijetí, tedy pravidla, podle kterých škola uchazeče řadí, vyhlašuje každá konzervatoř na svém webu.
        Odkazy vedou na stránku nebo dokument školy; obsah talentové zkoušky a bodování si přečti tam.
      </p>
      <ul className="mt-4 divide-y divide-slate-100">
        {skoly.map((s) => (
          <li key={s.redizo} className="py-3 grid gap-1 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
            <div>
              <div className="font-medium">{s.nazev}<span className="text-slate-500 font-normal">, {s.obec}</span></div>
              {s.obory.length > 0 && <div className="text-sm text-slate-600">{s.obory.join(', ')}</div>}
              {s.poznamka && <div className="text-sm text-amber-800 mt-1">{s.poznamka}</div>}
            </div>
            {s.url
              ? <a href={s.url} rel="noopener" className="text-sm font-semibold text-blue-700 underline underline-offset-4 break-words">Kritéria na webu školy</a>
              : <span className="text-sm text-slate-500">nenalezeno</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-3">
        Odkazy ověřeny <time dateTime={data.checkedAt}>{formatujDen(data.checkedAt)}</time>. Škola může dokument
        později upravit; platí vždy znění na jejím webu a v DiPSy.
      </p>
    </div>
  );
}
