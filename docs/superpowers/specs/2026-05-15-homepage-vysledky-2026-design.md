# Design: Homepage — komunikace výsledků přijímaček 2026

**Datum:** 2026-05-15  
**Status:** Schváleno  
**Scope:** Tři cílené úpravy titulní stránky (`src/app/page.tsx`) komunikující nová data výsledků přijímaček 2026

---

## Kontext

CERMAT zveřejnil 15. 5. 2026 výsledky 1. kola přijímacích zkoušek. Web má data dostupná na `/vysledky-2026` a na detailech škol, ale homepage stále zobrazuje zastaralé sdělení „Přihlášky 2026 jsou venku" odkazující na `/moje-sance`. Cílem je homepage aktualizovat tak, aby jasně komunikovala nová data oběma cílovým skupinám.

### Dvě cílové skupiny

1. **Letošní uchazeči a rodiče** — hledají konkrétní výsledky školy, kam šli. Primární sdělení: „Kolik bodů stačilo na vaši školu?"
2. **Budoucí uchazeči 2027** — připravují se, hledají trendy a rady. Sekundární sdělení: „Co bude důležité pro přijímačky 2027?"

### Poznatky z UX analýzy

- „Výsledky přijímaček" je v češtině dvojznačné (může znamenat dopisy o přijetí). Proto používáme konkrétnější formulaci „Kolik bodů stačilo".
- Levý panel (primárně viditelný) = aktuální výsledky škol (horká novinka, urgentní).
- Pravý panel = výhled 2027 (lze prohodit za měsíc, až urgence opadne).

---

## Změny (3 úpravy v `src/app/page.tsx`)

### Změna 1 — Hero link (nahrazení)

**Současný stav:**
```tsx
<Link href="/moje-sance" ...>
  <span>Přihlášky 2026 jsou venku – zjistěte své šance na přijetí</span>
</Link>
<p>156 409 uchazečů podalo 425 279 přihlášek. Porovnejte konkurenci...</p>
```

**Nový stav:**
```tsx
<Link href="/vysledky-2026" ...>
  <span>Výsledky přijímaček 2026 jsou venku — porovnej výsledky své školy →</span>
</Link>
<p>Průměrné skóre ČJ+MA přijatých na každé škole. Data CERMAT, 15. 5. 2026.</p>
```

- Odkaz: `/moje-sance` → `/vysledky-2026`
- Styl zůstává stejný (inline-flex, gap-2, group-hover arrow)

---

### Změna 2 — Stats (třetí číslo)

**Současný stav:**
```tsx
<div className="text-3xl md:text-4xl font-bold" style={{ color: '#28313b' }}>2024-2026</div>
<div className="text-sm" style={{ color: '#818c99' }}>Data z let</div>
```

**Nový stav:**
```tsx
<div className="relative inline-block">
  <div className="text-3xl md:text-4xl font-bold" style={{ color: '#16a34a' }}>2026 ✓</div>
  <span className="absolute -top-2 -right-3 text-white text-[9px] font-bold px-1 py-0.5 rounded"
        style={{ backgroundColor: '#22c55e', lineHeight: 1 }}>
    NOVÉ
  </span>
</div>
<div className="text-sm font-medium" style={{ color: '#16a34a' }}>Aktuální výsledky</div>
```

---

### Změna 3 — Nová sekce (vložit mezi VibecordingPromo a „Jak to funguje")

Nová sekce s `id="vysledky-2026"` vložená za `{/* Vibecoding promo */}` sekci, před `{/* How it works */}`.

**Struktura:**

```tsx
<section className="py-8" style={{ backgroundColor: '#ffffff' }}>
  <div className="max-w-4xl mx-auto px-4">
    {/* Tmavý kontejner */}
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      borderRadius: '12px',
      padding: '24px',
    }}>
      {/* Label + nadpis + subtext */}
      <div style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: '6px' }}>
        Novinky · 15. května 2026
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', marginBottom: '4px' }}>
        Víme, kolik bodů stačilo na každou školu v Česku
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        CERMAT zveřejnil skóre přijatých uchazečů. 3 080 škol, aktuální data.
      </p>

      {/* Dvoupanelový grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Levý panel — výsledky školy (primární) */}
        <Link href="/skoly" style={{ /* zelený panel */ }}>
          <div style={{ fontSize: '9px', color: '#86efac', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            📊 Výsledky konkrétní školy
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff',
                        marginBottom: '6px', lineHeight: 1.3 }}>
            Kolik bodů stačilo na vaši školu?
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
            Najdi školu, zjisti průměrné skóre přijatých uchazečů a srovnej s loňskem.
          </div>
          <div style={{ background: '#22c55e', color: '#fff', fontSize: '12px',
                        fontWeight: 700, padding: '8px 16px', borderRadius: '6px',
                        display: 'inline-block' }}>
            Hledat školu →
          </div>
        </Link>

        {/* Pravý panel — 2027 (sekundární) */}
        <Link href="/vysledky-2026" style={{ /* tmavý panel */ }}>
          <div style={{ fontSize: '9px', color: '#93c5fd', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            🎯 Chystáš se na přijímačky?
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff',
                        marginBottom: '6px', lineHeight: 1.3 }}>
            Co bude důležité pro přijímačky 2027?
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
            Matematika vzrostla o 6 bodů. Žebříčky škol, trendy a rady pro přípravu.
          </div>
          <div style={{ background: '#3b82f6', color: '#fff', fontSize: '12px',
                        fontWeight: 700, padding: '8px 16px', borderRadius: '6px',
                        display: 'inline-block' }}>
            Zobrazit přehled výsledků →
          </div>
        </Link>

      </div>
    </div>
  </div>
</section>
```

**Levý panel** (zelený, rgba(34,197,94,0.10) + border rgba(34,197,94,0.30)):
- Odkaz: `/skoly` (vyhledávání škol — uživatel hledá svou školu)
- CTA: „Hledat školu →"

**Pravý panel** (tmavý, rgba(255,255,255,0.06) + border rgba(255,255,255,0.10)):
- Odkaz: `/vysledky-2026`
- CTA: „Zobrazit přehled výsledků →"

---

## Soubory

| Soubor | Akce |
|--------|------|
| `src/app/page.tsx` | **Upravit** — 3 změny popsané výše |

Žádné nové soubory, žádné změny v data.ts ani jiných komponentách.

---

## Poznámky

- Sekce nemá `data-nosnippet` ani jiné SEO blokování — Google ji zaindexuje a pomůže pro dotazy „výsledky přijímaček 2026"
- Levý a pravý panel lze prohodit za ~4–6 týdnů, až urgence letošních výsledků opadne a převládnou budoucí uchazeči
- Datum „15. května 2026" v sekci je napevno — není nutné ho dynamicky generovat
