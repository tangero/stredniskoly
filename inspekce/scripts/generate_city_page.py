#!/usr/bin/env python3
"""
Generátor standalone HTML stránky s inspekcemi škol podle města.

Načte schools_data.json a inspection_extractions.json,
sloučí data a vygeneruje docs/inspekce-mesta.html s embeddovanými daty.
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHOOLS_JSON = ROOT / "public" / "schools_data.json"
EXTRACTIONS_JSON = ROOT / "public" / "inspection_extractions.json"
PRODUCTION_REPORTS_JSON = ROOT / "inspekce" / "config" / "production_reports.json"
OUTPUT_HTML = ROOT / "docs" / "inspekce-mesta.html"


def load_schools() -> dict:
    """Načte schools_data.json a vrátí {redizo: {nazev, obec, adresa, typ, kraj, ...}}"""
    with open(SCHOOLS_JSON, encoding="utf-8") as f:
        raw = json.load(f)

    schools = {}
    for year_key, entries in raw.items():
        for e in entries:
            r = e["redizo"]
            if r not in schools:
                schools[r] = {
                    "redizo": r,
                    "nazev": e.get("nazev_display") or e.get("nazev", ""),
                    "nazev_plny": e.get("nazev", ""),
                    "obec": e.get("obec", ""),
                    "mestska_cast": e.get("mestska_cast"),
                    "adresa": e.get("adresa_plna", ""),
                    "typ": e.get("typ", ""),
                    "kraj": e.get("kraj", "").strip(),
                    "zrizovatel": e.get("zrizovatel", ""),
                    "obor": e.get("obor", ""),
                    "zamereni": e.get("zamereni", ""),
                }
    return schools


def load_extractions() -> dict:
    """Načte inspection_extractions.json a vrátí {redizo: [inspekce,...]}"""
    with open(EXTRACTIONS_JSON, encoding="utf-8") as f:
        raw = json.load(f)
    return raw.get("schools", {})


def load_report_urls() -> dict:
    """Načte production_reports.json a vrátí {report_id: source_url}"""
    if not PRODUCTION_REPORTS_JSON.exists():
        return {}
    with open(PRODUCTION_REPORTS_JSON, encoding="utf-8") as f:
        raw = json.load(f)
    return {
        r["report_id"]: r.get("source_url", "")
        for r in raw.get("reports", [])
        if r.get("source_url")
    }


def merge_data(schools: dict, extractions: dict, report_urls: dict) -> dict:
    """
    Sloučí data do struktury {město: [škola, ...]}.
    Každá škola obsahuje metadata a seznam inspekcí.
    """
    city_data = defaultdict(list)

    # Pouze školy, které mají inspekci
    for redizo, inspections in extractions.items():
        school_meta = schools.get(redizo)
        if not school_meta:
            # Škola není v schools_data - zkusíme z inspekce
            first_insp = inspections[0] if inspections else {}
            po = first_insp.get("parsed_output", {})
            sp = po.get("school_profile", {})
            school_meta = {
                "redizo": redizo,
                "nazev": sp.get("school_type", f"Škola {redizo}"),
                "nazev_plny": "",
                "obec": "Neznámé město",
                "mestska_cast": None,
                "adresa": "",
                "typ": "",
                "kraj": "",
                "zrizovatel": "",
                "obor": "",
                "zamereni": "",
            }

        # Připravíme kompaktní inspekce
        compact_inspections = []
        for insp in inspections:
            po = insp.get("parsed_output", {})
            if not po:
                continue
            fp = po.get("for_parents", {})
            hf = po.get("hard_facts", {})
            sp = po.get("school_profile", {})
            msc = po.get("model_self_check", {})

            report_id = insp.get("report_id", "")
            compact_inspections.append({
                "report_id": report_id,
                "source_url": report_urls.get(report_id, ""),
                "date": insp.get("inspection_from", ""),
                "date_to": insp.get("inspection_to", ""),
                "model_id": insp.get("model_id", ""),
                "school_profile": sp,
                "plain_czech_summary": fp.get("plain_czech_summary", ""),
                "strengths": fp.get("strengths", []),
                "risks": fp.get("risks", []),
                "who_school_fits": fp.get("who_school_fits", []),
                "who_should_be_cautious": fp.get("who_should_be_cautious", []),
                "questions_for_open_day": fp.get("questions_for_open_day", []),
                "hard_facts": hf,
                "model_self_check": msc,
            })

        # Seřadit inspekce od nejnovější
        compact_inspections.sort(key=lambda x: x.get("date", ""), reverse=True)

        # Deduplikace: ponechat pouze nejnovější per report_id (různé modely)
        # Preferujeme claude_haiku_4_5 (hlavní model)
        seen_reports = {}
        deduped = []
        for ci in compact_inspections:
            rid = ci["report_id"]
            base_rid = rid  # report_id je unikátní per inspekční zpráva
            # Klíč: datum inspekce (různé modely mohou mít stejné datum)
            date_key = ci["date"]
            if date_key not in seen_reports:
                seen_reports[date_key] = ci
                deduped.append(ci)
            else:
                # Preferovat claude model
                existing = seen_reports[date_key]
                if "claude" in ci.get("model_id", "") and "claude" not in existing.get("model_id", ""):
                    seen_reports[date_key] = ci
                    deduped = [c for c in deduped if c["date"] != date_key]
                    deduped.append(ci)

        deduped.sort(key=lambda x: x.get("date", ""), reverse=True)

        city = school_meta["obec"]
        city_data[city].append({
            "redizo": school_meta["redizo"],
            "nazev": school_meta["nazev"],
            "nazev_plny": school_meta["nazev_plny"],
            "typ": school_meta["typ"],
            "adresa": school_meta["adresa"],
            "kraj": school_meta["kraj"],
            "zrizovatel": school_meta["zrizovatel"],
            "obor": school_meta["obor"],
            "zamereni": school_meta["zamereni"],
            "mestska_cast": school_meta["mestska_cast"],
            "inspections": deduped,
        })

    # Seřadit školy v každém městě podle názvu
    for city in city_data:
        city_data[city].sort(key=lambda s: s["nazev"])

    return dict(city_data)


def generate_html(city_data: dict) -> str:
    """Vygeneruje kompletní HTML stránku."""
    total_schools = sum(len(v) for v in city_data.values())
    total_cities = len(city_data)
    total_inspections = sum(
        len(s["inspections"]) for schools in city_data.values() for s in schools
    )

    # Seřadit města pro dropdown
    sorted_cities = sorted(city_data.keys(), key=lambda c: (-len(city_data[c]), c))

    data_json = json.dumps(city_data, ensure_ascii=False, separators=(",", ":"))

    html = f"""<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inspekce ČŠI - Školy podle města</title>
<style>
:root {{
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface2: #f1f5f9;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --text: #1e293b;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --accent: #2563eb;
  --accent-light: #dbeafe;
  --green: #16a34a;
  --green-bg: #f0fdf4;
  --green-border: #bbf7d0;
  --red: #dc2626;
  --red-bg: #fef2f2;
  --red-border: #fecaca;
  --yellow: #ca8a04;
  --yellow-bg: #fefce8;
  --purple: #7c3aed;
  --purple-bg: #f5f3ff;
  --orange: #ea580c;
  --orange-bg: #fff7ed;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --radius: 8px;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
.container {{ max-width: 900px; margin: 0 auto; padding: 1rem; }}

/* Header */
.header {{ background: var(--surface); border-bottom: 1px solid var(--border); padding: 1.5rem 0; margin-bottom: 1.5rem; }}
.header .container {{ display: flex; flex-direction: column; gap: 1rem; }}
.header h1 {{ font-size: 1.5rem; font-weight: 700; }}
.header h1 span {{ color: var(--accent); }}
.stats {{ display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-muted); }}
.stats strong {{ color: var(--text); font-weight: 600; }}

/* Search */
.search-area {{ display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: stretch; }}
.search-wrap {{ position: relative; flex: 1; min-width: 200px; }}
.search-input {{ width: 100%; padding: 0.6rem 0.8rem 0.6rem 2.2rem; border: 1px solid var(--border-strong); border-radius: var(--radius); font-size: 0.95rem; background: var(--surface); color: var(--text); outline: none; transition: border-color 0.2s; }}
.search-input:focus {{ border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }}
.search-icon {{ position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--text-light); pointer-events: none; }}
.suggestions {{ position: absolute; top: 100%; left: 0; right: 0; background: var(--surface); border: 1px solid var(--border-strong); border-top: none; border-radius: 0 0 var(--radius) var(--radius); max-height: 300px; overflow-y: auto; z-index: 100; display: none; box-shadow: var(--shadow-md); }}
.suggestions.open {{ display: block; }}
.suggestion {{ padding: 0.5rem 0.8rem; cursor: pointer; font-size: 0.9rem; display: flex; justify-content: space-between; }}
.suggestion:hover, .suggestion.active {{ background: var(--accent-light); }}
.suggestion .count {{ color: var(--text-muted); font-size: 0.8rem; }}
.quick-cities {{ display: flex; gap: 0.4rem; flex-wrap: wrap; }}
.city-btn {{ padding: 0.4rem 0.7rem; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.8rem; transition: all 0.2s; white-space: nowrap; }}
.city-btn:hover {{ border-color: var(--accent); color: var(--accent); background: var(--accent-light); }}
.city-btn.active {{ background: var(--accent); color: white; border-color: var(--accent); }}

/* Content */
.city-title {{ font-size: 1.3rem; font-weight: 700; margin: 1.5rem 0 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--accent); }}
.city-subtitle {{ color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem; }}

/* School card */
.school-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 1rem; box-shadow: var(--shadow-sm); overflow: hidden; }}
.school-header {{ padding: 1rem; }}
.school-name {{ font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 0.25rem; }}
.school-meta {{ display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.8rem; color: var(--text-muted); }}
.badge {{ display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }}
.badge-type {{ background: var(--accent-light); color: var(--accent); }}
.badge-zriz {{ background: var(--surface2); color: var(--text-muted); }}

/* Inspection */
.inspection {{ border-top: 1px solid var(--border); }}
.insp-header {{ padding: 0.75rem 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; user-select: none; }}
.insp-header:hover {{ background: var(--surface2); }}
.insp-date {{ font-weight: 600; font-size: 0.9rem; }}
.insp-arrow {{ transition: transform 0.2s; color: var(--text-light); font-size: 0.8rem; }}
.inspection.open .insp-arrow {{ transform: rotate(90deg); }}
.insp-body {{ display: none; padding: 1rem; padding-top: 0; }}
.inspection.open .insp-body {{ display: block; }}

/* Summary */
.summary-box {{ background: var(--accent-light); border-left: 4px solid var(--accent); padding: 0.75rem 1rem; border-radius: 0 var(--radius) var(--radius) 0; margin: 0.75rem 0; font-size: 0.9rem; line-height: 1.7; }}

/* Strengths & Risks */
.sr-section {{ margin: 0.75rem 0; }}
.sr-title {{ font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }}
.sr-title.strengths {{ color: var(--green); }}
.sr-title.risks {{ color: var(--red); }}
.sr-item {{ padding: 0.5rem 0.75rem; border-radius: var(--radius); margin-bottom: 0.4rem; font-size: 0.85rem; }}
.sr-item.strength {{ background: var(--green-bg); border: 1px solid var(--green-border); }}
.sr-item.risk {{ background: var(--red-bg); border: 1px solid var(--red-border); }}
.sr-tag {{ font-weight: 600; }}
.sr-detail {{ color: var(--text); margin-top: 0.15rem; }}
.sr-evidence {{ color: var(--text-muted); font-size: 0.8rem; font-style: italic; margin-top: 0.15rem; }}

/* Who fits */
.who-section {{ margin: 0.75rem 0; padding: 0.75rem; border-radius: var(--radius); }}
.who-section.fits {{ background: var(--purple-bg); }}
.who-section.cautious {{ background: var(--orange-bg); }}
.who-title {{ font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem; }}
.who-title.fits {{ color: var(--purple); }}
.who-title.cautious {{ color: var(--orange); }}
.who-list {{ list-style: none; padding: 0; }}
.who-list li {{ padding: 0.2rem 0; font-size: 0.85rem; padding-left: 1.2rem; position: relative; }}
.who-list li::before {{ content: ""; position: absolute; left: 0; top: 0.55rem; width: 6px; height: 6px; border-radius: 50%; }}
.who-section.fits .who-list li::before {{ background: var(--purple); }}
.who-section.cautious .who-list li::before {{ background: var(--orange); }}

/* Questions */
.questions {{ margin: 0.75rem 0; padding: 0.75rem; background: var(--yellow-bg); border-radius: var(--radius); }}
.questions-title {{ font-size: 0.85rem; font-weight: 700; color: var(--yellow); margin-bottom: 0.3rem; }}
.questions ol {{ padding-left: 1.5rem; font-size: 0.85rem; }}
.questions li {{ padding: 0.15rem 0; }}

/* Details toggle */
.details-toggle {{ display: inline-block; cursor: pointer; font-size: 0.8rem; color: var(--accent); margin-top: 0.5rem; padding: 0.3rem 0; border: none; background: none; }}
.details-toggle:hover {{ text-decoration: underline; }}
.details-content {{ display: none; margin-top: 0.5rem; font-size: 0.8rem; }}
.details-content.open {{ display: block; }}
.detail-block {{ background: var(--surface2); padding: 0.6rem; border-radius: var(--radius); margin-bottom: 0.4rem; }}
.detail-block h5 {{ font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.2rem; text-transform: uppercase; letter-spacing: 0.03em; }}
.detail-block p {{ font-size: 0.8rem; color: var(--text); }}

/* Empty state */
.empty-state {{ text-align: center; padding: 4rem 1rem; color: var(--text-muted); }}
.empty-state h2 {{ font-size: 1.3rem; color: var(--text); margin-bottom: 0.5rem; }}
.empty-state p {{ font-size: 0.95rem; }}

/* Footer */
.footer {{ text-align: center; padding: 2rem 1rem; color: var(--text-light); font-size: 0.8rem; border-top: 1px solid var(--border); margin-top: 2rem; }}

/* Responsive */
@media (max-width: 640px) {{
  .container {{ padding: 0.75rem; }}
  .header h1 {{ font-size: 1.2rem; }}
  .school-name {{ font-size: 1rem; }}
  .stats {{ gap: 0.75rem; font-size: 0.8rem; }}
  .search-area {{ flex-direction: column; }}
}}
</style>
</head>
<body>

<div class="header">
  <div class="container">
    <h1>Inspekce <span>ČŠI</span> - Školy podle města</h1>
    <div class="stats">
      <span><strong>{total_schools}</strong> škol</span>
      <span><strong>{total_cities}</strong> měst</span>
      <span><strong>{total_inspections}</strong> inspekčních zpráv</span>
    </div>
    <div class="search-area">
      <div class="search-wrap">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" class="search-input" id="citySearch" placeholder="Hledat město..." autocomplete="off">
        <div class="suggestions" id="suggestions"></div>
      </div>
      <div class="quick-cities" id="quickCities"></div>
    </div>
  </div>
</div>

<div class="container" id="content">
  <div class="empty-state" id="emptyState">
    <h2>Vyberte město</h2>
    <p>Zadejte název města do vyhledávacího pole nebo klikněte na jedno z nabízených měst.</p>
  </div>
  <div id="results"></div>
</div>

<div class="footer">
  Zdroj dat: Česká školní inspekce (ČŠI). Extrakce pomocí AI modelů &mdash; informace jsou orientační.<br>
  Projekt <a href="https://github.com/pzandl/stredniskoly">stredniskoly</a>
</div>

<script>
const CITY_DATA = {data_json};

const ALL_CITIES = Object.keys(CITY_DATA).sort((a,b) => CITY_DATA[b].length - CITY_DATA[a].length);
const TOP_CITIES = ALL_CITIES.slice(0, 12);

let selectedCity = null;
let suggestionIdx = -1;

// Init quick city buttons
const quickCitiesEl = document.getElementById('quickCities');
TOP_CITIES.forEach(city => {{
  const btn = document.createElement('button');
  btn.className = 'city-btn';
  btn.textContent = city + ' (' + CITY_DATA[city].length + ')';
  btn.onclick = () => selectCity(city);
  quickCitiesEl.appendChild(btn);
}});

// Search
const searchInput = document.getElementById('citySearch');
const suggestionsEl = document.getElementById('suggestions');

searchInput.addEventListener('input', () => {{
  const q = searchInput.value.trim().toLowerCase();
  suggestionIdx = -1;
  if (!q) {{ suggestionsEl.classList.remove('open'); return; }}
  const matches = ALL_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 15);
  if (matches.length === 0) {{ suggestionsEl.classList.remove('open'); return; }}
  suggestionsEl.innerHTML = matches.map((c, i) =>
    '<div class="suggestion" data-city="' + escHtml(c) + '">' +
    '<span>' + highlightMatch(c, q) + '</span>' +
    '<span class="count">' + CITY_DATA[c].length + ' škol</span></div>'
  ).join('');
  suggestionsEl.classList.add('open');
  suggestionsEl.querySelectorAll('.suggestion').forEach(el => {{
    el.addEventListener('click', () => selectCity(el.dataset.city));
  }});
}});

searchInput.addEventListener('keydown', (e) => {{
  const items = suggestionsEl.querySelectorAll('.suggestion');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {{ e.preventDefault(); suggestionIdx = Math.min(suggestionIdx + 1, items.length - 1); updateSuggestionHighlight(items); }}
  else if (e.key === 'ArrowUp') {{ e.preventDefault(); suggestionIdx = Math.max(suggestionIdx - 1, 0); updateSuggestionHighlight(items); }}
  else if (e.key === 'Enter' && suggestionIdx >= 0) {{ e.preventDefault(); selectCity(items[suggestionIdx].dataset.city); }}
}});

function updateSuggestionHighlight(items) {{
  items.forEach((el, i) => el.classList.toggle('active', i === suggestionIdx));
}}

document.addEventListener('click', (e) => {{
  if (!e.target.closest('.search-wrap')) suggestionsEl.classList.remove('open');
}});

function selectCity(city) {{
  selectedCity = city;
  searchInput.value = city;
  suggestionsEl.classList.remove('open');
  document.querySelectorAll('.city-btn').forEach(b => b.classList.toggle('active', b.textContent.startsWith(city + ' ')));
  renderCity(city);
}}

function renderCity(city) {{
  const schools = CITY_DATA[city];
  if (!schools) return;
  document.getElementById('emptyState').style.display = 'none';
  const results = document.getElementById('results');

  let html = '<h2 class="city-title">' + escHtml(city) + '</h2>';
  html += '<p class="city-subtitle">' + schools.length + ' škol s inspekční zprávou</p>';

  schools.forEach((school, si) => {{
    html += '<div class="school-card">';
    html += '<div class="school-header">';
    html += '<div class="school-name">' + escHtml(school.nazev || school.nazev_plny) + '</div>';
    html += '<div class="school-meta">';
    if (school.typ) html += '<span class="badge badge-type">' + escHtml(school.typ) + '</span>';
    if (school.zrizovatel) html += '<span class="badge badge-zriz">' + escHtml(school.zrizovatel) + '</span>';
    if (school.obor) html += '<span>' + escHtml(school.obor) + (school.zamereni ? ' &ndash; ' + escHtml(school.zamereni) : '') + '</span>';
    if (school.adresa) html += '<span>' + escHtml(school.adresa) + '</span>';
    html += '</div></div>';

    school.inspections.forEach((insp, ii) => {{
      const inspId = 'insp_' + si + '_' + ii;
      const dateStr = formatDate(insp.date);
      const dateTo = insp.date_to ? ' \u2013 ' + formatDate(insp.date_to) : '';
      const isFirst = ii === 0;

      html += '<div class="inspection' + (isFirst ? ' open' : '') + '" id="' + inspId + '">';
      html += '<div class="insp-header" onclick="toggleInsp(\\'' + inspId + '\\')">';
      html += '<span class="insp-date">Inspekce: ' + dateStr + dateTo;
      if (insp.source_url) html += ' <a href="' + escHtml(insp.source_url) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--accent);font-size:0.8rem;font-weight:500;margin-left:0.5rem">PDF &#8599;</a>';
      html += '</span>';
      html += '<span class="insp-arrow">&#9654;</span>';
      html += '</div>';
      html += '<div class="insp-body">';

      // Summary
      if (insp.plain_czech_summary) {{
        html += '<div class="summary-box">' + escHtml(insp.plain_czech_summary) + '</div>';
      }}

      // School profile
      if (insp.school_profile && insp.school_profile.school_change_summary) {{
        html += '<div class="detail-block"><h5>Kontext školy</h5><p>' + escHtml(insp.school_profile.school_change_summary) + '</p></div>';
      }}

      // Strengths
      if (insp.strengths && insp.strengths.length) {{
        html += '<div class="sr-section"><div class="sr-title strengths"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Silné stránky</div>';
        insp.strengths.forEach(s => {{
          html += '<div class="sr-item strength"><div class="sr-tag">' + escHtml(s.tag || '') + '</div>';
          if (s.detail) html += '<div class="sr-detail">' + escHtml(s.detail) + '</div>';
          if (s.evidence) html += '<div class="sr-evidence">' + escHtml(s.evidence) + '</div>';
          html += '</div>';
        }});
        html += '</div>';
      }}

      // Risks
      if (insp.risks && insp.risks.length) {{
        html += '<div class="sr-section"><div class="sr-title risks"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Rizika</div>';
        insp.risks.forEach(r => {{
          html += '<div class="sr-item risk"><div class="sr-tag">' + escHtml(r.tag || '') + '</div>';
          if (r.detail) html += '<div class="sr-detail">' + escHtml(r.detail) + '</div>';
          if (r.evidence) html += '<div class="sr-evidence">' + escHtml(r.evidence) + '</div>';
          html += '</div>';
        }});
        html += '</div>';
      }}

      // Who fits / cautious
      if (insp.who_school_fits && insp.who_school_fits.length) {{
        html += '<div class="who-section fits"><div class="who-title fits">Komu škola sedí</div><ul class="who-list">';
        insp.who_school_fits.forEach(w => {{ html += '<li>' + escHtml(w) + '</li>'; }});
        html += '</ul></div>';
      }}
      if (insp.who_should_be_cautious && insp.who_should_be_cautious.length) {{
        html += '<div class="who-section cautious"><div class="who-title cautious">Kdo by měl zvážit</div><ul class="who-list">';
        insp.who_should_be_cautious.forEach(w => {{ html += '<li>' + escHtml(w) + '</li>'; }});
        html += '</ul></div>';
      }}

      // Questions
      if (insp.questions_for_open_day && insp.questions_for_open_day.length) {{
        html += '<div class="questions"><div class="questions-title">Otázky na den otevřených dveří</div><ol>';
        insp.questions_for_open_day.forEach(q => {{ html += '<li>' + escHtml(q) + '</li>'; }});
        html += '</ol></div>';
      }}

      // Details toggle (hard_facts, model_self_check)
      const detId = 'det_' + si + '_' + ii;
      const hasDetails = (insp.hard_facts && Object.keys(insp.hard_facts).length) || (insp.model_self_check && Object.keys(insp.model_self_check).length);
      if (hasDetails) {{
        html += '<button class="details-toggle" onclick="toggleDetails(\\'' + detId + '\\')">Zobrazit podrobnosti &#9660;</button>';
        html += '<div class="details-content" id="' + detId + '">';

        if (insp.hard_facts) {{
          const hf = insp.hard_facts;
          if (hf.maturita) {{
            html += '<div class="detail-block"><h5>Maturita</h5><p>' + escHtml(typeof hf.maturita === 'string' ? hf.maturita : JSON.stringify(hf.maturita)) + '</p></div>';
          }}
          if (hf.absence) {{
            html += '<div class="detail-block"><h5>Absence</h5><p>' + escHtml(typeof hf.absence === 'string' ? hf.absence : JSON.stringify(hf.absence)) + '</p></div>';
          }}
          if (hf.support_services) {{
            html += '<div class="detail-block"><h5>Podpůrné služby</h5><p>' + escHtml(typeof hf.support_services === 'string' ? hf.support_services : JSON.stringify(hf.support_services)) + '</p></div>';
          }}
          if (hf.safety_climate) {{
            html += '<div class="detail-block"><h5>Bezpečí a klima</h5><p>' + escHtml(typeof hf.safety_climate === 'string' ? hf.safety_climate : JSON.stringify(hf.safety_climate)) + '</p></div>';
          }}
          if (hf.partnerships_practice) {{
            html += '<div class="detail-block"><h5>Partnerství a praxe</h5><p>' + escHtml(typeof hf.partnerships_practice === 'string' ? hf.partnerships_practice : JSON.stringify(hf.partnerships_practice)) + '</p></div>';
          }}
        }}

        if (insp.model_self_check) {{
          const msc = insp.model_self_check;
          html += '<div class="detail-block"><h5>Sebereflexe AI modelu</h5>';
          if (msc.czech_clarity_score_1_5) html += '<p>Srozumitelnost: ' + msc.czech_clarity_score_1_5 + '/5</p>';
          if (msc.czech_clarity_reason) html += '<p>' + escHtml(msc.czech_clarity_reason) + '</p>';
          if (msc.uncertainty_notes) html += '<p><em>' + escHtml(typeof msc.uncertainty_notes === 'string' ? msc.uncertainty_notes : JSON.stringify(msc.uncertainty_notes)) + '</em></p>';
          html += '</div>';
        }}

        html += '</div>';
      }}

      html += '</div></div>';  // insp-body, inspection
    }});

    html += '</div>';  // school-card
  }});

  results.innerHTML = html;
  results.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
}}

function toggleInsp(id) {{
  document.getElementById(id).classList.toggle('open');
}}

function toggleDetails(id) {{
  const el = document.getElementById(id);
  el.classList.toggle('open');
  const btn = el.previousElementSibling;
  btn.innerHTML = el.classList.contains('open') ? 'Skrýt podrobnosti &#9650;' : 'Zobrazit podrobnosti &#9660;';
}}

function escHtml(s) {{
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}}

function highlightMatch(text, query) {{
  const idx = text.toLowerCase().indexOf(query);
  if (idx < 0) return escHtml(text);
  return escHtml(text.slice(0, idx)) + '<strong>' + escHtml(text.slice(idx, idx + query.length)) + '</strong>' + escHtml(text.slice(idx + query.length));
}}

function formatDate(d) {{
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return parts[2] + '. ' + parts[1] + '. ' + parts[0];
  return d;
}}

// Check URL hash for city
if (location.hash) {{
  const city = decodeURIComponent(location.hash.slice(1));
  if (CITY_DATA[city]) selectCity(city);
}}
</script>
</body>
</html>"""
    return html


def main():
    print("Načítám schools_data.json...")
    schools = load_schools()
    print(f"  {len(schools)} škol")

    print("Načítám inspection_extractions.json...")
    extractions = load_extractions()
    print(f"  {len(extractions)} škol s extrakcemi")

    print("Načítám production_reports.json...")
    report_urls = load_report_urls()
    print(f"  {len(report_urls)} report URLs")

    print("Slučuji data...")
    city_data = merge_data(schools, extractions, report_urls)
    total_schools = sum(len(v) for v in city_data.values())
    total_inspections = sum(
        len(s["inspections"]) for schools in city_data.values() for s in schools
    )
    print(f"  {len(city_data)} měst, {total_schools} škol, {total_inspections} inspekcí")

    print("Generuji HTML...")
    html = generate_html(city_data)

    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = OUTPUT_HTML.stat().st_size / 1024 / 1024
    print(f"Hotovo! Výstup: {OUTPUT_HTML} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
