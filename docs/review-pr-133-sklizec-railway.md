# Code review PR #133

Code review PR #133 — commit `c17bc75193ea1fc93c12c44aa290c2ddbd074dad`.

**Verdikt: před sloučením doporučuji vyřešit dva provozní nálezy níže.**

- **P1 — Vypnutí původního plánu před dokončením přepnutí.** Popis PR výslovně uvádí, že službě na Railway ještě chybí `DATABASE_URL`. Nový skript bez ní okamžitě skončí s kódem 1. Pokud se PR sloučí v tomto deklarovaném stavu, zmizí automatický trigger v Actions a náhradní běh nic nesklidí. Ponechat původní plán do konfigurace Railway a doloženého úspěšného běhu se zápisem do `sklizen_beh`; teprve pak přepnout plán. Jde o podmínku nasazení vycházející z popisu PR, nikoli o nezávislé ověření aktuálních Railway secrets.
- **P2 — Chybí celkový časový limit běhu.** Původní job měl `timeout-minutes: 30`, nový shell ani Railway konfigurace obdobný limit nemají. `requests.get(timeout=20/45)` neomezuje celkovou dobu stahování: server posílající průběžně malé části odpovědi může držet worker neomezeně. `as_completed()` pak čeká na dokončení všech zdrojů a nedojde ani k zápisu dávky. Railway běžící cron automaticky neukončuje a následující termíny při stále aktivní úloze přeskakuje. Přidat celkový deadline nad všemi třemi kroky, který ukončí také potomky a vrátí chybu; limit zvolit s rezervou nad změřených 26 minut. Viz [Railway: požadavky na ukončení cron úloh](https://docs.railway.com/cron-jobs#service-execution-requirements).

Ověření:

- `bash -n scripts/sklizec-beh.sh` prošel.
- 52 testů `test_rss_klasifikace.py` a 23 testů `skolni-novinky*.test.mjs` prošlo.
- Šest izolovaných scénářů shellu se zástupnými příkazy prošlo: chybějící DB, celý běh, `JEN=2`, selhání exportu, sklizně a zápisu; ověřeno zastavení dalších kroků a návratový kód.
- Skutečná funkce `stahni_feed` proti lokálnímu HTTP serveru dokončila pomalu dávkovanou odpověď i s `timeout=0.1 s`, ačkoli samotné dávkování trvalo přes 0.5 s. Potvrzuje, že timeout není celkový deadline.
- Parametry Railway odpovídají [dokumentaci konfigurace](https://docs.railway.com/config-as-code/reference). Cron zachovává 04:10 a 14:10 UTC.

Omezení: Docker build neproběhl, protože lokální Docker daemon není dostupný. JS testy běžely na místním Node 24.1.0 se stávajícími závislostmi, nikoli v cílovém Node 22 obrazu. Produkční databázi ani konfiguraci Railway jsem neměnil a end-to-end zápis do ní neprováděl. GitHub testové kontroly jsou zelené, stav Vercel deploymentu je FAILURE; příčinu jsem neověřoval a nepřisuzuji ji této změně.

Review posílám jako COMMENT, protože přihlášený účet je současně autorem PR a GitHub u vlastního PR nepovoluje REQUEST_CHANGES.


## Následná kontrola oprav

Následná kontrola commitu `dc6aad950e4aa80c3f1fc3f1db585157bdfff609`: **oba původní nálezy P1 a P2 považuji za vyřešené; z hlediska tohoto code review souhlasím s merge.**

- P1: oba cron triggery v Actions jsou obnovené. Je výslovně popsáno, že se odstraní až po doložené úspěšné sklizni na Railway.
- P2: celý skript se při dostupném GNU timeout znovu spustí pod hlídačem s limitem 45 minut a eskalací na KILL po dalších 60 sekundách. Nepoužívá `--foreground`, takže se hlídání vztahuje i na procesní skupinu. Soubor má v Gitu executable bit, který re-exec potřebuje. Fallback pro místní macOS bez timeoutu varuje a neblokuje běh; pro deklarovaný Debian image to není překážka merge.

Nezávisle ověřeno: `bash -n` a 15 izolovaných scénářů skutečného skriptu (bez hlídače, s náhradním `gtimeout`, s náhradním `timeout`; pro každý chybějící DB, úspěch a chyba v každém ze tří kroků). Ověřeny argumenty hlídače, re-exec, pořadí kroků, `JEN=2`, ukončení při chybě a priorita `timeout` před `gtimeout`. Samotné skutečné časování a zabití potomků jsem zde znovu neměřil — GNU timeout ani Docker daemon nejsou lokálně dostupné; v tomto bodě vycházím z kontroly implementace a doloženého testu autora.

GitHub testy a bezpečnostní kontrola aktuálního commitu jsou zelené. Vercel deployment stále hlásí FAILURE; jeho příčinu ani produkční Docker build toto review nepotvrzuje.

Při následném doplnění `DATABASE_URL` koordinovat první Railway běh s vypnutím Actions plánu: tvrzení, že nemůže nastat dvojí sklizeň, platí pouze po dobu chybějícího připojení.

Zapsáno jako COMMENT, protože přihlášený účet je zároveň autorem PR a vlastní PR nemůže formálně schválit. Merge jsem neprovedl. Rozpracovaná pracovní kopie `.claude/worktrees/skolni-novinky` nebyla změněna; kontrola proběhla v odděleném review worktree.
