# Plán: Statistika přihlášek 2026 – „Jaké mám šance?"

## Dostupná data z CERMAT (data.cermat.cz)

### 1. Data o přihláškách 1. kola 2026 (XLSX ke stažení)
- **Zdroj:** https://data.cermat.cz/85-aktuality/297-data-o-prihlaskach-do-oboru-ss-v-1-kole
- **Obsah:** Počty přihlášek a kapacit na úrovni škola + obor (REDIZO/IZO + KKOV)
- **Pole:** kapacita 2026, počet přihlášek 2026, přihlášky podle priority (P1-P5)
- **Stav:** Data jsou průběžně aktualizována (kapacity se mohou měnit do 7.5.2026)

### 2. Anonymizovaná data uchazečů 2024 + 2025 (již máme)
- **Zdroj:** https://data.cermat.cz/menu/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/datove-soubory
- **Obsah:** Individuální přihlášky s prioritou, REDIZO, KKOV, přijetí/nepřijetí, JPZ skóre
- **Stav:** Již importována v `schools_data.json` (2024: 2721 oborů, 2025: 2837 oborů)

### 3. Agregovaná data JPZ (historická 2017-2023)
- **Zdroj:** https://data.cermat.cz/menu/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz
- **Obsah:** Agregované výsledky testů na úrovni škol a oborových skupin

---

## Co nového přináší data 2026

Klíčová novinka: **známe počty přihlášek 2026 PŘED konáním zkoušek**. To znamená, že můžeme rodičům a žákům říct:

> „Na tuto školu se letos přihlásilo X lidí na Y míst. Na základě dat z minulých let odhadujeme vaše šance takto..."

---

## Navrhovaná nová funkce: „Moje šance" kalkulačka

### Koncept
Uživatel zadá **až 3 školy** (své přihlášky s prioritami) a volitelně **odhadované skóre z JPZ** (nebo výsledek z simulátoru). Systém mu vrátí:

### Výstupy pro každou školu:

#### A) Konkurenční tlak 2026 vs. minulé roky
| Metrika | Popis |
|---------|-------|
| **Přihlášky 2026** | Kolik se letos přihlásilo |
| **Kapacita 2026** | Kolik míst je k dispozici |
| **Index poptávky 2026** | Přihlášky / kapacita |
| **Trend** | Porovnání s 2024 a 2025 (↑↓→) |
| **Přihlášky podle priority** | Kolik lidí má tuto školu jako P1, P2, P3 |

#### B) Odhad šancí na přijetí (na základě historických dat)
| Metrika | Popis |
|---------|-------|
| **Historická úspěšnost** | % přijatých v 2024/2025 při podobném poměru přihlášek/kapacit |
| **Minimální body pro přijetí** | Historický min. skór (2024, 2025) |
| **Potřebný bodový odhad** | Na základě aktuálního počtu přihlášek |
| **Šance podle priority** | Jaký % uchazečů s P1/P2/P3 byl přijat historicky |

#### C) Strategické hodnocení kombinace přihlášek
| Metrika | Popis |
|---------|-------|
| **Rizikovost kombinace** | Jsou všechny 3 školy náročné? Má záložní variantu? |
| **Překryv uchazečů** | Kam se hlásí ostatní, kteří si vybrali stejné školy |
| **Doporučení** | „Vaše kombinace je riziková/vyvážená/bezpečná" |

### Implementační kroky:

1. **Import dat přihlášek 2026** (nový ETL skript)
   - Stáhnout XLSX z data.cermat.cz (data o přihláškách 1. kola 2026)
   - Parsovat a namapovat na existující REDIZO+KKOV strukturu
   - Přidat do `schools_data.json` jako rok 2026 (zatím bez výsledků JPZ)
   - Pole: `kapacita_2026`, `prihlasky_2026`, `prihlasky_priority_2026`, `index_poptavky_2026`

2. **Nová stránka `/sance` (nebo `/moje-sance`)**
   - Formulář: 3 pole pro výběr školy (autocomplete z existujícího SearchBar)
   - Volitelně: odhadované body ČJ + MA (nebo link na simulátor)
   - Výstupní karty pro každou školu s metrikami výše

3. **Výpočetní logika (`src/lib/chances.ts`)**
   - Porovnání 2026 přihlášek s historickými daty 2024/2025
   - Odhad cut-off skóre na základě poměru přihlášek/kapacit
   - Kategorizace rizika kombinace (3 školy dohromady)
   - Zohlednění priority (P1 má historicky vyšší úspěšnost)

4. **Rozšíření stránek škol o data 2026**
   - Na každé školní stránce přidat banner/sekci „Přihlášky 2026"
   - Vizuální srovnání s minulými roky (bar chart nebo sparkline)

---

## Priorita výstupů pro rodiče/žáky

### Must-have (okamžitá hodnota):
1. **Na stránce každé školy:** „Letos se přihlásilo X uchazečů na Y míst" + srovnání s minulými roky
2. **Index poptávky 2026** s barevným štítkem (zelená = nízká konkurence, červená = vysoká)
3. **Historická minimální bodová hranice** jako orientační vodítko

### Should-have (velká přidaná hodnota):
4. **Kalkulačka „Moje šance"** – zadej 3 školy, dostaneš hodnocení
5. **Strategické doporučení** – je tvoje kombinace přihlášek vyvážená?
6. **Priority breakdown 2026** – kolik lidí má školu jako P1 vs P3

### Nice-to-have:
7. **Regionální přehledy 2026** – kde je přetlak, kde jsou volná místa
8. **Prediktivní model** – odhad cut-off bodů 2026 na základě trendu
9. **Srovnání s vloni** – „letos o 15% více přihlášek" alert
