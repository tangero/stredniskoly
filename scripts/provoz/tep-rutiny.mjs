// Tep rutiny Claude Code (#440, #461): rutina běží mimo repozitář (Routine v Claude Code, každé 3 hodiny) a na začátku
// každého běhu přepíše komentář se značkou `tep-rutiny` v issue Tep rutiny (#462). Spustit workflow neumí (403).
// Kontrola zjistí čas poslední úpravy komentáře; po 12 hodinách ticha pošle vlastníkovi zprávu do Telegramu a pak
// jednou denně, dokud tep nepřijde. Kdy naposledy hlásila, si pamatuje ve vlastním komentáři, takže funguje
// i při nepravidelných bězích (plánovač, záloha GitHubu). Bez závislostí.
//
//   node scripts/provoz/tep-rutiny.mjs

import { pathToFileURL } from 'node:url';

const HODINA = 60 * 60 * 1000;
export const LIMIT = 12 * HODINA;
export const OPAKOVANI = 24 * HODINA;
export const ISSUE_TEPU = 462;
export const ZNACKA_TEPU = '<!-- tep-rutiny -->';
export const ZNACKA_KONTROLY = '<!-- tep-kontrola -->';
const BOT = 'github-actions[bot]';

const REPO = process.env.GITHUB_REPOSITORY || 'tangero/stredniskoly';

/** Poslední tep (úprava komentáře se značkou od vlastníka) a poslední upozornění (komentář kontroly). */
export function ctiStav(komentare = []) {
  const tep = komentare.filter((k) => k.autor !== BOT && (k.telo || '').includes(ZNACKA_TEPU))
    .map((k) => k.upraveno || k.vytvoreno).sort().pop() || null;
  const kontrola = komentare.find((k) => k.autor === BOT && (k.telo || '').includes(ZNACKA_KONTROLY)) || null;
  const upozorneno = kontrola?.telo.match(/upozorneno=(\S+)/)?.[1] || null;
  return { tep, upozorneno: upozorneno === 'nikdy' ? null : upozorneno, kontrola: kontrola?.id || null };
}

/** Hlásit výpadek? Po 12 h ticha, pokud od tepu ještě nehlásila, nebo od posledního upozornění uběhlo 24 h. */
export function mamHlasit({ tep, upozorneno }, ted) {
  if (!tep || ted - Date.parse(tep) < LIMIT) return false;
  if (!upozorneno || Date.parse(upozorneno) < Date.parse(tep)) return true;
  return ted - Date.parse(upozorneno) >= OPAKOVANI;
}

export function zprava(tep, ted, { repo = REPO } = {}) {
  const hodin = Math.floor((ted - Date.parse(tep)) / HODINA);
  return [
    `Rutina Claude Code se ${hodin} hodin neozvala (poslední tep ${tep.slice(0, 16).replace('T', ' ')} UTC).`,
    'Zadání ze schválených issues teď nikdo nezpracovává. Zkontroluj Routine v Claude Code (claude.ai/code, Routines): je zapnutá, nedošel limit, poslední běh neskončil chybou?',
    `Tep: https://github.com/${repo}/issues/${ISSUE_TEPU}`,
  ].join('\n\n');
}

const textKontroly = (upozorneno) => `${ZNACKA_KONTROLY}\nKontrola tepu (workflow Tep rutiny), neupravovat. upozorneno=${upozorneno || 'nikdy'}`;

async function main() {
  const api = async (cesta, { method = 'GET', body } = {}) => {
    const odp = await fetch(`https://api.github.com/${cesta}`, {
      method,
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!odp.ok) throw new Error(`GitHub ${method} ${cesta}: ${odp.status}`);
    return odp.json();
  };
  const komentare = (await api(`repos/${REPO}/issues/${ISSUE_TEPU}/comments?per_page=100`))
    .map((k) => ({ id: k.id, autor: k.user?.login, telo: k.body || '', vytvoreno: k.created_at, upraveno: k.updated_at }));
  const stav = ctiStav(komentare);
  const ted = Date.now();
  console.log(`Poslední tep: ${stav.tep || 'žádný'}, poslední upozornění: ${stav.upozorneno || 'žádné'}.`);
  if (!mamHlasit(stav, ted)) return;
  const text = zprava(stav.tep, ted);
  console.log(text);
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!bot || !chat) return console.log('Telegram není nastavený, zprávu neposílám.');
  const t = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!t.ok) throw new Error(`Telegram: ${t.status}`);
  const telo = textKontroly(new Date(ted).toISOString());
  if (stav.kontrola) await api(`repos/${REPO}/issues/comments/${stav.kontrola}`, { method: 'PATCH', body: { body: telo } });
  else await api(`repos/${REPO}/issues/${ISSUE_TEPU}/comments`, { method: 'POST', body: { body: telo } });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
