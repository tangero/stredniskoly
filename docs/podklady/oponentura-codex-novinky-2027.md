# Oponentura codexu k novinkám k přijímačkám

Kola 1 až 5 · 17. 9. 2026 · Vypracoval codex (codex-cli 0.153.4). Kolo 1 k [návrhu v1.1](../novinky-k-prijimackam-2027.md), vypořádání v oddílu 13 návrhu; kolo 2 k verzi 1.2 (oddíl 14) a kolo 3 k verzi 1.3 (oddíl 15) a kolo 4 k verzi 1.4 (oddíl 16) a kolo 5 k verzi 1.5 (oddíl 17).

## Metoda (co jsi spustil a přečetl)

Posuzoval jsem pracovní verzi 1.1. **Blokační znamená vadu popsaného postupu, kterou je potřeba odstranit před spuštěním**, nikoli potvrzenou zranitelnost dosud neexistujícího odběru.

- Přečetl jsem návrh, `.claude/CLAUDE.md`, celý `docs/zdroje-dat.md` včetně oddílu 3, slovník pojmů a relevantní definice slovníku ukazatelů.
- Prověřil jsem kalendář, registr, odesílání e-mailů, HMAC, ochrany formulářů, analytiku, konfiguraci nasazení, datovou linku a existující testy.
- Spustil jsem `git show docs/sledovani-skol-a-oboru:docs/sledovani-skol-2027.md | nl -ba`. Níže uvedené odkazy na **sledování** označují tuto větev, commit `19dbcf7e31d9a657c50160e146f265c60673e181`. Stejně jsem přečetl registr a související soubory větve `feat/titulka-nabidka-oboru`, commit `d4ed34ca51ca6388c79ad529331d041329c4876d`.
- Předstihy jsem spočítal Pythonem přímo z JSON pomocí `date.fromisoformat(...) - timedelta(days=...)`. Výsledky jsou níže.
- Ověřil jsem aktuální dokumentaci Resendu, Vercelu, Matoma, RFC 8058, GDPR a výklad ÚOOÚ.

Spuštěné kontroly:

```text
node --experimental-strip-types --test tests/portal-magic.test.mjs
→ tests 11; pass 11; fail 0

python3 -B -c 'import runpy; d=runpy.run_path("tests/test_admissions_calendar.py"); ts=[(k,v) for k,v in d.items() if k.startswith("test_")]; [(f(),print(k,"PASS")) for k,f in ts]'
→ test_deadlines_and_exam_dates PASS
→ test_export_is_current_and_rfc5545_dates_are_exclusive PASS

python3 -B scripts/stav-datovych-sad.py kontrola
→ 18 sad, 0 chyb, 6 varování
```

Varování se týkají nepřevzatých dat a zastaralé extrakce inspekcí. Nejsou sama o sobě překážkou odběru termínů. Nic jsem nezapisoval do souborů repozitáře.

## Blokační problémy

**B1 — Potvrzení přes GET předbíhá souhlas z patičkového formuláře**

**Dopad:** Popsaný postup může založit odběr bez dokončeného souhlasu a výběru studia. Automatické načtení odkazu poštovním bezpečnostním systémem může být zaměněno za potvrzení člověkem.

**Důkaz:** [docs/novinky-k-prijimackam-2027.md:106](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:106) přesouvá souhlas a druh studia až na potvrzovací stránku. Naproti tomu [řádek 164](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:164) obojí vyžaduje už při přihlášení a [řádek 166](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:166) samotným GET založí odběr a odešle uvítání. Automatické načítání odkazů poštovními systémy je výslovně popsaný problém v [RFC 8058](https://www.rfc-editor.org/info/rfc8058/).

**Návrh řešení:** GET pouze ověří odkaz a zobrazí formulář. Odběr založí až explicitní POST s potvrzeným účelem a druhem studia. Testovat i přihlášení cizí adresy následované pouhým načtením odkazu robotem. Samotná znalost cizí adresy podpis HMAC neobchází; problém je v interpretaci GET jako souhlasu.

**B2 — HMAC token není jednorázový a může obnovit zrušený odběr**

**Dopad:** Opakovaný platný potvrzovací odkaz může po odhlášení znovu založit odběratele. Opakované uvítání není v potvrzovacím postupu rovněž ošetřené.

**Důkaz:** Návrh přebírá bezstavový vzor s platností 72 hodin a při potvrzení zakládá odběr: [docs/novinky-k-prijimackam-2027.md:165](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165). Existující [src/lib/portal-magic.ts:58](/Users/imac/Github/stredniskoly/src/lib/portal-magic.ts:58) kontroluje podpis a expiraci; `nonce` nikde nespotřebovává. Spustil jsem:

```js
import { vytvorMagicToken, overMagicToken } from "./src/lib/portal-magic.ts";
const secret = "audit-local-only";
const token = vytvorMagicToken("audit", secret);
console.log("first=" + overMagicToken(token, secret));
console.log("replay=" + overMagicToken(token, secret));
```

Příkaz `node --experimental-strip-types --input-type=module -e '…'` vrátil:

```text
first=audit
replay=audit
```

Verze klíče ve sledování chrání správcovské odkazy; potvrzovací token podle návrhu žádnou takovou vazbu nemá.

**Návrh řešení:** Při potvrzení atomicky zaznamenat spotřebování identifikátoru tokenu. Opakování nesmí vytvořit nový odběr ani nové uvítání. Po odhlášení musí zůstat ochrana proti přehrání alespoň do expirace původního tokenu; tomu přizpůsobit retenční pravidla.

**B3 — Popsaná idempotence nezaručuje ochranu při pádu a souběhu**

**Dopad:** Mohou vzniknout duplicitní zprávy nebo zablokované pokračování dávky.

**Důkaz:** [docs/novinky-k-prijimackam-2027.md:167](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:167) stanoví pořadí „odeslat, potom zapsat“. [Tabulka na řádku 153](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:153) obsahuje pouze hotová odeslání; rezervace práce, stabilní složení dávky ani zámek popsané nejsou. Převzatý vzor sledování uvádí na řádku 262 klíč `souhrn/{den}/{číslo dávky}`.

Po úspěšném odeslání a pádu před zápisem databáze neví, co odešlo. Při novém sestavení očíslovaných dávek z neodeslaných příjemců může stejný klíč označit jiný obsah. Resend pro stejný klíč s jiným obsahem vrací `409`; ochranu uchovává jen 24 hodin. [Dokumentace idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys). Vercel připouští duplicitní spuštění cronu a doporučuje zámky i idempotenci. [Dokumentace cronu](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

**Návrh řešení:** Před odesláním uložit neměnnou dávku a její klíč, atomicky přidělovat práci a evidovat stav pokusu. Vyřešit také neurčitý výsledek po timeoutu a opakování po více než 24 hodinách. Samotný primární klíč tabulky odeslaných zpráv vzdálený vedlejší účinek nevrátí.

**B4 — Vynechaný den znamená trvale ztracenou připomínku**

**Dopad:** Jediný výpadek, vyčerpání kvóty nebo pozdní nasazení může zabránit odeslání zásadní zprávy.

**Důkaz:** Odesílač vybírá pouze zprávy „k odeslání dnes“: [docs/novinky-k-prijimackam-2027.md:167](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:167). Při nedostatku kvóty nepošle nic: [řádek 171](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:171). Další den už zpráva podmínku „dnes“ nesplňuje. Vercel neúspěšné spuštění automaticky neopakuje. [Dokumentace cronu](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

**Návrh řešení:** Vybírat dosud neodeslané splatné zprávy, nikoli jen dnešní. Každá potřebuje konec užitečnosti, aby například opožděná připomínka přihlášek neodešla po uzávěrce. Doplnit opakování, upozornění na neproběhlý běh a postup ruční obnovy.

**B5 — Jediná naplánovaná IP ochrana pouze zaznamenává**

**Dopad:** Útočník může z jedné IP rozesílat potvrzení na mnoho různých adres a spotřebovávat kvótu. Limit na jednotlivou adresu takový útok neřeší.

**Důkaz:** [docs/novinky-k-prijimackam-2027.md:164](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:164) spoléhá pro IP limit na firewall. [N0 na řádku 233](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:233) ale nastavuje režim „jen zaznamenat“ a N1–N4 neobsahují jeho přepnutí do vynucování. Vercel rozlišuje zaznamenání a blokování jako různé akce. [Dokumentace firewallu](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

**Návrh řešení:** Před zveřejněním formulářů stanovit a zapnout skutečný limit. Zahrnout do přejímky překročení IP limitu, souběžné požadavky na stejnou adresu a globální rozpočet potvrzovacích e-mailů.

**B6 — Smazání společného odběratele ruší i jiné účely**

**Dopad:** Odhlášení termínů může zrušit také samostatně vyžádanou zprávu o dalším kalendáři a později sledování škol.

**Důkaz:** [Rozhodnutí 9](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:17) říká, že po odhlášení i skončení ročníku se smaže odběratel. [Řádek 170](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:170) naproti tomu správně podmiňuje smazání absencí jiných odběrů. Cizí klíče [na řádcích 140 a 149](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:140) používají `ON DELETE CASCADE`.

Přečtený výstup:

```text
git show docs/sledovani-skol-a-oboru:docs/sledovani-skol-2027.md | nl -ba

175  Po odhlášení se odběratel smaže celý…
202  odberatel_id uuid references odberatel on delete cascade,
```

**Návrh řešení:** Rozlišit odhlášení konkrétního odběru a výslovné zrušení všech odběrů. Společnou identitu mazat až bez zbývajících účelů. Sjednotit oba návrhy včetně roční expirace sledování; sdílená databáze sama tuto kompatibilitu nezajišťuje.

## Nikoli blokační

**N1 — Token s adresou se může dostat do analytiky**

**Dopad:** Podpis nezajišťuje utajení e-mailu ani odkazu, který opravňuje k akci.

**Důkaz:** [Návrh:165](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165) ukládá adresu do tokenu v URL. [portal-magic.ts:49](/Users/imac/Github/stredniskoly/src/lib/portal-magic.ts:49) používá čitelný Base64URL, nikoli šifrování. [layout.tsx:94](/Users/imac/Github/stredniskoly/src/app/layout.tsx:94) globálně spouští `trackPageView` bez odstranění parametru. Matomo standardně měří URL aktuální stránky. [Dokumentace Matoma](https://developer.matomo.org/guides/tracking-javascript-guide).

Konkrétní únik neověřen: budoucí potvrzovací endpoint ještě neexistuje a mohl by provést přesměrování před vykreslením.

**Návrh řešení:** Vyměnit token za krátkou relaci a přesměrovat na čistou URL před analytikou; tokenové stránky neměřit. Projekt už obdobný postup používá v [src/app/admin/auth/route.ts:4](/Users/imac/Github/stredniskoly/src/app/admin/auth/route.ts:4). Zahrnout také redakci URL v logování.

**N2 — Stránka zásad sama neopraví analytiku bez souhlasu**

**Dopad:** N0 může být formálně splněná zveřejněním zásad, přestože způsob měření zůstane nevyřešený.

**Důkaz:** [Návrh:233](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:233) vyžaduje stránku zásad, [řádek 223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223) povinné cíle Matoma. V [layout.tsx:88](/Users/imac/Github/stredniskoly/src/app/layout.tsx:88) chybí podmínění souhlasem i vypnutí cookies. Pro netechnické cookies nestačí informační text; ÚOOÚ požaduje předchozí souhlas. [ÚOOÚ — cookies](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies).

Skutečné cookies produkčního prohlížeče ani nastavení serveru Matoma jsem neověřoval, proto nejde o prokázané porušení na produkci.

**Návrh řešení:** Do N0 doplnit rozhodnutí o režimu analytiky a jeho kontrolu v prohlížeči. Při odmítnutí analytiky musí odběr dál fungovat. Samotný režim bez cookies rovněž nenahrazuje posouzení zbývajícího zpracování.

**N3 — Právní zadání nepopisuje důkaz souhlasu ani výkon práv**

**Dopad:** Implementace může evidovat potvrzení adresy, ale nebude jasné, s jakým historickým zněním a účelem uživatel souhlasil ani jak získá své údaje.

**Důkaz:** [Schéma:139](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:139) ukládá čas a místo formuláře, ale neurčuje vazbu na znění souhlasu. [Právní kontrola:118](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:118) nemá konkrétní přejímací podmínky. Převzatý oddíl sledování na řádku 277 jmenuje Vercel, Neon a Resend, avšak neřeší identitu správce, žádost o přístup či opravu ani případná zahraniční předání. Povinnost doložit souhlas stanoví čl. 7; informační povinnosti čl. 13. [GDPR](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32016R0679).

**Návrh řešení:** Popsat minimální záznam souhlasu s verzí textu, účelem a časem; určit správce a kontaktní postup pro výkon práv. Prověřit smlouvy se zpracovateli a případná předání. Z kódu nelze potvrdit, že smlouvy chybějí.

**N4 — „Do potvrzení nic“ a „smaže se celý“ jsou nepřesné retenční sliby**

**Dopad:** Uživatelský slib může být širší než skutečné mazání.

**Důkaz:** [Návrh:17](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:17) tvrdí, že se nic neukládá; [řádek 165](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165) připouští otisk adresy. Převzatá tabulka `limit_potvrzeni` obsahuje na řádcích 219–223 sledování SHA-256 adresy nebo IP, počitadlo a čas, ale žádnou politiku odstranění. Resend zároveň uvádí pro Pro třicetidenní uchování dat. [Ceník Resendu](https://resend.com/pricing).

**Návrh řešení:** Slíbit přesně „do potvrzení nezakládáme aktivní odběr“. Oddělit dobu uložení odběrů, bezpečnostních otisků, důkazů souhlasu, provozních záznamů a záloh. Prostý SHA-256 adresy nenazývat anonymizací; zvážit HMAC otisk s odděleným tajemstvím.

**N5 — Čekání na další kalendář nemá úplný životní cyklus**

**Dopad:** Není jasné, jak dlouho čekající kontakt zůstane uložený při nevydání kalendáře a co přesně znamená třicetidenní možnost potvrzení.

**Důkaz:** [Návrh:105](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:105) stanoví smazání do 30 dnů po výzvě, ale před výzvou maximální dobu neurčuje. [Tabulka:148](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:148) nemá cílový ročník ani popsaný stav vyřízení. Jediná výslovná platnost potvrzovacího tokenu je přitom [72 hodin](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165). Postup neříká, zda pro nový ročník platí jiný token.

**Návrh řešení:** Definovat cílový ročník, maximální čekání, okamžik odeslání výzvy, expiraci a odstranění splněného jednorázového požadavku. Sjednotit uživatelskou lhůtu a platnost odkazu; nepřevádět souhlas automaticky na další oznámení.

**N6 — Jedna adresa nemůže odebírat oba druhy studia**

**Dopad:** Rodič se dvěma dětmi v různých segmentech musí jeden odběr přepsat nebo použít jinou adresu.

**Důkaz:** [Schéma:139](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:139) má jediný `druh_studia`, ale primární klíč jen `(odberatel_id, rocnik)`. Převzatý `odberatel.email` je unikátní. Opakované přihlášení, změna segmentu a změna adresy nejsou v [průběhu:164](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:164) rozlišené.

**Návrh řešení:** Buď omezení výslovně přijmout, nebo umožnit více segmentů a společné zprávy deduplikovat. Popsat normalizaci adres, atomické připojení k existující identitě a nové ověření při změně adresy. Identifikátor odeslaného e-mailu musí jednoznačně zahrnovat ročník; samotné `kriteria` by při zachované identitě kolidovalo mezi roky.

**N7 — One-click odhlášení potřebuje přesnější kontrakt**

**Dopad:** Přítomnost dvou názvů hlaviček sama nezajistí funkční odhlášení v poštovním klientu.

**Důkaz:** [Návrh:168](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:168) říká, že obě hlavičky „míří na endpoint“. Ve skutečnosti URL nese pouze `List-Unsubscribe`; druhá má přesnou hodnotu:

```text
List-Unsubscribe: <https://…/odhlasit/…>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Endpoint musí zpracovat POST bez přihlášení či cookies, bez přesměrování; obě hlavičky musí pokrývat DKIM podpis. [RFC 8058](https://www.rfc-editor.org/info/rfc8058/).

**Návrh řešení:** Oddělit odhlašovací oprávnění od správy všech odběrů, určit jeho rozsah a přidat test skutečných hlaviček doručené zprávy. GET automatického skeneru nemá rušit odběr.

**N8 — Kalendář neodvodí všechny navržené zprávy a obsah 2. kola je nepřesný**

**Dopad:** Generátor nemá úplnou specifikaci spouštěčů a květnový text může mást příjemce.

**Důkaz:** [Návrh:36](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:36) slibuje vazbu každého e-mailu na událost kalendáře. Uvítání, prosincový výběr školy a dvě zprávy o přepnutí sad ji ale nemají. Prosincové „začátkem měsíce“ není konkrétní datum. [Generátor:191](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:191) přitom chybějící událost chápe jako chybu.

Věta „2. kolo trvá jen pár dní“ na [řádku 47](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:47) neodpovídá [kalendáři:41](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:41): kritéria začínají 14. 5., přihlášky až 19. 5., výsledky jsou 22. 6.

**Návrh řešení:** Rozlišit spouštěč potvrzením, kalendářem, redakčním datem a publikací dat. Psát, že několik dní trvá **podání přihlášek**, a uvést 19.–24. 5. Do závislostí zprávy o JPZ zahrnout i druhé a náhradní termíny, které má podle tabulky vysvětlovat.

**N9 — Pravidla sezóny si odporují a nová nabídka má opomenutou závislost**

**Dopad:** Není jednoznačné, které datové zprávy se mají vytvořit, a N3 může čekat na práci mimo svůj plán.

**Důkaz:** [Rozhodnutí 8](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:16) zahrnuje pásma přijetí v sezóně; [vypořádání S7:261](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:261) označuje „pásma v květnu“ za mimosezónní. Odběr přitom končí až 22. 6. Registr pásma očekává v [květnu:175](/Users/imac/Github/stredniskoly/public/stav_datovych_sad.json:175).

[N3:236](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:236) má skončit odeslanou zprávou o nové nabídce. Registr však uvádí [chybějící jarní importér:93](/Users/imac/Github/stredniskoly/public/stav_datovych_sad.json:93); ověřený seznam [scripts/linka/zpracovani.py:239](/Users/imac/Github/stredniskoly/scripts/linka/zpracovani.py:239) zpracovatele přihlášek ani kapacit neobsahuje. Navíc novinky spouštějí zprávu přepnutím `cermat-prihlasky`, zatímco sledování na řádku 45 přepnutím `cermat-kapacity`.

**Návrh řešení:** Sjednotit sezónu, spouštěče a katalog zpráv. Jarní import uvést jako explicitní závislost N3. Lednový e-mail musí odkazovat na nabídku zveřejněnou školami, nikoli slibovat již aktualizovanou nabídku na tomto webu.

**N10 — Přechod ročníku není vyřešen pouhým zákazem letopočtů v šablonách**

**Dopad:** Formulář může po přepnutí registru nabízet nový ročník, ale odkazy či ICS zůstanou staré.

**Důkaz:** [Návrh:104](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:104) odvozuje ročník z registru. Existující [scripts/generate-admissions-calendar.py:26](/Users/imac/Github/stredniskoly/scripts/generate-admissions-calendar.py:26) má rok 2027 napevno v názvu kalendáře, UID i URL; vstup a výstup jsou pevné na řádku 37. Stejný stav jsem ověřil přes `git show` i na větvi, kterou má N0 sloučit. [Pravidla projektu:163](/Users/imac/Github/stredniskoly/.claude/CLAUDE.md:163) přitom požadují období z registru.

**Návrh řešení:** Do přejímky přidat přepnutí na zkušební další ročník: formulář, předmět, obsah, cílový kalendář i ICS musí souhlasit. Konkrétní rok ve jménu historického souboru sám o sobě není chyba; problém je pevné vybírání tohoto souboru pro další ročníky.

**N11 — Chybí cesta od schváleného souboru k nasazenému odesílači**

**Dopad:** Schválený JSON nemusí být na očekávané adrese dostupný; jednou vygenerovaný obsah může také zastarat po opravě kalendáře.

**Důkaz:** [Návrh:187](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:187) ukládá zprávy do `content/novinky/2027/`, zatímco odesílač je má číst z webu. Publikační endpoint, index ani export do `public/` nejsou popsané. [package.json:7](/Users/imac/Github/stredniskoly/package.json:7) spouští pouze sitemapu a Next build. Next.js standardně veřejně obsluhuje statické soubory z `public`. [Dokumentace struktury projektu](https://nextjs.org/docs/app/getting-started/project-structure).

**Návrh řešení:** Definovat manifest zpráv, jeho publikaci a kontrolu dostupnosti po nasazení. Ke zprávě uložit verzi nebo otisk kalendáře a při změně vyžadovat nové schválení. N2 musí ověřit celý průchod schválení–nasazení–načtení, nikoli jen připravený PR a ukázkový e-mail.

**N12 — Kapacitní odhad ignoruje některé zprávy a rezervu pro portál**

**Dopad:** Tvrzení o více než 10 000 odběratelích a nulových dodatečných nákladech není doloženou provozní kapacitou.

**Důkaz:** [Návrh:171](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:171) počítá nejvýše tři e-maily měsíčně. Nový lednový odběratel ale může dostat potvrzení, uvítání, kritéria a přihlášky: čtyři zprávy. Pro 10 000 takových odběratelů je to **40 000**; dvě další zprávy sledování znamenají **60 000**, ještě bez portálu. Vstupy jsou na [řádcích 40–43](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:40) a [165](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165).

Hlavička `x-resend-monthly-quota` skutečně existuje, ale znamená **spotřebovanou**, nikoli zbývající kvótu. [Limity Resendu](https://resend.com/docs/api-reference/rate-limit).

**Návrh řešení:** Počítat obsahové i provozní zprávy, nové registrace a opakovaná potvrzení. Stanovit číselnou rezervu pro portál a společný rozpočet obou odesílačů; pouhé „nevyčerpat celou kvótu“ rezervu nezaručuje.

**N13 — Přejímka nepokrývá provozní selhání, dávky ani limity funkce**

**Dopad:** N1 a N2 mohou projít při funkční ukázce, ale bez ověření reálné rozesílky a detekce nedoručení.

**Důkaz:** [Návrh:234](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:234) ověřuje základní cyklus a bounce; N2 především ukázku a textové kontroly. [Webhook:169](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:169) neřeší `email.failed` a `email.delivery_delayed`, které Resend rozlišuje od bounce. Přijetí API požadavku není potvrzením doručení. [Události Resendu](https://resend.com/docs/webhooks/event-types).

Resend umožňuje [100 zpráv v dávce](https://resend.com/docs/api-reference/emails/send-batch-emails); výchozí limit API je sdílený mezi klíči týmu. Vercel má omezenou dobu běhu a velikost balíčku. [Limity funkcí](https://vercel.com/docs/functions/limitations). Velikost ani dobu běhu budoucí funkce nyní změřit nelze.

**Návrh řešení:** Doplnit test souběhu, pádu po přijetí dávky, `429`, obnovy, opožděného webhooku a odhlášení během rozesílky. Změřit balíček a průchod cílovým počtem příjemců, stránkovat databázi a respektovat `Retry-After`. Monitorovat také chybějící běh, stáří neodeslaných zpráv a selhání úklidu.

**N14 — Subdoména nezaručuje nedotčenou doručitelnost portálu**

**Dopad:** Návrh slibuje silnější izolaci, než lze doložit.

**Důkaz:** [Návrh:175](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:175) říká, že spamové stížnosti odkazy portálu „nezasáhnou“. Gmail některá hodnocení sleduje společně za hlavní doménu včetně subdomén. [Google Postmaster Tools](https://support.google.com/mail/answer/14668346?hl=en). Oddělená subdoména navíc nemění společnou kvótu Resendu, kterou sám návrh přiznává.

**Návrh řešení:** Psát, že subdoména riziko omezuje, nikoli odstraňuje. Doplnit sledování reputace, autentizace a možnost pozastavit plošné zprávy při zachování provozních e-mailů.

**N15 — Navržené měření nemá úplně definované vstupy**

**Dopad:** Výsledný poměr přihlášení a potvrzení může být zkreslený; návštěvy s `?zdroj=novinky` se nemusí objevit jako samostatná kampaň.

**Důkaz:** [Návrh:223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223) požaduje cíle a [řádek 225](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:225) poměr vůči odeslaným formulářům. API ale má odpovídat stejně i při odmítnutém požadavku; současné schéma eviduje potvrzené odběry a při odhlášení je maže. Není určeno, zda jmenovatel počítá kliknutí, platné žádosti, nebo skutečně odeslaná potvrzení.

`zdroj` není mezi standardními parametry kampaní Matoma; [layout.tsx:94](/Users/imac/Github/stredniskoly/src/app/layout.tsx:94) vlastní parametr nenastavuje. [Dokumentace parametrů Matoma](https://matomo.org/faq/how-to/faq_120/). Serverové přizpůsobení jsem neověřoval.

**Návrh řešení:** Definovat události a jmenovatele, deduplikaci a anonymní agregace odhlášení. Pro `zdroj` stanovit konfiguraci nebo konkrétní způsob reportování. Neposílat do analytiky adresy ani tokeny.

## Co návrh tvrdí správně (ověřeno)

**Kalendář skutečně obsahuje 20 událostí ve třech skupinách.** Všechny identifikátory použité u termínových zpráv existují. Výpočet ze [src/data/admissions-2027.json:11](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:11) a pravidel návrhu vyšel takto:

| E-mail | Odvození | Datum odeslání |
|---|---|---|
| Uvítání | potvrzení odběru, nikoli kalendář | okamžik potvrzení |
| Výběr školy | redakční sezónní termín | začátek prosince 2026; přesný den neurčen |
| Kritéria | 15. 1. minus 3 dny | **12. 1. 2027** |
| Přihlášky | 1. 2. minus 5 dní | **27. 1. 2027** |
| Připomínka přihlášek | 22. 2. minus 4 dny | **18. 2. 2027** |
| Nová nabídka oborů | publikované přepnutí registru | datum zatím neznámé |
| Školní a talentové zkoušky | 15. 3. minus 7 dní | **8. 3. 2027** |
| JPZ, čtyřleté obory | 12. 4. minus 10 dní | **2. 4. 2027** |
| JPZ, víceletá gymnázia | 14. 4. minus 10 dní | **4. 4. 2027** |
| Výsledky a 2. kolo | `ss-vysledky` | **14. 5. 2027** |
| Výsledky 2. kola | `k2-vysledky` | **22. 6. 2027** |
| Další kalendář | publikované přepnutí registru | datum zatím neznámé |

Z pevného plánu tedy připadá na leden dvojice zpráv a na únor jedna. Tvrzení „v únoru … po dvou až třech“ není vlastností samotného termínového plánu.

Dále je ověřeno:

- **Resend přes `fetch` a uvedený odesílatel existují:** [src/lib/portal-email.ts:7](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:7). To nedokazuje zakoupený tarif.
- **HMAC-SHA256, časově konstantní porovnání a expirace existují:** [src/lib/portal-magic.ts:32](/Users/imac/Github/stredniskoly/src/lib/portal-magic.ts:32). Testy prošly; jednorázovost mezi vlastnostmi není.
- **Honeypot, kontrola počtu odkazů a paměťové limity existují:** [bug-report/route.ts:14](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:14), [řádek 51](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:51), [řádek 189](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:189). Limity portálu rovněž používají `Map`.
- **Vercel Cron není v repozitářové konfiguraci:** [vercel.json:1](/Users/imac/Github/stredniskoly/vercel.json:1). Odběr, jeho generátor ani stránku zásad jsem v `src/`, `scripts/` a `public/` nenalezl.
- **`msmt-harmonogram` chybí v pracovním registru a existuje na určené větvi.** `git show feat/titulka-nabidka-oboru:public/stav_datovych_sad.json` ukázal na řádcích 761–779 období `2027` a obnovu `2027-09-30`. Větev také doplňuje zdroj do `docs/zdroje-dat.md`; N0 tuto závislost nezamlčuje.
- **Práce se zdroji a slovníky je v principu správně navržená:** [oddíl 8:199](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:199) zdůvodňuje použití i zamítnutí zdrojů, nové celostátní počty podmiňuje zápisem do slovníku a nové pojmy plánuje ve stejné dávce jako formuláře. Není důvod vytýkat samotnou nepřítomnost dosud nezavedených pojmů.
- **Primární klíče nových tabulek zajišťují i nepřípustnost NULL v klíčových sloupcích.** Chybějící explicitní `NOT NULL` u těchto sloupců tedy není vadou schématu.
- **Hranice 15 let je v českém kontextu uvedena správně:** potvrzuje ji [základní příručka ÚOOÚ](https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju). Sama ale nedokazuje skutečný věk ani rodičovské oprávnění.
- **Možnosti služeb jsou převážně popsané správně:** Resend dokumentuje výchozí vypnutí měření [na úrovni domény](https://resend.com/docs/dashboard/domains/tracking), Pro nabízí [50 000 e-mailů měsíčně](https://resend.com/pricing), WAF Pro má uvedená omezení klíčů a časového okna. **Webhook bounce a stížností v návrhu nechybí**; je výslovně součástí N1.

## Neověřitelné

Následující tvrzení nepovažuji za blokační zjištění:

- **Skutečný tarif a zbývající kvóta Resendu, tarif Vercelu a zapnutí konkrétních funkcí.** Kód ani veřejný ceník nepotvrzují stav účtu.
- **Skutečné vypnutí měření na odesílací doméně.** Výchozí nastavení služby není důkaz aktuální konfigurace; tvrzení oddílu 2 má být do kontroly API označené jako neověřené.
- **Produkční cookies, anonymizace, retenční nastavení a vlastní konfigurace Matoma.** Ověřil jsem vložený kód, nikoli administraci ani provoz prohlížeče.
- **Zpoždění GitHub cronu „o hodiny“ v tomto projektu.** Workflow potvrzuje plánování, ale ne skutečná zpoždění jednotlivých běhů.
- **Smlouvy se zpracovateli, regiony databáze, zahraniční předání a právní kvalifikace konkrétního obsahu rozesílky.** Název „transakční e-mail“ v ceníku sám neurčuje právní režim.
- **Budoucí velikost a výkon funkce, dosažitelnost termínů N0–N3 a viditelnost formuláře bez posouvání na telefonu.** Chybí implementace, měření a kapacitní podklady; nelze poctivě tvrdit, že jsou nereálné.
- **Budoucí skutečné datum vydání a převzetí dat.** Hodnoty `ocekavano` označené `odhad` nejsou příslib publikace. Výše uvedená přesná data odeslání jsou výpočtem proti dodanému kalendáři, nikoli nezávislým potvrzením budoucí neměnnosti harmonogramu.

---

# Kolo 2 (k verzi 1.2)

## Metoda
Posuzoval jsem pracovní verzi 1.2 proti uložené oponentuře, včetně SQL schématu, průběhu operací a přejímacích podmínek. **ODSTRANĚNO znamená odstraněno v návrhu, nikoli ověřeno implementací**: dokument výslovně uvádí, že implementace neexistuje ([návrh:3](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:3)).
Tvrzení o projektu jsem kontroloval v `src/`, `scripts/`, `public/`, `package.json`, `vercel.json` a `next.config.ts`; návazné větve jsem četl přes `git show`. Ověřil jsem také aktuální dokumentaci PostgreSQL, Next.js, Resendu a Vercelu.
Kontroly:
- `node --experimental-strip-types --test tests/portal-magic.test.mjs` → **11 testů prošlo, 0 selhalo**.
- Obě funkce z `tests/test_admissions_calendar.py`, spuštěné přes Python s `-B` a `runpy`, → **PASS**.
- Výpočet přímo z JSON potvrdil **20 událostí, tři skupiny, poslední událost 22. 6. 2027** a uvedené předstihy termínových zpráv.
Neověřené zůstávají skutečné tarify, nastavení služeb, produkční analytika a výkon budoucí funkce; nepoužívám je jako blokační důkazy. Dvakrát denní cron například závisí na tarifu: Hobby takovou frekvenci nepovoluje, skutečný tarif projektu však doložen není. [Dokumentace Vercelu](https://vercel.com/docs/cron-jobs/manage-cron-jobs#cron-jobs-accuracy).
Do souborů repozitáře jsem nic nezapisoval.
## Stav bodů z kola 1
| bod | stav | důkaz |
|---|---|---|
| B1 | ODSTRANĚNO | Souhlas je povinný i v patičce, GET odběr nezakládá a vznik odběru je vyhrazen POST ([návrh:113](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:113), [návrh:222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222)). |
| B2 | ODSTRANĚNO | Unikátní `jti` se spotřebuje ve stejné transakci jako založení odběru a jeho záznam přežije odhlášení do expirace tokenu ([návrh:175](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:175), [návrh:223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223)). |
| B3 | ČÁSTEČNĚ | Rezervace a zastavení neurčitých pokusů přibyly, ale schéma nezajišťuje jedinou rezervaci příjemce a neuchovává neměnný požadavek pro Resend; podrobně C1 a C2 ([návrh:181](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:181), [návrh:227](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:227)). |
| B4 | ODSTRANĚNO | Výběr zahrnuje neodeslané splatné zprávy až do jejich konce užitečnosti, takže samotné překročení původního dne odeslání zprávu nevyřadí ([návrh:225](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:225)). |
| B5 | ODSTRANĚNO | Blokování podle IP, limit adresy a denní rozpočet jsou výslovnou podmínkou N1 včetně přejímky překročení limitů ([návrh:220](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:220), [návrh:311](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:311)). |
| B6 | ODSTRANĚNO | Odhlášení ruší konkrétní účel, smazání identity je podmíněné absencí dalších účelů a společná implementace má tuto vlastnost ověřit v N4 ([návrh:216](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:216), [návrh:314](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:314)). |
| N1 | ODSTRANĚNO | Návrh nově zakazuje měření tokenových stránek, požaduje odstranění tokenu z URL a redukci adres v logování ([návrh:222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222), [návrh:301](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:301)). |
| N2 | ODSTRANĚNO | N0 vyžaduje rozhodnutí o režimu analytiky, kontrolu v prohlížeči a fungování odběru při odmítnuté analytice ([návrh:310](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:310)). |
| N3 | ČÁSTEČNĚ | Verze souhlasu a výkon práv jsou doplněné, avšak doklad uložený v mazaném odběru nemá samostatné úložiště pro slíbené uchování; viz C4 ([návrh:130](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:130), [návrh:155](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:155), [návrh:215](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:215)). |
| N4 | ČÁSTEČNĚ | Retence a HMAC jsou upřesněné, ale staré vypořádání S3 stále slibuje smazání adresy do 30 dnů, zatímco nové pravidlo drží identitu kvůli dokladům souhlasu ([návrh:215](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:215), [návrh:216](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:216), [návrh:338](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:338)). |
| N5 | ČÁSTEČNĚ | Cílový ročník, maximální čekání a platnost výzvy přibyly, ale odstranění splněného požadavku po úspěšném potvrzení nového odběru není určeno ([návrh:117](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:117), [návrh:165](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:165)). |
| N6 | ODSTRANĚNO | Formulář dovoluje oba segmenty, klíč odběru obsahuje druh studia, společné zprávy se deduplikují a identifikátor zprávy obsahuje ročník ([návrh:114](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:114), [návrh:162](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:162), [návrh:213](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:213)). |
| N7 | ODSTRANĚNO | Kontrakt uvádí přesné hlavičky, DKIM, POST bez cookies a přesměrování, bezpečný GET a omezení na konkrétní účel ([návrh:231](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:231)). |
| N8 | ČÁSTEČNĚ | Druhy spouštěčů, termíny druhého kola a závislosti JPZ jsou opravené, ale prosincové datum v tabulce odporuje pravidlu roku redakčního spouštěče; viz D1 ([návrh:46](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:46), [návrh:246](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:246), [návrh:262](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:262)). |
| N9 | ČÁSTEČNĚ | Sezóna i závislost na importéru jsou doplněné, ale S7 stále zahrnuje samostatné oznamování pásem a označuje květen za dobu mimo sezónu ([návrh:16](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:16), [návrh:313](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:313), [návrh:342](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:342)). |
| N10 | ODSTRANĚNO | Návrh přiznává pevný rok generátoru a vyžaduje zkoušku přechodu formuláře, zpráv, odkazů i ICS před skutečným přepnutím ([návrh:268](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:268); pevný vstup potvrzuje [generátor:37](/Users/imac/Github/stredniskoly/scripts/generate-admissions-calendar.py:37)). |
| N11 | ODSTRANĚNO | Publikace manifestu i zpráv v `public/`, kontrola dostupnosti a nové schválení při změně kalendáře jsou nyní součástí postupu ([návrh:257](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:257), [návrh:264](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:264)). |
| N12 | ČÁSTEČNĚ | Výpočet čtyř zpráv a význam hlavičky jsou opravené, ale rezervu kontroluje jen dávkový odesílač, zatímco potvrzení a uvítání mají vlastní cestu; viz D4 ([návrh:220](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:220), [návrh:223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223), [návrh:233](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:233)). |
| N13 | ČÁSTEČNĚ | Přejímka výrazně pokročila, ale oproti tvrzení vypořádání neobsahuje zkoušku opožděného webhooku a dohled neobsahuje selhání retenčního úklidu ([návrh:312](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:312), [návrh:318](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:318), [návrh:385](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:385)). |
| N14 | ODSTRANĚNO | Absolutní slib izolace reputace nahradilo omezení rizika, autentizace domény, dohled a možnost pozastavení plošných zpráv ([návrh:239](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:239)). |
| N15 | ČÁSTEČNĚ | Události, jmenovatel i kampaň jsou definované, ale chybí pravidlo deduplikace opakovaných žádostí a započítání dvou segmentů potvrzených jednou akcí ([návrh:220](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:220), [návrh:297](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:297)). |
## Nové blokační problémy
**C1 — Rezervace dávky nerezervuje jednoznačně zprávu pro příjemce**
**Dopad:** Nově zvolený mechanismus stále připouští zařazení stejného příjemce do dvou různých dávek s různými klíči idempotence; výsledkem mohou být dvě zprávy.
**Důkaz:** `davka` má jedinečnost pouze pro `id`, `idempotency_key` a `(zprava, cislo)`, příjemci jsou obyčejné pole UUID ([návrh:181](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:181)). Dávky se stejnou zprávou a příjemcem, ale s čísly 1 a 2, tedy splní všechna uvedená omezení. Jedinečnost `(odberatel_id, zprava)` nastává až v tabulce zapisované **po odeslání** ([návrh:194](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:194), [návrh:229](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:229)). Zámek dávky nebrání překryvu členů různých dávek; samotný řádkový zámek navíc trvá jen do konce transakce. [PostgreSQL: řádkové zámky](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS).
**Návrh řešení:** Před prvním vzdáleným voláním atomicky vytvořit položku odeslání s unikátním `(odberatel_id, zprava)` a vazbou na dávku; rezervovat jen dosud nepřidělené položky a přesně určit transakci přidělení práce i obnovu po pádu.
**C2 — Neměnní příjemci nezaručují neměnný požadavek**
**Dopad:** Obnovení dávky po nasazení upraveného e-mailu může skončit `409` a zablokovat doručení.
**Důkaz:** Dávka uchovává UUID příjemců, ale žádný obsah, jeho verzi ani úplný požadavek ([návrh:181](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:181)). Odesílač čte aktuální veřejný manifest a dokument z neměnného složení dávky nesprávně odvozuje totožnost obsahu ([návrh:225](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:225), [návrh:227](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:227)). Stačí mezi pokusy upravit text `kriteria.json` bez změny kalendáře: kontrolní otisk projde, klíč zůstane stejný, tělo požadavku se změní. Resend tento případ výslovně odmítá jako `invalid_idempotent_request`. [Dokumentace idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys#possible-responses).
**Návrh řešení:** Před prvním pokusem uložit úplný, uspořádaný a personalizovaný požadavek nebo jeho přesně reprodukovatelnou neměnnou podobu; opakovat stejné bajty pod stejným klíčem. Veřejné šablony verzovat podle obsahu, soukromé údaje a tokeny držet mimo `public/`.
**C3 — Neměnná dávka odporuje odhlášení během čekání**
**Dopad:** Člověk se může úspěšně odhlásit a přesto dostat dosud nepředanou zprávu z již rezervované dávky.
**Důkaz:** Po rezervaci se složení dávky nesmí měnit a následuje odeslání bez popsané kontroly aktuálního odběru ([návrh:227](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:227)). Odhlášení ruší odběr, ale nemá žádnou operaci nad rezervovanými dávkami ([návrh:231](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:231)); identita s adresou může dále existovat kvůli jinému účelu či dokladům ([návrh:216](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:216)). Scénář „rezervace → odhlášení → první odeslání“ proto popsaný postup neřeší. Pouhé zařazení testu do N2 tento rozpor neodstraňuje.
**Návrh řešení:** Určit hranici, do které lze odeslání zrušit, a odhlášením rušit nepředané položky fronty. Rozlišit dosud nevolané dávky od pokusů s neurčitým výsledkem; u neurčitých pokusů nejprve zjistit výsledek, nikoli změnit obsah pod použitým klíčem.
**C4 — Tříletý doklad souhlasu nemá kam přežít smazání odběru**
**Dopad:** Implementace podle uvedeného schématu musí buď ztratit slíbený doklad, nebo ponechat řádek, který nadále představuje aktivní odběr.
**Důkaz:** Verze souhlasu a čas jsou přímo v `odber_novinek`; samostatný doklad ani stav ukončeného odběru schéma neobsahuje ([návrh:155](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:155)). Současně se požaduje uchování dokladu tři roky po zániku odběru ([návrh:215](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:215)) a výslovně se říká, že se odběr při odhlášení maže ([návrh:299](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:299)). Uchování samotného `odberatel` chybějící doklad nenahradí.
**Návrh řešení:** Oddělit aktivní odběr od dokladu souhlasu, zaznamenat zánik účelu a termín odstranění dokladu; ukončení odběru a zachování dokladu provést atomicky. Doplnit retenční úklid a jeho přejímku. Zde hodnotím rozpor datového modelu, nikoli právní přiměřenost tříleté lhůty.
## Nové nikoli blokační
**D1 — Redakční spouštěč posouvá prosincový e-mail do nesprávného roku**
**Dopad:** Generátor podle obecného pravidla nenaplánuje slíbený prosinec 2026.
**Důkaz:** Tabulka stanoví **7. 12. 2026** ([návrh:46](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:46)), ale šablona používá `datum: 12-07` „v roce odběru“ ([návrh:246](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:246)); ročník přijímaček je přitom definován jako rok nástupu, tedy 2027 ([návrh:293](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:293)).
**Návrh řešení:** Zavést explicitní posun roku vůči ročníku, například `rok_posun: -1`, a přejímkou ověřit výsledné datum.
**D2 — Dvoukrokové potvrzení nemá dokončené předání autorizace**
**Dopad:** Není určeno, z čeho POST bezpečně získá ověřené údaje po odstranění tokenu z URL.
**Důkaz:** Jeden odstavec odstraňuje token až po potvrzení, druhý již při GET; POST popisuje databázové změny, ale neurčuje předání ověřeného tokenu či relace a opětovnou kontrolu expirace ([návrh:116](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:116), [návrh:222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222)). Projekt přitom má použitelný vzor výměny tokenu za HttpOnly cookie a přesměrování ([admin/auth/route.ts:19](/Users/imac/Github/stredniskoly/src/app/admin/auth/route.ts:19)). Běžný překlad na `page.tsx` a `route.ts` se stejnou cestou navíc Next.js nepovoluje. [Dokumentace Next.js](https://nextjs.org/docs/app/getting-started/route-handlers#route-resolution).
**Návrh řešení:** Určit konkrétní variantu: vstupní handler → krátká relace → čistá stránka → oddělené POST API, případně Server Action; při POST znovu ověřit platnost a vazbu všech potvrzovaných údajů. Nejde o prokázané obejití autorizace, implementace zatím není.
**D3 — Spotřebovaný token nezaručuje odeslání uvítání**
**Dopad:** Pád po potvrzovací transakci a před odesláním uvítání ponechá aktivní odběr bez uvítací zprávy; opakování odkazu už tento krok neobnoví.
**Důkaz:** Uvítání se odesílá až po úspěšné transakci, konflikt `jti` další uvítání zakazuje a transakce neukládá úlohu jeho odeslání ([návrh:223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223)). Rezervace dávek je popsána samostatně až u cronu ([návrh:224](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:224)).
**Návrh řešení:** Ve stejné transakci založit jedinečnou úlohu uvítání; její odeslání a obnovu svěřit společné frontě.
**D4 — Rezerva 5 000 zpráv není společným rozpočtem**
**Dopad:** Potvrzení a uvítání mohou spotřebovat kapacitu ponechanou portálu, přestože dávkový odesílač svou kontrolou projde.
**Důkaz:** Rezervu kontroluje odesílač před dávkami ([návrh:233](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:233)); přihlašovací endpoint má pouze denní rozpočet a uvítání následuje vlastní cestou ([návrh:220](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:220), [návrh:223](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:223)). Existující portál také volá Resend přímo, bez společné evidence rozpočtu ([portal-email.ts:16](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:16)). Hlavička spotřeby je informace, nikoli rezervace budoucích odeslání. [Limity Resendu](https://resend.com/docs/api-reference/rate-limit#email-quotas).
**Návrh řešení:** Zavést společné atomické účtování a rezervace pro obsahové zprávy, potvrzení i uvítání; oddělit rozpočet portálu a započítávat také neuzavřené pokusy.
**D5 — Osmnáctiměsíční čekání a třicetidenní výzva nemají určené pořadí**
**Dopad:** Výzva odeslaná těsně před koncem maximálního čekání nemusí nabídnout slíbených 30 dnů, případně odkaz zůstane platný po odstranění čekajícího požadavku.
**Důkaz:** Text současně slibuje automatické smazání po 18 měsících a odkaz platný 30 dnů po vydání kalendáře ([návrh:117](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:117)); `ceka_nejdele` je pevně `potvrzeno + 18 měsíců` a schéma obsahuje pouze čas odeslání výzvy ([návrh:170](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:170)).
**Návrh řešení:** Oddělit stav čekání od stavu odeslané výzvy, určit rozhodující expiraci a při úspěšném potvrzení jednorázový požadavek uzavřít.
**D6 — Květnová zpráva ztrácí „užitečnost“ před začátkem přihlášek**
**Dopad:** Výpadek do 18. května způsobí definitivní zahození hlavní zprávy o druhém kole, přestože její nejdůležitější navazující lhůta ještě nezačala.
**Důkaz:** Konec užitečnosti je 18. 5. ([návrh:62](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:62)), obsah má vysvětlit přihlášky do druhého kola ([návrh:54](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:54)) a skutečný projektový kalendář uvádí podávání **19.–24. 5.** ([admissions-2027.json:42](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:42)).
**Návrh řešení:** Připravit obsah použitelný až do konce podávání nebo samostatnou zprávu k jeho začátku; nezaměňovat konec zveřejňování kritérií s koncem užitečnosti pokynů k přihlášce.
## Celkový verdikt
**zbývají blokační problémy**: **B3**, rozvedený v **C1 a C2**, dále **C3 — odhlášení rezervovaných příjemců** a **C4 — uchování dokladu souhlasu po smazání odběru**.
tokens used

---

# Kolo 3 (k verzi 1.3)

## Metoda

Posuzoval jsem pracovní verzi **1.3** proti uloženému kolu 2, zejména proti jeho [závěru]( /Users/imac/Github/stredniskoly/docs/podklady/oponentura-codex-novinky-2027.md:376). **ODSTRANĚNO znamená odstraněno v návrhu.** Neznamená to ověřenou implementaci.

Přečetl jsem celý návrh včetně oddílů 12–14, relevantní kód, konfiguraci, kalendář a navazující schéma sledování přes `git show`. Projekt používá [Next.js 16.1.4](/Users/imac/Github/stredniskoly/package.json:22), [Vercel konfigurace zatím cron neobsahuje](/Users/imac/Github/stredniskoly/vercel.json:1) a [portál volá Resend přímo](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:16). Technické vlastnosti služeb jsem ověřil v jejich oficiální dokumentaci.

Spuštěné kontroly:

- `node --experimental-strip-types --test tests/portal-magic.test.mjs` → **11 prošlo, 0 selhalo**.
- `python3 -B -c 'import runpy; d=runpy.run_path("tests/test_admissions_calendar.py"); [(f(),print(k,"PASS")) for k,f in d.items() if k.startswith("test_")]'` → **oba testy PASS**.
- Výpočet nad `src/data/admissions-2027.json` → **20 událostí, 3 skupiny, poslední událost 22. 6. 2027**; `rok_posun: -1` pro prosincovou zprávu dává **7. 12. 2026**.

Souběhy a pády níže jsou protipříklady k popsanému algoritmu, nikoli výsledky testování dosud neexistujícího odesílače. **Neověřené** zůstávají produkční tarify, nastavení účtů, právní dokumentace a výkon budoucí funkce; nejsou podkladem blokačních závěrů. Do souborů repozitáře jsem nic nezapisoval.

## Stav bodů z kol 1 a 2

| bod | stav | důkaz |
|---|---|---|
| B3 | ČÁSTEČNĚ | Fronta a uložené tělo přibyly, ale obnova po pádu a změna klíče po prvním pokusu stále nezaručují jediné odeslání; viz E2–E4 a [novinky-k-prijimackam-2027.md:267](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:267), [novinky-k-prijimackam-2027.md:309](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:309). |
| C1 | ČÁSTEČNĚ | Primární klíč a zamykání řeší překryv běžných rezervací, ale postup neurčuje bezpečné potvrzení rezervace před vzdáleným účinkem; viz E2 a [novinky-k-prijimackam-2027.md:222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222), [novinky-k-prijimackam-2027.md:269](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:269). |
| C2 | ČÁSTEČNĚ | Úplné tělo se ukládá, ale oprava textu po prvním pokusu výslovně zakládá nový pokus s novým klíčem, což odporuje neměnnosti rozpracovaného odeslání; viz E4 a [novinky-k-prijimackam-2027.md:268](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:268), [novinky-k-prijimackam-2027.md:309](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:309). |
| C3 | ČÁSTEČNĚ | Kontrola odběru a rušení položek přibyly, ale `rezervovana` označuje i dávku po odeslání bez odpovědi, jejíž položky odhlášení stále maže; viz E2 a [novinky-k-prijimackam-2027.md:271](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:271), [novinky-k-prijimackam-2027.md:272](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:272). |
| C4 | ODSTRANĚNO | Samostatný doklad přežívá odstranění odběru a zánik účelu se zapisuje při odhlášení ve stejné transakci — [novinky-k-prijimackam-2027.md:173](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:173), [novinky-k-prijimackam-2027.md:272](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:272). |
| N3 | ODSTRANĚNO | Návrh již určuje samostatný doklad, historické znění souhlasu, informační povinnost a postup výkonu práv — [novinky-k-prijimackam-2027.md:131](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:131). |
| N4 | ČÁSTEČNĚ | S3 je opravené, ale slib neukládání před potvrzením odporuje nové frontě a tvrzení „jen otisk“ ponechané identitě; viz E1, F3 a [novinky-k-prijimackam-2027.md:256](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:256), [novinky-k-prijimackam-2027.md:262](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:262). |
| N5 | ODSTRANĚNO | Je určena maximální doba čekání, přednost nové třicetidenní lhůty i odstranění splněného požadavku — [novinky-k-prijimackam-2027.md:118](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:118), [novinky-k-prijimackam-2027.md:186](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:186). |
| N8 | ODSTRANĚNO | Čtyři spouštěče, závislosti JPZ, text druhého kola a nyní i posun prosincového roku jsou sjednocené — [novinky-k-prijimackam-2027.md:53](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:53), [novinky-k-prijimackam-2027.md:304](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:304). |
| N9 | ODSTRANĚNO | S7 nyní výslovně řadí květen do sezóny a jarní importér je uveden jako závislost N3 — [novinky-k-prijimackam-2027.md:387](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:387), [novinky-k-prijimackam-2027.md:357](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:357). |
| N12 | ČÁSTEČNĚ | Kapacitní výpočet a společná cesta jsou opravené, ale kontrola rozpočtu stále nerezervuje kapacitu rozpracovaných dávek; viz E5 a [novinky-k-prijimackam-2027.md:270](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:270), [novinky-k-prijimackam-2027.md:274](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:274). |
| N13 | ODSTRANĚNO | Přejímka výslovně zahrnuje dřívější příchod webhooku a dohled selhání retenčního úklidu — [novinky-k-prijimackam-2027.md:356](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:356), [novinky-k-prijimackam-2027.md:362](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:362). |
| N15 | ODSTRANĚNO | Doplněna je deduplikace žádostí za 24 hodin i jediné započítání potvrzení dvou segmentů — [novinky-k-prijimackam-2027.md:343](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:343). |
| D1 | ODSTRANĚNO | Povinný `rok_posun: -1` jednoznačně převádí prosincovou zprávu ročníku 2027 na rok 2026 — [novinky-k-prijimackam-2027.md:287](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:287), [novinky-k-prijimackam-2027.md:304](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:304). |
| D2 | ODSTRANĚNO | Oddělený handler předává autorizaci cookie a POST ji znovu kontroluje, přičemž odpovídající vzor v projektu existuje — [novinky-k-prijimackam-2027.md:263](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:263), [src/app/admin/auth/route.ts:19](/Users/imac/Github/stredniskoly/src/app/admin/auth/route.ts:19). |
| D3 | ODSTRANĚNO | Úloha uvítání vzniká atomicky se spotřebováním tokenu a založením odběru — [novinky-k-prijimackam-2027.md:264](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:264). |
| D4 | ČÁSTEČNĚ | Potvrzení a uvítání již sdílejí frontu, ale účtování až po odpovědi nezajišťuje společnou rezervaci kvóty; viz E5 a [novinky-k-prijimackam-2027.md:270](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:270). |
| D5 | ODSTRANĚNO | Lhůta se řídí stavem a přechod do `vyzvan` zakládá celých dalších 30 dnů — [novinky-k-prijimackam-2027.md:118](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:118), [novinky-k-prijimackam-2027.md:191](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:191). |
| D6 | ODSTRANĚNO | Konec užitečnosti byl posunut na 23. května, tedy dovnitř období přihlášek 19.–24. května — [novinky-k-prijimackam-2027.md:63](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:63), [src/data/admissions-2027.json:42](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:42). |

## Nové blokační problémy

**E1 — Potvrzovací e-mail nelze zařadit a odeslat podle společného modelu**

**Dopad:** První přihlášení nové adresy nemá proveditelnou cestu k potvrzovacímu e-mailu.

**Důkaz:** [novinky-k-prijimackam-2027.md:262](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:262) současně požaduje frontu a tvrdí, že před potvrzením se kromě otisku nic neukládá. Fronta ale vyžaduje existujícího `odberatel` přes cizí klíč a neprázdný primární klíč ([řádek 213](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:213), [řádek 222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222)); úplné tělo obsahující adresu a token se rovněž ukládá. Navíc [řádek 269](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:269) před odesláním každému příjemci kontroluje platný odběr, který u prvního potvrzení ještě neexistuje.

**Návrh řešení:** Rozlišit příjemce, žádost o potvrzení a aktivní odběr. Umožnit ve frontě nepotvrzeného příjemce s konkrétní žádostí `jti`, určit její krátkou retenci a opravit slib ukládání. Podmínky odeslání rozlišovat podle účelu: potvrzení ověřuje platnou žádost, obsahová zpráva aktivní odběr, výzva ke kalendáři odpovídající čekající požadavek.

**E2 — Chybí trvalá hranice předání a stav `rezervovana` znamená dvě neslučitelné věci**

**Dopad:** Pád může ztratit záznam již provedeného odeslání; odhlášení může odstranit položku, která už byla předána Resendu.

**Důkaz:** Rezervace, sestavení těla a kontrola před odesláním jsou popsány na [novinky-k-prijimackam-2027.md:267](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:267), přičemž [řádek 269](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:269) mluví stále o téže transakci. Chybí explicitní potvrzení trvalé rezervace před HTTP voláním. Při jediné transakci přes odeslání scénář „Resend přijme → proces spadne před COMMIT“ vrátí databázi před rezervaci; tvrzení [řádku 271](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:271), že dávka zůstane rezervovaná, pak neplatí. To plyne z [transakčního chování PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html).

I při samostatně potvrzené rezervaci zůstává přímý rozpor: po timeoutu je dávka podle řádku 271 stále `rezervovana`, zatímco [odhlášení na řádku 272](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:272) rezervované položky maže. Výjimka pro `neurcita` začne platit až po dalším běhu.

**Návrh řešení:** Přesně vymezit transakce a přechody stavů. Před HTTP voláním musí být trvale uložené tělo, klíč a informace, že odeslání již mohlo začít. Odhlášení a zahájení předávání musí používat společnou atomickou hranici; pokus s možným vzdáleným účinkem se nesmí smazat jako dosud nepředaná práce.

Neon takový postup umožňuje, ale pro interaktivní transakce je nutný odpovídající způsob připojení: HTTP `transaction()` je neinteraktivní, `Pool`/`Client` poskytují interaktivní transakce. [Dokumentace ovladače Neon](https://github.com/neondatabase/serverless#sessions-transactions-and-node-postgres-compatibility).

**E3 — Obnova předpokládá nedostupný dotaz podle klíče idempotence**

**Dopad:** Automatická obnova po ztracené odpovědi nemůže provést svůj předepsaný krok a běžný timeout končí ručním řešením.

**Důkaz:** [novinky-k-prijimackam-2027.md:271](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:271) vyžaduje dotaz na e-mail podle klíče idempotence. Dokumentované [načtení e-mailu](https://resend.com/docs/api-reference/emails/retrieve-email) však vyžaduje `email_id`; [seznam e-mailů](https://resend.com/docs/api-reference/emails/list-emails) slíbený lookup podle idempotency key neposkytuje. Resend dokumentuje obnovení původní odpovědi **opakováním stejného POST se stejným klíčem**, nikoli samostatným stavovým dotazem. [Idempotence Resendu](https://resend.com/docs/dashboard/emails/idempotency-keys).

**Návrh řešení:** Popsat obnovu skutečně podporovanými operacemi: uložené `email_id`, spolehlivě korelované webhooky nebo opakování nezměněného požadavku v platném okně idempotence. Poslední možnost může zprávu skutečně odeslat, pokud první pokus neprošel; u mezitím odhlášeného příjemce ji proto nelze vydávat za pouhé zjištění stavu.

**E4 — Změna klíče po prvním pokusu odstraňuje ochranu před duplicitou**

**Dopad:** Příjemce může dostat původní i opravenou verzi téže zprávy.

**Důkaz:** [novinky-k-prijimackam-2027.md:309](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:309) výslovně říká, že oprava textu **po prvním pokusu** založí nový pokus s novým klíčem. Není to omezeno na prokazatelně nepřijatý požadavek. Protipříklad: první tělo Resend přijme, odpověď se ztratí, text se opraví a nové tělo dostane nový klíč. Ochrana původního klíče druhé odeslání nepokrývá. To zároveň odporuje pravidlu nejprve vyřešit neznámý výsledek na [řádku 271](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:271). [Dokumentace Resendu](https://resend.com/docs/dashboard/emails/idempotency-keys) váže deduplikaci na opakování stejného požadavku pod stejným klíčem.

**Návrh řešení:** Tělo a klíč zmrazit od prvního možného předání. Přeskládání příjemců a změnu klíče povolit pouze před touto hranicí. Opravu již odeslané zprávy případně vést jako samostatnou, výslovně schválenou zprávu s jiným identifikátorem.

**E5 — Rozpočet eviduje hotová odeslání, ale nerezervuje kapacitu**

**Dopad:** Souběžné dávky mohou překročit stanovený limit a spotřebovat rezervu portálu; neurčité pokusy spotřebu podhodnocují.

**Důkaz:** Kontrola probíhá před rezervací ([novinky-k-prijimackam-2027.md:274](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:274)), navýšení až po odpovědi ([řádek 270](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:270)). Tabulka obsahuje pouze měsíční počet podle účelu ([řádek 236](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:236)).

Protipříklad k tomuto pořadí: při limitu novinek 45 000 a spotřebě 44 900 projdou dvě souběžné dávky po 100 obě kontrolou; výsledkem je 45 100. `SKIP LOCKED` nad odlišnými položkami fronty sdílený rozpočet nezamyká. Denní rozpočet potvrzení navíc [řádek 261](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:261) odvozuje z tabulky, která den vůbec nerozlišuje.

**Návrh řešení:** Atomicky kontrolovat a rezervovat kapacitu před odesláním, evidovat rezervované i spotřebované počty a rezervaci u neurčitého pokusu neuvolňovat. Denní limit musí mít samostatně definované období a účtování. Portál i hlášení chyb dnes rozpočet obcházejí, což potvrzuje [portal-email.ts:16](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:16) a [bug-report/route.ts:80](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:80).

**E6 — Již naplněná fronta obchází konec užitečnosti**

**Dopad:** Odesílač může poslat připomínku přihlášek po uzávěrce.

**Důkaz:** Konec užitečnosti se kontroluje při **naplnění** fronty ([novinky-k-prijimackam-2027.md:266](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:266)). Rezervace vybírá již existující položky `ceka` bez této podmínky ([řádek 267](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:267)); poslední kontrola ověřuje pouze odběr ([řádek 269](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:269)).

Položka připomínky může být vložena 22. února, zůstat čekat kvůli kvótě a být vybrána 23. února. Zákaz nového naplnění ji neodstraní. Návrh přitom stanoví konec užitečnosti na [22. 2. 2027](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:63), shodně s [koncem přihlášek v datech](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:12).

**Návrh řešení:** Platnost zprávy ověřovat také při rezervaci a před prvním předáním. Expirované nepředané položky uzavřít jako neodesílatelné. Stejnou kontrolou pokrýt změnu kalendáře u již připravených položek; pokusy s neznámým výsledkem řešit odděleně.

## Nové nikoli blokační

**F1 — Schéma nemá dokončený kontrakt vytvoření a vyprázdnění dávky**

**Dopad:** Doslovný převod návrhu do SQL vyžaduje dodatečná rozhodnutí, jinak může selhat vytvoření či uzavření dávky.

**Důkaz:** [novinky-k-prijimackam-2027.md:267](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:267) vytváří dávku před sestavením těla, ale tělo, otisk a klíč jsou [povinné bez výchozí hodnoty](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:228). Při uzavření se tělo má smazat, přestože je `NOT NULL`; řádek má přitom zůstat 12 měsíců ([řádek 255](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:255)). Nastavení SQL `NULL` by porušilo [omezení PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-NOT-NULL); nahrazení prázdným JSON návrh neurčuje. Také `polozka_odeslani` odkazuje na `davka` před jejím vytvořením.

**Návrh řešení:** Sestavit tělo před vložením dávky, určit reprezentaci odstraněného těla a podmínky podle stavu; tabulky vytvořit v pořadí závislostí nebo FK přidat následně.

**F2 — `jsonb` samo nezaručuje opakování stejných bajtů**

**Dopad:** Není jednoznačně určeno, nad čím se počítá otisk a jak se reprodukuje původní HTTP tělo.

**Důkaz:** Návrh ukládá [`jsonb`](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:230), ale slibuje [stejné bajty](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:268). PostgreSQL u `jsonb` nezachovává původní mezery ani pořadí klíčů. [Dokumentace JSON typů](https://www.postgresql.org/docs/current/datatype-json.html). Zda konkrétní rozdíl serializace vyvolá u Resendu `409`, je **neověřené**.

**Návrh řešení:** Ukládat finální serializované tělo jako text, případně přesně definovat kanonickou serializaci používanou při prvním i každém dalším pokusu.

**F3 — Doklad s otiskem stále drží celou identitu s adresou**

**Dopad:** Retenční vysvětlení může vyvolat nesprávný dojem, že po skončení odběru zůstává pouze otisk.

**Důkaz:** [novinky-k-prijimackam-2027.md:175](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:175) ponechává FK na odběratele a [řádek 256](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:256) výslovně odkládá smazání identity do skončení retence dokladu. Převzatý `odberatel` obsahuje `email text not null unique`, ověřeno příkazem:

```text
git show docs/sledovani-skol-a-oboru:docs/sledovani-skol-2027.md | nl -ba
192 create table odberatel (
194   email text not null unique,
```

Chybějící `ON DELETE CASCADE` znamená výchozí `NO ACTION`, nikoli automatické odpojení dokladu. [PostgreSQL: cizí klíče](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK).

**Návrh řešení:** Buď pravdivě popsat uchování celé identity, nebo po skončení všech aktivních účelů vazbu dokladu odpojit a identitu smazat. Původní C4 je přesto odstraněný: doklad již má vlastní úložiště.

**F4 — Adresa není jednoznačná náhrada za chybějící `resend_id`**

**Dopad:** Dříve doručený webhook může být přiřazen nesprávné zprávě nebo jeho stav později přepsán.

**Důkaz:** [novinky-k-prijimackam-2027.md:273](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:273) řeší webhook před zápisem odpovědi párováním podle adresy. Fronta ale dovoluje jedné adrese více různých zpráv a `resend_id` dostávají až při uzavření ([řádek 222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222), [řádek 270](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:270)). Adresa například nerozliší souběžné uvítání a kritéria; trvalé uložení dosud nespárované události popsané není.

**Návrh řešení:** Ukládat webhooky idempotentně podle identifikátoru události a nepřiřazené události později spojit přes `resend_id`; případně přenášet vlastní identifikátor položky pomocí podporovaných [tagů Resendu](https://resend.com/docs/dashboard/emails/tags). Přejímku rozšířit na dvě zprávy stejné adrese a obrácené pořadí událostí.

**F5 — Společná fronta mění dostupnost i rychlost potvrzení**

**Dopad:** Odběr plánovaný v N1 závisí na odesílači plánovaném až v N2; potvrzení a uvítání mohou čekat do dalšího ranního či večerního běhu.

**Důkaz:** Potvrzení jde [společnou frontou](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:262), uvítání výslovně čeká na [nejbližší běh](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:264) a jediný popsaný odesílač běží [dvakrát denně](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:265). Tabulka přesto uvádí uvítání v [okamžiku potvrzení](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:46) a rozděluje odběr do N1, frontu a odesílač do [pozdější N2](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:355).

**Návrh řešení:** Minimální funkční frontu a odesílač zahrnout do přejímky N1. Pro potvrzení stanovit krátkou cílovou dobu doručení a způsob rychlého zpracování; cron ponechat také pro obnovu nevyřízené práce.

## Celkový verdikt

**zbývají blokační problémy: E1, E2, E3, E4, E5, E6.** Z předchozích bodů tím přetrvávají **B3 a C1–C3**; **C4 je odstraněný**.

---

# Kolo 4 (k verzi 1.4)

## Metoda

Posuzoval jsem verzi 1.4 proti bodům předchozí oponentury, včetně schématu, transakcí, obnovy, mazání a vypořádání v oddílech 12–15. **ODSTRANĚNO znamená odstraněno v návrhu, nikoli ověřeno implementací.** Návrh sám implementaci nepředstírá ([novinky-k-prijimackam-2027.md:3](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:3)).

Tvrzení o projektu jsem ověřil v kódu odesílání, autentizace, analytiky, kalendáře, `package.json`, `vercel.json`, `next.config.ts` a ve větvi návrhu sledování pomocí `git show`. Kontrola pracovního stromu potvrdila, že API novinek, generátor novinek, závislost Neonu ani konfigurace cronu zatím neexistují; jejich plánované doplnění nepovažuji za vadu návrhu.

Spuštěné kontroly:

- `node --experimental-strip-types --test tests/portal-magic.test.mjs` → **11 prošlo, 0 selhalo**.
- `python3 -B -c 'import runpy; d=runpy.run_path("tests/test_admissions_calendar.py"); [(f(),print(k,"PASS")) for k,f in d.items() if k.startswith("test_")]'` → **oba testy PASS**.

Ověřil jsem také primární dokumentaci služeb. Resend podporuje [značky v dávkách](https://resend.com/docs/api-reference/emails/send-batch-emails), jejich přenos v [události `email.sent`](https://resend.com/docs/webhooks/emails/sent) a [opakování požadavku s klíčem idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys). Neon podporuje navržené interaktivní transakce prostřednictvím [`Pool`/`Client`](https://github.com/neondatabase/serverless#sessions-transactions-and-node-postgres-compatibility). Tyto mechanismy tedy nejsou samy o sobě neproveditelné.

Níže uvedené souběhy a pády jsou **protipříklady k popsanému algoritmu**, nikoli testy neexistující implementace. Produkční tarify, nastavení účtů, právní dokumentace a výkon budoucí funkce zůstávají **neověřené** a nejsou podkladem blokačních závěrů. Do souborů repozitáře jsem nic nezapsal.

## Stav bodů z předchozích kol

| bod | stav | důkaz |
|---|---|---|
| E1 | ODSTRANĚNO | Potvrzení má vlastní žádost a položku přes `zadost_jti`, takže nepotřebuje předčasně založeného odběratele ani aktivní odběr ([novinky-k-prijimackam-2027.md:190](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:190), [ř. 261](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:261), [ř. 320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320)). |
| E2 | ČÁSTEČNĚ | Transakce B trvale zaznamená možné předání, ale odhlášení není atomicky svázané se zneplatněním dávky a kaskádové mazání ochranu předaných položek obchází; viz G1–G2 ([novinky-k-prijimackam-2027.md:260](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:260), [ř. 322](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:322), [ř. 328](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:328)). |
| E3 | ODSTRANĚNO | Neexistující vyhledávání podle klíče nahradily podporované značky ve webhooku a opakování nezměněného POST, přičemž text přiznává možnost skutečného prvního odeslání při opakování ([novinky-k-prijimackam-2027.md:325](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:325)). |
| E4 | ODSTRANĚNO | Po hranici předání se tělo ani klíč nemění a oprava obsahu vyžaduje samostatnou schválenou zprávu ([novinky-k-prijimackam-2027.md:326](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:326), [ř. 367](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:367)). |
| E5 | ČÁSTEČNĚ | Podmíněná aktualizace chrání jednotlivý rozpočtový řádek, ale chybí společná měsíční hranice napříč účely a jednorázové vypořádání rezervace; viz G5–G6 ([novinky-k-prijimackam-2027.md:287](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:287), [ř. 321](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:321), [ř. 330](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:330)). |
| E6 | ČÁSTEČNĚ | Kontrola před prvním předáním přibyla, ale větev obnovy neřeší mezitím prošlou zprávu ani změněný kalendář; viz G4 ([novinky-k-prijimackam-2027.md:319](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:319), [ř. 325](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:325)). |
| B3 | ČÁSTEČNĚ | Uložené tělo a potvrzené transakce napravují původní pořadí, ale zůstávají neúplné přechody při pádu a souběžné obnově; viz G3 a G6 ([novinky-k-prijimackam-2027.md:320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320), [ř. 324](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:324)). |
| C1 | ODSTRANĚNO | Unikátní položka příjemce a zprávy vzniká před odesláním a transakce A ji zamkne, přiřadí dávce a potvrdí před vzdáleným voláním ([novinky-k-prijimackam-2027.md:273](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:273), [ř. 320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320)). |
| C2 | ODSTRANĚNO | Dávka uchovává finální serializované tělo a opakování čte právě tento text, nikoli novou verzi šablony ([novinky-k-prijimackam-2027.md:246](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:246), [ř. 306](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:306), [ř. 323](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:323)). |
| C3 | ČÁSTEČNĚ | Odhlášení zahodí položku, ale předepsaný postup nezajistí, že její adresa zmizí z dosud nepředaného těla dávky; viz G1 ([novinky-k-prijimackam-2027.md:181](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:181), [ř. 328](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:328)). |
| F1 | ODSTRANĚNO | Tělo vzniká před vložením dávky, odstranění používá prázdný text s příznakem a pořadí vytvoření tabulek respektuje závislosti ([novinky-k-prijimackam-2027.md:185](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:185), [ř. 306](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:306), [ř. 320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320)). |
| F2 | ODSTRANĚNO | `jsonb` nahradil text finálního požadavku, nad kterým se počítá otisk a který se přímo odesílá ([novinky-k-prijimackam-2027.md:306](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:306), [ř. 323](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:323)). |
| F3 | ČÁSTEČNĚ | `ON DELETE SET NULL` odpojení umožňuje, ale rozhodnutí 9 stále odkládá smazání identity kvůli dokladům a celé webhooky mohou adresu uchovávat dál; viz H1 ([novinky-k-prijimackam-2027.md:17](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:17), [ř. 212](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:212), [ř. 284](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:284)). |
| F4 | ODSTRANĚNO | Nejednoznačné párování podle adresy nahradil identifikátor položky či Resendu a události mají vlastní trvalé úložiště ([novinky-k-prijimackam-2027.md:278](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:278), [ř. 329](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:329)). |
| F5 | ČÁSTEČNĚ | Inline odeslání a minimální fronta jsou v N1, ale jejich obnova a retenční úklid zůstávají výslovně v N2; viz H4 ([novinky-k-prijimackam-2027.md:168](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:168), [ř. 413](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:413), [ř. 414](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:414)). |

## Nové blokační problémy

**G1 — Odhlášení položky nezneplatní připravené tělo dávky**

**Dopad:** Adresát se může odhlásit před hranicí předání a přesto dostat zprávu.

**Důkaz:** Transakce A uloží tělo a skončí commitem ([novinky-k-prijimackam-2027.md:320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320)). Odhlášení potom přepne položku na `zahozena`, ale nemá předepsanou změnu dávky ([ř. 328](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:328)). Transakce B následně přepíná dávku a položky na `predavana` a odesílá uložené tělo ([ř. 322](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:322)).

Protipříklad: **A commit → odhlášení commit → B → HTTP**. Kontrola účelu proběhla v A; B nemá podmíněný přechod ani kontrolu shody členů s uloženým tělem. Věta, že se připravená dávka „může rozpadnout“, neurčuje povinnou atomickou operaci ([ř. 181](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:181)).

**Návrh řešení:** Odhlášení a B musí zamykat společné záznamy a soutěžit o podmíněný přechod stavu. Vyhraje-li odhlášení, zneplatnit celou připravenou dávku, vypořádat rezervaci a zbývající příjemce sestavit znovu. B smí uspět jen pro dosud platnou dávku s odpovídajícím složením.

**G2 — Kaskádové mazání odstraňuje i předané položky**

**Dopad:** Zanikne evidence pokusu, vazba webhooku a podklad obnovy, přestože zpráva mohla odejít.

**Důkaz:** Oba odkazy z položky mají `ON DELETE CASCADE` ([novinky-k-prijimackam-2027.md:260](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:260)). Žádost se maže po 72 hodinách a identita podle nového pravidla po skončení všech účelů ([ř. 307](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:307), [ř. 309](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:309)). Kaskáda podle [pravidel PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK) odstraní navázané řádky bez ohledu na jejich aplikační stav.

Protipříklad: potvrzení začne odcházet těsně před expirací žádosti, odpověď se ztratí a úklid žádost smaže; s ní zmizí položka `predavana`. Totéž nastane při smazání poslední identity. To přímo odporuje zákazu mazání po hranici předání ([ř. 180](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:180)) i deklarované dvanáctiměsíční retenci položek.

**Návrh řešení:** Oddělit životnost evidence odeslání od životnosti žádosti a identity. Zachovat stabilní identifikátor pokusu a jeho účtování, osobní vazbu odpojit nebo anonymizovat. Pouhá náhrada za `SET NULL` nestačí: musí se upravit také podmínka `num_nonnulls(...) = 1` ([ř. 262](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:262)).

**G3 — Obnova nepokrývá připravenou dávku ani opětovné sestavení stejného požadavku**

**Dopad:** Zpráva může zůstat trvale neodeslaná a držet rezervaci, případně další pokus narazí na databázovou jedinečnost.

**Důkaz:** A vybírá pouze `ceka`, zatímco obnova řeší `predavana` ([novinky-k-prijimackam-2027.md:320](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:320), [ř. 325](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:325)). **Pád po commitu A a před B** tedy zanechá `pripravena`, pro kterou není popsán obnovovací přechod; tento stav chybí také v dohledu ([ř. 420](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:420)).

Druhá mezera: jistá chyba vrací položky na `ceka`, ale ponechává dávku `chyba` ([ř. 324](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:324)). Nová A při stejném těle vypočte stejný klíč a její `INSERT` koliduje s `idempotency_key UNIQUE` ([ř. 249](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:249)). Postup opětovného použití existující dávky určen není.

**Návrh řešení:** Doplnit bezpečné převzetí osiřelé `pripravena`, včetně kontroly platnosti a zabránění souběhu původního pracovníka s obnovou. U prokazatelně odmítnutého nezměněného požadavku určit opětovné použití dávky a klíče; nové sestavení nesmí bezpodmínečně vkládat kolidující řádek.

**G4 — Opakování požadavku může poprvé odeslat již neplatnou zprávu**

**Dopad:** Připomínka může odejít po uzávěrce nebo se zastaralými termíny.

**Důkaz:** Trojí kontrola platnosti je popsána na [novinky-k-prijimackam-2027.md:319](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:319), ale samostatná větev obnovy přikazuje po šesti hodinách zopakovat zmrazený požadavek a výslovně připouští jeho první skutečné odeslání ([ř. 325](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:325)).

Protipříklad: **22. února večer B commit → pád před HTTP → 23. února obnova**. Požadavek splňuje časové okno idempotence, ale připomínka již překročila konec užitečnosti 22. února ([ř. 64](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:64), [admissions-2027.json:12](/Users/imac/Github/stredniskoly/src/data/admissions-2027.json:12)). Text neurčuje, která z protichůdných instrukcí má přednost. Stejný problém nastává po změně kalendáře.

**Návrh řešení:** Před každým opakováním, které může vyvolat nové odeslání, znovu ověřit platnost zmrazeného obsahu. Když neplatí, POST neopakovat a případ ponechat k pasivnímu dohledání či ručnímu rozhodnutí; nezaměnit neznámý výsledek za prokázané neodeslání.

**G5 — Atomický limit jednoho řádku nechrání společný měsíční rozpočet**

**Dopad:** Obsah, uvítání a potvrzení mohou společně zasáhnout rezervu portálu, přestože každá rezervace projde.

**Důkaz:** Rozpočtové řádky jsou oddělené podle období a účelu ([novinky-k-prijimackam-2027.md:287](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:287)); aktualizace rezervuje právě jeden takový řádek ([ř. 321](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:321)). Potvrzení mají jen denní rozpočet, ostatní měsíční ([ř. 330](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:330)).

Protipříklad k deklarovanému stropu 45 000: obsah a uvítání dohromady již využily 44 900; souběžně přijde dalších 100 obsahových zpráv a 100 potvrzení do jejich nevyčerpaných řádků. Obě aktualizace uspějí, součet je 45 100. Návrh neurčuje ani společnou rezervaci, ani pevné rozdělení limitů, jehož celkový součet včetně všech dnů zaručeně nepřesáhne strop. Hlavička spotřeby tento souběh neserializuje.

Přímé odesílání portálu a hlášení chyb je skutečné, nikoli domnělé ([portal-email.ts:16](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:16), [bug-report/route.ts:80](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:80)); jeho odhadovaná rezerva je však další, oddělené omezení.

**Návrh řešení:** Každý e-mail novinek musí atomicky rezervovat společný měsíční rozpočet a případný dodatečný denní limit. K rezervaci uložit vazbu na dávku, množství a konkrétní období; určit také postup přes půlnoc a přelom měsíce.

**G6 — Výsledek odeslání nemá jednorázové lokální vypořádání**

**Dopad:** Souběžná obnova může stejnou dávku zaúčtovat vícekrát; pád při zpracování webhooku může ponechat jeho účinky neprovedené.

**Důkaz:** Transakce C při úspěchu převádí rezervaci na spotřebu, ale nemá podmínku, že převod smí vyhrát právě jeden zpracovatel ([novinky-k-prijimackam-2027.md:324](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:324)). Obnova umožňuje opakovat POST ([ř. 325](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:325)).

Protipříklad: dva obnovovací běhy přečtou tutéž `predavana`, oba získají úspěšnou odpověď na stejný klíč a oba provedou C. Resend zabrání druhému e-mailu, ale nezabrání druhému lokálnímu odečtení rezervace a přičtení spotřeby.

Webhook má obdobně rozlišené „nejdřív uložit“ a „teprve pak vyhodnotit“, bez předepsané společné transakce nebo evidence dokončení zpracování ([ř. 329](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:329), [schéma:278](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:278)). Po pádu mezi těmito kroky samotná jedinečnost `event_id` nezaručuje dokončení účinků.

**Návrh řešení:** Sjednotit API odpověď i webhook nad podmíněným, atomickým vypořádáním položky a rezervace. Již vypořádaný výsledek nesmí znovu účtovat. Webhook buď zpracovat ve stejné transakci jako vložení, nebo evidovat nezpracované události a bezpečně je opakovat; známé výsledky jednotlivých položek zachovat i při částečně obnovené dávce.

## Nové nikoli blokační

**H1 — „Zůstává jen otisk“ stále neodpovídá celému retenčnímu modelu**

**Dopad:** Implementátor má dvě protichůdná pravidla mazání a zásady mohou slibovat odstranění adresy, která zůstane v jiném úložišti.

**Důkaz:** Rozhodnutí 9 drží identitu až do zániku potřebných dokladů ([novinky-k-prijimackam-2027.md:17](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:17)), nové pravidlo ji naopak maže po zániku účelů ([ř. 307](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:307)). `webhook_udalost.telo` uchovává celé tělo a tabulka má retenci 12 měsíců ([ř. 284](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:284), [ř. 309](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:309)); dokumentovaný [payload `email.sent`](https://resend.com/docs/webhooks/emails/sent) obsahuje adresu příjemce.

**Návrh řešení:** Sjednotit rozhodnutí 9 s odpojením dokladu a samostatně stanovit odstranění či redukci osobních údajů v tělech webhooků a neuzavřených dávek. Tvrzení o „jen otisku“ vztáhnout přesně ke konkrétnímu záznamu a okamžiku.

**H2 — Třetí druh adresáta nemá dokončenou potvrzovací cestu**

**Dopad:** Při realizaci N3 není jednoznačné, jak založit pouze čekání na kalendář a jak potvrdit nový odběr během slíbených 30 dnů.

**Důkaz:** Čekání má samostatný souhlas a třicetidenní stav `vyzvan` ([novinky-k-prijimackam-2027.md:119](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:119)), ale popsaný potvrzovací POST vždy zakládá odběr a uvítání ([ř. 317](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:317)). Žádost má jedinou pevnou platnost 72 hodin ([ř. 197](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:197)); vazba třicetidenní výzvy na tuto cestu není určena.

**Návrh řešení:** Popsat účel žádosti, samostatnou větev vzniku `zprava_o_kalendari` a konkrétní autorizaci třicetidenní výzvy. Určit také atomické uzavření čekání při potvrzení nového ročníku.

**H3 — `suppression.added` nelze obecně párovat jako událost konkrétní zprávy**

**Dopad:** Událost může zůstat nespárovaná a slíbené odstranění odběru se neprovede.

**Důkaz:** Obecný postup nejprve vyžaduje párování přes `polozka_id` nebo `resend_id` a teprve potom vyhodnocuje také `suppression.added` ([novinky-k-prijimackam-2027.md:329](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:329)). Dokumentovaný [payload této události](https://resend.com/docs/webhooks/suppressions/added) obsahuje adresu, identifikátor potlačení a `source_id`, nikoli značku položky; událost vzniká také ručním přidáním adresy, které nemusí souviset s žádnou místní zprávou.

**Návrh řešení:** Oddělit události konkrétního e-mailu od událostí potlačení adresy. Potlačení vyhodnocovat podle normalizované adresy a výslovně stanoveného rozsahu účinků, bez čekání na položku odeslání.

**H4 — Přesun do N1 nezahrnuje všechny provozní závislosti**

**Dopad:** N1 může podle vlastní přejímky projít, přestože záloha po neúspěšném inline odeslání a slíbené mazání žádostí ještě nejsou hotové.

**Důkaz:** Inline odeslání označuje frontu za zálohu ([novinky-k-prijimackam-2027.md:168](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:168)). N1 obsahuje minimální frontu a odesílač, ale obnova podle 5.7, retenční úklid a zkoušky pádů jsou stále výslovně v N2 ([ř. 413](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:413), [ř. 414](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:414)).

**Návrh řešení:** Zařadit obnovu potvrzení a uvítání, úklid žádostí a jejich zkoušky do přejímky N1. V N2 ponechat rozšíření o obsahové manifesty a hromadné dávky.

**H5 — Starší vypořádání stále předepisují nahrazené mechanismy**

**Dopad:** Implementace podle oddílů 13–14 může znovu zavést postup, který oddíl 15 právě opravuje.

**Důkaz:** B2 stále používá neexistující tabulku `token_spotrebovan` ([novinky-k-prijimackam-2027.md:464](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:464)); B3 uvádí starý stav `rezervovana` ([ř. 465](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:465)); C2 obecně odvozuje nový klíč ze změny obsahu a C3 umísťuje hranici zrušení až k předání Resendu ([ř. 507](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:507), [ř. 508](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:508)). Aktuální kontrakt přitom používá spotřebování žádosti a commit B.

**Návrh řešení:** Označit tyto pasáže jako historické a nahrazené konkrétními pravidly verze 1.4, případně je aktualizovat. Oddíl 6 musí být jednoznačným zdrojem současného implementačního kontraktu.

## Celkový verdikt

**zbývají blokační problémy: G1, G2, G3, G4, G5, G6.**
162 355

---

# Kolo 5 (k verzi 1.5)

## Metoda

Posoudil jsem požadované body z kol 1–4 proti verzi 1.5. Za závazný považuji oddíl 6, jak stanoví [novinky-k-prijimackam-2027.md:139](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:139), nikoli historické formulace vypořádání.

Kontroloval jsem návaznost schématu, transakcí A/B/C, obnovy, odhlášení, kvóty a webhooků pomocí konkrétních pořadí operací. Kolizi opakované rezervace jsem navíc reprodukoval nad příslušným DDL v SQLite v paměti; nejde o integrační test PostgreSQL ani hotové implementace.

V projektu jsem ověřil přímé volání Resendu v [portal-email.ts:16](/Users/imac/Github/stredniskoly/src/lib/portal-email.ts:16) a [bug-report/route.ts:80](/Users/imac/Github/stredniskoly/src/app/api/bug-report/route.ts:80), konfiguraci [vercel.json:1](/Users/imac/Github/stredniskoly/vercel.json:1) a závislosti. Dohledal jsem také oficiální dokumentaci Resendu použitou níže. Tarify, nastavení účtů, produkční provoz a výkon budoucí implementace zůstávají **neověřené**; nepoužívám je jako blokační námitky.

Blokační jsou níže vady závazného postupu, které musí být opraveny před spuštěním příslušného odesílání. Do souborů repozitáře jsem nic nezapisoval.

## Stav bodů z předchozích kol

| bod | stav | důkaz |
|---|---|---|
| G1 | ODSTRANĚNO | Odhlášení soutěží s B o stav celé dávky a při vítězství ruší její předání, takže původní protipříklad mezi A a B je pokrytý ([novinky-k-prijimackam-2027.md:187](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:187)). |
| G2 | ODSTRANĚNO | Oba odkazy položky používají `ON DELETE SET NULL` a vlastní otisk adresáta zachovává evidenci po odstranění žádosti či identity ([novinky-k-prijimackam-2027.md:272](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:272)). |
| G3 | ČÁSTEČNĚ | Obnova osiřelé `pripravena` existuje, ale opětovné použití dávky neřeší opětovné založení její již vypořádané rezervace; viz I1 ([novinky-k-prijimackam-2027.md:348](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:348), [ř. 354](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:354)). |
| G4 | ODSTRANĚNO | Před opakováním se znovu ověřuje platnost a neplatný obsah se neposílá, nýbrž přechází do `neurcita` ([novinky-k-prijimackam-2027.md:353](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:353)). |
| G5 | ČÁSTEČNĚ | Společný řádek `celkem` řeší souběh účelů, ale účtování podle času rezervace nechrání strop období skutečného odeslání; viz I3 ([novinky-k-prijimackam-2027.md:349](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:349)). |
| G6 | ČÁSTEČNĚ | Jednorázové účtování a opakování nezpracovaných webhooků jsou doplněné, ale přechod celé dávky není sladěný s postupným příchodem výsledků jednotlivých položek; viz I2 ([novinky-k-prijimackam-2027.md:352](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:352), [ř. 358](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:358)). |
| E2 | ODSTRANĚNO | Commit B je trvalá hranice před HTTP voláním a evidence předaných položek už nezaniká kaskádou ([novinky-k-prijimackam-2027.md:186](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:186), [ř. 350](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:350)). |
| E5 | ČÁSTEČNĚ | Kapacita se rezervuje atomicky předem, ale životní cyklus opakované rezervace a přechod období zůstávají neúplné; viz I1 a I3 ([novinky-k-prijimackam-2027.md:349](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:349)). |
| E6 | ODSTRANĚNO | Platnost se kontroluje při naplnění, sestavení, předání i každém opakování, takže původní obcházení konce užitečnosti je odstraněné ([novinky-k-prijimackam-2027.md:347](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:347)). |
| B3 | ČÁSTEČNĚ | Neměnné tělo, hranice předání a podmíněné přechody chrání běžné odeslání, ale úplná obnova stále naráží na I1 a I2 ([novinky-k-prijimackam-2027.md:348](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:348), [ř. 353](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:353)). |
| C3 | ODSTRANĚNO | Vítězné odhlášení zruší celou připravenou dávku, zatímco po hranici předání její položku zachová ([novinky-k-prijimackam-2027.md:187](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:187), [ř. 357](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:357)). |
| F3 | ODSTRANĚNO | Doklad už nevyžaduje zachování identity s adresou, protože rozhodnutí 9 stanoví její smazání po skončení účelů a FK dokladu umožňuje odpojení ([novinky-k-prijimackam-2027.md:17](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:17), [ř. 222](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:222)). |
| F5 | ODSTRANĚNO | Potvrzení a uvítání mají okamžité odeslání a N1 zahrnuje také obnovu, úklid žádostí a zkoušky pádů ([novinky-k-prijimackam-2027.md:170](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:170), [ř. 446](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:446)). |
| H1 | ČÁSTEČNĚ | Rozhodnutí 9 i ukládání webhooků jsou opravené, ale retenční vysvětlení stále opomíjí adresu v těle neuzavřené dávky; viz J1 ([novinky-k-prijimackam-2027.md:329](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:329), [ř. 333](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:333)). |
| H2 | ODSTRANĚNO | Všechny tři účely mají vlastní potvrzovací větev, výzva třicetidenní žádost a potvrzení nového ročníku atomicky uzavírá čekání ([novinky-k-prijimackam-2027.md:164](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:164), [ř. 341](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:341)). |
| H3 | ODSTRANĚNO | `suppression.added` se vyhodnocuje podle normalizované adresy nezávisle na položce odeslání ([novinky-k-prijimackam-2027.md:360](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:360)). |
| H4 | ODSTRANĚNO | Obnova podle 5.7 a 5.8, úklid žádostí i přejímací zkoušky pádů jsou výslovně součástí N1 ([novinky-k-prijimackam-2027.md:446](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:446)). |
| H5 | ODSTRANĚNO | Hlavička i oddíl 6 jednoznačně dávají současnému kontraktu přednost před historickými vypořádáními ([novinky-k-prijimackam-2027.md:3](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:3), [ř. 139](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:139)). |

## Zbývající blokační problémy

**I1 — Opětovné použití dávky neobnovuje životní cyklus rezervace**

**Dopad:** Obnova po prokázaném neodeslání může skončit kolizí primárního klíče; pouhé ponechání původního rezervačního řádku zase znemožní správné vypořádání nové rezervace.

**Důkaz:** A výslovně znovu používá tutéž dávku pomocí upsertu, který mění pouze `stav` a `zalozeno` ([novinky-k-prijimackam-2027.md:348](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:348)). Rezervace má primární klíč `(davka_id, obdobi, ucel)` a příznak `vyporadano` ([ř. 290](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:290)); C zpracuje pouze řádky s `vyporadano IS NULL` ([ř. 352](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:352)).

Konkrétní pořadí:

1. A založí dávku D a rezervaci R pro 100 zpráv.
2. B předá D; přijde prokazatelná chyba bez odeslání.
3. C nastaví D na `chyba`, vrátí položky na `ceka`, uvolní kapacitu a označí R jako vypořádanou.
4. Další A sestaví stejné tělo ve stejném období a upsertem obnoví D.
5. Nový záznam rezervace narazí na existující R; pokud implementace konflikt pouze přeskočí, následující C nenajde žádnou nevypořádanou rezervaci pro nově navýšené `rezervovano`.

Pomocný model nad DDL reprodukoval `UNIQUE constraint failed: rezervace_kvoty.davka_id, rezervace_kvoty.obdobi, rezervace_kvoty.ucel`. Chybí pravidlo bezpečného obnovení rezervace, nikoli pouze další `ON CONFLICT DO NOTHING`.

**Návrh řešení:** Zavést generaci pokusu a rezervaci vázat na ni, případně výslovně předepsat atomické obnovení vypořádané rezervace. Aktualizace výsledku musí identifikovat správný pokus, aby opožděný zpracovatel nemohl vypořádat novější rezervaci. Klíč idempotence pro stejné tělo u Resendu zůstává stejný.

**I2 — Webhook jednotlivého e-mailu má vypořádat celou dávku**

**Dopad:** Obnova ztracené odpovědi nemá úplný postup pro částečně známou dávku: může ji předčasně uzavřít bez identifikátorů ostatních e-mailů, nebo po prvním webhooku přestat získávat chybějící výsledky.

**Důkaz:** C podmiňuje přepnutí položek na `odeslana` a zápis jejich `resend_id` vítězstvím přechodu **celé dávky** ([novinky-k-prijimackam-2027.md:352](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:352)). Obnova webhookem má použít stejný přechod a opakování POST se provádí, jen pokud nedorazil **žádný** webhook ([ř. 353](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:353)). Dokumentovaný [`email.sent`](https://resend.com/docs/webhooks/emails/sent) přitom obsahuje identifikátor a značky jednoho e-mailu, nikoli výsledkovou mapu celé dávky.

Konkrétní pořadí:

1. B předá dávku s položkami P a Q.
2. Resend požadavek přijme, ale proces spadne před uložením odpovědi.
3. Dorazí webhook P s jeho `resend_id`; webhook Q je opožděný.
4. Předepsané C uzavře dávku, ale z webhooku P nemá jak získat `resend_id` Q.
5. Pozdější webhook Q již nemůže vyhrát přechod dávky z `predavana`; samostatné doplnění výsledku Q nezávislé na tomto vítězství kontrakt neurčuje.

Ani varianta „počkáme s C na všechny webhooky“ není dopsaná: příchod P už vyřadí větev opakování podmíněnou nepřítomností jakéhokoli webhooku. Netvrdím, že Q nebyla odeslána; prokázaný problém je neúplná rekonstrukce jejího výsledku.

**Návrh řešení:** Oddělit jednorázové účtování dávky od doplňování výsledků jednotlivých položek. Webhook smí doplnit známou položku i po vypořádání dávky. Definovat úplnost výsledkové mapy a obnovovat ji při **chybějících výsledcích**, nikoli pouze při nulovém počtu webhooků; přitom zachovat stejné tělo, klíč, kontrolu platnosti a časové okno opakování.

**I3 — Rezervace ve starém období nechrání kvótu nového období**

**Dopad:** Novinky mohou překročit svůj měsíční strop a zasáhnout rezervu portálu, přestože všechny lokální podmíněné aktualizace uspějí; obdobně lze překročit denní rozpočet potvrzení.

**Důkaz:** Období se výslovně určuje podle času rezervace, nikoli odeslání ([novinky-k-prijimackam-2027.md:349](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:349)), zatímco měsíční řádek má chránit rezervu 5 000 skutečných e-mailů ([ř. 363](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:363)). Resend sleduje spotřebovanou odesílací kvótu, nikoli místní rezervace ([Usage Limits](https://resend.com/docs/api-reference/rate-limit)).

Konkrétní modelový příklad se stropem 45 000:

1. Poslední večer období A rezervuje 100 zpráv ve starém měsíci.
2. B commitne; proces spadne **před HTTP voláním**.
3. V novém měsíci jiné dávky rezervují a odešlou 44 950 zpráv.
4. Po šesti hodinách obnova stále platnou starou dávku poprvé skutečně odešle.
5. C zaúčtuje jejích 100 zpráv do starého měsíce; nový řádek eviduje 44 950, ale v novém období odešlo 45 050.

Nejde o tvrzení o skutečné spotřebě účtu, nýbrž o protipříklad k pravidlu účtování. Stejný mechanismus funguje přes půlnoc u denního rozpočtu potvrzení.

**Návrh řešení:** U dosud nepředané dávky před B atomicky převést rezervaci do aktuálního období. U neznámého výsledku přes hranici období před opakováním zajistit kapacitu také v období, v němž může nastat první skutečné odeslání; starou nejistou rezervaci neuvolňovat bez důkazu. Vymezení období sladit s ověřeným účtováním poskytovatele.

## Nikoli blokační k dopsání

**J1 — Retenční vysvětlení opomíjí tělo neuzavřené dávky**

**Dopad:** Text může slíbit odstranění adresy dříve, než k němu skutečně dojde.

**Důkaz:** Adresa má zmizet s identitou a žádostí ([novinky-k-prijimackam-2027.md:333](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:333)), ale hotové tělo požadavku se maže až po uzavření dávky ([ř. 329](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:329)). Pořadí `B → odhlášení a smazání identity → neurčitý výsledek` tedy ponechá adresu v těle potřebném pro obnovu.

**Návrh řešení:** Výslovně popsat dočasné uchování adresy v neuzavřeném požadavku a jeho konečnou lhůtu odstranění. Neblokuje to odesílací algoritmus; opravuje to rozsah retenčního slibu.

**J2 — Ukotvit společný začátek třicetidenní lhůty výzvy**

**Dopad:** Při odloženém odeslání nemusí být zřejmé, zda potvrzovací odkaz platí celých slíbených 30 dnů od výzvy.

**Důkaz:** Žádost vzniká spolu s přípravou výzvy a má třicetidenní platnost ([novinky-k-prijimackam-2027.md:166](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:166)), zatímco `ceka_do` se odvozuje od času výzvy ([ř. 238](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:238)); obecné C neurčuje zápis `vyzva_odeslana` a přechod do `vyzvan` ([ř. 352](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:352)).

**Návrh řešení:** Dopsat společný rozhodný okamžik pro `plati_do`, token a `ceka_do` a atomický přechod čekání při zjištění výsledku výzvy. Jde o dokončení časového kontraktu rozšíření N3, nikoli návrat původně chybějících potvrzovacích větví.

**J3 — Rozlišit důvody prohraného přechodu B**

**Dopad:** Detailní postup může implementátora svést k rušení práce jiného vítězného zpracovatele.

**Důkaz:** Obecné pravidlo správně říká, že poražený nic neúčtuje a načte nový stav ([novinky-k-prijimackam-2027.md:185](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:185)), ale krok B při neúspěchu obecně přikazuje zrušení a vypořádání ([ř. 350](/Users/imac/Github/stredniskoly/docs/novinky-k-prijimackam-2027.md:350)). Při pořadí `obnova vyhraje B → původní běh prohraje B` přitom dávka už patří vítězi.

**Návrh řešení:** Výslovně rozlišit změněné složení dosud připravené dávky od stavů `predavana`, `odeslana` a již vypořádané `zrusena`. V druhé skupině pouze načíst stav a skončit. Za blokační to nepovažuji, protože pravidla 1 a 2 již bezpečné chování jednoznačně vyžadují.

## Celkový verdikt

**zbývají blokační problémy: I1 — opakovaná rezervace dávky, I2 — obnova dílčích výsledků webhooků, I3 — kvóta přes přelom období.**
