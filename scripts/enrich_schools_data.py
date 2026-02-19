#!/usr/bin/env python3
"""
Obohacení schools_data.json o skutečná JPZ data z individuálních dat uchazečů.

Čte PZ2025_kolo1_uchazeci.xlsx a pro každou školu (redizo+kkov) vypočítá:
- jpz_min_actual: skutečné minimum JPZ u PŘIJATÝCH a ZAŘAZENÝCH studentů (ss{n}_prijat==1)
- cj_at_jpz_min: ČJ body studenta s nejnižším JPZ
- ma_at_jpz_min: MA body studenta s nejnižším JPZ
- jpz_prumer_actual: průměr JPZ u přijatých
- jpz_median: medián JPZ u přijatých
- cohorts: rozložení přijatých do 9 kohort (3 úrovně × 3 profily)

KLÍČOVÁ OPRAVA: Filtruje POUZE studenty se ss{n}_prijat==1 (přijat a zařazen),
nikoliv ss{n}_prijat==2 (přijat na školu s vyšší prioritou / nepřijat).

Výstup: stredniskoly/public/schools_data.json (obohacená kopie gymnazium/schools_data.json)
"""

import json
import statistics
import openpyxl
from pathlib import Path

# Normalizační konstanty pro kohorty (z cohort_meta.json)
# Průměr a směrodatná odchylka z celé populace uchazečů (skutečné body, ne % skór)
CJ_MEAN = 27.87   # průměr ČJ v bodech (0-50)
CJ_STD = 10.11    # směrodatná odchylka ČJ
MA_MEAN = 19.71   # průměr MA v bodech (0-50)
MA_STD = 9.97     # směrodatná odchylka MA

# Definice 9 kohort (level = průměr z-skórů, diff = ma_z - cj_z)
COHORTS = [
    {'code': 'exc_math',  'level_min':  0.75, 'level_max': 99, 'diff_min':  0.4, 'diff_max': 99},
    {'code': 'exc_bal',   'level_min':  0.75, 'level_max': 99, 'diff_min': -0.4, 'diff_max':  0.4},
    {'code': 'exc_hum',   'level_min':  0.75, 'level_max': 99, 'diff_min': -99,  'diff_max': -0.4},
    {'code': 'good_math', 'level_min':  0,    'level_max':  0.75, 'diff_min':  0.4, 'diff_max': 99},
    {'code': 'good_bal',  'level_min':  0,    'level_max':  0.75, 'diff_min': -0.4, 'diff_max':  0.4},
    {'code': 'good_hum',  'level_min':  0,    'level_max':  0.75, 'diff_min': -99,  'diff_max': -0.4},
    {'code': 'low_math',  'level_min': -99,   'level_max':  0,    'diff_min':  0.4, 'diff_max': 99},
    {'code': 'low_bal',   'level_min': -99,   'level_max':  0,    'diff_min': -0.4, 'diff_max':  0.4},
    {'code': 'low_hum',   'level_min': -99,   'level_max':  0,    'diff_min': -99,  'diff_max': -0.4},
]


def classify_cohort(cj_pts, ma_pts):
    """Zařadí studenta do kohorty (0-8) na základě jeho bodů."""
    if cj_pts is None or ma_pts is None:
        return None
    if CJ_STD == 0 or MA_STD == 0:
        return None
    cj_z = (cj_pts - CJ_MEAN) / CJ_STD
    ma_z = (ma_pts - MA_MEAN) / MA_STD
    level = (cj_z + ma_z) / 2
    diff = ma_z - cj_z
    for i, c in enumerate(COHORTS):
        if c['level_min'] <= level < c['level_max'] and c['diff_min'] <= diff < c['diff_max']:
            return i
    # Fallback: student na hranicích (level == level_max u posledního)
    for i, c in enumerate(COHORTS):
        if c['level_min'] <= level <= c['level_max'] and c['diff_min'] <= diff <= c['diff_max']:
            return i
    return None


def compute_school_stats(students):
    """
    Vypočítá statistiky pro školu ze seznamu přijatých studentů.
    students = list of (jpz_total_pts, cj_pts, ma_pts)
    Všechny hodnoty jsou v bodech (0-50 pro ČJ/MA, 0-100 pro JPZ).
    """
    if not students:
        return None

    jpz_values = [s[0] for s in students]
    min_idx = jpz_values.index(min(jpz_values))
    min_student = students[min_idx]

    cohort_counts = [0] * 9
    for jpz_pts, cj_pts, ma_pts in students:
        cohort_idx = classify_cohort(cj_pts, ma_pts)
        if cohort_idx is not None:
            cohort_counts[cohort_idx] += 1

    return {
        'jpz_min_actual': round(min(jpz_values), 1),
        'cj_at_jpz_min': round(min_student[1], 1),
        'ma_at_jpz_min': round(min_student[2], 1),
        'jpz_prumer_actual': round(statistics.mean(jpz_values), 1),
        'jpz_median': round(statistics.median(jpz_values), 1),
        'cohorts': cohort_counts,
    }


def load_applicant_stats(xlsx_path):
    """
    Načte data uchazečů a vrátí slovník:
    { 'redizo_kkov' -> [(jpz_pts, cj_pts, ma_pts), ...] }

    Zahrnuje POUZE studenty, kteří byli přijati a zařazeni (ss{n}_prijat == 1).
    """
    print(f"Načítám data uchazečů z {xlsx_path}...")
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    # Indexy sloupců (0-based):
    # [2-6]   ss1-ss5_redizo
    # [7-11]  ss1-ss5_zrizovatel
    # [12-16] ss1-ss5_kkov
    # [17-21] ss1-ss5_forma
    # [22-26] ss1-ss5_zkraceno
    # [27-31] ss1-ss5_prijat  (1 = přijat a zařazen, 2 = nepřijat)
    # [37]    c_m_procentni_skor  (ČJ+MA celkem, % skór 0-200)
    # [38]    c_procentni_skor    (ČJ, % skór 0-100)
    # [39]    m_procentni_skor    (MA, % skór 0-100)

    school_students = {}
    row_count = 0
    accepted_count = 0

    for row in ws.iter_rows(min_row=2, values_only=True):
        row_count += 1
        if row_count % 50000 == 0:
            print(f"  Zpracováno {row_count} řádků, nalezeno {accepted_count} přijetí...")

        # Přeskočit řádky bez JPZ skóre
        jpz_raw = row[37]  # c_m_procentni_skor (0-200)
        cj_raw = row[38]   # c_procentni_skor (0-100)
        ma_raw = row[39]   # m_procentni_skor (0-100)

        if jpz_raw is None or cj_raw is None or ma_raw is None:
            continue

        try:
            jpz_raw = float(jpz_raw)
            cj_raw = float(cj_raw)
            ma_raw = float(ma_raw)
        except (ValueError, TypeError):
            continue

        # Převod na skutečné body (0-100 pro JPZ, 0-50 pro ČJ/MA)
        jpz_pts = jpz_raw / 2
        cj_pts = cj_raw / 2
        ma_pts = ma_raw / 2

        # Projít všechny priority (0-4 = ss1-ss5)
        for i in range(5):
            redizo = row[2 + i]
            kkov = row[12 + i]
            prijat = row[27 + i]

            # Zahrnout POUZE studenty přijatých a zařazených (prijat == 1)
            if prijat != 1:
                continue
            if not redizo or not kkov:
                continue

            key = f"{redizo}_{kkov}"
            if key not in school_students:
                school_students[key] = []
            school_students[key].append((jpz_pts, cj_pts, ma_pts))
            accepted_count += 1

    wb.close()
    print(f"Celkem zpracováno {row_count} uchazečů")
    print(f"Celkem přijetí (ss{{n}}_prijat==1): {accepted_count}")
    print(f"Unikátních škol+oborů s daty: {len(school_students)}")
    return school_students


def main():
    base_dir = Path(__file__).parent.parent
    stredniskoly_dir = base_dir.parent / 'stredniskoly'

    xlsx_path = base_dir / 'PZ2025_kolo1_uchazeci.xlsx'
    schools_input = base_dir / 'schools_data.json'
    schools_output = stredniskoly_dir / 'public' / 'schools_data.json'

    if not xlsx_path.exists():
        print(f"CHYBA: Soubor nenalezen: {xlsx_path}")
        return
    if not schools_input.exists():
        print(f"CHYBA: Soubor nenalezen: {schools_input}")
        return

    # 1. Načíst statistiky přijatých uchazečů z uchazeci.xlsx
    school_students = load_applicant_stats(xlsx_path)

    # 2. Vypočítat statistiky pro každou školu
    print("\nVýpočet statistik pro každou školu...")
    school_stats = {}
    for key, students in school_students.items():
        stats = compute_school_stats(students)
        if stats:
            school_stats[key] = stats

    print(f"Statistiky vypočítány pro {len(school_stats)} škol+oborů")

    # 3. Načíst schools_data.json a obohatit data 2025
    print("\nNačítám schools_data.json...")
    with open(schools_input, 'r', encoding='utf-8') as f:
        data = json.load(f)

    schools_2025 = data.get('2025', [])
    enriched_count = 0
    missing_count = 0

    for school in schools_2025:
        redizo = school.get('redizo', '')
        kkov = school.get('kkov', '')
        key = f"{redizo}_{kkov}"

        stats = school_stats.get(key)
        if stats:
            school.update(stats)
            enriched_count += 1
        else:
            missing_count += 1

    print(f"Obohaceno: {enriched_count} škol/oborů")
    print(f"Bez dat z uchazečů: {missing_count} škol/oborů (malé školy, nová zaměření apod.)")

    # 4. Uložit výsledek do stredniskoly/public/schools_data.json
    if not schools_output.parent.exists():
        print(f"CHYBA: Výstupní adresář neexistuje: {schools_output.parent}")
        return

    print(f"\nUkládám výsledek do {schools_output}...")
    with open(schools_output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = schools_output.stat().st_size / 1024 / 1024
    print(f"Hotovo! Uloženo {size_mb:.1f} MB")

    # Ověřovací výpis pro Gymnázium Arabská
    print("\n=== OVĚŘENÍ: Gymnázium Arabská ===")
    for school in schools_2025:
        if 'Arabsk' in school.get('nazev', '') and school.get('kkov') == '79-41-K/41':
            print(f"  {school.get('nazev_display', school['nazev'])} ({school.get('zamereni', '-')})")
            print(f"  jpz_min_actual: {school.get('jpz_min_actual', 'CHYBÍ')}")
            print(f"  cj/ma u min: {school.get('cj_at_jpz_min', '?')}/{school.get('ma_at_jpz_min', '?')}")
            print(f"  jpz průměr: {school.get('jpz_prumer_actual', '?')}, medián: {school.get('jpz_median', '?')}")
            print(f"  přijatých studentů v datech: {len(school_students.get(school['redizo'] + '_' + school['kkov'], []))}")
            print()

    # Statistiky kvality dat
    jpz_mins = [s.get('jpz_min_actual', 0) for s in schools_2025 if s.get('jpz_min_actual', 0) > 0]
    jpz_avgs = [s.get('jpz_prumer_actual', 0) for s in schools_2025 if s.get('jpz_prumer_actual', 0) > 0]
    suspicious = sum(1 for m, a in zip(jpz_mins, jpz_avgs) if a > 0 and m / a < 0.70)
    print(f"\n=== STATISTIKY KVALITY ===")
    print(f"Školy s jpz_min_actual: {len(jpz_mins)}")
    print(f"Průměr jpz_min_actual: {sum(jpz_mins)/len(jpz_mins):.1f} b" if jpz_mins else "N/A")
    print(f"Podezřele nízké min (< 70% průměru): {suspicious} škol ({100*suspicious//len(jpz_mins) if jpz_mins else 0}%)")


if __name__ == '__main__':
    main()
