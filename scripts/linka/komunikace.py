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
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from . import jadro

DRUHY = {"nove_obdobi": "nové období", "revize": "revize", "zmizelo": "zdroj zmizel"}
LIMIT_ZPRAVY = 3800  # Telegram přijme 4096 znaků


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
    """Jedna nebo více zpráv do limitu délky; každá končí návodem ke schválení."""
    hlava = "Datová linka prijimackynaskolu.cz: nová data k převzetí\n"
    kody = ", ".join(u["kod"] for u in ulohy if u["stav"] != "selhalo")
    pata = (
        "\nSchválit: odpověz „schvaluji KÓD“, zamítnout „zamítám KÓD“."
        f"\nKódy k rozhodnutí: {kody}"
        "\nWeb se po schválení nezmění: vznikne pull request, období přepneš zvlášť."
        if kody else
        "\nNic k rozhodnutí: zpracování selhalo, oprava je na správci linky."
    )
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


def posli_telegram(zpravy: list[str]) -> None:
    _, chat = telegram_konfigurace()
    for z in zpravy:
        telegram_api("sendMessage", {"chat_id": chat, "text": z, "disable_web_page_preview": "true"})


# ---------------------------------------------------------------- GitHub

def gh(*argumenty: str, runner=subprocess.run) -> str:
    vysledek = runner(["gh", *argumenty], capture_output=True, text=True)
    if vysledek.returncode != 0:
        raise RuntimeError(f"gh {' '.join(argumenty[:2])}: {vysledek.stderr.strip()[:300]}")
    return vysledek.stdout.strip()


def zaloz_issue(u: dict, text: str, runner=subprocess.run) -> str:
    return gh("issue", "create", "--title", f"Nová data k převzetí: {u['kod']} {u['sada']} {u['obdobi']}",
              "--body", text + "\n\nSchválit komentářem `schvaluji " + u["kod"] + "`, zamítnout `zamítám " + u["kod"] + "`.",
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

    doruceno = ["soubor"]
    for kanal in kanaly:
        if kanal == "telegram":
            if nanecisto:
                print("[nanečisto] Telegram by dostal:\n" + "\n---\n".join(zpravy))
            else:
                posli_telegram(zpravy)
            doruceno.append("telegram")
        elif kanal == "github":
            for u in ulohy:
                if nanecisto:
                    print(f"[nanečisto] gh issue create pro {u['kod']}")
                else:
                    u["issue"] = zaloz_issue(u, text_ulohy(u), runner=runner)
            doruceno.append("github")
    for u in ulohy:
        u["oznameni"] = {"cas": jadro.ted(), "kanaly": doruceno, "nanecisto": nanecisto}
        if u["stav"] == "pripraveno":
            jadro.zmen_stav(u, "oznameno")
    return [u["kod"] for u in ulohy]


# ---------------------------------------------------------------- schválení

VZOR_ROZHODNUTI = re.compile(r"\b(schvaluji|zamitam)\s+([a-z0-9]{5})\b")


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
            "od": str(zprava.get("chat", {}).get("id")),
            "povoleny": str(zprava.get("chat", {}).get("id")) == str(chat),
            "cas": dt.datetime.fromtimestamp(zprava.get("date", 0), dt.timezone.utc).isoformat(),
            "text": zprava.get("text", ""),
        })
    return vysledek


def zpravy_githubu(fronta: dict, runner=subprocess.run) -> list[dict]:
    vysledek = []
    for u in fronta["ulohy"].values():
        if u["stav"] != "oznameno" or not u.get("issue"):
            continue
        cislo_issue = u["issue"].rstrip("/").rsplit("/", 1)[-1]
        data = json.loads(gh("issue", "view", cislo_issue, "--json", "comments", runner=runner))
        for c in data.get("comments", []):
            vysledek.append({
                "od": c.get("author", {}).get("login"),
                "povoleny": c.get("authorAssociation") == "OWNER",
                "cas": c.get("createdAt"),
                "text": c.get("body", ""),
            })
    return vysledek


def uplatni_rozhodnuti(fronta: dict, zpravy: list[dict], kanal: str) -> list[str]:
    """Změní stav oznámených úloh podle zpráv. Vrátí popis toho, co se stalo."""
    zaznam = []
    for z in zpravy:
        for rozhodnuti, k in rozhodnuti_z_textu(z["text"]):
            u = fronta["ulohy"].get(k)
            if not u:
                zaznam.append(f"{k}: neznámý kód, ignorováno")
                continue
            if not z["povoleny"]:
                zaznam.append(f"{k}: odesílatel {z['od']} nemá oprávnění, ignorováno")
                continue
            if u["stav"] != "oznameno":
                continue  # už rozhodnuto nebo ještě neoznámeno
            if dt.datetime.fromisoformat(z["cas"].replace("Z", "+00:00")) < dt.datetime.fromisoformat(u["oznameni"]["cas"]):
                zaznam.append(f"{k}: zpráva je starší než oznámení, ignorováno")
                continue
            u["rozhodnuti"] = {"cas": z["cas"], "rozhodnuti": rozhodnuti, "kanal": kanal, "od": z["od"]}
            jadro.zmen_stav(u, rozhodnuti, f"{kanal}, {z['od']}")
            zaznam.append(f"{k}: {rozhodnuti}")
    return zaznam
