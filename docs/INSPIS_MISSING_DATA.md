# InspIS - Chybějící data a další zdroje

**Datum:** 11. února 2026
**Status:** Analýza dokončena

---

## 🔍 Co InspIS NEOBSAHUJE

### ❌ Kontaktní údaje

InspIS PORTÁL dataset **neobsahuje**:
- Webové stránky školy
- Email školy
- Telefon školy
- Sociální sítě (přímé odkazy)

**Důvod:** InspIS se zaměřuje na pedagogické a provozní informace, ne na kontakty.

---

## ✅ Užitečná data, která MÁME, ale NEZPRACOVALI

### 🔴 VYSOKÁ PRIORITA (VLNA 1.5)

#### 1. Způsob informování rodičů (9,449 záznamů)

**Proč je důležité:** Rodiče potřebují vědět, jak škola komunikuje.

**Co obsahuje:**
- E-mailová komunikace s učiteli
- Školní informační systém
- Třídní schůzky
- Konzultační hodiny
- Individuální schůzky
- Telefonická komunikace
- **Profil školy na sociální síti** ← částečný "web"!
- Školní časopis/newsletter
- Žákovská knížka (elektronická)

**Mapování:**
```javascript
'Způsob informování rodičů': { field: 'zpusob_informovani_rodicu', type: 'array' }
```

**UI integrace:**
```tsx
<div className="border rounded-lg p-4">
  <h3>📞 Komunikace s rodiči</h3>
  <div className="flex flex-wrap gap-2">
    {data.zpusob_informovani_rodicu?.map(way => (
      <span className="badge">{way}</span>
    ))}
  </div>
</div>
```

#### 2. Funkce školního informačního systému (5,697 záznamů)

**Proč je důležité:** Moderní školy mají online systémy pro rodiče.

**Co obsahuje:**
- Elektronická třídní kniha
- Omlouvání absencí online
- Aktuální známky online
- Rozvrh hodin online
- Domácí úkoly online

**Mapování:**
```javascript
'Funkce školního informačního systému': { field: 'funkce_sis', type: 'array' }
```

#### 3. V blízkosti školy (4,745 záznamů)

**Proč je důležité:** Rodiče chtějí vědět, co je v okolí školy.

**Co obsahuje:**
- Sport (posilovna, bazén, hřiště)
- Veřejná knihovna
- Park/přírodní zázemí
- ZUŠ
- DDM/středisko volného času
- Kulturní zařízení
- Obchody

**Mapování:**
```javascript
'V blízkosti školy': { field: 'v_blizkosti_skoly', type: 'array' }
```

**UI integrace:**
```tsx
<div>
  <h3>🏛️ Okolí školy</h3>
  <ul>
    {data.v_blizkosti_skoly?.map(item => (
      <li>✓ {item}</li>
    ))}
  </ul>
</div>
```

#### 4. Místo pro trávení volného času (3,707 záznamů)

**Proč je důležité:** Studenti tráví ve škole celý den.

**Co obsahuje:**
- Studovna/knihovna
- Herna
- Zahrada
- Vyhrazená učebna pro volný čas
- Hřiště
- Relaxační zóna

**Mapování:**
```javascript
'Místo pro trávení volného času': { field: 'mista_volny_cas', type: 'array' }
```

### 🟡 STŘEDNÍ PRIORITA (VLNA 2)

#### 5. Začátek první vyučovací hodiny (1,145 záznamů)

**Použití:** Pro rodiče, kteří řeší dojíždění.

```javascript
'Začátek první vyučovací hodiny': { field: 'zacatek_prvni_hodiny', type: 'single' }
```

#### 6. Vstup do školy umožněn od (1,094 záznamů)

**Použití:** Od kolika hodin mohou studenti přijít do školy.

```javascript
'Vstup do školy umožněn od': { field: 'vstup_od', type: 'single' }
```

#### 7. Rozmístění školy (1,067 záznamů)

**Co obsahuje:**
- Všechny učebny v jedné budově
- Více budov
- Pavilonový systém

```javascript
'Rozmístění školy': { field: 'rozmisteni_skoly', type: 'array' }
```

---

## 🌐 Kde získat kontaktní údaje škol

### 1. Rejstřík škol a školských zařízení (MŠMT)

**URL:** https://rejskol.msmt.cz/

**Co obsahuje:**
- ✅ Oficiální web školy
- ✅ Email školy
- ✅ Telefon
- ✅ IČO
- ✅ Právní forma
- ✅ Ředitel školy
- ✅ Zřizovatel

**API:** Možná existuje (neověřeno)

**Export:** CSV, Excel možný přes filtrování

**Použití:**
```javascript
// Pseudo-kód
const rejstrik = await fetchRejstrikSkolByRedizo(redizo);
school.web = rejstrik.web;
school.email = rejstrik.email;
school.telefon = rejstrik.telefon;
```

### 2. ARES (Administrativní registr ekonomických subjektů)

**URL:** https://wwwinfo.mfcr.cz/ares/

**Co obsahuje:**
- ✅ Kontaktní údaje (někdy)
- ✅ IČO → propojení přes IČO školy
- ✅ Adresa sídla
- ✅ Email (ne vždy)

**API:** ✅ Ano, existuje!
```
https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
```

### 3. Web scraping

**Metoda 1: Heuristika z názvu školy**

Mnoho škol má web ve formátu:
```
www.{nazev-skoly}.cz
{nazev-skoly}.cz
skola-{nazev}.cz
```

**Metoda 2: Google Search API**
```javascript
const query = `${school.nazev} ${school.obec} kontakt`;
const results = await googleSearch(query);
const website = results[0]?.url;
```

**Metoda 3: Školský portál**

Některé školy jsou na centrálních portálech:
- `skolyonline.cz`
- `atlasskolstvi.cz`

### 4. Sociální sítě (z InspIS)

InspIS má "Profil školy na sociální síti" v "Způsob informování rodičů".

**Použití:**
```javascript
if (data.zpusob_informovani_rodicu?.includes('profil školy na sociální síti')) {
  // Škola má FB/IG → možno dohledat
}
```

---

## 📊 Doporučený postup

### FÁZE 1: Doplnit InspIS data (1 týden)

Přidat mapování pro:
1. ✅ Způsob informování rodičů
2. ✅ Funkce SIS
3. ✅ V blízkosti školy
4. ✅ Místa pro volný čas

**Effort:** ~2 hodiny ETL + 2 hodiny UI = **4 hodiny celkem**

**Impact:** +24,000 datových bodů, lepší informace pro rodiče

### FÁZE 2: Získat kontakty z Rejstříku škol (2-3 týdny)

**Možnost A: Scraping**
```bash
# Stáhnout rejstřík jako CSV
curl "https://rejskol.msmt.cz/export?format=csv" -o rejstrik.csv

# ETL do JSON
node scripts/import-rejstrik-data.js

# Mergovat s InspIS daty
node scripts/merge-contact-data.js
```

**Možnost B: API integration (pokud existuje)**
```javascript
export async function getSchoolContacts(redizo: string) {
  const response = await fetch(`https://rejskol.msmt.cz/api/skola/${redizo}`);
  return response.json();
}
```

**Možnost C: ARES API**
```javascript
// Získat IČO školy z našich dat
const ico = school.ico;

// Zavolat ARES API
const aresData = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`);
const contacts = aresData.sidlo;
```

### FÁZE 3: Fallback web scraping (1 měsíc)

Pro školy bez kontaktů:
1. Heuristika z názvu
2. Google Search API
3. Manuální doplnění top 100 škol

---

## 🎯 Prioritizace pro rodiče

### Co rodiče NEJVÍCE potřebují:

1. 🌐 **Web školy** (TOP 1)
   - Zdroj: Rejstřík škol / ARES / Scraping

2. 📧 **Email školy** (TOP 2)
   - Zdroj: Rejstřík škol / ARES

3. 📞 **Telefon školy** (TOP 3)
   - Zdroj: Rejstřík škol

4. 💬 **Způsob komunikace** (TOP 4)
   - Zdroj: ✅ InspIS (máme, ale nezpracováno!)

5. 💻 **Školní IS funkce** (TOP 5)
   - Zdroj: ✅ InspIS (máme, ale nezpracováno!)

---

## 📋 Akční body

### Okamžitě (tento týden):

- [ ] Přidat mapování 4 chybějících kategorií do ETL
- [ ] Rozšířit UI o nové bloky
- [ ] Přegenerovat JSON data
- [ ] Deploy

### Krátký horizont (2-3 týdny):

- [ ] Prozkoumat Rejstřík škol API/export
- [ ] Implementovat ARES API integration
- [ ] Vytvořit ETL pro kontaktní údaje

### Dlouhý horizont (měsíc+):

- [ ] Web scraping pro chybějící kontakty
- [ ] Google Search API pro validaci webů
- [ ] Manuální kurátorství top škol

---

## 📊 Očekávaný dopad

### Po FÁZI 1 (InspIS doplnění):

```
Před:
- Komunikace rodičů: ❌ chybí
- SIS funkce: ❌ chybí
- Okolí školy: ❌ chybí

Po:
- Komunikace rodičů: ✅ 9,449 škol
- SIS funkce: ✅ 5,697 škol
- Okolí školy: ✅ 4,745 škol
```

**→ +19,000 nových datových bodů z existujících dat!**

### Po FÁZI 2 (Rejstřík/ARES):

```
Před:
- Web: ❌ 0 škol
- Email: ❌ 0 škol
- Telefon: ❌ 0 škol

Po:
- Web: ✅ ~1,100 škol (93%)
- Email: ✅ ~900 škol (76%)
- Telefon: ✅ ~1,000 škol (85%)
```

**→ Kontakty pro téměř všechny školy!**

---

**Závěr:** InspIS má užitečná data o komunikaci, které jsme nezpracovali. Pro kontakty (web, email, telefon) musíme použít Rejstřík škol nebo ARES.

**Next step:** Doplnit 4 chybějící kategorie z InspIS (4 hodiny práce, velký impact).

---

**Připravil:** Claude (AI Analysis)
**Datum:** 11. února 2026
**Verze:** 1.0
