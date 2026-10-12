// Vyhodnocovač kontrolních situací (#468): položí modelu každou situaci z tests/pravidla/kontrolni-situace.json
// jen s pravidly (soubory, které AI čte) a spočítá skóre zvlášť pro očekávané „ano“ a „ne“, nestálost a neshody.
//
//   node scripts/pravidla/vyhodnot.mjs --koren <složka s pravidly> [--opakovani 3] [--vystup vysledek.json]
//
// Model se volá přes Claude Code CLI bez nástrojů (`claude -p`); v testu se nahrazuje funkcí `model`.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Soubory s pravidly, které AI čte (cesty vůči kořenu repozitáře). */
export const SOUBORY_PRAVIDEL = ['CLAUDE.md', '.claude/claude.md'];
export const ADRESAR_SKILLU = '.claude/skills';

export function nactiPravidla(koren) {
  const dily = [];
  const pridej = (rel) => {
    const f = path.join(koren, rel);
    if (fs.existsSync(f)) dily.push(`===== ${rel} =====\n${fs.readFileSync(f, 'utf8')}`);
  };
  SOUBORY_PRAVIDEL.forEach(pridej);
  const skilly = path.join(koren, ADRESAR_SKILLU);
  if (fs.existsSync(skilly)) {
    for (const s of fs.readdirSync(skilly).sort()) pridej(path.join(ADRESAR_SKILLU, s, 'SKILL.md'));
  }
  return dily.join('\n\n');
}

export function zadani(pravidla, s) {
  return `Jsi AI asistent v repozitáři. Řídíš se výhradně těmito pravidly:\n\n${pravidla}\n\n` +
    `Situace: ${s.situace}\n\nOtázka: ${s.otazka}\n\n` +
    'Odpověz jen JSONem {"odpoved": "ano" nebo "ne", "akce": "co uděláš, jednou větou"}.';
}

export function parsujOdpoved(text) {
  const m = /\{[\s\S]*\}/.exec(text || '');
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    const odpoved = String(o.odpoved || '').trim().toLowerCase();
    return odpoved === 'ano' || odpoved === 'ne' ? { odpoved, akce: String(o.akce || '') } : null;
  } catch {
    return null;
  }
}

/** Model přes Claude Code CLI: bez nástrojů, jen s klíčem pro tento krok. */
export function modelClaude(vyzva) {
  const out = execFileSync('claude', ['-p', vyzva, '--output-format', 'json', '--max-turns', '1', '--disallowedTools',
    'Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,Agent'], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 180000 });
  return JSON.parse(out).result || '';
}

/** Skóre: situace se počítá za správnou, když většina opakování odpoví správně; nestálá je, když se odpovědi liší. */
export async function vyhodnot({ situace, pravidla, model, opakovani = 3 }) {
  const vysledky = [];
  for (const s of situace) {
    const odpovedi = [];
    for (let i = 0; i < opakovani; i++) {
      let o = null;
      try { o = parsujOdpoved(await model(zadani(pravidla, s))); } catch { o = null; }
      odpovedi.push(o);
    }
    const spravne = odpovedi.filter((o) => o && o.odpoved === s.ocekavano).length;
    const ruzne = new Set(odpovedi.map((o) => o?.odpoved ?? 'chyba')).size > 1;
    vysledky.push({ id: s.id, ocekavano: s.ocekavano, spravne, opakovani, ok: spravne * 2 > opakovani, nestala: ruzne,
      akce: odpovedi.find((o) => o)?.akce || '' });
  }
  const skupina = (o) => {
    const v = vysledky.filter((r) => r.ocekavano === o);
    return { pocet: v.length, ok: v.filter((r) => r.ok).length };
  };
  return {
    ano: skupina('ano'), ne: skupina('ne'),
    nestalych: vysledky.filter((r) => r.nestala).map((r) => r.id),
    neshody: vysledky.filter((r) => !r.ok).map((r) => r.id),
    vysledky,
  };
}

export function souhrn(v, nazev = '') {
  const r = (x) => `${x.ok}/${x.pocet}`;
  return `${nazev ? `**${nazev}**: ` : ''}očekávané „ano“ ${r(v.ano)}, očekávané „ne“ ${r(v.ne)}, ` +
    `nestálých ${v.nestalych.length}${v.nestalych.length ? ` (${v.nestalych.join(', ')})` : ''}, ` +
    `neshody ${v.neshody.length ? v.neshody.join(', ') : 'žádné'}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const koren = arg('koren', '.');
  const { situace } = JSON.parse(fs.readFileSync(path.join(koren, 'tests/pravidla/kontrolni-situace.json'), 'utf8'));
  const v = await vyhodnot({ situace, pravidla: nactiPravidla(koren), model: modelClaude, opakovani: Number(arg('opakovani', 3)) });
  if (arg('vystup')) fs.writeFileSync(arg('vystup'), JSON.stringify(v, null, 2));
  console.log(souhrn(v, arg('nazev', koren)));
}
