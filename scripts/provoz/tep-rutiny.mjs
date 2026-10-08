// Tep rutiny Claude Code (#440): rutina běží mimo repozitář (Routine v Claude Code, každé 3 hodiny) a na začátku
// každého běhu spustí workflow Tep rutiny ručně (workflow_dispatch). Kontrola v témž workflow každou hodinu zjistí
// poslední tep; když 12 hodin žádný nepřišel, pošle vlastníkovi zprávu do Telegramu. Opakuje ji jednou za 24 hodin,
// dokud tep nepřijde. Bez stavu: okno se počítá z doby od posledního tepu. Bez závislostí.
//
//   node scripts/provoz/tep-rutiny.mjs

import { pathToFileURL } from 'node:url';

const HODINA = 60 * 60 * 1000;
export const LIMIT = 12 * HODINA;
export const OPAKOVANI = 24 * HODINA;
// Kontrola běží každou hodinu; zpráva padne do první hodiny po limitu a pak vždy po 24 hodinách.
export const OKNO = HODINA;

const REPO = process.env.GITHUB_REPOSITORY || 'tangero/stredniskoly';
const WORKFLOW = 'tep-rutiny.yml';

/** Hlásit výpadek? Jen v první hodině po 12 h bez tepu a pak jednou denně. Bez jediného tepu nic (rutina ho ještě neposílá). */
export function mamHlasit(posledniTep, ted) {
  if (!posledniTep) return false;
  const ticho = ted - Date.parse(posledniTep);
  return ticho >= LIMIT && (ticho - LIMIT) % OPAKOVANI < OKNO;
}

export function zprava(posledniTep, ted, { repo = REPO } = {}) {
  const hodin = Math.floor((ted - Date.parse(posledniTep)) / HODINA);
  return [
    `Rutina Claude Code se ${hodin} hodin neozvala (poslední tep ${posledniTep.slice(0, 16).replace('T', ' ')} UTC).`,
    'Zadání ze schválených issues teď nikdo nezpracovává. Zkontroluj Routine v Claude Code (claude.ai/code, Routines): je zapnutá, nedošel limit, poslední běh neskončil chybou?',
    `Běhy tepu: https://github.com/${repo}/actions/workflows/${WORKFLOW}`,
  ].join('\n\n');
}

async function main() {
  const odp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=1`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  });
  if (!odp.ok) throw new Error(`GitHub: ${odp.status}`);
  const posledni = (await odp.json()).workflow_runs?.[0]?.created_at || null;
  const ted = Date.now();
  console.log(`Poslední tep: ${posledni || 'žádný'}.`);
  if (!mamHlasit(posledni, ted)) return;
  const text = zprava(posledni, ted);
  console.log(text);
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!bot || !chat) return console.log('Telegram není nastavený, zprávu neposílám.');
  const t = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!t.ok) throw new Error(`Telegram: ${t.status}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
