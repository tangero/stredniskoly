---
name: trideni-issues
description: Třídění nových a otevřených issues v tangero/stredniskoly podle návrhu řízení vývoje (oblasti, původ, duplikáty, co realizovat). Použij při každém zpracování issues, před výběrem práce.
---

# Třídění issues

Pravidla: `CLAUDE.md` (pravidla 1 a 4) a `docs/navrh-rizeni-vyvoje-2027.md`, oddíly 12 až 14.

## Postup

1. Splatné připomínky (`pripominka`) vypiš zvlášť (`CLAUDE.md`, pravidlo 1):
   ```bash
   gh issue list -R tangero/stredniskoly --label pripominka --state open --json number,title,body \
     --jq '.[] | (.body | capture("Termín:?\\s*(?<d>[0-9]{4}-[0-9]{2}-[0-9]{2})").d // "bez termínu") as $t
       | "#\(.number) termín \($t)\(if $t <= (now|strftime("%Y-%m-%d")) then " – SPLATNÉ" else "" end)  \(.title)"'
   ```
2. Každé otevřené issue bez oblasti dostane právě jeden štítek `oblast:<slug>`. Oblasti a cesty
   v kódu: `.github/labeler.yml` (detail, prehledy, simulator, dojezdy, novinky, veletrhy, portal, data,
   provoz).
3. **Původ:** hlášení z formulářů mají `bug-report`, `portal-skoly` nebo `feature-request`; zadání
   převzaté z e-mailu od neověřeného odesílatele dostane `puvod:email`, jiné převzaté hlášení
   `puvod:hlaseni`. Takové issue realizuj jen se `schvaleno`.
4. **Duplikáty** zavři s odkazem na původní issue (`state_reason: not_planned`, komentář „Duplikát #N“).
   Duplikát pozná obsah (stejná škola podle RED IZO, stejná chyba), ne jen titulek.
5. **Osobní údaje** ve veřejném issue: neopisuj je, upozorni Patricka (do fáze 2 je přesun do soukromého
   repozitáře na něm).
6. **Co realizovat:** interní issue se `schvaleno` nebo s dokladem `Zdroj:` a bez `navrh`, `zamitnuto`,
   `stop`. Ostatní nech být. Otázku na Patricka nepiš do GitHubu; když ovlivní směr, patří na briefing
   (zapisuje ji Eduarda).
7. **Závislosti:** řádek `Závisí na #N` v těle issue (uznává se i `Depends on #N` a `Blocked by #N`),
   jedno nebo víc čísel. Issue, jehož závislost je ještě otevřená, se nerealizuje (nevzniká větev ani PR).
   Při zpracování issues ho vypiš zvlášť s čísly závislostí a řaď až za ně. Když závislost přibude k issue,
   které už má otevřený PR, napiš to do PR komentářem a v PR nepokračuj, dokud se závislost nezavře.
   Závislost nic neschvaluje a štítky nemění.
8. **Už vyřešeno:** před realizací prohledej sloučené PR za posledních 60 dní (titulek, `Closes` a
   `Souvisí s`, změněné soubory) a hledej, zda zadání už nevyřešil jiný PR. Podezření napiš do issue
   komentářem s odkazy na PR. Issue sám nezavírej a s realizací počkej na odpověď (štítek `otazka`,
   pravidlo 8).
9. **Celky (pilot tabule, #561):** každé otevřené interní issue patří pod jeden celek, tedy issue se štítkem
   `projekt`: Řízení vývoje #306, Měření a přínos #331, Data 2027 #181, Aktuality a odběry #523, Opravy
   údajů škol #541. Úkol, který potřebuje vlastní rozhodnutí nebo diskusi, připoj jako sub-issue. Drobný
   úkol zapiš jako položku seznamu v `## Etapy` celku (RA48). Nový celek nezakládej sám, navrhni ho
   vlastníkovi. **Veřejné hlášení bez rozhodnutí nepřipojuj** pod schválený celek, protože by se tím
   stalo realizovatelným bez `schvaleno` (RA39). Uveď ho jen odkazem v těle celku, v novém oddílu za
   oddílem `## Rozsah`, aby se nezměnil schválený rozsah. Issues `trvale` do celků nepatří. Jednou měsíčně
   celky projdi: hotové navrhni zavřít, překrývající sloučit.
10. **Pro lidi:** každé nové interní zadání má hned pod dokladem `Zdroj:` řádek `Pro lidi: …`, jednu až dvě
    věty bez technických slov o tom, co se změní a pro koho. Workflow Tabule ho přenese na kartu do pole
    „Pro lidi“. U zadání bez řádku ukazuje pole název issue a běh Tabule to ohlásí varováním. Řádek doplň
    jen u issue, které ještě nemá souhlas, nebo u issue s oddílem `## Rozsah` mimo něj: změna těla
    issue bez oddílu Rozsah zneplatní `schvaleno`.

Štítky `schvaleno` a `zamitnuto` nepřidávej nikdy, `stop` nikoho jiného neodebírej.
