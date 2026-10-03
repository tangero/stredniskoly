# Návrh: oblasti, projekty a etapy na GitHubu (tangero/stredniskoly), finální verze

Stav k 3. 10. 2026 (SELČ), `main` @ `73221ead`. **Jen audit: na GitHubu se nic nezměnilo.**
Podklady: tabule projektu 1 (68 položek), 105 issues a 167 PR, repozitář (`src/app`, `src/lib`, `scripts`, `data`, `public`, `docs`, `.github`).

## 1. Model ve třech úrovních

| Úroveň | Co to je | Na GitHubu | Na tabuli |
|---|---|---|---|
| **Oblast** | trvalá část produktu, nikdy se nezavírá | 1 issue „Oblast: …“, štítky `oblast` + `oblast:<slug>`; tělo = rozsah, cesty v kódu, odkazy na historii | jen pohled **Oblasti** (tabulka, průběh podúkolů) |
| **Projekt** | konečná práce s cílem („Obory bez JPZ 2027“, „Log drain“) | issue = **sub-issue oblasti**, štítky `projekt` + `oblast:<slug>` + stavové (`navrh`/`schvaleno`/`k-overeni`) | **jen projekty jdou sloupci** Návrh → Oponentura → Schváleno → Ke schválení merge → Hotovo (pohled **Rozpracováno**) |
| **Etapa / oprava** | krok projektu | checklist v těle projektu, nebo sub-issue projektu (bez štítku `projekt`) | žádná vlastní karta; PR odkazují na projekt |

Veřejná hlášení (`bug-report`, `portal-skoly`, `feature-request`) nejsou projekty. Dostanou jen štítek `oblast:<slug>`, zobrazí se v pohledu **Hlášení** a sub-issue se z nich stane až tehdy, když je projekt opravuje.

## 2. Oblasti (11)

| # | Slug / štítek | Oblast | Rozsah jednou větou | Hlavní cesty |
|---|---|---|---|---|
| 1 | `oblast:detail` | **Detail školy a oboru** | Stránka školy a oboru: nabídka, body a pásma 2026, maturita, souběh přihlášek, 2. kolo, kritéria na stránce oboru, otevřená data školy | `src/app/skola/[slug]` (+`inspekce`, `pro-me`), `src/components/skola`, `src/components/obor`, `src/lib/skola-*`, `obor-*`, `pasma-prijeti`, `kontext-prihlasek`, `druhe-kolo*`, `maturita-skoly`, `kriteria-skoly-*`; `public/school_details`, `soubeh_prihlasek`, `kontext_prihlasek`, `pasma_prijeti` |
| 2 | `oblast:prehledy` | **Vyhledávání a přehledy** | Stránky napříč školami: katalog a vyhledávání, města, kraje, výsledky ročníků, nabídka 2026, žebříčky na titulce | `src/app/skoly`, `mesto/[mesto]`, `regiony/[kraj]`, `vysledky/[year]`, `nabidka/2026`, `page.tsx`; `src/components/SchoolSearch`, `CitySchoolsTable`, `RegionSchoolsTable`; `src/lib/cityData`, `krajData`, `mesta.mjs`, `kraje.mjs`; `api/schools`, `api/skoly` |
| 3 | `oblast:simulator` | **Simulátor a Kde stojím** | Simulátor přijímaček, strategie přihlášek, proužek „Kde stojím“, převod testů TAU na body | `src/app/simulator`, `prototyp/pasma`, `src/components/simulator`, `obor/KdeStojim.tsx`; `src/lib/simulator-*`, `strategie-prihlasek`, `poloha-vuci-pasmu`, `prevod-testu*`, `chances`, `priorities`; `public/simulator_pasma`, `prevod_testu`, `pozice_soutezicich` |
| 4 | `oblast:dojezdy` | **Dojezdové časy** | Vlastní data a výpočet dojezdu (JDF/PID → graf), API dostupnosti; slouží detailu, simulátoru i stránkám měst | `src/app/dostupnost`, `praha-dostupnost`, `api/dostupnost`, `api/praha-dostupnost`; `scripts/tt_*.py`, `build_transit_graph_v2.py`, `geocode_schools.py`; `data/transit_graph.json`, `school_locations.json`, `public/pid_*`; `docs/dojezdovost-postup.md`, `plan-dojezdovost.md` |
| 5 | `oblast:novinky` | **Novinky ze škol a e-mailový odběr** | Sklízeč zpráv z webů škol (RSS a výpisy aktualit, „Čím školy žijí“), e-mailový odběr termínů a dat, budoucí sledování škol | sklízeč: `scripts/sklizec-novinek.py`, `novinky_*.py`, `skolni-novinky-*.mjs`, `Dockerfile.sklizec` (Railway), `.github/workflows/sklizec-novinek.yml`, `src/lib/skolni-novinky*.ts`, `cim-skoly-ziji.ts`, `api/skoly/[redizo]/novinky`, `admin/skolni-novinky`, `prototyp/cim-skoly-ziji`, `public/skoly_feedy.json`, `skoly_vypisy.json`; odběr: `src/app/novinky/*`, `api/novinky`, `src/lib/novinky-*.ts`, `content/novinky/sablony`, `components/novinky`; `docs/skolske-novinky-rss-2027.md`, `novinky-k-prijimackam-2027.md`, `sledovani-skol-2027.md` |
| 6 | `oblast:veletrhy` | **Veletrhy** | Přehled veletrhů a přehlídek, nahlášení akcí, API návrhů změn, dopisy pořadatelům | `src/app/veletrhy`, `api/veletrhy`, `admin/veletrhy`, `src/lib/veletrhy-*.ts`, `scripts/veletrhy*`, `.github/workflows/veletrhy-snimek.yml`; `docs/veletrhy-*.md` |
| 7 | `oblast:portal` | **Portál pro školy** | Účty škol, pozvánky (vlny), editace profilu, bodování po oborech, administrace portálu | `src/app/pro-skoly/*`, `api/portal*`, `admin/portal`, `src/lib/portal-*.ts`, `scripts/portal*`, `data/portal`, `public/portal_skol.json`; `docs/portal-pro-skoly-2027.md`, `ucty-portalu-skol-2027.md` |
| 8 | `oblast:data` | **Data a termíny** | Převzetí dat (CERMAT, MŠMT rejstřík, DiPSy kritéria, maturita), datová linka a registr sad, kalendář přijímaček 2027 | `scripts/import_*`, `build-*`, `dipsy-*` (22), `stav-datovych-sad.py`; `data/msmt_rejstrik`, `data/linka`; `public/stav_datovych_sad.json`, `cermat_results`, `kriteria_prijeti`, `prijimacky-2027.ics`; `src/app/prijimacky-2027`; `.github/workflows/datova-linka.yml`; `docs/zdroje-dat.md`, `datova-linka.md` |
| 9 | `oblast:inspekce` | **Inspekce ČŠI** | Sklizeň a shrnutí inspekčních zpráv, týdenní CSI workflow, zobrazení inspekcí | `inspekce/`, `data/csi_*`, `inspection_extractions.json`, `inspis_*`; `src/components/SchoolInspections`, `InspectionSummary`; `src/lib/inspekce-aktualnost.ts`; `.github/workflows/csi-weekly-refresh.yml`; `docs/CSI_*`, `INSPIS_*` |
| 10 | `oblast:novinari` | **Pro novináře** | `/pro-novinare`, datové balíčky, kalendář pro novináře, tiskové zprávy a krajské verze | `src/app/pro-novinare`, `src/lib/pro-novinare.ts`, `public/pro-novinare`; `docs/navrh-pro-novinare-2027.md` |
| 11 | `oblast:provoz` | **Provoz, obsah a proces** | Vercel/Actions/náklady/logy, měření (Matomo, Clicky), SEO (sitemap, OG, llms.txt, MD/JSON), statické stránky (o projektu, jak vybrat školu, changelog), hlášení chyb, pravidla GitHubu a CLAUDE.md | `vercel.json`, `next.config.ts`, `.github/workflows/testy.yml` a build, `src/app/o-projektu`, `jak-vybrat-skolu`, `changelog`, `issues`, `api/bug-report`, `src/lib/og-image`, `naklady-vyvoje`, `public/sitemap.xml`, `llms.txt`; `CLAUDE.md`, `.github/ISSUE_TEMPLATE`, `docs/cost-rollout-plan.md`, `seo-audit-2026-09-20.md`, `spoluprace-na-githubu.md` |

**Kontrola chybějících oblastí.** Navržené kandidáty jsem sloučil, ne přidal:
- vyhledávání, katalog, města, kraje a výsledky 2026 → **Vyhledávání a přehledy** (všechno jsou stránky napříč školami nad stejnými daty)
- obsah, SEO, články, changelog a měření → **Provoz, obsah a proces**
- e-mailový odběr → **Novinky**
- veřejné API (`api/schools`, MD/JSON) → podle toho, co vydává; strojové formáty → Provoz
- kritéria přijetí: sběr z DiPSy → Data, zadání školou → Portál, zobrazení → Detail

Varianty pro zúžení: Pro novináře pod Provoz (→ 10 oblastí), Inspekce pod Detail (→ 10). Nedoporučuji to: obě oblasti mají vlastní zdroj a rytmus.

### Kam patří RSS „Čím školy žijí“: vlastní oblast `oblast:novinky`

- **Vlastní pipeline.** Sklízeč na Railway (`Dockerfile.sklizec`), záložní workflow, asi 12 skriptů (`sklizec-novinek.py`, `novinky_klasifikace.py`, `novinky_jev.py` s LLM, `sonda-mimo-rss-*` s TinyFish), tabulky v Neonu (`skolni_novinky`, `sklizen_beh`), moderace v `/admin/skolni-novinky`, registr zdrojů `public/skoly_feedy.json` a `skoly_vypisy.json`, vlastní náklady a vypínač `ZOBRAZIT_VYPISY`.
- **Zobrazení.** Na webu je dnes vidět hlavně na detailu školy (`NovinkySkoly.tsx` v `ProfilSkoly.tsx`). Stránka napříč školami už existuje jako prototyp `/prototyp/cim-skoly-ziji` (`src/lib/cim-skoly-ziji.ts`, zatím mimo index a menu).
- **Podle kritéria vlastníka** (vlastní stránka napříč školami nebo pipeline → vlastní oblast) tedy vlastní oblast. S e-mailovým odběrem ji spojuji proto, že obojí jsou novinky s frontou v Neonu a sdíleným modelem událostí (PR #125 „jeden model události pro všechny zdroje“) a sledování škol je bude spojovat. Detail školy dál zobrazuje jen jejich výstup, stejně jako u dojezdů.

### Kam patří dojezdové časy: vlastní oblast `oblast:dojezdy`

- **Sdílí je tři oblasti:** detail (`skola-profil-data.ts` čte `school_locations`, `/skola/[slug]/pro-me`), simulátor (`simulator-filter.ts`, filtr dojezdu) a přehledy (města).
- **Mají vlastní data a výpočet:** dekodér JDF (`tt_decoder*.py`), graf `transit_graph.json`, geokódování, API s cache (#232) a vlastní dokumentaci.
- Kdyby byly pod jednou z nich, hlášení typu #168 („dojezd ze stanice Biskupcova“) by padala do nesprávné oblasti.

## 3. Projekty a položky podle oblastí

Legenda: **sub** = připojit jako sub-issue (zavřené zůstanou zavřené), **odkaz** = jen odkaz v těle oblasti nebo projektu, **dup** = zavřít jako duplikát s odkazem, **P** = štítek `projekt`.

### 1 Detail školy a oboru (`oblast:detail`)

| Projekt / položka | Akce | Stav na tabuli |
|---|---|---|
| **#244 Obory bez JPZ a nedenní formy 2027** (přejmenovat) | sub oblasti, P | **Schváleno** |
| ├ #209 fáze 1 (closed) → PR #230 | sub #244 | – |
| ├ PR #246 doplněk simulátoru, PR #249 etapa 0 | odkaz v rozcestníku #244 | – |
| ├ #257 nástavby „nový obor“ (closed), #265 apply_matching (closed) | sub #244 | – |
| ├ #224 název oboru místo klíče (open, navrh) | sub #244 (oprava v rámci projektu, schvaluje se zvlášť) | – |
| └ **NOVÝ** „Obory bez JPZ: hlášení škol o chybějících oborech (ověřit po etapě 3)“ | sub #244; jeho sub: #167, #170, #174, #214, #215, #217, #218, #219, #222, #252, #253, #254, #256 | – |
| #258 věta o 2. kole (closed) | sub oblasti, P | Hotovo |
| Hlášení #171, #226, #227, #248, #255 | štítek `oblast:detail` | pohled Hlášení |
| #53 „školní testy“ (duben) | `oblast:detail`; doporučuji zavřít s odkazem na kritéria od škol na stránce oboru (PR #201/#205) | – |
| #216 → dup #215; #228, #229, #251 → dup #227 (stejná SZŠ Beroun) | **zavřít** | – |

Etapy #244 (0 hotová v PR #249, 1 Data, 2 Generátory, 3 Stránky, 4 Slovníky, 5 Simulátor) zůstávají **checklistem** v těle. Každá etapa je jeden PR „Souvisí s #244“, `Closes #244` nese jen etapa 5. Nahoře v #244 bude rozcestník: fáze 1, doplněk #246, etapy, související opravy, hlášení a log změn návrhu (v1.1 52d48abb, v1.2 PR #249).

PR #245 (pravidlo o cizích serverech) patří do Provozu, v #244 zůstane jen odkaz.

### 2 Vyhledávání a přehledy (`oblast:prehledy`)

Otevřené projekty žádné. Odkazy v těle: PR #62/#64 (města s AI texty), #139, #140 (stránka města), #164 (návrh krajské stránky), #165, #166, #190. Uzavřená hlášení z února až května (#13, #33, #57, #63…) jen jako historie, nepřipojovat.

### 3 Simulátor a Kde stojím (`oblast:simulator`)

| Projekt / položka | Akce | Stav |
|---|---|---|
| #199 Test srozumitelnosti (odloženo) | sub, P | Návrh |
| #183, #200, #210 (closed) | sub (bez P, historie) | – |
| **Převzetí podání Radaru** (štítky skupin, řádek čísel, souhrn skupin, filtr typu oboru, posun hranice) | **jen po rozhodnutí vlastníka**: 1 nový projekt s checklistem (body 1–3 = jeden PR, 4, 5), ne 5 issues | Návrh |
| PR #75–#80, #83, #156, #182, #184, #185, #187, #194, #196, #201, #205, #211 | odkaz | – |

### 4 Dojezdové časy (`oblast:dojezdy`)

| Položka | Akce |
|---|---|
| #168 hlášení: dojezd ze stanice Biskupcova | štítek `oblast:dojezdy`, pohled Hlášení |
| #232 cache API dojezdovosti | patří do projektu nákladů → Provoz (viz 11), tady odkaz |
| PR #76 a starší hlášení (#7, #14, #21, #35, #37, #38) | odkaz / historie |

### 5 Novinky ze škol a e-mailový odběr (`oblast:novinky`)

| Položka | Akce | Stav |
|---|---|---|
| #240 Vyhodnotit sklizeň výpisů aktualit (termín 8. 10.) | sub, P | Návrh |
| PR #96, #100–#107 (odběr N1/N2, rozpočet, kouřová zkouška), #121–#138 (sklízeč, Railway), #221, #239 | odkaz | – |

### 6 Veletrhy (`oblast:veletrhy`)

Žádná issues, vše proběhlo přes PR. Odkazy v těle:
- přehled: #155, #161 (review), #162, #163, #173/#175 (rešerše 77 akcí)
- **API návrhů změn: fáze 1–2 PR #176 (26. 9.), fáze 3 + týdenní záloha PR #177 (27. 9.), odkaz na Telegram PR #178**
- mapa a menu: #186, #189

Zpětný uzavřený projekt „Veletrhy: API návrhů změn (fáze 1–3)“ zakládat jen na přání vlastníka. Nový projekt vznikne až s další prací.

### 7 Portál pro školy (`oblast:portal`)

| Položka | Akce | Stav |
|---|---|---|
| #223 Sjednotit texty o zveřejnění kritérií | sub, P | Návrh |
| #225 Bodování po oborech: neuložené změny | sub, P | Návrh |
| #197, #144, #145 (closed) | sub (historie) | – |
| PR #111–#120, #122, #130, #131, #141, #146, #148, #149, #159, #160, #195, #212, #213, #220, #235, #261 | odkaz | – |

### 8 Data a termíny (`oblast:data`)

| Položka | Akce | Stav |
|---|---|---|
| #181 → přejmenovat „Data přijímaček 2027: termíny, kritéria DiPSy, převod TAU“ | sub, P; doplnit body: časy testů od MŠMT (do 15. 1.), kritéria konzervatoří (15.–31. 10.) | Návrh |
| #89 (closed, nova-data) | sub (historie) | – |
| PR #71, #84–#87, #92, #93, #193, #208, #250 | odkaz | – |

### 9 Inspekce ČŠI (`oblast:inspekce`)

| Položka | Akce | Stav |
|---|---|---|
| #259 (closed) | sub, P | Hotovo |
| ├ #266, #271 (closed) | sub #259 | – |
| PR #263, #264, #268, #270, #272 | odkaz (už odkazují) | – |
| PR #269 Weekly CSI refresh (open, bot) | rozhodnout merge, nebo zavření; z tabule zmizí díky filtru `is:issue` | – |

### 10 Pro novináře (`oblast:novinari`)

Odkazy: PR #198, #203, #204. Krajské stránky pro novináře (čeká na ano/ne vlastníka) = při schválení jeden nový projekt.

### 11 Provoz, obsah a proces (`oblast:provoz`)

| Položka | Akce | Stav |
|---|---|---|
| #234 Log drain do BetterStacku (open, schvaleno) | sub, P | Schváleno |
| #231, #232, #233 (closed) | sub, P | Hotovo |
| **NOVÝ projekt** „Pravidla: oblasti, projekty a etapy na GitHubu“ | sub, P; jeden PR s CLAUDE.md a šablonami (kap. 5) | Ke schválení merge po otevření PR |
| PR #179, #180 (build v Actions), #236–#238, #147 (SEO), #153 (Clicky), #206, #207, #241–#243, #245, #247 | odkaz | – |

Oproti předchozí verzi návrhu odpadají noví rodiče B (Simulátor), C (Portál) a F (Vercel). Jejich roli přebírají oblasti a #231–#234 jsou samy projekty.

## 4. Počty

| | Dnes | Po |
|---|---|---|
| Karty na hlavní tabuli | 68 (42 issues + 26 PR), 1 pohled | **Rozpracováno: 13 projektů**. Otevřené: #244, #234 (Schváleno), #181, #199, #223, #225, #240 (Návrh), Pravidla (Ke schválení merge). Hotovo: #258, #259, #231, #232, #233. |
| Oblasti | – | 11 (pohled Oblasti) |
| Hlášení | 24 promíchaných v Návrhu | 20 (po zavření 4 duplikátů): 13 pod podřízeným rodičem v #244, 6 detail, 1 dojezdy |

**Nové issues:** 11 oblastí + 1 podřízený rodič pro hlášení (#244) + 1 projekt Pravidla = **13**. Volitelně projekt Radar a zpětně Veletrhy API.

**Zavřít:** 4 duplikáty (#216, #228, #229, #251), doporučeně i #53. PR #269 podle rozhodnutí.

**Přejmenovat:** #244, #181.

**Nové štítky:** `oblast`, `projekt` a 11× `oblast:<slug>`.

**Přeštítkovat:**
- `oblast` + `oblast:<slug>` na 11 oblastech
- `projekt` na 13 projektech
- `oblast:<slug>` na 13 projektech, 20 hlášeních (včetně #53) a podřízeném rodiči v #244 (34 issues)

**Odebrat štítky:** `navrh` u #234 a #244, která už mají `schvaleno` (dnes mají obojí).

**Propojení sub-issues: 40.**
- detail: 2 přímo + 5 pod #244 + 13 pod podřízeným rodičem
- simulator 4, novinky 1, portal 5, data 2
- inspekce 1 + 2 pod #259
- provoz 5

Limit je 100 sub-issues na rodiče. Starou historii proto do oblastí nepřipojovat, jen odkazovat v těle.

## 5. Změny pravidel a šablon (popis, nic needitováno)

**CLAUDE.md**
- **Úvodní tabulka štítků:** přidat `oblast` (trvalé issue oblasti, nikdy nezavírat, nerealizovat), `oblast:<slug>` (příslušnost; každý projekt a hlášení má právě jeden) a `projekt` (karta na tabuli).
- **Pravidlo 1:** Realizovat lze issue s `interni` + `schvaleno`, nebo etapu či opravu (sub-issue nebo položka checklistu) projektu s `interni` + `schvaleno`, pokud je v jeho schváleném rozsahu. Issue se štítkem `oblast` se nikdy nerealizuje ani nezavírá. Hlášení se nerealizují, dokud nejsou přepsaná do projektu.
- **Pravidlo 2:** Text „Jedno issue = jedna větev = jeden PR“ nahradit:
  - Projekt = jedno issue (sub-issue oblasti) a karta na tabuli.
  - Etapa = checklist v projektu, větev `zadani/<projekt>-etapa-<M>-…`, PR „Souvisí s #<projekt>“. Po merge odškrtnout. `Closes #<projekt>` nese jen poslední PR.
  - Etapa jako sub-issue má PR s `Closes #<etapa>` + „Souvisí s #<projekt>“.
  - Po otevření PR dát projektu `k-overeni` a stav Ke schválení merge (`gh project item-edit`).
  - **Nezakládat nové issue** pro úpravu návrhu, oponenturu, opravu po merge ani další etapu. Úprava návrhu = úprava těla projektu nebo dokumentu v `docs/` + komentář „Změna návrhu vX: co a proč“. Oprava po merge = komentář + PR „Souvisí s #<projekt>“.
  - Nový projekt = nové issue `[Zadání]` se štítky `interni`, `navrh`, `projekt`, `oblast:<slug>`, připojené jako sub-issue oblasti.
- **Pravidlo 8:** Dotaz psát do issue **projektu**. Když zadání spadá pod existující projekt, navrhnout etapu nebo podúkol místo nového issue.
- **Postup přes API** (`gh` 2.46 nemá `--parent` ani `--add-sub-issue`):
  ```bash
  # připojit #CHILD pod #PARENT (sub_issue_id = interní id issue, ne číslo)
  gh api -X POST repos/tangero/stredniskoly/issues/PARENT/sub_issues \
    -F sub_issue_id=$(gh api repos/tangero/stredniskoly/issues/CHILD --jq .id)
  # přesunout pod jiného rodiče: totéž + -F replace_parent=true
  # odpojit:
  gh api -X DELETE repos/tangero/stredniskoly/issues/PARENT/sub_issue \
    -F sub_issue_id=<id>
  # výpis:
  gh api repos/tangero/stredniskoly/issues/PARENT/sub_issues --jq '.[].number'
  ```
  Po aktualizaci na novější `gh`: `gh issue create --parent N`, `gh issue edit N --add-sub-issue M`.

**`.github/ISSUE_TEMPLATE/interni-zadani.yml` + `.github/INTERNAL_TEMPLATES/interni-zadani.md`**
- Výchozí štítky: `interni`, `navrh`, `projekt`.
- Nová pole: **Oblast** (dropdown 11) a **Patří k projektu** (`#N` / „nový projekt“). Formulář neumí podle dropdownu nastavit štítek ani rodiče. Štítek `oblast:<slug>` a připojení k oblasti udělá ten, kdo issue zakládá (Eduarda nebo Claude Code), případně malý workflow.
- Nové sekce: **Etapy** (checklist s PR) a **Změny návrhu** (log verzí).
- Úvodní upozornění: „Patří to k existujícímu projektu? Nezakládejte nové issue, okomentujte projekt.“
- `.md` doplnit o příkazy pro připojení k oblasti (REST výše).

**Ostatní**
- `pripominka.yml`: pole Oblast a Projekt.
- **Nová šablona těla oblasti** (jen `INTERNAL_TEMPLATES/oblast.md`, ne formulář): rozsah, hlavní cesty, aktivní projekty (automaticky z sub-issues), historie (odkazy na PR a dokumenty).
- `tabule-schvaleno.yml`: issue se štítkem `oblast` ignorovat. Etapy (bez štítku `projekt`) se na tabuli můžou přidat, filtr je skryje, takže úprava je volitelná.
- `docs/spoluprace-na-githubu.md`: popsat tři úrovně, pohledy a workflow. Zkontrolovat i zastaralý `docs/github-issues-workflow.md`.

## 6. Nastavení v UI (dělá vlastník; pohledy přes API nastavit nejdou)

Projekt: https://github.com/users/tangero/projects/1

1. **Workflows → Auto-add to project:** filtr změnit z `is:issue,pr is:open` na `is:issue is:open`. PR už nebudou samostatné karty a na kartě projektu je ukáže pole Linked pull requests.
2. **Workflows → Auto-add sub-issues to project: vypnout.** Nové issues přidá už bod 1 a při hromadném připojování by se jinak na tabuli dostaly i staré uzavřené issues.
3. **Workflows → Item closed (→ Hotovo), Pull request merged, Item added (→ Návrh):** ponechat.
4. **„Pull request linked to issue“ nechat vypnuté.** PR etap se k projektu přes closing keyword nepropojí, takže by nepomohl; stav Ke schválení merge nastavuje Claude Code. „Auto-close issue“ také nechat vypnuté.
5. **Volitelně Workflows → Auto-archive items:** `is:closed updated:<@today-14d`.
6. **Pohled „Rozpracováno“:** přejmenovat stávající „Tabule“ (Board), filtr `is:issue label:projekt`, sloupce podle Status. Volitelně na kartě zobrazit Parent issue (= oblast), Sub-issues progress a Linked pull requests.
7. **Nový pohled „Oblasti“** (Table): filtr `label:oblast`, sloupce Title, Sub-issues progress, Labels; bez Status.
8. **Nový pohled „Hlášení“** (Table): filtr `is:open label:portal-skoly,bug-report,feature-request`, Group by Labels nebo Parent issue.
9. **Volitelně pohled „Nezařazené“** (Table): `is:issue is:open no:parent-issue -label:oblast,projekt,portal-skoly,bug-report,feature-request`. Zachytí nové issues bez oblasti.
10. **Volitelně PR karty (26)** archivovat (Archive, vratné). Filtr je skryje i bez toho.

Filtr `no:parent-issue` / `has:parent-issue` je podle dokumentace a blogu GitHubu, ale v UI jsem ho neověřil. Hlavní pohledy proto stojí na štítcích.

## 7. Pořadí realizace (po schválení)

1. Založit štítky (13).
2. Založit 11 oblastí, podřízeného rodiče v #244 a projekt Pravidla.
3. Nastavení UI body 1–2 (před připojováním).
4. Připojit 40 sub-issues přes REST.
5. Přeštítkovat a přejmenovat #244 a #181. Do těla #244 dát rozcestník.
6. Zavřít 4 duplikáty s odkazem.
7. Pohledy, body 6–10.
8. PR s CLAUDE.md, šablonami a dokumentací (projekt Pravidla).

## 8. Best practices a jak je aplikujeme

| Doporučení (zdroj) | U nás | Stav |
|---|---|---|
| Rozpad práce na **sub-issues**, víc úrovní, průběh u rodiče; projekt filtruje a seskupuje podle rodiče ([Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects), [Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues), [GA 9. 4. 2025](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)) | Oblast → projekt → etapa (max. 8 úrovní, 100 podúkolů na rodiče) | Zavedeme |
| Víc pohledů nad jedním projektem ([About Projects](https://docs.github.com/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects), [Filtering projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects)) | Rozpracováno / Oblasti / Hlášení (/ Nezařazené) | Zavedeme |
| Vestavěné workflow s filtrem auto-add, archivace ([Built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations), [Adding items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)) | Auto-add jen issues, vypnout auto-add sub-issues, volitelně archivace | Upravíme |
| Actions tam, kde vestavěné nestačí (Best practices) | `tabule-schvaleno.yml` | Dodržujeme |
| Closing keywords, jen při merge do výchozí větve ([Linking a PR](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)) | `Closes` jen poslední PR projektu; etapy „Souvisí s“ (bez propojení, stav nastaví Claude Code) | Částečně |
| Epic = kontejner, dodávky = malé kusy ([Atlassian: Epics, stories, initiatives](https://www.atlassian.com/agile/project-management/epics-stories-themes)); práce dělená na pojmenované části uvnitř projektu ([Shape Up: Map the Scopes](https://basecamp.com/shapeup/3.3-chapter-12)) | Oblast ≈ iniciativa (trvalá), projekt ≈ epic, etapa ≈ scope/PR | Zavedeme |
| Issue types ([Managing issue types](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-types-in-an-organization)) | Jen pro organizace (náš repo je osobní, `issueTypes: null`) → štítky `oblast`/`projekt` | Nepoužitelné |
| Milestones ([About milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)) | Termíny drží #181 a připomínky | Nezavádět |
| Sub-issues přes REST ([REST sub-issues](https://docs.github.com/en/rest/issues/sub-issues)) | `gh` 2.46 nemá příznaky → REST (kap. 5) | K řešení |

## 9. Rozhodnutí vlastníka (s doporučením)

1. **Seznam 11 oblastí** včetně `prehledy` (vyhledávání, města, kraje, výsledky) a `novinky` (RSS + e-mailový odběr). **Doporučuji schválit, jak je.**
2. **RSS spolu s e-mailovým odběrem**, nebo dvě oblasti? **Doporučuji spolu** (sdílený model událostí, budoucí sledování škol).
3. **Duplikáty #216, #228, #229, #251 a #53 zavřít** s odkazem. **Doporučuji ano.**
4. **Projekt „Převzetí podání Radaru“** založit hned, nebo až po výběru bodů? **Doporučuji až po tvém výběru**, jako jeden projekt.

Ostatní (pořadí realizace, UI kroky) jsou technické a proběhnou po schválení. Volitelné: zpětný projekt Veletrhy API, archivace PR karet.

## Poznámky mimo zadání

- Veřejné issue #53 obsahuje e-mail nahlašovatele (řádek „Kontakt:“). Doporučuji upravit tělo.
- Repozitář obsahuje `.github/workflows/auto-fix-issues.yml` a `auto-fix-iterative.yml`. Při zavedení oblastí ověřit, že nereagují na issues se štítkem `oblast` (nebyly předmětem auditu).
