<!--
Tělo interního zadání pro zakládání přes API / gh (stejná pole jako formulář .github/ISSUE_TEMPLATE/interni-zadani.yml).
Štítky: interni, navrh. Titulek: „[Zadání] …“.

POZOR: repozitář je veřejný, issue uvidí kdokoli. Do zadání nepatří jména, e-maily,
telefony ani jiné osobní údaje zákazníků, škol, rodičů ani uchazečů, ani přístupové
kódy, tokeny či výpisy z produkční databáze. Školu označte RED IZO, osobu rolí.

Založení:
  gh issue create -R tangero/stredniskoly --title "[Zadání] …" \
    --label interni --label navrh --body-file zadani.md
-->

> **Interní zadání** (Eduarda → schvaluje Patrick → realizuje Claude Code). Chyby na webu hlaste tlačítkem „Nahlásit chybu“ na prijimackynaskolu.cz.

### Proč / pro koho

…

### Co přesně změnit

…

### Hotovo když

<!-- Každé kritérium: označení K1, K2…, jedna kontrola ano/ne a čím se ověří. Označení se nepřečíslovávají
     (rozdělené K3 → K3.1, K3.2; zrušené přeškrtnout ~~K4: …~~).
     Tvar `ověření: /adresa „očekávaný text“` se po sloučení ověřuje i v produkci (#325). -->

- [ ] K1: … - ověření: náhled /…, 390 a 1280 px
- [ ] K2: … - ověření: …
- Lint, typy, testy a build hlídá CI.

### Nesmí se dotknout / omezení

<!-- U změn webu aspoň jedno ověřitelné protikritérium P1, P2… se způsobem ověření. -->

- P1: … - ověření: …
- Žádné refaktory mimo zadání.
- Produkční data v Neonu beze změny (migrace: žádná).
- Cizí servery: žádné (jinak uvést server, endpointy, rychlost, data a důvod; před prvním dotazem zapsat do issue, odkud se stahuje, schválení netřeba; CLAUDE.md pravidlo 7).

### Přínos a vyhodnocení

<!-- Nepovinné; u nové funkce nebo změny webu vyplň, jinak oddíl smaž. Čtyři druhy kritérií, použij ty, které dávají smysl:
     správnost (dělá funkce, co tvrdí, změřitelně z vlastních dat), použití (kolik lidí funkci použije a co udělají dál,
     události v Matomu), vnímání (krátká otázka na stránce, jen když je opravdu potřeba), předpoklad (přínos, který
     změřit neumíme; s podmínkou, kdy funkci zjednodušit nebo zrušit). Řádek Termín vytvoří připomínku (štítek pripominka). -->

- Správnost: …
- Použití: …
- Vnímání: …
- Předpoklad a podmínka zjednodušení nebo zrušení: …

Termín: RRRR-MM-DD

### Otevřené otázky

<!-- Co zatím nevíte a ovlivní řešení (CLAUDE.md, pravidlo 8). Nevíte-li nic, oddíl smažte. -->

…

### Jak otestovat

…

### Velikost

S / M / L

### Související odkazy

…
