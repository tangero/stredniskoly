import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabContentSkeleton } from '@/components/ui/LoadingSkeleton';

export default function DetailLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb skeleton */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Hero skeleton */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white py-8">
          <div className="max-w-6xl mx-auto px-4 space-y-4">
            <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
            <div className="h-8 w-64 bg-white/20 rounded animate-pulse" />
            <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-40 bg-white/20 rounded animate-pulse" />
            <div className="flex gap-4">
              <div className="h-16 w-32 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-16 w-32 bg-white/20 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 -mx-4 px-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          </div>

          <div className="py-8">
            <TabContentSkeleton />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
