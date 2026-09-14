"""Oznámení správci a čtení jeho rozhodnutí.

Kanály: soubor (vždy), Telegram, GitHub issue. Schválení se přijímá jen od
povoleného odesílatele a jen po oznámení dané úlohy. Telegram se čte bez posunu
offsetu, aby linka nespotřebovala zprávy jiným nástrojům.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from . import jadro

DRUHY = {"nove_obdobi": "nové období", "revize": "revize", "zmizelo": "zdroj zmizel"}
LIMIT_ZPRAVY = 3800  # Telegram přijme 4096 znaků
INTERVAL_KONTROLY = 15  # minut; plán kroku schvaleni v .github/workflows/datova-linka.yml


def oznameni_cesta() -> Path:
    return jadro.cesta("LINKA_OZNAMENI", "data/linka/oznameni")


def cislo(v) -> str:
    return f"{v:,}".replace(",", " ") if isinstance(v, int) else str(v)


def text_ulohy(u: dict) -> str:
    p = u.get("priprava", {})
    radky = [f"[{u['kod']}] {u['sada']} · {u['obdobi']} · {DRUHY[u['druh']]}"]
    if u.get("zobrazene_obdobi"):
        radky.append(f"Na webu je teď: {u['zobrazene_obdobi']}")
    if u.get("last_modified"):
        radky.append(f"Zdroj změnil soubor: {u['last_modified']}")
    s = p.get("stazeno")
    if s:
        radky.append(f"Staženo: {cislo(s['velikost'])} bajtů, sha256 {s['sha256'][:12]}…")
    for zmena in p.get("zmeny_struktury", []):
        radky.append(f"POZOR, struktura: {zmena}")
    st = p.get("struktura")
    if st:
        radky.append(f"Kontrola: {len(st['listy'])} list(y), {st['sloupcu']} sloupců, {cislo(st['radku'])} řádků")
    z = p.get("zpracovani")
    sr = z["srovnani"] if z else None
    if sr and sr.get("popis"):
        # Zpracovatel s vlastním shrnutím, například 2. kolo.
        radky.append(f"Zpracování: {sr['popis']}.")
    elif sr:
        zmena = sr["median_zmeny_nejnizsiho_prijateho"]
        radky.append(
            f"Zpracování: {cislo(sr['oboru_nove'])} oborů, {cislo(sr['s_pasmy_nove'])} s pásmy "
            f"(na webu {cislo(sr['oboru_na_webu'])} a {cislo(sr['s_pasmy_na_webu'])}); "
            + (f"u {cislo(sr['spolecnych_oboru'])} společných oborů se nejnižší přijatý posunul mediánově o {str(zmena).replace('.', ',')} b."
               if zmena is not None else "žádný společný obor ke srovnání.")
        )
    if u["stav"] == "selhalo":
        radky.append(f"SELHALO: {p.get('chyba')}")
    elif p.get("dopad"):
        radky.append(f"Po schválení: {p['dopad']}")
    return "\n".join(radky)


def text_oznameni(ulohy: list[dict]) -> list[str]:
    """Jedna nebo více zpráv do limitu délky; každá končí návodem ke schválení se skutečnými kódy."""
    hlava = "Datová linka prijimackynaskolu.cz: nová data k převzetí\n"
    kody = [u["kod"] for u in ulohy if u["stav"] != "selhalo"]
    if len(kody) == 1:
        pata = (
            f"\nSchválit: odpověz „schvaluji {kody[0]}“, zamítnout „zamítám {kody[0]}“."
            f"\nPotvrzení přijde do {INTERVAL_KONTROLY} minut, z komentáře v GitHub issue hned."
            "\nWeb se po schválení nezmění: vznikne pull request, období přepneš zvlášť."
        )
    elif kody:
        pata = (
            f"\nSchválit: odpověz „schvaluji {kody[0]}“ s kódem z hranaté závorky, zamítnout „zamítám {kody[0]}“."
            "\nOdpověď na tuto zprávu jen slovem „schvaluji“ schválí všechny úlohy v ní."
            f"\nKódy k rozhodnutí: {', '.join(kody)}"
            f"\nPotvrzení přijde do {INTERVAL_KONTROLY} minut, z komentáře v GitHub issue hned."
            "\nWeb se po schválení nezmění: vznikne pull request, období přepneš zvlášť."
        )
    else:
        pata = "\nNic k rozhodnutí: zpracování selhalo, oprava je na správci linky."
    zpravy, aktualni = [], hlava
    for u in ulohy:
        blok = "\n" + text_ulohy(u) + "\n"
        if len(aktualni) + len(blok) + len(pata) > LIMIT_ZPRAVY:
            zpravy.append(aktualni + pata)
            aktualni = hlava
        aktualni += blok
    zpravy.append(aktualni + pata)
    return zpravy


# ---------------------------------------------------------------- Telegram

def telegram_konfigurace() -> tuple[str | None, str | None]:
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if token and chat:
        return token, chat
    soubor = Path(os.environ.get("LINKA_TELEGRAM_ENV", Path.home() / ".claude/skills/telegram-channel/.env"))
    if soubor.exists():
        hodnoty = dict(
            radek.split("=", 1) for radek in soubor.read_text().splitlines()
            if "=" in radek and not radek.strip().startswith("#")
        )
        return hodnoty.get("TELEGRAM_BOT_TOKEN", "").strip() or None, hodnoty.get("TELEGRAM_CHAT_ID", "").strip() or None
    return None, None


def telegram_api(metoda: str, parametry: dict) -> dict:
    token, _ = telegram_konfigurace()
    if not token:
        raise RuntimeError("chybí TELEGRAM_BOT_TOKEN")
    zaklad = os.environ.get("LINKA_TELEGRAM_API", "https://api.telegram.org")
    data = urllib.parse.urlencode(parametry).encode()
    with urllib.request.urlopen(f"{zaklad}/bot{token}/{metoda}", data=data, timeout=30) as r:
        odpoved = json.loads(r.read())
    if not odpoved.get("ok"):
        raise RuntimeError(f"Telegram {metoda}: {odpoved.get('description')}")
    return odpoved


def posli_telegram(zpravy: list[str]) -> list[int | None]:
    """Pošle zprávy a vrátí jejich message_id, aby šlo poznat odpověď na oznámení."""
    _, chat = telegram_konfigurace()
    ids = []
    for z in zpravy:
        odpoved = telegram_api("sendMessage", {"chat_id": chat, "text": z, "disable_web_page_preview": "true"})
        ids.append((odpoved.get("result") or {}).get("message_id"))
    return ids


# ---------------------------------------------------------------- GitHub

def gh(*argumenty: str, runner=subprocess.run) -> str:
    vysledek = runner(["gh", *argumenty], capture_output=True, text=True)
    if vysledek.returncode != 0:
        raise RuntimeError(f"gh {' '.join(argumenty[:2])}: {vysledek.stderr.strip()[:300]}")
    return vysledek.stdout.strip()


def cislo_issue(adresa: str) -> str:
    return adresa.rstrip("/").rsplit("/", 1)[-1]


def zaloz_issue(u: dict, text: str, runner=subprocess.run) -> str:
    return gh("issue", "create", "--title", f"Nová data k převzetí: {u['kod']} {u['sada']} {u['obdobi']}",
              "--body", text + "\n\nSchválit komentářem `schvaluji " + u["kod"] + "`, zamítnout `zamítám " + u["kod"] + "`. Linka odpoví potvrzením.",
              "--label", "nova-data", runner=runner)


# ---------------------------------------------------------------- oznámení

def oznam(fronta: dict, kanaly: list[str], nanecisto: bool, runner=subprocess.run) -> list[str]:
    """Oznámí připravené a selhané úlohy, které ještě oznámené nebyly. Vrátí kódy."""
    ulohy = [u for u in fronta["ulohy"].values() if u["stav"] in ("pripraveno", "selhalo") and not u.get("oznameni")]
    if not ulohy:
        return []
    zpravy = text_oznameni(ulohy)
    slozka = oznameni_cesta()
    slozka.mkdir(parents=True, exist_ok=True)
    razitko = jadro.ted().replace(":", "")
    (slozka / f"{razitko}.txt").write_text("\n\n---\n\n".join(zpravy), encoding="utf-8")

    doruceno, telegram_zpravy = ["soubor"], []
    for kanal in kanaly:
        if kanal == "telegram":
            if nanecisto:
                print("[nanečisto] Telegram by dostal:\n" + "\n---\n".join(zpravy))
            else:
                telegram_zpravy = [i for i in posli_telegram(zpravy) if i is not None]
            doruceno.append("telegram")
        elif kanal == "github":
            for u in ulohy:
                if nanecisto:
                    print(f"[nanečisto] gh issue create pro {u['kod']}")
                else:
                    u["issue"] = zaloz_issue(u, text_ulohy(u), runner=runner)
            doruceno.append("github")
    for u in ulohy:
        u["oznameni"] = {"cas": jadro.ted(), "kanaly": doruceno, "nanecisto": nanecisto,
                         **({"telegram_zpravy": telegram_zpravy} if telegram_zpravy else {})}
        if u["stav"] == "pripraveno":
            jadro.zmen_stav(u, "oznameno")
    return [u["kod"] for u in ulohy]


# ---------------------------------------------------------------- schválení

VZOR_ROZHODNUTI = re.compile(r"\b(schvaluji|zamitam)\s+([a-z0-9]{5})\b")
VZOR_POKUSU = re.compile(r"\b(schval|zamit)")
# Zpráva bez kódu: „schvaluji“, „schvaluji vše“, i doslovné „schvaluji kód“ z dřívějšího návodu.
VZOR_BEZ_KODU = re.compile(r"^\W*(schvaluji|zamitam)(?:\s+(vse|vsechny|kod))?\W*$")
PAMET_ZPRAV_DNU = 30
# Na tyto události linka odpovídá odesílateli; cizí odesílatel, stará zpráva a opakované
# stejné rozhodnutí zůstanou bez odpovědi.
ODPOVIDAT = ("neznamy_kod", "neoznameno", "nelze", "nejasne", "nic_neceka", "nerozpoznano")
SLOVESO = {"schvaleno": "schválit", "zamitnuto": "zamítnout"}
CESKY_STAV = {"schvaleno": "schváleno", "zamitnuto": "zamítnuto", "predano": "předáno", "oznameno": "oznámeno",
              "zjisteno": "zjištěno", "pripraveno": "připraveno", "selhalo": "selhalo", "bez_zmeny": "bez změny"}


def normalizuj(text: str) -> str:
    bez = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return bez.lower()


def rozhodnuti_z_textu(text: str) -> list[tuple[str, str]]:
    return [("schvaleno" if slovo == "schvaluji" else "zamitnuto", k.upper())
            for slovo, k in VZOR_ROZHODNUTI.findall(normalizuj(text))]


def zpravy_telegramu() -> list[dict]:
    """Nepotvrzené zprávy bez posunu offsetu: nic se nespotřebuje."""
    _, chat = telegram_konfigurace()
    odpoved = telegram_api("getUpdates", {"limit": 100, "timeout": 0})
    vysledek = []
    for aktualizace in odpoved.get("result", []):
        zprava = aktualizace.get("message") or aktualizace.get("edited_message") or {}
        vysledek.append({
            "id": f"telegram:{aktualizace.get('update_id')}",
            "od": str(zprava.get("chat", {}).get("id")),
            "povoleny": str(zprava.get("chat", {}).get("id")) == str(chat),
            "cas": dt.datetime.fromtimestamp(zprava.get("date", 0), dt.timezone.utc).isoformat(),
            "text": zprava.get("text", ""),
            "odpoved_na": (zprava.get("reply_to_message") or {}).get("message_id"),
        })
    return vysledek


def zpravy_githubu(fronta: dict, runner=subprocess.run) -> list[dict]:
    vysledek = []
    for u in fronta["ulohy"].values():
        if u["stav"] != "oznameno" or not u.get("issue"):
            continue
        cislo = cislo_issue(u["issue"])
        data = json.loads(gh("issue", "view", cislo, "--json", "comments", runner=runner))
        for c in data.get("comments", []):
            vysledek.append({
                "id": f"github:{c.get('url') or c.get('id')}",
                "od": c.get("author", {}).get("login"),
                "povoleny": c.get("authorAssociation") == "OWNER",
                "cas": c.get("createdAt"),
                "text": c.get("body", ""),
                "uloha": u["kod"],
                "issue": cislo,
            })
    return vysledek


def cas_zpravy(z: dict) -> dt.datetime:
    return dt.datetime.fromisoformat(z["cas"].replace("Z", "+00:00"))


def oznamena_pred(u: dict, z: dict) -> bool:
    return bool(u.get("oznameni")) and dt.datetime.fromisoformat(u["oznameni"]["cas"]) <= cas_zpravy(z)


def vyber_bez_kodu(fronta: dict, z: dict, rozsah: str | None) -> list[dict] | None:
    """Úlohy, kterých se týká zpráva bez kódu. None znamená, že to nejde jednoznačně určit."""
    cekajici = [u for u in fronta["ulohy"].values() if u["stav"] == "oznameno" and oznamena_pred(u, z)]
    if z.get("uloha"):  # komentář v issue jedné úlohy
        return [u for u in cekajici if u["kod"] == z["uloha"]]
    if z.get("odpoved_na") is not None:  # odpověď na konkrétní oznámení v Telegramu
        ve_zprave = [u for u in cekajici if z["odpoved_na"] in u["oznameni"].get("telegram_zpravy", [])]
        if ve_zprave:
            return ve_zprave
    if rozsah in ("vse", "vsechny"):
        return cekajici
    return cekajici if len(cekajici) <= 1 else None


def zpracuj_zpravy(fronta: dict, zpravy: list[dict], kanal: str) -> list[dict]:
    """Uplatní rozhodnutí ze zpráv a vrátí události, na které linka potvrzuje nebo odpovídá.

    Každá zpráva s identifikátorem se zpracuje jen jednou; identifikátory si fronta pamatuje
    30 dní. Zprávy, které schvalování vůbec nezmiňují, linka přechází beze stopy.
    """
    zpracovane = fronta.setdefault("zpracovane_zpravy", {})
    hranice = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=PAMET_ZPRAV_DNU)
    for klic, kdy in list(zpracovane.items()):
        if dt.datetime.fromisoformat(kdy) < hranice:
            del zpracovane[klic]

    udalosti: list[dict] = []
    for z in sorted(zpravy, key=lambda x: x["cas"]):
        if z.get("id") in zpracovane or not VZOR_POKUSU.search(normalizuj(z["text"])):
            continue
        if z.get("id"):
            zpracovane[z["id"]] = jadro.ted()

        def udalost(druh: str, kod: str | None = None, **dalsi) -> None:
            udalosti.append({"druh": druh, "kod": kod, "kanal": kanal, "zprava": z, **dalsi})

        kody = rozhodnuti_z_textu(z["text"])
        if not z["povoleny"]:
            udalost("neopravneno", ", ".join(k for _, k in kody) or None)
            continue

        pozadavky: list[tuple[str, str]] = kody
        if not kody:
            shoda = VZOR_BEZ_KODU.match(normalizuj(z["text"]).strip())
            if not shoda:
                udalost("nerozpoznano")
                continue
            rozhodnuti = "schvaleno" if shoda.group(1) == "schvaluji" else "zamitnuto"
            cile = vyber_bez_kodu(fronta, z, shoda.group(2))
            if cile is None:
                udalost("nejasne", rozhodnuti=rozhodnuti)
                continue
            if not cile:
                udalost("nic_neceka", rozhodnuti=rozhodnuti)
                continue
            pozadavky = [(rozhodnuti, u["kod"]) for u in cile]

        for rozhodnuti, k in pozadavky:
            u = fronta["ulohy"].get(k)
            if not u:
                udalost("neznamy_kod", k)
            elif not u.get("oznameni"):
                udalost("neoznameno", k, rozhodnuti=rozhodnuti)
            elif not oznamena_pred(u, z):
                udalost("starsi", k)
            elif u["stav"] == "oznameno":
                u["rozhodnuti"] = {"cas": z["cas"], "rozhodnuti": rozhodnuti, "kanal": kanal, "od": z["od"]}
                jadro.zmen_stav(u, rozhodnuti, f"{kanal}, {z['od']}")
                udalost(rozhodnuti, k)
            elif u.get("rozhodnuti", {}).get("rozhodnuti") == rozhodnuti:
                udalost("uz_rozhodnuto", k)  # stejné rozhodnutí podruhé, třeba v druhém kanálu
            else:
                udalost("nelze", k, rozhodnuti=rozhodnuti)
    return udalosti


def popis_udalosti(e: dict, fronta: dict) -> str:
    k, u = e["kod"], fronta["ulohy"].get(e["kod"] or "", {})
    return {
        "schvaleno": f"{k}: schvaleno",
        "zamitnuto": f"{k}: zamitnuto",
        "neznamy_kod": f"{k}: neznámý kód, ignorováno",
        "neoznameno": f"{k}: úloha ještě nebyla oznámena, ignorováno",
        "neopravneno": f"{k or 'zpráva'}: odesílatel {e['zprava']['od']} nemá oprávnění, ignorováno",
        "starsi": f"{k}: zpráva je starší než oznámení, ignorováno",
        "uz_rozhodnuto": f"{k}: už {CESKY_STAV.get(u.get('stav'), u.get('stav'))}, beze změny",
        "nelze": f"{k}: nelze {SLOVESO.get(e.get('rozhodnuti'), '')}, úloha je ve stavu {u.get('stav')}",
        "nejasne": "zpráva bez kódu, na rozhodnutí čeká více úloh",
        "nic_neceka": "zpráva bez kódu, nic nečeká na rozhodnutí",
        "nerozpoznano": "zpráva zmiňuje schválení, ale nemá tvar „schvaluji KÓD“",
    }[e["druh"]]


def uplatni_rozhodnuti(fronta: dict, zpravy: list[dict], kanal: str) -> list[str]:
    """Změní stav oznámených úloh podle zpráv. Vrátí popis toho, co se stalo."""
    return [popis_udalosti(e, fronta) for e in zpracuj_zpravy(fronta, zpravy, kanal)]


# ---------------------------------------------------------------- potvrzení

def mistni_cas(iso: str) -> str:
    try:
        from zoneinfo import ZoneInfo
        c = dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(ZoneInfo("Europe/Prague"))
    except Exception:  # bez databáze časových pásem zůstane UTC
        c = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return f"{c.day}. {c.month}. {c.hour}:{c.minute:02d}"


def cekajici_kody(fronta: dict) -> str:
    kody = [f"{u['kod']} ({u['sada']} {u['obdobi']})" for u in fronta["ulohy"].values() if u["stav"] == "oznameno"]
    return ", ".join(kody) if kody else "žádné"


def text_potvrzeni(u: dict, registr: dict | None = None) -> str:
    r = u["rozhodnuti"]
    hlava = (f"{u['kod']} {CESKY_STAV[u['stav']]}: {u['sada']} · {u['obdobi']}. "
             f"Přijato z kanálu {r['kanal']}, zpráva z {mistni_cas(r['cas'])}.")
    if u["stav"] == "zamitnuto":
        return hlava + "\nNic se nepředá, web zůstává beze změny."
    if (u.get("priprava", {}).get("zpracovani") or {}).get("predani"):
        return hlava + "\nTeď: linka připraví pull request a odkaz pošle, jakmile vznikne."
    krok = ((registr or {}).get("sady", {}).get(u["sada"], {}).get("aktualizace", {}).get("lidsky_krok")) or "ruční převzetí podle registru"
    return hlava + f"\nSada nemá soubory k automatickému předání; úloha se uzavře. Další krok: {krok}"


def text_odpovedi(e: dict, fronta: dict) -> str:
    cekaji = cekajici_kody(fronta)
    druh, k = e["druh"], e["kod"]
    if druh == "neznamy_kod":
        return f"Kód {k} neznám, nic jsem neprovedl. Na rozhodnutí čekají: {cekaji}."
    if druh == "neoznameno":
        return f"Úloha {k} ještě nebyla oznámena, nic jsem neprovedl."
    if druh == "nelze":
        u = fronta["ulohy"][k]
        return (f"{k} nelze {SLOVESO[e['rozhodnuti']]}: je ve stavu {CESKY_STAV.get(u['stav'], u['stav'])}. "
                "Změnu rozhodnutí udělá jen správce příkazem znovu.")
    if druh == "nejasne":
        return f"Zpráva nemá kód a na rozhodnutí čeká víc úloh: {cekaji}. Napiš „schvaluji KÓD“, nebo „schvaluji vše“."
    if druh == "nic_neceka":
        return "Nic teď nečeká na rozhodnutí, zprávu jsem nepoužil."
    return f"Zprávě jsem nerozuměl. Napiš „schvaluji KÓD“ nebo „zamítám KÓD“. Na rozhodnutí čekají: {cekaji}."


def text_predani(u: dict, vysledek: dict | None = None, chyba: str | None = None) -> str:
    if chyba:
        return (f"{u['kod']}: předání selhalo ({u['sada']} · {u['obdobi']}): {chyba}\n"
                "Úloha zůstává schválená a linka to zkusí při dalším běhu. Stejnou chybu už znovu hlásit nebude.")
    if vysledek and vysledek.get("pull_request"):
        return (f"{u['kod']} předáno: pull request {vysledek['pull_request']}\n"
                "Web se změní až po sloučení a přepnutí období v registru.")
    return f"{u['kod']} uzavřeno bez souborů. {(vysledek or {}).get('poznamka', '')}".strip()


def rozesli(fronta: dict, telegram: list[str], komentare: dict[str, list[str]], kanaly: list[str],
            nanecisto: bool, zavrit: tuple[str, ...] = (), runner=subprocess.run) -> list[str]:
    """Pošle potvrzení. Chyba doručení nezastaví linku; vrátí seznam chyb, aby běh skončil červeně."""
    chyby = []
    if telegram and "telegram" in kanaly:
        zpravy, aktualni = [], "Datová linka prijimackynaskolu.cz"
        for t in telegram:
            if len(aktualni) + len(t) + 2 > LIMIT_ZPRAVY:
                zpravy.append(aktualni)
                aktualni = "Datová linka prijimackynaskolu.cz"
            aktualni += "\n\n" + t
        zpravy.append(aktualni)
        if nanecisto:
            print("[nanečisto] Telegram by dostal:\n" + "\n---\n".join(zpravy))
        else:
            try:
                posli_telegram(zpravy)
            except Exception as e:  # síť, token
                chyby.append(f"Telegram: {e}")
    if "github" in kanaly:
        for cislo in sorted(set(komentare) | set(zavrit)):
            telo = "\n\n".join(komentare.get(cislo, []))
            prikaz = ["issue", "close", cislo, "--comment", telo] if cislo in zavrit else ["issue", "comment", cislo, "--body", telo]
            if cislo in zavrit and not telo:
                prikaz = ["issue", "close", cislo]
            if nanecisto:
                print(f"[nanečisto] gh {' '.join(prikaz[:3])}: {telo}")
                continue
            try:
                gh(*prikaz, runner=runner)
            except Exception as e:
                chyby.append(f"GitHub issue {cislo}: {e}")
    for c in chyby:
        print("chyba doručení: " + c, file=sys.stderr)
    return chyby


def potvrd(fronta: dict, udalosti: list[dict], kanaly: list[str], nanecisto: bool,
           registr: dict | None = None, runner=subprocess.run) -> list[str]:
    """Potvrdí rozhodnutí do Telegramu i do issue úlohy a odpoví na zprávy, kterým linka nerozuměla."""
    telegram: list[str] = []
    komentare: dict[str, list[str]] = {}
    for e in udalosti:
        if e["druh"] in ("schvaleno", "zamitnuto"):
            u = fronta["ulohy"][e["kod"]]
            text = text_potvrzeni(u, registr)
            telegram.append(text)
            if u.get("issue"):
                komentare.setdefault(cislo_issue(u["issue"]), []).append(text)
        elif e["druh"] in ODPOVIDAT:
            text = text_odpovedi(e, fronta)
            if e["kanal"] == "telegram":
                telegram.append(text)
            elif e["kanal"] == "github" and e["zprava"].get("issue"):
                komentare.setdefault(e["zprava"]["issue"], []).append(text)
    if not telegram and not komentare:
        return []
    return rozesli(fronta, telegram, komentare, kanaly, nanecisto, runner=runner)
