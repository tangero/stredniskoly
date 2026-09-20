# Code review PR #134

Code review PR #134 — commit `a8a5ad7adc8b48b926867560be6a908c65ab3587`.

**Výslovně souhlasím s merge. Nenašel jsem blokující chybu změny.** Zrušení plánu v Actions nyní splňuje podmínku z review PR #133; náhradní služba má plán a doložený úspěšný běh. Jedna níže uvedená připomínka k přesnosti dokumentace je neblokující.

Nezávislé provozní ověření přes read-only Railway API:

- Služba `sklizec` v projektu `stredniskoly-sklizec`: `cronSchedule = "10 4,14 * * *"`, `nextCronRunAt = 2026-09-21T04:10:00.000Z`, `restartPolicyType = NEVER`, `ipv6EgressEnabled = true`.
- `DATABASE_URL` je přítomná (její hodnotu jsem nevypisoval). `JEN`, `SKLIZEC_LIMIT` a `SKLIZEC_HLIDAC` nejsou nastavené, takže nezůstává zkušební omezení počtu škol ani obejití hlídače.
- Log deploymentu `a72ef6f4-3993-415f-ad73-bcafe28d327a` potvrzuje 20. 9. v 18:29 UTC export stavu 533 zdrojů, sklizeň jednoho zdroje bez chyby s 10 položkami a dokončený zápis jednoho úspěšného zdroje. Tabulku `sklizen_beh` jsem samostatným SQL dotazem nečetl; potvrzení zápisu je z logu zapisovače.

Kontrola změny:

- `railway.json` je validní JSON, zachovává Docker builder i existující `Dockerfile.sklizec` se správným startovacím skriptem.
- Workflow je validní YAML, má pouze `workflow_dispatch`, zachovává export stavu, zápis dávky a ochranu proti souběhu ručních Actions běhů.
- `git diff --check` prošel. GitHub kontroly Pythonu, TypeScriptu, integrace katalogu a GitGuardian jsou zelené.
- Runtime kód se nemění, proto jsem neopakoval celou aplikační testovou sadu ani Docker build. Vercel status tohoto PR je FAILURE; příčinu tohoto konkrétního deploymentu jsem neověřoval.

**Neblokující P3 — nepovyšovat pozorování konkrétní služby na obecný zákaz config-as-code.** Text na řádku 285 tvrdí, že plán v `railway.json` „nemůže být“, a totéž vztahuje na restart policy. Oficiální [Railway Config as Code reference](https://docs.railway.com/config-as-code/reference) však obě položky výslovně popisuje jako podporované; zároveň vysvětluje, že konfigurace deploymentu nepřepisuje hodnoty v dashboardu. `nextCronRunAt = null` je důležitý provozní signál, ale sám nedokazuje univerzální nepodporu obou polí. Popsat raději konkrétní pozorování a zvolený workaround: u této služby po nasazení nebyl další běh naplánovaný, proto plán a restart policy spravujeme přes service settings a ověřujeme API. Funkčnost současné konfigurace přes service settings tím nezpochybňuji.

Souhlas je zapsán jako COMMENT, protože přihlášený účet je současně autorem PR a GitHub neumožňuje formální APPROVE vlastního PR. Merge jsem neprovedl; konfiguraci služby ani produkční data jsem neměnil.
