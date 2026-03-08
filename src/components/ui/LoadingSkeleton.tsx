import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'button';
  count?: number;
}

export function LoadingSkeleton({ className, variant = 'text', count = 1 }: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200 rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    card: 'h-32 w-full',
    circle: 'h-12 w-12 rounded-full',
    button: 'h-10 w-32',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={cn(baseClasses, variantClasses[variant], className)} />
      ))}
    </>
  );
}

// Card skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <LoadingSkeleton variant="text" className="w-1/3" />
          <LoadingSkeleton variant="text" count={3} />
        </div>
      ))}
    </>
  );
}

// Tab content skeleton
export function TabContentSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <CardSkeleton count={4} />
      </div>
    </div>
  );
}
