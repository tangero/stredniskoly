// Denní zpráva „Čeká na tebe“ (#440): všechno, co čeká na rozhodnutí vlastníka, v jedné zprávě do Telegramu,
// seskupené podle druhu. U každé položky lidská věta, co a kde zkontrolovat (oddíl „Pro vlastníka“ z popisu PR,
// otázka z issue, první odstavec návrhu), a tlačítko na PR nebo issue, kam přidat `schvaleno` nebo odpovědět.
// Prázdný den nic neposílá. Spouští ho workflow ceka-na-tebe.yml jednou denně (Plánovač, #461). Bez modelu, jen čte.
//
//   node scripts/prehled/ceka-na-tebe.mjs --nanecisto   jen vypíše (mimo Actions přes gh)

import { pathToFileURL } from 'node:url';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';
import { adresaNahledu } from '../brana/overeni-nahledu.mjs';
import { cestyNaWebu, textProVlastnika } from '../brana/oznameni-nasazeni.mjs';
import { textOtazky } from '../brana/otazka.mjs';

const HODINA = 60 * 60 * 1000;
export const MAX_V_SKUPINE = 6;
export const MAX_TLACITEK = 12;
export const MAX_TEXTU = 280;
// Oponentura běží do 75 minut; déle se štítkem znamená, že uvízla (starší verze workflow štítek po chybě neodebírala).
export const UVIZLA_PO = 3 * HODINA;
const MAX_DELKA = 3900; // limit Telegramu je 4096 znaků

export const html = (t = '') => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const zkrat = (t, n = MAX_TEXTU) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
export const STITKY_VEREJNYCH = ['bug-report', 'feature-request', 'puvod:hlaseni', 'puvod:email', 'portal-skoly'];

/** Markdown z komentáře jako jeden odstavec: bez nadpisů, tabulek, tučného písma a odkazů (#461). */
export function jedenOdstavec(t = '') {
  return t.split('\n').filter((r) => !/^\s*\|/.test(r)).map((r) => r.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, ''))
    .join(' ').replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}
const adresa = (cislo, pr = false) => `https://github.com/${REPO}/${pr ? 'pull' : 'issues'}/${cislo}`;

/** Skupiny v pořadí, ve kterém je vlastník má vyřizovat. `akce` je pokyn pod položkou, `tlacitko` popisek tlačítka. */
export const SKUPINY = [
  { klic: 'souhlas', nadpis: '✅ Ke schválení', akce: 'Když sedí, přidej na PR štítek <code>schvaleno</code>.', tlacitko: 'schválit' },
  { klic: 'otazka', nadpis: '❓ Otázky na tebe', akce: 'Odpověz komentářem v issue, nebo řekni Eduardě či Claude Code.', tlacitko: 'odpovědět' },
  { klic: 'oponentura', nadpis: '⚖️ Oponentura hotová', akce: 'Vyber variantu: <code>schvaleno</code> s komentářem, kterou, nebo <code>zamitnuto</code>.', tlacitko: 'vybrat' },
  { klic: 'navrh', nadpis: '💡 Návrhy', akce: 'Souhlas štítkem <code>schvaleno</code>, odmítnutí <code>zamitnuto</code>.', tlacitko: 'rozhodnout' },
  { klic: 'hlaseni', nadpis: '📮 Hlášení od veřejnosti', akce: 'Opravit: <code>schvaleno</code>. Není to chyba: zavřít s důvodem, nebo <code>zamitnuto</code>.', tlacitko: 'hlášení' },
  { klic: 'pripominka', nadpis: '⏰ Splatné připomínky', akce: 'Vyhodnocení připraví AI; rozhodnutí z něj je na tobě.', tlacitko: 'připomínka' },
  { klic: 'clovek', nadpis: '🛠 Oprava z review uvízla', akce: 'Smyčka oprav skončila; rozhodni, jak dál (komentář v PR).', tlacitko: 'PR' },
  { klic: 'uvizla', nadpis: '⚠️ Uvízlá oponentura', akce: 'Spustíš ji znovu odebráním a přidáním štítku <code>oponentura</code>.', tlacitko: 'oponentura' },
];

/** První odstavec těla issue bez nadpisů, dokladu „Zdroj:“, komentářů a odrážek kritérií. */
export function uvodIssue(telo = '') {
  const odstavce = telo.replace(/<!--[\s\S]*?-->/g, '').split(/\n\s*\n/)
    .map((o) => o.split('\n').filter((r) => !/^\s*(#|Zdroj:|Termín:|---|_Generated)/i.test(r)).join(' ').trim())
    .filter((o) => o && !/^[-*]\s*\[[ xX]\]/.test(o));
  return zkrat((odstavce[0] || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' '));
}

/** Termín připomínky z těla issue (RRRR-MM-DD), nebo null. */
export const terminPripominky = (telo = '') => (telo.match(/Termín:?\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;

/** PR potřebuje souhlas vlastníka, když poslední kontrola brány neprošla kvůli chybějícímu souhlasu. */
export function potrebujeSouhlas(kontrola) {
  return kontrola?.conclusion === 'failure' && /chybí souhlas vlastníka|potřebuje schvaleno/.test(kontrola.output?.summary || '');
}

/**
 * Položka PR ke schválení: co a kde zkontrolovat. Cesty z oddílu „Pro vlastníka“ vedou na náhled PR (změna ještě
 * není na webu); bez náhledu jen jako text.
 */
export function polozkaPr(p, { nahled } = {}) {
  const text = textProVlastnika(p.telo) || 'Popis pro vlastníka chybí. Když PR mění jen pravidla nebo automatiku, stačí přečíst shrnutí v PR.';
  const cesty = cestyNaWebu(p.telo);
  const kde = cesty.map((c) => (nahled ? `<a href="${html(nahled + c)}">${html(c)}</a>` : `<code>${html(c)}</code>`));
  const zkontroluj = kde.length ? `Na stránce ${kde.join(', ')} zkontroluj: ${html(zkrat(text))}` : html(zkrat(text));
  return { cislo: p.cislo, pr: true, titulek: p.titulek, radky: [zkontroluj, ...(cesty.length && !nahled ? ['Náhled zatím není, stránky uvidíš až po sloučení.'] : [])] };
}

/** Rozdělí vstupy do skupin; vrací jen neprázdné skupiny v pořadí SKUPINY. */
export function sestavSkupiny({ prs = [], issues = [], ucty, dnes, ted }) {
  const s = Object.fromEntries(SKUPINY.map((g) => [g.klic, []]));
  for (const p of prs) {
    if (p.stitky.includes('potrebuje-cloveka')) s.clovek.push({ cislo: p.cislo, pr: true, titulek: p.titulek, radky: [] });
    if (p.souhlas) s.souhlas.push(polozkaPr(p, { nahled: p.nahled }));
  }
  for (const i of issues) {
    const st = new Set(i.stitky);
    if (st.has('stop') || st.has('zamitnuto') || st.has('trvale')) continue;
    const zaklad = { cislo: i.cislo, pr: false, titulek: i.titulek };
    if (st.has('otazka')) {
      s.otazka.push({ ...zaklad, radky: [html(zkrat(jedenOdstavec(textOtazky(i.komentare || [], ucty)) || 'Text otázky je v issue.', 400))] });
      continue;
    }
    if (st.has('oponentura')) {
      if (ted - Date.parse(i.oponenturaOd || i.upraveno) >= UVIZLA_PO) s.uvizla.push({ ...zaklad, radky: [] });
      continue;
    }
    if (st.has('navrh') && !st.has('schvaleno')) {
      const hotova = (i.komentare || []).some((k) => /^## Oponentura\s*$/m.test(k.telo || ''));
      s[hotova ? 'oponentura' : 'navrh'].push({ ...zaklad, radky: [html(uvodIssue(i.telo))].filter(Boolean) });
      continue;
    }
    // Hlášení od veřejnosti bez rozhodnutí, i hlášení škol z portálu: bez schvaleno je nerealizuje nikdo, dokud PR #464 nepustí opravy údajů škol.
    if (STITKY_VEREJNYCH.some((h) => st.has(h)) && !st.has('schvaleno')) {
      s.hlaseni.push({ ...zaklad, radky: [] });
      continue;
    }
    if (st.has('pripominka')) {
      const t = terminPripominky(i.telo);
      if (t && t <= dnes) s.pripominka.push({ ...zaklad, radky: [`Termín ${html(t)}. ${html(uvodIssue(i.telo))}`] });
    }
  }
  return SKUPINY.filter((g) => s[g.klic].length).map((g) => ({ ...g, polozky: s[g.klic] }));
}

/** Zpráva v HTML Telegramu a tlačítka s odkazy (inline_keyboard, dvě na řádek). */
export function zprava(skupiny) {
  const celkem = skupiny.reduce((n, g) => n + g.polozky.length, 0);
  const casti = [`<b>Čeká na tebe: ${celkem}</b>`];
  const tlacitka = [];
  for (const g of skupiny) {
    const radky = [`<b>${g.nadpis} (${g.polozky.length})</b>`];
    for (const p of g.polozky.slice(0, MAX_V_SKUPINE)) {
      radky.push(`• <a href="${adresa(p.cislo, p.pr)}">#${p.cislo}</a> ${html(zkrat(p.titulek, 90))}`);
      for (const r of p.radky) radky.push(`   ${r}`);
      if (tlacitka.length < MAX_TLACITEK) tlacitka.push({ text: `#${p.cislo} ${g.tlacitko}`, url: adresa(p.cislo, p.pr) });
    }
    if (g.polozky.length > MAX_V_SKUPINE) radky.push(`   …a dalších ${g.polozky.length - MAX_V_SKUPINE}`);
    radky.push(`<i>${g.akce}</i>`);
    casti.push(radky.join('\n'));
  }
  let text = casti.join('\n\n');
  if (text.length > MAX_DELKA) {
    // Zkrácení podle celých skupin, aby se nerozbily značky HTML.
    const kratke = [casti[0]];
    for (const c of casti.slice(1)) if ([...kratke, c].join('\n\n').length < MAX_DELKA - 80) kratke.push(c);
    text = `${kratke.join('\n\n')}\n\n…další skupiny se nevešly, celý seznam je na tabuli projektu.`;
  }
  const radkyTlacitek = [];
  for (let i = 0; i < tlacitka.length; i += 2) radkyTlacitek.push(tlacitka.slice(i, i + 2));
  return { text, tlacitka: radkyTlacitek };
}

async function posliTelegram({ text, tlacitka }) {
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  const odp = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true,
      ...(tlacitka.length ? { reply_markup: { inline_keyboard: tlacitka } } : {}),
    }),
  });
  if (!odp.ok) throw new Error(`Telegram: ${odp.status} ${(await odp.text()).slice(0, 200)}`);
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const ted = Date.now();
  const dnes = new Date(ted).toISOString().slice(0, 10);
  const yaml = (await import('js-yaml')).default;
  const rezimy = yaml.load(Buffer.from((await api(`repos/${REPO}/contents/.github/rezimy.yml?ref=main`)).content, 'base64').toString('utf8'));
  const ucty = { vlastnik: rezimy.vlastnik, asistent: rezimy.asistent };
  const komentare = async (cislo) => (await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100`)).map((k) => ({ autor: k.user?.login, telo: k.body || '' }));

  const prs = [];
  for (const p of await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`)) {
    if (p.draft) continue;
    const d = await api(`repos/${REPO}/commits/${p.head.sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
    const kontrola = (d.check_runs || []).filter((k) => k.app?.slug === 'github-actions').sort((a, b) => b.id - a.id)[0];
    const souhlas = potrebujeSouhlas(kontrola);
    const nahled = souhlas ? adresaNahledu(await api(`repos/${REPO}/commits/${p.head.sha}/statuses?per_page=100`)) : null;
    prs.push({ cislo: p.number, titulek: p.title, telo: p.body || '', stitky: p.labels.map((l) => l.name), souhlas, nahled });
  }

  const issues = new Map();
  for (const stitek of ['otazka', 'oponentura', 'navrh', 'pripominka', ...STITKY_VEREJNYCH]) {
    for (const i of await api(`repos/${REPO}/issues?state=open&labels=${stitek}&per_page=100`)) {
      if (i.pull_request || issues.has(i.number)) continue;
      const stitky = i.labels.map((l) => l.name);
      const zaznam = { cislo: i.number, titulek: i.title, telo: i.body || '', stitky, upraveno: i.updated_at };
      if (stitky.includes('otazka') || stitky.includes('navrh')) zaznam.komentare = await komentare(i.number);
      if (stitky.includes('oponentura')) {
        const udalosti = await api(`repos/${REPO}/issues/${i.number}/events?per_page=100`);
        zaznam.oponenturaOd = udalosti.filter((u) => u.event === 'labeled' && u.label?.name === 'oponentura').map((u) => u.created_at).sort().pop();
      }
      issues.set(i.number, zaznam);
    }
  }

  const skupiny = sestavSkupiny({ prs, issues: [...issues.values()], ucty, dnes, ted });
  if (!skupiny.length) return console.log('Nic nečeká na vlastníka, zprávu neposílám.');
  const z = zprava(skupiny);
  console.log(z.text);
  console.log(JSON.stringify(z.tlacitka));
  if (nanecisto) return;
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return console.log('Telegram není nastavený, zprávu neposílám.');
  await posliTelegram(z);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
