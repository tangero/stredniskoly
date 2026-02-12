# Design System V2 - Pro 3-stránkovou architekturu

**Cíl:** Graficky čistý, vkusný a přehledný redesign profilu školy
**Principy:** Minimalistický, mobile-first, přístupný, hierarchický

---

## 1. Barevná paleta (Priority-driven colors)

### Primární barvy (Decision support)
```css
/* Kritické - GO/NO-GO signály */
--critical-success: #10b981;  /* Zelená - Dobrá šance */
--critical-warning: #f59e0b;  /* Oranžová - Střední šance */
--critical-danger: #ef4444;   /* Červená - Nízká šance */
--critical-info: #3b82f6;     /* Modrá - Neutrální info */

/* Sekundární - kontext */
--accent-blue: #0ea5e9;       /* Odkazy, CTA */
--accent-purple: #8b5cf6;     /* Premium features */
--accent-slate: #64748b;      /* Metadata, less important */
```

### Neutrální škála (Text a pozadí)
```css
/* Světlý režim (default) */
--bg-primary: #ffffff;        /* Bílá - karty */
--bg-secondary: #f8fafc;      /* Off-white - page background */
--bg-tertiary: #f1f5f9;       /* Subtle dividers */

--text-primary: #0f172a;      /* Černá - hlavní text */
--text-secondary: #475569;    /* Šedá - doplňkový text */
--text-tertiary: #94a3b8;     /* Světle šedá - metadata */

/* Tmavý režim (optional pro budoucnost) */
--dark-bg-primary: #0f172a;
--dark-bg-secondary: #1e293b;
--dark-text-primary: #f8fafc;
```

### Použití v UI
- **Červená** (danger): Min. body, vysoká obtížnost, nízká šance přijetí
- **Oranžová** (warning): Střední konkurence, upozornění
- **Zelená** (success): Dobrá šance, nízká konkurence
- **Modrá** (info): Neutrální fakta, odkazy, CTA

---

## 2. Typografie (Clear hierarchy)

### Font stack
```css
/* System fonts - rychlé, nativní */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Případně vlastní fonty (performance first!) */
--font-display: "Inter", var(--font-sans);  /* Nadpisy */
--font-body: "Inter", var(--font-sans);     /* Tělo textu */
--font-mono: "JetBrains Mono", "Fira Code", monospace;  /* Kód, čísla */
```

### Typografická škála (modular scale 1.25)
```css
/* Mobile-first scale */
--text-xs: 0.75rem;      /* 12px - tiny labels */
--text-sm: 0.875rem;     /* 14px - metadata */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - subheadings */
--text-xl: 1.25rem;      /* 20px - card titles */
--text-2xl: 1.5rem;      /* 24px - section headings */
--text-3xl: 1.875rem;    /* 30px - page headings (mobile) */
--text-4xl: 2.25rem;     /* 36px - hero headings (mobile) */

/* Desktop scale (scaled up) */
@media (min-width: 768px) {
  --text-3xl: 2.5rem;    /* 40px */
  --text-4xl: 3rem;      /* 48px */
}
```

### Font weights
```css
--font-normal: 400;      /* Regular text */
--font-medium: 500;      /* Subtle emphasis */
--font-semibold: 600;    /* Headings, important numbers */
--font-bold: 700;        /* Hero headings, critical numbers */
```

### Použití
- **Bold (700)**: Min. body, kritická čísla, hero headings
- **Semibold (600)**: Nadpisy sekcí, labels
- **Medium (500)**: Subheadings, menu items
- **Normal (400)**: Běžný text

---

## 3. Spacing system (8pt grid)

### Základní škála
```css
--spacing-0: 0;
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-20: 5rem;      /* 80px */
```

### Komponenty
- **Card padding**: spacing-6 (24px) mobile, spacing-8 (32px) desktop
- **Section spacing**: spacing-12 (48px) mezi sekcemi
- **Stack spacing**: spacing-4 (16px) mezi položkami v seznamu
- **Inline spacing**: spacing-2 (8px) mezi chipy/badges

---

## 4. Layout & Grid

### Container
```css
.container {
  max-width: 1280px;           /* Max šířka obsahu */
  margin: 0 auto;
  padding: 0 var(--spacing-4); /* 16px gutters mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--spacing-6); /* 24px gutters tablet+ */
  }
}
```

### Responzivní breakpoints
```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

### Grid systém
```css
/* 12-column grid pro flexibilitu */
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Gap */
--grid-gap: var(--spacing-6);  /* 24px mezi kartami */
```

---

## 5. Komponenty (Reusable patterns)

### A) Prioritní karty (Go/No-go decision)
```tsx
<PriorityCard
  priority="high"           // high | medium | low
  metric="Šance přijetí"
  value="85%"
  trend="+5%"
  icon={<CheckCircle />}
  description="S vašimi body máte vysokou šance"
/>
```

**Design:**
- Velikost ikony: 48px
- Ikona barevná podle priority
- Velké číslo (text-4xl, bold)
- Trend malý (text-sm)
- Popis (text-sm, secondary color)

### B) Stats kompaktní
```tsx
<StatCompact
  label="Kapacita"
  value={120}
  context="míst"
/>
```

**Design:**
- Label (text-sm, tertiary)
- Value (text-2xl, semibold, primary)
- Context (text-xs, tertiary)

### C) Info tooltip (on-demand detail)
```tsx
<InfoTooltip>
  <InfoIcon className="text-slate-400 hover:text-blue-600" />
  <TooltipContent>
    Min. body jsou nejnižší bodový zisk přijatého studenta...
  </TooltipContent>
</InfoTooltip>
```

### D) Progress bar (visual comparison)
```tsx
<ProgressBar
  value={850}
  max={1000}
  label="Vaše body vs. minimum"
  color="success"
/>
```

### E) Badges & Chips
```tsx
<Badge variant="success">Dobrá šance</Badge>
<Badge variant="warning">Střední konkurence</Badge>
<Badge variant="danger">Vysoká obtížnost</Badge>
<Badge variant="neutral">4leté studium</Badge>
```

**Design:**
- Rounded-full
- Padding: 8px 16px
- Text-sm, font-medium
- Barevné pozadí s průhledností

---

## 6. Animace & Transitions

### Základní přechody
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Použití
- **Hover efekty**: transition-fast (150ms)
- **Modal/drawer open**: transition-base (300ms)
- **Page transitions**: transition-slow (500ms)

### Mikro-interakce
```css
/* Hover na kartě */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transition: all var(--transition-fast);
}

/* Tooltip appear */
.tooltip {
  animation: fadeInUp var(--transition-base);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 7. Shadows & Elevation

### Shadow škála
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### Použití
- **Karty (default)**: shadow-sm
- **Karty (hover)**: shadow-md
- **Modals**: shadow-xl
- **Dropdown menu**: shadow-lg

---

## 8. Border & Radius

### Border radius
```css
--radius-sm: 0.375rem;    /* 6px - small badges */
--radius-base: 0.5rem;    /* 8px - buttons */
--radius-md: 0.75rem;     /* 12px - cards */
--radius-lg: 1rem;        /* 16px - large cards */
--radius-full: 9999px;    /* Rounded pills */
```

### Border widths
```css
--border-thin: 1px;       /* Default borders */
--border-medium: 2px;     /* Emphasis */
--border-thick: 4px;      /* Priority indicators */
```

---

## 9. Ikony (Visual language)

### Icon library
**Doporučení:** Lucide React (lightweight, konzistentní)

```bash
npm install lucide-react
```

### Icon sizes
```css
--icon-xs: 16px;
--icon-sm: 20px;
--icon-base: 24px;
--icon-lg: 32px;
--icon-xl: 48px;
```

### Icon mapping (sémantický význam)
- ✅ **CheckCircle**: Vysoká šance, splněno
- ⚠️ **AlertCircle**: Střední riziko, upozornění
- ❌ **XCircle**: Nízká šance, nesplněno
- 📊 **BarChart**: Statistiky, grafy
- 🎓 **GraduationCap**: Vzdělání, škola
- 📍 **MapPin**: Lokace
- 🕐 **Clock**: Čas, trendy
- 💰 **DollarSign**: Školné, finance
- 👥 **Users**: Počet studentů
- 🏆 **Trophy**: Náročnost, úspěšnost

---

## 10. Accessibility (WCAG 2.1 Level AA)

### Barevný kontrast
- **Text na bílém pozadí**: min. 4.5:1 ratio
- **Velký text (18pt+)**: min. 3:1 ratio
- **Interactive prvky**: min. 3:1 ratio proti pozadí

### Focus states
```css
/* Viditelný focus ring */
:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}

/* Skipovat dekorativní focus */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Keyboard navigation
- Všechny interactive prvky dostupné přes Tab
- Modal dialogs s trap focus
- Skip links pro hlavní obsah

### Screen readers
- Sémantické HTML (header, main, nav, article)
- ARIA labels pro ikonové buttony
- Alt texty pro obrázky
- Live regions pro dynamický obsah

---

## 11. Performance optimizations

### Lazy loading
```tsx
// Lazy load těžkých komponent
const ChartComponent = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false, // Pokud není potřeba SSR
});
```

### Image optimization
```tsx
<Image
  src="/school-photo.jpg"
  width={800}
  height={600}
  alt="Fotografie školy"
  loading="lazy"
  placeholder="blur"
/>
```

### Font loading
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap; /* Zobrazit fallback font okamžitě */
}
```

---

## 12. Implementační checklist

### Fáze 1: Design tokens
- [ ] Nastavit CSS custom properties
- [ ] Vytvořit Tailwind config s custom barvami
- [ ] Definovat spacing scale
- [ ] Nastavit typografii

### Fáze 2: Base komponenty
- [ ] PriorityCard
- [ ] StatCompact
- [ ] InfoTooltip
- [ ] ProgressBar
- [ ] Badge/Chip
- [ ] Button variants
- [ ] Modal/Dialog
- [ ] Skeleton loaders

### Fáze 3: Layout komponenty
- [ ] Container
- [ ] Grid system
- [ ] Card wrapper
- [ ] Section wrapper
- [ ] Sticky header

### Fáze 4: Testing
- [ ] Visual regression tests (Chromatic/Percy)
- [ ] Accessibility audit (axe, Lighthouse)
- [ ] Performance testing (Core Web Vitals)
- [ ] Cross-browser testing

---

## 13. Nástroje pro udržení kvality

### A) Storybook (komponentová dokumentace)
```bash
npm install --save-dev @storybook/react
npx storybook@latest init
```

**Výhoda:** Izolovaný vývoj komponent, vizuální testy

### B) Prettier + ESLint (code style)
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tailwindConfig": "./tailwind.config.js"
}
```

### C) Husky + lint-staged (pre-commit hook)
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Automaticky:** Formátování a linting před commitem

### D) Chromatic (visual regression)
```bash
npm install --save-dev chromatic
```

**Výhoda:** Automatická detekce vizuálních změn v komponentech

---

## 14. Example: Prioritní karta (code)

```tsx
// src/components/ui/PriorityCard.tsx
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

type Priority = "high" | "medium" | "low";

interface PriorityCardProps {
  priority: Priority;
  metric: string;
  value: string | number;
  trend?: string;
  description?: string;
  className?: string;
}

const priorityConfig = {
  high: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  medium: {
    icon: AlertCircle,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  low: {
    icon: XCircle,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function PriorityCard({
  priority,
  metric,
  value,
  trend,
  description,
  className,
}: PriorityCardProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

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
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
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
  metric="Šance přijetí"
  value="85%"
  trend="+5% vs 2024"
  description="S vašimi body máte vysokou šance být přijat/a"
/>
```

---

## Závěr

Tento design systém poskytuje:
✅ **Konzistenci** - jednotný vizuální jazyk
✅ **Škálovatelnost** - snadno přidávat nové komponenty
✅ **Přístupnost** - WCAG 2.1 Level AA
✅ **Performance** - optimalizované pro rychlost
✅ **Maintainability** - dokumentované, testovatelné

**Další krok:** Implementace prioritních komponent pro Stránku 1 (Overview)
