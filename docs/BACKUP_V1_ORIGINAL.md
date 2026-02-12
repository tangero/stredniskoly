# Záloha původního designu - V1

**Datum zálohy:** 11. února 2026
**Důvod:** Před redesignem na 3-stránkovou architekturu

---

## Zálohované soubory

### 1. Hlavní stránka profilu školy
- **Originál:** `src/app/skola/[slug]/page.tsx`
- **Záloha:** `src/app/skola/[slug]/page.v1_original.tsx`
- **Velikost:** ~737 řádků
- **Popis:** Unified stránka zobrazující jak přehled školy (více oborů), tak detail jednotlivého oboru

### 2. InspIS komponenta
- **Originál:** `src/components/school-profile/SchoolInfoSection.tsx`
- **Záloha:** `src/components/school-profile/SchoolInfoSection.v1_original.tsx`
- **Popis:** Zobrazení InspIS dat včetně VLNA 1.5 (komunikace a okolí)

---

## Struktura V1 (před redesignem)

### Přehled školy
```
1. Breadcrumb navigace
2. Header s gradientem (název školy, základní info)
3. Statistiky přehledu (4 karty)
4. Seznam oborů (grid karet)
5. InspIS profil školy (pokud dostupný)
6. Inspekce ČŠI
7. Kontakt
8. CTA (simulátor)
```

### Detail oboru
```
1. Breadcrumb navigace
2. Header s gradientem
3. Navigace oborů (ProgramTabs)
4. Stats Grid (hlavní metriky)
5. Priority Distribution Bar
6. Kam se hlásí ostatní uchazeči
7. Analýza strategií uchazečů
8. Šance přijetí podle priority + Náročnost testů
9. Profily přijatých studentů
10. Profil náročnosti školy
11. Přihlášky a přijetí + Bodové statistiky
12. Interpretace (co to znamená)
13. Inspekce ČŠI
14. Kontakt
15. CTA
```

---

## Hlavní problémy V1

### Information overload
- 23 bloků informací na jedné stránce (detail oboru)
- Žádná prioritizace podle důležitosti
- Rodiče neví, kde začít

### Absence personalizace
- Všem rodičům ukážeme všechno
- Chybí "guided journey"
- Žádná filtrace podle potřeb

### Decision paralysis
- Příliš mnoho dat najednou
- Chybí jasné "go/no-go" signály
- Rodiče neví, co je důležité

### Mobile UX
- Příliš dlouhé scrollování
- Malé čísla těžko čitelné
- Grafy komplikované na mobilu

---

## Co fungovalo dobře

✅ **Třívrstvá struktura dat**
- Jednotky přijetí: všechny programy v jedné budově
- Priorita 1 volby: nejbližší "konkurence"
- Typ školy: širší kontext

✅ **Vizuální hierarchie (částečně)**
- Min. body červeně zvýrazněny
- Obtížnost barevně kódována
- Kategorie školy s barevnými chipy

✅ **Trend data**
- Porovnání 2024 vs 2025
- Změny v procentech
- Směr trendu barevně

✅ **Komponenty shadcn/ui**
- Konzistentní design system
- Responzivní layout
- Dobré základy

---

## Návrat k V1

Pokud budete potřebovat vrátit V1 design:

```bash
# Obnovit hlavní stránku
cp "src/app/skola/[slug]/page.v1_original.tsx" "src/app/skola/[slug]/page.tsx"

# Obnovit InspIS komponentu
cp src/components/school-profile/SchoolInfoSection.v1_original.tsx src/components/school-profile/SchoolInfoSection.tsx

# Build
npm run build
```

---

## Git historie

Pro celou historii změn:
```bash
git log --follow "src/app/skola/[slug]/page.tsx"
git log --follow src/components/school-profile/SchoolInfoSection.tsx
```

---

**Status:** ✅ ZÁLOHOVÁNO
**Další krok:** Implementace V2 - 3-stránková architektura s progressive disclosure
