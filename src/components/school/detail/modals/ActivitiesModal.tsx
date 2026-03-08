'use client';

import { Modal } from '@/components/ui/Modal';
import type { SchoolInspisData } from '@/types/inspis';

interface ActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SchoolInspisData;
}

export function ActivitiesModal({ isOpen, onClose, data }: ActivitiesModalProps) {
  const categories = [
    {
      title: 'Sport',
      icon: '⚽',
      activities: data.sportovni_kurzy || [],
      color: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      title: 'Zájmové činnosti',
      icon: '🎨',
      activities: data.zajmove_cinnosti || [],
      color: 'bg-purple-50 border-purple-200 text-purple-700',
    },
    {
      title: 'Specifické akce',
      icon: '✨',
      activities: data.specificke_akce || [],
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      title: 'Mezinárodní spolupráce',
      icon: '🌍',
      activities: data.mezinarodni_spoluprace || [],
      color: 'bg-amber-50 border-amber-200 text-amber-700',
    },
  ].filter((cat) => cat.activities.length > 0);

  const totalActivities = categories.reduce((sum, cat) => sum + cat.activities.length, 0);

  if (totalActivities === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aktivity a zájmové kroužky" size="xl">
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-600 mb-1">Celkem aktivit</div>
          <div className="text-3xl font-bold text-slate-900">{totalActivities}</div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {categories.map((category, idx) => (
            <div key={idx}>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
                <span className="text-2xl">{category.icon}</span>
                {category.title} ({category.activities.length})
              </h3>

              <div className="flex flex-wrap gap-2">
                {category.activities.map((activity, actIdx) => (
                  <span key={actIdx} className={`px-3 py-1.5 rounded-full text-sm border ${category.color}`}>
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        {data.evropske_projekty !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-1">Evropské projekty</div>
            <p className="text-sm text-blue-800">{data.evropske_projekty ? 'Ano' : 'Ne'}</p>
          </div>
        )}

        {data.certifikaty && data.certifikaty.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-medium text-green-900 mb-2">🏆 Certifikáty</div>
            <div className="flex flex-wrap gap-2">
              {data.certifikaty.map((cert, idx) => (
                <span key={idx} className="text-sm text-green-800">
                  {cert}
                  {idx < data.certifikaty!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.skolni_parlament !== null && (
          <div className="text-sm text-slate-500 text-center pt-4 border-t border-slate-200">
            Školní parlament: <strong>{data.skolni_parlament ? 'Ano' : 'Ne'}</strong>
            {data.stipendium !== null && (
              <>
                {' • '}
                Stipendia: <strong>{data.stipendium ? 'Ano' : 'Ne'}</strong>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
