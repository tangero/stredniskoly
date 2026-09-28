# Kritéria 2026: ověření limitu 10 USD

Stav 25. 9. 2026. Limit zahrnuje dosavadní pilot. Místní pracovní přepisy nejsou schválená veřejná data.

## Doložené náklady a odhad

Příkaz `python3 scripts/dipsy-kriteria-rozpocet-2026.py` z místních záznamů spočítal dosavadní vykázanou cenu **5,416788 USD** včetně nové úsporné sondy. Zbývá 2 989 nabídek mimo starší vzorek 100. U sedmi nedokončených synchronních volání z různých etap nemáme místní potvrzení skutečně účtované ceny; proto částku nelze vydávat za úplný účet poskytovatele.

Staré zadání DeepSeek V4 podle ceníkových sazeb dávky vychází na dalších 4,6696 USD, a s kontrolou Jevem odhadovanou na 0,4128 USD by překročilo limit. Úsporné zadání v8 na 50 různorodých nabídkách potřebovalo kratší výstup a u jednoho víceoborového PDF také bezpečně vybranou sekci. Při extrapolaci poměru vstupních tokenů ke znakům a průměrné délky odpovědi vychází zbývajících 2 989 nabídek na **2,4703 USD** za DeepSeek Batch a **0,4128 USD** za Jev. Vykázané náklady plus tento odhad jsou **8,2999 USD**, rezerva do limitu je asi **1,70 USD**. Ceník modelu a skutečná dávková cena se mohou změnit.

Odhad Jevu vychází z pěti starších sond, které dostaly jen prvních 12 000 znaků PDF. Neprokazuje, že takto Jev ověří obor, jehož pravidla začínají později. Úsporná verze pro plošný běh musí předem vybrat relevantní stránky a při nejasné vazbě na obor vrátit stav neověřeno.

## Kvalita 50 úsporných přepisů

Mechanická kontrola citací, přepočtu, součtu a vazby na obor prošla bez nálezu u **33/50**. U **17/50** našla alespoň jeden problém. Některé lze vyřešit úpravou citace; jiné znamenají neurčené maximum složky, chybný součet nebo nejasnou vazbu na obor. Všech 50 mělo stejnou hrubou kategorii `pouze_jpz`/`jine` jako dřívější čtení Opusem, ale JPZ maximum se shodlo jen u **40/50**, uvedené celkové maximum u **47/50** a počet dalších složek u **42/50**. Opus není referenční pravda; tyto rozdíly jsou podněty k prověření. Ani mechanicky čistý přepis není automaticky věcně ověřený.

Pět samostatně vybraných záludných PDF po zpřesnění zadání v7 uvedlo správně rozdíl mezi deklarovaným podílem JPZ a přepočtem JPZ na 60 bodů, i hranici mezi dvěma obory ve společném PDF. U jednoho z pěti se chybně zapsalo „minimum není stanoveno“ jako existující minimum; v8 to opravuje. Rozšířená sonda zahrnovala i jeden opakovaný požadavek po nedokončené odpovědi, jehož první cenu místní záznam neobsahuje.

## Provozní rozhodnutí

Rozpočet do 10 USD je podle naměřené ceny **reálný pro pracovní návrhy ke všem dostupným nabídkám**, pokud se použije úsporné zadání, dávková cena, malé obnovitelné dávky a pevný strop počítaný včetně pilotu. Není tím prokázáno, že do 10 USD získáme spolehlivá strukturovaná pravidla u všech škol bez lidské kontroly. Neshodné nebo nejasné případy musí zůstat ve stavu neověřeno a veřejná karta má ukázat zdrojové PDF a datum podkladu, bez výpočtu bodů z neověřeného přepisu.

Před odesláním celé dávky je nutné mít běh, který před každou malou dávkou odečte již vykázané i dosud běžící náklady od celkového limitu, uchová výsledky a chyby jednotlivých nabídek, po výsledku vyhodnotí mechanické kontroly a zastaví při změně ceny či míry chyb. V místním účtu poskytovatele je potřeba ověřit cenu nedokončených volání. Současné sondy se do produkční databáze nezapisují.
