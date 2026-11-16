import data from '@/data/kriteria-konzervatori-2027.json';
import { formatujDen } from '@/lib/veletrhy-pocty';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

type Cast = { nazev: string; maxBody: number | null; minimum: string | null };
type KriteriaOboru = { obor: string; zdroj: string | null; casti: Cast[]; podminka: string; poradi: string | null };
type Skola = {
  redizo: string; nazev: string; obec: string; obory: string[]; url: string | null; poznamka?: string;
  kriteria?: KriteriaOboru[]; kriteriaPoznamka?: string;
};

const cislo = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 });

function bodu(n: number): string {
  const text = cislo.format(n);
  if (!Number.isInteger(n)) return `${text} bodu`;
  if (n === 1) return '1 bod';
  if (n >= 2 && n <= 4) return `${text} body`;
  return `${text} bodů`;
}

function KriteriaSkoly({ skola }: { skola: Skola }) {
  if (!skola.kriteria?.length) {
    return skola.kriteriaPoznamka
      ? <p className="text-sm text-slate-500 mt-1">{skola.kriteriaPoznamka}</p>
      : null;
  }
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-sm font-semibold text-blue-700 underline underline-offset-4">
        Jak škola hodnotí talentovou zkoušku
      </summary>
      <div className="mt-2 space-y-3">
        {skola.kriteria.map((k) => (
          <div key={k.obor} className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-medium">{k.obor}</div>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {k.casti.map((c) => (
                <li key={c.nazev}>
                  {c.nazev}
                  {c.maxBody !== null && <span className="text-slate-600">: nejvýš {bodu(c.maxBody)}</span>}
                  {c.minimum && <span className="text-slate-600">{c.maxBody !== null ? ', ' : ': '}{c.minimum}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-1"><span className="text-slate-500">Kdy uspěje:</span> {k.podminka}</p>
            {k.poradi && <p><span className="text-slate-500">Pořadí:</span> {k.poradi}</p>}
            {k.zdroj && (
              <a href={k.zdroj} rel="noopener" className="text-blue-700 underline underline-offset-4 break-words">
                Dokument školy pro obor {k.obor}
              </a>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Kritéria přijetí konzervatoří pro nejbližší přijímací řízení (#504): odkaz na web školy a u části škol
 * zkontrolovaný strojový přepis (části talentové zkoušky, body, podmínka úspěchu, pořadí).
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
        U většiny škol jsme z jejich dokumentu vypsali, z čeho se skládá talentová zkouška, tedy zkouška nadání, kterou konzervatoř koná místo jednotné
        přijímací zkoušky, kolik bodů je potřeba
        a jak škola sestaví pořadí. Je to strojový přepis, který jsme zkontrolovali proti dokumentu školy; platí
        vždy znění školy.
      </p>
      <ul className="mt-4 divide-y divide-slate-100">
        {skoly.map((s) => (
          <li key={s.redizo} className="py-3">
            <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
              <div>
                <div className="font-medium">{s.nazev}<span className="text-slate-500 font-normal">, {s.obec}</span></div>
                {s.obory.length > 0 && <div className="text-sm text-slate-600">{s.obory.join(', ')}</div>}
                {s.poznamka && <div className="text-sm text-amber-800 mt-1">{s.poznamka}</div>}
              </div>
              {s.url
                ? <a href={s.url} rel="noopener" className="text-sm font-semibold text-blue-700 underline underline-offset-4 break-words">Kritéria na webu školy</a>
                : <span className="text-sm text-slate-500">nenalezeno</span>}
            </div>
            <KriteriaSkoly skola={s} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-3">
        Odkazy ověřeny <time dateTime={data.checkedAt}>{formatujDen(data.checkedAt)}</time>, přepis zkontrolován{' '}
        <time dateTime={data.prepis.zkontrolovano}>{formatujDen(data.prepis.zkontrolovano)}</time>. Škola může
        dokument později upravit; platí vždy znění na jejím webu a v DiPSy.
      </p>
    </div>
  );
}
