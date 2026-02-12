import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { BarChart3, Target } from "lucide-react";

interface CTAButton {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
}

interface CTASectionProps {
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction: {
    label: string;
    href: string;
  };
  className?: string;
}

export function CTASection({
  primaryAction,
  secondaryAction,
  className,
}: CTASectionProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className || ""}`}>
      {/* Primary CTA */}
      <Link
        href={primaryAction.href}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
      >
        <BarChart3 className="w-5 h-5" />
        {primaryAction.label}
      </Link>

      {/* Secondary CTA */}
      <Link
        href={secondaryAction.href}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
      >
        <Target className="w-5 h-5" />
        {secondaryAction.label}
      </Link>
    </div>
  );
}
