# GitHub Issues - Automatizace v Claude Code

## 📋 Současný stav

### ✅ Co už máme implementováno:

1. **Bug Report Widget** (`/src/components/BugReportButton.tsx`)
   - Plovoucí tlačítko "Nahlásit chybu" na každé stránce
   - Formulář s popisem chyby a volitelným emailem
   - Automatické sbírání technických údajů (URL, User Agent, Viewport)

2. **API Endpoint** (`/src/app/api/bug-report/route.ts`)
   - Validace vstupu (10-2000 znaků)
   - Rate limiting (3 požadavky / 15 minut na IP)
   - Automatické vytvoření GitHub Issue přes GitHub API
   - Label: `bug-report`

3. **GitHub Issues**
   - Aktuálně: 3 otevřené bug reporty
   - Formát: `[Bug Report] {popis}`
   - Obsahují: popis, kontakt (email), technické info

---

## 🤖 Automatizace v Claude Code

### 1️⃣ Načtení a zobrazení issues

#### Příkaz v terminálu:
```bash
# Seznam všech otevřených issues
gh issue list --limit 20

# Detail konkrétního issue
gh issue view 3

# Issues s konkrétním labelem
gh issue list --label bug-report

# Issues v JSON formátu (pro zpracování)
gh issue list --json number,title,body,labels,createdAt,state
```

#### V Claude Code:
Můžeš říct Claudovi:
- "Zobraz mi všechny otevřené GitHub issues"
- "Jaké máme bug reporty?"
- "Přečti mi detail issue #3"

---

### 2️⃣ Automatická triáž a prioritizace

Claude Code může automaticky:

**A) Kategorizovat issues:**
```
- 🐛 Bug (nefunkční feature)
- 📊 Data (špatné číslo, chybějící škola)
- 🎨 UI/UX (grafická chyba, responsivita)
- 📱 Mobile (problémy na mobilu)
- ⚡ Performance (pomalé načítání)
```

**B) Nastavit prioritu:**
```
- 🔴 CRITICAL: Aplikace nefunguje, data issue
- 🟡 HIGH: Vizuální bug, špatná data
- 🟢 MEDIUM: UX zlepšení
- ⚪ LOW: Drobné kosmetické úpravy
```

**Příklad použití:**
```
"Claude, projdi všechny otevřené issues a vytři je podle typu a priority"
```

---

### 3️⃣ Automatické vytvoření TODO tasků

Claude Code umí vytvořit TODO tasky z issues:

**Příklad workflow:**
```
1. Claude přečte issue #3
2. Analyzuje problém: "minimum bodů 71, ale ČJ=22 + MA=11 = 33"
3. Vytvoří TODO task:
   - Název: "Fix: Oprava výpočtu minimálních bodů JPZ"
   - Popis: "Issue #3 - škola ukazuje min_body 71, ale JPZ je 33"
   - Label: bug, data
```

**Příkaz:**
```
"Claude, vytvoř TODO úkoly ze všech otevřených bug reportů"
```

---

### 4️⃣ Automatická analýza a oprava

**Workflow:**

1. **Načti issue:**
   ```
   "Claude, přečti issue #3 a zjisti, v čem je problém"
   ```

2. **Analyzuj kód:**
   Claude automaticky:
   - Najde související soubory (`src/lib/data.ts`, `schools_data.json`)
   - Identifikuje bug (špatný výpočet `min_body`)
   - Navrhne opravu

3. **Oprav a testuj:**
   ```
   "Claude, oprav problém z issue #3 a otestuj fix"
   ```

4. **Commit a zavři issue:**
   ```bash
   git commit -m "Fix #3: Oprava výpočtu minimálních bodů JPZ"
   git push
   gh issue close 3 --comment "Opraveno v commitu XYZ"
   ```

---

### 5️⃣ Batch zpracování issues

**Zpracuj všechny naráz:**

```
"Claude, projdi všechny otevřené bug reporty a:
1. Kategorizuj je podle typu
2. Vytvoř TODO tasky pro každý
3. Oprav ty, které jsou jednoduché
4. Pro složité issues mi navrhni řešení"
```

**Claude potom:**
1. Načte všechny issues: `gh issue list --json ...`
2. Přečte každý detail: `gh issue view {number}`
3. Vytvoří TODO tasky
4. Začne s opravami (od nejjednodušších)

---

## 🎯 Konkrétní příklady použití

### Příklad 1: Oprava dat
**Issue #3:** "Škola ukazuje minimum bodů 71, ale ČJ=22 + MA=11"

**Claude Code workflow:**
```
1. "Claude, analyzuj issue #3"
   → Claude najde problém v schools_data.json nebo data.ts

2. "Oprav výpočet minimálních bodů"
   → Claude opraví logiku (min_body vs jpz_min)

3. "Commitni a zavři issue #3"
   → git commit + gh issue close
```

### Příklad 2: UI Bug
**Issue #4:** "Tohle fakt nefunguje, Patricku!"

**Claude Code workflow:**
```
1. "Co je v issue #4?"
   → Claude přečte detail a zjistí kontext

2. "Reprodukuj problém na URL z issue"
   → Claude zkontroluje URL, najde komponentu

3. "Oprav problém a vytvoř fix"
   → Claude opraví kód, otestuje
```

### Příklad 3: Data chyba
**Issue #2:** "SPŠ sdělovací techniky neotevře obor GST"

**Claude Code workflow:**
```
1. "Zkontroluj, zda škola 600015XXX má obor GST v datech"
   → Claude prohledá schools_data.json

2. "Pokud tam obor není, přidej poznámku do issue"
   → gh issue comment 2 "Data z CERMATu neobsahují tento obor..."

3. "Zavři issue s vysvětlením"
   → gh issue close 2
```

---

## 📊 Zobrazení issues na webu (volitelně)

### Možnost A: Přidat stránku `/issues`

**Vytvořit:** `/src/app/issues/page.tsx`

```tsx
// Stránka zobrazující všechny otevřené issues
export default async function IssuesPage() {
  // Fetch issues z GitHub API nebo staticky z gh CLI
  const issues = await fetchGitHubIssues();

  return (
    <div>
      <h1>Nahlášené chyby</h1>
      {issues.map(issue => (
        <IssueCard key={issue.number} issue={issue} />
      ))}
    </div>
  );
}
```

### Možnost B: Integrovat do changelogu

Přidat sekci "Známé problémy" do `/changelog`:

```tsx
// V changelog/page.tsx
<section>
  <h2>🐛 Známé problémy</h2>
  <ul>
    {openIssues.map(issue => (
      <li key={issue.number}>
        <a href={issue.url}>#{issue.number}: {issue.title}</a>
      </li>
    ))}
  </ul>
</section>
```

---

## 🔧 Nastavení pro automatizaci

### Předpoklady:
1. ✅ GitHub CLI (`gh`) je nainstalováno a autentizováno
2. ✅ `GITHUB_TOKEN` je v `.env` (pro API endpoint)
3. ✅ Claude Code má přístup k repozitáři

### Příkazy pro setup:
```bash
# Zkontroluj, zda gh funguje
gh auth status

# Nastav default repo
gh repo set-default tangero/stredniskoly

# Test - seznam issues
gh issue list
```

---

## 📝 Doporučený workflow

### Denní review:
```
1. "Claude, jaké máme nové issues od včera?"
2. "Kategorizuj je a vytvoř TODO tasky"
3. "Začni s opravami kriticképřích bugů"
```

### Týdenní cleanup:
```
1. "Claude, projdi všechny otevřené issues"
2. "Zavři ty, které jsou duplikáty nebo už opravené"
3. "Aktualizuj prioritu zbývajících"
```

### Před releasem:
```
1. "Claude, jaké kritické bugy ještě máme?"
2. "Oprav všechny CRITICAL issues"
3. "Vytvoř changelog entry pro opravené bugy"
```

---

## 🚀 Rychlé příkazy pro Claude Code

```bash
# Základní
"Zobraz mi všechny otevřené issues"
"Přečti detail issue #3"
"Vytvoř TODO úkol z issue #5"

# Analýza
"Analyzuj všechny bug reporty a najdi společné problémy"
"Které issues jsou nejdůležitější?"
"Co je nejčastější typ chyby?"

# Akce
"Oprav issue #3"
"Zavři issue #4 s komentářem že je opraveno"
"Vytvoř nový issue pro chybějící školu XYZ"

# Batch operace
"Zpracuj všechny issues s labelem 'bug-report'"
"Oprav všechny jednoduché data issues"
"Vytvoř summary všech otevřených issues"
```

---

## 🎓 Best Practices

1. **Vždy přečti issue kompletně** - technické detaily (URL, viewport) pomáhají s reprodukcí
2. **Ověř problém** - před opravou zkontroluj, že bug existuje
3. **Komunikuj** - přidej komentář do issue před zavřením
4. **Linkuj commity** - použij `Fix #3` v commit message
5. **Testuj opravu** - ověř, že fix funguje na původní URL z issue

---

## 📚 Odkazy

- **GitHub CLI docs:** https://cli.github.com/manual/
- **GitHub API:** https://docs.github.com/en/rest/issues
- **Issues v repozitáři:** https://github.com/tangero/stredniskoly/issues

---

## 🆘 Troubleshooting

### Problem: "gh: command not found"
**Řešení:**
```bash
brew install gh
gh auth login
```

### Problem: "API rate limit exceeded"
**Řešení:**
- Použij `GITHUB_TOKEN` s vyššími limity
- Nebo počkej hodinu (rate limit se resetuje)

### Problem: "Permission denied"
**Řešení:**
```bash
gh auth refresh -s repo
```

---

**Vytvořeno:** 8. 2. 2026
**Autor:** Claude Code automatizační průvodce
