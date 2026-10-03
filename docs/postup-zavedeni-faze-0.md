# Postup zavedení fází 0 a 1: práce vlastníka

Verze 2.2 · 3. 10. 2026 · podle [návrhu řízení vývoje](navrh-rizeni-vyvoje-2027.md) 0.13a, oddíl 20.

AI pracuje přes účet vlastníka (rozhodnutí RA35), takže se nezakládají žádné další účty, aplikace
ani zkušební repozitář. Práce vlastníka je asi 30 minut.

Hotové už je (PR #276): odstraněné workflow `auto-fix-issues.yml`, `auto-fix-iterative.yml`
a `notify-new-issue.yml` i jejich skripty; `veletrhy-snimek.yml` zakládá PR tokenem `CSI_PR_TOKEN`,
takže na nich běží CI; z #53 je odstraněný e-mail; duplikáty #216, #228 a #251 jsou zavřené.

## Fáze 0: hotovo (3. 10. 2026)

- Revize #53 s e-mailem je smazaná.
- `CSI_PR_TOKEN` funguje a nevyprší: PR #269 z `csi-weekly-refresh` založil účet vlastníka a proběhly na
  něm povinné kontroly.

## Fáze 1, až AI připraví bránu sloučení

Fáze 1 přijde ve dvou PR: nejdřív brána sloučení (`brana-slouceni.yml`, `scripts/brana/`, `rezimy.yml`,
štítky oblastí), potom pravidla v `CLAUDE.md` a skills. Brána po sloučení prvního PR jen píše kontrolu
„Brána sloučení“ ke každému PR a nic neblokuje, dokud ji nepřidáš do rulesetu. Pár dní se tak dá sledovat,
jestli rozhoduje správně.

### Krok 3: ruleset (10 min, až brána u PR ukazuje rozumné výsledky)

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

### Krok 4: Směr vývoje (15 min)

1. Založ soukromý repozitář `stredniskoly-rizeni`.
2. AI do něj připraví `smer-vyvoje.md` podle oddílu 17 návrhu; ty doplníš cíle, priority, co se teď
   nedělá a měsíční rozpočet.

### Krok 5: náhled pro ověření na preview (5 min, jen když je zapnutá ochrana náhledů ve Vercelu)

Vercel → projekt → Settings → Deployment Protection → Protection Bypass for Automation: vytvoř
hodnotu a ulož ji v repozitáři jako secret `VERCEL_AUTOMATION_BYPASS_SECRET`.

## Co zůstává na tobě potom

- Rozhodnutí z oddílu 3 návrhu: štítkem `schvaleno` na GitHubu (i z bočního panelu v GitHub Projects)
  nebo na briefingu v Grok Bot.
- Jednou týdně projít v přehledu výpis „schváleno, zamítnuto, změny nastavení“ a vrátit, co si nevybavíš.
- Obnova tokenů v secrets, až na ni upozorní týdenní přehled.
