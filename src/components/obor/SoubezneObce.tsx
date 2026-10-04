import type { SoubezneObce } from '@/lib/okruhy-oboru';

/**
 * Obsah bloku „Které další obory v okolí uchazeči také volí“ na stránce oboru (issue #277, etapa 2b):
 * souhrn po obcích (*Souběžné přihlášky podle obce*). Obory s aspoň 10 společnými uchazeči ukazuje
 * blok „Obory výš a níž na přihlášce“; tady jde o zájem rozptýlený do více oborů téže obce.
 * Pojmy: docs/slovnik-pojmu.md („v okolí“ podle přihlášek, ne podle vzdálenosti).
 */
export function SoubezneObceObsah({ data }: { data: SoubezneObce }) {
  return (
    <>
      <p className="text-[15px] leading-relaxed text-slate-600">
        Obory, které měli na přihlášce i uchazeči tohoto oboru, bez ohledu na to, ve které obci leží. „V okolí“ znamená podle přihlášek uchazečů, ne podle vzdálenosti. Tabulka ukazuje, jaká část uchazečů tohoto oboru měla v 1. kole {data.rok} na přihlášce i jiný obor v dané obci.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-left text-[13px] text-slate-500">
              <th className="py-2 pr-3 font-semibold">Obec</th>
              <th className="py-2 pl-3 text-right font-semibold">Uchazečů s oborem i v této obci</th>
            </tr>
          </thead>
          <tbody>
            {data.obce.map((o) => (
              <tr key={o.obec} className="border-t border-slate-100">
                <td className="py-2 pr-3 font-semibold text-slate-900">{o.obec}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{Math.round(o.podil * 100)}&nbsp;%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-500">
        Data o uchazečích 1. kola {data.rok}. Jeden uchazeč mohl mít obory ve více obcích, proto se podíly nesčítají. Obec uvádíme, jen když v ní i mimo ni bylo aspoň 10 uchazečů tohoto oboru
        {data.potlaceno > 0 ? '; některé další obce neuvádíme, protože by z nich šlo dopočítat malou skupinu uchazečů' : ''}. Neříká, kam uchazeči nastoupili, ani jak dopadnete vy.
      </p>
    </>
  );
}
