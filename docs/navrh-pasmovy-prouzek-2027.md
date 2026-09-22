# Pásmový proužek: kde stojím proti loňským uchazečům

Verze 1.0 · 22. 9. 2026 · Návrh k rozhodnutí. Prototyp běží na `/prototyp/pasma`, na web nenapojeno.

Uchazeč zadá svoje body a uvidí, kam by loni u konkrétního oboru padl. Navazuje na [stránku školy](stranka-skoly-2027.md), [vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md) a [využití dat JPZ](teze-vyuziti-dat-jpz-2027.md).

## 1. Co k tomu vedlo

Dotaz zadavatele: pro posouzení šance jsou důležitější než koeficient převisu (a) cut-off a (b) rozptyl výsledků. Změřeno na datech 1. kola 2026, 2 490 oborů s aspoň deseti přijatými:

| Měření | Hodnota |
|---|---|
| korelace převis ~ nejnižší přijatý | **+0,53** |
| korelace převis ~ rozptyl (medián − nejnižší) | −0,31 |
| rozptyl: 10. percentil / medián / 90. percentil | 8 / **15** / 26 bodů |
| největší nalezený rozptyl | 68 bodů |

Převis tedy vysvětluje zhruba čtvrtinu rozdílů v tom, kolik bodů stačilo. **Jako jediný ukazatel je to slabý odhad.**

Osmiletá gymnázia, jen obory, kde o pořadí rozhodl test (`rozhodl_test ≥ 0,9`):

| | Praha (33) | ostatní kraje (196) |
|---|---|---|
| medián přijatých | 77 b | 58 b |
| nejnižší přijatý | **71 b** | **45,5 b** |
| rozptyl | 6,5 b | 11 b |

Rozdíl mediánů je 19 bodů, rozdíl **na spodku kohorty 25,5 bodu**. Spodek se rozjíždí víc než střed. Filtr na `rozhodl_test` je podstatný: bez něj srovnání kazí soukromé školy s vlastními kritérii (PORG má medián 83 a nejnižšího přijatého 40, protože o pořadí z 16 % rozhodovalo něco jiného než test).

## 2. Co už máme a kde to drhne

**Data jsou hotová.** `public/pasma_prijeti_{rok}.json` nese za 2 879 oborů pásmo nejistoty, nejnižšího přijatého, medián, hustotu u hranice, míru *rozhodl test* i rozdělení po pětibodových pásmech. Všechny ukazatele jsou zapsané ve [slovníku ukazatelů](slovnik-ukazatelu.md). **Tenhle návrh nezavádí žádný nový ukazatel**, mění jen prezentaci.

Drhne to na dvou místech:

**Stránka školy** (`PasmaPrijetiCard`) je čistě textová. Rozdělení po pásmech je schované v rozbalovací tabulce, kterou nikdo nerozbalí. Součet: nejbohatší data projektu v nejméně čitelné podobě.

**Simulátor** zná uchazečovy body z češtiny a matematiky (`ownCzech`, `ownMaths`), ale porovnává je s **průměrem přijatých** — `admissionGap` vrací „Nad / Kolem / Pod průměrem přijatých“. To je špatný referenční bod hned dvakrát:

1. Slovník sám dokládá, že rozdělení je šikmé doprava a **medián leží systematicky pod průměrem** (u 35 % oborů aspoň o 2 body). Průměr tedy přeceňuje, co je potřeba.
2. Průměr neví nic o rozptylu. Dva obory se stejným průměrem mají jinou realitu: u jednoho je pásmo nejistoty 2 body, u druhého 44.

**A hlavně spolu ta dvě místa nemluví.** Simulátor zná uchazečovo číslo, stránka školy zná rozdělení. Body se navíc neukládají, žijí jen v relaci simulátoru.

## 3. Povinná inventura zdrojů

Prošel jsem [zdroje dat](zdroje-dat.md) včetně oddílu 3. Návrh **nepřidává žádný nový zdroj**; staví na už zpracovaných datech uchazečů (oddíl 2.2). Z nepoužitých sloupců jsem zvážil:

| Nepoužitý sloupec | Rozhodnutí |
|---|---|
| **Výsledek testu u všech uchazečů** (`c_m_procentni_skor`, 75 % řádků) | **Použít.** Oddíl 3 ho vede jako „jediný způsob, jak dát dítěti vlastní číslo do kontextu“ se stavem „zpracováno 13. 9. 2026, na web zatím nenapojeno“. Tenhle návrh je přesně to napojení. |
| Oficiální nejnižší a nejvyšší přijatý a percentily (souhrny, sl. 72–86) | **Nepoužít teď.** Byly by po zaměřeních a za aktuální rok, což je lepší, ale je to jiný zdroj s jinou úrovní klíče. Míchat ho do proužku by znamenalo dvě různé definice v jednom obrázku. Zvážit jako samostatnou dávku. |
| Profil dovedností uchazečů (položková data, `b1`–`b16.x`) | **Nepoužít.** Odpovídá na „v čem byli silní“, ne na „kde stojím“. Soubory navíc nikdo nezpracoval. |
| Výsledky po termínech zvlášť (listy A–D) | **Nepoužít.** Data uchazečů nesou lepší výsledek, proužek pracuje s ním. |
| Data uchazečů 2. kola | **Nepoužít.** Oddíl 3 to zamítá: jen 133 oborů má ve 2. kole aspoň deset přijatých s výsledkem. |
| `jpz_prumer_actual`, `jpz_median` (katalog 2025) | **Nepoužít.** Nahrazeno polem `median_prijatych`; slovník je vede jako spočítané a nikdy nezobrazené. |
| Důvod nepřijetí u jednotlivce | **Nepoužít.** Rozpad máme z agregátu. |

## 4. Návrh: pásmový proužek

Vodorovná osa 0–100 bodů, tři zóny a značka s vlastním výsledkem.

```
        nedostal se nikdo │ rozhodovalo i něco jiného │ dostali se všichni
  ├──────────────────────┼───────────────────────────┼──────────────────────┤
  0                     81            ▲ ty: 84       93                   100
                        ▁▂▃▅█▇▅▃▁  ← kolik jich v pásmu bylo
```

Za proužkem jemné sloupce rozdělení z pole `pasma`, aby byla vidět **hustota** — kde se uchazeči mačkají.

### 4.1 Věta pod proužkem: počty, ne procenta

> **S 84 body bys byl v rozmezí, kde se loni ze 41 uchazečů dostalo 24.**

Ne „šance 58 %“. Důvody:

- **Přirozené četnosti se chápou spolehlivěji než procenta.** Pro čtrnáctiletého platí dvojnásob.
- **Procento předstírá přesnost, kterou data nemají.** Popisují jeden ročník a nejsou předpovědí; to už karta říká slovy a proužek to nesmí popřít.
- Čísla musí pocházet z `pasmo_nejistoty_soutezilo` a `pasmo_nejistoty_prijato`, nikdy ze součtu pětibodových pásem — slovník to u pásma nejistoty výslovně zakazuje.

Tři varianty podle polohy:

| Poloha | Věta |
|---|---|
| nad pásmem | „Nad 93 body se loni dostali všichni.“ |
| v pásmu | „…ze 41 se dostalo 24. O zbytku rozhodla další kritéria.“ |
| pod pásmem | „Pod 81 bodů se loni nedostal nikdo. **Chybí ti 12 bodů.**“ |

Poslední věta je nejcennější: dává konkrétní cíl místo verdiktu. Rozdíl mezi „nemáš na to“ a „chybí ti 12 bodů, zbývá pět měsíců“ je u čtrnáctiletého zásadní.

### 4.2 Stavy, které musí proužek zvládnout

Měřením na 1 345 oborech s úplnými údaji:

| Stav | Kolik | Jak vypadá |
|---|---|---|
| běžné pásmo (`hi > lo`) | většina | tři zóny |
| pásmo široké přes 40 bodů | desítky | zóna nejistoty přes půl osy; věta o tom, že test moc nerozhodoval |
| `hi = lo` | jednotky | jediná hodnota, kde se někdo dostal a někdo ne |
| `hi < lo` | jednotky | mezi `hi` a `lo` nebyl **nikdo**; zóna se nekreslí |
| pod 10 přijatých | 362 z 2 879 | proužek se nekreslí vůbec, jen věta proč |
| nikdo neodmítnut pro kapacitu | — | proužek nedává smysl, zůstává dnešní věta |
| talentová zkouška | — | proužek s upozorněním, že popisuje jen část rozhodování |

### 4.3 Co proužek neříká

Musí to být na obrazovce, ne v dokumentaci:

- **Není to hranice ani předpověď.** Popisuje jeden ročník. Hranice se mezi roky posouvá i proto, že se mění obtížnost testu.
- **Body se mezi ročníky nesrovnávají.** K tomu slouží percentil, ne body.
- **U oborů se zaměřeními platí za celý obor školy**, protože zdroj zaměření nerozlišuje.
- Při `rozhodl_test` pod 0,85 je proužek jen orientační a musí to říct.

## 5. Napojení na testy nanečisto

Test nanečisto dává číslo **před** ostrou zkouškou a dá se opakovat. Místo statického verdiktu je vidět pohyb:

```
Tvoje testy:  ●───────●───────●          pásmo GJK: 81–93
             68      74      79      ▲ chybí 2 body do pásma
```

### Past, bez jejíhož ošetření se to nesmí nasadit

**Body z testu nanečisto nejsou body z JPZ.** Jiná obtížnost, jiná populace, jiné podmínky. Položit je na stejnou osu bez upozornění je přesně to, před čím slovník varuje u srovnávání ročníků.

Dvě cesty, obě přípustné:

1. **Kalibrace na percentil.** Test nanečisto přepočítat na percentil vlastní populace a porovnávat percentily, ne body. Potřebuje dost účastníků, aby percentil něco znamenal.
2. **Přiznaná orientace.** Body nepřevádět, proužek kreslit šedě a napsat, že jde o hrubé srovnání, ne o převod.

Bez jedné z nich návrh nasazení testů nanečisto **nedoporučuje**.

## 5b. Proč je prototyp nezalistovaný, a ne chráněný

Původně běžel pod admin bránou (`/admin/prototyp/pasma`, bez cookie 404). Na produkci se tím stal nedostupným i zadavateli, protože `ADMIN_TOKEN` je jen v lokálním prostředí. Rozhodnutí 22. 9. 2026: přesunout na `/prototyp/pasma` **bez brány**.

Co to znamená:

- **Nezalistovaná, ne tajná.** Kdo zná adresu, otevře ji. Nikde na ni nevede odkaz a v sitemapě není (ta má pevný seznam cest, prototyp se do ní nedostane sám).
- **`robots: noindex`** v metadatech stránky.
- **Do `robots.txt` se zapsat nesmí.** Zakázané procházení by vyhledávači zabránilo `noindex` vůbec přečíst, takže adresa by se mohla v indexu objevit bez obsahu. Zní to obráceně, ale je to tak.
- Na stránce stojí pruh **„Rozpracovaný prototyp“**, aby náhodný návštěvník nepokládal podobu za hotovou.

Stránka zobrazuje jen veřejná data z katalogu, nic neukládá a nic neodesílá. Zadané body zůstávají v prohlížeči.

## 6. Pořadí realizace

1. **Simulátor: nahradit průměr pásmem.** Nejmenší zásah s největším dopadem — data i vlastní body jsou na jednom místě, mění se referenční bod a text `admissionGap`. Dnešní „Kolem průměru přijatých“ u oboru s pásmem 81–93 neříká nic.
2. **Proužek na stránce školy** místo dnešního odrážkového seznamu; rozbalovací tabulka zůstává jako doplněk.
3. **Přenos bodů mezi simulátorem a stránkou školy.** Dnes se neukládají. Ukládat je jen v prohlížeči, nikdy na server — je to údaj o dítěti.
4. **Testy nanečisto** teprve po vyřešené kalibraci.

## 7. Otevřené otázky

- Má se proužek kreslit i bez zadaných bodů, jen jako rozdělení? Prototyp to umí obojí a je potřeba to rozhodnout pohledem.
- Kde v pořadí stránky školy proužek stojí proti převisu. Pokud je převis vidět dřív a výrazněji, sdělení se převrátí.
- Zda u `rozhodl_test < 0,85` proužek raději nekreslit vůbec, místo kreslení s výhradou.
