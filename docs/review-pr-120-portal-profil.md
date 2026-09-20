# Code review PR #120

Code review commitu `d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f`: **doporučuji opravit před sloučením**. Nalezeno 5 problémů (1× P1, 4× P2), podrobnosti v komentářích u kódu.

Ověření: `npm run test:js` — 238/238 prošlo; `npx tsc --noEmit` — prošlo. Doplňující reprodukce nad PGlite a React SSR potvrdily pád administrace, přepsání novější opravy starým formulářem a chybějící audit/obnovu smazaného pole. Ztráty podnětu a kontaktu ověřeny průchodem chybových větví. Produkční služby jsem neměnil a plný build jsem nespouštěl.

Review je typu COMMENT, protože přihlášený GitHub účet `tangero` je také autorem PR; nejde o schválení.

## [P1] Převeďte datum z databáze před vykreslením hlášení

[src/app/admin/page.tsx:206](https://github.com/tangero/stredniskoly/blob/d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f/src/app/admin/page.tsx#L206-L206)

Jakmile `hlaseni_chyby` obsahuje alespoň jedno nevyřízené hlášení, `/admin` spadne při renderování. `vytvoreno` je `timestamptz` a Neon Pool ho vrací jako `Date`, přestože rozhraní `Hlaseni` deklaruje `string`. `formatDatumCz` rozpoznává jen řetězec `YYYY-MM-DD`; pro `Date` vrátí původní objekt, který React odmítne chybou `Objects are not valid as a React child (found: [object Date])`. Reprodukováno přes PGlite → `otevrenaHlaseni` → `formatDatumCz` → React SSR; také parser typu 1184 instalovaného Neon ovladače vrací `Date`. Normalizujte datum při načítání nebo před předáním formatteru a otestujte vykreslení neprázdné fronty.

## [P2] Chraňte novější hodnoty před odesláním starého formuláře

[src/lib/portal-profil.ts:126](https://github.com/tangero/stredniskoly/blob/d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f/src/lib/portal-profil.ts#L126-L132)

`PortalEditForm` odesílá všechna předvyplněná pole a zápis je porovnává pouze s aktuální databází, nikoli s verzí, kterou editor otevřel. Reprodukce: editor načte školné 100 Kč; redakce ho opraví na 200 Kč; editor ve stále otevřeném formuláři změní pouze stravování a odešle ho. `zapisUdaje` tiše vrátí školné na 100 Kč a přeznačí ho na `skola`. `FOR UPDATE` ani unikátní index tento běžný postup nezachytí, protože zápisy proběhnou postupně. Reprodukováno nad PGlite. Posílejte pouze skutečně změněná pole a pro měněná pole ověřujte očekávanou verzi, aby starý formulář nemohl bez varování zrušit novější opravu.

## [P2] Zaznamenejte smazání jako samostatnou změnu s možností obnovy

[src/lib/portal-profil.ts:131](https://github.com/tangero/stredniskoly/blob/d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f/src/lib/portal-profil.ts#L131-L134)

Při prázdné nové hodnotě se pouze nastaví `zneplatneno` starému řádku a nový záznam nevznikne. Tím se ztratí autor i povinný důvod odstranění: volání `opravRedakce(... hodnota: "", duvod: "Důvod smazání")` tento důvod nikam do historie neuloží. Současně `vratPredchozi` hledá jen platný řádek, takže skončí hláškou „Pole už platnou hodnotu nemá“ a administrace pro smazané pole ani nenabízí obnovovací formulář. Obojí reprodukováno nad PGlite. Ukládejte i odstranění jako auditovatelnou verzi/událost a umožněte obnovit poslední hodnotu smazaného pole; to je potřebné pro deklarovanou zpětnou moderaci.

## [P2] Zachovejte text nesrovnalosti při selhání GitHubu

[src/app/api/portal-skoly/route.ts:273](https://github.com/tangero/stredniskoly/blob/d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f/src/app/api/portal-skoly/route.ts#L273-L278)

Když škola odešle `nesrovnalost` a založení issue selže (nebo není nastaven `GITHUB_TOKEN`), API přesto vrátí úspěch, ale obsah podnětu se nikde nezachová. Do `portal_profil` jde jen `udaje`, do události zde jen boolean `true` a Telegram obsahuje pouze názvy změněných polí a případný odkaz na issue. Komentář výše tvrdí, že podnět zůstane v události a Telegramu, skutečný text však chybí v obou. Uložte text nesrovnalosti trvale před pokusem o GitHub a umožněte jeho pozdější vyřízení/opakované odeslání; úspěšně uložený profil kvůli tomu není nutné vracet zpět.

## [P2] Uložte povinný kontakt dříve, než potvrdíte přijetí hlášení

[src/app/api/bug-report/route.ts:311](https://github.com/tangero/stredniskoly/blob/d21935c0896dd8db8d3ec73bab4f8f5b953d4c0f/src/app/api/bug-report/route.ts#L311-L317)

Pokud GitHub vytvoří issue, ale následný zápis do DB selže, chyba se pouze zaloguje a návštěvník dostane `success: true` i potvrzovací e-mail. Po odstranění adresy z veřejného issue je přitom databáze jediným trvalým zdrojem kontaktu: hlášení se neobjeví ve frontě `/admin` a redakce nemůže oznamovateli odpovědět. `jeDbNastavena()` ověřuje jen přítomnost proměnné, nikoli úspěšné uložení. Nejdřív trvale uložte hlášení s `issue: null`, potom vytvořte/propojte issue; případné selhání propojení lze opakovat bez ztráty povinného kontaktu.


## Opakované review — 21c29a3

Opakované review commitu `21c29a35b671e892fd620431869ef8e2beff3a95`: **se změnou testu mazání souhlasím**, ale před sloučením zbývají dva nálezy P2 (viz komentáře u kódu).

Z původních nálezů jsou opravené normalizace data pro administraci, ochrana běžného zastaralého formuláře, audit/obnova smazání při postupných operacích a trvalé uložení kontaktu v bug-report API. U nesrovnalostí funguje nový postup při dostupné DB a nedostupném GitHubu, ale selhání samotného uložení podnětu stále končí úspěchem. V obnovení smazaných polí navíc zmizel zámek při čtení předchozí verze.

Nahrazení testu „nezaloží prázdný řádek“ je správné: počet řádků byl detailem vadné implementace. Nový test nad PGlite kontroluje skutečný požadavek — zmizení z veřejných dat, autora a důvod smazání, návaznost historie a obnovení původní hodnoty. Doplnil bych ještě test souběhu obnovy se zápisem a test chybové větve API při neuložené nesrovnalosti.

Nezávislé ověření: **241/241 JS testů prošlo, `npx tsc --noEmit` prošlo**. Chybovou odpověď portálového API jsem reprodukoval izolovaným spuštěním skutečné route s podvrženým selháním `zapisHlaseni`; souběh obnovy řízeným proložením SQL operací nad PGlite (nikoli dvěma produkčními spojeními). Build ani produkční služby jsem nespouštěl. Review typu COMMENT, protože přihlášený účet je také autorem PR.

[P2] Nepotvrzujte nesrovnalost, jejíž uložení selhalo

Výjimka ze `zapisHlaseni` se zde stále jen zaloguje. Když není `GITHUB_TOKEN` (což nový tok portálu umožňuje), případně selže také GitHub, text nesrovnalosti se nikam neuloží, ale route vrátí HTTP 200 / `success: true`, odešle potvrzovací e-mail a Telegram dokonce tvrdí, že podnět je ve frontě `/admin`. Reprodukováno voláním skutečné POST route s `udaje: {}`, neprázdnou nesrovnalostí, selháním `zapisHlaseni` a bez tokenu. Zápis profilu zde projde i bez změněných polí, takže nemusí jít ani o výpadek DB mezi dvěma úspěšnými zápisy. Uložte podnět spolu s profilem v jedné transakci, nebo při neuloženém podnětu vraťte explicitní chybu/částečný výsledek, který formulář zpracuje; úspěch a hlášku o frontě posílejte až po trvalém uložení.

Místo: `src/app/api/portal-skoly/route.ts:297`

[P2] Zajistěte atomické načtení a obnovení předchozí verze

Nový dotaz odstranil původní `FOR UPDATE`, ale následné `zapisUdaje` nedostává ani očekávané ID/verzi. U historie 100 → 200 Kč může obnova načíst předchůdce 100 Kč, mezitím jiný požadavek uloží 300 Kč a obnova pak uzamkne až tento nový řádek a nahradí ho 100 Kč. Výsledek přeskočí verzi 200 Kč; neodpovídá ani jednomu sériovému pořadí těchto dvou operací. Řízené proložení dotazů nad PGlite tento výsledek potvrdilo. Transakce s běžným READ COMMITTED samotná neuzamčené čtení neochrání. Serializujte operace nad školou/polem ještě před výběrem poslední verze nebo před zápisem ověřte, že se ID poslední verze nezměnilo, a při konfliktu obnovu odmítněte/opakujte.

Místo: `src/lib/portal-profil.ts:224`


## Třetí review — b0dcb30

Třetí review commitu `b0dcb309ab945d18c0f2c508545f0ed086350f7e`: oba nálezy z předchozího kola jsou ve svých původních scénářích vypořádané. Profil i podnět sdílejí transakci a chyba uložení ukončí API před potvrzením; obnova získává zámek před čtením a kontroluje očekávanou verzi. Souhlasím také s tím, že již uložená shodná hodnota není konflikt.

**Před sloučením zbývá jeden P2 v pořadí verzí**, viz komentář u kódu. Zámek sám nezaručuje, že čas začátku transakce odpovídá pořadí zápisů.

Ověření: 244/244 JS testů prošlo; `npx tsc --noEmit` a ESLint obou změněných zdrojových souborů prošly. Izolované spuštění skutečné POST route s chybou ukládání podnětu nyní končí chybovou odpovědí a neposílá potvrzení do Telegramu. Nový test obnovy kontroluje odmítnutí zastaralého ID, nikoli skutečné čekání dvou DB spojení na advisory lock; toto omezení ověření zůstává.

**Vercel build zatím není ověřený:** deployment přesně pro tento commit je ve stavu ERROR / BUILD_FAILED s důvodem `Resource provisioning failed`: https://vercel.com/tangeros-projects/stredniskoly/DcwPubHTVydjawPNhxUMEJM1vL9u . To neprokazuje chybu aplikace ani dříve popsaný timeout statické generace. Python/data kontroly, TypeScript a integrace katalogu v GitHub Actions jsou zelené. Před sloučením je stále potřeba úspěšný build na Vercelu.

Review je typu COMMENT, protože přihlášený účet je také autorem PR; nejde o schválení.

[P2] Neodvozujte poslední verzi od času začátku transakce

Poradní zámek serializuje zápisy, ale `order by platne_od desc limit 1` nemusí po jeho získání vybrat skutečně poslední verzi: `platne_od` má ve schématu `default now()`, tedy čas začátku transakce, nikoli vložení řádku. Konkrétní pořadí: transakce A začne první a zdrží se před zámkem pole (např. zápisem jiného pole); později zahájená B zapíše a commitne školné 200 Kč; A potom získá zámek a nahradí tuto hodnotu 300 Kč. Nový řádek A dostane **starší** `platne_od` než již zneplatněný řádek B. Další odeslání pak tímto dotazem vybere B, vyhodnotí pole jako prázdné a pokus o vložení 400 Kč skončí na unikátním indexu chybou `profil_zmenen`. Opakované načtení stránky to neopraví. Stejné řazení používají obnova a přehled smazaných polí.

Následek jsem ověřil nad PGlite s fixture odpovídající tomuto pořadí transakcí: veřejné čtení vrací 300 Kč, další běžný zápis vrací `profil_zmenen`; zvlášť jsem ověřil neměnnost `now()` uvnitř transakce. Nejde o test dvou současných DB spojení. Pro pořadí verzí použijte monotónní revizi přidělenou pod zámkem (např. sekvenci) nebo explicitní poslední verzi/řetězec následníků; sjednoťte podle ní zápis, obnovu i historii. Samotné další zámky ani kontrola očekávaného ID tento chybný výběr posledního řádku neopraví.

## Čtvrté review — 0814c6c

Čtvrté review commitu `0814c6cd275d665d9c2ab3857231ecdb3c8de58a`: **poslední nález P2 je opravený; v posuzovaných opravách nemám další nález bránící sloučení.**

`poradi` se přiděluje ze sekvence při INSERTu pod zámkem daného pole. Výběr poslední verze při zápisu a obnově, historie pro administraci, veřejné čtení i poslední změna v editoru nyní používají toto pořadí. Čas zůstává prezentačním údajem a nemůže otočit návaznost verzí. Nový regresní test věrně kontroluje původní chybu: po ručním obrácení časových razítek projde další zápis 400 Kč. Také moje původní fixture, která na `b0dcb30` blokovala další zápis chybou `profil_zmenen`, na tomto commitu projde.

Ověření: **245/245 JS testů prošlo, `npx tsc --noEmit` a ESLint změněných zdrojových souborů prošly**. Testy kontrolují i shodu SQL migrace s definicí schématu. Omezení z předchozího review zůstává výslovné: neproběhl test dvou současných PostgreSQL spojení čekajících na advisory lock; PGlite a test očekávaného ID tuto integrační zkoušku nenahrazují. Nepovažuji to samo o sobě za nový blokující nález.

**Opravuji svůj předchozí požadavek na zelený Vercel preview před sloučením.** Nezávisle jsem přes Vercel API ověřil posledních 20 nasazení: všech 12 preview má ERROR, všech 8 produkčních nasazení z main má READY, napříč více větvemi. [Deployment tohoto commitu](https://vercel.com/tangeros-projects/stredniskoly/DN4ieb5Seg2sWVeEDdMvUzXjQHfG) končí za 1 294 ms s `Resource provisioning failed`. Tento status není důkazem chyby kódu PR a nemá být podmínkou jeho sloučení. Příčina na úrovni projektu/tarifu zůstává hypotézou, konkrétní nastavení jsem neověřoval.

Souhlasím s navrženým postupem: plošně rozbité náhledy řešit odděleně a **po sloučení ověřit skutečné produkční nasazení tohoto kódu**. Dosavadní READY na main potvrzují rozdíl mezi preview a produkčním nasazováním, nikoli ještě úspěšný build tohoto PR. Nadále platí nasazovací krok migrace popsaný v PR. Nic jsem neslučoval ani nenasazoval.

GitHub review má typ COMMENT, protože přihlášený účet je také autorem PR; obsahově uzavírám dosavadní code-review nálezy jako vypořádané.
