"""Pravidla klasifikace školních novinek a jediné publikační rozhodnutí.

Jeden zdroj pravdy pro měření (``rss-klasifikace-mereni.py``), provozní sklízeč
(``sklizec-novinek.py``) i regresní testy (``tests/test_rss_klasifikace.py``).
Pravidla i jejich verze (``VERZE_PRAVIDEL``) se mění jen tady; kdo je používá,
ukládá verzi ke každé položce, aby šlo rekonstruovat, co bylo čtenářům sděleno.

Návrh: ``docs/skolske-novinky-rss-2027.md`` oddíly 3.4 a 3.5.
"""
from __future__ import annotations

import html
import json
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET


# Verze pravidel je auditní údaj i spouštěč přepočtu: uložená položka s jinou
# verzí se při další sklizni přepíše, i když se článek nezměnil. Součástí je
# i verze rozhodovacího modelu (`novinky_jev.MODEL`) – kdyby se měnila potichu,
# nešlo by poznat, čím věta s termíny vznikla.
VERZE_PRAVIDEL = "2026-09-21.1"


def strip(t: str) -> str:
    return unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()


# --- Témata (co je článek zač) a strážní vylučovače --------------------------------
# Téma samo o sobě neříká nic o významu: „Volná místa nemáme" má téma volna_mista,
# ale nesmí se stát kartou „škola má volná místa". Význam řeší jistota/význam níže.
PRAVIDLA_TEMA = [
    ("dod", [r"otevrenych dveri", r"den otevrenych", r"\bdod\b", r"dvere otevrene",
             r"otvirame dvere"],
     []),
    ("talentove_zkousky", [r"talentov(e|ou|ych|a) zkousk", r"talentovk"],
     []),
    # Akce, které škola pořádá pro uchazeče. To jsou zprávy, kvůli kterým rodina
    # na stránku přišla (rozhodnutí zadavatele 20. 9. 2026).
    #
    # „Nanečisto" samo o sobě nestačí: gymnázium Příbram vydává „Cvičné testy
    # B2 First a C1 Advanced" pro vlastní žáky. Vzor proto musí spojit cvičení
    # s přijímačkami, ne jen najít slovo „cvičný".
    ("prijimacky_nanecisto",
     [r"prijimac\w*\s+nanecisto", r"(zkousk|test|testovani)\w*\s+nanecisto",
      r"nanecisto\w*\s+(prijimac|jednotn|jpz)",
      r"cvicn\w*\s+(prijimac\w*|test\w*\s+(k|na)\s+prijimac)",
      r"zkusebn\w*\s+prijimac"],
     [r"maturit", r"certifikat", r"cambridge"]),
    ("setkani_uchazecu",
     [r"(schuzk|setkan|konzultac|besed|prohlidk|dilna|dilnic)\w*\s+(pro|s|se)\s+"
      r"(uchazec|zajemc|budouc)",
      r"setkani s uchazec"],
     [r"vysok\w* skol", r"univerzit", r"maturit"]),
    ("pripravny_kurz",
     [r"pripravn\w*\s+kurz", r"kurz\w*\s+(k|na|ke)\s+prijimac",
      r"kurz\w*\s+(pro|s)\s+(uchazec|zajemc)"],
     [r"maturit", r"vysok\w* skol", r"univerzit", r"lyzarsk", r"tanecn", r"plesov"]),
    ("nahradni_termin", [r"nahradni termin"],
     []),
    ("kriteria", [r"kriteria (pro )?prijeti", r"podminky (pro )?prijeti",
                  r"podminky prijimaciho rizeni", r"kriteria prijimaciho"],
     []),
    ("volna_mista", [r"voln(a|e|ych) mist", r"volne kapacit"],
     [r"parkov", r"zajezd", r"exkurz", r"krouz", r"kurz"]),
    ("vysledky_prijm", [r"vysledk.{0,40}prijimac", r"vysledkov[aey] listin",
                        r"seznam prijat", r"prijati k"],
     [r"turnaj", r"soutez", r"olympiad", r"prebor", r"sport", r"florbal",
      r"fotbal", r"volejbal", r"basket", r"atletik", r"sach", r"liga"]),
    ("terminy_jpz", [r"rozvrzeni terminu", r"terminy jednotne prijimaci",
                     r"jednotna prijimaci zkousk", r"\bjpz\b"],
     []),
    ("prijimaci_rizeni", [r"prijimaci rizeni", r"prijimaci zkousk", r"prijimack",
                          r"prijimaci pohovor", r"druh(e|y) kolo prijimac",
                          r"dodatecn(e|y) kolo", r"[23]\. kol[oa]", r"priloha c. 2"],
     []),
    ("prihlaska", [r"prihlask", r"prihlas se na stredni", r"e-prihlask",
                   r"elektronicka prihlask"],
     [r"obed", r"soutez", r"turnaj", r"zajezd", r"exkurz", r"kurz", r"webinar",
      r"seminar", r"plesovy kurz", r"tanc", r"skola v prirode", r"lyzarsk",
      r"maturit", r"prihlasit se k", r"prihlaste se na"]),
]
PRAVIDLA_TEMA = [(t, [re.compile(p) for p in ps], [re.compile(p) for p in ex])
                 for t, ps, ex in PRAVIDLA_TEMA]

# Vylučovač smí potlačit téma jen tam, kde chybí jednoznačný přijímací kontext:
# „Výsledky přijímacího řízení na sportovní gymnázium" není sportovní výsledek,
# i když obsahuje slovo „sport" (F3 čtvrté oponentury). Vylučujeme konkrétní cizí
# výsledkové listiny, ne každý článek s daným slovem.
OCHRANA_TEMA = {"vysledky_prijm": [re.compile(p) for p in [
    r"prijimaci(ho|m|ch|mu)? rizen", r"prijimac\w* zkous", r"prijimacek",
    r"ke vzdelavani ve stredni", r"\d\. kol[aoe] prijimac", r"prijati ke studiu",
]]}

# Stráže pro VYSOKOU jistotu (co smí na kartu a do e-mailu).
# Kategorie feedu se do textu pro vysokou jistotu NEPOUŽÍVAJÍ – školy lepí
# kategorii „Přijímací řízení" i na harmonogram roku; kategorie je jen slabý signál.
RE_UCHAZEC = re.compile(r"uchazec|budouci (zac|student|pri slus)|zakladni skol|"
                        r"devat(a|e|ych) trid|osm(a|e|ych) trid|prohlidk|registrac|prijimac")
RE_CIZI_POORADATEL = re.compile(r"krajsk|urad|spolecnost|firm|zamestnav|statk|"
                                r"\bmesta\b|\bobec\b|\bobci\b|msmt|ministerstv|polici|hasi")
RE_VS = re.compile(r"\bvs\b|vysok(a|e|ou) skol|univerzit|fakult|\bcvut\b|\bmuni\b|\bupol\b")
# VOŠ = vyšší odborná škola (terciární): přijímání na VOŠ je legitimní novinka společné
# organizace, ale nesmí na kartu/e-mail pro uchazeče o SŠ (N1 třetí oponentury).
RE_VOS = re.compile(r"\bvos\b|\bvosz\b|vys(s|si) odborn|diplomovan(a|ou) sestr")
# Smíšená zpráva SŠ i VOŠ není „obsah mimo cílovou skupinu": nesmí na kartu,
# ale ani zmizet z neutrálního seznamu (F3 čtvrté oponentury).
RE_SS = re.compile(r"\bss\b|\bsos\b|\bsps\b|\bsse\b|stredni skol|stredni odborn|"
                   r"stredni prumyslov|stredni zdravotnick|gymnazi|obchodni akademi|"
                   r"ucilist|konzervator|maturitni obor|ctyrlet|osmilet|sestilet")
RE_ZUS = re.compile(r"\bzus\b|zakladni umeleck")
RE_MATURITA = re.compile(r"maturit")
RE_NEGACE = re.compile(r"nemam|nejsou.{0,20}voln|jiz nejsou|nejsou jiz|uz nejsou|"
                       r"vsechna mista.{0,15}obsazen|obsazen|kapacit[ay].{0,15}naplnen|"
                       r"uz nenabiz|nebude")
RE_VYHLASENI = re.compile(r"vyhlas|zverejn|otevir|spust|prodlouz|nabidk[ay] .{0,20}kolo")
# Stav sdělení: pozvánka, nebo její změna/zrušení (N2 třetí oponentury).
# Čtvrtá oponentura (F1): zrušení se rozhoduje po klauzulích, ne nad celým textem –
# „není zrušen" je popření zrušení, „registrace zrušena, akce proběhne" ruší přihlášení,
# ne akci, a „nekoná se" je zrušení, i když slovo „zrušeno" v textu není.
# Pozor na slova, která zrušení jen připomínají: „poučení o odvolání" je součástí
# výsledků přijímacího řízení, ne zrušení akce (ověřeno na vzorku – 600024016).
RE_ZRUSENI = re.compile(r"\brus(i|ime)\b|zrusen|zrusuj|odlozen|odklada|"
                        r"nebude se konat|nekona se|se nekona|nekonaji se|se nekonaji|"
                        r"neuskutecni se|se neuskutecni|nepovede se")
RE_NEG_ZRUSENI = re.compile(r"nezrusen|nerus(i|ime)\b|\bne\w+\b\s+(?:\w+\s+){0,2}zrusen")
# H1 páté oponentury: škola termín uvede, ale sama ho označí za nejistý. Takový
# údaj se nesmí stát tvrzením na kartě – „zatím není potvrzen" není oznámení.
RE_NEPOTVRZENO = re.compile(
    r"nen[ií] (jeste |zatim )?potvrz|nepotvrzen|zatim neni znam|jeste neni znam|"
    r"predbezn|orientacn|bude (jeste )?(upresn|stanoven|oznamen|zverejnen|doplnen)|"
    r"upresnime|oznamime pozdeji|zverejnime pozdeji|v jednani|pripravujeme termin")
# Pozitivní vazba na konání: bez ní se pozvánka neodvozuje z pouhé absence zrušení.
RE_KONA = re.compile(r"\bse kona\w*|\bkona(ji)? se\b|\bkonat se\b|probehn|uskutecni se|"
                     r"se uskutecni|zveme|zvou vas|srdecne vas|prijdte|prijd se|navstiv|"
                     r"tesime se|poradame|pozvank|budeme se tesit")
RE_ZMENA = re.compile(r"zmen[ay]?\b.{0,20}termin|termin.{0,20}zmen|presun|posunut|novy termin")

# --- Klauzule (věta či položka výčtu) -------------------------------------------
# Datum „9. 12. 2026" má tečky, které nejsou koncem věty, a čas „14:00" dvojtečku,
# která není oddělovačem; hranice se proto hledají mimo rozsahy nalezených dat a časů.
RE_ROZSAH_DATA = re.compile(r"\b\d{1,2}\.\s*\d{1,2}\.\s*20\d{2}|\b\d{1,2}\.\s*[a-z]+\s+20\d{2}"
                            r"|\b\d{1,2}\.\s*\d{1,2}\.|\b\d{1,2}\.\s*[a-z]+\b")
RE_HRANICE = re.compile(r"[.;!?,\n\r\t•|]+\s*|(?<!\d):(?!\d)\s*|\s-\s")


def rozdel_klauzule(s: str) -> list[tuple[int, int, str]]:
    """Normalizovaný text na klauzule `(zacatek, konec, text)`. Slouží k tomu, aby se
    význam (zrušení, role data) rozhodoval u konkrétní události, ne nad celým článkem."""
    spany = [(m.start(), m.end()) for m in RE_ROZSAH_DATA.finditer(s)]
    uvnitr = lambda i: any(a <= i < b for a, b in spany)
    useky, zac = [], 0
    for m in RE_HRANICE.finditer(s):
        if uvnitr(m.start()) or m.start() < zac:
            continue
        useky.append((zac, m.start()))
        zac = m.end()
    useky.append((zac, len(s)))
    return [(a, b, s[a:b]) for a, b in useky if s[a:b].strip()]


def _stav_klauzule(v: str) -> str:
    """Stav klauzule: zruseno | registrace_zrusena | nejasny_predmet | nepotvrzeno |
    popreno | zmeneno | kona | neurceno."""
    if RE_NEPOTVRZENO.search(v):
        return "nepotvrzeno"
    if RE_ZRUSENI.search(v):
        if RE_NEG_ZRUSENI.search(v):
            return "popreno"  # „není zrušen" není potvrzením konání, ale ani zrušením
        if RE_REGISTRACE.search(v):
            # „registrace zrušena" ruší přihlášení, ne akci; mluví-li klauzule o obojím
            # („registrace na DOD zrušena"), předmět zrušení není určitelný
            return "nejasny_predmet" if RE_AKCE.search(v) else "registrace_zrusena"
        return "zruseno"
    if RE_ZMENA.search(v):
        return "zmeneno"
    if RE_KONA.search(v):
        return "kona"
    return "neurceno"


def urci_stav(pol: dict) -> str:
    """Stav sdělení: oznameno | zmeneno | zruseno | nejiste.

    `oznameno` vyžaduje, aby žádná klauzule neodporovala konání; rozporný nebo
    popřený výrok končí na `nejiste` (= neutrální odkaz, žádná odvozená pozvánka)."""
    text = strip(" ".join([pol.get("titulek", ""), pol.get("popis", "")]))
    stavy = [_stav_klauzule(v) for _, _, v in rozdel_klauzule(text)]
    if "popreno" in stavy or "nejasny_predmet" in stavy:
        return "nejiste"  # popřené či nejasně zaměřené zrušení = neutrální odkaz
    if "nepotvrzeno" in stavy:
        return "nejiste"  # termín, který škola sama označí za nepotvrzený
    if "zruseno" in stavy:
        return "nejiste" if "kona" in stavy else "zruseno"
    if "registrace_zrusena" in stavy:
        return "nejiste"  # o osudu akce samotné text nic neříká
    if "zmeneno" in stavy:
        return "zmeneno"
    return "oznameno"


def klasifikuj_temu(pol: dict) -> tuple[list[str], list[str]]:
    """Téma položky. Pracuje nad titulkem a popisem; kategorie jen jako posilovač."""
    text = strip(" ".join([pol.get("titulek", ""), pol.get("popis", "")]))
    tridy, vylouceno = [], []
    for t, ps, ex in PRAVIDLA_TEMA:
        if any(p.search(text) for p in ps):
            chraneno = any(o.search(text) for o in OCHRANA_TEMA.get(t, ()))
            if any(e.search(text) for e in ex) and not chraneno:
                vylouceno.append(t)
            else:
                tridy.append(t)
    return tridy, vylouceno


def rozhodni_jistotu(pol: dict, trida: str) -> str:
    """Jistota pro kartu/e-mail: 'vysoka' | 'stredni' | 'zadna'.

    Odděluje téma od významu sdělení (negace, cizí pořadatel, VŠ, VOŠ, reportáž).
    Zrušenou/změněnou akci posuzuje volající podle `urci_stav` – vysoká jistota
    tématu sama nestačí k budoucí pozvánce."""
    text = strip(" ".join([pol.get("titulek", ""), pol.get("popis", "")]))
    if RE_VS.search(text):
        return "zadna"  # přijímačky na VŠ v narativním článku
    if RE_VOS.search(text):
        # výhradně VOŠ = mimo cílovou skupinu; SŠ i VOŠ v jedné zprávě = neutrální
        # odkaz (potlačit celou zprávu by zkreslilo měření úplnosti) – F3
        return "stredni" if RE_SS.search(text) else "zadna"
    if trida == "dod":
        if RE_CIZI_POORADATEL.search(text):
            return "stredni"  # DOD krajského úřadu, firmy, statku…
        return "vysoka" if RE_UCHAZEC.search(text) else "stredni"
    if trida == "volna_mista":
        if RE_NEGACE.search(text):
            return "zadna"  # „volná místa nemáme" nesmí tvrdit dostupnost
        # Pouhé „rocnik" nestačí – „volná místa do 7., 8. a 9. tříd" je základní škola.
        return "vysoka" if RE_UCHAZEC.search(text) else "stredni"
    if trida == "nahradni_termin":
        return "vysoka" if RE_UCHAZEC.search(text) else "stredni"
    if trida in ("prijimacky_nanecisto", "setkani_uchazecu", "pripravny_kurz"):
        # Akci může pořádat i někdo jiný („přijímačky nanečisto pořádá kraj"):
        # cizí pořadatel sráží na střední jistotu stejně jako u dne otevřených dveří.
        if RE_CIZI_POORADATEL.search(text):
            return "stredni"
        return "vysoka" if RE_UCHAZEC.search(text) else "stredni"
    if trida == "talentove_zkousky":
        if RE_ZUS.search(text):
            return "stredni"  # talentovky ZUŠ, ne SŠ
        return "vysoka"
    if trida in ("vysledky_prijm", "kriteria"):
        return "vysoka"
    if trida == "prijimaci_rizeni":
        return "vysoka" if RE_VYHLASENI.search(text) else "stredni"
    if trida == "terminy_jpz":
        return "stredni"
    return "stredni"  # prihlaska a ostatní nikdy na kartu automaticky


MESECE = {"ledna": 1, "unora": 2, "brezna": 3, "dubna": 4, "kvetna": 5, "cervna": 6,
          "cervence": 7, "srpna": 8, "zari": 9, "rijna": 10, "listopadu": 11,
          "prosince": 12, "leden": 1, "unor": 2, "brezen": 3, "duben": 4, "kveten": 5,
          "cerven": 6, "cervenec": 7, "srpen": 8, "rijnen": 10, "listopad": 11,
          "prosinec": 12}


def _platne_datum(d: int, mo: int, y: int) -> str | None:
    """Kalendářní validace – „31. 2. 2027" se nesmí stát 2027-02-31."""
    try:
        return datetime(y, mo, d).date().isoformat()
    except ValueError:
        return None


RE_REGISTRACE = re.compile(r"registrac|prihlas\w*\s+(do|od|se)|uzaverk|uzavierk|"
                           r"termin odevzdani|odevzdani prihlas|rezervac|konec prihlas")
# Signál, že klauzule mluví o samotné akci (a ne o přihlašování na ni).
RE_AKCE = re.compile(r"otevrenych dveri|den otevrenych|dny otevrenych|\bdod\b|dvere otevrene|"
                     r"prohlidk|\bse kona\w*|\bkona(ji)? se\b|\bkonat se\b|probehn|"
                     r"uskutecni|zveme|prijdte|prijd se|navstiv|pozvank|tesime se|"
                     r"talentov\w* zkousk|prijimaci zkousk|\btermin\w* (akce|konani)")


RE_CASOVE_SLOVO = re.compile(
    r"\b\d{1,2}\.\s*\d{1,2}\.(\s*20\d{2})?|\b\d{1,2}[:.]\d{2}\b|\b20\d{2}\b|\b\d{1,2}\.|"
    # Pokračovací slova („další termíny 7. 1.") mluví o téže akci, ne o nové.
    r"\b(dalsi|dals\w*|termin\w*|nasledn\w*|take|rovnez|pripadne|poprip\w*|dale|opet|"
    r"od|do|v|ve|a|az|hod|hodin|hodiny|rano|dopoledne|odpoledne|vecer|"
    r"pondel\w*|uter\w*|streda|stredu|ctvrtek|patek|sobota|sobotu|nedele|nedeli|"
    # Měsíce ve všech tvarech, které se v datech objevují („7. listopadu", „9. prosince").
    r"led(en|na|nu)|unor(a|u)?|brez(en|na|nu)|dub(en|na|nu)|kvet(en|na|nu)|"
    r"cerv(en|na|nu)|cervenec|cervenc(e|i)|srp(en|na|nu)|zari|rij(en|na|nu)|"
    r"listopad(u|a)?|prosin(ec|ce|ci))\b")


def _holy_casovy_udaj(v: str) -> bool:
    """Nese klauzule jen čas a nic vlastního? Po odstranění časových výrazů
    nesmí zbýt žádné slovo delší než dva znaky."""
    zbytek = RE_CASOVE_SLOVO.sub(" ", v)
    return not any(len(s) > 2 for s in re.findall(r"[a-z]+", zbytek))


def _role_data(useky: list[tuple[int, int, str]], zacatek: int) -> str:
    """Role data: akce | registrace | neurcena (F2 čtvrté oponentury).

    Rozhoduje klauzule, ve které datum leží – tedy kontext před popiskem i za ním
    („9. 12. 2026 – konec registrace"). Roli `registrace` nelze zdědit z jiné
    klauzule; nejednoznačné datum zůstává `neurcena` a na kartu se nedostane."""
    vlastni = next((i for i, (a, b, _) in enumerate(useky) if a <= zacatek < b), None)
    if vlastni is None:
        return "neurcena"
    v = useky[vlastni][2]
    reg, akce = RE_REGISTRACE.search(v), RE_AKCE.search(v)
    if reg and akce:
        return "neurcena"  # „registrace na den otevřených dveří do 1. 12." – nejasné
    if reg:
        return "registrace"
    if akce:
        return "akce"
    # Dědit roli `akce` z dřívější klauzule smí jen holý časový údaj („9. 12. 2026",
    # „od 14:00"). Klauzule s vlastním předmětem („Soutěž začne 12. 12. 2026") mluví
    # o jiné události a datum se na kartu akce dostat nesmí – H1 páté oponentury.
    if not _holy_casovy_udaj(v):
        return "neurcena"
    for a, b, predchozi in reversed(useky[:vlastni]):
        if RE_AKCE.search(predchozi):
            return "akce"
        if RE_REGISTRACE.search(predchozi):
            return "neurcena"  # registrace z jiné klauzule roli nepřenáší
    return "neurcena"


def extrahuj_data_akce(text: str) -> dict:
    """Data z textu s rolí (akce / registrace / neurčená) a se stavem klauzule,
    ve které leží. S rokem jen kalendářně platná; bez roku zvlášť (na kartu nesmí);
    numerické datum s rokem se v bez_roku neopakuje.

    `podrobne` nese ke každému datu roli a stav jeho klauzule, aby zrušení jednoho
    z několika termínů nezrušilo všechny ostatní (F1 čtvrté oponentury)."""
    s = strip(text)
    useky = rozdel_klauzule(s)
    s_rokem, bez_roku, registrace, neurcena = set(), set(), set(), set()
    podrobne: dict[str, dict] = {}

    def zapis(iso: str, zacatek: int) -> None:
        # Totéž datum bývá v textu dvakrát (titulek a věta s popisem konání).
        # Role se skládá: akce+neurčená = akce, akce+registrace = neurčená (rozpor).
        role = _role_data(useky, zacatek)
        v = next((t for a, b, t in useky if a <= zacatek < b), "")
        zaznam = podrobne.setdefault(iso, {"role": role, "stav_klauzule": "neurceno"})
        if zaznam["role"] != role:
            zaznam["role"] = "neurcena" if {zaznam["role"], role} == {"akce", "registrace"} \
                else next(r for r in ("akce", "registrace") if r in {zaznam["role"], role})
        stav_v = _stav_klauzule(v)
        if zaznam["stav_klauzule"] == "neurceno" or stav_v in STAVY_BLOKUJICI_TERMIN:
            zaznam["stav_klauzule"] = stav_v

    def _rozdel_role() -> None:
        for iso, z in podrobne.items():
            {"registrace": registrace, "akce": s_rokem, "neurcena": neurcena}[z["role"]].add(iso)

    for m in re.finditer(r"\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})", s):
        iso = _platne_datum(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if iso:
            zapis(iso, m.start())
    for m in re.finditer(r"\b(\d{1,2})\.\s*([a-z]+)\s+(20\d{2})", s):
        mo = MESECE.get(m.group(2))
        if mo:
            iso = _platne_datum(int(m.group(1)), mo, int(m.group(3)))
            if iso:
                zapis(iso, m.start())
    for m in re.finditer(r"\b(\d{1,2})\.\s*([a-z]+)\b(?!\s*20\d{2})", s):
        mo = MESECE.get(m.group(2))
        if mo and 1 <= int(m.group(1)) <= 31:
            bez_roku.add(f"{mo:02d}-{int(m.group(1)):02d}")
    for m in re.finditer(r"\b(\d{1,2})\.\s*(\d{1,2})\.(?!\s*20\d{2})", s):
        if 1 <= int(m.group(1)) <= 31 and 1 <= int(m.group(2)) <= 12:
            bez_roku.add(f"{int(m.group(2)):02d}-{int(m.group(1)):02d}")
    _rozdel_role()
    # datum s rokem se v bez_roku neopakuje
    s_rokem_md = {iso[5:] for iso in s_rokem | registrace | neurcena}
    bez_roku -= s_rokem_md
    return {"s_rokem": sorted(s_rokem), "registrace": sorted(registrace),
            "neurcena": sorted(neurcena), "bez_roku": sorted(bez_roku),
            "podrobne": podrobne}


def _zkus_parse(text: str):
    try:
        return ET.fromstring(text.encode("utf-8", errors="replace"))
    except ET.ParseError:
        return None


_XML_ENTITY = {"amp", "lt", "gt", "quot", "apos"}


def _nahrad_html_entity(text: str) -> str:
    """XML-nedefinované HTML entity (&nbsp;, &aacute;…) nahradí znakem, neznámé mezerou.
    Platné XML entity (&lt; &amp;…) se NEDEKÓDUJÍ – rozbilo by to XML (N5)."""
    def nahr(m):
        jmeno = m.group(1)
        if jmeno in _XML_ENTITY:
            return m.group(0)
        ent = jmeno + ";"
        if ent in html.entities.html5:
            znak = html.unescape(f"&{jmeno};")
            return " " if znak == "\xa0" else znak  # nbsp jako normální mezera
        return " "
    return re.sub(r"&([a-zA-Z]+);", nahr, text)


def parse_feed(text: str) -> list[dict] | None:
    """Tolerantní parser: nejdřív surový text. Při chybě: oškrab whitespace před
    <?xml, nahraď XML-nedefinované entity a escapuj holé & (hgcb.cz: „Trio & Selina").
    html.unescape jako první krok nejde – rozbil by korektní &amp; v platných feedech.
    Kořen musí být rss/feed/rdf – dobře formovaná HTML stránka není prázdný feed (N5)."""
    root = _zkus_parse(text)
    if root is None:
        upraveny = _nahrad_html_entity(text.lstrip("\ufeff \t\r\n"))
        # holé & escapovat; platné XML entity (&amp; &lt; &#123;…) zachovat
        upraveny = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)", "&amp;", upraveny)
        root = _zkus_parse(upraveny)
    if root is None:
        return None
    koren = root.tag.split("}")[-1].lower()
    if koren not in ("rss", "feed", "rdf"):
        return None  # cizí dokument (HTML stránka apod.), ne prázdný feed
    items = []
    tag = lambda el: el.tag.split("}")[-1]
    for it in root.iter():
        if tag(it) == "item":
            g = lambda n: next((c.text or "" for c in it if tag(c) == n), "")
            items.append({"titulek": g("title"), "odkaz": g("link"),
                          # GUID je jedinečný jen v rozsahu zdroje; identitu
                          # skládá sklízeč jako zdroj + GUID, fallback URL.
                          "guid": g("guid") or g("identifier"),
                          "datum_raw": g("pubDate") or g("date"),
                          "popis": re.sub(r"<[^>]+>", " ", g("description")),
                          "kategorie": [c.text or "" for c in it if tag(c) == "category"]})
    if not items:
        for it in root.iter():
            if tag(it) == "entry":
                g = lambda n: next((c.text or "" for c in it if tag(c) == n), "")
                link = next((c.get("href", "") for c in it if tag(c) == "link"), "")
                items.append({"titulek": g("title"), "odkaz": link,
                              "guid": g("id"),
                              "datum_raw": g("published") or g("updated"),
                              "popis": re.sub(r"<[^>]+>", " ", g("summary") or g("content")),
                              "kategorie": []})
    return items


def parse_datum(raw: str):
    """Datum publikace. Zachovává čas i pásmo ISO zápisu; neplatné datum (2026-02-31)
    vrátí None – výjimka se izoluje na položku, nezastaví dávku (N3)."""
    raw = (raw or "").strip()
    if not raw:
        return None
    try:
        d = datetime.fromisoformat(raw)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    try:
        d = parsedate_to_datetime(raw)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


# --- Jediné publikační rozhodnutí -------------------------------------------------
# Klasifikace je mezikrok; čtenář vidí až výsledek této funkce. Testuje a měří se
# proto ona, ne jen počet vysokých jistot (F5 čtvrté oponentury).
# Třídy, u kterých má smysl hledat v textu datum. Datum se **nezobrazuje**
# (rozhodnutí zadavatele 20. 9. 2026, viz `rozhodni_publikaci`); slouží jen
# k tomu, aby článek o proběhlé akci přestal být zvýrazněný a aby se mu
# spočítal konec platnosti.
TRIDY_AKCI = ("dod", "prijimacky_nanecisto", "setkani_uchazecu", "pripravny_kurz",
              "talentove_zkousky", "nahradni_termin")

# Zpětná kompatibilita pro volající, kteří jméno ještě používají.
TRIDY_S_POZVANKOU = TRIDY_AKCI

# Jak se akce jmenuje v textu na stránce. Názvy jsou ze `docs/slovnik-pojmu.md`
# – veličina má jméno ve slovníku ukazatelů, ale k rodičům se o ní mluví slovy
# odtud. Používá je jak otázka pro rozhodovací model, tak věta na kartě.
NAZVY_AKCI = {
    "dod": "den otevřených dveří",
    "prijimacky_nanecisto": "přijímačky nanečisto",
    "setkani_uchazecu": "setkání s uchazeči",
    "pripravny_kurz": "přípravný kurz k přijímačkám",
    "talentove_zkousky": "talentová zkouška",
    "nahradni_termin": "náhradní termín zkoušky",
}

# Šablony věty, kterou karta ukáže: `(jeden termín, více termínů)`.
#
# **Větu skládá kód, ne model** (rozhodnutí zadavatele 21. 9. 2026). Model vybírá
# z možností, které mu kód předloží, a doplňuje pole; text na stránce je náš.
# Kdyby větu psal model, mluvila by každá karta trochu jinak, nešlo by ji
# přepočítat po změně šablony a text článku školy by mohl ovlivnit, co o škole
# tvrdíme. Fakta jsou ze článku, formulace je ze slovníku pojmů.
SABLONY_SOUHRNU = {
    "dod": ("Škola pořádá den otevřených dveří {terminy}.",
            "Škola pořádá dny otevřených dveří {terminy}."),
    "prijimacky_nanecisto": ("Škola pořádá přijímačky nanečisto {terminy}.",
                             "Škola pořádá přijímačky nanečisto {terminy}."),
    "setkani_uchazecu": ("Škola pořádá setkání s uchazeči {terminy}.",
                         "Škola pořádá setkání s uchazeči {terminy}."),
    "pripravny_kurz": ("Škola pořádá přípravný kurz k přijímačkám {terminy}.",
                       "Škola pořádá přípravný kurz k přijímačkám {terminy}."),
    "talentove_zkousky": ("Talentová zkouška se koná {terminy}.",
                          "Talentové zkoušky se konají {terminy}."),
    "nahradni_termin": ("Náhradní termín zkoušky je {terminy}.",
                        "Náhradní termíny zkoušky jsou {terminy}."),
}


def vyber_terminy_akce(terminy: list[dict], publikovano=None, dnes: date | None = None
                       ) -> list[dict]:
    """Termíny, které se smí objevit ve větě na kartě.

    Dvě podmínky, obě naměřené na vzorku:

    * **termín nesmí být starší než článek.** Zpráva „Talentová zkouška – bodový
      zisk uchazečů" vyšla 16. 4. 2026 a mluví o zkoušce z 28. 3. 2026; věta
      „Talentová zkouška se koná 28. 3. 2026" by z ohlédnutí udělala pozvánku;
    * **aspoň jeden termín musí být v budoucnu.** Článek, jehož všechny termíny
      proběhly, pozvánka není – klesne mezi ostatní zprávy a větu nedostane.

    Prázdný seznam znamená „není co na kartě tvrdit", ne „akce se nekoná"."""
    den_clanku = None
    if publikovano is not None:
        den_clanku = (publikovano.date() if hasattr(publikovano, "date") else publikovano).isoformat()
    vybrane = [t for t in terminy if den_clanku is None or t["datum"] >= den_clanku]
    if dnes is not None and not any(t["datum"] >= dnes.isoformat() for t in vybrane):
        return []
    return sorted(vybrane, key=lambda t: t["datum"])


def formatuj_datum(iso: str) -> str:
    """`2026-10-23` na `23. 10. 2026`. Bez nul na začátku, jak se česky píše."""
    r, m, d = iso.split("-")
    return f"{int(d)}. {int(m)}. {r}"


def _spoj(casti: list[str]) -> str:
    """`a` před posledním, čárky mezi ostatními."""
    if len(casti) == 1:
        return casti[0]
    return ", ".join(casti[:-1]) + " a " + casti[-1]


def slozeni_souhrnu(trida: str, terminy: list[dict]) -> str | None:
    """Věta na kartu z termínů s popiskem. `None`, když není co složit.

    `terminy` jsou položky `{"datum": "2026-10-23", "cas": "17:00" | None}`
    **jedné** třídy akce. Čas se vytýká za všechny termíny jen tehdy, když je
    u všech stejný; jinak jde ke svému datu, aby věta netvrdila společný začátek
    tam, kde ho škola neuvedla."""
    sablony = SABLONY_SOUHRNU.get(trida)
    if not sablony or not terminy:
        return None
    serazene = sorted(terminy, key=lambda t: t["datum"])
    casy = {t.get("cas") for t in serazene}
    if len(casy) == 1 and (spolecny := serazene[0].get("cas")):
        text = _spoj([formatuj_datum(t["datum"]) for t in serazene]) + f" od {spolecny}"
    else:
        text = _spoj([formatuj_datum(t["datum"]) + (f" od {t['cas']}" if t.get("cas") else "")
                      for t in serazene])
    return sablony[0 if len(serazene) == 1 else 1].format(terminy=text)


# Čas u data: „od 17:00", „v 17.00", „9:00-12:00". Bere se první čas v téže
# klauzuli; rozsah („9:00–12:00") se zkracuje na začátek, konec akce nikdo nehledá.
RE_CAS = re.compile(r"(?<![\d.])(\d{1,2})([:.])(\d{2})")


def najdi_cas(klauzule: str) -> str | None:
    """Čas z klauzule, ve které datum leží. `None`, když žádný není.

    Tečková podoba („v 17.00 hodin") se od data liší jen tím, co za ní stojí.
    Naměřeno na mensagymnazium.cz: „DNY OTEVŘENÝCH DVEŘÍ 6.10. 2026" vyrobilo
    větu „…6. 10. 2026 od 6:10", protože hodina i minuty vyšly v rozsahu.
    Za časem proto nesmí následovat tečka ani další číslice; dvojtečková podoba
    tím omezená není, aby „od 17:00." na konci věty prošla."""
    for m in RE_CAS.finditer(klauzule):
        h, oddelovac, mi = int(m.group(1)), m.group(2), int(m.group(3))
        if not (0 <= h <= 23 and 0 <= mi <= 59):
            continue
        if oddelovac == "." and klauzule[m.end():m.end() + 1] in (".", *"0123456789"):
            continue
        return f"{h}:{mi:02d}"
    return None


def text_k_rozboru(pol: dict) -> str:
    """Titulek a popis jako jeden text pro rozbor termínů, oddělené tečkou.

    Mezera nestačí: titulek „Dny otevřených dveří 26-27" nekončí interpunkcí,
    takže by se slil s první větou popisu do jedné klauzule a otázka na roli
    data by se ptala nad odstavcem místo nad větou."""
    return ". ".join(c for c in (pol.get("titulek", ""), pol.get("popis", "")) if c)


def pozice_dat(text: str) -> list[tuple[str, int]]:
    """Kalendářně platná data s rokem a jejich pozicí v normalizovaném textu.

    Slouží k tomu, aby se rozhodovacího modelu šlo zeptat na **každé datum
    zvlášť v jeho vlastní větě**. Data bez roku se nevrací: rok se nedohaduje."""
    s = strip(text)
    nalezy: dict[str, int] = {}
    for m in re.finditer(r"\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})", s):
        iso = _platne_datum(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if iso and iso not in nalezy:
            nalezy[iso] = m.start()
    for m in re.finditer(r"\b(\d{1,2})\.\s*([a-z]+)\s+(20\d{2})", s):
        mo = MESECE.get(m.group(2))
        if mo:
            iso = _platne_datum(int(m.group(1)), mo, int(m.group(3)))
            if iso and iso not in nalezy:
                nalezy[iso] = m.start()
    return sorted(nalezy.items(), key=lambda p: p[1])
# Třídy s doloženým přejímacím benchmarkem (oddíl 4 návrhu). Talentové zkoušky a
# náhradní termín ve vzorku zásahy nemají, e-mailem tedy zatím nejdou.
TRIDY_POVOLENE_EMAILEM = ("dod", "vysledky_prijm", "kriteria", "prijimaci_rizeni", "volna_mista")
STAVY_BLOKUJICI_TERMIN = ("zruseno", "zmeneno", "popreno", "registrace_zrusena",
                          "nejasny_predmet", "nepotvrzeno")


def rozhodni_publikaci(pol: dict, publikovano: datetime | None = None,
                       dnes: date | None = None) -> dict:
    """Co se o položce smí zveřejnit: `karta` | `odkaz` | `seznam`.

    **Datum akce se nezobrazuje** (rozhodnutí zadavatele 20. 9. 2026). Karta
    říká, *o čem zpráva je* – „den otevřených dveří", „přijímačky nanečisto",
    „setkání s uchazeči", „kritéria přijetí" – a vede na článek školy; přesné
    datum si čtenář přečte tam, kde ho škola napsala. Důvod je naměřený:
    přesnost tříd je ověřená (102/109 párů), ale vazba datum–událost ne, a
    plochý seznam dat sebraných z celého článku smíchal termíny se lhůtami
    (600005399: osm dat, z toho tři lhůty a šest termínů MŠMT).

    Hodnota pro čtenáře je v **rozlišení důležitého od ostatního**, ne v tom,
    že za školu tvrdíme datum. Co zůstává: vysoká jistota tématu a stav
    `oznameno` – zrušená nebo nejistá zpráva se nezvýrazňuje.

    `terminy` se dál počítají, ale **jen pro vnitřní potřebu**: článek, jehož
    všechny termíny už proběhly, spadne mezi ostatní zprávy, a zapisovač z nich
    počítá `konec_platnosti`. Do zobrazení se nedostanou.

    `dnes` je den zobrazení. V provozu ho volající předává vždy; měření ho drží
    zmrazený, aby `--offline` dávalo stejný výsledek i zítra."""
    tridy = pol.get("tridy")
    if tridy is None:
        tridy, _ = klasifikuj_temu(pol)
    jistota = pol.get("jistota") or {t: rozhodni_jistotu(pol, t) for t in tridy}
    if not tridy:
        return {"tridy": [], "jistota": {}, "stav": None, "zobrazeni": "seznam",
                "terminy": [], "email": False, "duvod": "není přijímací téma"}
    stav = pol.get("stav") or urci_stav(pol)
    vysoke = [t for t in tridy if jistota.get(t) == "vysoka"]
    zaklad = {"tridy": tridy, "jistota": jistota, "stav": stav, "terminy": []}
    if not vysoke:
        return {**zaklad, "zobrazeni": "odkaz", "email": False,
                "duvod": "žádná třída s vysokou jistotou"}
    email = any(t in TRIDY_POVOLENE_EMAILEM for t in vysoke)
    if stav != "oznameno":
        return {**zaklad, "zobrazeni": "odkaz", "email": False,
                "duvod": f"stav sdělení: {stav}"}
    if not any(t in TRIDY_AKCI for t in vysoke):
        return {**zaklad, "zobrazeni": "karta", "email": email,
                "duvod": "důležitá zpráva k přijímačkám"}
    data = pol.get("data_akce") or extrahuj_data_akce(
        pol.get("titulek", "") + " " + pol.get("popis", ""))
    publikovano = publikovano or pol.get("datum")
    den_publikace = publikovano.date().isoformat() if publikovano else None
    terminy = sorted(iso for iso, d in data.get("podrobne", {}).items()
                     if d["role"] == "akce"
                     and d["stav_klauzule"] not in STAVY_BLOKUJICI_TERMIN
                     and (den_publikace is None or iso >= den_publikace))
    # Pozvánka na akci bez čitelného termínu je pořád pozvánka: čtenáře pošleme
    # na článek školy. Termín chybí jen nám, ne jemu.
    if terminy and dnes is not None and not any(iso >= dnes.isoformat() for iso in terminy):
        return {**zaklad, "terminy": terminy, "zobrazeni": "odkaz", "email": False,
                "duvod": "akce už proběhla"}
    return {**zaklad, "terminy": terminy, "zobrazeni": "karta", "email": email,
            "duvod": "pozvánka na akci školy pro uchazeče"}


def _normalizuj_text(t: str) -> str:
    """Zbytkové HTML entity (`&#46;`, `&#160;`) by jinak dělaly falešné hranice vět."""
    return " ".join(html.unescape(t or "").replace("\xa0", " ").split())


def oklasifikuj_polozky(polozky: list[dict]) -> list[dict]:
    for p in polozky:
        p["titulek"] = _normalizuj_text(p.get("titulek", ""))
        p["popis"] = _normalizuj_text(p.get("popis", ""))
        if "datum" not in p or p["datum"] is None:
            p["datum"] = parse_datum(p.get("datum_raw", ""))
        elif isinstance(p["datum"], str):
            p["datum"] = parse_datum(p["datum"]) or datetime.fromisoformat(p["datum"])
        p["tridy"], p["vylouceno"] = klasifikuj_temu(p)
        p["jistota"] = {t: rozhodni_jistotu(p, t) for t in p["tridy"]}
        p["stav"] = urci_stav(p) if p["tridy"] else None
        if set(p["tridy"]) & set(TRIDY_AKCI):
            p["data_akce"] = extrahuj_data_akce(p.get("titulek", "") + " " + p.get("popis", ""))
        p["publikace"] = rozhodni_publikaci(p)
    return polozky
