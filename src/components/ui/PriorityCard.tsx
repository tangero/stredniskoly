import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Priority = "high" | "medium" | "low";

interface PriorityCardProps {
  priority: Priority;
  icon: LucideIcon;
  metric: string;
  value: string | number;
  trend?: string;
  description?: string;
  className?: string;
}

const priorityConfig = {
  high: {
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  medium: {
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  low: {
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function PriorityCard({
  priority,
  icon: Icon,
  metric,
  value,
  trend,
  description,
  className,
}: PriorityCardProps) {
  const config = priorityConfig[priority];

  return (
    <div
      className={cn(
        "p-6 rounded-xl border-2 transition-all duration-300",
        config.bgColor,
        config.borderColor,
        "hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon className={cn("w-12 h-12", config.iconColor)} />
        {trend && (
          <span className="text-sm font-medium text-slate-600">{trend}</span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-600">{metric}</p>
        <p className="text-4xl font-bold text-slate-900">{value}</p>
        {description && (
          <p className="text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
