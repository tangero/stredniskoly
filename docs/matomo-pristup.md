# Rutinní přístup k Matomo

Verze 1.0, ověřeno 11. 9. 2026. Přístup pro `https://ma.hlidacstatu.cz`, projekt `idSite=7`, ověřený název `prijimackynaskolu.cz`, hlavní URL `https://www.prijimackynaskolu.cz`, časové pásmo `Europe/Prague`. Web je v Matomo založený od 11. 2. 2026.

## Každodenní použití

Z kořene projektu, Python 3.10+ se systémovou databází časových pásem; bez dalších Python závislostí:

```sh
python3 scripts/matomo-report.py doctor
python3 scripts/matomo-report.py snapshot
```

První příkaz ověří přístup a totožnost webu. Druhý vytvoří report za posledních 28 dokončených dní v pražském čase. Není to naplánovaná úloha: spouští se na požádání. JSON se uloží do `~/.local/share/stredniskoly/matomo/` s datem a časem, příkaz vypíše cestu. Report obsahuje přehled návštěv a akcí, stránky, vstupy, zařízení, zdroje, sociální sítě, návraty, interní hledání, události a měsíční řezy.

Konkrétní období včetně obou koncových dní:

```sh
python3 scripts/matomo-report.py snapshot --start 2026-02-11 --end 2026-09-11
python3 scripts/matomo-report.py report --method Actions.getPageUrls --period range --date 2026-08-01,2026-08-31 --flat
```

`--output /absolutni/cesta/report.json` volitelně určuje výstup. Pro souhrn vhodný do projektového podkladu použít cestu vypsanou příkazem `snapshot`:

```sh
python3 scripts/matomo-report.py summarize /cesta/ke/snapshot.json --output /cesta/k/souhrnu.json
```

Souhrn neobsahuje dotazy interního hledání ani seznam individuálních URL. Obsahuje definované skupiny stránek, časové řezy, zdrojové parametry bez autentizace, kontrolní součty a nerozřešené rozdíly metrik. Podrobné odpovědi ponechat mimo Git: URL a vyhledávací dotazy mohou obsahovat údaje vložené návštěvníky. Do repozitáře patří jen zkontrolované agregáty.

## Přihlašovací údaj

Na tomto počítači je token uložen v `~/.config/stredniskoly/matomo-token`, oprávnění `0600`, adresář `0700`. Hodnota tokenu není v kódu, dokumentaci ani v metadatech reportu. Pro další práci se načítá automaticky; uživatel jej nemusí znovu posílat do konverzace.

Pro nastavení na dalším počítači nebo výměnu tokenu:

```sh
python3 scripts/matomo-report.py setup
```

Interaktivní příkaz zadá token skrytě. V řízeném prostředí lze použít `MATOMO_TOKEN` ze správce tajných údajů; má přednost před souborem. Token nedávat do argumentu příkazu, URL, tracked `.env` ani do screenshotu.

Klient používá HTTPS POST na pevnou adresu `/index.php`, token jen v těle požadavku. Přesměrování nepovoluje. Má seznam povolených čtecích metod a nedovoluje změnit web, host ani autentizaci přes parametry reportu. Nemění účty, oprávnění, měření ani reporty na serveru; nečte záznamy jednotlivých návštěvníků. Skutečný rozsah oprávnění dodaného tokenu jsme administrátorskými metodami nezjišťovali; omezení klienta není změnou oprávnění tokenu na serveru.

Chyba spojení/autentizace ukončí příkaz nenulovým kódem. Surová chyba serveru se nevypisuje; token se neobjeví ve výpisu. Existující platný výstup nenahradí neúplně stažený report. Přesměrování na přihlášení se nepovažuje za úspěšný report.

## Definice a kontrola metrik

- `VisitsSummary.get.nb_visits`: návštěvy webu, nikoli lidé či rodiny.
- `VisitsSummary.get.nb_actions`: všechny sledované akce. Pro zobrazení stránek použít `Actions.get.nb_pageviews`.
- `Actions.getPageUrls.nb_hits`: zobrazení daného řádku URL. `nb_visits` u URL není sčitatelný počet jedinečných návštěv webu.
- `entry_nb_visits`: návštěvy začínající na daném řádku. Při souhrnu porovnat s celkovými návštěvami, případný rozdíl zachovat jako nevysvětlený.
- `nb_uniq_visitors`: identifikovaní návštěvníci v daném období; nesčítat měsíce a nevydávat za počet lidí. Rozsah `range` nemusí tuto metriku vracet.
- `format_metrics=0`: poměry jsou čísla 0–1. Při zobrazení procent násobit 100.
- `period=month` vrací kalendářní měsíce, ne oříznuté mezní dny. `snapshot` proto dělí měsíční řezy explicitními `period=range`; první a poslední řez respektují zadané hranice.
- `filter_limit=-1` odstraní prezentační limit, nikoli dřívější agregaci do `Others`. Podrobnosti ztracené v archivu klient neobnoví.
- Dnešní den je průběžný. Standardní report končí včerejškem; ručně zvolené období zahrnující dnešek je označené.

Primární dokumentace: [Reporting API](https://developer.matomo.org/api-reference/api), [omezení řádků a Others](https://matomo.org/faq/how-to/faq_54/). Úpravu routování je třeba ověřit podle [měření SPA](https://developer.matomo.org/guides/spa-tracking).

## Ověření a stav

Dne 11. 9. 2026 prošel skutečný `doctor`, úplný snímek únor–září a samostatný měsíční report. Souhrn je v `docs/podklady/navstevnost-2026-overeni-v1.1.json`. Rozdíly a interpretace jsou v `docs/analyza-navstevnosti-2026.md`.

Osm lokálních testů ověřuje hranice měsíce, zákaz zapisujících metod a přepsání kontextu, token pouze v těle POST, neveřejné ukládání, odmítnutí symlinků, nevypisování tokenu z chyb a zákaz přesměrování:

```sh
python3 -m unittest discover -s tests -p test_matomo_report.py -v
```

Připravený API klient neznamená opravu měření aplikace. Události Mého výběru a měření klientských přechodů jsou samostatná navržená práce M0. Žádný serverový účet, automatická rozesílka ani plánovaná úloha nebyly založeny.
