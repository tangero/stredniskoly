# Směr vývoje

Hlavní nástroj, kterým vlastník řídí projekt ([návrh řízení vývoje](navrh-rizeni-vyvoje-2027.md),
oddíly 17 a 17a). Claude Code a asistent zadání ho čtou při každém zpracování zadání a podle něj řadí
práci a vybírají nápady na briefing. Soubor je veřejný záměrně: projekt je transparentní.

**Změny smí sloučit jen vlastník** (cesta je v `h2` v `.github/rezimy.yml`, brána ji pustí jen se
`schvaleno` na PR). AI navrhuje změny jednou za čtvrtletí nebo po rozhodnutí na briefingu.

Stav: **koncept k doplnění vlastníkem** (3. 10. 2026). Řádky označené *(návrh AI)* jsou odvozené
z otevřených zadání a kalendáře přijímaček; potvrď je, uprav, nebo smaž.

## Cíle k datu

| do | cíl | měřítko |
|---|---|---|
| 2027-01-15 | *(návrh AI)* Kritéria přijetí 2027 na stránkách oborů, jakmile je školy zveřejní | podíl oborů s kritérii |
| 2027-02-01 | *(návrh AI)* Simulátor a stránky oborů připravené na podávání přihlášek, včetně oborů bez JPZ (#244) | obory bez JPZ zobrazené; simulátor bez chyb v týdnu před termínem |
| 2027-05-14 | *(návrh AI)* Výsledky 1. kola a nabídka 2. kola na webu do 24 h od zveřejnění | čas od zveřejnění zdroje po nasazení |
| … | | |

## Pořadí priorit

1. *(návrh AI)* Správnost dat na stránkách škol a oborů (opravy mají přednost před novými funkcemi).
2. *(návrh AI)* Obory bez JPZ a nedenní formy (#244).
3. *(návrh AI)* Okruhy oborů ve městě (#277).
4. *(návrh AI)* Provoz a náklady (log drain #234, cache, ISR).
5. …

## Co teď neděláme

- *(návrh AI)* Nové velké stránky mimo priority výše, dokud nejsou hotové cíle k 2027-02-01.
- …

## Rozpočet

| položka | měsíčně | poznámka |
|---|---|---|
| **AI a výdaje celkem** | … Kč | tokeny, druhý klíč, placené služby a API |
| koš provoz | zbytek | rutina, opravy, hlášení, přehled; nezastavuje se |
| koš schválená práce | do 60 % | drobná zadání, etapy, projekty |
| koš nápady | do 15 % | náčrty nápadů AI; jeden nápad nejvýš 2 % |
| limit karty na jednu platbu | … Kč | nad limit rozhoduje vlastník (H4) |

Rozpočet pozornosti: nejvýš 3 nápady AI na briefing (oddíl 17a návrhu).

## Zamrznutí

V kritických dnech se běžný vývoj nesloučí, jen incidentní opravy (oddíl 9c). Nastavuje se proměnnými
repozitáře `ZAMRZNUTI_OD` a `ZAMRZNUTI_DO` (jedno období najednou).

| od | do | proč |
|---|---|---|
| *(návrh AI)* 2027-01-28 | 2027-02-02 | konec podávání přihlášek |
| *(návrh AI)* 2027-04-10 | 2027-04-16 | jednotné přijímací zkoušky |
| *(návrh AI)* 2027-05-12 | 2027-05-21 | výsledky 1. kola a přihlášky do 2. kola |

## Mimořádné pokyny

- …
