# Implementation Roadmap - V2 Redesign
## Step-by-step checklist

**Start date:** 11. února 2026
**Estimated completion:** 3 týdny (~25 hodin)

---

## ✅ FÁZE 0: Příprava (HOTOVO)

- [x] Záloha V1 designu
- [x] Design system dokumentace
- [x] Master plan
- [x] Detailní specs pro všechny 3 stránky
- [x] Komponenty specifikace

---

## 📦 FÁZE 1: Base komponenty (Týden 1, dny 1-2)

**Odhad:** 3-4 hodiny

### Tailwind config
- [ ] Přidat custom colors do `tailwind.config.ts`
- [ ] Přidat spacing scale
- [ ] Přidat font sizes
- [ ] Test: `npm run build` - žádné chyby

### Base komponenty (`src/components/ui/`)
- [ ] `PriorityCard.tsx` - go/no-go decision cards
  - [ ] Tests: `__tests__/PriorityCard.test.tsx`
  - [ ] Story: `PriorityCard.stories.tsx`
- [ ] `StatCompact.tsx` - kompaktní metriky
  - [ ] Tests
  - [ ] Story
- [ ] `InfoTooltip.tsx` - on-demand detail
  - [ ] Tests
  - [ ] Story
- [ ] `ProgressBar.tsx` - vizuální srovnání
  - [ ] Tests
  - [ ] Story
- [ ] `Badge.tsx` - kategorie, tagy
  - [ ] Tests
  - [ ] Story
- [ ] `Modal.tsx` - overlay dialogs
  - [ ] Tests
  - [ ] Story
- [ ] `Tabs.tsx` - tab navigation
  - [ ] Tests
  - [ ] Story

### Shared utilities (`src/components/shared/`)
- [ ] `LoadingSkeleton.tsx`
- [ ] `ErrorBoundary.tsx`
- [ ] `EmptyState.tsx`

### Testing
- [ ] Run all unit tests: `npm test`
- [ ] Visual check v Storybooku (pokud setup)
- [ ] Accessibility audit (axe DevTools)

---

## 📄 FÁZE 2: Stránka 1 - Overview (Týden 1, dny 2-3)

**Odhad:** 4-5 hodin

### Route structure
- [ ] Vytvořit backup současné route
- [ ] Zachovat URL: `/skola/[slug]` (backwards compatible)

### Data layer
- [ ] Helper funkce pro priority výpočty:
  - [ ] `calculateAcceptanceChance()`
  - [ ] `calculateDifficulty()`
  - [ ] `calculateDemand()`
- [ ] Tests pro výpočty

### Komponenty (`src/components/school/overview/`)
- [ ] `OverviewHero.tsx` - header s názvem školy
- [ ] `PriorityCardsGrid.tsx` - 3 priority karty
  - [ ] Integrovat `calculateAcceptanceChance()`
  - [ ] Integrovat `calculateDifficulty()`
  - [ ] Integrovat `calculateDemand()`
- [ ] `QuickFactsCard.tsx` - grid rychlých faktů
- [ ] `CSISummaryCard.tsx` - AI shrnutí inspekce
- [ ] `CTASection.tsx` - 2 CTA buttony

### Page implementation
- [ ] Aktualizovat `src/app/skola/[slug]/page.tsx`
- [ ] Server-side data fetch (existující funkce)
- [ ] Render nové komponenty
- [ ] Conditional: pokud více oborů → seznam

### Responsive & Mobile
- [ ] Test na mobilu (375px)
- [ ] Test na tabletu (768px)
- [ ] Test na desktopu (1280px)
- [ ] Touch targets min 44px

### Testing
- [ ] E2E test: User přijde → vidí 3 karty → klikne Detail
- [ ] Visual regression (screenshot comparison)
- [ ] Lighthouse audit (Performance, Accessibility)

---

## 📊 FÁZE 3: Stránka 2 - Detail (Týden 2, dny 1-2) ✅ DOKONČENO (základní verze)

**Odhad:** 5-6 hodin | **Skutečně:** ~3 hodiny

### Route structure
- [x] Nová route: `/skola/[slug]/detail`
- [ ] Redirect: starý slug → `/detail` (backwards compat)

### Detail hero
- [x] `DetailHero.tsx` - kompaktní header

### Tabs system
- [x] `DetailTabs.tsx` - sticky tab container

### Tab 1: Statistiky
- [x] `StatsTab.tsx`
  - [x] `TrendComparisonCard`
  - [x] `PriorityDistributionBar` (migrate from V1)
  - [x] `AcceptanceByPriorityCard` (migrate)
  - [x] `TestDifficultyCard` + modal (TODO: modal)
  - [x] `CohortsCard` + modal (TODO: modal)

### Tab 2: Konkurence
- [x] `CompetitionTab.tsx`
  - [x] `CompetingSchoolsList` (migrate "Kam se hlásí")
  - [x] `StrategicInsightsCard` (nová logika)
  - [x] `DifficultyComparisonChart`

### Tab 3: Škola
- [x] `SchoolTab.tsx`
  - [x] Migrate InspIS komponenty z V1
  - [x] `AdmissionCard` (přijímací řízení)
  - [x] `LanguagesCard` (jazyky)
  - [x] `FacilitiesCard` (vybavení - collapsible)
  - [x] `ActivitiesCard` (zájmovky - modal) (TODO: modal)

### Tab 4: Praktické
- [x] `PracticalTab.tsx`
  - [x] `LocationCard`
  - [x] `TransportCard`
  - [x] `SurroundingsCard` (okolí - InspIS)
  - [x] `FinanceCard` (školné - InspIS)
  - [x] `CommunicationCard` (komunikace - InspIS)

### Modals
- [ ] Test Difficulty Modal (grafy)
- [ ] Cohorts Modal (donut chart)
- [ ] Activities Modal (fullscreenka)

### Mobile
- [ ] Sticky tabs s horizontal scroll
- [ ] Touch-friendly tap targets
- [ ] Simplified charts na mobilu

### Testing
- [ ] E2E: Switch mezi taby
- [ ] E2E: Otevřít modal, ESC close
- [ ] Visual regression
- [ ] Performance (lazy load tabs)

---

## 🎯 FÁZE 4: Stránka 3 - Guided Journey (Týden 2, dny 3-4)

**Odhad:** 6-7 hodin

### Route structure
- [ ] Nová route: `/skola/[slug]/pro-me`

### State management
- [ ] Client-side state (useState nebo Zustand)
- [ ] Wizard progress tracking

### Wizard komponenty (`src/components/school/guided/`)
- [ ] `OnboardingWizard.tsx` - wrapper s progress bar
- [ ] `BodySimulator.tsx` - Step 1
  - [ ] Slider 0-1000
  - [ ] Collapsible breakdown (ČJ, MA)
  - [ ] Výpočet profilu (podprůměr/průměr/nadprůměr)
- [ ] `PrioritySelector.tsx` - Step 2
  - [ ] 12 checkboxů (max 5)
  - [ ] Matching logic
- [ ] `LocationChecker.tsx` - Step 3
  - [ ] Input PSČ/město (autocomplete)
  - [ ] API call: dojezdovost
  - [ ] Radio: přijatelné?
- [ ] `CostCalculator.tsx` - Step 4
  - [ ] Slider budget
  - [ ] Rozpis nákladů
  - [ ] Affordability check

### Results komponenty
- [ ] `PersonalizedScore.tsx` - match score 0-100
  - [ ] Výpočetní logika
  - [ ] Visual (progress circle)
- [ ] `MatchReasons.tsx` - proč se hodí / nehodí
  - [ ] Generator logic
- [ ] `ActionChecklist.tsx` - co dělat dál
  - [ ] Checkboxy s deadlines

### Persistence
- [ ] LocalStorage save/load
- [ ] Email export API endpoint
- [ ] Compare feature (multi-school)

### Testing
- [ ] E2E: Projít celý wizard
- [ ] E2E: Uložit výsledek → reload → načíst
- [ ] Unit tests pro výpočty (match score)
- [ ] Visual regression

---

## 🎨 FÁZE 5: Polish & Optimization (Týden 3, den 1)

**Odhad:** 3-4 hodiny

### Animace
- [ ] Hover efekty na kartách
- [ ] Smooth transitions mezi stránkami
- [ ] Fade-in pro modaly
- [ ] Progress bar animations

### Loading states
- [ ] Skeletony pro všechny komponenty
- [ ] Spinner pro API calls
- [ ] Optimistic UI updates

### Error handling
- [ ] Error boundaries všude
- [ ] User-friendly error messages
- [ ] Retry mechanism

### Accessibility
- [ ] ARIA labels kompletní
- [ ] Keyboard navigation test
- [ ] Screen reader test (NVDA/VoiceOver)
- [ ] Color contrast audit (WCAG AA)
- [ ] Focus states viditelné

### Performance
- [ ] Code splitting (dynamic imports)
- [ ] Lazy load modalů
- [ ] Lazy load charts (Intersection Observer)
- [ ] Image optimization
- [ ] Font optimization (font-display: swap)

### SEO
- [ ] Meta tags aktualizované
- [ ] Structured data (JSON-LD)
- [ ] Canonical URLs
- [ ] Open Graph tags

### Analytics
- [ ] Track page views
- [ ] Track button clicks (CTAs)
- [ ] Track wizard steps
- [ ] Track match scores

---

## 🧪 FÁZE 6: Testing & Deployment (Týden 3, dny 2-3)

**Odhad:** 4-5 hodin

### E2E testy (Playwright)
- [ ] Flow 1: Overview → Detail → back
- [ ] Flow 2: Overview → Guided Journey → save
- [ ] Flow 3: Detail → všechny taby → modal
- [ ] Flow 4: Mobile navigation

### Visual regression (Chromatic)
- [ ] Baseline screenshots všech stránek
- [ ] Test změn v komponentách
- [ ] Approve/reject changes

### Cross-browser testing
- [ ] Chrome (desktop + mobile)
- [ ] Safari (desktop + mobile)
- [ ] Firefox
- [ ] Edge

### Performance testing
- [ ] Lighthouse CI (>90 score)
- [ ] Core Web Vitals
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Bundle size check (< 200kb first load)

### User testing
- [ ] 5 rodičů: Overview page
- [ ] 5 rodičů: Guided Journey
- [ ] Feedback sběr
- [ ] Iterace na základě feedbacku

### Staging deployment
- [ ] Deploy na Vercel preview
- [ ] Smoke tests
- [ ] Share link s stakeholdery
- [ ] Bug fixes

### Production deployment
- [ ] Feature flag: `REDESIGN_V2_ENABLED`
- [ ] A/B test setup (50/50 split?)
- [ ] Deploy na produkci
- [ ] Monitor errors (Sentry)
- [ ] Monitor analytics
- [ ] Rollback plan ready

### Post-launch
- [ ] Monitor performance (7 dní)
- [ ] Monitor user behavior (heatmaps?)
- [ ] Sbírat feedback
- [ ] Iterace na základě dat

---

## 📈 Success Metrics (po 30 dnech)

### Engagement
- [ ] Bounce rate: měřit změnu (cíl: -20%)
- [ ] Time on page: měřit změnu (cíl: +30%)
- [ ] Scroll depth: měřit (cíl: >60% vidí priority karty)

### Conversion
- [ ] CTR na Detail: měřit (cíl: >40%)
- [ ] CTR na Guided Journey: měřit (cíl: >15%)
- [ ] CTR na Simulátor: měřit změnu (cíl: +15%)

### Mobile
- [ ] Mobile traffic: měřit změnu (cíl: +10%)
- [ ] Mobile bounce rate: měřit změnu (cíl: -25%)

### Performance
- [ ] Lighthouse score: >90
- [ ] Core Web Vitals: all green
- [ ] Bundle size: <200kb

---

## 🚨 Rollback plan

Pokud něco selže:

```bash
# Krok 1: Disable feature flag
REDESIGN_V2_ENABLED=false

# Krok 2: Revert k V1
cp "src/app/skola/[slug]/page.v1_original.tsx" "src/app/skola/[slug]/page.tsx"
cp src/components/school-profile/SchoolInfoSection.v1_original.tsx \
   src/components/school-profile/SchoolInfoSection.tsx

# Krok 3: Rebuild a deploy
npm run build
git commit -m "Rollback to V1"
git push

# Krok 4: Analyze co selhalo
# - Check error logs (Sentry)
# - Check analytics (drop-off points)
# - User feedback
```

---

## 📋 Daily checklist (během implementace)

Každý den:
- [ ] Commit progress (`git commit`)
- [ ] Push to remote (`git push`)
- [ ] Run tests (`npm test`)
- [ ] Visual check (mobile + desktop)
- [ ] Update this roadmap (check off items)

Před commitem:
- [ ] Lint pass (`npm run lint`)
- [ ] Format pass (`npm run format`)
- [ ] No console.logs
- [ ] No TypeScript errors

---

## 🎯 Priority order (pokud méně času)

**Must have (core features):**
1. Base komponenty (PriorityCard, StatCompact, Badge)
2. Stránka 1: Overview (go/no-go decision)
3. Responsive mobile layout

**Should have (important):**
4. Stránka 2: Detail (statistics, competition)
5. Tabs system (sticky na mobilu)
6. Modals (on-demand detail)

**Nice to have (iterace v2.1):**
7. Stránka 3: Guided Journey (personalizace)
8. Animations a polish
9. Advanced analytics

---

**Status:** 📋 READY TO EXECUTE
**Current phase:** FÁZE 1 - Base komponenty
**Next action:** Setup Tailwind config + implement PriorityCard
