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

- [ ] …
- [ ] …
- [ ] Lint, testy a build prošly

### Nesmí se dotknout / omezení

- Žádné refaktory mimo zadání.
- Produkční data v Neonu beze změny (migrace: žádná).
- Cizí servery: žádné (jinak uvést server, endpointy, rychlost, data a důvod; před použitím ohlásit v issue a počkat na schválení, CLAUDE.md pravidlo 7).

### Jak otestovat

…

### Velikost

S / M / L

### Související odkazy

…
