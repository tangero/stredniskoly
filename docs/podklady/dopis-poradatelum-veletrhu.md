# Dopis pořadatelům veletrhů středních škol

Text e-mailu s nabídkou online mediálního partnerství pro pořadatele akcí z přehledu [veletrhů a přehlídek](../veletrhy-skol-2027.md), oddíl 8.

**Odesílatel (rozhodnutí zadavatele 23. 9. 2026):** jménem **Patricka Zandla** z adresy **eda@prijimackynaskolu.cz**, řádek „Od“ tedy zní `Patrick Zandl – Přijímačky na školu <eda@prijimackynaskolu.cz>`. Je to týž vzor jako u [pozvánky do pilotu](pozvanka-pilot-uctu-portalu.md): nabídku ven podepisuje člověk, protože nabídku podepsanou umělou inteligencí příjemce snadno vyhodnotí jako podvod, a odpovědi na adrese eda@ vyřizuje Eduarda, což text přiznává. Adresa zůstává na ověřené doméně, takže drží DKIM i SPF. Návrh textu připravila Eduarda.

**Doplňuje se:** `{osloveni}`, `{akce}` (jedna akce, nebo výčet série, viz varianty), `{odkaz_kraj}` (stránka kraje na webu). Kontakty jsou v `data/veletrhy/poradatele-kontakty.json` (gitignorovaný) a ve zdrojovém sešitu.

---

**Předmět:** {nazev_akce} v přehledu veletrhů na Přijímačky na školu

{osloveni},

provozuji web Přijímačky na školu (www.prijimackynaskolu.cz), na kterém rodiče a uchazeči vybírají střední školu. Obory, kapacity a výsledky přijímacího řízení na něm přebíráme z otevřených dat CERMATu, rejstříku MŠMT a České školní inspekce. Od února 2026, kdy jsme začali měřit, zaznamenal web přes 25 000 návštěv, nejvíc v únoru a v květnu.

Nově na webu vedeme přehled veletrhů a přehlídek středních škol podle krajů a měst: www.prijimackynaskolu.cz/veletrhy. Je v něm i vaše akce:

{akce}

U akce uvádíme vás jako pořadatele a odkazujeme na vaši stránku. Termín jsme ověřili na vašem webu. Kdyby se cokoli změnilo, napište mi prosím, opravíme to.

Rád bych vám nabídl, aby se náš web stal online mediálním partnerem akce. Znamenalo by to jedinou věc: na stránce akce byste odkázali na náš přehled, buď na veletrhy (www.prijimackynaskolu.cz/veletrhy), nebo na střední školy ve vašem kraji ({odkaz_kraj}). Vyberte, co se k vaší stránce hodí víc. My na vaši akci odkazujeme už teď a v přehledu ji necháme tak jako tak, partnerství na tom nic nemění.

Proč o odkaz stojíme, řeknu rovnou: přehled je nový a bez odkazů z webů, které se veletrhům skutečně věnují, ho rodiny ve vyhledávači nenajdou. Vašim návštěvníkům zase ukáže, jaké další akce se v kraji konají a které školy v okolí jsou.

Partnerství je zdarma, nevyžaduje smlouvu a stačí k němu odpověď na tento e-mail.

Ještě dvě prosby, obě nezávazné:

- Pokud zveřejňujete seznam vystavujících škol, pošlete mi ho prosím nebo odkaz na něj. Rádi bychom později na stránce každé školy ukázali, na kterém veletrhu ji rodiny potkají.
- Pořádáte-li další akci, kterou v přehledu nemáme, můžete ji nahlásit na www.prijimackynaskolu.cz/veletrhy/nahlasit. Před zveřejněním ji ověříme.

Tenhle e-mail přišel z adresy eda@prijimackynaskolu.cz. Odpovídá na ní Eduarda, naše asistentka s umělou inteligencí, která za projekt vyřizuje veškerou administrativu; v podpisu to vždy uvádí. Cokoli, co chcete řešit přímo se mnou, pište prosím na patrick@zandl.cz.

Děkuji a budu rád za odpověď, i za kritickou.

S pozdravem

Patrick Zandl
provozovatel projektu Přijímačky na školu
patrick@zandl.cz

---

## Varianty

### `{akce}`: jedna akce

> **{nazev_akce}**, {termin}, {misto}

### `{akce}`: série akcí jednoho pořadatele

KHK Královéhradeckého kraje (5 akcí), Vzdělávací institut pro Moravu (7), Jihočeská hospodářská komora (5), Schola Servis (5), KHK Střední Čechy (4), Karlovarský kraj (3). Místo „Je v něm i vaše akce:" stojí „Jsou v něm i vaše akce „{predmet}“:" a výčet:

> - {termin}, {mesto}, {misto}
> - …

Dál v textu se mění tvary: „U akcí uvádíme…“, „Termíny jsme ověřili…“, „partnerem akcí“, „na stránce akcí“, „na vaše akce odkazujeme… necháme je“.

## Rozeslání

Šablona je v `src/lib/veletrhy-dopis.ts` a text drží slovo od slova; termíny a místa si bere ze `src/data/veletrhy-2027.json` podle id akce, takže dopis nemůže tvrdit jiný termín než stránka. Rozesílá `scripts/veletrhy-posli-dopisy.mjs` přes Resend, vzorem je rozesílka pozvánek do pilotu:

```bash
set -a && . ./.env.local && set +a
npx tsx scripts/veletrhy-posli-dopisy.mjs --nanecisto                          # nic neodešle
npx tsx scripts/veletrhy-posli-dopisy.mjs --jen khk-hk --na patrick@zandl.cz  # zkouška
npx tsx scripts/veletrhy-posli-dopisy.mjs --opravdu                            # ostrá rozesílka
```

Seznam adresátů je v `data/veletrhy/obesilani.json`, záznam o odeslání v `data/veletrhy/odeslano.json`; oba jsou gitignorované, protože nesou jména a adresy. Zkouška přes `--na` datum nezapisuje. Vzor odešel na patrick@zandl.cz 23. 9. 2026.

U KAM po ZŠ jsou pořadateli tři školy a kraj. Každá škola dostane dopis o své akci; kraj, který akce financuje, dostane dopis s celou sérií.

### Termín z webu někoho jiného

Pro **KAM po ZŠ** (ISŠTE Sokolov, ISŠ Cheb, Karlovarský kraj) a **Scholaris Olomouc** (SŠP Olomouc). Termín jsme našli na webu SPŠ Ostrov, resp. Scholaris, a karta akce vede tam. Věty „…a odkazujeme na vaši stránku“ a „Termín jsme ověřili na vašem webu…“ by nebyly pravdivé, proto zní:

> U akce uvádíme vás jako pořadatele. Termín jsme našli na webu {zdroj} a u akce odkazujeme tam. Máte-li vlastní stránku akce, pošlete mi prosím odkaz, použijeme ji. Kdyby se cokoli změnilo, napište mi, opravíme to.

### Termín neověřený u pořadatele

Pro **Schola Bohemia** (Služba škole Pardubice) a **Hitparádu škol** (KHK Pardubického kraje). Termín máme jen z agregátoru akcí a na stránce ho vedeme se značkou „neověřený u pořadatele“. Věta „Termín jsme ověřili na vašem webu. Kdyby se cokoli změnilo, napište mi prosím, opravíme to." se nahradí:

> Termín jsme převzali z přehledu akcí, na vašem webu jsme ho zatím nenašli. Proto ho u akce vedeme s poznámkou, že ho pořadatel nepotvrdil. Potvrdíte mi ho prosím? Poznámku pak odstraníme.

### Online akce

Pro **Online veletrh SŠ MSK** (Moravskoslezský pakt zaměstnanosti). Termín vedeme jako přibližný („~21.–30. 11., dle okresů“). Věta o ověření termínu se nahradí:

> Termín uvádíme jako přibližný, protože harmonogram videohovorů podle okresů jsme nenašli. Pošlete mi ho prosím, až bude hotový; doplníme ho.

### Akce bez termínu

Pro pořadatele akcí, které na webu ještě nejsou, protože letošní termín u pořadatele chybí (varianta `bezTerminu`, schváleno zadavatelem 24. 9. 2026). Dopis nesmí tvrdit, že akci vedeme nebo na ni odkazujeme, proto se mění čtyři místa:

- předmět: „{nazev_akce} a přehled veletrhů na Přijímačky na školu“ (ne „v přehledu“);
- místo „Je v něm i vaše akce:“ stojí „Zatím v něm chybí vaše akce:“ a řádek akce je bez termínu;
- odstavec o pořadateli a termínu nahrazuje schválená věta:

> Vaši akci chceme do přehledu zařadit, ale letošní termín jsme zatím nenašli. Pošlete mi ho prosím, až bude známý; doplníme ho a odkážeme na vaši stránku.

U série více akcí: „Vaše akce chceme do přehledu zařadit, ale letošní termíny jsme zatím nenašli. Pošlete mi je prosím, až budou známé; doplníme je a odkážeme na vaši stránku.“ Stejně se do množného čísla převádí věta varianty `agregator`.

- v odstavci o partnerství místo „My na vaši akci odkazujeme už teď a v přehledu ji necháme tak jako tak“ stojí „My na vaši akci odkážeme, jakmile budeme znát termín, a partnerství na tom nic nemění.“

Šablona odmítne variantu `bezTerminu` u akce s potvrzeným termínem i běžnou variantu u akce bez termínu (`tests/veletrhy-dopis.test.mjs`). Vzor odešel na patrick@zandl.cz 24. 9. 2026.

## Co v dopise záměrně není

- **Zmínka v newsletteru.** Návrh s ní počítal jako s plněním z naší strany (§ 8.1), jenže odběr nerozesílá pravidelný souhrn: zprávy jsou vázané na termíny přijímacího řízení a nejbližší odejde **7. 12. 2026** (`python3 scripts/novinky.py plan`, zpráva `vyber-skoly`). Veletrhy jsou v říjnu a listopadu, takže zmínka by přišla po nich. Slibovat ji by znamenalo slibovat něco, co se nestane. Pro příští sezónu se to dá řešit zprávou načasovanou na září.
- **„Přes 20 000 uchazečů nás loni použilo pro rozhodování.“** Zadavatel větu navrhl 23. 9. 2026; v dopise je místo ní doložené číslo z [rozboru návštěvnosti](../analyza-navstevnosti-2026.md): **25 762 návštěv** od 11. 2. do 11. 9. 2026 (Matomo, `VisitsSummary.nb_visits`). Původní věta tvrdí tři věci, které data nenesou: *uchazeči* (měří se návštěvy, ne osoby; rozbor výslovně píše, že návštěva „nikoli unikátní dítě či rodina“ a návštěvníky „nelze vydávat za osoby“), *loni* (rok 2025 se neměřil, data začínají v únoru 2026; slovník pojmů slovo „loni“ navíc zakazuje) a *pro rozhodování* (neměřitelné). Číslo je spodní odhad, protože před 11. 2. se neměřilo. Kdyby existoval jiný doložený zdroj, třeba Vercel Analytics, věta se přepíše podle něj.
- **Počty odběratelů.** Nemáme je doložené.
- **Měření prokliků na web pořadatele.** Návrh ho zmiňoval jako argument (§ 8.2), ale je to otevřená otázka (§ 11); dokud se o ní nerozhodne, nedá se slíbit.
- **Podmíněnost.** Akce v přehledu zůstane, i když pořadatel odkaz nedá. Dopis to říká výslovně: jinak by nabídka zněla jako „odkažte, nebo vás vyřadíme“, a to by nebyla pravda.
- **Zamlčení, že odpovídá umělá inteligence.** Dopis podepisuje člověk, ale odpovědi na eda@ vyřizuje Eduarda, a text to říká přímo — stejně jako pozvánka do pilotu. Pořadatel, který by zjistil až z odpovědi, že si píše s AI, by to vzal jako klam.
