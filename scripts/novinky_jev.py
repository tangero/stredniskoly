"""Rozhodovací model nad školními novinkami: téma, cílová skupina, stav a role data.

Rozhodnuto 20. 9. 2026 (``docs/prehodnoceni-rozhodnuti-rss-2027.md``, P6). Dělba
práce je pevná a plyne z toho, co Jev umí a neumí:

* **kód** rozdělí text na klauzule, najde data a časy, ověří kalendář a rok,
  složí větu ze šablony a udělá publikační rozhodnutí;
* **model** odpoví na otázky, které jsou o významu textu: o čem zpráva je, jestli
  je pro uchazeče o střední školu, jestli se akce koná, a ke které události patří
  které datum.

Model **negeneruje text**. Vrací typovanou odpověď s pravděpodobností, takže
nemůže napsat, co se objeví na stránce – může jen vybrat z možností, které mu
předloží kód. Věta na kartě je proto naše, i když fakta v ní pocházejí z článku
školy. To je zároveň obrana proti instrukci podstrčené ve feedu: útočník může
nanejvýš pohnout výběrem, ne obsahem naší šablony (podmínka 1 z P6).

Čtyři pravidla, která tenhle modul dodržuje a bez kterých by se neměl používat:

1. **Záporná odpověď modelu nic nepotlačuje.** Pilot párování oborů ukázal, že
   „žádná" je spolehlivá jen asi z poloviny. Pravidla z ``novinky_klasifikace``
   zůstávají záchytnou sítí: co zachytí ona a model ne, jde na neutrální odkaz,
   ne do koše (podmínka 2).
2. **Verze modelu je součástí verze pravidel.** Pinuje se ``typesafe/jev-1.13``,
   ne ``~typesafe/jev-latest``: ``verze_pravidel`` je auditní údaj a spouštěč
   přepočtu, takže se model nesmí měnit pod rukama (podmínka 5).
3. **Měření musí jít pustit bez sítě.** Odpovědi se ukládají do mezipaměti podle
   otisku karty a přikládají ke zmrazenému vzorku, aby ``--offline`` dávalo
   stejný výsledek i v čistém CI (podmínka 6).
4. **Výpadek modelu není rozhodnutí.** Když volání selže, vrací se ``None`` a
   volající použije pravidla. Nikdy se nepředstírá, že model odpověděl.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from novinky_klasifikace import (NAZVY_AKCI, TRIDY_AKCI, formatuj_datum,
                                 rozdel_klauzule, strip)

# Pinovaná verze; `~typesafe/jev-latest` by měnil výsledky bez změny našeho kódu.
MODEL = "typesafe/jev-1.13"
# Verze otázek. Mění se při každé úpravě instrukcí – jinak by mezipaměť vracela
# odpovědi na jinou otázku, než jaká se ptá teď.
VERZE_OTAZEK = "1"
ENDPOINT = "https://openrouter.ai/api/alpha/decisions"

KOREN = Path(__file__).resolve().parent.parent
MEZIPAMET = KOREN / "data" / "sondy" / "jev-novinky-cache.json"

# Práh, pod kterým se odpověď modelu nebere. Kalibruje se proti ruční referenci
# (`data/sondy/rss-klasifikace-reference.json`); do kalibrace platí hodnota
# z pilotu párování oborů, kde při confidence ≥ 0,5 nebyl chybný ani jeden ze
# 85 vybraných párů. Prahy se **nepřenášejí mezi `noul` a `choice`** – nejsou
# vzájemně konzistentní (podmínka 4).
PRAH_CHOICE = 0.5
# Noul nevrací confidence, jen P(ano). Práh se proto dává na vzdálenost od
# poloviny: odpověď mezi 0,35 a 0,65 znamená „model neví" a pravidla rozhodují
# sama. Prahy se **nepřenášejí mezi `noul` a `choice`** (podmínka 4 z P6).
PASMO_NOUL = 0.15


# --- Otázky -----------------------------------------------------------------------
# Instrukce jsou česky: v pilotu vyšla česká formulace lépe než anglická
# (82 % proti 77 % celkové přesnosti).

POPIS_TEMAT = {
    "dod": "Den otevřených dveří, na který škola zve zájemce o studium.",
    "prijimacky_nanecisto": "Zkoušky nanečisto, cvičné přijímací testy nebo jiné "
                            "zkoušení na zkoušku pro zájemce o studium.",
    "setkani_uchazecu": "Setkání, beseda, konzultace nebo prohlídka pro zájemce "
                        "o studium a jejich rodiče.",
    "pripravny_kurz": "Přípravný kurz k přijímacím zkouškám.",
    "talentove_zkousky": "Talentová zkouška.",
    "nahradni_termin": "Náhradní termín zkoušky pro toho, kdo se nemohl dostavit.",
    "kriteria": "Kritéria a podmínky přijetí.",
    "volna_mista": "Volná místa, která škola nabízí.",
    "vysledky_prijm": "Výsledky přijímacího řízení, seznam přijatých.",
    "terminy_jpz": "Termíny jednotné přijímací zkoušky.",
    "prijimaci_rizeni": "Přijímací řízení obecně: vyhlášení kola, organizace, pokyny.",
    "prihlaska": "Přihláška ke studiu a jak ji podat.",
}

OTAZKA_TEMA = {
    "type": "choice",
    "instructions": "O čem ta zpráva ze školního webu je především? Vyber jednu "
                    "možnost. Když zpráva není o přijímání na střední školu, vyber "
                    "„nic_z_toho“.",
    "criteria": {**POPIS_TEMAT,
                 "nic_z_toho": "Zpráva není o přijímání ke studiu na střední škole "
                               "(výlet, olympiáda, provozní oznámení, nabídka práce)."},
}

OTAZKA_PRO_UCHAZECE = {
    "type": "noul",
    "instructions": "Je ta zpráva určená lidem, kteří se hlásí ke studiu na TÉHLE "
                    "střední škole, nebo jejich rodičům? Odpověz ne, když je určená "
                    "současným žákům školy, uchazečům o vyšší odbornou nebo vysokou "
                    "školu, žákům základní umělecké školy, nebo když akci pořádá "
                    "někdo jiný než tahle škola.",
}

# Jev čte instrukce doslova, takže výchozí odpověď musí být napsaná. První znění
# („z textu nejde poznat, jestli to platí") dostalo u jasné pozvánky „nejasne"
# s 0,75: model to četl jako „text konání výslovně nepotvrzuje". Běžná pozvánka
# konání nepotvrzuje, ona ho oznamuje – a to je `oznameno`.
OTAZKA_STAV = {
    "type": "choice",
    "instructions": "Ruší nebo mění zpráva něco, co škola oznámila dřív? "
                    "Když ne, odpověz „oznameno“ – to je výchozí odpověď pro "
                    "každou běžnou zprávu i pozvánku.",
    "criteria": {
        "oznameno": "Zpráva něco oznamuje nebo na něco zve. Nic neruší ani nemění "
                    "a škola nepíše, že by údaj byl nejistý.",
        "zmeneno": "Zpráva mění dřívější oznámení: termín se přesouvá, mění se místo.",
        "zruseno": "Zpráva ruší dřívější oznámení: akce se nekoná nebo se odkládá.",
        "nejasne": "Škola sama píše, že termín zatím není potvrzený nebo že ho teprve "
                   "upřesní; nebo si text odporuje a nejde poznat, co platí.",
    },
}


def otazka_role_data(klauzule: str, datum: str, tridy: list[str]) -> dict:
    """Otázka na jedno datum. Předkládá **klauzuli, ve které datum leží**, ne celý
    článek: právě smíchání dat z celého článku byla chyba, kvůli které se
    zobrazování termínů vyplo.

    Datum se v otázce jmenuje. Jedna věta jich nese klidně několik („9. 12. 2026
    od 17:00 a 7. 1. 2027"), takže bez jmenovitého určení by model dostal na dvě
    různá data dvě stejné otázky a nešlo by poznat, ke kterému odpověděl."""
    moznosti = {t: f"Datum, kdy se koná: {NAZVY_AKCI[t]}" for t in tridy if t in NAZVY_AKCI}
    moznosti.update({
        "registrace": "Dokdy se má zájemce na tu akci nahlásit nebo zarezervovat "
                      "místo. Není to datum konání akce.",
        "lhuta": "Termín přijímacího řízení, který platí bez ohledu na akce školy: "
                 "odevzdání přihlášky ke studiu, jednotná přijímací zkouška, "
                 "zveřejnění výsledků, odevzdání zápisového lístku.",
        "jine": "Datum znamená něco jiného, nebo z věty nejde poznat co.",
    })
    return {
        "type": "choice",
        "instructions": f"Ve větě „{klauzule}“ je datum {datum}. "
                        f"Co to datum ve zprávě znamená?",
        "criteria": moznosti,
    }


# --- Volání -----------------------------------------------------------------------

def _klic(stav: dict, otazky: dict) -> str:
    """Otisk karty a otázek. Změna instrukcí musí mezipaměť zneplatnit."""
    syrove = json.dumps({"m": MODEL, "v": VERZE_OTAZEK, "s": stav, "o": otazky},
                        ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(syrove.encode()).hexdigest()[:32]


def nacti_mezipamet(cesta: Path = MEZIPAMET) -> dict:
    try:
        return json.loads(cesta.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def uloz_mezipamet(data: dict, cesta: Path = MEZIPAMET) -> None:
    cesta.parent.mkdir(parents=True, exist_ok=True)
    cesta.write_text(json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True))


def _api_klic() -> str | None:
    if os.environ.get("OPENROUTER_API_KEY"):
        return os.environ["OPENROUTER_API_KEY"]
    for jmeno in (".env.local", ".env"):
        try:
            for radek in (KOREN / jmeno).read_text().splitlines():
                if radek.startswith("OPENROUTER_API_KEY="):
                    return radek.split("=", 1)[1].strip().strip("\"'")
        except OSError:
            continue
    return None


def zeptej_se(stav: dict, otazky: dict, mezipamet: dict | None = None,
              offline: bool = False, pokusu: int = 4) -> dict | None:
    """Jedno volání se všemi otázkami nad jedním `state`.

    Vrací ``answers`` doplněné o ``_cena``, nebo ``None``, když se zeptat nešlo.
    ``None`` znamená „model neodpověděl", ne „model řekl ne" – volající má
    použít pravidla."""
    klic = _klic(stav, otazky)
    if mezipamet is not None and klic in mezipamet:
        return mezipamet[klic]
    if offline:
        return None  # v offline režimu se na síť nesahá ani omylem
    api_klic = _api_klic()
    if not api_klic:
        return None
    telo = json.dumps({"model": MODEL, "session_id": "skolni-novinky",
                       "state": stav, "questions": otazky}).encode()
    for pokus in range(1, pokusu + 1):
        zadost = urllib.request.Request(
            ENDPOINT, data=telo,
            headers={"Authorization": f"Bearer {api_klic}",
                     "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(zadost, timeout=30) as odpoved:
                data = json.loads(odpoved.read())
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and pokus < pokusu:
                time.sleep(2 ** pokus)
                continue
            return None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if pokus < pokusu:
                time.sleep(2 ** pokus)
                continue
            return None
    else:
        return None
    if "answers" not in data:
        return None
    vysledek = dict(data["answers"])
    vysledek["_cena"] = (data.get("usage") or {}).get("cost")
    if mezipamet is not None:
        mezipamet[klic] = vysledek
    return vysledek


# --- Karta položky a sestavení otázek ---------------------------------------------

def postav_stav(pol: dict, skola: dict | None = None) -> dict:
    """`state` je **karta položky**, ne text článku.

    Jev s délkou kontextu ztrácí kvalitu („context rot"), takže se mu nepředkládá
    celý článek, ale titulek, datum vydání a popis. Název a druh školy jsou tam
    proto, aby šlo odpovědět na otázku „je to pro uchazeče o TUHLE školu"."""
    karta = {
        "titulek": pol.get("titulek", ""),
        "popis": (pol.get("popis") or "")[:4000],
    }
    datum = pol.get("datum")
    if datum is not None:
        karta["datum_vydani"] = datum.date().isoformat() if hasattr(datum, "date") else str(datum)
    if skola:
        karta["skola"] = {k: v for k, v in
                          {"nazev": skola.get("nazev"), "druh": skola.get("druh")}.items() if v}
    return {"zprava_ze_skolniho_webu": karta}


def postav_otazky(text: str, tridy: list[str], pozice_dat: list[tuple[str, int]]) -> dict:
    """Čtyři druhy otázek v jednom volání: téma, cílová skupina, stav a role
    každého nalezeného data. Víc otázek v jednom volání je výrazně levnější
    i rychlejší než víc volání."""
    otazky = {"tema": OTAZKA_TEMA, "pro_uchazece": OTAZKA_PRO_UCHAZECE, "stav": OTAZKA_STAV}
    useky = rozdel_klauzule(strip(text))
    nabidka = [t for t in tridy if t in TRIDY_AKCI] or list(TRIDY_AKCI)
    for poradi, (iso, zacatek) in enumerate(pozice_dat, start=1):
        klauzule = next((v.strip() for a, b, v in useky if a <= zacatek < b), "")
        if klauzule:
            otazky[f"datum_{poradi}"] = otazka_role_data(
                klauzule, formatuj_datum(iso), nabidka)
    return otazky


def _vybrana(odpoved: dict | None, prah: float) -> str | None:
    """Volba modelu, jen když je nad prahem. Pod prahem se chová jako mlčení."""
    if not odpoved:
        return None
    volba = odpoved.get("choice")
    if volba is None or (odpoved.get("confidence") or 0) < prah:
        return None
    return volba


def _ano(odpoved: dict | None, pasmo: float = PASMO_NOUL) -> bool | None:
    """Odpověď typu noul jako ano/ne/nevím.

    Noul vrací jedno číslo `noul` = P(ano) a **žádnou confidence**, takže se práh
    nedá dát na jistotu jako u `choice`; dává se na vzdálenost od poloviny.
    Hodnota uvnitř pásma kolem 0,5 znamená „model neví" a vrací se `None`."""
    if not odpoved:
        return None
    p = odpoved.get("noul")
    if p is None:
        return None
    if abs(p - 0.5) < pasmo:
        return None
    return p >= 0.5


# --- Sloučení s pravidly ----------------------------------------------------------

def rozbor_polozky(pol: dict, skola: dict | None = None, mezipamet: dict | None = None,
                   offline: bool = False) -> dict | None:
    """Odpovědi modelu k jedné položce, přeložené do polí, se kterými pracuje kód.

    Vrací ``None``, když se model nezeptal nebo neodpověděl. To **není** totéž co
    „model nic nenašel": volající v takovém případě použije pravidla beze změny.

    Vrácená struktura::

        {"tema": "dod" | None,          # None = model si nebyl jistý
         "pro_uchazece": True | False | None,
         "stav": "oznameno" | ... | None,
         "terminy": [{"datum", "cas", "akce"}],   # jen data v roli akce
         "lhuty": ["2027-02-22"],                 # data, která akcí nejsou
         "model": "typesafe/jev-1.13",
         "odpovedi": {...}}               # syrové odpovědi pro audit
    """
    from novinky_klasifikace import klasifikuj_temu, najdi_cas, pozice_dat, text_k_rozboru

    text = text_k_rozboru(pol)
    tridy = pol.get("tridy")
    if tridy is None:
        tridy, _ = klasifikuj_temu(pol)
    pozice = pozice_dat(text)
    odpovedi = zeptej_se(postav_stav(pol, skola), postav_otazky(text, tridy, pozice),
                         mezipamet=mezipamet, offline=offline)
    if odpovedi is None:
        return None

    tema = _vybrana(odpovedi.get("tema"), PRAH_CHOICE)
    stav = _vybrana(odpovedi.get("stav"), PRAH_CHOICE)
    useky = rozdel_klauzule(strip(text))
    terminy, lhuty = [], []
    for poradi, (iso, zacatek) in enumerate(pozice, start=1):
        role = _vybrana(odpovedi.get(f"datum_{poradi}"), PRAH_CHOICE)
        if role in TRIDY_AKCI:
            klauzule = next((v for a, b, v in useky if a <= zacatek < b), "")
            terminy.append({"datum": iso, "cas": najdi_cas(klauzule), "akce": role})
        elif role is not None:
            lhuty.append(iso)
    return {
        "tema": None if tema == "nic_z_toho" else tema,
        "pro_uchazece": _ano(odpovedi.get("pro_uchazece")),
        "stav": stav,
        "terminy": terminy,
        "lhuty": lhuty,
        "model": MODEL,
        "odpovedi": {k: v for k, v in odpovedi.items() if k != "_cena"},
        "cena": odpovedi.get("_cena"),
    }


def slouc_s_pravidly(pol: dict, rozbor: dict | None) -> dict:
    """Co z rozboru smí ovlivnit klasifikaci. Vrací pole k doplnění do položky.

    Pravidla zůstávají záchytnou sítí (podmínka 2 z P6): **záporná odpověď modelu
    nic nepotlačuje**. Pilot ukázal, že „žádná" je u Jeva spolehlivá jen asi
    z poloviny, takže třída, kterou našla pravidla a model ne, zůstává – jen se
    nezvýrazní. Opačně model třídu přidat smí: mlčení pravidel je mezera
    v klíčových slovech, ne zjištění.

    Jediná věc, kterou model **zeslabuje**, je cílová skupina: když si je jistý,
    že zpráva není pro uchazeče o tuhle školu, karta se sníží na neutrální odkaz.
    Ani tehdy zpráva nemizí – zmizet by znamenalo tvrdit, že tam nic není."""
    if rozbor is None:
        return {}
    tridy = list(pol.get("tridy") or [])
    jistota = dict(pol.get("jistota") or {})
    if rozbor["tema"] and rozbor["tema"] not in tridy:
        tridy.append(rozbor["tema"])
        jistota.setdefault(rozbor["tema"], "stredni")
    if rozbor["pro_uchazece"] is False:
        jistota = {t: ("stredni" if j == "vysoka" else j) for t, j in jistota.items()}
    vysledek = {"tridy": tridy, "jistota": jistota}
    # Stav bereme od modelu jen tehdy, když je **přísnější** než pravidla:
    # zrušení, které pravidla přehlédla, se projevit musí, ale „oznameno" od
    # modelu nesmí přebít zrušení nalezené pravidly.
    poradi = {"oznameno": 0, "zmeneno": 1, "nejiste": 2, "nejasne": 2, "zruseno": 3}
    stav_pravidel = pol.get("stav")
    stav_modelu = {"nejasne": "nejiste"}.get(rozbor["stav"], rozbor["stav"])
    if stav_modelu and poradi.get(stav_modelu, 0) > poradi.get(stav_pravidel, 0):
        vysledek["stav"] = stav_modelu
    return vysledek
