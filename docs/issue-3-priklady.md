# Praktická ukázka: Zpracování Issue #3

## 🐛 Issue #3: Nesrovnalost minimálních bodů

**Problém:** Škola ukazuje minimum bodů 71, ale po rozkliknutí ČJ=22 + MA=11 (součet = 33)

---

## 🤖 Automatizované zpracování v Claude Code

### Krok 1: Načtení a analýza issue

**Příkaz:**
```
"Claude, přečti issue #3 a analyzuj problém"
```

**Co Claude udělá:**
```bash
# Načte detail issue
gh issue view 3 --json title,body,labels,url

# Analyzuje popis
# - Identifikuje: data inconsistency
# - Kategorie: bug, data
# - Priorita: HIGH (špatná data ovlivňují uživatele)
# - URL: /simulator
# - Kontakt: matoushonzirek@seznam.cz
```

**Output Clauda:**
```
📊 ANALÝZA ISSUE #3

Typ: 🐛 Data Bug
Priorita: 🟡 HIGH
Komponenta: Simulator + Data Layer

Problém:
- Zobrazeno: min_body = 71
- Realita: CJ_min = 22, MA_min = 11, součet = 33
- Rozdíl: 71 - 33 = 38 bodů (pravděpodobně extra_body za prospěch)

Možné příčiny:
1. Simulator zobrazuje min_body (celkové body) místo jpz_min (pouze JPZ)
2. Detail školy zobrazuje správně jpz_min, ale je to matoucí
3. Chybí vysvětlení, že 71 = JPZ (33) + Extra kritéria (38)

Doporučení:
- Přidat tooltip/vysvětlení v simulátoru
- Nebo zobrazovat JPZ body samostatně
```

---

### Krok 2: Vytvoření TODO úkolu

**Příkaz:**
```
"Claude, vytvoř TODO úkol pro issue #3"
```

**Co Claude udělá:**
```typescript
TaskCreate({
  subject: "Fix: Rozlišení min_body vs jpz_min v simulátoru",
  description: `
    Issue #3 - Uživatelé jsou zmatení rozdílem mezi:
    - min_body (celkové body včetně extra kritérií)
    - jpz_min (pouze JPZ body: ČJ + MA)

    Škola ukazuje 71, ale ČJ=22 + MA=11 = 33
    → 71 = 33 (JPZ) + 38 (extra kritéria)

    Akce:
    1. Přidat tooltip v simulátoru vysvětlující rozdíl
    2. Nebo rozdělit na "JPZ body" a "Celkové body"
    3. Testovat na mobilu (484x919 viewport)

    Kontakt: matoushonzirek@seznam.cz
    Issue: https://github.com/tangero/stredniskoly/issues/3
  `,
  activeForm: "Opravuji zobrazení bodů v simulátoru"
})
```

---

### Krok 3: Hledání kódu

**Příkaz:**
```
"Claude, najdi kód v simulátoru, který zobrazuje minimální body"
```

**Co Claude udělá:**
```bash
# Vyhledá relevantní soubory
grep -r "min_body" src/app/simulator/
grep -r "minimum.*bod" src/app/simulator/

# Přečte simulator komponentu
cat src/app/simulator/page.tsx
cat src/components/SimulatorSchoolCard.tsx (pokud existuje)
```

**Output:**
```
Našel jsem zobrazení v:
- src/app/simulator/page.tsx:245
  → {school.min_body} bodů

Problém: Zobrazujeme min_body, což obsahuje i extra kritéria.
Řešení: Měli bychom zobrazit jpz_min nebo přidat vysvětlení.
```

---

### Krok 4: Návrh opravy

**Příkaz:**
```
"Claude, navrhni opravu pro tento problém"
```

**Claude navrhne 2 varianty:**

#### Varianta A: Tooltip s vysvětlením
```tsx
// Přidat InfoTooltip komponentu
<div className="flex items-center gap-1">
  <span className="font-semibold">{school.min_body} bodů</span>
  <InfoTooltip content={
    school.hasExtraCriteria
      ? `Celkem ${school.min_body} b (JPZ: ${school.jpz_min} + Extra: ${school.extra_body})`
      : `Minimální body z JPZ testu (ČJ + MA)`
  } />
</div>
```

#### Varianta B: Rozdělené zobrazení
```tsx
<div className="text-sm">
  <div>JPZ body: <strong>{school.jpz_min}</strong></div>
  {school.hasExtraCriteria && (
    <div className="text-amber-600">
      + Extra kritéria: {school.extra_body}
      <InfoTooltip content="Prospěch, školní zkouška, aj." />
    </div>
  )}
  <div className="border-t mt-1 pt-1 font-semibold">
    Celkem: {school.min_body} bodů
  </div>
</div>
```

**Doporučení Clauda:**
```
🎯 Doporučuji Variantu B, protože:
1. ✅ Jasně odděluje JPZ body od extra kritérií
2. ✅ Uživatel vidí, že 71 = 33 (JPZ) + 38 (extra)
3. ✅ Eliminuje zmatení
4. ✅ Zachovává celkové body (min_body) jako hlavní metriku

⚠️ Poznámka: Testovat na mobilu (viewport 484x919)!
```

---

### Krok 5: Implementace opravy

**Příkaz:**
```
"Claude, implementuj Variantu B"
```

**Co Claude udělá:**

1. **Přečte aktuální kód:**
   ```typescript
   Read('src/app/simulator/page.tsx')
   ```

2. **Najde sekci zobrazení bodů:**
   ```typescript
   // Najde řádek s min_body
   // Např: <div>Minimum: {school.min_body}</div>
   ```

3. **Nahradí kód:**
   ```typescript
   Edit({
     file_path: 'src/app/simulator/page.tsx',
     old_string: `<div>Minimum: {school.min_body}</div>`,
     new_string: `
       <div className="text-sm space-y-1">
         <div>
           JPZ body: <strong>{school.jpz_min}</strong>
           <span className="text-gray-500 ml-1">(ČJ + MA)</span>
         </div>
         {school.hasExtraCriteria && (
           <div className="text-amber-600 text-xs">
             + Extra kritéria: {school.extra_body} b
             <InfoTooltip content="Body za prospěch, školní zkoušku, aj." />
           </div>
         )}
         <div className="border-t pt-1 font-semibold">
           Celkem: {school.min_body} bodů k přijetí
         </div>
       </div>
     `
   })
   ```

4. **Testuje na mobilu:**
   ```
   "Zkontroluj, že layout vypadá dobře na šířce 484px"
   ```

---

### Krok 6: Commit a zavření issue

**Příkaz:**
```
"Claude, commitni opravu a zavři issue #3"
```

**Co Claude udělá:**

```bash
# 1. Přidá soubory do stage
git add src/app/simulator/page.tsx

# 2. Vytvoří commit (s odkazem na issue)
git commit -m "Fix #3: Rozlišení JPZ bodů vs celkových bodů v simulátoru

Opraveno:
- Simulátor nyní zobrazuje JPZ body (ČJ+MA) samostatně
- Extra kritéria (prospěch, školní zkouška) jsou označeny
- Celkové body k přijetí jsou jasně odděleny

Před: Matoucí zobrazení 71 bodů (bez vysvětlení)
Po: JPZ 33 + Extra 38 = Celkem 71

Tested on mobile viewport (484x919)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push na GitHub
git push origin main

# 4. Zavře issue s komentářem
gh issue close 3 --comment "✅ Opraveno v commitu $(git rev-parse --short HEAD)

Simulator nyní jasně rozlišuje:
- **JPZ body** (ČJ + MA) - čisté body z přijímacího testu
- **Extra kritéria** (prospěch, školní zkouška, atd.)
- **Celkové body** potřebné k přijetí

Děkujeme za nahlášení! 🙏

---
📧 Kontakt: matoushonzirek@seznam.cz - zaslán email s potvrzením opravy"
```

---

## 📧 Bonus: Automatický email

**Příkaz:**
```
"Claude, pošli email uživateli že je issue opraveno"
```

**Email draft:**
```
Komu: matoushonzirek@seznam.cz
Předmět: Oprava: Nesrovnalost minimálních bodů v simulátoru

Dobrý den,

děkujeme za nahlášení problému s minimálními body v našem simulátoru!

✅ Problém byl opraven

Nově simulátor zobrazuje:
- JPZ body (22 + 11 = 33) - čisté body z přijímačky
- Extra kritéria (+38 bodů) - body za prospěch a školní zkoušku
- Celkem 71 bodů potřebných k přijetí

Tím jsme odstranili zmatení, které vznikalo při porovnání
celkových bodů (71) s jednotlivými předměty (33).

Změna je aktivní na: https://prijimackynaskolu.cz/simulator

S pozdravem,
Tým Přijímačky na střední školy

---
🔗 GitHub Issue: https://github.com/tangero/stredniskoly/issues/3
```

---

## 📊 Celkový přehled workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Uživatel nahlásí bug přes web widget               │
│     → Issue se automaticky vytvoří na GitHubu           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Claude Code přečte issue                            │
│     → Analyzuje problém, kategorizuje, prioritizuje     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. Claude vytvoří TODO úkol                            │
│     → Detailní popis + odkazy na relevantní soubory     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. Claude najde a přečte relevantní kód                │
│     → Identifikuje místo s bugem                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. Claude navrhne opravu                               │
│     → Může nabídnout více variant řešení                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  6. Po schválení: Claude implementuje fix               │
│     → Edit souboru, test, commit s odkazem "Fix #3"     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  7. Claude pushne a zavře issue                         │
│     → Přidá komentář s detaily opravy                   │
│     → (Volitelně) pošle email reportérovi               │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Rychlé příkazy (copy-paste ready)

```bash
# Přečti a analyzuj issue #3
"Claude, přečti issue #3 a řekni mi, v čem je problém"

# Vytvoř TODO
"Claude, vytvoř TODO úkol pro issue #3"

# Najdi kód
"Claude, najdi v simulátoru kód, který zobrazuje minimální body"

# Navrhni opravu
"Claude, navrhni jak opravit zobrazení min_body vs jpz_min"

# Implementuj
"Claude, implementuj opravu a otestuj na mobilu"

# Commit a zavři
"Claude, commitni opravu a zavři issue #3 s komentářem"
```

---

**🎯 Výsledek:** Issue opraven během ~10 minut, uživatel informován, kód je v produkci!
