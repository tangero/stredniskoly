# Prezentace: AI First Company

Podklady k přednášce o tom, jak se Přijímačky na školu provozují jako AI First Company — Eduarda navrhuje a táhne práci, člověk schvaluje to, co má následky.

| Soubor | Co to je |
|---|---|
| `ai-first-company.pptx` | Prezentace, 11 slidů, 16:9, ~10 min (rezerva do 15) |
| `ai-first-company.py` | Skript, který ji generuje — **zdroj pravdy**, pptx se z něj dá kdykoli přegenerovat |
| `podklady/` | Obrázky vložené do prezentace |

## Přegenerování

```bash
pip install python-pptx Pillow
python3 docs/prezentace/ai-first-company.py
```

Skript přepíše `ai-first-company.pptx` vedle sebe. Každý slide má poznámky pro mluvčího.

Úpravy dělejte ve skriptu, ne v pptx — jinak se při dalším běhu ztratí.

## Osobní údaje v obrázcích

Screenshoty v `podklady/` jsou **anonymizované destruktivně**, ne překrytím:

- `marketing-anonym.png` — všech 11 e-mailových adres pořadatelů zakryto (detekcí barvy odkazů). Názvy organizací a termíny zůstaly, sdělnost slidu je stejná.
- `eduarda-anonym.png` — zakryto jméno pisatele v cizí korespondenci.

Ověřeno, že pixely jsou přepsané: v anonymizované verzi je **0 pixelů barvy odkazů** proti 66 313 v originálu. Originály v repozitáři nejsou a nepatří sem — repozitář je veřejný.

Kdyby se podklady kdy měnily, platí totéž pravidlo: **adresy a jména konkrétních lidí, kteří k tomu nedali souhlas, na promítaný slide nepatří.**

## Co ověřit před přednáškou

Dvě místa stojí na domněnce, ne na doloženém faktu:

1. **Chief of Staff** je na slidu 4 vedený jako samostatná vrstva, protože tak vypadá ze screenshotu (předává bootstrap, přebírá DMARC). Pokud je to jen řídicí vrstva Grok Bota, slide upravit.
2. **Jak dlouho trvala databáze pořadatelů** (slide 7) — v textu to schválně není, protože to číslo nikdo nezměřil. Doplnit jen tehdy, když bude doložené.

Čísla na slidu 6 doložená jsou: 20/20 doručených pozvánek potvrdil Resend, 368 testů je skutečný stav repozitáře, 23 pořadatelů je ze screenshotu.
