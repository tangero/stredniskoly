# Systém poznámek ke školám a oborům

## 🎯 Účel

Systém poznámek umožňuje zobrazovat **aktuální informace o změnách** u škol a oborů, které nejsou ještě promítnuty v datech z CERMATu.

### Příklady použití:
- ⚠️ **Rušení oboru** - škola nebude obor otevírat v příštím roce
- ℹ️ **Nový obor** - škola otevírá nový obor, který ještě není v datech
- 🔄 **Změna kapacity** - škola navýšila/snížila kapacitu
- ℹ️ **Změna názvu** - škola změnila název oboru

---

## 📁 Struktura souborů

### 1. `public/school_notes.json`
Databáze poznámek ve formátu JSON.

```json
{
  "notes": {
    "600004554_26-45-M/01": {
      "type": "warning",
      "title": "Obor nebude otevřen",
      "message": "Obor \"Globální síťové technologie\" nebude otevřen pro školní rok 2026/27",
      "source": "GitHub Issue #2",
      "date": "2026-02-08",
      "expires": "2026-09-01"
    }
  }
}
```

### 2. `src/lib/school-notes.ts`
Utility funkce pro načítání poznámek.

**Funkce:**
- `getSchoolNotes()` - načte všechny poznámky
- `getNoteForSchool(schoolId)` - poznámka pro konkrétní obor
- `getNotesForRedizo(redizo)` - všechny poznámky pro školu
- `getNoteStyle(type)` - styly pro typ poznámky

### 3. `src/components/SchoolNote.tsx`
React komponenta pro zobrazení poznámek.

**Komponenty:**
- `<SchoolNote note={note} />` - plná verze
- `<SchoolNote note={note} compact />` - kompaktní verze
- `<SchoolNotes notes={notes} />` - seznam poznámek

---

## 🔧 Použití

### Přidání poznámky (ručně)

1. Otevři `public/school_notes.json`
2. Přidej novou poznámku do sekce `notes`:

```json
{
  "notes": {
    "RED_IZO_KKOV": {
      "type": "warning|info|update",
      "title": "Krátký titulek",
      "message": "Detailní zpráva pro uživatele",
      "source": "Odkud máme informaci",
      "date": "2026-02-08",
      "expires": "2026-09-01"
    }
  }
}
```

### Formát klíče (`RED_IZO_KKOV`)

Klíč se skládá z:
- `RED_IZO` - identifikátor školy (např. `600004554`)
- `_` - oddělovač
- `KKOV` - kód oboru (např. `26-45-M/01`)

**Příklad:** `600004554_26-45-M/01`

### Typy poznámek

| Typ | Ikona | Barva | Použití |
|-----|-------|-------|---------|
| `warning` | ⚠️ | Amber | Rušení oboru, důležité změny |
| `info` | ℹ️ | Blue | Nový obor, změna názvu |
| `update` | 🔄 | Green | Změna kapacity, aktualizace |

### Expirace poznámek

Pole `expires` je **volitelné**. Pokud je nastaveno:
- Poznámka se **zobrazí do** data expirace
- Po expiračním datu se **automaticky skryje**
- Formát: `YYYY-MM-DD`

**Příklad:**
```json
"expires": "2026-09-01"
```
Poznámka se schová 1. září 2026 (po aktualizaci dat z přijímaček).

---

## 💻 Integrace do kódu

### Zobrazení poznámky na detailu školy/oboru

```typescript
// V serveru komponenta (např. page.tsx)
import { getNoteForSchool } from '@/lib/school-notes';
import { SchoolNote } from '@/components/SchoolNote';

export default async function SchoolDetailPage({ params }: { params: { id: string } }) {
  const schoolId = params.id; // např. "600004554_26-45-M/01"
  const note = await getNoteForSchool(schoolId);

  return (
    <div>
      {/* Zobrazit poznámku na začátku */}
      {note && <SchoolNote note={note} />}

      {/* Zbytek detailu školy */}
      <h1>Detail školy</h1>
      {/* ... */}
    </div>
  );
}
```

### Zobrazení všech poznámek pro školu

```typescript
import { getNotesForRedizo } from '@/lib/school-notes';
import { SchoolNotes } from '@/components/SchoolNote';

export default async function SchoolOverviewPage({ params }: { params: { redizo: string } }) {
  const notesData = await getNotesForRedizo(params.redizo);
  const notes = notesData.map(item => item.note);

  return (
    <div>
      {/* Zobrazit všechny poznámky */}
      {notes.length > 0 && <SchoolNotes notes={notes} />}

      {/* Přehled školy */}
      <h1>Přehled školy</h1>
      {/* ... */}
    </div>
  );
}
```

### Kompaktní verze pro seznamy

```typescript
{note && <SchoolNote note={note} compact />}
```

---

## 📋 Workflow

### Když dostaneme GitHub Issue o změně:

1. **Ověř informaci** - zkontroluj na webu školy nebo kontaktuj školu
2. **Přidej poznámku** do `school_notes.json`:
   ```json
   "600004554_26-45-M/01": {
     "type": "warning",
     "title": "Obor nebude otevřen",
     "message": "Obor XYZ nebude otevřen pro školní rok 2026/27",
     "source": "GitHub Issue #2",
     "date": "2026-02-08",
     "expires": "2026-09-01"
   }
   ```
3. **Commitni změnu**:
   ```bash
   git add public/school_notes.json
   git commit -m "Note: Obor GST nebude otevřen pro 2026/27 (#2)"
   git push
   ```
4. **Odpověz na issue** s vysvětlením a odkazem na poznámku
5. **Nastav expiraci** na datum po příští aktualizaci dat

### Když aktualizujeme data z CERMATu:

1. Nová data již **nebudou obsahovat** zrušený obor
2. Poznámky s `expires` se **automaticky schová**
3. Můžeš **ručně smazat** expirované poznámky z JSON

---

## 🎨 Vizuální ukázka

### Plná verze (detail školy):

```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Obor nebude otevřen                             │
│                                                      │
│     Obor "Globální síťové technologie" nebude       │
│     otevřen pro školní rok 2026/27. Data            │
│     v aplikaci jsou z přijímaček 2024/2025.         │
│                                                      │
│     Zdroj: GitHub Issue #2 • 8. 2. 2026             │
└─────────────────────────────────────────────────────┘
```

### Kompaktní verze (seznamy):

```
┌──────────────────────────────────────────┐
│ ⚠️ Obor nebude otevřen                  │
│    Obor "GST" nebude otevřen pro 26/27  │
└──────────────────────────────────────────┘
```

---

## 🔮 Budoucí vylepšení

- [ ] Admin rozhraní pro přidávání poznámek (bez editace JSON)
- [ ] Community poznámky (uživatelé mohou přidávat tipy)
- [ ] Automatická detekce změn na webech škol
- [ ] Email notifikace při nové poznámce
- [ ] Verzování poznámek (historie změn)

---

## 📊 Statistiky

**První poznámka:**
- Škola: SPŠ sdělovací techniky, Panská
- Obor: Globální síťové technologie (GST)
- Důvod: Obor nebude otevřen pro školní rok 2026/27
- Zdroj: GitHub Issue #2
- Datum: 8. 2. 2026

---

**Vytvořeno:** 8. 2. 2026
**Autor:** Claude Code automatizace
**Issue:** #2
