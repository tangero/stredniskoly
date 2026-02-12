import { StatCompact } from "@/components/ui/StatCompact";
import { Trophy, Users, DollarSign, Globe, Bus, BookOpen } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface QuickFact {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

interface QuickFactsCardProps {
  facts: QuickFact[];
  className?: string;
}

// Default ikony podle typu
const defaultIcons: Record<string, LucideIcon> = {
  "Min. body": Trophy,
  "Kapacita": Users,
  "Školné": DollarSign,
  "Jazyky": Globe,
  "Doprava": Bus,
  "Zaměření": BookOpen,
};

export function QuickFactsCard({ facts, className }: QuickFactsCardProps) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm ${className || ""}`}>
      <h2 className="text-xl font-semibold mb-4 text-slate-900">
        Rychlé fakta
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {facts.map((fact, index) => (
          <StatCompact
            key={index}
            icon={fact.icon || defaultIcons[fact.label]}
            label={fact.label}
            value={fact.value}
          />
        ))}
      </div>
    </div>
  );
}
