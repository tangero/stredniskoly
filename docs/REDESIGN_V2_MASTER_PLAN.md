# Redesign V2 - Master Plan
## 3-stránková architektura s progressive disclosure

**Datum:** 11. února 2026
**Status:** 📋 Plánování
**Cíl:** Odstranit information overload, přidat personalizaci, zlepšit mobile UX

---

## 🎯 Problém (co řešíme)

### V1 problémy
❌ **Information overload** - 23 bloků na jedné stránce
❌ **Absence personalizace** - všem ukážeme všechno
❌ **Decision paralysis** - rodiče neví, co je důležité
❌ **Špatný mobile UX** - dlouhé scrollování, malá čísla

### V2 řešení
✅ **Progressive disclosure** - informace v 3 vrstvách podle priority
✅ **Guided journey** - personalizovaná doporučení
✅ **Clear go/no-go signals** - vizuální priority
✅ **Mobile-first** - optimalizováno pro mobil

---

## 📐 Architektura (3 stránky)

```
┌─────────────────────────────────────────────────┐
│ STRÁNKA 1: Overview (Go/No-go)                  │
│ URL: /skola/{redizo}-{slug}                     │
│                                                 │
│ Cíl: Rychlé rozhodnutí "hodí se / nehodí se"   │
│ Audience: Všichni rodiče (screening)           │
│ Čas na stránce: 30-60 sekund                   │
│                                                 │
│ Obsah:                                          │
│ • 3 priority karty (šance, náročnost, poptávka) │
│ • Základní fakta (4-6 metrik)                   │
│ • ČŠI AI summary (1 karta)                      │
│ • Quick facts (školné, jazyky, lokalita)       │
│ • 2 CTA: Detail | Personalizovat                │
│                                                 │
│ Mobile: 1-2 screenfuls                          │
└─────────────────────────────────────────────────┘
                      ↓
                [Detail →]
                      ↓
┌─────────────────────────────────────────────────┐
│ STRÁNKA 2: Detail (Application strategy)       │
│ URL: /skola/{redizo}-{slug}/detail              │
│                                                 │
│ Cíl: Strategie přihlášky, srovnání konkurence  │
│ Audience: Vážní zájemci                         │
│ Čas na stránce: 2-5 minut                      │
│                                                 │
│ Obsah (4 taby):                                 │
│ 📊 Statistiky - trendy, body, šance             │
│ 🎯 Konkurence - kam se hlásí ostatní           │
│ 🏫 Škola - vybavení, prostory, aktivity        │
│ 📍 Praktické - lokace, doprava, okolí          │
│                                                 │
│ Na vyžádání (modals):                           │
│ • Profily přijatých (cohorts)                   │
│ • Náročnost testů (ČJ, MA)                      │
│ • Full InspIS data                              │
│                                                 │
│ Mobile: Sticky tab navigation                   │
└─────────────────────────────────────────────────┘
                      ↓
              [Personalizovat →]
                      ↓
┌─────────────────────────────────────────────────┐
│ STRÁNKA 3: Guided Journey (Personalized)       │
│ URL: /skola/{redizo}-{slug}/pro-me              │
│                                                 │
│ Cíl: "Je tahle škola pro MĚ?"                  │
│ Audience: Rodiče s konkrétními kritérii        │
│ Čas na stránce: 3-10 minut                     │
│                                                 │
│ Interaktivní onboarding (4 kroky):             │
│ 1️⃣ Body žáka - simulace šance                  │
│ 2️⃣ Priority rodiny - filtrace funkcí           │
│ 3️⃣ Lokalita - dojezdovost                      │
│ 4️⃣ Finance - schulitelnost                     │
│                                                 │
│ Output:                                         │
│ • Personalized score (0-100)                    │
│ • Match reasons ("Hodí se protože...")         │
│ • Red flags ("Pozor na...")                    │
│ • Action items (checklist)                     │
│                                                 │
│ Mobile: Step-by-step wizard                    │
└─────────────────────────────────────────────────┘
```

---

## 🗂️ Komponenty (co stavíme)

### Base komponenty (použitelné všude)
- [x] `PriorityCard` - go/no-go rozhodovací karty
- [x] `StatCompact` - kompaktní metriky
- [x] `InfoTooltip` - detail on-demand
- [x] `ProgressBar` - vizuální srovnání
- [x] `Badge` - kategorie, tagy
- [x] `Modal` - overlay pro detail
- [x] `Tabs` - tab navigation (sticky na mobilu)

### Page-specific komponenty

**Stránka 1:**
- `OverviewHero` - header s názvem a základními fakty
- `PriorityCardsGrid` - 3 priority karty
- `QuickFactsCard` - rychlé info (školné, jazyky...)
- `CSISummaryCard` - AI shrnutí inspekce
- `CTASection` - 2 buttony (Detail | Personalizovat)

**Stránka 2:**
- `DetailTabs` - 4 taby pro kategorie
- `StatsTab` - statistiky a trendy
- `CompetitionTab` - analýza konkurence
- `SchoolTab` - profil školy (InspIS)
- `PracticalTab` - lokace, doprava
- `ModalTrigger` - odkazy na modaly

**Stránka 3:**
- `OnboardingWizard` - 4-step průvodce
- `BodySimulator` - kalkulačka bodů
- `PrioritySelector` - výběr preferencí
- `LocationChecker` - dojezdovost
- `CostCalculator` - finance
- `PersonalizedScore` - výsledné skóre
- `MatchReasons` - proč se hodí
- `ActionChecklist` - co dělat dál

---

## 📊 Data flow

```
1. User přijde na Overview
   ↓
2. Server-side fetch:
   - Základní school data (existující)
   - Extended stats (existující)
   - InspIS data (existující)
   - CSI extractions (existující)
   ↓
3. Render Overview (Stránka 1)
   - Vypočítat priority scores
   - Zobrazit go/no-go karty
   ↓
4. User klikne "Detail"
   ↓
5. Client-side navigation (Next.js)
   - Data už jsou v cache
   - Instant render
   ↓
6. Render Detail (Stránka 2)
   - Tabs pro kategorie
   - Lazy load modalů
   ↓
7. User klikne "Personalizovat"
   ↓
8. Client-side state management
   - Wizard s local state
   - Výpočet personalized score
   ↓
9. Render Guided Journey (Stránka 3)
   - Zobrazit match reasons
   - Checklist kroků
```

---

## 🎨 Design principy

### 1. Mobile-first
- Všechno navrženo nejdřív pro mobil
- Desktop = větší mezery, více sloupců
- Sticky navigation na mobilu

### 2. Progressive disclosure
- Začít s málem (3 priority karty)
- Detail jen pro ty, kdo chtějí
- Modaly pro "nice to have" info

### 3. Visual hierarchy
- Červená = kritické (min. body)
- Zelená = pozitivní (dobrá šance)
- Šedá = neutrální (metadata)
- Velikost = důležitost

### 4. Performance
- Server-side rendering (SEO)
- Lazy load modalů
- Optimized images
- < 3s Time to Interactive

---

## 🚀 Implementační fáze

### Fáze 0: Příprava ✅
- [x] Záloha V1 designu
- [x] Design system dokumentace
- [x] Master plan

### Fáze 1: Base komponenty (2-3 hodiny)
- [ ] Setup Tailwind custom config
- [ ] PriorityCard component
- [ ] StatCompact component
- [ ] InfoTooltip component
- [ ] ProgressBar component
- [ ] Badge variants
- [ ] Modal component
- [ ] Tabs component

### Fáze 2: Stránka 1 - Overview (3-4 hodiny)
- [ ] Nová route struktura
- [ ] OverviewHero component
- [ ] Priority calculation logic
- [ ] PriorityCardsGrid
- [ ] QuickFactsCard
- [ ] CSISummaryCard
- [ ] CTA section
- [ ] Mobile responsive
- [ ] Testing

### Fáze 3: Stránka 2 - Detail (4-5 hodin)
- [ ] DetailTabs component
- [ ] StatsTab (trendy, grafy)
- [ ] CompetitionTab (kam se hlásí)
- [ ] SchoolTab (InspIS migrace)
- [ ] PracticalTab (lokace, doprava)
- [ ] Modal overlays
- [ ] Sticky tabs na mobilu
- [ ] Testing

### Fáze 4: Stránka 3 - Guided Journey (5-6 hodin)
- [ ] OnboardingWizard component
- [ ] BodySimulator (input + výpočet)
- [ ] PrioritySelector (checkboxy)
- [ ] LocationChecker (dojezdovost API)
- [ ] CostCalculator (školné)
- [ ] PersonalizedScore algorithm
- [ ] MatchReasons generator
- [ ] ActionChecklist
- [ ] Testing

### Fáze 5: Polish & optimization (2-3 hodiny)
- [ ] Animace a transitions
- [ ] Loading states
- [ ] Error handling
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] SEO metadata
- [ ] Analytics events

### Fáze 6: Testing & deployment (2-3 hodiny)
- [ ] E2E testy (Playwright)
- [ ] Visual regression (Chromatic)
- [ ] Cross-browser testing
- [ ] Mobile testing (real devices)
- [ ] Staging deployment
- [ ] User testing (5 rodičů)
- [ ] Production deployment

---

## 📏 Success metrics

### Před redesignem (baseline)
- Průměrný čas na stránce: ?
- Bounce rate: ?
- CTR na simulátor: ?
- Mobile vs desktop: ?

### Po redesignu (cíle)
- ⬇️ Bounce rate: -20%
- ⬆️ Engagement: +30% (scroll depth, kliknutí)
- ⬆️ CTR na simulátor: +15%
- ⬆️ Mobile usage: +10%
- ⬆️ Time to decision: -50% (rychlejší rozhodování)

---

## 🐛 Risk mitigation

### Riziko: SEO impact
**Mitigace:**
- Zachovat URL strukturu
- Server-side rendering
- Proper meta tags
- Structured data

### Riziko: User confusion
**Mitigace:**
- A/B testing před full rollout
- Onboarding tooltips
- "Vrátit na starou verzi" odkaz (první týden)

### Riziko: Performance regression
**Mitigace:**
- Lazy loading
- Code splitting
- Lighthouse CI v pipeline
- Performance budget

### Riziko: Mobile UX issues
**Mitigace:**
- Test na real devices
- User testing s rodiči
- Touch target sizes (min 44px)

---

## 📅 Timeline

**Celkem:** ~20-25 hodin práce

**Týden 1:**
- Fáze 1: Base komponenty (den 1-2)
- Fáze 2: Stránka 1 (den 2-3)

**Týden 2:**
- Fáze 3: Stránka 2 (den 1-2)
- Fáze 4: Stránka 3 (den 3-4)

**Týden 3:**
- Fáze 5: Polish (den 1)
- Fáze 6: Testing & deploy (den 2-3)

---

## 📚 Related docs

- `DESIGN_SYSTEM_V2.md` - Kompletní design system
- `BACKUP_V1_ORIGINAL.md` - Záloha původního designu
- `INSPIS_INFORMATION_ARCHITECTURE.md` - Původní analýza struktury
- `PAGE_1_OVERVIEW_SPEC.md` - Detailní spec Stránky 1
- `PAGE_2_DETAIL_SPEC.md` - Detailní spec Stránky 2
- `PAGE_3_GUIDED_SPEC.md` - Detailní spec Stránky 3
- `COMPONENTS_SPEC.md` - Specifikace všech komponent

---

**Status:** 📋 READY TO START
**Next:** Implementace base komponent
