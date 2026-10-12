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

/** Model, který se ptá, když se nezadá jiný (--model); zapisuje se do souhrnu i výsledku, aby šly běhy porovnat. */
export const VYCHOZI_MODEL = 'claude-sonnet-5-5';

export function verzeCli() {
  try { return execFileSync('claude', ['--version'], { encoding: 'utf8', timeout: 30000 }).trim(); } catch { return 'neznámá'; }
}

/** Model přes Claude Code CLI: bez nástrojů, jen s klíčem pro tento krok. Chyba CLI (`is_error`) je výjimka. */
export function modelClaude(vyzva, model = VYCHOZI_MODEL) {
  const out = execFileSync('claude', ['-p', vyzva, '--model', model, '--output-format', 'json', '--max-turns', '1', '--disallowedTools',
    'Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,Agent'], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 180000 });
  const o = JSON.parse(out);
  if (o.is_error) throw new Error(`Claude Code vrátil chybu: ${String(o.result || o.subtype || '').slice(0, 200)}`);
  return o.result || '';
}

/**
 * Skóre: situace se počítá za správnou, když většina opakování odpoví správně; nestálá je, když se odpovědi liší.
 * Selhání volání modelu (výjimka) se počítá zvlášť jako chyba a do nestálosti se nezapočítává; měření s chybou je neplatné.
 */
export async function vyhodnot({ situace, pravidla, model, opakovani = 3 }) {
  const vysledky = [];
  for (const s of situace) {
    const odpovedi = [];
    let chyb = 0;
    for (let i = 0; i < opakovani; i++) {
      try { odpovedi.push(parsujOdpoved(await model(zadani(pravidla, s)))); } catch { chyb += 1; }
    }
    const spravne = odpovedi.filter((o) => o && o.odpoved === s.ocekavano).length;
    const ruzne = new Set(odpovedi.map((o) => o?.odpoved ?? 'nečitelná')).size > 1;
    vysledky.push({ id: s.id, ocekavano: s.ocekavano, spravne, opakovani, chyb, ok: spravne * 2 > opakovani, nestala: ruzne,
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
    chyby: { pocet: vysledky.reduce((a, r) => a + r.chyb, 0), situace: vysledky.filter((r) => r.chyb).map((r) => r.id) },
    platne: vysledky.every((r) => !r.chyb),
    vysledky,
  };
}

export function souhrn(v, nazev = '') {
  const r = (x) => `${x.ok}/${x.pocet}`;
  const chyby = v.chyby?.pocet ? `**NEPLATNÉ MĚŘENÍ: ${v.chyby.pocet} selhání volání modelu** (situace ${v.chyby.situace.join(', ')}); ` : '';
  const meta = v.model ? ` _(model ${v.model}, Claude Code ${v.verzeCli})_` : '';
  return `${nazev ? `**${nazev}**: ` : ''}${chyby}očekávané „ano“ ${r(v.ano)}, očekávané „ne“ ${r(v.ne)}, ` +
    `nestálých ${v.nestalych.length}${v.nestalych.length ? ` (${v.nestalych.join(', ')})` : ''}, ` +
    `neshody ${v.neshody.length ? v.neshody.join(', ') : 'žádné'}${meta}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const koren = arg('koren', '.');
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.log('::error::Chybí secret CLAUDE_CODE_OAUTH_TOKEN, model nelze zavolat.');
    process.exit(1);
  }
  const jmenoModelu = arg('model', VYCHOZI_MODEL);
  const verze = verzeCli();
  const { situace } = JSON.parse(fs.readFileSync(path.join(koren, 'tests/pravidla/kontrolni-situace.json'), 'utf8'));
  const v = await vyhodnot({ situace, pravidla: nactiPravidla(koren), model: (z) => modelClaude(z, jmenoModelu),
    opakovani: Number(arg('opakovani', 3)) });
  Object.assign(v, { model: jmenoModelu, verzeCli: verze });
  if (arg('vystup')) fs.writeFileSync(arg('vystup'), JSON.stringify(v, null, 2));
  console.log(souhrn(v, arg('nazev', koren)));
  if (!v.platne) {
    console.log(`::error::Neplatné měření: ${v.chyby.pocet} selhání volání modelu (situace ${v.chyby.situace.join(', ')}).`);
    process.exitCode = 1;
  }
}
