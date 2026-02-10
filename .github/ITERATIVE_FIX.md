# 🔄 Iterativní Auto-Fix Workflow

## Rozdíl mezi standardním a iterativním přístupem

### 📋 Standardní workflow (výchozí)

```
Issue vytvořen
    ↓
AI validace
    ↓
Claude vytvoří opravu (1 pokus)
    ↓
Draft PR vytvořen
    ↓
Maintainer review
```

**Použití:** 90% běžných bug reportů
**Rychlost:** ~2 minuty
**Náklady:** ~$0.03 per fix

### 🔄 Iterativní workflow (volitelné)

```
Issue vytvořen + label 'auto-fix-iterative'
    ↓
AI validace
    ↓
Pokus 1: Claude vytvoří opravu
    ↓
Spustit testy (lint, type-check)
    ↓
FAIL? → Pokus 2 s feedbackem
    ↓
Spustit testy znovu
    ↓
FAIL? → Pokus 3 s feedbackem
    ↓
SUCCESS nebo selhání
```

**Použití:** Složité bugy, vyžadují testování
**Rychlost:** ~5-10 minut
**Náklady:** ~$0.09-0.15 per fix (3 pokusy)

---

## Kdy použít iterativní přístup?

### ✅ Vhodné případy:

1. **TypeScript errors** - potřebují type-check
2. **Logic bugs** - vyžadují spuštění testů
3. **Breaking changes** - musí projít linting
4. **Komplexní refactoring** - více souborů, závislosti

### ❌ Nevhodné případy:

1. **UI tweaky** - standardní přístup stačí
2. **Typo fixes** - zbytečně drahé
3. **Simple CSS changes** - nepotřebují testy
4. **Documentation** - žádné testy

---

## Jak aktivovat iterativní workflow

### Způsob 1: Automaticky (label)

Přidat label `auto-fix-iterative` k issue:

```bash
gh issue edit 15 --add-label "auto-fix-iterative"
```

### Způsob 2: Manuálně (workflow_dispatch)

```bash
# Přes GitHub UI
Actions → Auto-Fix Issues (Iterative) → Run workflow
  Issue number: 15
  Max attempts: 3

# Nebo přes CLI
gh workflow run auto-fix-iterative.yml \
  -f issue_number=15 \
  -f max_attempts=3
```

---

## Příklad: Jednoduchá vs složitá oprava

### Příklad 1: Jednoduchý bug (standardní)

**Issue:** "Tlačítko 'Hledat' má špatnou barvu"

```typescript
// Před
<button style={{ backgroundColor: '#ff0000' }}>

// Po
<button style={{ backgroundColor: '#0074e4' }}>
```

**Výsledek:** ✅ 1 pokus, Draft PR vytvořen

---

### Příklad 2: Složitý bug (iterativní)

**Issue:** "SearchResults komponenta crashuje při prázdném query"

**Pokus 1:**
```typescript
// Claude přidá null check
if (!query) return null;
```
**Test:** ❌ TypeScript error - `query` může být undefined

**Pokus 2:**
```typescript
// Claude opraví s feedbackem
if (!query || query.trim() === '') {
  return <EmptyState />;
}
```
**Test:** ❌ Lint error - `EmptyState` není importován

**Pokus 3:**
```typescript
import { EmptyState } from '@/components/EmptyState';

if (!query || query.trim() === '') {
  return <EmptyState message="Zadejte hledaný výraz" />;
}
```
**Test:** ✅ Vše projde, Draft PR vytvořen

---

## Konfigurace

### Upravit počet pokusů

V `.github/workflows/auto-fix-iterative.yml`:

```yaml
max_attempts:
  default: 3  # Změnit na 5 pro více pokusů
```

### Přidat vlastní testy

V `.github/scripts/auto_fix_iterative.py`:

```python
def run_tests(self):
    # TypeScript check
    subprocess.run(['npm', 'run', 'build'], ...)

    # Jest tests
    subprocess.run(['npm', 'test'], ...)

    # E2E tests (volitelné)
    subprocess.run(['npm', 'run', 'test:e2e'], ...)
```

### Customizovat feedback

```python
def fix_with_feedback(self, issue, files_content, error):
    prompt = f"""
    Předchozí pokus selhal s chybou:
    {error}

    Tvoje úkol:
    1. Analyzuj chybu
    2. Najdi root cause
    3. Vytvoř novou opravu
    4. Ujisti se, že projde všechny testy
    """
```

---

## Monitoring & Metriky

### Sledovat úspěšnost

```bash
# Standardní workflow
gh run list --workflow=auto-fix-issues.yml --json conclusion

# Iterativní workflow
gh run list --workflow=auto-fix-iterative.yml --json conclusion
```

### Metriky k sledování

| Metrika | Standardní | Iterativní |
|---------|------------|------------|
| Success rate | 60-70% | 80-90% |
| Avg. time | 2 min | 7 min |
| Avg. cost | $0.03 | $0.10 |
| Requires review | Vždy | Vždy |

---

## Náklady

### Standardní (1 pokus)
- Claude Sonnet 4.5: ~$0.03
- **Total: $0.03**

### Iterativní (3 pokusy)
- Pokus 1: ~$0.03
- Pokus 2 (s feedbackem): ~$0.04
- Pokus 3 (s feedbackem): ~$0.04
- **Total: $0.11**

### Kdy se to vyplatí?

Iterativní přístup stojí 3-4x víc, ale:
- ✅ Vyšší success rate (80% vs 60%)
- ✅ Méně manuálních oprav
- ✅ Rychlejší celkový fix time

**Break-even:** Pokud iterativní ušetří 10 minut manuální práce = vyplatí se!

---

## Best Practices

1. **Začněte se standardním** - většina bugů nepotřebuje iteraci
2. **Používejte iterativní pro složité** - TypeScript errors, logic bugs
3. **Monitorujte náklady** - sledujte OpenRouter usage
4. **Nastavte testy správně** - fast feedback loop
5. **Limitujte pokusy** - 3 je optimální (víc = diminishing returns)

---

## Troubleshooting

### Iterace se zasekla

**Příčina:** Tests trvají příliš dlouho

**Řešení:**
```yaml
timeout-minutes: 10  # Přidat timeout do workflow
```

### Všechny pokusy selžou

**Příčina:** Bug je příliš složitý

**Řešení:**
- Zkontrolovat logy
- Opravit ručně
- Upravit prompt pro lepší guidance

### Tests jsou flaky

**Příčina:** Nestabilní testy

**Řešení:**
- Fixnout testy nejdřív
- Nebo použít jen lint + type-check

---

## Roadmap

Budoucí vylepšení:

- [ ] Automatické semantic testy (Playwright)
- [ ] Visual regression testing
- [ ] Performance benchmarks
- [ ] Automatic rollback on production errors
- [ ] Learning from past fixes (RAG)

---

## Příklad užití

```bash
# 1. Issue vytvořen
gh issue create --title "TypeError v SearchResults" --body "..."

# 2. Přidat iterativní label
gh issue edit 20 --add-label "auto-fix-iterative"

# 3. Sledovat progress
gh run watch

# 4. Review draft PR
gh pr view 21

# 5. Merge pokud OK
gh pr merge 21
```

---

**Máte dotazy nebo návrhy na vylepšení? Otevřete issue!** 🚀
