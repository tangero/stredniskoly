# UX/UI Audit - Simulátor přijímacích zkoušek na SŠ

**Datum:** 5. 2. 2026
**Verze:** 1.4.0
**Auditor:** Automatizovaný UX audit

---

## Shrnutí

Aplikace je celkově dobře navržená s konzistentním designem. Hlavní problémy se týkají mobilní responsivity u tabulkových dat a jedné stránky bez navigace. Bylo identifikováno **4 kritických**, **4 vysokých** a **3 středních** problémů.

---

## Kritické problémy (CRITICAL)

### C1: Stránka "Jak funguje přijímání" nemá Header/Footer
- **Soubor:** `src/app/jak-funguje-prijimani/page.tsx`
- **Popis:** Stránka neimportuje ani nepoužívá komponenty `<Header />` a `<Footer />`. Uživatel nemá žádnou navigaci a nemůže se vrátit na hlavní stránku bez použití tlačítka zpět v prohlížeči.
- **Dopad:** Uživatel je "uvězněn" na stránce bez navigace. Chybí konzistence s ostatními stránkami.
- **Oprava:** Přidat Header a Footer, obalit obsah do min-h-screen flex flex-col layoutu.

### C2: SVG diagram s fixní šířkou 700px přetéká na mobilech
- **Soubor:** `src/app/jak-funguje-prijimani/page.tsx` (řádek 65)
- **Popis:** SVG má `width="700"` a `viewBox="0 0 700 200"`, ale nemá `className="w-full max-w-[700px]"` ani `preserveAspectRatio`. Na mobilech (375px) přetéká.
- **Dopad:** Horizontální scrollbar na mobilních zařízeních, nepoužitelný diagram.
- **Oprava:** Přidat responsivní atributy na SVG element.

### C3: Tabulka Top 50 škol na /skoly nemá mobilní zobrazení
- **Soubor:** `src/app/skoly/page.tsx` (řádky 122-173)
- **Popis:** Tabulka s 9 sloupci je obalena pouze `overflow-x-auto`. Na mobilech (375px) je nutné horizontálně scrollovat, což je na dotykových zařízeních obtížné a neintuitivní.
- **Dopad:** Klíčová data jsou na mobilech prakticky nečitelná.
- **Oprava:** Přidat mobilní card view (vzor: RegionSchoolsTable.tsx).

### C4: Tabulka Top 10 na /regiony nemá mobilní zobrazení
- **Soubor:** `src/app/regiony/page.tsx` (řádky 102-151)
- **Popis:** Podobně jako C3, tabulka Top 10 nejtěžších oborů používá pouze `overflow-x-auto` bez mobilní alternativy.
- **Dopad:** Horizontální scroll na mobilech.
- **Oprava:** Přidat mobilní card view.

---

## Vysoké problémy (HIGH)

### H1: Numerické inputy v simulátoru nemají inputMode="numeric"
- **Soubor:** `src/app/simulator/SimulatorClient.tsx` (řádky 560-567, 578-585)
- **Popis:** Inputy pro body z ČJ a MA používají `type="number"`, ale chybí `inputMode="numeric"`. Na mobilních zařízeních se tak může zobrazit plná klávesnice místo numerické.
- **Dopad:** Horší UX při zadávání bodů na mobilu.
- **Oprava:** Přidat `inputMode="numeric"` na oba inputy.

### H2: Kontrastní poměr text-slate-400 na bílém pozadí
- **Soubor:** Více souborů (Footer.tsx, skoly/page.tsx, regiony/page.tsx)
- **Popis:** Třída `text-slate-400` (#94a3b8) na bílém pozadí má kontrastní poměr ~3.0:1, což nesplňuje WCAG AA normu (4.5:1 pro běžný text).
- **Dopad:** Snížená čitelnost pro uživatele se zrakovým postižením.
- **Oprava:** Použít `text-slate-500` (#64748b, poměr ~5.4:1) pro informační texty.

### H3: Legenda na /skoly je neresponsivní
- **Soubor:** `src/app/skoly/page.tsx` (řádky 86-113)
- **Popis:** Legenda používá `flex flex-wrap` bez specifických breakpointů pro mobil. Na malých obrazovkách se text a badges mohou překrývat.
- **Dopad:** Špatná čitelnost legendy na mobilech.
- **Oprava:** Přidat grid layout pro mobily podobně jako na regiony/[kraj].

### H4: Stránka jak-funguje-prijimani nemá breadcrumbs
- **Soubor:** `src/app/jak-funguje-prijimani/page.tsx`
- **Popis:** Chybí breadcrumb navigace konzistentní s ostatními stránkami.
- **Dopad:** Nekonzistentní navigační vzor.
- **Oprava:** Přidat breadcrumbs (Domů / Simulátor / Jak funguje přijímání).

---

## Střední problémy (MEDIUM)

### M1: Footer grid přeskakuje z 1 sloupce na 3
- **Soubor:** `src/components/Footer.tsx` (řádek 7)
- **Popis:** Grid používá `grid-cols-1 md:grid-cols-3`, chybí mezistupeň `sm:grid-cols-2`.
- **Dopad:** Na tabletech (640-768px) je obsah zbytečně natažený na celou šířku.
- **Oprava:** Přidat `sm:grid-cols-2`.

### M2: Chybí meta viewport pro stránku jak-funguje-prijimani
- **Soubor:** `src/app/jak-funguje-prijimani/page.tsx`
- **Popis:** Viewport meta tag je v layout.tsx, ale stránka nemá min-h-screen wrapper.
- **Dopad:** Minimální - layout je řešen globálně, ale chybí flex-col layout.

### M3: Absence skip-to-content linku
- **Soubor:** `src/app/layout.tsx`
- **Popis:** Chybí "přeskočit na obsah" odkaz pro klávesnicovou navigaci.
- **Dopad:** Snížená přístupnost pro uživatele screen readerů.

---

## Implementační plán

### Priorita oprav:
1. **C1 + C2 + H4** - Oprava stránky jak-funguje-prijimani (Header/Footer/SVG/breadcrumbs)
2. **C3** - Mobilní karty pro Top 50 na /skoly
3. **C4** - Mobilní karty pro Top 10 na /regiony
4. **H1** - inputMode na simulátoru
5. **H2** - Kontrastní poměry
6. **H3** - Legenda na /skoly
7. **M1** - Footer grid breakpoint
