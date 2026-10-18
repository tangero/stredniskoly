import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import {
  sberSignalu, podleDruhu, overNavrhy, pripravPonauceni, ulozEvidenci, prevezmiRozhodnuti, zapisNavrhy,
  novaEvidence, bezpecnyUryvek, klasifikujKontrolu, sestavZpravy, oddilPonauceni, kratkaPonauceni,
  NAZEV_EVIDENCE, ZNACKA_EVIDENCE, MAX_NAVRHU,
} from '../scripts/prehled/ponauceni.mjs';
import { sestavPrehled } from '../scripts/prehled/tydenni.mjs';

// Smyšlená data: účty a texty jsou vymyšlené, čísla PR a issues nejsou skutečná.
const TED = Date.parse('2026-10-19T06:00:00Z');
const UCTY = { vlastnik: 'vlastnik-test', asistent: 'asistent-test', automatika: 'automatika-test[bot]', znacka: '<!-- review:test -->' };
const R = 'repos/tangero/stredniskoly';
const den = (d) => `2026-10-${d}T10:00:00Z`;
const pr = (number, navic = {}) => ({
  number, title: `PR ${number}`, updated_at: den(17), closed_at: null, merged_at: null,
  user: { type: 'User' }, labels: [], head: { sha: `sha${number}` }, ...navic,
});
const kom = (cislo, login, body, created = den(16), druh = 'pull') => ({
  html_url: `https://github.com/tangero/stredniskoly/${druh}/${cislo}#issuecomment-1`, user: { login }, body, created_at: created, updated_at: created,
});

const ZAVRENE = [
  pr(701, { closed_at: den(15), merged_at: den(15) }), // sloučené se 3 koly oprav
  pr(702, { closed_at: den(16) }), // zavřené bez sloučení
  pr(703, { closed_at: den(16), user: { type: 'Bot' } }), // obnova dat od bota: není selhání agenta
  pr(704, { closed_at: den(14), merged_at: den(14), labels: [{ name: 'potrebuje-cloveka' }] }),
  pr(600, { updated_at: '2026-10-01T00:00:00Z', closed_at: '2026-10-01T00:00:00Z', merged_at: '2026-10-01T00:00:00Z' }), // mimo týden
];
const OTEVRENE = [pr(710), pr(711)];
const KOMENTARE = [
  kom(701, 'vlastnik-test', '@claude oprav\n<!-- oprava-z-review:kolo=1 -->\n\n---\nZapsal Claude Code'),
  kom(701, 'vlastnik-test', 'kolo\n<!-- oprava-z-review:kolo=3 -->\n\n---\nZapsal Claude Code'),
  kom(710, 'automatika-test[bot]', '## Review\n\nVerdikt: Review se nepodařilo (výstup modelu chybí nebo je neplatný)\nCommit: abc\n<!-- review:test -->'),
  kom(711, 'automatika-test[bot]', '## Review\n\nVerdikt: Nálezy k opravě (P1)\nCommit: abc\n<!-- review:test -->'),
  kom(520, 'vlastnik-test', 'Tohle jsi převzal bez ověření v datech, napiš mi na skola@example.cz nebo +420 777 123 456, @asistent-test', den(16), 'issues'),
  kom(521, 'asistent-test', '### Odpověď vlastníka\nNepárovat podle ID_SO, ověř nejdřív v datech.', den(17), 'issues'),
  kom(522, 'vlastnik-test', 'Shrnutí práce\n\n---\nZapsal Claude Code', den(17), 'issues'), // AI z účtu vlastníka: není signál
  kom(523, 'cizi-ucet', 'Odpověď vlastníka', den(17), 'issues'), // cizí účet: není signál
  kom(703, 'automatika-test[bot]', '## Review\n\nVerdikt: Nálezy k opravě (P2)\nCommit: abc\n<!-- review:test -->'), // PR od bota: není signál
];
const KONTROLY = {
  sha701: [{ name: 'TypeScript', conclusion: 'success', output: {} }, { name: 'Build na GitHubu a nasazení na Vercel', conclusion: 'failure', output: {} }],
  sha703: [{ name: 'TypeScript', conclusion: 'failure', output: { title: 'chyba typů' } }],
  sha702: [{ name: 'Python testy a kontroly dat', conclusion: 'failure', output: { title: 'AssertionError v test_katalog' } }],
  sha704: [],
  sha710: [
    { name: 'Brána sloučení', conclusion: 'failure', output: { title: 'Neprošlo (H2)', summary: '- chybí souhlas vlastníka na PR' } },
    { name: 'Integrace katalogu', conclusion: 'failure', output: { title: 'Error: 429 rate limit exceeded' } },
  ],
  sha711: [
    { name: 'TypeScript', conclusion: 'timed_out', output: {} },
    { name: 'Brána sloučení', conclusion: 'failure', output: { title: 'Neprošlo (R)', summary: '- chybí oddíl Pro vlastníka' } },
  ],
};

function fixtureApi({ evidence = null, evidenceKomentare = [] } = {}) {
  const volani = [];
  const api = async (cesta, opts = {}) => {
    volani.push({ cesta, method: opts.method || 'GET', body: opts.body });
    if (opts.method && opts.method !== 'GET') return { number: 900, id: 1 };
    if (cesta.startsWith(`${R}/pulls?state=closed`)) return ZAVRENE;
    if (cesta.startsWith(`${R}/pulls?state=open`)) return OTEVRENE;
    if (cesta.startsWith(`${R}/issues/comments?since=`)) return KOMENTARE;
    const sha = cesta.match(/commits\/(\w+)\/check-runs/)?.[1];
    if (sha) return { check_runs: KONTROLY[sha] || [] };
    if (cesta.startsWith(`${R}/issues?state=open&labels=oblast:provoz`)) {
      return evidence ? [{ number: 900, title: NAZEV_EVIDENCE }] : [{ number: 1, title: 'Jiné' }];
    }
    if (cesta.startsWith(`${R}/issues/900/comments`)) {
      return [
        ...(evidence ? [{ id: 55, body: `<!-- ${ZNACKA_EVIDENCE} -->\n\n\`\`\`json\n${JSON.stringify(evidence)}\n\`\`\``, user: { login: 'github-actions[bot]' } }] : []),
        ...evidenceKomentare,
      ];
    }
    throw new Error(`neočekávaný dotaz ${cesta}`);
  };
  return { api, volani };
}

// K1
test('K1: sběr signálů z fixture odpovědí API vrátí selhání podle druhu', async () => {
  const { api } = fixtureApi();
  const { signaly, prostredi } = await sberSignalu(api, TED, UCTY);
  const druhy = Object.fromEntries(Object.entries(podleDruhu(signaly)).map(([d, s]) => [d, s.map((x) => x.cislo)]));
  assert.deepEqual(druhy, {
    'potrebuje-cloveka': [704],
    'kola-oprav': [701],
    'zavreno-bez-slouceni': [702],
    'odpoved-vlastnika': [520, 521],
    'kontrola-neprosla': [702, 711],
    'review-nalezy': [711],
  });
  assert.equal(signaly.find((s) => s.druh === 'kola-oprav').kol, 3);
  assert.equal(signaly.find((s) => s.druh === 'odpoved-vlastnika' && s.cislo === 520).pr, false);
  assert.deepEqual(prostredi.map((p) => `${p.cislo} ${p.kontrola}`).sort(), ['710 Integrace katalogu', '710 Review', '711 TypeScript']);
});

// K5
test('K5: limit modelu, výpadek API a vypršený čas nejsou selhání agenta', async () => {
  const k = (conclusion, output = {}, name = 'TypeScript') => klasifikujKontrolu({ name, conclusion, output });
  assert.equal(k('failure', { title: 'OpenRouter: 429 Too Many Requests' }), 'prostredi');
  assert.equal(k('failure', { summary: 'GitHub API: 502 Bad Gateway' }), 'prostredi');
  assert.equal(k('failure', { summary: 'Kimi: vyčerpaný 5hodinový limit' }), 'prostredi');
  assert.equal(k('timed_out'), 'prostredi');
  // Čísla issue a počty řádků v textu brány nejsou kódy odpovědi.
  assert.equal(k('failure', { title: 'Neprošlo (L)', summary: '- propojené issue #429 nemá doklad\nZměněné řádky mimo testy: 503.' }, 'Brána sloučení'), 'kontrola-neprosla');
  assert.equal(k('failure', { summary: 'gh: Not Found (HTTP 502)' }), 'prostredi');
  assert.equal(k('failure', { title: 'Neprošlo (L)', summary: '- přes limit rutiny' }, 'Brána sloučení'), 'kontrola-neprosla');
  assert.equal(k('failure', { title: 'AssertionError' }), 'kontrola-neprosla');
  assert.equal(k('failure', { title: 'Čeká na lhůtu (L)' }, 'Brána sloučení'), null);
  assert.equal(k('success'), null);
  // Nasazení náhledu padá i po smazání větve sloučeného PR: není kontrola práce agenta.
  assert.equal(k('failure', {}, 'Build na GitHubu a nasazení na Vercel'), null);
  const { api } = fixtureApi();
  const { signaly } = await sberSignalu(api, TED, UCTY);
  assert.ok(!signaly.some((s) => s.cislo === 710), 'PR jen se selháním prostředí nemá signál selhání agenta');
});

// P2
test('P2: úryvky bez e-mailů, telefonů a účtů; model ani přehled je nedostanou', async () => {
  assert.equal(bezpecnyUryvek('Napiš @nekdo na skola@example.cz, tel. +420 777 123 456 <!-- x -->'), 'Napiš [účet] na [e-mail], tel. [telefon]');
  assert.ok(bezpecnyUryvek('a'.repeat(500)).length <= 200);
  const { api } = fixtureApi();
  const { signaly } = await sberSignalu(api, TED, UCTY);
  const zpravy = JSON.stringify(sestavZpravy(signaly, { pravidla: 'pravidla' }));
  for (const zakazane of ['skola@example.cz', '777 123 456', 'vlastnik-test', 'asistent-test', 'automatika-test']) {
    assert.ok(!zpravy.includes(zakazane), `zprávy modelu obsahují ${zakazane}`);
  }
  const text = oddilPonauceni({ signaly, prostredi: [], navrhy: [], model: 'ok' }).join('\n');
  assert.ok(!/example\.cz|777 123|vlastnik-test|asistent-test/.test(text));
});

const SIGNALY = [
  { druh: 'odpoved-vlastnika', cislo: 516, pr: false }, { druh: 'kola-oprav', cislo: 511, pr: true, kol: 4 },
  { druh: 'kontrola-neprosla', cislo: 512, pr: true }, { druh: 'zavreno-bez-slouceni', cislo: 513, pr: true },
];
const navrh = (klic, doklady, navic = {}) => ({
  klic, nazev: `Návrh ${klic}`, co: 'AI převzala tvrzení bez ověření.', doklady, skoda: null,
  pravidlo: 'Pravidla z .claude/claude.md', soubor: 'CLAUDE.md', zmena: '+ - Tvrzení agenta ověř v datech.', ...navic,
});

// K3
test('K3: návrh s méně než dvěma doklady bez věcné škody se nepodá, vymyšlené doklady neplatí', () => {
  const v = overNavrhy(JSON.stringify({ navrhy: [
    navrh('jeden-doklad', [516]),
    navrh('vymysleny-doklad', [516, 99999]),
    navrh('jeden-se-skodou', [511], { skoda: 'na webu byla chybná data' }),
    navrh('dva-doklady', [516, 511]),
  ] }), SIGNALY);
  assert.deepEqual(v.navrhy.map((n) => n.klic), ['jeden-se-skodou', 'dva-doklady']);
  assert.deepEqual(v.vyrazeno.map((n) => n.klic), ['jeden-doklad', 'vymysleny-doklad']);
  assert.equal(overNavrhy('nejsem json', SIGNALY), null);
  assert.equal(overNavrhy('{"neco": 1}', SIGNALY), null);
  // Cíl jen CLAUDE.md nebo skill a nejvýš tři návrhy.
  const v2 = overNavrhy(`\`\`\`json\n${JSON.stringify({ navrhy: [
    navrh('mimo-pravidla', [516, 511], { soubor: 'src/app/page.tsx' }),
    navrh('a-skill', [516, 511], { soubor: '.claude/skills/rizeni-brana/SKILL.md' }),
    navrh('b-druhy', [516, 512]), navrh('c-treti', [511, 512]), navrh('d-ctvrty', [512, 513]),
  ] })}\n\`\`\``, SIGNALY);
  assert.deepEqual(v2.navrhy.map((n) => n.klic), ['a-skill', 'b-druhy', 'c-treti']);
  assert.equal(v2.navrhy.length, MAX_NAVRHU);
});

// K4
test('K4: zamítnutý návrh se v dalším týdnu nezopakuje, navržený také ne', async () => {
  const stav = novaEvidence();
  zapisNavrhy(stav, [{ klic: 'overit-tvrzeni', nazev: 'Ověřit tvrzení' }], TED);
  const komentare = [
    { body: 'zamítnuto: overit-tvrzeni', user: { login: 'vlastnik-test' }, created_at: den(20) },
    { body: 'zamítnuto: jiny-klic', user: { login: 'cizi-ucet' }, created_at: den(20) },
  ];
  assert.equal(prevezmiRozhodnuti(stav, komentare, UCTY), 1);
  assert.equal(stav.navrhy['overit-tvrzeni'].stav, 'zamitnuto');
  assert.equal(stav.navrhy['jiny-klic'], undefined, 'rozhodnutí z cizího účtu neplatí');

  // Další týden: model navrhne totéž znovu, skript ho vyřadí; zamítnutí přijde z komentáře v issue evidence.
  const { api } = fixtureApi({
    evidence: { verze: 1, navrhy: { 'overit-tvrzeni': { stav: 'navrzeno', nazev: 'Ověřit tvrzení', navrzeno: '2026-10-12' } } },
    evidenceKomentare: [{ body: '### Odpověď vlastníka\nzamítnuto: overit-tvrzeni', user: { login: 'asistent-test' }, created_at: den(13) }],
  });
  const model = async (zpravy) => {
    assert.match(zpravy[1].content, /overit-tvrzeni \(zamitnuto\)/, 'model dostane evidenci');
    return JSON.stringify({ navrhy: [navrh('overit-tvrzeni', [520, 521]), navrh('nove-ponauceni', [702, 711])] });
  };
  const p = await pripravPonauceni(api, TED, UCTY, { model, pravidla: () => 'pravidla' });
  assert.deepEqual(p.navrhy.map((n) => n.klic), ['nove-ponauceni']);
  assert.match(p.vyrazeno[0].duvod, /už v evidenci \(zamitnuto\)/);
  assert.equal(p.novyStav.navrhy['overit-tvrzeni'].stav, 'zamitnuto');
  assert.equal(p.novyStav.navrhy['nove-ponauceni'].stav, 'navrzeno');
});

// K2
test('K2: oddíl Ponaučení v sestavPrehled, nejvýš 3 návrhy s doklady a zněním; bez signálů „žádné ponaučení“', () => {
  const zaklad = { od: TED - 7 * 86400000, ted: TED, slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [], expirace: {} };
  const navrhy = overNavrhy(JSON.stringify({ navrhy: [
    navrh('a-prvni', [516, 511]), navrh('b-druhy', [516, 512]), navrh('c-treti', [511, 512]), navrh('d-ctvrty', [512, 513]),
  ] }), SIGNALY).navrhy;
  const { kratky, dlouhy } = sestavPrehled({ ...zaklad, ponauceni: { signaly: SIGNALY, prostredi: [], navrhy, model: 'ok', evidence: 900 } });
  assert.match(dlouhy, /## Ponaučení/);
  assert.equal(dlouhy.match(/^### \d\. /gm).length, 3);
  assert.match(dlouhy, /### 1\. Návrh a-prvni \(`a-prvni`\)/);
  assert.match(dlouhy, /Doklady: \[#516\]\(https:\/\/github\.com\/tangero\/stredniskoly\/issues\/516\), \[#511\]\(https:\/\/github\.com\/tangero\/stredniskoly\/pull\/511\)/);
  assert.match(dlouhy, /Navržená změna `CLAUDE\.md`:\n\n```diff\n\+ - Tvrzení agenta ověř v datech\.\n```/);
  assert.match(dlouhy, /zamítnuto: <klíč>/);
  assert.match(kratky, /^Ponaučení: 3 návrhy změny pravidel AI v celém přehledu/m);

  const nic = sestavPrehled({ ...zaklad, ponauceni: { signaly: [], prostredi: [], navrhy: [], model: 'bez signálů' } });
  assert.match(nic.dlouhy, /## Ponaučení\n[^\n]*\n\n- žádné ponaučení/);
  assert.doesNotMatch(nic.kratky, /Ponaučení/);
  // Bez modelu: jen výpis signálů.
  const bez = sestavPrehled({ ...zaklad, ponauceni: { signaly: SIGNALY, prostredi: [{ druh: 'prostredi', cislo: 514, pr: true, kontrola: 'Review' }], navrhy: [], model: 'model nedostupný (chybí OPENROUTER_API_KEY)' } });
  assert.match(bez.dlouhy, /žádné ponaučení: návrhy nejsou, model nedostupný \(chybí OPENROUTER_API_KEY\)/);
  assert.match(bez.dlouhy, /### Signály selhání agentů/);
  assert.match(bez.dlouhy, /sloučené PR s koly oprav z review: \[#511\]\([^)]+\) \(4 kol\)/);
  assert.match(bez.dlouhy, /selhání prostředí .*\[#514\]/);
  assert.match(bez.kratky, /Ponaučení: žádný návrh, signálů selhání agentů 4/);
  assert.match(sestavPrehled({ ...zaklad, ponauceni: { chyba: 'boom' } }).dlouhy, /## Ponaučení\n- nepodařilo se načíst: boom/);
  assert.doesNotMatch(sestavPrehled(zaklad).dlouhy, /Ponaučení/);
  assert.equal(kratkaPonauceni(null), '');
});

test('chybějící klíč nebo selhání modelu nechá jen signály a evidenci nemění', async () => {
  const { api } = fixtureApi();
  const p = await pripravPonauceni(api, TED, UCTY, { model: async () => { throw new Error('chybí OPENROUTER_API_KEY'); }, pravidla: () => '' });
  assert.equal(p.navrhy.length, 0);
  assert.ok(p.signaly.length > 0);
  assert.match(p.model, /model nedostupný \(chybí OPENROUTER_API_KEY\)/);
  assert.equal(p.novyStav, null);
});

// P1
test('P1: modul zapisuje jen stavový komentář evidence, nemění soubory ani nezakládá PR', async () => {
  const { api, volani } = fixtureApi();
  const model = async () => JSON.stringify({ navrhy: [navrh('nove-ponauceni', [702, 711])] });
  const p = await pripravPonauceni(api, TED, UCTY, { model, pravidla: () => '' });
  assert.ok(volani.every((v) => v.method === 'GET'), 'příprava jen čte');
  await ulozEvidenci(api, p.ulozeni, p.novyStav);
  const zapisy = volani.filter((v) => v.method !== 'GET');
  assert.deepEqual(zapisy.map((v) => `${v.method} ${v.cesta}`), [`POST ${R}/issues`, `POST ${R}/issues/900/comments`]);
  assert.match(zapisy[1].body.body, /<!-- ponauceni:stav -->/);
  for (const v of volani) assert.doesNotMatch(v.cesta, /\/(contents|pulls|git)\/|\/pulls$|\/merges/);

  const zdroj = fs.readFileSync(new URL('../scripts/prehled/ponauceni.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(zdroj, /writeFileSync|appendFileSync|execFileSync|child_process|pulls`, \{ method/);

  const wf = yaml.load(fs.readFileSync(new URL('../.github/workflows/tydenni-prehled.yml', import.meta.url), 'utf8'));
  assert.equal(wf.permissions.contents, 'read');
  assert.notEqual(wf.permissions['pull-requests'], 'write');
  assert.ok(Object.values(wf.jobs).every((j) => !j.permissions), 'jobs nepřidávají oprávnění');
  const kroky = JSON.stringify(wf.jobs);
  assert.doesNotMatch(kroky, /git push|gh pr create|git commit/);
});
