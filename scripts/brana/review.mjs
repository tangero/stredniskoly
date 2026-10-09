// Automatické review PR modelem Kimi K3 (#455, docs/navrh-rizeni-vyvoje-2027.md, oddíl 9d): workflow
// review.yml ho spouští pro každou novou hlavu PR. Model jen čte a vrací JSON s nálezy; tento skript z main
// rozhodne, zda se review dělá, ověří výstup modelu a komentáře složí sám (verdikt odvozuje z nálezů).
//
//   node scripts/brana/review.mjs priprav <pr> <složka>        (podklady pro model, výstup smi, sha)
//   node scripts/brana/review.mjs zapis <pr> <sha> <výstup>     (komentář Review a případně @claude)
//
// Výsledek zapisuje do GITHUB_OUTPUT. Konfiguraci čte z main přes API, jako brána.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { odRecenzenta, propojenaIssues } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiIssue } from './data.mjs';

export const PRIORITY = ['P1', 'P2', 'P3'];
const MAX_NALEZU = 20;
const MAX_POPIS = 600;
const RADEK_COMMIT = /^[\s>*_]*Commit:[\s*_]*`?([0-9a-f]{7,40})\b/im;
const NEPODARILO = /^[\s>*_]*Verdikt:[\s*_]*Review se nepodařilo/im;

/**
 * Dělat review této hlavy? Jen otevřený PR mimo draft, ne z forku, od vlastníka, asistenta nebo automatiky,
 * a jen když k hlavě ještě není povedené automatické review (opakovaný běh pro tutéž hlavu nic nepřidá). `znovu`
 * (ruční spuštění workflow) review udělá i tak, například po falešném nálezu.
 * `pr` je ve tvaru z GitHub API (pulls/N), `komentare` ve tvaru z data.mjs.
 */
export function smiReview({ pr, komentare = [], konfig, znovu = false }) {
  const r = konfig.rezimy;
  const ne = (duvod) => ({ ok: false, duvod });
  if (pr.state !== 'open') return ne('PR není otevřený');
  if (pr.draft) return ne('PR je draft');
  if (!pr.head?.repo?.full_name || pr.head.repo.full_name !== pr.base?.repo?.full_name) return ne('PR je z forku');
  const autor = pr.user?.login;
  if (![r.vlastnik, r.asistent, r.automatika].filter(Boolean).includes(autor)) return ne(`PR založil účet ${autor || 'neznámý'}`);
  const sha = pr.head.sha;
  // Nepovedené review hlavu neuzavírá: ruční spuštění, které komentář o selhání doporučuje, musí proběhnout.
  const hotovo = !znovu && komentare.some((k) => odRecenzenta(k, konfig) && k.autor === r.automatika
    && /^#{1,6}\s*Review\b/im.test(k.telo || '') && !NEPODARILO.test(k.telo || '')
    && sha.startsWith((k.telo.match(RADEK_COMMIT)?.[1] || '-').toLowerCase()));
  if (hotovo) return ne(`review k hlavě ${sha.slice(0, 7)} už existuje`);
  return { ok: true, duvod: `review hlavy ${sha.slice(0, 7)}` };
}

/**
 * Text od modelu do komentáře: jeden řádek, bez HTML komentářů (značka review, záznamy brány), bez zmínek
 * účtů (`@claude` v review by spustil opravu mimo stanovený komentář) a v rozumné délce.
 */
export function bezpecnyText(text, max = MAX_POPIS) {
  const t = String(text ?? '')
    .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
    .replace(/[<>]/g, (z) => (z === '<' ? '‹' : '›'))
    .replace(/@/g, '@​')
    .replace(/`{3,}/g, '`')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Výstup modelu → { shrnuti, nalezy } nebo null. Model má vrátit jen JSON (případně v bloku ```json).
 * Neplatný tvar, neznámá priorita nebo chybějící popis znamenají neplatný výstup celý: review bez verdiktu
 * „Bez P1 a P2“ je bezpečnější než review, které nálezy potichu ztratí.
 */
export function nactiVystup(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const blok = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const od = blok.indexOf('{');
  const po = blok.lastIndexOf('}');
  if (od < 0 || po < od) return null;
  let data;
  try {
    data = JSON.parse(blok.slice(od, po + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.nalezy) || typeof data.shrnuti !== 'string') return null;
  const nalezy = [];
  for (const n of data.nalezy) {
    if (!n || !PRIORITY.includes(n.priorita) || typeof n.popis !== 'string' || !n.popis.trim()) return null;
    const radek = Number.isInteger(n.radek) && n.radek > 0 ? n.radek : null;
    nalezy.push({ priorita: n.priorita, soubor: typeof n.soubor === 'string' ? n.soubor : '', radek, popis: n.popis });
  }
  return { shrnuti: data.shrnuti, nalezy };
}

const misto = (n) => (n.soubor ? `\`${bezpecnyText(n.soubor, 200).replace(/`/g, '')}${n.radek ? `:${n.radek}` : ''}\`` : 'celý PR');

/** Má review nálezy, které je třeba opravit (P1, P2)? */
export const kOprave = (vystup) => (vystup?.nalezy || []).filter((n) => n.priorita !== 'P3');

/** Komentář „## Review“ ve tvaru, který čte brána. Verdikt skládá skript, ne model. */
export function slozReview({ vystup, sha, znacka, model }) {
  const kratke = sha.slice(0, 7);
  const paticka = `\n---\n_Automatické review modelem ${model} (workflow Review, #455). Značku a verdikt píše skript, model jen nálezy._\n${znacka}`;
  if (!vystup) {
    return `## Review\n\nVerdikt: Review se nepodařilo (výstup modelu chybí nebo je neplatný)\nCommit: ${kratke}\n\nBrána PR bez review „Bez P1 a P2“ nepustí. Nové review spustí další commit, ruční spuštění workflow Review, nebo \`schvaleno\` vlastníka přímo na PR.\n${paticka}`;
  }
  const opravit = kOprave(vystup);
  const verdikt = opravit.length ? `Nálezy k opravě (${opravit.map((n) => n.priorita).join(', ')})` : 'Bez P1 a P2';
  const nalezy = vystup.nalezy.slice(0, MAX_NALEZU)
    .sort((a, b) => PRIORITY.indexOf(a.priorita) - PRIORITY.indexOf(b.priorita))
    .map((n) => `- **${n.priorita}** ${misto(n)}: ${bezpecnyText(n.popis)}`);
  const navic = vystup.nalezy.length > MAX_NALEZU ? `\n- … a dalších ${vystup.nalezy.length - MAX_NALEZU} nálezů` : '';
  return `## Review\n\nVerdikt: ${verdikt}\nCommit: ${kratke}\n\n${bezpecnyText(vystup.shrnuti, 1200)}\n\n${nalezy.length ? `### Nálezy\n\n${nalezy.join('\n')}${navic}` : 'Bez nálezů.'}\n${paticka}`;
}

/** Žádost o opravu pro workflow Oprava z review: jen nálezy P1 a P2, se značkou (bez ní ji smyčka nevezme). */
export function slozOpravu({ vystup, sha, znacka }) {
  const opravit = kOprave(vystup);
  if (!opravit.length) return null;
  const seznam = opravit.slice(0, MAX_NALEZU).map((n) => `- **${n.priorita}** ${misto(n)}: ${bezpecnyText(n.popis)}`);
  return `@claude Oprav prosím nálezy z automatického review ke commitu ${sha.slice(0, 7)}:\n\n${seznam.join('\n')}\n\nNález, který podle pravidel projektu nebo zadání není chyba, neopravuj a napiš proč.\n\n${znacka}`;
}

function vystupGh(hodnoty) {
  const radky = Object.entries(hodnoty).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${radky.join('\n')}\n`);
  console.log(radky.join('\n'));
}

const komentareApi = async (api, cislo) => {
  const vse = [];
  for (let strana = 1; ; strana++) {
    const davka = await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100&page=${strana}`);
    vse.push(...davka.map((k) => ({ id: k.id, autor: k.user?.login, telo: k.body || '' })));
    if (davka.length < 100) return vse;
  }
};

async function priprav(api, cislo, slozka) {
  const konfig = await nactiKonfig(api);
  const pr = await api(`repos/${REPO}/pulls/${cislo}`);
  const znovu = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const rozhodnuti = smiReview({ pr, komentare: await komentareApi(api, cislo), konfig, znovu });
  if (!rozhodnuti.ok) return vystupGh({ smi: false, duvod: rozhodnuti.duvod, sha: pr.head?.sha });
  // Podklady pro model: popis PR a propojená zadání jako text. Diff a strom hlavy připraví workflow.
  const zadani = [];
  for (const n of propojenaIssues(pr.body || '')) {
    const i = await nactiIssue(api, n, { sRodicem: false });
    if (i) zadani.push(`## Zadání #${n}\n\n${i.telo || ''}`);
  }
  fs.mkdirSync(slozka, { recursive: true });
  fs.writeFileSync(path.join(slozka, 'pr.md'),
    `# PR #${cislo}: ${pr.title}\n\nVětev: ${pr.head.ref}\nHlava: ${pr.head.sha}\n\n${pr.body || ''}\n\n${zadani.join('\n\n') || 'PR nemá propojené zadání.'}\n`);
  vystupGh({ smi: true, duvod: rozhodnuti.duvod, sha: pr.head.sha });
}

async function zapis(api, cislo, sha, soubor) {
  const konfig = await nactiKonfig(api);
  const znacka = konfig.rezimy.review?.znacka_automatiky;
  if (!znacka) throw new Error('v rezimy.yml chybí review.znacka_automatiky');
  const pr = await api(`repos/${REPO}/pulls/${cislo}`);
  // Hlava se mezitím změnila: review staré hlavy by brána stejně nepočítala, novou udělá další běh.
  if (pr.head.sha !== sha) return vystupGh({ zapsano: false, duvod: `hlava se změnila na ${pr.head.sha.slice(0, 7)}` });
  const text = fs.existsSync(soubor) ? fs.readFileSync(soubor, 'utf8') : '';
  const vystup = nactiVystup(text);
  const model = process.env.KIMI_MODEL || 'Kimi K3';
  await api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body: slozReview({ vystup, sha, znacka, model }) } });
  const oprava = vystup ? slozOpravu({ vystup, sha, znacka }) : null;
  if (oprava) await api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body: oprava } });
  vystupGh({ zapsano: true, platny: Boolean(vystup), oprava: Boolean(oprava) });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [akce, ...args] = process.argv.slice(2);
  const api = vytvorApi();
  const beh = akce === 'priprav' ? priprav(api, Number(args[0]), args[1])
    : akce === 'zapis' ? zapis(api, Number(args[0]), args[1], args[2])
    : Promise.reject(new Error('použití: review.mjs priprav <pr> <složka> | zapis <pr> <sha> <výstup>'));
  beh.catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
