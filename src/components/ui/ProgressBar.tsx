import { cn } from "@/lib/utils";

type ProgressColor = "green" | "amber" | "red" | "blue";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: ProgressColor;
  showValue?: boolean;
  className?: string;
}

const colorClasses: Record<ProgressColor, string> = {
  green: "bg-green-600",
  amber: "bg-amber-600",
  red: "bg-red-600",
  blue: "bg-blue-600",
};

export function ProgressBar({
  value,
  max,
  label,
  color = "blue",
  showValue = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-slate-600">{label}</span>}
          {showValue && (
            <span className="font-medium text-slate-900">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
