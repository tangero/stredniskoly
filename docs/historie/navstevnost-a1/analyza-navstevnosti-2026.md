# Analýza návštěvnosti 2026 a její dopad na rozvoj 2027

Verze 1.1. Zpracováno 11. 9. 2026, sekce 5b doplněna tentýž den. Zdroj: Matomo na `ma.hlidacstatu.cz`, web `idSite=7`, období 11. 2. 2026 až 11. 9. 2026.

Stav: podklad pro rozhodování. Všechna čísla pocházejí z API Matomo a jsou reprodukovatelná postupem v příloze. Interpretace jsou označeny jako **ZÁVĚR**, měřená data jako **DATA**.

**Rozsah a omezení.** Sledování začalo 11. 2. 2026, chybí tedy celá první polovina sezóny 2026 včetně období přihlášek (únor) v plném rozsahu a listopadu až ledna. Meziroční srovnání není možné. Návštěvy jsou měřené na zařízení, nikoli na osoby; jedna rodina používající telefon i počítač se počítá vícekrát. Vercel Analytics běží souběžně a může vykazovat jiná čísla kvůli jiné metodice.

---

## 1. Souhrn pro rozhodování

Tři zjištění, která přímo mění pořadí prací:

1. **Simulátor je třetí nejnavštěvovanější část webu** a druhá nejčastější vstupní stránka po hlavní straně a profilech škol. To zvyšuje závažnost bodu O-13 z oponentury z „vysoká priorita“ na **produkční blokátor**.
2. **Mobil tvoří 65 % návštěv.** Důraz PRD na mobilní ovládání je správný a měl by být závazný, nikoli volitelný.
3. **Sezóna 2027 začíná v listopadu 2026, tedy za dva měsíce.** Únor 2026 měl osmkrát vyšší návštěvnost než srpen. Okno pro opravy je kratší, než plán předpokládá.
4. **AI provoz je nejrychleji rostoucí kanál a míří na profily škol.** Z 1,2 % na 13 až 16 % za sedm měsíců, z 99 % jde o ChatGPT. Vstupuje převážně na profil konkrétní školy, nikoli na hlavní stránku. Podrobně v sekci 5b.

---

## 2. Sezónnost: okno na opravy je do konce října

**DATA.** Měsíční návštěvnost, období od zahájení měření:

| Měsíc | Návštěvy | Unikátní | Zobrazení | Bounce | Průměrný čas |
|---|---:|---:|---:|---:|---:|
| 2026-02 (od 11.) | 7 847 | 4 969 | 16 739 | 65 % | 391 s |
| 2026-03 | 3 464 | 2 012 | 5 081 | 76 % | 154 s |
| 2026-04 | 3 458 | 1 916 | 5 067 | 73 % | 184 s |
| 2026-05 | 6 349 | 4 435 | 12 681 | 68 % | 381 s |
| 2026-06 | 1 582 | 1 046 | 2 055 | 83 % | 94 s |
| 2026-07 | 924 | 691 | 1 217 | 81 % | 124 s |
| 2026-08 | 1 223 | 902 | 2 069 | 79 % | 238 s |
| 2026-09 (do 11.) | 915 | 713 | 1 380 | 74 % | 143 s |

**ZÁVĚR.** Dva vrcholy odpovídají kalendáři přijímacího řízení: únor jsou přihlášky, květen jsou výsledky prvního kola. Květen má zároveň nejvyšší počet unikátních návštěvníků (4 435) a druhý nejdelší čas na webu (381 s), tedy nejde o krátké nahlédnutí.

Kvalita návštěvy kolísá se sezónou. V únoru a květnu je bounce rate 65 až 68 % a čas přes 380 sekund; v červnu až červenci 81 až 83 % a čas pod 130 sekund. Mimo sezónu tedy chodí jiné publikum s jiným záměrem.

**Dopad na plán.** Podle kalendáře 2027 začínají přihlášky na konzervatoře 1. 11. 2026 a kritéria SŠ se zveřejňují 15. až 31. 1. 2027. Provoz tedy poroste od listopadu. Na opravy zbývá **zhruba sedm týdnů**. Návrh rozvoje počítá s balíky A až C v rozsahu 26 až 39 člověkodnů; při jednom vývojáři to okno vyplní téměř celé.

---

## 3. Simulátor: potvrzení bodu O-13 jako blokátoru

**DATA.** Nejnavštěvovanější stránky za celé období (podle zobrazení):

| Stránka | Zobrazení | Návštěvy | Vstupů | Bounce |
|---|---:|---:|---:|---:|
| `/` | 17 771 | 11 625 | 10 128 | 70 % |
| `/skola/…` (souhrn profilů) | 12 208 | 10 764 | 6 314 | 71 % |
| `/simulator` | 3 286 | 2 768 | 2 165 | 73 % |
| `/moje-sance` | 1 324 | 890 | 713 | 74 % |
| `/skoly` | 1 051 | 862 | 611 | 71 % |
| `/dostupnost` | 921 | 799 | 606 | 69 % |
| `/simulator?srovnani=1` | 776 | 647 | 487 | 74 % |
| `/vysledky/2026` | 807 | 614 | 502 | 71 % |

**DATA.** Sezónní vývoj obou kalkulaček (návštěvy stránky za měsíc):

| Měsíc | `/simulator` | `/moje-sance` | Návštěv celkem |
|---|---:|---:|---:|
| 2026-02 | 1 404 | 0 | 11 491 |
| 2026-03 | 420 | 299 | 4 005 |
| 2026-04 | 461 | 117 | 4 099 |
| 2026-05 | 288 | 329 | 8 628 |
| 2026-06 | 99 | 53 | 1 771 |
| 2026-07 | 26 | 25 | 1 042 |
| 2026-08 | 44 | 33 | 1 841 |
| 2026-09 | 26 | 34 | 1 111 |

**ZÁVĚR — mění hodnocení O-13.** Oponentura označila simulátor za vysokou prioritu na základě kontroly kódu. Data to zpřísňují:

- Simulátor je po hlavní stránce a profilech škol **třetí nejpoužívanější částí webu**, se součtem 4 062 zobrazení včetně varianty `?srovnani=1`.
- Je druhou nejčastější **vstupní stránkou** (2 165 vstupů, s variantou 2 652). Významná část uživatelů tedy začíná právě tam a vidí kategorie „Vysoká šance“ a „Malá šance“ jako první věc na webu.
- Vrchol užití je v **únoru**, tedy v době podávání přihlášek, kdy má nepodložená kategorie největší vliv na skutečné rozhodnutí rodiny.

Připomenutí obsahu vady z O-13: kategorie vzniká jako `totalScore - min_body_2025` s pásmem ±10 bodů. Práh není nikde odvozen a porovnává se proti loňskému celkovému minimu včetně školních kritérií.

**Doporučení.** Oprava simulátoru musí předcházet implementaci Mého výběru a musí být hotová **před listopadem 2026**. PRD v0.4 to již zachycuje jako samostatnou dodávku S0; data tento postup potvrzují a dávají mu termín.

**ZÁVĚR k O-4.** Kalkulačka Moje šance má 1 324 zobrazení, tedy asi třetinu simulátoru. Zjištění oponentury verze 1.1, že se z ní procenta nevykreslují, platí; nízká návštěvnost potvrzuje, že zbytkový technický dluh nemá naléhavost.

---

## 4. Mobil je většinový, nikoli okrajový

**DATA.** Typ zařízení za celé období, celkem 25 762 návštěv:

| Zařízení | Návštěvy | Podíl |
|---|---:|---:|
| Smartphone | 15 155 | 58,8 % |
| Desktop | 8 693 | 33,7 % |
| Phablet | 1 689 | 6,6 % |
| Tablet | 212 | 0,8 % |

**ZÁVĚR.** Dotyková zařízení tvoří **66,2 %** návštěv, z toho telefony a phablety 65,4 %. Počítač je menšinová platforma.

To potvrzuje několik rozhodnutí PRD a mění jejich váhu z „dobré praxe“ na podmínku vydání:

- Požadavek „mobilní ovládání bez přesného přetahování“ z přijímacích podmínek je správný.
- Volba tlačítek Nahoru a Dolů pro změnu pořadí, s přetahováním pouze jako doplňkem, je správná.
- Návrh porovnávat na telefonu dvě možnosti současně s přepínačem, místo zmenšené široké tabulky, je správný.
- Doporučení PRD používat seznam jako výchozí zobrazení na počítači i telefonu je konzistentní s daty.

**Doporučení.** Formulovat mobilní průchod jako blokující přijímací podmínku, nikoli jako jeden z bodů pilotu. Při 65 % podílu je chyba v mobilním ovládání chybou pro většinu uživatelů.

---

## 5. Zdroje návštěv: web není závislý na vyhledávání

**DATA.** Zdroje návštěv za celé období:

| Zdroj | Návštěvy | Podíl |
|---|---:|---:|
| Přímý vstup | 13 256 | 51,5 % |
| Vyhledávače | 5 649 | 21,9 % |
| Sociální sítě | 2 626 | 10,2 % |
| AI asistenti | 2 167 | 8,4 % |
| Odkazující weby | 1 650 | 6,4 % |
| Kampaně | 414 | 1,6 % |

**DATA.** Rozpad sociálních sítí: Facebook 1 750, Twitter 579, Instagram 210, LinkedIn 63, ostatní pod 15.

**ZÁVĚR.** Přímé vstupy tvoří nadpoloviční většinu. To odpovídá webu, který si lidé pamatují nebo dostali doporučený, nikoli webu živenému vyhledáváním. Vysvětluje to i 11 937 vracejících se návštěv s průměrným časem 272 sekund, tedy výrazně nad průměrem.

**Podíl AI asistentů (8,4 %) je pozoruhodně vysoký.** Blíží se sociálním sítím a předstihuje odkazující weby. To má praktický důsledek pro obsah: pokud podstatná část uživatelů přichází přes odpovědi jazykových modelů, roste význam přesných a strojově čitelných formulací na stránkách. Projekt již má `public/llms.txt`; data naznačují, že tato investice má návratnost.

**Doporučení.** Nepřestavovat obsah kvůli vyhledávačům. Návrh rozvoje na distribuci přes základní školy a poradce dává smysl právě proto, že organické vyhledávání není hlavním kanálem.

---

## 5b. AI provoz do hloubky: nejrychleji rostoucí kanál

Doplněno 11. 9. 2026 na základě dotazu, zda posílit strojově čitelná data. **DATA** ze segmentovaných dotazů Matomo.

### Skoro všechno je ChatGPT

| Zdroj | Návštěvy |
|---|---:|
| ChatGPT | 2 150 |
| Copilot | 8 |
| Gemini | 6 |
| Perplexity | 5 |

**ZÁVĚR.** ChatGPT tvoří **99,1 %** AI provozu. Kategorie „AI asistenti“ je fakticky jeden kanál. Optimalizace pro pět různých asistentů by byla práce navíc bez doloženého přínosu; ostatní jsou v řádu jednotek návštěv.

### Podíl roste dramaticky

| Měsíc | Návštěv z AI | Podíl na provozu |
|---|---:|---:|
| 2026-02 | 96 | 1,2 % |
| 2026-03 | 119 | 3,4 % |
| 2026-04 | 278 | 8,0 % |
| 2026-05 | 1 034 | **16,3 %** |
| 2026-06 | 229 | 14,5 % |
| 2026-07 | 135 | 14,6 % |
| 2026-08 | 152 | 12,4 % |
| 2026-09 | 124 | 13,6 % |

**ZÁVĚR.** Podíl vzrostl z 1,2 % na ustálených 12 až 16 % za sedm měsíců. Absolutní vrchol (1 034 návštěv) padl na květen, tedy na zveřejnění výsledků prvního kola. To je nejrychleji rostoucí kanál webu. Pokud trend pokračuje, bude v sezóně 2027 srovnatelný s vyhledávači.

Upozornění na omezení: ustálení kolem 13 až 15 % od června probíhá v období nízkého provozu. Podíl v příští sezóně nelze z těchto měsíců spolehlivě extrapolovat.

### Kvalita AI návštěv je nadprůměrná

| Ukazatel | Z ChatGPT | Průměr webu |
|---|---:|---:|
| Návštěvy | 2 150 | 25 762 |
| Akcí na návštěvu | 1,87 | 1,80 |
| Průměrný čas | **358 s** | 285 s |
| Bounce rate | **61 %** | 71 % |

**ZÁVĚR.** Uživatel přicházející z ChatGPT stráví na webu o čtvrtinu delší čas a odchází bez interakce výrazně méně často než průměr. Nejde o odpadní provoz; přichází s konkrétním záměrem.

### Vstupují na profily škol, ne na hlavní stránku

Vstupní stránky návštěv z ChatGPT:

| Vstupní stránka | Vstupů |
|---|---:|
| `/skola/…` (profily škol) | 889 + 80 jmenovitých |
| `/` | 548 |
| `/vysledky/2026` | 65 |
| `/skoly` | 45 |
| `/simulator` | 25 |
| `/moje-sance` | 14 |

**ZÁVĚR — nejdůležitější zjištění této sekce.** Zatímco na celém webu je hlavní stránka jednoznačně nejčastějším vstupem (10 128 vstupů oproti 6 314 na profily), u ChatGPT je poměr obrácený: profily škol mají zhruba **1,8krát více vstupů než hlavní stránka**.

ChatGPT tedy neposílá lidi na web obecně. Posílá je **na konkrétní školu, na kterou se uživatel ptal**. To přesně určuje, kam má směřovat případná investice do strojové čitelnosti: do profilu jednotlivé školy a oboru, nikoli do přehledových stránek.

### Co už existuje a co je rozbité

**DATA**, ověřeno staženim živých URL:

| Prvek | Stav |
|---|---|
| `public/llms.txt` | Existuje, popisuje sekce, formáty a klíčové pojmy |
| `/skola/{slug}.md` | **Funguje**, HTTP 200, `text/markdown`, strukturovaný výstup |
| `/skola/{slug}.json` | **Funguje**, HTTP 200, `application/json` |
| `/api/schools/search` | Funguje, ale viz rozpor níže |

**Nalezený rozpor.** Soubor `llms.txt` propaguje vyhledávací API na adrese `/api/schools/search`, zatímco `src/app/robots.ts` obsahuje `Disallow: /api/`. Ověřeno na živém `robots.txt`. Web tedy jedním souborem nabízí rozhraní, které druhým souborem zakazuje procházet. Endpointy `.md` a `.json` pod `/skola/` zakázané nejsou, ty jsou v pořádku.

**ZÁVĚR.** Výchozí stav je lepší, než by odpovídalo dojmu, že „podpora pro AI chybí“. Strojově čitelné profily existují a fungují. Chybí spíš dotažení: odstranit rozpor v robots, ověřit, zda `.md` a `.json` obsahují to nejdůležitější, a zajistit, aby u každého údaje byl rok a zdroj.

### Doporučení k rozsahu

Investice do strojové čitelnosti je opodstatněná, ale měla by být **úzká a zacílená na profil školy**:

1. **Odstranit rozpor mezi `llms.txt` a `robots.txt`.** Buď povolit konkrétní endpointy, nebo přestat inzerovat zakázané API. Práce v řádu minut.
2. **Doplnit do `.md` a `.json` profilu rok a zdroj u každého údaje.** Pokud model převezme minimum bodů bez ročníku, rozšíří zastaralý údaj dál. To je přímá aplikace zásady „zachovat rok u každé informace“ z návrhu rozvoje na strojový výstup.
3. **Aktualizovat `llms.txt`.** Uvádí „Data: CERMAT JPZ 2024-2025“ a „~2 500 středních škol“, zatímco web dnes nese data platná k 17. 8. 2026. Nepřesný popis vede model k nepřesnému tvrzení.
4. **Zvážit strukturovaná data schema.org** na profilu školy. Nebylo v rámci této analýzy ověřeno, zda už existují.

**Co nedoporučuji.** Stavět samostatné AI rozhraní, MCP server ani optimalizovat pro pět asistentů zvlášť. Provoz je jeden kanál a existující formáty fungují; přínos by byl spekulativní, zatímco okno do sezóny je sedm týdnů (viz sekce 2).

**Nezodpovězená otázka.** Tato analýza měří jen návštěvy s odkazujícím zdrojem ChatGPT, tedy případy, kdy uživatel na odkaz klikl. Neměří, jak často model obsah webu použije v odpovědi bez prokliku, ani zda crawler `GPTBot` web prochází. To by vyžadovalo rozbor serverových logů, ke kterým jsem přístup neměl.

---

## 6. Co lidé hledají uvnitř webu

**DATA.** Nejčastější dotazy interního vyhledávání (počet návštěv):

| Dotaz | Návštěv |
|---|---:|
| Hotelnictví praha | 68 |
| Spš Františka Křižíka | 36 |
| 1.KŠPA | 19 |
| Jana Keplera | 12 |
| praha / Praha | 13 |
| Brno, Plzeň, Ostrava, Zlín | 20 celkem |

**ZÁVĚR.** Dotazy se dělí na dva typy: **konkrétní škola podle jména** (Františka Křižíka, 1. KŠPA, Jana Keplera) a **obor plus lokalita** (Hotelnictví praha). Oba potvrzují návrh PRD, že vyhledávání má pracovat s lokalitou a typem studia současně.

Objemy jsou nízké (nejvyšší dotaz 68 návštěv), takže z nich nelze dělat silné závěry o preferencích. Za pozornost stojí překlepy a nekonzistentní diakritika, což je praktický požadavek na toleranci vyhledávání vůči chybám v zápisu.

---

## 7. Dopady na otevřené body oponentury a PRD

| Bod | Dosavadní stav | Dopad dat |
|---|---|---|
| O-13 simulátor | vysoká priorita | **Zvýšit na blokátor.** 3. nejnavštěvovanější stránka, 2. vstupní, vrchol v únoru. Termín před listopadem 2026. |
| O-4 mrtvý výpočet | zúženo, nízká priorita | Potvrzeno. Moje šance má třetinovou návštěvnost simulátoru. |
| O-5 párovací klíč | vysoká priorita | Beze změny. Profily škol jsou 2. nejnavštěvovanější částí (12 208 zobrazení), takže chybné párování zasahuje hodně uživatelů. |
| O-1, O-2 historie a maturity | otevřeno | Beze změny; data o návštěvnosti k tomu nic neříkají. Profily jsou ale silně navštěvované, takže obohacení jejich obsahu má široký dosah. |
| PRD mobilní ovládání | jeden z bodů pilotu | **Povýšit na blokující podmínku vydání.** 65 % návštěv. |
| PRD D3 rozsah typů škol | otevřeno | Data neposkytují oporu; interní vyhledávání ukazuje čtyřleté obory i gymnázia, objemy jsou malé. |
| Strojová čitelnost pro AI | neřešeno v dokumentech | **Nový úkol malého rozsahu.** Profily `.md` a `.json` fungují; odstranit rozpor `llms.txt` vs `robots.txt`, doplnit rok a zdroj do strojového výstupu. Viz 5b. |
| Plán balíků A–C | 26–39 člověkodnů | Okno do začátku sezóny je asi 7 týdnů. Je třeba rozhodnout, co se nestihne. |

---

## 8. Co data neříkají

Poctivé vymezení, aby se z nich nevyvozovalo víc, než unesou:

- **Nevíme, zda simulátor někoho poškodil.** Vysoká návštěvnost dokládá dosah vady, nikoli způsobenou škodu. Sledování výsledku rozhodnutí rodiny web neprovádí a provádět nemá.
- **Neznáme podíl žáků a rodičů.** Matomo demografii tohoto typu nesbírá a dovozovat ji ze zařízení by bylo spekulativní.
- **Nelze porovnat s rokem 2025.** Měření začalo 11. 2. 2026.
- **Bounce rate 70 až 83 % není sám o sobě vada.** U informačního webu může znamenat, že uživatel našel odpověď na první stránce. Bez měření cílů to nerozhodneme.
- **Únorová data jsou neúplná**, chybí prvních deset dní měsíce, tedy začátek lhůty pro přihlášky. Skutečný únorový vrchol byl vyšší než naměřených 7 847 návštěv.

---

## Příloha: reprodukce měření

Přístup k API vyžaduje token s právem pro čtení a **volání metodou POST**; varianta GET vrací chybu autentizace i s platným tokenem.

```bash
curl -sL -X POST "https://ma.hlidacstatu.cz/index.php" \
  -d "module=API" -d "idSite=7" -d "format=JSON" \
  -d "token_auth=<TOKEN>" \
  -d "method=VisitsSummary.get" \
  -d "period=month" -d "date=2026-02-01,2026-09-11"
```

Použité metody: `VisitsSummary.get`, `Actions.getPageUrls` (s `flat=1`), `Actions.getEntryPageUrls`, `Actions.getSiteSearchKeywords`, `DevicesDetection.getType`, `Referrers.getReferrerType`, `Referrers.getSocials`, `VisitFrequency.get`.

**Token nepatří do repozitáře.** Při této analýze byl uložen pouze dočasně mimo pracovní strom. Pro opakované použití jej vložte do proměnné prostředí nebo do souboru uvedeného v `.gitignore`.
