import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";

interface CSISummaryCardProps {
  summary: string;
  reportUrl: string;
  className?: string;
}

export function CSISummaryCard({
  summary,
  reportUrl,
  className,
}: CSISummaryCardProps) {
  return (
    <div className={`bg-blue-50 p-6 rounded-xl border border-blue-100 ${className || ""}`}>
      <div className="flex items-start gap-3 mb-3">
        <MessageCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <h2 className="text-xl font-semibold text-blue-900">
          Co říká Školní inspekce
        </h2>
      </div>

      <blockquote className="text-blue-700 italic leading-relaxed mb-4">
        "{summary}"
      </blockquote>

      <Link
        href={reportUrl}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
      >
        Celá zpráva
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
