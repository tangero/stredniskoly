#!/usr/bin/env python3
"""Read-only R4 evidence: installed font coverage, source excerpts, public JS/data."""
import datetime
import hashlib
import json
import re
import struct
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.prijimackynaskolu.cz'
CHARS = 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def missing_glyphs(data: bytes) -> str:
    """Inspect Unicode cmap format 4/12 of the trusted local TrueType fonts."""
    def u16(pos: int) -> int:
        return struct.unpack_from('>H', data, pos)[0]

    def u32(pos: int) -> int:
        return struct.unpack_from('>I', data, pos)[0]

    tables = {data[12 + 16 * i:16 + 16 * i].decode(): u32(20 + 16 * i)
              for i in range(u16(4))}
    cmap = tables['cmap']
    subtables = []
    for i in range(u16(cmap + 2)):
        pos = cmap + 4 + i * 8
        platform, encoding = u16(pos), u16(pos + 2)
        if platform == 0 or (platform == 3 and encoding in (1, 10)):
            subtables.append(cmap + u32(pos + 4))
    assert any(u16(pos) in (4, 12) for pos in subtables)

    def glyph(cp: int, pos: int) -> int:
        fmt = u16(pos)
        if fmt == 12:
            for i in range(u32(pos + 12)):
                start, end, gid = struct.unpack_from('>III', data, pos + 16 + i * 12)
                if start <= cp <= end:
                    return gid + cp - start
        elif fmt == 4:
            count = u16(pos + 6) // 2
            ends = pos + 14
            starts = ends + 2 * count + 2
            deltas = starts + 2 * count
            offsets = deltas + 2 * count
            for i in range(count):
                if u16(starts + i * 2) <= cp <= u16(ends + i * 2):
                    offset = u16(offsets + i * 2)
                    delta = u16(deltas + i * 2)
                    if not offset:
                        return (cp + delta) & 65535
                    gid = u16(offsets + i * 2 + offset + 2 * (cp - u16(starts + i * 2)))
                    return (gid + delta) & 65535 if gid else 0
        return 0

    return ''.join(ch for ch in CHARS if not any(glyph(ord(ch), pos) for pos in subtables))


def fetch(url: str) -> tuple[dict, bytes]:
    assert urllib.parse.urlsplit(url).netloc == urllib.parse.urlsplit(BASE).netloc
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
        return {'url': url, 'final_url': response.url, 'status': response.status,
                'sha256': sha(data)}, data


def excerpt(path: str, start: int, end: int) -> dict:
    data = (ROOT / path).read_bytes()
    return {'path': path, 'sha256': sha(data), 'start_line': start, 'end_line': end,
            'excerpt': '\n'.join(data.decode().splitlines()[start - 1:end])}


def main() -> None:
    result = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'next_version': json.loads((ROOT / 'node_modules/next/package.json').read_text())['version'],
              'tested_characters': CHARS, 'fonts': []}
    for path in ['node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf',
                 'public/og/fonts/NotoSans-Regular.ttf', 'public/og/fonts/NotoSans-Bold.ttf']:
        data = (ROOT / path).read_bytes()
        result['fonts'].append({'path': path, 'sha256': sha(data), 'missing': missing_glyphs(data)})
    result['source'] = [
        excerpt('src/lib/chances.ts', 103, 126),
        excerpt('src/lib/chances.ts', 170, 176),
        excerpt('src/app/simulator/SimulatorClient.tsx', 175, 176),
        excerpt('src/app/simulator/SimulatorClient.tsx', 353, 362),
        excerpt('node_modules/next/dist/compiled/@vercel/og/index.node.js', 20085, 20088),
        excerpt('node_modules/next/dist/compiled/@vercel/og/index.node.js', 20106, 20118),
    ]
    page, html = fetch(BASE + '/simulator')
    result['simulator_page'] = page
    result['public_simulator_chunks'] = []
    for link in re.findall(r'<script[^>]+src="([^"]+)"', html.decode()):
        url = urllib.parse.urljoin(BASE, link)
        if not url.startswith(BASE + '/_next/static/'):
            continue
        info, data = fetch(url)
        text = data.decode()
        if 'Vysoká šance' in text and 'Malá šance' in text:
            pos = text.index('Vysoká šance')
            info['excerpt'] = text[pos - 85:pos + 230]
            result['public_simulator_chunks'].append(info)
    info, data = fetch(BASE + '/cermat_results_meta.json')
    result['public_data_metadata'] = {**info, 'data': json.loads(data)}
    result['limits'] = [
        'Font cmap coverage does not reproduce historical fallback or network behaviour.',
        'A source excerpt and public JS demonstrate retained heuristics, not their execution in every UI flow.',
        'This audit performs no Matomo queries and changes no application or deployment.',
    ]
    out = ROOT / 'docs/podklady/oponentura-2027-r4-overeni.json'
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'fonts': result['fonts'], 'public_simulator_chunks': result['public_simulator_chunks'],
                      'output': str(out)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
