# Stránka 3: Guided Journey (Personalized)
## "Je tahle škola pro MĚ?"

**URL:** `/skola/{redizo}-{slug}/pro-me`
**Cíl:** 3-10 minut, personalizované doporučení
**Audience:** Rodiče s konkrétními kritérii

---

## 🎯 User story

> "Jako rodič chci zjistit, jestli tahle škola konkrétně vyhovuje MÉMU dítěti a našim rodinným prioritám - ne obecně, ale pro NÁS."

---

## 📐 Flow (4-step wizard)

```
┌─────────────────────────────────────┐
│ KROK 1: Body žáka                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                     │
│ Jaké body očekáváte z JPZ?          │
│                                     │
│ [Slider: 0 ────●─── 1000]          │
│        850 bodů                     │
│                                     │
│ ⚙️ Upřesnit podle předmětů          │
│ [collapse]                          │
│ ┌─────────────────────────────┐   │
│ │ ČJ: [─────●─────] 70/100    │   │
│ │ MA: [───────●───] 80/100    │   │
│ │ = Celkem: 850 bodů          │   │
│ └─────────────────────────────┘   │
│                                     │
│ Váš profil: NADPRŮMĚRNÝ 📚          │
│                                     │
│ [Další krok →]                      │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ KROK 2: Priority rodiny             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                     │
│ Co je pro vás důležité?             │
│ (vyberte až 5)                      │
│                                     │
│ ☑ Kvalita výuky                     │
│ ☑ Moderní vybavení                  │
│ ☐ Jazyky (více než EN)              │
│ ☑ Dostupnost (doprava)              │
│ ☐ Školné nízké/žádné                │
│ ☐ Zájmové kroužky                   │
│ ☑ Dobrá pověst (ČŠI)                │
│ ☐ Malé třídy                        │
│                                     │
│ [Zobrazit více (12) ↓]              │
│                                     │
│ [Další krok →]                      │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ KROK 3: Lokalita                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                     │
│ Kde bydlíte?                        │
│                                     │
│ [Input: PSČ nebo město]             │
│ Praha 9                             │
│                                     │
│ Dojezdový čas:                      │
│ • Autem: 25 minut                   │
│ • MHD: 45 minut (1 přestup)         │
│                                     │
│ Je to přijatelné?                   │
│ ◉ Ano, v pohodě                     │
│ ○ Trochu daleko                     │
│ ○ Příliš daleko                     │
│                                     │
│ [Další krok →]                      │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ KROK 4: Finance                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                     │
│ Kolik můžete ročně investovat?      │
│                                     │
│ [Slider: 0 ────●─── 100k]          │
│        20 000 Kč/rok                │
│                                     │
│ Škola: 0 Kč/rok (státní) ✅         │
│                                     │
│ Další náklady:                      │
│ • Učebnice: ~2000 Kč                │
│ • Pomůcky: ~1000 Kč                 │
│ • Strava: ~15000 Kč                 │
│ • Doprava: ~5000 Kč                 │
│ ─────────────────────               │
│ Celkem: ~23 000 Kč/rok ⚠️           │
│                                     │
│ [Zobrazit výsledky →]               │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ VÝSLEDEK: Personalized Match        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                     │
│ Match score                         │
│ ┌─────────────────────────────┐   │
│ │                             │   │
│ │       82 / 100              │   │
│ │                             │   │
│ │   ████████████░░░░          │   │
│ │                             │   │
│ │   VELMI DOBRÁ SHODA ✅      │   │
│ └─────────────────────────────┘   │
│                                     │
│ [Continue to details...]            │
└─────────────────────────────────────┘
```

---

## 🎯 Krok 1: Body žáka

### Komponenty
```tsx
<BodySimulator
  onSubmit={(body: number, breakdown?: { cj: number; ma: number }) => {
    // Uložit do state
    // Vypočítat acceptance chance
    // Next step
  }}
/>
```

### UI prvky
- **Primary:** Slider 0-1000 (step: 10)
- **Secondary:** Collapsible breakdown (ČJ, MA)
- **Visual feedback:**
  - < 700: "Podprůměrné" (red)
  - 700-850: "Průměrné" (amber)
  - 850+: "Nadprůměrné" (green)

### Logic
```typescript
function calculateAcceptanceChance(userBody: number, schoolMinBody: number) {
  const diff = userBody - schoolMinBody;

  if (diff >= 50) {
    return { percentage: 85, label: "Velmi vysoká", color: "green" };
  } else if (diff >= 0) {
    return { percentage: 65, label: "Vysoká", color: "green" };
  } else if (diff >= -50) {
    return { percentage: 35, label: "Střední", color: "amber" };
  } else {
    return { percentage: 15, label: "Nízká", color: "red" };
  }
}
```

---

## 🎯 Krok 2: Priority rodiny

### Komponenty
```tsx
<PrioritySelector
  maxSelections={5}
  priorities={[
    { id: "quality", label: "Kvalita výuky", icon: <Star /> },
    { id: "equipment", label: "Moderní vybavení", icon: <Monitor /> },
    { id: "languages", label: "Jazyky (více než EN)", icon: <Globe /> },
    // ... 12 celkem
  ]}
  onSubmit={(selected: string[]) => {
    // Uložit do state
    // Next step
  }}
/>
```

### Všechny priority (12 možností)
1. **Kvalita výuky** - ČŠI hodnocení, výsledky maturit
2. **Moderní vybavení** - PC učebny, laboratoře, tablety
3. **Jazyky** - více než EN (DE, FR, ES...)
4. **Dostupnost** - doprava, dojezdový čas
5. **Školné** - nízké/žádné
6. **Zájmové kroužky** - sport, hudba, věda
7. **Dobrá pověst** - ČŠI, reference
8. **Malé třídy** - individuální přístup
9. **Studijní výsledky** - % přijatých na VŠ
10. **Komunikace** - online IS, email
11. **Mezinárodní** - výměnné pobyty, projekty
12. **Stipendia** - finanční podpora

### Matching logic
```typescript
function calculatePriorityMatch(
  selectedPriorities: string[],
  schoolData: SchoolData
): { score: number; matches: string[]; mismatches: string[] } {
  const matches: string[] = [];
  const mismatches: string[] = [];

  for (const priority of selectedPriorities) {
    if (schoolMeetsPriority(priority, schoolData)) {
      matches.push(priority);
    } else {
      mismatches.push(priority);
    }
  }

  const score = (matches.length / selectedPriorities.length) * 100;
  return { score, matches, mismatches };
}

function schoolMeetsPriority(priority: string, school: SchoolData): boolean {
  switch (priority) {
    case "quality":
      return school.csiRating >= 4;
    case "equipment":
      return school.inspis.odborne_ucebny?.length >= 3;
    case "languages":
      return school.inspis.vyuka_jazyku?.length >= 2;
    // ... další priority
  }
}
```

---

## 🎯 Krok 3: Lokalita

### Komponenty
```tsx
<LocationChecker
  schoolLocation={{ lat: 50.187, lng: 14.663 }}
  onSubmit={(userLocation: Location, isAcceptable: boolean) => {
    // Uložit do state
    // Next step
  }}
/>
```

### UI prvky
- **Input:** PSČ nebo město (autocomplete)
- **API call:** Dojezdovost (MHD, auto)
- **Display:** Čas autem, čas MHD, počet přestupů
- **Radio:** Přijatelné? Ano / Trochu daleko / Příliš

### API integration
```typescript
async function calculateCommute(
  from: string,
  to: { lat: number; lng: number }
): Promise<{ car: number; transit: number; transfers: number }> {
  // Option 1: Google Maps Distance Matrix API
  // Option 2: Náš dojezdovost API (pokud existuje)

  const response = await fetch(`/api/commute?from=${from}&to=${to.lat},${to.lng}`);
  return response.json();
}
```

---

## 🎯 Krok 4: Finance

### Komponenty
```tsx
<CostCalculator
  tuition={0}
  otherCosts={{
    books: 2000,
    supplies: 1000,
    meals: 15000,
    transport: 5000,
  }}
  onSubmit={(budget: number, isAffordable: boolean) => {
    // Vypočítat match score
    // Zobrazit výsledky
  }}
/>
```

### UI prvky
- **Slider:** Budget 0-100k Kč/rok
- **Display:** Rozpis nákladů
- **Comparison:** Budget vs skutečné náklady
- **Visual:** Green (affordable) / Amber (tight) / Red (over budget)

### Logic
```typescript
function calculateAffordability(
  budget: number,
  totalCosts: number
): { affordable: boolean; surplus: number; color: string } {
  const surplus = budget - totalCosts;

  if (surplus >= 5000) {
    return { affordable: true, surplus, color: "green" };
  } else if (surplus >= 0) {
    return { affordable: true, surplus, color: "amber" };
  } else {
    return { affordable: false, surplus, color: "red" };
  }
}
```

---

## 🎯 Výsledek: Personalized Match

### Layout
```
┌─────────────────────────────────────┐
│ Váš personalizovaný výsledek        │
├─────────────────────────────────────┤
│                                     │
│ Match Score                         │
│ ┌─────────────────────────────┐   │
│ │        82 / 100             │   │
│ │   ████████████░░░░          │   │
│ │   VELMI DOBRÁ SHODA ✅      │   │
│ └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ✅ Proč se hodí (5)                 │
│                                     │
│ • Máte vysokou šanci přijetí (85%)  │
│ • Kvalita výuky odpovídá prioritě   │
│ • Moderní vybavení (5 lab.)         │
│ • Dojezdový čas přijatelný (45m)    │
│ • Náklady v rámci rozpočtu          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ⚠️ Pozor na (2)                     │
│                                     │
│ • Nabídka jazyků jen EN, DE         │
│   (chtěli jste více)                │
│ • Pouze 3 zájmové kroužky           │
│   (méně než průměr)                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 📋 Co dělat dál                     │
│                                     │
│ ☐ Navštívit dny otevřených dveří    │
│   (15. listopadu 2025)              │
│ ☐ Přihlásit se do přípravného kurzu │
│ ☐ Připravit se na JPZ (MA je těžší) │
│ ☐ Vybrat 2-3 záložní školy          │
│ ☐ Připravit dokumenty               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [💾 Uložit výsledek]                │
│ [📧 Poslat emailem]                 │
│ [🔄 Porovnat s jinou školou]        │
│                                     │
└─────────────────────────────────────┘
```

### Match Score výpočet
```typescript
function calculateMatchScore(
  bodyChance: number,       // 0-100 (ze step 1)
  priorityMatch: number,    // 0-100 (ze step 2)
  locationOk: boolean,      // true/false (ze step 3)
  affordabilityScore: number // 0-100 (ze step 4)
): number {
  // Váhy
  const weights = {
    body: 0.4,        // 40% - nejdůležitější
    priority: 0.3,    // 30%
    location: 0.2,    // 20%
    cost: 0.1,        // 10%
  };

  const locationScore = locationOk ? 100 : 50;

  const totalScore =
    bodyChance * weights.body +
    priorityMatch * weights.priority +
    locationScore * weights.location +
    affordabilityScore * weights.cost;

  return Math.round(totalScore);
}
```

### Match Reasons generator
```typescript
function generateMatchReasons(
  userData: UserData,
  schoolData: SchoolData
): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];

  // Body check
  if (userData.body >= schoolData.minBody + 50) {
    positive.push(`Máte vysokou šanci přijetí (${userData.bodyChance}%)`);
  } else if (userData.body < schoolData.minBody) {
    negative.push("Body pod minimem - šance nízká");
  }

  // Priority checks
  for (const priority of userData.priorities) {
    if (schoolData.meetsPriority(priority)) {
      positive.push(`${priority.label} odpovídá prioritě`);
    } else {
      negative.push(`${priority.label} nesplněno`);
    }
  }

  // Location
  if (userData.commuteTime <= 45) {
    positive.push(`Dojezdový čas přijatelný (${userData.commuteTime}m)`);
  } else {
    negative.push(`Dlouhý dojezd (${userData.commuteTime} minut)`);
  }

  // Cost
  if (userData.budget >= schoolData.totalCosts) {
    positive.push("Náklady v rámci rozpočtu");
  } else {
    negative.push(`Náklady přesahují rozpočet o ${schoolData.totalCosts - userData.budget} Kč`);
  }

  return { positive, negative };
}
```

### Action Checklist
```typescript
function generateActionChecklist(
  schoolData: SchoolData
): Array<{ id: string; label: string; deadline?: string; completed: boolean }> {
  return [
    {
      id: "open-day",
      label: `Navštívit dny otevřených dveří`,
      deadline: schoolData.inspis.dny_otevrenych_dveri,
      completed: false,
    },
    {
      id: "prep-course",
      label: "Přihlásit se do přípravného kurzu",
      deadline: "prosinec 2025",
      completed: false,
    },
    {
      id: "jpz-prep",
      label: "Připravit se na JPZ (MA je obtížnější)",
      deadline: "duben 2026",
      completed: false,
    },
    {
      id: "backup-schools",
      label: "Vybrat 2-3 záložní školy",
      deadline: "leden 2026",
      completed: false,
    },
    {
      id: "documents",
      label: "Připravit přihlášku a dokumenty",
      deadline: "únor 2026",
      completed: false,
    },
  ];
}
```

---

## 💾 Persistence

### Local Storage
```typescript
interface SavedResult {
  schoolId: string;
  timestamp: string;
  userData: UserData;
  matchScore: number;
  reasons: { positive: string[]; negative: string[] };
}

function saveResult(result: SavedResult) {
  const saved = JSON.parse(localStorage.getItem("saved-results") || "[]");
  saved.push(result);
  localStorage.setItem("saved-results", JSON.stringify(saved));
}

function getSavedResults(): SavedResult[] {
  return JSON.parse(localStorage.getItem("saved-results") || "[]");
}
```

### Email export
```typescript
async function sendResultEmail(result: SavedResult, email: string) {
  await fetch("/api/send-result", {
    method: "POST",
    body: JSON.stringify({ result, email }),
  });
}
```

---

## 🔄 Compare feature

**Použití:** Uživatel projde guided journey pro 2-3 školy → porovná výsledky

```
┌─────────────────────────────────────┐
│ Porovnání škol                      │
├─────────────────────────────────────┤
│           | Škola A | Škola B       │
├─────────┼─────────┼─────────────────┤
│ Match   │  82%    │  75%            │
│ Šance   │  85%    │  65%            │
│ Priority│  80%    │  90%            │
│ Lokace  │  45min  │  60min          │
│ Náklady │  23k    │  35k            │
└─────────────────────────────────────┘
```

---

## 📱 Mobile optimizations

- **Wizard:** Full-screen steps
- **Progress bar:** Top sticky (1/4, 2/4, 3/4, 4/4)
- **Sliders:** Touch-friendly (48px height)
- **Results:** Scrollable, clear sections

---

## ♿ Accessibility

- [ ] Wizard keyboard navigable
- [ ] ARIA labels pro sliders
- [ ] Screen reader announces progress
- [ ] Focus management mezi kroky
- [ ] Skip buttons (optional steps)

---

## 🧪 Testing scenarios

1. User vyplní všechny kroky → high match score
2. User má body pod minimem → low match score, varování
3. User vybere priority, které škola nesplňuje → upozornění
4. User uloží výsledek → persistence v LocalStorage
5. User porovná 2 školy → side-by-side comparison

---

## 🚀 Performance

- **Wizard:** Client-side only (no API calls mimo dojezdovost)
- **Calculations:** Fast (< 100ms)
- **Local Storage:** Instant save
- **Email:** Async, non-blocking

---

## 📈 Analytics events

```typescript
// Track wizard steps
analytics.track("Wizard Step Completed", {
  step: 1,
  schoolId: redizo,
  userBody: 850,
});

// Track match score
analytics.track("Match Score Calculated", {
  schoolId: redizo,
  matchScore: 82,
  bodyChance: 85,
});

// Track actions
analytics.track("Result Saved", { schoolId: redizo });
analytics.track("Result Shared", { schoolId: redizo, method: "email" });
```

---

**Status:** 📋 SPEC READY
**Next:** Wizard components implementation
