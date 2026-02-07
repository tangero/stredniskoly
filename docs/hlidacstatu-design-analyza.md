# Analýza designu: Hlídač státu vs. Přijímačky na školu

> Datum analýzy: 2026-02-07
> Cíl: Grafická kompatibilita prijimackynaskolu.cz s ekosystémem hlidacstatu.cz

---

## 1. Hlídač státu - design system

### Fonty
- **Primární**: Cabin (400, 400i, 600, 700) — Google Fonts, latin-ext
- **Sekundární**: Source Sans Pro (300, 400, 600, 700)
- **Monospace**: Lucida Console, Monaco, Courier New

### Barevná paleta

| Název | Hex | RGB | Použití |
|-------|-----|-----|---------|
| Primární modrá | `#0074e4` | rgb(0, 116, 228) | Odkazy, tlačítka, nav links |
| Tmavá modrá | `#003688` | rgb(0, 54, 136) | Search bar pozadí |
| Text | `#28313b` | rgb(40, 49, 59) | Body text, nadpisy |
| Body bg | `#ffffff` | rgb(255, 255, 255) | Pozadí stránky |
| Footer bg | `#f2f5f7` | rgb(242, 245, 247) | Pozadí patičky |
| Červená (badge) | `#ff525b` | rgb(255, 82, 91) | Štítky, upozornění |
| Zelená | `#38caaa` | rgb(56, 202, 170) | Success stavy |
| Oranžová | `#ffbf66` | rgb(255, 191, 102) | Warning, akcentní prvky |
| Oranžová tmavá | `#ff5900` | rgb(255, 89, 0) | CTA, důležité odkazy |
| Info modrá | `#5bc0de` | rgb(91, 192, 222) | Info badges |
| Šedá muted | `#818c99` | rgb(129, 140, 153) | Sekundární text |

### CSS Custom Properties (z hlidac.css)
```css
--pv-bg: #0f1422
--pv-cyan: #00ffd1
--pv-purple: #4c2cff
--pv-accent: #e3ff00
--pv-dark: #121628
--pv-muted: #C7C7CA
--pv-text: #EFEFF0
```

### Framework a technologie
- Bootstrap 5 (customizovaný)
- jQuery
- Vlastní CSS overrides (bootstrap.hlidac.min.css, hlidac.css, site.css)

### Navbar
- Pozadí: **bílé** (`#ffffff`)
- Výška: **80px**
- Shadow: ano (Bootstrap `.shadow`)
- CSS třídy: `navbar navbar-expand-lg navbar-light shadow hlidac nav-hs`
- Logo: SVG ikona domečku + text "Hlídač **státu**" (bold na druhém slově)
- Nav links: modrá `#0074e4`, font-weight 600, font-size 16px
- Vpravo: Přihlášení / Registrace s ikonami

### Search bar (pod navbarem)
- Pozadí: **tmavě modrá** `#003688`
- Input: bílý, border-radius 4px 0 0 4px
- Tlačítko "HLEDAT": `#0074e4`, bílý text, border-radius 0 4px 4px 0
- Pod ním: pomocné odkazy (Nápověda, Snadné hledání) ve žluté/oranžové

### Footer
- Pozadí: **světle šedá** `#f2f5f7`
- Text: `#28313b`
- Layout: 3 sloupce
- Sloupec 1: O nás, Podporují nás, Proč hlídáme, Náš kodex, Kontakt
- Sloupec 2: Team, Podpořte nás!, API a Open data, Podmínky, Pro média
- Sloupec 3: Nahlásit chybu, Status, K-index, Sledujte nás (sociální sítě)
- Sociální sítě: Facebook, X, Instagram, LinkedIn, Threads, Bluesky

### Designové vzory
- Border-radius: **4px** (standardní), nikdy výrazně zaoblené
- Žádné gradienty — čisté plné barvy
- CTA odkazy: uppercase, letter-spacing 1px, 2px underline, offset 0.375rem
- Badges: malé, zaoblené (16px radius), plné barvy
- Obsah: převážně jednosloupcový layout
- Breadcrumbs: jednoduché s ">" separátorem
- Stránky: bílé pozadí, čistý typografický styl

---

## 2. Přijímačky na školu (prijimackynaskolu.cz) - současný stav

### Fonty
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Barevná paleta
- Primární: Indigo/Purple gradient (`from-indigo-500 to-purple-600`)
- CSS proměnné: `--color-primary: #667eea`, `--color-primary-dark: #5a67d8`
- Text: `slate-900`
- Pozadí: `slate-50`
- Footer: `slate-800` (tmavý)

### Framework
- Next.js 16 + React 19 + Tailwind CSS v4

### Designové vzory
- Border-radius: `rounded-xl` (12px) — výrazně zaoblené
- Gradienty všude (header, hero, CTA)
- Moderní startup/SaaS look

---

## 3. Rozdíly a potřebné změny

| Oblast | Současný stav | Cíl (HŠ styl) |
|--------|--------------|----------------|
| Font | System stack | **Cabin** (Google Fonts) |
| Primární barva | Indigo/Purple gradient | **#0074e4** plná modrá |
| Header | Gradient purple | **Bílý** se shadow |
| Search bar | Není v headeru | **Tmavě modrá lišta** pod navbarem |
| Footer | Tmavý (slate-800) | **Světlý** (#f2f5f7) |
| Border-radius | 12px (rounded-xl) | **4px** (rounded) |
| Gradienty | Všude | **Žádné** — plné barvy |
| CTA tlačítka | Gradient, velká, zaoblená | Plná modrá #0074e4, 4px radius |
| Odkaz barva | indigo-600 | **#0074e4** |
| Navbar výška | ~56px | **80px** |

---

## 4. Plán implementace

### Fáze 1: Základy designu
- Přidat Google Font Cabin do layoutu
- Aktualizovat CSS variables na paletu HŠ
- Změnit body font-family a pozadí

### Fáze 2: Header a navigace
- Bílý navbar se shadow místo gradientu
- Logo s ikonou + text ve stylu HŠ
- Nav links v modré #0074e4
- Search bar pod navbarem (tmavě modrý pruh)

### Fáze 3: Footer
- Světlé pozadí #f2f5f7
- Tmavý text #28313b
- Odkazy na Hlídač státu
- Sociální sítě

### Fáze 4: Komponenty
- Tlačítka: plná modrá, 4px radius, uppercase CTA
- Karty: snížit border-radius
- Badges: paleta HŠ
- Breadcrumbs

### Fáze 5: Integrace do ekosystému HŠ
- Odkaz zpět na hlidacstatu.cz
- Badge "Projekt Hlídače státu"
- Kompatibilní branding a meta tagy
