// ============================================================================
// Upozornění zadavateli na Telegram o dění v portálu (docs/ucty-portalu-skol-2027.md, oddíl 4).
//
// Best-effort: bez TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID jen zaloguje, selhání
// nikdy nehází výjimku a nesmí shodit akci školy. Tokeny ani kódy se do zprávy
// nepíšou; e-mail editora ano, zpráva jde jen zadavateli.
// ============================================================================

export async function posliTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log(`📨 Telegram není nastaven, zpráva: ${text.split('\n')[0]}`);
    return false;
  }
  try {
    const odpoved = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!odpoved.ok) console.error(`❌ Telegram: ${odpoved.status}`);
    return odpoved.ok;
  } catch (chyba) {
    console.error('❌ Telegram neodpověděl:', chyba instanceof Error ? chyba.message : chyba);
    return false;
  }
}

/** Doména e-mailu a domény školy z rejstříku (e-mail, web) pro varování v oddílu 2.5. */
export function domenaEmailu(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function domenaWebu(www: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(www) ? www : `https://${www}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Freemailové domény: shoda na nich nic nedokazuje (53 rejstříkových adres je na nich). */
const FREEMAIL = new Set([
  'seznam.cz', 'email.cz', 'post.cz', 'centrum.cz', 'atlas.cz', 'volny.cz', 'tiscali.cz',
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'pm.me',
]);

/**
 * Sedí doména e-mailu editora se školou? Porovnává se i poddoména
 * (jana@mail.gyms.cz proti gyms.cz). Freemail nikdy nesedí.
 */
export function domenaSediSeSkolou(email: string, rejstrikoveEmaily: string[], www: string | null): boolean {
  const domena = domenaEmailu(email);
  if (!domena || FREEMAIL.has(domena)) return false;
  const skolni = new Set<string>(rejstrikoveEmaily.map(domenaEmailu).filter(Boolean));
  if (www) skolni.add(domenaWebu(www));
  for (const d of skolni) {
    if (!d) continue;
    if (domena === d || domena.endsWith(`.${d}`)) return true;
  }
  return false;
}
