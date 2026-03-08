import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function GuidedJourneyLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-slate-50">
        {/* Breadcrumb skeleton */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Wizard skeleton */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8 space-y-4">
            <LoadingSkeleton className="h-8 w-64" />
            <LoadingSkeleton className="h-4 w-48" />
          </div>

          <div className="mb-8">
            <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse" />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <LoadingSkeleton className="h-6 w-48 mb-6" />
            <LoadingSkeleton className="h-32 w-full mb-4" />
            <LoadingSkeleton className="h-10 w-full" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
