# Návrh: logování strojově čitelných endpointů

Verze 1.2. Zpracováno 11. 9. 2026. **Stav: návrh z velké části odpadá** — Log Drain do BetterStacku poskytuje všechna potřebná pole, viz 1.3. Zůstává konfigurace dotazu, nikoli vývoj.

**Změna proti 1.1:** ověřen strojový export z BetterStacku. Obsahuje `user_agent` i `referer`, takže vlastní logovací modul není potřeba. Sekce 4 a 5 ponechány jako historie pro případ, že by drain přestal vyhovovat.

**Účel.** Zjistit, zda a jak AI crawlery a nástroje stahují strojově čitelná data webu. Matomo to nevidí, protože crawler nespouští JavaScript. Analýza návštěvnosti tuto mezeru označila za nezodpovězenou otázku.

**Rozsah.** Tři endpointy uvedené v `/llms.txt` a povolené v `/robots.txt`:

- `/skola/{slug}.md` → `/api/skola/{slug}/md`
- `/skola/{slug}.json` → `/api/skola/{slug}/json`
- `/api/schools/search`

Zbytek webu se neloguje.

---

## 1. Dvě překážky, které návrh určují

### 1.1 Endpointy jsou cachované, takže většina požadavků kód nespustí

**OVĚŘENO** dvěma požadavky na produkci:

```
cache-control: public, max-age=86400
x-vercel-cache: HIT
age: 814
```

Oba soubory profilu mají `export const revalidate = 86400`. Odpověď obsluhuje CDN Vercelu a serverová funkce se nevolá. **Logování uvnitř route handleru tedy zachytí pouze MISS, nikoli skutečný počet stažení.**

Důsledek pro interpretaci: naměřená čísla budou **spodní odhad**. To je přijatelné pro odpověď na otázku „chodí sem crawlery vůbec?“, ale nelze z nich dělat statistiku objemu.

Cache nedoporučuji kvůli měření vypínat. Ušetřený výpočet je cennější než přesné počítání a vypnutí by zvýšilo náklady u provozu, který chceme teprve změřit.

### 1.2 Runtime logy Vercelu existují, ale mají krátkou retenci a neobsahují user agent

**Oprava proti první verzi tohoto odstavce.** Původně jsem uvedl, že logy jsou prázdné. To bylo způsobeno dotazem na nesprávný projekt: lokální `.vercel/project.json` ukazuje na projekt `gymnazium` (`prj_45cAL…`), zatímco produkce běží pod projektem **`stredniskoly`** (`prj_Yh3UG…`), na kterém jsou navěšené domény `prijimackynaskolu.cz`. Tuto neshodu je vhodné narovnat nezávisle na logování, protože svádí k chybným závěrům.

**OVĚŘENO** na správném projektu. Logy existují a jsou užitečné. Za poslední hodinu 771 různých cest, nejvytíženější:

| Cesta | Požadavků za hodinu |
|---|---:|
| `/api/schools/search` | 159 |
| `/` | 145 |
| `/prijimacky-2027` | 138 |
| `/skoly` | 111 |
| `/simulator` | 102 |

Jednotlivý záznam vypadá takto:

```
### 09:10:15 GET /api/schools/search 200 [info/serverless]
dep=dpl_2yPr8… branch=main cache=MISS
```

Dvě zásadní omezení pro náš účel:

1. **Záznam neobsahuje user agent ani referer.** Nese čas, metodu, cestu, status, zdroj a stav cache. Klasifikaci agenta, tedy jádro celého měření podle sekce 3, z těchto logů **nelze získat**.
2. **Retence je krátká.** Hobby 1 hodina, Pro 1 den. Pro vyhodnocovací okno v řádu měsíců (sekce 6) nepoužitelné bez odvádění dat jinam.

**Závěr pro návrh se nemění, ale zpřesňuje se zdůvodnění.** Vlastní logování je potřeba kvůli user agentu, nikoli kvůli neexistenci logů. Runtime logy Vercelu přitom mají vlastní hodnotu jako okamžitá diagnostika a lze je číst i bez implementace čehokoli.

**Zjištění při ověřování.** Za sledovanou hodinu nepřišel na `/api/skola/` **ani jeden požadavek**, zatímco vyhledávání mělo 159. Jde o jeden vzorek v mimosezónní době, takže z něj nelze dělat závěr. Je to ale první náznak odpovědi na otázku 1 ze sekce 6 a stojí za připomenutí, že tyto endpointy mohou být nevyužívané.

### 1.3 Log Drain do BetterStack: nasazeno a ověřeno — ŘEŠÍ VŠE

**OVĚŘENO 11. 9. 2026** rozborem exportu NDJSON z BetterStacku (zdroj `stredniskoly`, okno 9.–11. 9. 2026).

> **Oprava dřívějšího závěru.** Z náhledu v rozhraní jsem usoudil, že drain neposílá user agent. To bylo **nesprávné**; rozhraní jen zobrazuje vybraná pole. Strojový export obsahuje **43 polí** včetně `vercel.proxy.user_agent` a `vercel.proxy.referer`.

Podstatná pole z exportu:

| Pole | Příklad |
|---|---|
| `vercel.proxy.user_agent` | `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)` |
| `vercel.proxy.referer` | `https://www.prijimackynaskolu.cz/skoly` |
| `vercel.proxy.path` | `/skola/600010414-gymnazium-skolni.md` |
| `vercel.proxy.status_code` | `200`, `500` |
| `vercel.proxy.vercelCache` | `MISS` / `HIT` |
| `vercel.proxy.pathType` | `edge`, `streaming_func`, `background_func` |
| `vercel.proxy.client_ip` | IP adresa klienta |
| `vercel.proxy.method`, `host`, `region`, `lambdaRegion` | doplňkový kontext |

**Závěr: vlastní logovací modul není potřeba.** Drain nese vše, co sekce 2 požadovala, a navíc stav cache a typ cesty. Klasifikaci agenta podle sekce 3 lze provést až při dotazu v BetterStacku, tedy bez zásahu do aplikace. Sekce 4 (kam ukládat) a sekce 5 (návrh implementace) tím **pozbývají účelu**.

Doklad, že to funguje i pro sledovaný účel: v malém vzorku je zachyceno stažení `/skola/…​.md` i návštěva `facebookexternalhit`, tedy přesně ty případy, kvůli kterým měření vzniklo.

**Zbývající práce** se mění z implementace na konfiguraci:

1. V BetterStacku připravit uložený dotaz nad `vercel.proxy.path` a `vercel.proxy.user_agent` s klasifikací podle sekce 3.
2. Ověřit retenci zvoleného tarifu; vyhodnocovací okno podle sekce 6 je nejméně měsíc.
3. Zvážit alert na neobvyklý objem u `/api/skola/`.

Odhad práce klesá z jednoho člověkodne na **1 až 2 hodiny konfigurace**.

**Upozornění k osobním údajům.** Drain ukládá `client_ip`, což sekce 2 záměrně nechtěla. Tím se logy dostávají do režimu osobních údajů, i když jde o standardní serverové logy. Je vhodné nastavit v BetterStacku přiměřenou dobu uchování a zmínit serverové logy v zásadách zpracování.

**Vedlejší nález.** Tentýž export odhalil, že `facebookexternalhit` dostával u náhledového obrázku HTTP 500. Vada je popsána jako O-19 v oponentuře a byla opravena odstraněním `runtime = 'edge'` ze tří generátorů.

### 1.4 Vercel Web Analytics: zapnuté, ale přes API nedostupné

Web Analytics na projektu **běží** a v rozhraní Vercelu zobrazuje data (za posledních 7 dní 687 návštěvníků, 3 215 zobrazení, bounce 47 %).

**OVĚŘENO:** dotaz přes API na správný projekt `prj_Yh3UG…` přesto vrací `404 Not Found — Web Analytics not found`, a to jak v režimu souhrnu, tak agregace. Přístup k projektu přitom mám, jiné dotazy na tentýž projekt fungují.

Nejpravděpodobnější vysvětlení je, že čtení Web Analytics přes API vyžaduje vyšší úroveň (Observability Plus / Analytics Plus), zatímco rozhraní ukazuje základní verzi. Nabídka projektu obsahuje volbu **Upgrade to Plus**, což tomu odpovídá. Nejde tedy o chybu v nastavení.

**Důsledek pro spolupráci.** Do Web Analytics zatím **nevidím programově**; čísla z něj je nutné předávat ručně, například snímkem obrazovky. Pro rozbory proto zůstává hlavním zdrojem Matomo, kde mám přístup přes API.

Za pozornost stojí, že Vercel i Matomo měří odlišně. Vercel ukazuje bounce 47 %, Matomo za delší období 71 %. Rozdíl plyne z jiné metodiky a z jiného období; obě čísla mohou být správná. Pro srovnávání v čase je nutné držet se jednoho zdroje.

---

## 2. Co ukládat

Minimální množina, která odpoví na položené otázky a nezavádí zbytečné osobní údaje:

| Pole | Zdroj | Účel |
|---|---|---|
| `ts` | čas requestu | Časová řada, sezónnost |
| `path` | cesta bez query | Který formát se stahuje |
| `format` | `md` / `json` / `search` | Zjednodušení analýzy |
| `slug` | parametr routy | Které školy zajímají modely |
| `status` | 200 / 404 | Odhalí odkazy na neexistující školy |
| `ua_class` | klasifikace user agentu | **Hlavní sledovaný údaj** |
| `ua_raw` | user agent, zkrácený na 200 znaků | Doklad klasifikace, ladění |
| `referer` | hlavička | Odliší proklik od crawleru |
| `cache` | `x-vercel-cache`, je-li dostupné | Kontext k bodu 1.1 |

**Co neukládat.** IP adresu ani její hash, cookies, nic, co identifikuje osobu. Cílem je poznat *stroj*, ne návštěvníka. Tím se celá věc vyhne režimu osobních údajů a nevyžaduje souhlas ani zápis do zásad zpracování.

Poznámka k odlišnému řešení v `3gpp-explorer2`: tamní `api_usage_log` ukládá i surovou IP a CF-Ray, ale s jiným účelem (bezpečnostní logování a podklad pro monetizaci API). Zde takový účel není, proto navrhuji užší množinu.

---

## 3. Klasifikace agenta

Jádro celého měření. Návrh minimální tabulky, kterou lze snadno rozšiřovat:

| Třída | Rozpoznání podle user agentu |
|---|---|
| `ai-crawler` | `GPTBot`, `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `Google-Extended`, `CCBot`, `Bytespider`, `Applebot-Extended` |
| `ai-fetch` | `ChatGPT-User`, `Claude-User`, `Perplexity-User` — načtení na přímý pokyn uživatele, nikoli plošné procházení |
| `search-crawler` | `Googlebot`, `Bingbot`, `Seznam` |
| `browser` | obsahuje `Mozilla` a neodpovídá výše uvedenému |
| `other` | vše ostatní, včetně prázdného user agentu |

**Rozlišení `ai-crawler` a `ai-fetch` je podstatné.** První znamená, že model si obsah bere do znalostí. Druhý, že se někdo právě teď ptá na konkrétní školu. Pro produktové rozhodnutí jde o dvě různé informace.

**Upozornění na spolehlivost.** User agent lze podvrhnout. Pro naši otázku to nevadí, protože nic neblokujeme ani nepodmiňujeme. Kdyby se logování mělo použít k omezování přístupu, bylo by nutné ověřovat identitu botů zpětným DNS nebo podle publikovaných rozsahů IP, jak to řeší `3gpp-explorer2`.

---

## 4. Kam ukládat

Projekt dnes nemá databázi; veškerá data jsou v JSON souborech. Zavádět kvůli měření databázi je nepřiměřené. Tři varianty:

| Varianta | Pro | Proti | Vhodnost |
|---|---|---|---|
| **A. Vercel KV / Redis** | Nejjednodušší zápis, denní agregace jako čítače | Další placená služba, nutný úklid klíčů | Dobrá, pokud stačí počty |
| **B. Externí tabulka (Supabase, Turso, D1)** | Plný záznam, dotazovatelné, zdarma v malém objemu | Nová závislost a tajemství v prostředí | Nejlepší poměr, doporučeno |
| **C. Zápis do GitHub issue / souboru** | Žádná nová služba, projekt už `GITHUB_TOKEN` používá | Nevhodné pro častý zápis, riziko konfliktů | Nedoporučeno |

**Doporučení: varianta B**, konkrétně jedna tabulka v Turso nebo Supabase. Objem je malý: i kdyby crawlery stahovaly stovky profilů denně, jde o jednotky tisíc řádků měsíčně, což se vejde do bezplatných úrovní.

**Fallback při výpadku úložiště.** Logování nesmí nikdy shodit odpověď uživateli. Zápis proto musí být neblokující a jeho selhání se pouze zaznamená do konzole. Tato zásada je nepřekročitelná: měření provozu nikdy nesmí zhoršit dostupnost obsahu.

---

## 5. Návrh implementace

Jeden sdílený modul volaný ze tří míst. Návrh rozhraní:

```ts
// src/lib/usage-log.ts
type UsageEvent = {
  format: 'md' | 'json' | 'search';
  slug?: string;
  status: number;
  userAgent: string | null;
  referer: string | null;
};

export function logUsage(event: UsageEvent): void;
// Nikdy nevyhazuje výjimku. Volá se bez await.
// Bez nastavené proměnné prostředí zapisuje pouze do konzole.
```

Volání v každém ze tří handlerů, hned před vrácením odpovědi:

```ts
logUsage({
  format: 'md',
  slug,
  status: 200,
  userAgent: request.headers.get('user-agent'),
  referer: request.headers.get('referer'),
});
```

**Nutná změna v obou profilových routách.** Dnes mají podpis `(_request: NextRequest, …)`, tedy request nepoužívají. Je nutné jej začít používat kvůli hlavičkám. Změna je mechanická.

**Přepínač.** Řídit proměnnou prostředí, například `USAGE_LOG_URL`. Není-li nastavená, modul jen tiše zapíše do konzole a nic neodesílá. Umožní to nasadit kód dřív, než je úložiště hotové, a kdykoli měření vypnout bez nasazení.

---

## 6. Co z toho chceme zjistit

Otázky, na které má měření odpovědět, seřazené podle důležitosti:

1. **Chodí AI crawlery na strojové formáty vůbec?** Pokud za měsíc nepřijde ani jeden `ai-crawler`, byla investice do `.md` a `.json` zbytečná a `llms.txt` nikdo nečte. To je samo o sobě cenný výsledek.
2. **Převažuje `ai-crawler`, nebo `ai-fetch`?** Rozhoduje, zda optimalizovat pro trvalé znalosti modelu, nebo pro okamžitý dotaz uživatele.
3. **Stahují se `.md`, `.json`, nebo ani jedno a modely čtou HTML?** Pokud crawlery ignorují oba formáty a chodí na HTML profily, je správnou investicí strukturovaná data přímo ve stránce, nikoli oddělené formáty.
4. **Které školy se stahují?** Ukáže, zda zájem kopíruje návštěvnost lidí, nebo míří jinam.
5. **Kolik je 404?** Odhalí, že modely odkazují na neexistující slugy, tedy že mají zastaralou představu o struktuře webu.

**Vyhodnocovací okno.** Nejméně jeden měsíc, ideálně do února 2027, aby zahrnulo začátek sezóny. Dřívější závěry by byly předčasné.

---

## 7. Pracnost a pořadí

| Krok | Rozsah |
|---|---|
| **Nejprve:** prověřit Log Drain, zda umí požadavkové logy s user agentem | 1 hodina |
| Narovnat `.vercel/project.json` na projekt `stredniskoly` | 15 minut |
| Modul `usage-log.ts` s klasifikací | 2–3 hodiny |
| Zapojení do tří routes | 1 hodina |
| Zřízení úložiště a tajemství | 1–2 hodiny |
| Jednoduchý přehled nebo ruční dotaz | 2–4 hodiny, lze odložit |

Celkem zhruba **jeden člověkoden** bez přehledu, půldruhého s ním. Pokud by Log Drain uměl předat user agent, odpadla by většina této práce; proto je zařazen jako první krok.

**Zařazení do plánu.** Podle analýzy návštěvnosti zbývá do začátku sezóny asi sedm týdnů a balíky A až C je vyplní téměř celé. Toto měření **nemá přednost před opravou simulátoru** (O-13), která je produkčním blokátorem.

Doporučené pořadí: nasadit logování až po S0, ale **před listopadem**, aby zachytilo začátek sezóny. Pokud kapacita nestačí, odložit přehled a data jen sbírat; dotázat se na ně jde i ručně.

---

## 8. Co tím nezískáme

- **Skutečný objem stažení.** Kvůli cache (bod 1.1) měříme jen MISS.
- **Použití obsahu bez prokliku.** Když model odpoví z toho, co si stáhl dřív, v logu nic nebude. To nezjistíme nijak.
- **Spolehlivou identitu.** User agent je tvrzení klienta, nikoli důkaz (bod 3).
- **Provoz na HTML stránkách.** Statické stránky obsluhuje CDN a serverová funkce se nevolá. Návrh měří jen tři vyjmenované endpointy.
