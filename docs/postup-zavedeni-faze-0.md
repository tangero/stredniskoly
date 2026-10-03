# Postup zavedení fází 0 a 1: práce vlastníka

Verze 3.0 · 3. 10. 2026 · podle [návrhu řízení vývoje](navrh-rizeni-vyvoje-2027.md) 0.13a, oddíl 20.

Claude Code pracuje přes účet vlastníka (RA35), Eduarda vlastním účtem `eduarda-prijimacky` (RA36).
Práce vlastníka ve fázi 1 je asi 35 minut.

Hotové už je (PR #276): odstraněné workflow `auto-fix-issues.yml`, `auto-fix-iterative.yml`
a `notify-new-issue.yml` i jejich skripty; `veletrhy-snimek.yml` zakládá PR tokenem `CSI_PR_TOKEN`,
takže na nich běží CI; z #53 je odstraněný e-mail; duplikáty #216, #228 a #251 jsou zavřené.

## Fáze 0: hotovo (3. 10. 2026)

- Revize #53 s e-mailem je smazaná.
- `CSI_PR_TOKEN` funguje a nevyprší: PR #269 z `csi-weekly-refresh` založil účet vlastníka a proběhly na
  něm povinné kontroly.

## Fáze 1

Stav 3. 10. 2026: brána sloučení je v `main` (PR #283) a jen zapisuje kontrolu „Brána sloučení“, nic
neblokuje. Štítky `stop`, `rutina`, `incident`, `projekt`, `puvod:hlaseni`, `puvod:email`, `trvale` jsou
založené. Druhý PR fáze 1 přináší pravidla v `CLAUDE.md`, skills, pokyny pro Eduardu
(`docs/pokyny-asistent-zadani.md`) a adresu náhledu ke commitu. Přejímka naostro
prošla 3. 10. 2026 (výsledek v PR #288), brána je v rulesetu a seznam obejití je prázdný. Slučování AI
zapíná krok 3b.

### Krok 3a: přejímka naostro (5 min, AI připraví a vyhodnotí)

AI založí zkušební issue a PR. Ty na pokyn přidáš štítky:

1. **O2:** přidáš `schvaleno` na issue; AI pak změní jeho rozsah a brána musí PR odmítnout.
2. **Stop a protokol:** přidáš `stop`; brána musí PR odmítnout. PR bez protokolu z preview také.

AI zapíše výsledky do PR a zkušební issue i PR zavře.

### Krok 3: ruleset (10 min, po přejímce)

Repozitář → Settings → Rules → Rulesets → **Ochrana main**:

1. **Require status checks to pass:** přidat kontrolu „Brána sloučení“ (zdroj GitHub Actions)
   k dosavadním třem.
2. **Bypass list:** odebrat všechny položky, i sebe. Merge pak jde jen přes kontroly a bránu, i pod tvým
   účtem; v nouzi ruleset dočasně upravíš.
3. Povinné review **nezapínej**: PR jsou pod tvým účtem a vlastní PR schválit nejde.

Jak se pak slučuje:

- **PR navázaný na schválené zadání** (`Closes #N`, issue se `schvaleno`): brána projde sama, když se
  rozsah issue od schválení nezměnil a u změn webu je v PR protokol z preview.
- **PR bez zadání** (snímky dat, Dependabot, tvoje rychlé úpravy) a **kontrolované činnosti** (migrace,
  e-maily, portál, workflow, závislosti): přidej na PR štítek `schvaleno`. Souhlas platí pro commit, který
  PR v tu chvíli má; po dalším pushi štítek odeber a přidej znovu.
- **Změny brány, `rezimy.yml`, `CLAUDE.md`:** vždy `schvaleno` přímo na PR.
- Proč kontrola neprošla, ukazuje její souhrn v záložce Checks u PR.

### Krok 3b: zapnout slučování AI (2 min)

AI připraví PR, který v `.github/rezimy.yml` nastaví `slucovani_ai: true`. Přidáš na něj `schvaleno`
a sloučíš ho. Od té chvíle Claude Code slučuje sám skriptem po bráně.

### Krok 4: Směr vývoje (15 min)

1. Založ soukromý repozitář `stredniskoly-rizeni`.
2. AI do něj připraví `smer-vyvoje.md` podle oddílu 17 návrhu; ty doplníš cíle, priority, co se teď
   nedělá a měsíční rozpočet.

### Krok 5: náhled pro ověření na preview (5 min, jen když náhled vrací 401)

Když je ve Vercelu zapnutá ochrana náhledů, AI se na náhled nedostane. Vercel → projekt → Settings →
Deployment Protection → Protection Bypass for Automation: vytvoř hodnotu. Ulož ji jako proměnnou prostředí
`VERCEL_AUTOMATION_BYPASS_SECRET` v nastavení cloudového prostředí Claude Code (nabídka prostředí v záhlaví
relace → Edit); platí od další relace. Do chatu ji nevkládej.

## Co zůstává na tobě potom

- Rozhodnutí z oddílu 3 návrhu: štítkem `schvaleno` na GitHubu (i z bočního panelu v GitHub Projects)
  nebo na briefingu v Grok Bot.
- Jednou týdně projít v přehledu výpis „schváleno, zamítnuto, změny nastavení“ a vrátit, co si nevybavíš.
- Obnova tokenů v secrets, až na ni upozorní týdenní přehled.
