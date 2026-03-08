'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BodySimulator } from './steps/BodySimulator';
import { PrioritySelector } from './steps/PrioritySelector';
import { LocationChecker } from './steps/LocationChecker';
import { CostCalculator } from './steps/CostCalculator';
import { PersonalizedResults } from './results/PersonalizedResults';

interface GuidedJourneyWizardProps {
  school: any;
  program: any;
  extendedStats: any;
  overviewSlug: string;
  slug: string;
}

type Step = 'body' | 'priorities' | 'location' | 'cost' | 'results';

interface WizardData {
  userBody: number;
  bodyBreakdown?: { cj: number; ma: number };
  selectedPriorities: string[];
  locationAcceptable: 'yes' | 'maybe' | 'no' | null;
  budget: number;
}

export function GuidedJourneyWizard({ school, program, extendedStats, overviewSlug, slug }: GuidedJourneyWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('body');
  const [wizardData, setWizardData] = useState<WizardData>({
    userBody: 0,
    selectedPriorities: [],
    locationAcceptable: null,
    budget: 0,
  });

  const handleBodySubmit = (body: number, breakdown?: { cj: number; ma: number }) => {
    setWizardData({ ...wizardData, userBody: body, bodyBreakdown: breakdown });
    setCurrentStep('priorities');
  };

  const handlePrioritiesSubmit = (priorities: string[]) => {
    setWizardData({ ...wizardData, selectedPriorities: priorities });
    setCurrentStep('location');
  };

  const handleLocationSubmit = (acceptable: 'yes' | 'maybe' | 'no') => {
    setWizardData({ ...wizardData, locationAcceptable: acceptable });
    setCurrentStep('cost');
  };

  const handleCostSubmit = (budget: number) => {
    setWizardData({ ...wizardData, budget });
    setCurrentStep('results');
  };

  const handleBack = () => {
    const steps: Step[] = ['body', 'priorities', 'location', 'cost', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const stepProgress = {
    body: 25,
    priorities: 50,
    location: 75,
    cost: 100,
    results: 100,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Je {school.nazev} pro mě?</h1>
        <p className="text-slate-600">{program.obor}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${stepProgress[currentStep]}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-slate-600 text-center">{stepProgress[currentStep]}% hotovo</div>
      </div>

      {/* Back button (except on first step and results) */}
      {currentStep !== 'body' && currentStep !== 'results' && (
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </button>
      )}

      {/* Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        {currentStep === 'body' && <BodySimulator program={program} onSubmit={handleBodySubmit} />}

        {currentStep === 'priorities' && <PrioritySelector onSubmit={handlePrioritiesSubmit} />}

        {currentStep === 'location' && <LocationChecker school={school} onSubmit={handleLocationSubmit} />}

        {currentStep === 'cost' && <CostCalculator school={school} program={program} onSubmit={handleCostSubmit} />}

        {currentStep === 'results' && (
          <PersonalizedResults school={school} program={program} extendedStats={extendedStats} data={wizardData} overviewSlug={overviewSlug} slug={slug} />
        )}
      </div>
    </div>
  );
}
