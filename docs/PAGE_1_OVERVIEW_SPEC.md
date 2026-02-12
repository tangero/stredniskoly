# Stránka 1: Overview (Go/No-go)
## Rychlé rozhodnutí "hodí se / nehodí se"

**URL:** `/skola/{redizo}-{slug}`
**Cíl:** 30-60 sekund na go/no-go rozhodnutí
**Audience:** Všichni rodiče (screening phase)

---

## 🎯 User story

> "Jako rodič chci rychle zjistit, jestli tahle škola má šanci být pro moje dítě vhodná, aniž bych musel číst hodiny textu."

---

## 📐 Layout (Mobile-first)

```
┌─────────────────────────────────────┐
│ [Breadcrumb: Domů > Školy > Kraj]  │
├─────────────────────────────────────┤
│                                     │
│ OverviewHero                        │
│ ┌─────────────────────────────┐   │
│ │ 🏫 GYMNÁZIUM J.S. MACHARA   │   │
│ │ Brandýs nad Labem           │   │
│ │ 4leté studium • Státní      │   │
│ └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ PriorityCardsGrid (3 karty)         │
│                                     │
│ ┌───────────────────────┐          │
│ │ ✅ ŠANCE PŘIJETÍ      │          │
│ │ 76%           +3% ↗   │          │
│ │ Vysoká šance          │          │
│ └───────────────────────┘          │
│                                     │
│ ┌───────────────────────┐          │
│ │ 📊 NÁROČNOST          │          │
│ │ 850/1000      Medium  │          │
│ │ Středně náročné       │          │
│ └───────────────────────┘          │
│                                     │
│ ┌───────────────────────┐          │
│ │ 👥 POPTÁVKA           │          │
│ │ 2.3×          Střední │          │
│ │ Konkurence je střední │          │
│ └───────────────────────┘          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ QuickFacts (kompaktní grid)         │
│ ┌──────────┬──────────┐            │
│ │ Min body │ Kapacita │            │
│ │ 850      │ 120      │            │
│ ├──────────┼──────────┤            │
│ │ Školné   │ Jazyky   │            │
│ │ 0 Kč     │ EN, DE   │            │
│ └──────────┴──────────┘            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ CSISummaryCard                      │
│ ┌─────────────────────────────┐   │
│ │ 💬 Co říká Školní inspekce  │   │
│ │                             │   │
│ │ "Škola poskytuje kvalitní   │   │
│ │ vzdělání s moderním         │   │
│ │ vybavením..."               │   │
│ │                             │   │
│ │ [Celá zpráva →]             │   │
│ └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ CTASection (2 tlačítka)             │
│ ┌─────────────────────────────┐   │
│ │ [📊 Zobrazit detail]        │   │
│ │ [🎯 Je to pro mě?]          │   │
│ └─────────────────────────────┘   │
│                                     │
│ Další obory školy (pokud > 1)       │
│ • Informatika (4leté)               │
│ • Biologie (8leté)                  │
│                                     │
└─────────────────────────────────────┘
```

**Desktop (768px+):**
- PriorityCards: 3 sloupce vedle sebe
- QuickFacts: 4 sloupce
- CTASection: buttony vedle sebe

---

## 🧩 Komponenty

### 1. OverviewHero
```tsx
<OverviewHero
  schoolName="Gymnázium J.S. Machara"
  location="Brandýs nad Labem, Středočeský kraj"
  studyLength={4}
  schoolType="Státní"
  category="gymnazium"
/>
```

**Obsah:**
- Název školy (h1)
- Lokace (město, kraj)
- Délka studia (badge)
- Typ zřizovatele (badge)
- Kategorie (barevný chip)

**Design:**
- Gradient pozadí (modrá)
- Bílý text
- Badges: rounded-full, white/20
- Mobile: text-2xl, Desktop: text-4xl

---

### 2. PriorityCardsGrid

**Karta 1: Šance přijetí** 🎯
```tsx
<PriorityCard
  priority="high"  // high | medium | low
  icon={<Target />}
  metric="Šance přijetí"
  value="76%"
  trend="+3%"
  description="S průměrnými body máte vysokou šanci"
  color="green"
/>
```

**Výpočet:**
```typescript
function calculateAcceptanceChance(
  minBody: number,
  kapacita: number,
  prihlasky: number,
  jpzMin: number
): { percentage: number; priority: Priority; description: string } {
  const indexPoptavky = prihlasky / kapacita;
  const acceptanceRate = (kapacita / prihlasky) * 100;

  // Simplified version
  if (acceptanceRate >= 70) {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "high",
      description: "S průměrnými body máte vysokou šanci být přijat/a"
    };
  } else if (acceptanceRate >= 40) {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "medium",
      description: "Potřebujete nadprůměrné body, ale je to reálné"
    };
  } else {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "low",
      description: "Velmi konkurenční škola, potřebujete výborné body"
    };
  }
}
```

**Karta 2: Náročnost** 📊
```tsx
<PriorityCard
  priority="medium"
  icon={<BarChart />}
  metric="Náročnost"
  value="850/1000"
  difficulty="Medium"
  description="Středně náročná škola v rámci ČR"
  color="amber"
/>
```

**Výpočet:**
```typescript
function calculateDifficulty(
  obtiznost: number
): { priority: Priority; label: string; description: string } {
  if (obtiznost >= 90) {
    return {
      priority: "high",
      label: "Velmi náročné",
      description: "Top 10% nejnáročnějších škol v ČR"
    };
  } else if (obtiznost >= 60) {
    return {
      priority: "medium",
      label: "Středně náročné",
      description: "Středně náročná škola v rámci ČR"
    };
  } else {
    return {
      priority: "low",
      label: "Dostupné",
      description: "Škola s nižší náročností přijetí"
    };
  }
}
```

**Karta 3: Poptávka** 👥
```tsx
<PriorityCard
  priority="medium"
  icon={<Users />}
  metric="Poptávka"
  value="2.3×"
  label="Střední"
  description="Střední konkurence mezi uchazeči"
  color="blue"
/>
```

**Výpočet:**
```typescript
function calculateDemand(
  indexPoptavky: number
): { priority: Priority; label: string; description: string } {
  if (indexPoptavky >= 3) {
    return {
      priority: "high",
      label: "Vysoká",
      description: "Vysoký zájem, doporučujeme záložní variantu"
    };
  } else if (indexPoptavky >= 1.5) {
    return {
      priority: "medium",
      label: "Střední",
      description: "Střední konkurence mezi uchazeči"
    };
  } else {
    return {
      priority: "low",
      label: "Nízká",
      description: "Nízká konkurence, vysoká šance přijetí"
    };
  }
}
```

---

### 3. QuickFacts

```tsx
<QuickFactsCard
  facts={[
    { label: "Min. body", value: 850, icon: <Trophy /> },
    { label: "Kapacita", value: 120, icon: <Users /> },
    { label: "Školné", value: "0 Kč", icon: <DollarSign /> },
    { label: "Jazyky", value: "EN, DE, FR", icon: <Globe /> },
    { label: "Doprava", value: "MHD 5 min", icon: <Bus /> },
    { label: "Zaměření", value: "Všeobecné", icon: <BookOpen /> },
  ]}
/>
```

**Layout:**
- Grid: 2 sloupce mobile, 3-4 desktop
- Ikona + label + value
- Kompaktní (text-sm)
- Šedé pozadí (bg-slate-50)

---

### 4. CSISummaryCard

```tsx
<CSISummaryCard
  summary="Škola poskytuje kvalitní vzdělání s moderním vybavením. Třídní klima je příznivé, učitelé motivující."
  rating={4.5}
  reportUrl="/skola/600001234-gymnazium/inspekce"
/>
```

**Obsah:**
- AI-generované shrnutí (2-3 věty)
- Rating (hvězdičky)
- Link na full report

**Design:**
- Světle modré pozadí
- Ikona 💬
- Italic text pro quote
- Link jako underline

---

### 5. CTASection

```tsx
<CTASection
  primaryAction={{
    label: "Zobrazit detail",
    href: "/skola/600001234-gymnazium/detail",
    icon: <BarChart />
  }}
  secondaryAction={{
    label: "Je to pro mě?",
    href: "/skola/600001234-gymnazium/pro-me",
    icon: <Target />
  }}
/>
```

**Design:**
- 2 buttony: primary (blue) + secondary (white outline)
- Mobile: stack vertically
- Desktop: side by side
- Icons vlevo od textu

---

## 📊 Data sources

```typescript
// Server-side fetch (v page.tsx)
const pageData = await Promise.all([
  getSchoolOverview(redizo),           // Základní info
  getExtendedSchoolStats(schoolId),    // Stats pro priority karty
  getCSIDataByRedizo(redizo),          // ČŠI data
  getExtractionsByRedizo(redizo),      // AI extractions
  getInspisDataByRedizo(redizo),       // InspIS pro quick facts
  getTrendDataForProgram(programId),   // Trendy (pro "změna" badge)
]);
```

---

## 🎨 Visual hierarchy

### Primární (nejvýraznější)
1. PriorityCards (velké čísla, barvy, ikony)
2. CTA buttony

### Sekundární
3. QuickFacts (kompaktní grid)
4. ČŠI summary

### Terciární
5. Breadcrumb
6. Seznam dalších oborů

---

## 📱 Mobile optimizations

- **PriorityCards:** Stack vertically, full width
- **QuickFacts:** 2 columns only
- **Font sizes:** Menší než desktop (text-3xl → text-2xl)
- **Spacing:** Menší gaps (spacing-6 → spacing-4)
- **Touch targets:** Min 44px×44px
- **Scroll:** Max 2 screenfuls

---

## ♿ Accessibility

- [ ] Semantic HTML (h1, article, section)
- [ ] ARIA labels pro ikony
- [ ] Focus states na všech interactive elementy
- [ ] Color contrast min 4.5:1
- [ ] Alt texty (pokud obrázky)
- [ ] Keyboard navigation
- [ ] Screen reader testing

---

## 🧪 Testing scenarios

### Happy path
1. User přijde z vyhledávání
2. Vidí 3 priority karty
3. Rozhodne se: "Hodí se!"
4. Klikne "Zobrazit detail"

### Alternative path
1. User přijde z vyhledávání
2. Vidí 3 priority karty
3. Rozhodne se: "Nehodí se"
4. Klikne "Zpět na výsledky"

### Personalization path
1. User vidí střední šanci
2. Chce vědět více
3. Klikne "Je to pro mě?"
4. Projde personalizovaný wizard

---

## 🚀 Performance targets

- **FCP:** < 1.2s
- **LCP:** < 2.5s
- **TTI:** < 3.5s
- **CLS:** < 0.1

---

## 📈 Success metrics

- **CTR na Detail:** > 40% (rodiče chtějí vědět víc)
- **CTR na Personalizace:** > 15% (kvalifikovaní)
- **Bounce rate:** < 40% (engage s obsahem)
- **Time on page:** 30-90s (rychlé rozhodnutí)

---

**Status:** 📋 SPEC READY
**Next:** Implementace komponent
