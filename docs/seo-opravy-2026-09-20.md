# SEO opravy z auditu 20. 9. 2026

Implementovány čtyři požadované body: canonicaly vstupních stránek, přístup k vykreslovacím prostředkům, veřejný Vercel alias a sitemapa.

- Společný produkční origin je `https://www.prijimackynaskolu.cz` v `src/lib/site.mjs`. Root layout už nepředává canonical homepage všem podstránkám. Veřejné statické i dynamické šablony mají explicitní canonical; filtry regionů a parametry nástrojů odkazují na základní cestu příslušné stránky. Alternativní Markdown/JSON formáty škol zůstávají zachované.
- Robots.txt povoluje `/_next/`, ponechává omezení interního API a odkazuje na www sitemapu.
- Přesný hostname `stredniskoly.vercel.app` se přesměrovává HTTP 308 na produkci se zachováním cesty a query stringu. Ostatní deploymenty na `*.vercel.app` zůstávají funkční, s HTTP hlavičkou `X-Robots-Tag: noindex`. Vlastní preview domény mimo vercel.app toto pravidlo nepokrývá.
- Inspekce má jednu adresu podle školy. Oborové a historické varianty se přesměrovávají HTTP 308; škola bez publikovatelného shrnutí vrací 404. Stejné pravidlo dostupnosti používá generátor sitemap i načítání dat stránky.
- Sitemapa obsahuje jen www adresy, přidává 20 měst a jejich rozcestník, vynechává stará přesměrování a neexistující inspekce. Seznam měst a názvy krajů sdílí s aplikací. Roky výsledků přebírá z registru výsledků. Čas souborů už nepoužívá jako `lastmod`; nepodložené datum je vynecháno.

Nový inventář aktuálních dat: **5 195 URL**, z toho **848 inspekcí** (jedna za školu) a **20 městských detailů**. Předchozí produkční snapshot měl 8 624 URL, z toho 4 300 inspekcí. Přegenerovaný `public/sitemap.xml` je součástí změny.

## Ověření

- `npx tsc --noEmit`.
- `node --test tests/seo.test.mjs tests/school-key.test.mjs`: 9 testů; kontrola celého XML inventáře, dostupnosti inspekcí, deduplikace, přesměrovaných cest a společného hostname.
- `BASE_URL=http://localhost:3237 node --test tests/seo.integration.mjs`: 6 integračních testů skutečného HTTP serveru; 20 veřejných cest, parametry filtrů, inspekční redirect/404, Vercel host routing, preview noindex, robots a průřez sitemapou.
- ESLint změněné konfigurace, generátoru, pomocných JS modulů a SEO testů; `git diff --check`.
- Oddělená kopie projektu: `next build --webpack --experimental-build-mode compile`, následně `next start -p 3237`. Zdrojové soubory odpovídají změnám; build artefakty nezasahují do existujícího lokálního serveru.

Úplný standardní build úspěšně zkompiloval aplikaci a prošel TypeScriptem, ale při předgenerování 1 186 stránek opakovaně překračoval 60sekundové limity. Byl zastaven; netvrdíme dokončení plného prerender buildu. Produkční kompilace v režimu `compile` a vykreslování na požadavek umožnily provést HTTP přejímku bez změny produkčního nastavení či zdrojových stránek.

## Nasazení a následná kontrola

Nasazování probíhá přes produkční větev `main` a Git integraci Vercelu. Po nasazení ověřit na produkci HTTP 308 aliasu a inspekčních variant, canonicaly vybraných šablon, robots a novou sitemapu. GSC již zná `https://www.prijimackynaskolu.cz/sitemap.xml`; adresa se nemění. Stav indexu se změní až po novém procházení, oprava sama nezaručuje okamžité zaindexování.

Pravidla přesměrování používají standardní [Next.js host matching a permanent redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects); metadata používají [Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).
