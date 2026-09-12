# 0002 — Katalog nabídek nezávislý na párování historie

Stav: přijato, 12. 9. 2026.

## Problém
Vyhledávání začínalo jednoznačnými identitami z `schools_data.json[2025]`. Tím vynechávalo 1 004 nabídek z doloženého importu 2026. Neexistence meziroční shody nesmí znemožnit zobrazení aktuálně doložené nabídky.

## Rozhodnutí
Základem vyhledávání a simulátoru jsou vlastní záznamy `applications_2026.json`. Výsledky, přihlášky a adresy se připojují podle úplného ID v témže ročníku. Žádné propojení historie podle podobnosti názvů, první nalezené položky nebo nejvyššího počtu přihlášek se neaktivuje.

Jednoznačně shodné starší profily zůstávají přístupné původními URL. Nabídky bez takové shody mají detail `/nabidka/2026/[sourceId]` podle identifikátoru zdrojového řádku CERMAT. Cesta výslovně obsahuje rok: ID_SOF nejsou mezi zdrojovými soubory 2025 a 2026 společná. Staré uložené položky zůstávají dohledatelné přes explicitní `ids`, ale automaticky se nepřevádějí na podobně nazvané nabídky.

Záznam 2026 nedokládá otevření ani kapacitu 2027. Rok a rozsah importu jsou viditelné. Starší adresa není bez dalšího důkazem aktuálního místa výuky; dojezd se připojuje jen při jednoznačné identitě v dopravních podkladech.

## Důsledky
Všech 3 091 importovaných nabídek lze publikovat bez čekání na ruční meziroční mapování. To neznamená úplný katalog středního školství: import zahrnuje denní nezkrácené obory s povinnou JPZ. Konzervatoře, ostatní formy, obory bez JPZ a potvrzená nabídka 2027 vyžadují samostatnou dodávku.
