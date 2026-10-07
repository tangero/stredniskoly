import type { MistaSkupiny } from '@/lib/smery-studia';
import { pocetMist } from '@/lib/skola-vyklad';

/**
 * Souhrn Místa podle druhu studia (slovník ukazatelů) v záhlaví stránky města a kraje: kolik míst
 * školy v území vypsaly v 1. kole, rozdělených do čtyř skupin přepínače v pevném pořadí (rozhodnutí
 * vlastníka 6. 10. 2026, issue #244). Pruh je jen ilustrace; čísla nese seznam pod ním.
 */
const BARVY: Record<MistaSkupiny['id'], string> = {
  maturita: '#ffffff',
  vyucni: '#f2c66d',
  po_vyuceni: '#9fc0ec',
  ostatni: '#7f93b3',
};

const fmt = (n: number) => n.toLocaleString('cs-CZ');

function podil(mista: number, celkem: number): string {
  const p = (mista / celkem) * 100;
  return p < 1 ? 'méně než 1 %' : `${Math.round(p)} %`;
}

export function MistaPodleDruhu({ skupiny, celkem, bezUdaje, rok }: {
  skupiny: MistaSkupiny[]; celkem: number; bezUdaje: number; rok: number | null;
}) {
  if (celkem <= 0) return null;
  return (
    <div className="mt-5 max-w-3xl">
      <h2 className="text-[15px] font-semibold text-white">
        Místa v 1. kole{rok ? ` ${rok}` : ''} podle toho, čím studium končí: {pocetMist(celkem, fmt)}
      </h2>
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-white/15" aria-hidden="true">
        {skupiny.map(s => (
          <span key={s.id} style={{ width: `${(s.mista / celkem) * 100}%`, backgroundColor: BARVY[s.id] }} className="h-full" />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-[#dbe5f3]">
        {skupiny.map(s => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: BARVY[s.id] }} aria-hidden="true" />
            <span>{s.nazev} <b className="font-semibold text-white">{fmt(s.mista)}</b> ({podil(s.mista, celkem)})</span>
          </li>
        ))}
      </ul>
      {bezUdaje > 0 && (
        <p className="mt-1 text-[13px] text-[#c3d3ea]">
          U {fmt(bezUdaje)} {bezUdaje === 1 ? 'oboru' : 'oborů'} počet míst neznáme, v součtu nejsou.
        </p>
      )}
    </div>
  );
}
