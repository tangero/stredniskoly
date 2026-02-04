# Changelog

## 2026-02-04

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
  - Taby se zobrazí pod hlavičkou stránky, pokud má škola více oborů
  - Aktivní obor je vizuálně zvýrazněn (hvězdička, indigo podtržení)
  - Každý tab zobrazuje plný název typu a minimální body pro přijetí
  - Informační text nad taby sděluje celkový počet oborů školy

- **Vylepšení:** Plné české názvy typů škol místo zkratek
  - GY4 -> "Čtyřleté gymnázium"
  - GY6 -> "Šestileté gymnázium"
  - GY8 -> "Osmileté gymnázium"
  - SOŠ -> "Střední odborná škola"
  - SOU -> "Střední odborné učiliště"
  - LYC -> "Lyceum"

- **Vylepšení:** Badge délky studia nyní zobrazuje plná slova
  - "4leté" -> "Čtyřleté studium"
  - "6leté" -> "Šestileté studium"
  - atd.

- **Odstraněno:** Sekce "Další obory této školy" na konci stránky (nahrazena taby)

### Technické změny

- Přidána komponenta `ProgramTabs` v `SchoolDetailClient.tsx`
- Přidáno mapování `schoolTypeFullNames` a funkce `getSchoolTypeFullName` v `types/school.ts`
- Upravena komponenta `StudyLengthBadge` pro použití plných českých názvů
