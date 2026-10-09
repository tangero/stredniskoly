# Monitoring produkce

Projekt #355. Tento dokument popisuje etapu 1 (dostupnost). Etapy 2 (triáž hlášení) a 3 (čerstvost dat)
přibudou do něj po realizaci.

## Etapa 1: dostupnost

Workflow `.github/workflows/dostupnost.yml` každých 5 minut spustí `scripts/provoz/dostupnost.mjs`. GitHub plánované
běhy při zátěži zpožďuje nebo vynechá, takže interval je jen orientační. Skript načte pět stránek na
`https://www.prijimackynaskolu.cz` (GET, bez cookies a formulářů, nejvýš 10 dotazů na běh).

| adresa | klíčový text |
|---|---|
| `/` | Přijímačky |
| `/skola/651028922-1-slovanske-gymnazium-a-jazykova-skola-masna` | Slovanské gymnázium |
| `/skola/651028922-1-slovanske-gymnazium-a-jazykova-skola-masna-gymnazium-vseobecne-cesky-program` | Gymnázium |
| `/simulator` | Simulátor |
| `/mesto/praha` | Praha |

Stránka je v pořádku, když vrátí stavový kód 200 a obsahuje klíčový text. Selhání (jiný kód, timeout 15 s, chybějící
text) se v témže běhu ověří druhým dotazem po 30 s a platí až jeho výsledek. Když zanikne škola nebo obor z druhé
a třetí adresy, adresu je potřeba vyměnit v `ADRESY` ve skriptu.

### Režimy a prahy

Prahy jsou předpoklady (otevřená otázka O3), po měsíci provozu se upraví podle naměřeného mediánu a p95.

| | běžný | zvýšený |
|---|---|---|
| kdy | jinak | v období `ZAMRZNUTI_OD`..`ZAMRZNUTI_DO` (proměnné repozitáře) a v sezóně 1. 1. až 31. 5. |
| výpadek se otevře | po 2 bězích za sebou | hned po prvním potvrzeném selhání |
| připomínka při trvání | po 6 h | po 30 min |
| práh odezvy | 3 s | 2 s |

Pomalý web: medián posledních 3 úspěšných odezev nad prahem. Hlásí se zvlášť od výpadku.

### Co se stane

- **Výpadek nebo pomalý web:** vznikne jedno issue (`interni`, `rutina`, `oblast:provoz`, titulek „Výpadek: <cesta>“ nebo
  „Pomalý web: <cesta>“) a jedna zpráva do Telegramu. Dokud problém trvá, jen se připomíná.
- **Obnovení:** jedna zpráva, komentář s délkou a zavření issue.
- **Týdenní přehled:** oddíl Dostupnost (dostupnost v %, medián a p95 odezvy, podíl odpovědí 5xx v kontrolách,
  výpadky s odkazy). Medián a p95 jsou z histogramu a udávají horní hranici koše, ne přesnou hodnotu.

### Kde je stav

Jediné issue „Dostupnost webu: stav monitoringu“ (štítek `oblast:provoz`) nese komentář se stavem v JSON
(počty selhání, otevřené výpadky, statistika dnů za posledních 8 dní). Zapisuje ho jen workflow, issue se neupravuje
ani nezavírá; kdyby zmizelo, workflow ho založí znovu a statistika začne od nuly. Do stavu, issue ani Telegramu
nejdou osobní údaje ani IP adresy, jen cesta, stavový kód, doba a čas.

### Co etapa 1 nedělá

Nečte 5xx z log drainu (otázka O2, potřebovala by nový secret), nesleduje chyby v prohlížeči (O7) a nemá stavovou
stránku.

### Jak vypnout

Zakázat workflow Dostupnost v Actions (nebo smazat soubor). Otevřená issue výpadků zavřít ručně.
Ruční zkouška bez zápisu: `node scripts/provoz/dostupnost.mjs --nanecisto`.

## Etapa 2: triáž hlášení (#355, #437)

Workflow Triáž (`.github/workflows/triaz.yml`, skript `scripts/provoz/triaz.mjs`) běží při založení nebo označení
hlášení (`bug-report`, `portal-skoly`, `feature-request`, `puvod:hlaseni`, `puvod:email`, nebo issue od cizího účtu
bez štítků) a každou hodinu jako dohledání. Interní zadání (`interni`, `projekt`) a PR netřídí.

### Co se stane

- Levný model (OpenRouter, `OPENROUTER_API_KEY`, model v `TRIAZ_MODEL`, výchozí `openai/gpt-4o-mini`) dostane jen
  titulek a tělo hlášení (bez e-mailů a telefonů) a seznam otevřených issues. Nemá nástroje ani token GitHubu,
  text hlášení bere jako data. Vrátí druh, oblast, RED IZO, kandidáta duplicity a projektu, jistotu a jednu větu.
- Skript výstup ověří proti povoleným hodnotám. Co neprojde, dostane komentář „Netříděno“ a žádný štítek.
- Zapíše štítek `oblast:*` (jen když issue žádný nemá), štítek druhu (`bug`, `chybna-data`, `enhancement`,
  `duplicate`, jen když žádný nemá; štítek `feature-request` z formuláře nápadů se počítá jako druh „požadavek na
  funkci“) a jeden komentář `## Třídění` se skrytou značkou `triaz:v1`. Opakovaný běh komentář ani zprávu nezdvojí.
- Komentář uvádí oblast podle štítku issue, odhad modelu jen jako poznámku, když se liší. Jistotu modelu neuvádí: při
  prvním běhu 8. 10. 2026 vracel u všech 35 hlášení stejných 80 %. Model dostává definici každého druhu a formulář,
  ze kterého hlášení přišlo, jako nápovědu.
- Duplicitu a projekt jen navrhne. Nikdy nepřidá ani neodebere `schvaleno`, `zamitnuto`, `stop`, `navrh`,
  `projekt`, `otazka`, nezavírá issues, nepřipojuje sub-issues a nepíše `Zdroj:`.
- Telegram: hlášení „web nefunguje“ hned, ostatní souhrnem v hodinovém běhu (druh, oblast, odkaz, bez textu hlášení).
- Týdenní přehled: oddíl Hlášení (nová podle druhu, netříděná, otevřená starší 7 dní).

Chyba modelu (výpadek služby) nic nezapíše, hlášení se zkusí při dalším běhu.

### Jak vypnout

Zakázat workflow Triáž v Actions (nebo smazat soubor). Ruční zkouška bez zápisu:
`node scripts/provoz/triaz.mjs --nanecisto` (potřebuje `GITHUB_TOKEN` nebo přihlášené `gh` a klíč modelu).
