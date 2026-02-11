#!/usr/bin/env python3
"""Generuje interaktivní HTML report z výsledků inspekční evaluace."""
import json
import pathlib
import html as html_module
from datetime import datetime, timezone


def load_json(path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def esc(text):
    if text is None:
        return ""
    return html_module.escape(str(text))


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    docs_dir = root.parent / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    summary = load_json(root / "data" / "judge" / "scoreboard_summary.json")
    manifest = load_json(root / "config" / "pilot_10_reports.json")
    reports = manifest["reports"]
    report_index = {r["report_id"]: r for r in reports}

    models_cfg = load_json(root / "config" / "models.json")
    judge_model_id = summary["judge_model_id"]
    candidate_models = [m for m in summary["models"]]
    candidate_ids = [m["model_id"] for m in candidate_models]

    # Load all extraction outputs
    all_extractions = {}  # model_id -> report_id -> parsed_output
    all_extraction_meta = {}  # model_id -> report_id -> full payload
    for model_id in candidate_ids:
        all_extractions[model_id] = {}
        all_extraction_meta[model_id] = {}
        model_dir = root / "data" / "outputs" / model_id
        for report in reports:
            path = model_dir / f"{report['report_id']}.json"
            data = load_json(path)
            if data:
                all_extraction_meta[model_id][report["report_id"]] = data
                if data.get("parsed_output"):
                    all_extractions[model_id][report["report_id"]] = data["parsed_output"]

    # Load all judge outputs
    all_judges = {}  # model_id -> report_id -> judge_output
    for model_id in candidate_ids:
        all_judges[model_id] = {}
        judge_dir = root / "data" / "judge" / judge_model_id / model_id
        if not judge_dir.exists():
            continue
        for report in reports:
            path = judge_dir / f"{report['report_id']}.json"
            data = load_json(path)
            if data and data.get("judge_output"):
                all_judges[model_id][report["report_id"]] = data["judge_output"]

    # Load CSV rows for per-report detail
    rows_path = root / "data" / "judge" / "scoreboard_rows.csv"
    import csv
    csv_rows = []
    if rows_path.exists():
        with rows_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            csv_rows = list(reader)

    # Model display names
    model_names = {
        "grok_4_1_fast": "Grok 4.1 Fast",
        "deepseek_chat": "DeepSeek Chat",
        "qwen_turbo": "Qwen Turbo",
        "openrouter_pony_alpha": "Pony Alpha",
        "claude_haiku_4_5": "Claude Haiku 4.5",
        "claude_sonnet_4_5": "Claude Sonnet 4.5",
        "openai_gpt_5_2_reference": "GPT-5.2 (ref)",
    }

    def model_name(mid):
        return model_names.get(mid, mid)

    def score_bar(val, max_val=5):
        if val is None:
            return '<span class="na">N/A</span>'
        v = float(val)
        pct = v / max_val * 100
        color = "#22c55e" if v >= 4 else "#eab308" if v >= 3 else "#ef4444"
        return f'<div class="score-bar"><div class="score-fill" style="width:{pct}%;background:{color}"></div><span class="score-val">{v:.1f}</span></div>'

    def overall_bar(val):
        if val is None:
            return '<span class="na">N/A</span>'
        v = float(val)
        pct = v / 5 * 100
        color = "#22c55e" if v >= 3.5 else "#eab308" if v >= 3 else "#ef4444"
        return f'<div class="score-bar overall"><div class="score-fill" style="width:{pct}%;background:{color}"></div><span class="score-val">{v:.2f}</span></div>'

    def render_extraction(parsed, report_id):
        if not parsed:
            return '<div class="error-box">Parse error - model nevrátil validní JSON</div>'
        parts = []

        # School profile
        sp = parsed.get("school_profile", {})
        parts.append(f'<div class="section-sub"><h5>Profil školy</h5>')
        parts.append(f'<p><strong>Typ:</strong> {esc(sp.get("school_type"))}</p>')
        parts.append(f'<p><strong>Období inspekce:</strong> {esc(sp.get("inspection_period"))}</p>')
        parts.append(f'<p><strong>Shrnutí změn:</strong> {esc(sp.get("school_change_summary"))}</p></div>')

        # For parents
        fp = parsed.get("for_parents", {})
        parts.append('<div class="section-sub"><h5>Pro rodiče</h5>')

        # Summary
        summary_text = fp.get("plain_czech_summary", "")
        if summary_text:
            parts.append(f'<div class="summary-box">{esc(summary_text)}</div>')

        # Strengths
        strengths = fp.get("strengths", [])
        if strengths:
            parts.append('<div class="strengths"><h6>Silné stránky</h6><ul>')
            for s in strengths:
                parts.append(f'<li><span class="tag tag-green">{esc(s.get("tag"))}</span> {esc(s.get("detail"))} <em class="evidence">"{esc(s.get("evidence"))}"</em></li>')
            parts.append('</ul></div>')

        # Risks
        risks = fp.get("risks", [])
        if risks:
            parts.append('<div class="risks"><h6>Rizika</h6><ul>')
            for r in risks:
                parts.append(f'<li><span class="tag tag-red">{esc(r.get("tag"))}</span> {esc(r.get("detail"))} <em class="evidence">"{esc(r.get("evidence"))}"</em></li>')
            parts.append('</ul></div>')

        # Questions
        qs = fp.get("questions_for_open_day", [])
        if qs:
            parts.append('<h6>Otázky na den otevřených dveří</h6><ul>')
            for q in qs:
                parts.append(f'<li>{esc(q)}</li>')
            parts.append('</ul>')

        # Who fits / cautious
        fits = fp.get("who_school_fits", [])
        cautious = fp.get("who_should_be_cautious", [])
        if fits:
            parts.append('<h6>Komu škola sedí</h6><ul>')
            for f in fits:
                parts.append(f'<li>{esc(f)}</li>')
            parts.append('</ul>')
        if cautious:
            parts.append('<h6>Kdo by měl být obezřetný</h6><ul>')
            for c in cautious:
                parts.append(f'<li>{esc(c)}</li>')
            parts.append('</ul>')
        parts.append('</div>')

        # Hard facts
        hf = parsed.get("hard_facts", {})
        parts.append('<div class="section-sub"><h5>Tvrdá data</h5>')
        for key, label in [("maturita", "Maturita"), ("absence", "Absence")]:
            item = hf.get(key, {})
            if item:
                parts.append(f'<h6>{label}</h6>')
                parts.append(f'<p><strong>Trend:</strong> {esc(item.get("trend"))}</p>')
                nums = item.get("key_numbers", [])
                if nums:
                    parts.append('<ul>' + ''.join(f'<li>{esc(n)}</li>' for n in nums) + '</ul>')
                ev = item.get("evidence", "")
                if ev:
                    parts.append(f'<p class="evidence">"{esc(ev)}"</p>')

        for key, label in [("support_services", "Podpůrné služby"), ("safety_climate", "Bezpečí"), ("partnerships_practice", "Partnerství a praxe")]:
            items = hf.get(key, [])
            if items:
                parts.append(f'<h6>{label}</h6><ul>')
                for i in items:
                    parts.append(f'<li>{esc(i)}</li>')
                parts.append('</ul>')
        parts.append('</div>')

        # Self check
        sc = parsed.get("model_self_check", {})
        if sc:
            parts.append('<div class="section-sub"><h5>Sebehodnocení modelu</h5>')
            parts.append(f'<p>Čeština: {sc.get("czech_clarity_score_1_5", "?")}/5 — {esc(sc.get("czech_clarity_reason"))}</p>')
            notes = sc.get("uncertainty_notes", [])
            if notes:
                parts.append('<p><strong>Nejistoty:</strong></p><ul>')
                for n in notes:
                    parts.append(f'<li>{esc(n)}</li>')
                parts.append('</ul>')
            parts.append('</div>')

        return '\n'.join(parts)

    def render_judge(judge_output, report_id):
        if not judge_output:
            return '<div class="na-box">Judge hodnocení není k dispozici</div>'
        parts = []
        parts.append('<div class="judge-scores">')
        for key, label in [
            ("faithfulness_score_1_5", "Věrnost"),
            ("completeness_score_1_5", "Úplnost"),
            ("parent_usefulness_score_1_5", "Užitečnost"),
            ("czech_clarity_score_1_5", "Čeština"),
        ]:
            val = judge_output.get(key)
            parts.append(f'<div class="judge-metric"><span class="judge-label">{label}</span>{score_bar(val)}</div>')
        uc = judge_output.get("unsupported_claims_count", 0)
        uc_color = "#22c55e" if uc <= 1 else "#eab308" if uc <= 3 else "#ef4444"
        parts.append(f'<div class="judge-metric"><span class="judge-label">Nepodložená tvrzení</span><span class="claims-count" style="color:{uc_color}">{uc}</span></div>')
        parts.append('</div>')

        verdict = judge_output.get("one_line_verdict", "")
        if verdict:
            parts.append(f'<p class="verdict">"{esc(verdict)}"</p>')

        issues = judge_output.get("critical_issues", [])
        if issues:
            parts.append('<details><summary>Kritické problémy</summary><ul>')
            for i in issues:
                parts.append(f'<li>{esc(i)}</li>')
            parts.append('</ul></details>')

        best = judge_output.get("best_points", [])
        if best:
            parts.append('<details><summary>Nejlepší body</summary><ul>')
            for b in best:
                parts.append(f'<li>{esc(b)}</li>')
            parts.append('</ul></details>')

        return '\n'.join(parts)

    # Build HTML
    html_parts = []
    html_parts.append(f"""<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inspekce ČŠI — Evaluace LLM modelů</title>
<style>
:root {{
  --bg: #0f172a;
  --surface: #1e293b;
  --surface2: #334155;
  --border: #475569;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --accent: #3b82f6;
  --green: #22c55e;
  --yellow: #eab308;
  --red: #ef4444;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
.container {{ max-width: 1200px; margin: 0 auto; padding: 1.5rem; }}
h1 {{ font-size: 1.8rem; margin-bottom: 0.3rem; }}
h2 {{ font-size: 1.3rem; margin: 2rem 0 1rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }}
h3 {{ font-size: 1.1rem; margin: 1rem 0 0.5rem; }}
h4 {{ font-size: 1rem; margin: 0.8rem 0 0.4rem; color: var(--text-muted); }}
h5 {{ font-size: 0.95rem; margin: 0.7rem 0 0.3rem; color: var(--accent); }}
h6 {{ font-size: 0.85rem; margin: 0.5rem 0 0.2rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }}
p {{ margin: 0.3rem 0; }}
ul {{ padding-left: 1.2rem; margin: 0.3rem 0; }}
li {{ margin: 0.15rem 0; font-size: 0.9rem; }}
a {{ color: var(--accent); }}
.subtitle {{ color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }}

/* Scoreboard table */
.scoreboard {{ width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }}
.scoreboard th {{ background: var(--surface2); padding: 0.6rem 0.5rem; text-align: left; font-weight: 600; position: sticky; top: 0; }}
.scoreboard td {{ padding: 0.5rem; border-bottom: 1px solid var(--border); }}
.scoreboard tr:hover td {{ background: var(--surface); }}
.scoreboard .rank {{ font-weight: 700; font-size: 1.1rem; text-align: center; width: 2rem; }}
.scoreboard .model-name {{ font-weight: 600; white-space: nowrap; }}

/* Score bars */
.score-bar {{ position: relative; height: 22px; background: var(--surface2); border-radius: 4px; min-width: 80px; overflow: hidden; }}
.score-bar.overall {{ min-width: 100px; height: 26px; }}
.score-fill {{ height: 100%; border-radius: 4px; transition: width 0.3s; }}
.score-val {{ position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }}
.na {{ color: var(--text-muted); font-size: 0.8rem; }}

/* Tabs */
.tabs {{ display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 1rem 0; }}
.tab-btn {{ padding: 0.4rem 0.8rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }}
.tab-btn:hover {{ background: var(--surface2); color: var(--text); }}
.tab-btn.active {{ background: var(--accent); color: white; border-color: var(--accent); }}
.tab-content {{ display: none; }}
.tab-content.active {{ display: block; }}

/* Cards */
.report-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin: 0.8rem 0; overflow: hidden; }}
.report-header {{ padding: 0.7rem 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: var(--surface); transition: background 0.2s; }}
.report-header:hover {{ background: var(--surface2); }}
.report-header h4 {{ margin: 0; color: var(--text); font-size: 0.95rem; }}
.report-header .arrow {{ transition: transform 0.2s; font-size: 0.8rem; color: var(--text-muted); }}
.report-card.open .arrow {{ transform: rotate(90deg); }}
.report-body {{ display: none; padding: 1rem; border-top: 1px solid var(--border); }}
.report-card.open .report-body {{ display: block; }}

.section-sub {{ margin: 0.5rem 0; padding: 0.5rem; background: var(--bg); border-radius: 6px; }}
.summary-box {{ background: var(--surface2); padding: 0.6rem; border-radius: 6px; margin: 0.5rem 0; font-style: italic; border-left: 3px solid var(--accent); }}
.error-box {{ background: #451a1a; border: 1px solid var(--red); padding: 0.6rem; border-radius: 6px; color: #fca5a5; text-align: center; }}
.na-box {{ background: var(--surface2); padding: 0.5rem; border-radius: 6px; color: var(--text-muted); text-align: center; font-size: 0.9rem; }}

.tag {{ display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-right: 0.3rem; }}
.tag-green {{ background: #14532d; color: #86efac; }}
.tag-red {{ background: #450a0a; color: #fca5a5; }}
.evidence {{ color: var(--text-muted); font-size: 0.8rem; }}

/* Judge */
.judge-scores {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; margin: 0.5rem 0; }}
.judge-metric {{ display: flex; flex-direction: column; gap: 0.2rem; }}
.judge-label {{ font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }}
.claims-count {{ font-size: 1.2rem; font-weight: 700; }}
.verdict {{ font-style: italic; color: var(--text-muted); margin: 0.5rem 0; padding: 0.4rem; background: var(--surface2); border-radius: 4px; font-size: 0.9rem; }}

details {{ margin: 0.3rem 0; }}
summary {{ cursor: pointer; color: var(--accent); font-size: 0.85rem; }}
details ul {{ margin-top: 0.3rem; }}

/* Layout split */
.split {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }}
.split-label {{ font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--border); }}
@media (max-width: 768px) {{ .split {{ grid-template-columns: 1fr; }} }}

/* Reliability badge */
.badge {{ display: inline-block; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 0.5rem; }}
.badge-ok {{ background: #14532d; color: #86efac; }}
.badge-warn {{ background: #713f12; color: #fde047; }}
.badge-err {{ background: #450a0a; color: #fca5a5; }}

.strengths h6 {{ color: var(--green); }}
.risks h6 {{ color: var(--red); }}

/* Overall header stats */
.stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; margin: 1rem 0; }}
.stat-card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 0.8rem; text-align: center; }}
.stat-value {{ font-size: 1.5rem; font-weight: 700; }}
.stat-label {{ font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }}
</style>
</head>
<body>
<div class="container">
<h1>Inspekce ČŠI — Evaluace LLM modelů</h1>
<p class="subtitle">Pilot: 10 zpráv SŠ | Judge: {model_name(judge_model_id)} | Generováno: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

<div class="stats-grid">
  <div class="stat-card"><div class="stat-value">{len(reports)}</div><div class="stat-label">Inspekčních zpráv</div></div>
  <div class="stat-card"><div class="stat-value">{len(candidate_models)}</div><div class="stat-label">Testovaných modelů</div></div>
  <div class="stat-card"><div class="stat-value">{model_name(candidate_models[0]['model_id'])}</div><div class="stat-label">Nejlepší model</div></div>
  <div class="stat-card"><div class="stat-value">{candidate_models[0]['avg_overall_score']:.2f}</div><div class="stat-label">Nejlepší overall</div></div>
</div>
""")

    # Scoreboard table
    html_parts.append('<h2>Scoreboard</h2>')
    html_parts.append('<table class="scoreboard"><thead><tr>')
    html_parts.append('<th>#</th><th>Model</th><th>Overall</th><th>Věrnost</th><th>Úplnost</th><th>Užitečnost</th><th>Čeština (blend)</th><th>Nepodl. tvrzení</th><th>Valid JSON</th>')
    html_parts.append('</tr></thead><tbody>')
    for i, m in enumerate(candidate_models, 1):
        vj = m["valid_json_rate"]
        badge_cls = "badge-ok" if vj >= 0.9 else "badge-warn" if vj >= 0.6 else "badge-err"
        html_parts.append(f'<tr>')
        html_parts.append(f'<td class="rank">{i}</td>')
        html_parts.append(f'<td class="model-name">{model_name(m["model_id"])}</td>')
        html_parts.append(f'<td>{overall_bar(m.get("avg_overall_score"))}</td>')
        html_parts.append(f'<td>{score_bar(m.get("avg_faithfulness"))}</td>')
        html_parts.append(f'<td>{score_bar(m.get("avg_completeness"))}</td>')
        html_parts.append(f'<td>{score_bar(m.get("avg_parent_usefulness"))}</td>')
        html_parts.append(f'<td>{score_bar(m.get("avg_blended_czech_clarity"))}</td>')
        uc = m.get("avg_unsupported_claims")
        uc_str = f'{uc:.1f}' if uc is not None else "N/A"
        uc_color = "var(--green)" if uc is not None and uc <= 1.5 else "var(--yellow)" if uc is not None and uc <= 3 else "var(--red)"
        html_parts.append(f'<td style="text-align:center;font-weight:600;color:{uc_color}">{uc_str}</td>')
        html_parts.append(f'<td><span class="badge {badge_cls}">{vj*100:.0f}%</span></td>')
        html_parts.append('</tr>')
    html_parts.append('</tbody></table>')

    # Tabs for browsing by school or by model
    html_parts.append('<h2>Detailní výstupy</h2>')
    html_parts.append('<div class="tabs" id="view-tabs">')
    html_parts.append('<button class="tab-btn active" onclick="switchView(\'by-school\')">Podle školy</button>')
    html_parts.append('<button class="tab-btn" onclick="switchView(\'by-model\')">Podle modelu</button>')
    html_parts.append('</div>')

    # --- BY SCHOOL VIEW ---
    html_parts.append('<div class="tab-content active" id="view-by-school">')
    for report in reports:
        rid = report["report_id"]
        rinfo = report
        html_parts.append(f'<h3>{esc(rinfo["school_name"])} <span style="color:var(--text-muted);font-size:0.8rem">({rinfo["school_type"]}, {rinfo["city"]})</span></h3>')
        html_parts.append(f'<p style="font-size:0.8rem;color:var(--text-muted)">Inspekce: {rinfo["inspection_from"]} – {rinfo["inspection_to"]} | ID: {rid}</p>')

        for model_id in candidate_ids:
            parsed = all_extractions.get(model_id, {}).get(rid)
            judge = all_judges.get(model_id, {}).get(rid)
            meta = all_extraction_meta.get(model_id, {}).get(rid, {})
            has_error = meta.get("parse_error") is not None and parsed is None

            status_badge = '<span class="badge badge-ok">OK</span>' if parsed else '<span class="badge badge-err">FAIL</span>'

            html_parts.append(f'<div class="report-card" onclick="this.classList.toggle(\'open\')">')
            html_parts.append(f'<div class="report-header"><h4>{model_name(model_id)} {status_badge}</h4><span class="arrow">&#9654;</span></div>')
            html_parts.append(f'<div class="report-body" onclick="event.stopPropagation()">')
            html_parts.append('<div class="split">')
            html_parts.append(f'<div><div class="split-label">Extrakce</div>{render_extraction(parsed, rid)}</div>')
            html_parts.append(f'<div><div class="split-label">Judge hodnocení</div>{render_judge(judge, rid)}</div>')
            html_parts.append('</div></div></div>')

    html_parts.append('</div>')

    # --- BY MODEL VIEW ---
    html_parts.append('<div class="tab-content" id="view-by-model">')
    for model_id in candidate_ids:
        m_summary = next((m for m in candidate_models if m["model_id"] == model_id), {})
        html_parts.append(f'<h3>{model_name(model_id)}</h3>')
        overall = m_summary.get("avg_overall_score")
        overall_str = f'{overall:.2f}' if overall else "N/A"
        vj = m_summary.get("valid_json_rate", 0)
        html_parts.append(f'<p style="font-size:0.85rem;color:var(--text-muted)">Overall: {overall_str} | Valid JSON: {vj*100:.0f}% | Avg unsupported: {m_summary.get("avg_unsupported_claims", "?")}</p>')

        for report in reports:
            rid = report["report_id"]
            parsed = all_extractions.get(model_id, {}).get(rid)
            judge = all_judges.get(model_id, {}).get(rid)
            meta = all_extraction_meta.get(model_id, {}).get(rid, {})

            status_badge = '<span class="badge badge-ok">OK</span>' if parsed else '<span class="badge badge-err">FAIL</span>'
            school_label = f'{report["school_name"]} ({report["city"]})'

            html_parts.append(f'<div class="report-card" onclick="this.classList.toggle(\'open\')">')
            html_parts.append(f'<div class="report-header"><h4>{esc(school_label)} {status_badge}</h4><span class="arrow">&#9654;</span></div>')
            html_parts.append(f'<div class="report-body" onclick="event.stopPropagation()">')
            html_parts.append('<div class="split">')
            html_parts.append(f'<div><div class="split-label">Extrakce</div>{render_extraction(parsed, rid)}</div>')
            html_parts.append(f'<div><div class="split-label">Judge hodnocení</div>{render_judge(judge, rid)}</div>')
            html_parts.append('</div></div></div>')

    html_parts.append('</div>')

    # JavaScript
    html_parts.append("""
<script>
function switchView(viewId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#view-tabs .tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  event.target.classList.add('active');
}
</script>
</div>
</body>
</html>""")

    output_path = docs_dir / "inspekce-eval.html"
    output_path.write_text('\n'.join(html_parts), encoding="utf-8")
    print(f"HTML report: {output_path}")
    print(f"Size: {output_path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
