# Changelog

Všechny podstatné změny v projektu jsou dokumentovány v tomto souboru.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## [Unreleased]

### Přidáno

### Změněno

### Opraveno

## [0.2.0] — 2026-02-10

### Přidáno
- **Autonomní auto-fix systém** — automatické opravy bug reportů pomocí GitHub Actions a AI (Claude/GLM-4.7 přes OpenRouter)
  - AI validace před vytvořením issue (spam detection, rate limiting, honeypot)
  - Automatická analýza problému a vytvoření opravy
  - Iterativní workflow s testováním a feedback loop (až 3 pokusy)
  - Draft PR s možností review před mergnutím
  - Email notifikace přes Resend API
- **AI shrnutí inspekčních zpráv ČŠI** — automaticky generovaná shrnutí z inspekčních zpráv zobrazená na detailu školy (v2.4.0)
  - Extrakce klíčových bodů z PDF zpráv pomocí AI
  - Nová samostatná stránka `/skola/[slug]/inspekce` s podrobným shrnutím všech inspekčních zpráv
  - Zobrazení shrnutí pro rodiče, silné stránky, rizika, fakta ze zprávy
  - Tlačítko „Co si o škole myslí Školská inspekce?" v hlavičce školy
  - Deduplikace a agregace dat podle REDIZO
  - Optimalizace velikosti dat (7.1 MB → 5.0 MB)
- **Stránka /issues** — přehled všech bug reportů s filtry a statistikami
- **Clicky.com analytics** — integrace sledování návštěvnosti

### Změněno
- **Model pro auto-opravy** — změna z Claude Sonnet 4.5 na GLM-4.7 (z-ai/glm-4.7)
- **Inspekční stránky** — renderování on-demand místo statického
- **Bug report formulář** — vylepšené pokyny pro kvalitní hlášení chyb
- **Dekódování zastávek** — adaptivní limity pro velké soubory

### Opraveno
- **Vyhledávání v horním menu** — nefunkční search a autocomplete nyní plně funkční
  - Zobrazení názvu programu i délky studia
  - Debounce 300ms pro lepší UX
- **Hamburger menu na mobilu** — již není překryté search barem
- **Zdvojení minimálních bodů** — normalizeMinBodyScore vždy správně dělí body dvěma
- **Error handling** — oprava chyb při načítání MHD zastávek
- **Clicky.com tracking** — správná inicializace s HTTPS protokolem
- **CSP** — Content Security Policy pro Clicky.com analytics
- **Lint errors** — oprava 36 lint errors (any types → konkrétní typy, unused variables, setState v effectu)

## [0.1.0] — 2026-02-09

### Přidáno
- **Rozlišení duplicitních zastávek** — disambiguační kontext pro zastávky se stejným názvem v našeptávači dostupnosti
  - Zobrazení kraje/regionu podle identifikátorů zastávky
  - Fallback na souřadnice, pokud kraj nelze určit z ID
- **Integrace inspekčních zpráv ČŠI** — nová sekce „Inspekční zprávy ČŠI" na detailu školy
  - Přehled všech dostupných inspekcí školy
  - Odkazy na PDF inspekční zprávy
  - Odkaz na profil školy v InspIS PORTÁL
  - Skript `npm run update:csi` pro stažení a zpracování otevřených dat ČŠI

### Bezpečnost
- **Path Traversal ochrana** — validace ID, kontrola nebezpečných sekvencí v API `/api/school-details/[id]`
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Rate limiting** — max 100 požadavků za minutu na IP adresu

### Optimalizace
- **Server-side filtrování škol** — nové API `/api/schools/search` eliminuje 5.1 MB JSON fetche
  - Simulátor nyní stahuje pouze relevantní data (typicky <50 KB)
  - Odhadovaná úspora: ~51 GB/měsíc při 10 000 unikátních návštěvnících
- **Cache headers** — 24h cache, 7 dnů stale-while-revalidate pro statická data
- **Debounced search** — API se volá až po dokončení psaní (300ms delay)

### Změněno
- **Nová struktura stránek škol** — Přehled + Detail oborů
  - `/skola/{redizo}-{nazev}` - Přehled školy s kartami všech oborů/zaměření
  - `/skola/{redizo}-{nazev}-{obor}` - Detail oboru s konkrétními statistikami
  - `/skola/{redizo}-{nazev}-{obor}-{zamereni}` - Detail zaměření s vlastními daty
- **Navigace mezi obory** — horizontální taby s kapacitou a minimálními body
- **Plné české názvy** — místo zkratek (GY4 → „Čtyřleté gymnázium", atd.)
- **Vyhledávání škol** — aliasy pro PORG pobočky (Libeň, Ostrava, Nový PORG)

### Přidáno
- **Stránka /jak-vybrat-skolu** — komplexní průvodce pro uchazeče
  - Osvědčené strategie pro výběr tří priorit
  - Tipy na přípravu na jednotné přijímací zkoušky
  - Jak vybrat správný profil školy
  - Praktické rady pro den zkoušky

### Opraveno
- **Duplicitní URL** — školy s více programy se stejným názvem ale různou délkou studia mají unikátní URL
  - Např. `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium-4lete` a `...-6lete`

---

[0.2.0]: https://github.com/tangero/stredniskoly/releases/tag/v0.2.0
[0.1.0]: https://github.com/tangero/stredniskoly/releases/tag/v0.1.0
