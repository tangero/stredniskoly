import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCompactProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  context?: string;
  className?: string;
}

export function StatCompact({
  icon: Icon,
  label,
  value,
  context,
  className,
}: StatCompactProps) {
  return (
    <div
      className={cn(
        "p-4 bg-slate-50 rounded-lg text-center",
        className
      )}
    >
      {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-slate-400" />}
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {context && (
        <p className="text-xs text-slate-400 mt-1">{context}</p>
      )}
    </div>
  );
}
