'use client';

import { Modal } from '@/components/ui/Modal';

interface TestDifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  extendedStats: any;
}

export function TestDifficultyModal({ isOpen, onClose, extendedStats }: TestDifficultyModalProps) {
  if (!extendedStats) return null;

  const cjPrumer = extendedStats.cj_prumer || 0;
  const maPrumer = extendedStats.ma_prumer || 0;
  const cjAtJpzMin = extendedStats.cj_at_jpz_min || 0;
  const maAtJpzMin = extendedStats.ma_at_jpz_min || 0;
  const jpzMin = extendedStats.jpz_min || 0;

  const getCategoryLabel = (value: number) => {
    if (value > 65) return 'Lehčí';
    if (value > 50) return 'Střední';
    return 'Těžší';
  };

  const getCategoryColor = (value: number) => {
    if (value > 65) return 'text-green-600';
    if (value > 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Náročnost přijímaček" size="lg">
      <div className="space-y-8">
        {/* Český jazyk */}
        {cjPrumer > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Český jazyk</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-500 mb-1">Průměr</div>
                <div className="text-3xl font-bold text-slate-900">{Math.round(cjPrumer)}/100</div>
                <div className={`text-sm font-medium mt-1 ${getCategoryColor(cjPrumer)}`}>
                  {getCategoryLabel(cjPrumer)}
                </div>
              </div>

              {cjAtJpzMin > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">Min. přijatého</div>
                  <div className="text-3xl font-bold text-slate-900">{Math.round(cjAtJpzMin)}/100</div>
                  <div className="text-sm text-slate-500 mt-1">U studenta s min. body</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
              <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 transition-all"
                  style={{ width: `${cjPrumer}%` }}
                />
                {cjAtJpzMin > 0 && (
                  <div
                    className="absolute top-0 h-full w-1 bg-red-500"
                    style={{ left: `${cjAtJpzMin}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Matematika */}
        {maPrumer > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Matematika</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-500 mb-1">Průměr</div>
                <div className="text-3xl font-bold text-slate-900">{Math.round(maPrumer)}/100</div>
                <div className={`text-sm font-medium mt-1 ${getCategoryColor(maPrumer)}`}>
                  {getCategoryLabel(maPrumer)}
                </div>
              </div>

              {maAtJpzMin > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">Min. přijatého</div>
                  <div className="text-3xl font-bold text-slate-900">{Math.round(maAtJpzMin)}/100</div>
                  <div className="text-sm text-slate-500 mt-1">U studenta s min. body</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
              <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 transition-all"
                  style={{ width: `${maPrumer}%` }}
                />
                {maAtJpzMin > 0 && (
                  <div
                    className="absolute top-0 h-full w-1 bg-red-500"
                    style={{ left: `${maAtJpzMin}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Insight */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-medium text-blue-900 mb-2">💡 Tip</div>
          <p className="text-sm text-blue-800">
            {maPrumer < cjPrumer
              ? 'Matematika je klíčová - je těžší než český jazyk. Zaměřte přípravu především na matematiku.'
              : cjPrumer < maPrumer
              ? 'Český jazyk je klíčový - je těžší než matematika. Zaměřte přípravu především na český jazyk.'
              : 'Oba předměty mají podobnou náročnost. Připravujte se na oba rovnoměrně.'}
          </p>
        </div>

        {jpzMin > 0 && (
          <div className="text-sm text-slate-500 text-center">
            Minimální body na této škole: <strong>{jpzMin}</strong>
          </div>
        )}
      </div>
    </Modal>
  );
}
