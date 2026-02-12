# Components Library - Specifikace
## Base komponenty pro V2 redesign

**Účel:** Reusable komponenty použitelné napříč všemi 3 stránkami
**Design system:** DESIGN_SYSTEM_V2.md

---

## 🗂️ Struktura

```
src/components/
├── ui/                          # Base UI komponenty
│   ├── PriorityCard.tsx        # Go/no-go decision cards
│   ├── StatCompact.tsx         # Kompaktní metriky
│   ├── InfoTooltip.tsx         # Detail on-demand
│   ├── ProgressBar.tsx         # Vizuální srovnání
│   ├── Badge.tsx               # Kategorie, tagy
│   ├── Modal.tsx               # Overlay dialogs
│   └── Tabs.tsx                # Tab navigation
│
├── school/                      # School-specific komponenty
│   ├── overview/               # Stránka 1
│   │   ├── OverviewHero.tsx
│   │   ├── PriorityCardsGrid.tsx
│   │   ├── QuickFactsCard.tsx
│   │   └── CSISummaryCard.tsx
│   │
│   ├── detail/                 # Stránka 2
│   │   ├── DetailHero.tsx
│   │   ├── DetailTabs.tsx
│   │   ├── StatsTab.tsx
│   │   ├── CompetitionTab.tsx
│   │   ├── SchoolTab.tsx
│   │   └── PracticalTab.tsx
│   │
│   └── guided/                 # Stránka 3
│       ├── OnboardingWizard.tsx
│       ├── BodySimulator.tsx
│       ├── PrioritySelector.tsx
│       ├── LocationChecker.tsx
│       ├── CostCalculator.tsx
│       └── PersonalizedScore.tsx
│
└── shared/                      # Shared utilities
    ├── LoadingSkeleton.tsx
    ├── ErrorBoundary.tsx
    └── EmptyState.tsx
```

---

## 📦 Base komponenty (ui/)

### 1. PriorityCard

**Účel:** Vizuální go/no-go decision karty s priority-driven colors

```tsx
// src/components/ui/PriorityCard.tsx
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
        "hover:shadow-md",
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
```

**Použití:**
```tsx
<PriorityCard
  priority="high"
  icon={Target}
  metric="Šance přijetí"
  value="85%"
  trend="+5%"
  description="S vašimi body máte vysokou šanci"
/>
```

---

### 2. StatCompact

**Účel:** Kompaktní metriky pro Quick Facts

```tsx
// src/components/ui/StatCompact.tsx
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
```

**Použití:**
```tsx
<StatCompact
  icon={Trophy}
  label="Min. body"
  value={850}
  context="pro přijetí"
/>
```

---

### 3. InfoTooltip

**Účel:** Tooltip pro on-demand detail (bez zahltění UI)

```tsx
// src/components/ui/InfoTooltip.tsx
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // shadcn/ui

interface InfoTooltipProps {
  content: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function InfoTooltip({ content, side = "top" }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 text-slate-400 hover:text-blue-600 transition-colors"
            aria-label="Více informací"
          >
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Použití:**
```tsx
<div className="flex items-center gap-2">
  <span>Min. body</span>
  <InfoTooltip content="Nejnižší bodový zisk přijatého studenta v roce 2025" />
</div>
```

---

### 4. ProgressBar

**Účel:** Vizuální srovnání (např. "Vaše body vs. minimum")

```tsx
// src/components/ui/ProgressBar.tsx
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
```

**Použití:**
```tsx
<ProgressBar
  value={850}
  max={1000}
  label="Vaše body vs. maximum"
  color="green"
/>
```

---

### 5. Badge

**Účel:** Kategorie, tagy, labels

```tsx
// src/components/ui/Badge.tsx
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

**Použití:**
```tsx
<Badge variant="success">Dobrá šance</Badge>
<Badge variant="warning">Střední konkurence</Badge>
<Badge variant="neutral">4leté studium</Badge>
```

---

### 6. Modal

**Účel:** Overlay dialogs pro on-demand detail

```tsx
// src/components/ui/Modal.tsx
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // shadcn/ui

interface ModalProps {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Modal({
  trigger,
  title,
  children,
  open,
  onOpenChange,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
```

**Použití:**
```tsx
<Modal
  trigger={<button>Zobrazit detail</button>}
  title="Náročnost přijímaček"
>
  <TestDifficultyDetails />
</Modal>
```

---

### 7. Tabs

**Účel:** Tab navigation (sticky na mobilu)

```tsx
// src/components/ui/Tabs.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  sticky?: boolean;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  sticky = false,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={cn("w-full", className)}>
      {/* Tab headers */}
      <div
        className={cn(
          "border-b border-slate-200 bg-white",
          sticky && "sticky top-0 z-10"
        )}
      >
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="py-6">{activeContent}</div>
    </div>
  );
}
```

**Použití:**
```tsx
<Tabs
  sticky
  tabs={[
    {
      id: "stats",
      label: "Statistiky",
      icon: <BarChart className="w-4 h-4" />,
      content: <StatsTab />,
    },
    {
      id: "competition",
      label: "Konkurence",
      icon: <Target className="w-4 h-4" />,
      content: <CompetitionTab />,
    },
  ]}
/>
```

---

## 📦 Shared utilities

### LoadingSkeleton

```tsx
// src/components/shared/LoadingSkeleton.tsx
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 rounded",
        className
      )}
    />
  );
}

// Prebuilt variants
export function CardSkeleton() {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-12 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
    </div>
  );
}
```

---

### ErrorBoundary

```tsx
// src/components/shared/ErrorBoundary.tsx
"use client";

import { Component, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Něco se pokazilo</h3>
              <p className="text-sm text-red-700 mt-1">
                {this.state.error?.message || "Neočekávaná chyba"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🧪 Testing strategy

### Unit tests (Vitest + React Testing Library)
```tsx
// __tests__/PriorityCard.test.tsx
import { render, screen } from "@testing-library/react";
import { Target } from "lucide-react";
import { PriorityCard } from "@/components/ui/PriorityCard";

describe("PriorityCard", () => {
  it("renders metric and value", () => {
    render(
      <PriorityCard
        priority="high"
        icon={Target}
        metric="Šance přijetí"
        value="85%"
      />
    );

    expect(screen.getByText("Šance přijetí")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("applies correct color classes for priority", () => {
    const { container } = render(
      <PriorityCard
        priority="high"
        icon={Target}
        metric="Test"
        value="100"
      />
    );

    expect(container.firstChild).toHaveClass("bg-green-50");
  });
});
```

---

## 📚 Storybook stories

```tsx
// src/components/ui/PriorityCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Target } from "lucide-react";
import { PriorityCard } from "./PriorityCard";

const meta: Meta<typeof PriorityCard> = {
  title: "UI/PriorityCard",
  component: PriorityCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PriorityCard>;

export const High: Story = {
  args: {
    priority: "high",
    icon: Target,
    metric: "Šance přijetí",
    value: "85%",
    trend: "+5%",
    description: "S vašimi body máte vysokou šanci",
  },
};

export const Medium: Story = {
  args: {
    priority: "medium",
    icon: Target,
    metric: "Konkurence",
    value: "2.3×",
    description: "Střední konkurence",
  },
};

export const Low: Story = {
  args: {
    priority: "low",
    icon: Target,
    metric: "Šance",
    value: "25%",
    description: "Nízká šance přijetí",
  },
};
```

---

**Status:** 📋 SPEC READY
**Next:** Implementace base komponent
