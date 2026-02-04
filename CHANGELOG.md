# Changelog

## 2026-02-04

### Nová struktura stránek škol: Přehled + Detail oborů

Kompletní přepracování struktury URL a stránek škol:

**Nová struktura URL:**
- `/skola/{redizo}-{nazev}` - **Přehled školy** s kartami všech oborů/zaměření
- `/skola/{redizo}-{nazev}-{obor}` - **Detail oboru** s konkrétními statistikami
- `/skola/{redizo}-{nazev}-{obor}-{zamereni}` - **Detail zaměření** s vlastními daty

**Stránka přehledu školy:**
- Základní kontaktní informace o škole
- Karty všech oborů a zaměření s porovnáním:
  - Min. body pro přijetí
  - Kapacita
  - Index poptávky
  - Počet přihlášek / přijatých
- Celkové statistiky školy

**Stránka detailu oboru/zaměření:**
- Konkrétní statistiky pro daný obor nebo zaměření
- Navigační taby pro přepnutí na jiný obor/zaměření
- Odkaz zpět na přehled školy v breadcrumbs
- Každé zaměření má vlastní data (např. Gymnázium Arabská - Programování má 160 bodů, Přírodní vědy 172 bodů)

**Příklad:**
- Gymnázium Arabská (`/skola/600005682-gymnazium-arabska`) - přehled 3 zaměření
  - Humanitní vědy: 60 míst, min. 136 bodů
  - Programování: 30 míst, min. 158 bodů
  - Přírodní vědy: 60 míst, min. 154 bodů

### Nová stránka: Jak vybrat školu a uspět u přijímaček

- **Nová stránka:** `/jak-vybrat-skolu` - komplexní průvodce pro uchazeče
  - Osvědčené strategie pro výběr tří priorit na přihlášce
  - Tipy na přípravu na jednotné přijímací zkoušky
  - Jak vybrat správný profil školy (technická vs. humanitní)
  - Praktické rady pro den zkoušky
  - Odkazy na užitečné zdroje (TAU CERMAT, To-DAS.cz, CERMAT)
- **Hlavní stránka:** Výrazný odkaz na průvodce přidán do HERO sekce

### Navigace oborů na detailu školy

- **Nová funkce:** Přidána navigace mezi obory školy pomocí horizontálních tabů
  - Všechny taby jsou klikatelné a vedou na samostatné stránky
  - Aktivní obor je vizuálně zvýrazněn (hvězdička, indigo podtržení)
  - Každý tab zobrazuje kapacitu a minimální body pro přijetí

- **Vylepšení:** Plné české názvy typů škol místo zkratek
  - GY4 -> "Čtyřleté gymnázium"
  - GY6 -> "Šestileté gymnázium"
  - GY8 -> "Osmileté gymnázium"
  - SOŠ -> "Střední odborná škola"
  - SOU -> "Střední odborné učiliště"
  - LYC -> "Lyceum"

### Oprava duplicitních URL pro programy se stejným názvem

- **Bug fix:** Školy s více programy se stejným názvem ale různou délkou studia nyní mají unikátní URL
  - Např. Gymnázium Jana Nerudy má 4leté i 6leté gymnázium
  - Dříve: obě generovaly stejnou URL `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium`
  - Nyní: `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium-4lete` a `...-6lete`
- **Rozpoznávání stránek:** Funkce `getSchoolPageType()` správně rozpoznává slugy s délkou studia
- **Generování odkazů:** Všechny odkazy v tabech a kartách programů používají správné unikátní URL

### Technické změny

- Nový typ stránky `SchoolPageType` (overview/program/zamereni) v `data.ts`
- Nová funkce `getSchoolPageType()` pro rozpoznání typu stránky podle slugu
- Nová funkce `getSchoolOverview()` pro načtení dat přehledu školy
- Nová funkce `getExtendedStatsForProgram()` pro načtení statistik konkrétního zaměření
- Rozšířená funkce `generateAllSlugs()` generuje slugy pro přehledy, obory i zaměření
- Funkce `createSlug()` nyní podporuje čtvrtý argument (`delkaStudia`) pro rozlišení duplicitních názvů
- Celkový počet generovaných stránek vzrostl z ~2250 na ~4480
