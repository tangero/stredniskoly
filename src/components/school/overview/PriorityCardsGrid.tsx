import { PriorityCard } from "@/components/ui/PriorityCard";
import { Target, BarChart3, Users } from "lucide-react";
import { PriorityScores } from "@/lib/priorities/calculations";

interface PriorityCardsGridProps {
  priorities: PriorityScores;
  className?: string;
}

export function PriorityCardsGrid({
  priorities,
  className,
}: PriorityCardsGridProps) {
  const { acceptance, difficulty, demand } = priorities;

  return (
    <div className={`grid md:grid-cols-3 gap-6 ${className || ""}`}>
      {/* Karta 1: Šance přijetí */}
      <PriorityCard
        priority={acceptance.priority}
        icon={Target}
        metric="Šance přijetí"
        value={`${acceptance.percentage}%`}
        trend={acceptance.trend}
        description={acceptance.description}
      />

      {/* Karta 2: Náročnost */}
      <PriorityCard
        priority={difficulty.priority}
        icon={BarChart3}
        metric="Náročnost"
        value={`${difficulty.score}/1000`}
        description={difficulty.description}
      />

      {/* Karta 3: Poptávka */}
      <PriorityCard
        priority={demand.priority}
        icon={Users}
        metric="Poptávka"
        value={`${demand.indexPoptavky}× ${demand.emoji}`}
        description={demand.description}
      />
    </div>
  );
}
