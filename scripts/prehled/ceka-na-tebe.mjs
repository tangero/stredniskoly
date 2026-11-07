// Denní zpráva „Čeká na tebe“ (#440): všechno, co čeká na rozhodnutí vlastníka, v jedné zprávě do Telegramu,
// seskupené podle druhu. U každé položky lidská věta, co a kde zkontrolovat (oddíl „Pro vlastníka“ z popisu PR,
// otázka z issue, první odstavec návrhu), a tlačítko na PR nebo issue, kam přidat `schvaleno` nebo odpovědět.
// Ranní zpráva (#562) řadí podle stáří: nahoře „Čeká přes 3 dny“ od nejstarší, pak „Nové od minulé zprávy“, zbytek jen počty.
// Večerní zpráva (--vecer) obsahuje jen nové od ranní. Prázdná zpráva se neposílá. Spouští ho workflow ceka-na-tebe.yml
// (Plánovač, #461). Bez modelu, jen čte.
//
//   node scripts/prehled/ceka-na-tebe.mjs [--vecer] [--nanecisto] [--k-doporuceni]   --nanecisto jen vypíše (mimo Actions přes gh),
//   --k-doporuceni vypíše hlášení a návrhy starší 7 dní bez aktuálního `Doporučení:` (pro rutinu, nic neposílá)

import { pathToFileURL } from 'node:url';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';
import { adresaNahledu } from '../brana/overeni-nahledu.mjs';
import { cestyNaWebu, textProVlastnika } from '../brana/oznameni-nasazeni.mjs';
import { textOtazky } from '../brana/otazka.mjs';

const HODINA = 60 * 60 * 1000;
const DEN = 24 * HODINA;
/** Položka starší než tato doba se ve zprávě ukáže nahoře jako „Čeká přes 3 dny“. */
export const STARE_PO = 3 * DEN;
/** Hlášení a návrh starší než tato doba dostane od AI komentář `Doporučení: …` (#562, bod 3). */
export const DOPORUCENI_PO = 7 * DEN;
export const MAX_STARYCH = 8;
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
/** Seznam otevřených issues se štítky, podle kterých čekají na vlastníka (do pohledu „Moje“ na tabuli, K1). */
export const ODKAZ_CEKAJICICH = `https://github.com/${REPO}/issues?q=${encodeURIComponent(`is:issue is:open label:${['otazka', 'oponentura', 'navrh', 'pripominka', ...STITKY_VEREJNYCH].join(',')}`)}`;
const adresa = (cislo, pr = false) => `https://github.com/${REPO}/${pr ? 'pull' : 'issues'}/${cislo}`;

/** Skupiny v pořadí, ve kterém je vlastník má vyřizovat. `akce` je pokyn pod položkou, `tlacitko` popisek tlačítka. */
export const SKUPINY = [
  { klic: 'souhlas', nadpis: '✅ Ke schválení', akce: 'Když sedí, přidej na PR štítek <code>schvaleno</code>.', tlacitko: 'schválit' },
  { klic: 'rozpracovane', nadpis: '🚧 Rozpracované (souhlas zatím ne)', akce: 'Brána chce ještě něco jiného než souhlas (review, testy). Souhlas přidej, až PR přejde do „Ke schválení“.', tlacitko: null },
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

/** Komentář napsala AI nebo automatika: má patičku Claude Code, nebo účet bota. */
export const jeAI = (k = {}) => /Generated by \[Claude Code\]/.test(k.telo || '') || /\[bot\]$/.test(k.autor || '');

/**
 * Doporučení pro položku (#562, bod 3): poslední komentář AI, jehož první řádek je `Doporučení: opravit | zavřít | duplicita | potřebuje tvůj úsudek`.
 * Vrací { text, zastarale } nebo null. `zastarale` je true, když po něm přibyl komentář někoho jiného než AI
 * (pak se píše nové); doporučení se jinak píše jednou.
 */
export function doporuceni(komentare = []) {
  const idx = komentare.map((k, n) => (jeAI(k) && /^\s*Doporučení:/.test(k.telo || '') ? n : -1)).filter((n) => n >= 0).pop();
  if (idx === undefined) return null;
  const text = jedenOdstavec(komentare[idx].telo.replace(/\n\s*---[\s\S]*$/, '')).replace(/^Doporučení:\s*/, '');
  return { text, zastarale: komentare.slice(idx + 1).some((k) => !jeAI(k)) };
}

/** Termín připomínky z těla issue (RRRR-MM-DD), nebo null. */
export const terminPripominky = (telo = '') => (telo.match(/Termín:?\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;

const SOUHLAS = /chybí souhlas vlastníka|potřebuje schvaleno|souhlas na issue #\d+ neplatí/;
const duvodyKontroly = (kontrola) => (kontrola?.output?.summary || '').split('\n').filter((r) => r.startsWith('- '));

/** Brána v poslední kontrole zmiňuje chybějící souhlas vlastníka (možná vedle dalších důvodů). */
export function zminujeSouhlas(kontrola) {
  return kontrola?.conclusion === 'failure' && SOUHLAS.test(kontrola.output?.summary || '');
}

/** PR je ke schválení jen tehdy, když je jediným důvodem neúspěchu brány chybějící souhlas vlastníka (#560). */
export function potrebujeSouhlas(kontrola) {
  if (!zminujeSouhlas(kontrola)) return false;
  const duvody = duvodyKontroly(kontrola);
  return duvody.length > 0 && duvody.every((d) => SOUHLAS.test(d));
}

/** Brána chce souhlas, ale i něco dalšího: PR je rozpracovaný a o souhlas se zatím nežádá. */
export const rozpracovanyBezSouhlasu = (kontrola) => zminujeSouhlas(kontrola) && !potrebujeSouhlas(kontrola);

/**
 * Čas první kontroly brány z nepřerušené řady posledních kontrol, které chtěly jen souhlas (ms), nebo null.
 * `kontroly` jsou poslední kontroly jednotlivých commitů PR od nejnovějšího; řadu přeruší kontrola bez žádosti o souhlas.
 */
export function souhlasOd(kontroly = []) {
  let od = null;
  for (const k of kontroly) {
    if (!potrebujeSouhlas(k)) break;
    od = Date.parse(k.completed_at || k.started_at) || od;
  }
  return od;
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
    const odPr = Date.parse(p.od || p.upraveno) || ted;
    if (p.stitky.includes('potrebuje-cloveka')) s.clovek.push({ cislo: p.cislo, pr: true, titulek: p.titulek, radky: [], od: odPr });
    // Ke schválení od první kontroly brány, která chtěla jen souhlas, ne od otevření PR (#562).
    if (p.souhlas) s.souhlas.push({ ...polozkaPr(p, { nahled: p.nahled }), od: p.souhlasOd || odPr });
    else if (p.rozpracovany) s.rozpracovane.push({ cislo: p.cislo, pr: true, titulek: p.titulek, radky: [], od: odPr });
  }
  for (const i of issues) {
    const st = new Set(i.stitky);
    if (st.has('stop') || st.has('zamitnuto') || st.has('trvale')) continue;
    // Stáří = od přidání štítku, podle kterého položka do skupiny patří; jinak od založení issue (#562).
    const odDne = (stitek) => Date.parse(i.stitkyOd?.[stitek] || i.vytvoreno || i.upraveno) || ted;
    const zaklad = { cislo: i.cislo, pr: false, titulek: i.titulek, od: odDne(st.has('otazka') ? 'otazka' : st.has('oponentura') ? 'oponentura' : 'navrh') };
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
      const dop = doporuceni(i.komentare);
      const radky = dop && !dop.zastarale ? [`Doporučení: ${html(zkrat(dop.text))}`] : [html(uvodIssue(i.telo))].filter(Boolean);
      s[hotova ? 'oponentura' : 'navrh'].push({ ...zaklad, radky, ...(hotova ? {} : { kDoporuceni: ted - zaklad.od > DOPORUCENI_PO && (!dop || dop.zastarale) }) });
      continue;
    }
    // Hlášení od veřejnosti bez rozhodnutí, i hlášení škol z portálu: bez schvaleno je nerealizuje nikdo, dokud PR #464 nepustí opravy údajů škol.
    if (STITKY_VEREJNYCH.some((h) => st.has(h)) && !st.has('schvaleno')) {
      // Do skupiny vstoupilo přidáním štítku hlášení, stáří (od) zůstává od založení.
      // Rozhoduje nejstarší čas z právě přítomných veřejných štítků: dodatečný štítek už zařazené hlášení neomladí.
      const casyH = STITKY_VEREJNYCH.filter((t) => st.has(t)).map((t) => Date.parse(i.stitkyOd?.[t])).filter(Boolean);
      const dop = doporuceni(i.komentare);
      s.hlaseni.push({
        ...zaklad, ...(casyH.length ? { vstup: Math.min(...casyH) } : {}),
        radky: dop && !dop.zastarale ? [`Doporučení: ${html(zkrat(dop.text))}`] : [],
        kDoporuceni: ted - zaklad.od > DOPORUCENI_PO && (!dop || dop.zastarale),
      });
      continue;
    }
    if (st.has('pripominka')) {
      const t = terminPripominky(i.telo);
      // Do skupiny vstoupila později z dvou časů: přidání štítku a termín (stáří zůstává od založení).
      const vstupP = Math.max(Date.parse(i.stitkyOd?.pripominka) || 0, Date.parse(t) || 0);
      if (t && t <= dnes) s.pripominka.push({ ...zaklad, ...(vstupP ? { vstup: vstupP } : {}), radky: [`Termín ${html(t)}. ${html(uvodIssue(i.telo))}`] });
    }
  }
  return SKUPINY.filter((g) => s[g.klic].length).map((g) => ({ ...g, polozky: s[g.klic] }));
}

/**
 * Zpráva v HTML Telegramu a tlačítka s odkazy (inline_keyboard, dvě na řádek). Ranní: „Čeká přes 3 dny“ od nejstarší,
 * „Nové od minulé zprávy“, ostatní jen počty. Večerní (`vecer`): jen nové. `posledni` je čas minulé zprávy (ms).
 * Vrací null, když není co poslat.
 */
export function zprava(skupiny, { ted = Date.now(), vecer = false, posledni = ted - DEN } = {}) {
  const vse = skupiny.flatMap((g) => g.polozky.map((p) => ({ ...p, g })));
  // Novost = kdy položka vstoupila do skupiny (`vstup`); bez něj je to totéž co stáří (`od`).
  const vstup = (p) => p.vstup ?? p.od;
  const dny = (p) => Math.floor((ted - p.od) / DEN);
  // Položka, která do skupiny vstoupila po minulé zprávě, je nová i když je její stáří velké (K1).
  const stare = vse.filter((p) => ted - p.od > STARE_PO && vstup(p) < posledni).sort((a, b) => a.od - b.od);
  const nove = vse.filter((p) => vstup(p) >= posledni).sort((a, b) => vstup(a) - vstup(b));
  if (!(vecer ? nove : vse).length) return null;
  const tlacitka = [];
  const radek = (p, stari) => {
    const r = [`• <a href="${adresa(p.cislo, p.pr)}">#${p.cislo}</a> ${html(zkrat(p.titulek, 90))} <i>(${[p.g.tlacitko, stari ? `${dny(p)} dní` : null].filter(Boolean).join(', ')})</i>`];
    for (const t of p.radky) r.push(`   ${t}`);
    if (p.g.tlacitko && tlacitka.length < MAX_TLACITEK) tlacitka.push({ text: `#${p.cislo} ${p.g.tlacitko}`, url: adresa(p.cislo, p.pr) });
    return r.join('\n');
  };
  const oddil = (nadpis, polozky, max, stari) => [`<b>${nadpis} (${polozky.length})</b>`, ...polozky.slice(0, max).map((p) => radek(p, stari)),
    ...(polozky.length > max ? [`   …a dalších ${polozky.length - max}`] : [])].join('\n');
  const casti = [`<b>${vecer ? 'Večer na tebe' : 'Čeká na tebe'}: ${vecer ? nove.length : vse.length}</b>`];
  if (!vecer && stare.length) casti.push(oddil('⏰ Čeká přes 3 dny', stare, MAX_STARYCH, true));
  if (nove.length) casti.push(oddil(vecer ? '🆕 Nové od ranní zprávy' : '🆕 Nové od minulé zprávy', nove, MAX_V_SKUPINE, false));
  // Pokyn, co udělat, jednou za skupinu, která má ve zprávě zobrazenou položku (#562, omezení P4).
  const zobrazene = new Set([...(vecer ? [] : stare.slice(0, MAX_STARYCH)), ...nove.slice(0, MAX_V_SKUPINE)].map((p) => p.g));
  const pokyny = skupiny.filter((g) => zobrazene.has(g));
  if (pokyny.length) casti.push(`<b>Co udělat</b>\n${pokyny.map((g) => `${g.nadpis}: ${g.akce}`).join('\n')}`);
  if (!vecer) {
    const zbytek = vse.filter((p) => !stare.includes(p) && !nove.includes(p));
    const pocty = skupiny.map((g) => [g.nadpis, zbytek.filter((p) => p.g === g).length]).filter(([, n]) => n);
    if (pocty.length) casti.push(`<b>Ostatní</b>\n${pocty.map(([n, c]) => `${n}: ${c}`).join('\n')}\n<a href="${ODKAZ_CEKAJICICH}">seznam čekajících issues</a>`);
  }
  let text = casti.join('\n\n');
  if (text.length > MAX_DELKA) {
    // Zkrácení podle celých částí, aby se nerozbily značky HTML.
    const kratke = [casti[0]];
    for (const c of casti.slice(1)) if ([...kratke, c].join('\n\n').length < MAX_DELKA - 80) kratke.push(c);
    text = `${kratke.join('\n\n')}\n\n…další části se nevešly, celý seznam je na tabuli projektu.`;
  }
  const radkyTlacitek = [];
  for (let i = 0; i < tlacitka.length; i += 2) radkyTlacitek.push(tlacitka.slice(i, i + 2));
  return { text, tlacitka: radkyTlacitek };
}

/**
 * Čas minulé zprávy z pevných časů Plánovače (ranní 06:52 UTC, večerní 18:30 UTC). Čtení historie běhů workflow by
 * potřebovalo `actions: read` (omezení P3), proto se nečte. Večer: poslední ranní čas, ráno: poslední večerní.
 */
export function minulaZprava(ted, vecer) {
  const [h, m] = vecer ? [6, 52] : [18, 30];
  const d = new Date(ted);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
  if (t > ted) t -= DEN;
  return t;
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
  const kDoporuceni = process.argv.includes('--k-doporuceni');
  const vecer = process.argv.includes('--vecer');
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
    const posledniKontrola = (dd) => (dd.check_runs || []).filter((k) => k.app?.slug === 'github-actions').sort((a, b) => b.id - a.id)[0];
    const kontrola = posledniKontrola(d);
    const souhlas = potrebujeSouhlas(kontrola);
    let souhlasOdMs = null;
    if (souhlas) {
      // Historie kontrol: commity PR od nejnovějšího, dokud brána chtěla jen souhlas.
      const commity = (await api(`repos/${REPO}/pulls/${p.number}/commits?per_page=100`)).map((c) => c.sha).reverse();
      const kontroly = [kontrola];
      for (const sha of commity.filter((x) => x !== p.head.sha)) {
        const k = posledniKontrola(await api(`repos/${REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`));
        kontroly.push(k);
        if (!potrebujeSouhlas(k)) break;
      }
      souhlasOdMs = souhlasOd(kontroly);
    }
    const nahled = souhlas ? adresaNahledu(await api(`repos/${REPO}/commits/${p.head.sha}/statuses?per_page=100`)) : null;
    prs.push({ cislo: p.number, titulek: p.title, telo: p.body || '', stitky: p.labels.map((l) => l.name), souhlas, rozpracovany: rozpracovanyBezSouhlasu(kontrola), nahled, od: p.created_at, souhlasOd: souhlasOdMs, upraveno: p.updated_at });
  }

  const issues = new Map();
  for (const stitek of ['otazka', 'oponentura', 'navrh', 'pripominka', ...STITKY_VEREJNYCH]) {
    for (const i of await api(`repos/${REPO}/issues?state=open&labels=${stitek}&per_page=100`)) {
      if (i.pull_request || issues.has(i.number)) continue;
      const stitky = i.labels.map((l) => l.name);
      const zaznam = { cislo: i.number, titulek: i.title, telo: i.body || '', stitky, upraveno: i.updated_at, vytvoreno: i.created_at };
      if (stitky.includes('otazka') || stitky.includes('navrh') || STITKY_VEREJNYCH.some((t) => stitky.includes(t))) zaznam.komentare = await komentare(i.number);
      // Čas přidání štítků, podle kterých položka patří do skupiny (stáří, #562).
      if (['otazka', 'oponentura', 'navrh', 'pripominka', ...STITKY_VEREJNYCH].some((t) => stitky.includes(t))) {
        const udalosti = await api(`repos/${REPO}/issues/${i.number}/events?per_page=100`);
        const kdy = (t) => udalosti.filter((u) => u.event === 'labeled' && u.label?.name === t).map((u) => u.created_at).sort().pop();
        zaznam.stitkyOd = Object.fromEntries(['otazka', 'oponentura', 'navrh', 'pripominka', ...STITKY_VEREJNYCH].map((t) => [t, kdy(t)]).filter(([, c]) => c));
        zaznam.oponenturaOd = zaznam.stitkyOd.oponentura;
      }
      issues.set(i.number, zaznam);
    }
  }

  const skupiny = sestavSkupiny({ prs, issues: [...issues.values()], ucty, dnes, ted });
  if (kDoporuceni) {
    // Pro rutinu (skill trideni-issues): položky, které čekají přes 7 dní a nemají aktuální doporučení. Nic nezapisuje ani neposílá.
    const cekaji = skupiny.flatMap((g) => g.polozky.filter((p) => p.kDoporuceni).map((p) => `#${p.cislo} ${p.titulek}`));
    return console.log(cekaji.length ? cekaji.join('\n') : 'Žádná položka nepotřebuje doporučení.');
  }
  // Čas minulé zprávy z pevných časů Plánovače (ranní 06:52 UTC, večerní 18:30 UTC), viz minulaZprava.
  const z = zprava(skupiny, { ted, vecer, posledni: minulaZprava(ted, vecer) });
  if (!z) return console.log(vecer ? 'Nic nového od ranní zprávy, neposílám.' : 'Nic nečeká na vlastníka, zprávu neposílám.');
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
