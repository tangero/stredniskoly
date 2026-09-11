# Přístup k Vercel Web Analytics

Verze 1.1 / R2, ověřeno 11. 9. 2026. Stav: projekt a integrace ověřeny; čtení statistik čeká na přihlášení nebo export. Žádné naměřené hodnoty Vercelu dosud nepřevzaty.

## Správný projekt

- [Dashboard](https://vercel.com/tangeros-projects/stredniskoly/analytics?period=30d)
- Tým: `tangeros-projects`, `team_6pc2wHKjeUuaXwZfCS3jOhvX`.
- Projekt: `stredniskoly`, `prj_Yh3UGtfELluIwvXazLyVxF5JIPsD`.
- Veřejná doména: `www.prijimackynaskolu.cz`.

Identita ověřena přes MCP `vercel_get_project`. Místní `.vercel/project.json` původně mířil na `gymnazium`; při R2 byl opraven na výše uvedené ID po novém ověření konektorem. Soubor zůstává ignorovaný Gitem. Před nasazením znovu ověřit identitu i případné lokálně stažené prostředí; samotná oprava JSON nepřepíná vzdálené prostředí. Čtení metadat projektu přes konektor není přístupem k analytickým reportům. Token Matomo nepoužívat pro Vercel.

## Jednorázové čtení a export

Po přihlášení otevřít dashboard, zvolit Production, požadovaný hostname a explicitní datum. Pro první srovnání navrhujeme 12. 8.–10. 9. 2026 včetně, s ověřením časového pásma a dostupného retenčního okna. Zapsat přesné filtry, hranice a čas pořízení. Převzít celková zobrazení a návštěvníky, denní vývoj, Pages, Devices a Referrers; u každého panelu zaznamenat vybranou metriku.

CSV je v nabídce tří teček panelu → Export as CSV, nejvýše 250 řádků. Surové soubory ukládat soukromě mimo repozitář; do dokumentace jen kontrolovaný souhrn a kontrolní součet. Limity a výklad porovnání jsou v [analýze §10](analyza-navstevnosti-2026.md#10-vercel-web-analytics-jako-druhý-zdroj).

## Rutinní programové čtení — možné, zatím nenastavené

Vercel poskytuje veřejné Web Analytics API od 18. 5. 2026. Používá agregovaná data dashboardu, prostředky `visits` a `events`, dotazy `count` a `aggregate`. Pro časově omezený pravidelný přehled použít agregaci s explicitními hranicemi, metrikou, projektem a týmem; nespoléhat na výchozí rozsah. Přístup a dostupnost historie závisejí na účtu a jeho tarifu.

Existuje i současný příkaz `vercel metrics`; místní CLI 49.1.2 je starší a dotaz `vercel api --help` zobrazil jen obecnou nápovědu deploy. `vercel whoami` potvrdilo chybějící přihlášení. Nebyla provedena instalace, přihlášení, vytvoření tokenu ani změna oprávnění. Před automatizací zajistit funkční autorizaci přes běžný přihlašovací postup nebo samostatný token uložený mimo Git; nevepisovat tajemství do URL, výpisů ani dokumentace. Neextrahovat token z konektoru či cookies prohlížeče.

Po zpřístupnění ověřit první report proti stejným filtrům dashboardu a teprve pak zavést rutinu. Matomo má již hotový [ověřený klient a postup](matomo-pristup.md); tento dokument nezaměňuje dostupnost API za dokončený přístup.

## Primární zdroje

- [Oznámení veřejného API](https://vercel.com/changelog/web-analytics-api)
- [API, definice a parametry](https://vercel.com/docs/analytics/web-analytics-api)
- [Čtení metrik přes CLI](https://vercel.com/docs/analytics/accessing-metrics-with-vercel-cli)
- [Filtry a CSV export](https://vercel.com/docs/analytics/using-web-analytics)


## R2: hlášená 404 a diagnostika

Oponent hlásí `404 — Web Analytics not found` při fungujícím dashboardu. Chybí přesná adresa/verze endpointu, parametry, čas a netajná odpověď, takže tato chyba nebyla zde nezávisle reprodukována. Není důkazem, že účet nutně vyžaduje vyšší tarif. Oficiální návod výslovně uvádí dostupnost Web Analytics přes `vercel metrics` bez Observability Plus.

Po autorizaci nejprve ověřit účet/tým/projekt, přesný podporovaný endpoint a parametry; pak dostupné schéma/rozsah historie a shodný filtr v dashboardu. Při chybě uchovat HTTP status, kód a čas bez tokenu; nevytvářet domnělou diagnózu podle samotné 404. Ruční CSV je dočasná cesta. Bez tohoto ověření nedoporučovat nákup tarifu.

## R2: runtime logy nejsou totéž jako Web Analytics

`vercel_get_runtime_logs` vrací stručný výpis bez UA/refereru. [Detail požadavku v dokumentaci](https://vercel.com/docs/logs/runtime#log-details) však uvádí Request User Agent. Ověřit skutečné pole v dashboardu, možnost exportu/drainu a rozsah sběru; pole může být zjednodušený název prohlížeče, nemusí být dostatečné pro klasifikaci. Dostupnost refereru zde nebyla potvrzena. Souběžné hlášení o BetterStacku tvrdí absenci UA i ve vzorku drainu; tuto službu tato práce nekontrolovala.

Nový vzorek MCP obsahuje i statické HIT, takže všechny platformní logy nelze vydávat za záznamy jen proběhlých handlerů. Vlastní logování uvnitř cachované routy naopak kompletní CDN provoz nepokrývá. Vyhodnocení nuly musí zahrnout veřejné rewrite adresy, limity, období a pokrytí logu.

Historie: v1.0 zachována ve snímku R2; v1.1 zpřesňuje doložený stav přístupu, opravuje místní identitu a odlišuje výpis konektoru od detailu zdroje. Důkazy a dispozice jsou v návrhu rozvoje §13, O-17/O-18.
