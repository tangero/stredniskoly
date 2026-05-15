import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from import_cermat_results import load_flat_xlsx, load_regional_xlsx, is_valid_flat, is_valid_regional, make_key, slugify

CERMAT_DIR = Path(__file__).parent.parent / 'cermat_data_2025'


def test_slugify():
    assert slugify('Přírodovědné') == 'prirodovedne'
    assert slugify('') == ''
    assert slugify('IT & Sítě') == 'it_site'


def test_make_key():
    assert make_key('600001431', '79-41-K/41') == '600001431_79-41-K/41'
    assert make_key('600001431', '79-41-K/41', 'Přírodovědné') == '600001431_79-41-K/41_prirodovedne'


def test_load_flat_xlsx_returns_list():
    path = CERMAT_DIR / 'PZ2026_kolo1_vysledky.xlsx'
    records = load_flat_xlsx(path)
    assert len(records) > 5000
    first = records[0]
    assert 'REDIZO' in first
    assert 'KKOV' in first
    assert 'NÁZEV ŠKOLY' in first


def test_load_regional_xlsx_returns_list():
    path = CERMAT_DIR / 'PZ2025_kolo1_vysledky.xlsx'
    records = load_regional_xlsx(path)
    assert len(records) > 5000
    first = records[0]
    assert 'REDIZO' in first


def test_is_valid_flat_filters_correctly():
    valid = {'FORMA VZDĚLÁVÁNÍ': 'den', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 1}
    assert is_valid_flat(valid) is True
    evening = {'FORMA VZDĚLÁVÁNÍ': 'večerní', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 1}
    assert is_valid_flat(evening) is False
    no_jpz = {'FORMA VZDĚLÁVÁNÍ': 'den', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 0}
    assert is_valid_flat(no_jpz) is False


def test_extract_current_year_has_keplera():
    path = CERMAT_DIR / 'PZ2026_kolo1_vysledky.xlsx'
    records = load_flat_xlsx(path)
    from import_cermat_results import extract_current_year
    data = extract_current_year(records)
    keplera_keys = [k for k, v in data.items() if 'Keplera' in v.get('nazev', '')]
    assert len(keplera_keys) >= 1
    keplera = data[keplera_keys[0]]
    assert keplera['cj_ma_prijati'] > 180.0


def test_compute_ranks_assigns_1_to_highest():
    from import_cermat_results import compute_ranks
    data = {
        'a': {'school_type': 'GY4', 'cj_ma_prijati': 183.9},
        'b': {'school_type': 'GY4', 'cj_ma_prijati': 160.0},
        'c': {'school_type': 'GY4', 'cj_ma_prijati': 170.0},
    }
    result = compute_ranks(data)
    assert result['a']['rank_in_type'] == 1
    assert result['c']['rank_in_type'] == 2
    assert result['b']['rank_in_type'] == 3
    assert result['a']['type_total'] == 3
