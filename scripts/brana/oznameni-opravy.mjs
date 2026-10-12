// Oznámení oznamovateli chyby, že oprava je nasazená (#441). Po nasazení main projde PR sloučené za poslední 3 dny,
// u každého, který uzavřel issue ze štítku `bug-report`, najde v Neonu hlášení s tímto číslem issue a pošle
// oznamovateli jeden e-mail (co se opravilo a kde to uvidí). Adresa se po odeslání v databázi nahradí zástupným
// textem; hlášení starší než 90 dní bez odeslání se anonymizují stejně. Adresa nikdy nejde do issue, komentářů
// ani výpisu workflow. Hlášení zavřené jinak než opravou PR (duplicita, nejde o chybu) nespustí nic.
//
//   node scripts/brana/oznameni-opravy.mjs [--nanecisto]
//
// Prostředí: HLASENI_DATABASE_URL, RESEND_API_KEY, GITHUB_TOKEN, PRODUKCE_SHA.

import { pathToFileURL } from 'node:url';
import { BOT } from './brana.mjs';
import { REPO, vytvorApi } from './data.mjs';
import { OKNO, cestyNaWebu, textProVlastnika } from './oznameni-nasazeni.mjs';

export const OD = Date.parse('2026-10-12T00:00:00Z');
export const ZASTUPNY_TEXT = 'smazáno po vyřízení';
export const LHUTA_DNI = 90;
export const ZNACKA = (issue) => `<!-- oznameni-opravy issue=${issue} -->`;
const OBECNA_VETA = 'Chybu, kterou jste nám nahlásili, jsme opravili.';

/** Čísla issue, která PR uzavírá (Closes/Fixes/Resolves #N), bez duplicit. */
export function uzavreneIssue(telo = '') {
  const cisla = [...telo.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]));
  return [...new Set(cisla)];
}

/**
 * Věta o opravě pro oznamovatele: oddíl „Pro vlastníka“ bez vět, které oslovují vlastníka (ověřování, kontrola).
 * Když nezbude nic, obecná věta.
 */
export function vetaOOprave(telo = '') {
  const vety = textProVlastnika(telo)
    .split(/(?<=[.!?])\s+/)
    .filter((v) => v && !/^(ověř|zkontroluj|podívej|ověříš|uvidíš)/i.test(v) && !/https?:\/\/|\/api\//i.test(v));
  const text = vety.join(' ').trim();
  return text || OBECNA_VETA;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function obsahEmailu({ veta, adresa }) {
  const text = `Dobrý den,\n\nchyba, kterou jste nám nahlásili, je opravená a oprava je na webu. ${veta}${adresa ? `\n\nOpravu uvidíte tady: ${adresa}` : ''}\n\nDěkujeme, že jste nám dali vědět.\nPřijímačky na školu`;
  const html = `<p>Dobrý den,</p><p>chyba, kterou jste nám nahlásili, je opravená a oprava je na webu. ${esc(veta)}</p>${adresa ? `<p>Opravu uvidíte tady: <a href="${esc(adresa)}">${esc(adresa)}</a></p>` : ''}<p>Děkujeme, že jste nám dali vědět.<br>Přijímačky na školu</p>`;
  return { predmet: 'Chyba, kterou jste nahlásili, je opravená', text, html };
}

/**
 * Pošle oznámení k jednomu issue. `s.dotaz` je databáze, `posli(para)` odeslání (vrací true při úspěchu).
 * Vrací `{ odeslano, selhalo }`; hlášení k jednomu issue může být víc, každé dostane svůj e-mail.
 */
export async function oznamIssue(s, issue, { veta, adresa, posli, nanecisto = false }) {
  const r = await s.dotaz(
    `select id, email from hlaseni_chyby where issue = $1 and oznameno is null and email <> $2 and email like '%@%'`,
    [issue, ZASTUPNY_TEXT],
  );
  let odeslano = 0;
  let selhalo = 0;
  for (const h of r.rows) {
    if (nanecisto) { odeslano += 1; continue; }
    const { predmet, text, html } = obsahEmailu({ veta, adresa });
    const ok = await posli({ to: h.email, subject: predmet, text, html, klic: `hlaseni-oprava-${h.id}` });
    if (!ok) { selhalo += 1; continue; }
    await s.dotaz(`update hlaseni_chyby set oznameno = now(), email = $2 where id = $1`, [h.id, ZASTUPNY_TEXT]);
    odeslano += 1;
  }
  return { odeslano, selhalo };
}

/** Anonymizuje adresy hlášení starších než 90 dní, která se neoznamovala. Vrací počet řádků. */
export async function uklid(s) {
  const r = await s.dotaz(
    `update hlaseni_chyby set email = $1 where email <> $1 and oznameno is null and vytvoreno < now() - ($2 || ' days')::interval`,
    [ZASTUPNY_TEXT, String(LHUTA_DNI)],
  );
  return r.rowCount;
}

/** Odeslání přes Resend; chyba nese jen stavový kód, ne tělo odpovědi (mohlo by nést adresu). */
export function posliResend(apiKey, fetchFn = globalThis.fetch) {
  return async ({ to, subject, text, html, klic }) => {
    const odp = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': klic },
      body: JSON.stringify({
        from: 'Přijímačky na školu <noreply@prijimackynaskolu.cz>', to, reply_to: 'eda@prijimackynaskolu.cz', subject, html, text,
      }),
    });
    if (!odp.ok) console.error(`Resend: ${odp.status}`);
    return odp.ok;
  };
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const { HLASENI_DATABASE_URL: dbUrl, RESEND_API_KEY: klic } = process.env;
  if (!dbUrl || (!klic && !nanecisto)) return console.log('Databáze hlášení nebo Resend není nastavený, e-maily neposílám.');
  const api = vytvorApi();
  const zakladni = process.env.PRODUKCE_URL || 'https://www.prijimackynaskolu.cz';
  const hlava = (await api(`repos/${REPO}/commits/main`)).sha;
  const sha = process.env.PRODUKCE_SHA || hlava;
  if (sha !== hlava) return console.log(`Produkce je na ${sha.slice(0, 7)}, main na ${hlava.slice(0, 7)}: oznámení počká na další nasazení.`);

  const { Pool } = await import('@neondatabase/serverless');
  const pool = new Pool({ connectionString: dbUrl });
  const s = { dotaz: async (sql, hodnoty = []) => { const r = await pool.query(sql, hodnoty); return { rows: r.rows, rowCount: r.rowCount }; } };
  const posli = nanecisto ? null : posliResend(klic);
  try {
    const ted = Date.now();
    const zavrene = await api(`repos/${REPO}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`);
    let celkem = 0;
    for (const p of zavrene) {
      if (!p.merged_at || Date.parse(p.merged_at) < OD || ted - Date.parse(p.merged_at) > OKNO) continue;
      const srovnani = await api(`repos/${REPO}/compare/${p.merge_commit_sha}...${sha}`).catch(() => null);
      if (!srovnani || !['ahead', 'identical'].includes(srovnani.status)) continue;
      for (const cislo of uzavreneIssue(p.body || '')) {
        const issue = await api(`repos/${REPO}/issues/${cislo}`);
        if (issue.state !== 'closed' || !issue.labels.some((l) => (l.name ?? l) === 'bug-report')) continue;
        const komentare = await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100`);
        if (komentare.some((k) => k.user?.login === BOT && (k.body || '').includes(ZNACKA(cislo)))) continue;
        const cesta = cestyNaWebu(p.body || '')[0];
        const { odeslano, selhalo } = await oznamIssue(s, cislo, {
          veta: vetaOOprave(p.body || ''), adresa: cesta ? `${zakladni}${cesta}` : '', posli, nanecisto,
        });
        celkem += odeslano;
        // Komentář bez adresy a bez počtu příjemců: jen značka, že se issue už vyřídilo.
        // Při selhání odeslání značka chybí, další běh to zkusí znovu.
        if (!nanecisto && !selhalo) {
          await api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body:
            `Oznamovatel byl o opravě informován (pokud zadal platný e-mail).\n\n${ZNACKA(cislo)}\n\n— workflow Ověření v produkci (#441)` } });
        }
      }
    }
    const anonymizovano = nanecisto ? 0 : await uklid(s);
    console.log(`Oznámení o opravě: odesláno ${celkem}, anonymizováno po ${LHUTA_DNI} dnech ${anonymizovano}.`);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    // Výjimka z databáze nebo Resendu může nést hodnotu sloupce, tedy adresu: vypíše se jen název chyby.
    console.error(`Oznámení o opravě selhalo: ${e?.name ?? 'Error'}`);
    process.exit(1);
  });
}
