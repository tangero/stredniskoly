#!/usr/bin/env python3
"""Opatrný výběr sekce oboru z víceoborového PDF; při nejistotě vrací celý text."""

import re

CODE = re.compile(r"(?im)^\s*(?:k[oó]d\s+oboru|obor)\s*:\s*(\d{2}-\d{2}-[A-Z]/\d{2})\b")
HEADING = re.compile(r"(?im)^\s*(?:[A-Z]\.\s+obory\b|\d+\.\s+obor\b)")


def select(kkov, pages):
    """Vrací (číslované stránky, popis rozhodnutí), bez přehazování čísel stránek."""
    markers = [(page_no, match.start(), match.group(1))
               for page_no, page in enumerate(pages, 1)
               for match in CODE.finditer(page)]
    target = [index for index, (_, _, code) in enumerate(markers) if code == kkov]
    if len(target) != 1 or not any(code != kkov for _, _, code in markers):
        return list(enumerate(pages, 1)), "cely_text_nejasna_sekce"
    index = target[0]
    page_no, offset, _ = markers[index]
    # Na stránce s kódem nesmí být před ním jiný kód oboru; hranici by bylo
    # potřeba odvodit z typografie a tento konzervativní výběr to nedělá.
    if any(n == page_no and pos < offset for n, pos, _ in markers):
        return list(enumerate(pages, 1)), "cely_text_dva_obory_na_strane"
    end_page = len(pages) + 1
    end_offset = 0
    if index + 1 < len(markers):
        end_page, end_offset, _ = markers[index + 1]
    result = []
    for n in range(page_no, end_page + (end_offset > 0)):
        page = pages[n - 1]
        if n == end_page:
            headings = [m.start() for m in HEADING.finditer(page[:end_offset])]
            cut = headings[-1] if headings and end_offset - headings[-1] < 600 else end_offset
            page = page[:cut]
        if page.strip():
            result.append((n, page))
    if not result or sum(len(page) for _, page in result) < 350:
        return list(enumerate(pages, 1)), "cely_text_prilis_kratka_sekce"
    return result, "sekce_podle_kodu_oboru"
