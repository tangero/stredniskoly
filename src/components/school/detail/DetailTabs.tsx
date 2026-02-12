'use client';

import { useState } from 'react';
import { BarChart3, Target, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tab komponenty (budou implementovány)
import { StatsTab } from './tabs/StatsTab';
import { CompetitionTab } from './tabs/CompetitionTab';
import { SchoolTab } from './tabs/SchoolTab';
import { PracticalTab } from './tabs/PracticalTab';

interface DetailTabsProps {
  school: any;
  program: any;
  programs: any[];
  schoolDetail: any;
  extendedStats: any;
  csiData: any;
  extractions: any[];
  inspis: any;
  overviewSlug: string;
}

type TabId = 'stats' | 'competition' | 'school' | 'practical';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'stats', label: 'Statistiky', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'competition', label: 'Konkurence', icon: <Target className="w-4 h-4" /> },
  { id: 'school', label: 'Škola', icon: <Building2 className="w-4 h-4" /> },
  { id: 'practical', label: 'Praktické', icon: <MapPin className="w-4 h-4" /> },
];

export function DetailTabs({
  school,
  program,
  programs,
  schoolDetail,
  extendedStats,
  csiData,
  extractions,
  inspis,
  overviewSlug,
}: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Sticky tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 -mx-4 px-4">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="py-8">
        {activeTab === 'stats' && (
          <StatsTab
            school={school}
            program={program}
            extendedStats={extendedStats}
          />
        )}

        {activeTab === 'competition' && (
          <CompetitionTab
            school={school}
            program={program}
            schoolDetail={schoolDetail}
          />
        )}

        {activeTab === 'school' && (
          <SchoolTab
            school={school}
            inspis={inspis}
            extractions={extractions}
            csiData={csiData}
            overviewSlug={overviewSlug}
          />
        )}

        {activeTab === 'practical' && (
          <PracticalTab school={school} inspis={inspis} />
        )}
      </div>
    </div>
  );
}
