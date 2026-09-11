# ADR 0001: Jednotka skóre a kontrola publikace přijímacích výsledků

Stav: přijato, 11. 9. 2026. Navazuje na audit dat karet, R3 a realizaci P0.

Historický numerický údaj sám nedokládá jednotku, populaci ani přijímací hranici. Pro průměry předmětů 2025 zavádíme `AdmissionScore`: zdrojová hodnota/pole/jednotka, transformace, zaokrouhlení, úplné ID nabídky, rok, kvalita a neznámé položky provenience. Sdílený `AdmissionScoreValue` odvozuje jednotku z kontraktu. Numerické aliasy ostatních historických konzumentů zůstávají přechodně kompatibilní; není to plošná migrace všech metrik.

U výsledků 2026 musí paralelní import respektovat rozhodnutí `admission_context` o zadržení průměru. Kontrola `canPublishAcceptedResult` ověřuje rozsahy, počty konajících/přijatých a shodu s kontextem (tolerance 0,11 bodu pro zaokrouhlení). Neúplný výsledkový rozpad zakazuje odvozené kapacitní shrnutí; sám o sobě neruší jinak validní průměr. Po vyřazení neplatného výsledku přepočítáváme pořadí a velikost skupiny.

Pro párování používáme jednoznačný normalizovaný plný identifikátor včetně zaměření. Podobnost názvu ani první kandidát nejsou přípustnou náhradou. Neověřená minima a predikce nepřeznačujeme na aktuální rok; jejich zobrazení odstraňujeme. Historické zdrojové soubory zachováváme pro reprodukci.

Ochranu zajišťují runtime kontroly, společné vykreslování a testy skutečných komponent/HTTP výstupů. Samotný typový systém nezabrání nesprávnému ručnímu popisku v JSX. Přijetí rozhodnutí není potvrzení úplnosti katalogu 2027.
