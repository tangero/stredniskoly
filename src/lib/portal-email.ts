// ============================================================================
// E-maily Portálu pro školy přes Resend (vzor: src/app/api/bug-report/route.ts).
// Obě funkce jsou best-effort: nikdy nehází výjimku, vrací true/false.
// Bez RESEND_API_KEY jen zalogují a vrátí false.
// ============================================================================

const ODESILATEL = 'Přijímačky na školu <noreply@prijimackynaskolu.cz>';
// Odpovědi škol míří na podporu (Eduarda, AI asistentka), ne do noreply.
export const PODPORA_EMAIL = 'eda@prijimackynaskolu.cz';

/** Textová verze vedle HTML: e-mail jen v HTML hodnotí spamové filtry hůř. */
export function htmlNaText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2: $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*(\n\s*)+/g, '\n\n')
    .trim();
}

/** Uvozuje text vložený do HTML e-mailu (jména a názvy škol od uživatelů). */
export function esc(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function odesliEmail(para: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`📧 E-mail by šel na adresu příjemce (RESEND_API_KEY není nastaven) – předmět: ${para.subject}`);
    return false;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ODESILATEL,
        to: para.to,
        reply_to: PODPORA_EMAIL,
        subject: para.subject,
        html: para.html,
        text: htmlNaText(para.html),
      }),
    });
    if (!response.ok) {
      console.error(`❌ Resend error: ${response.status} - ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Chyba odeslání e-mailu:', error);
    return false;
  }
}

const OBALKA = (obsah: string) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      ${obsah}
      <p style="color: #818c99; font-size: 13px; margin-top: 32px;">
        Tento e-mail byl odeslán automaticky. Na odpověď reaguje Eduarda, AI asistentka podpory;
        změny účtů a sporné věci řeší Patrick Zandl (patrick@zandl.cz).<br>
        <a href="https://www.prijimackynaskolu.cz" style="color: #0074e4;">prijimackynaskolu.cz</a>
      </p>
    </div>
  </body>
  </html>`;

/** Magic link pro úpravu profilu školy (§2.2 návrhu). */
export async function posliMagicLinkEmail(para: {
  email: string;
  nazevSkoly: string;
  odkaz: string;
}): Promise<boolean> {
  return odesliEmail({
    to: para.email,
    subject: 'Odkaz pro úpravu profilu školy',
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>pro úpravu profilu školy <strong>${esc(para.nazevSkoly)}</strong> na webu Přijímačky na střední školy použijte tento odkaz:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${para.odkaz}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Upravit profil školy</a>
      </p>
      <p>Odkaz platí <strong>72 hodin</strong> a vede k úpravě profilu vaší školy. Pokud jste o něj nežádali, e-mail prosím ignorujte.</p>
    `),
  });
}

/** Potvrzení přijetí změn po odeslání formuláře. Selhání nesmí shodit odeslání. */
export async function posliPotvrzovaciEmail(para: {
  email: string;
  nazevSkoly: string;
  skolaUrl: string;
}): Promise<boolean> {
  return odesliEmail({
    to: para.email,
    subject: '✅ Změny profilu školy jsou na webu',
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>úpravy profilu školy <strong>${esc(para.nazevSkoly)}</strong> jsme zapsali. Na stránce školy se objeví se značkou „potvrdila škola“, obvykle do hodiny:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${para.skolaUrl}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Stránka vaší školy</a>
      </p>
      <p>Na schválení nic nečeká. Když v údajích najdeme chybu, opravíme ji a napíšeme vám na tento e-mail. Opravit je můžete i sami kdykoli znovu v profilu školy.</p>
    `),
  });
}

const TLACITKO = (odkaz: string, text: string) => `
      <p style="text-align: center; margin: 24px 0;">
        <a href="${odkaz}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">${text}</a>
      </p>`;

export interface OdkazSkoly {
  nazevSkoly: string;
  odkaz: string;
  /** Co odkaz udělá: přihlásí do profilu, nebo nabídne založení správce. */
  popis: string;
}

/** Odkazy po zadání e-mailu na /pro-skoly: přihlášení osoby nebo rejstříkový vstup, i pro víc škol. */
export async function posliOdkazyEmail(email: string, polozky: OdkazSkoly[]): Promise<boolean> {
  if (polozky.length === 0) return false;
  const obsah =
    polozky.length === 1
      ? `<p>${esc(polozky[0].popis)} (<strong>${esc(polozky[0].nazevSkoly)}</strong>):</p>${TLACITKO(polozky[0].odkaz, 'Otevřít profil školy')}`
      : `<p>Adresa patří k více školám. Vyberte, kterou chcete otevřít:</p><ul>${polozky
          .map((p) => `<li><a href="${p.odkaz}">${esc(p.nazevSkoly)}</a> – ${esc(p.popis)}</li>`)
          .join('')}</ul>`;
  return odesliEmail({
    to: email,
    subject: 'Odkaz do profilu školy',
    html: OBALKA(`
      <p>Dobrý den,</p>
      ${obsah}
      <p>Odkaz platí <strong>72 hodin</strong>. Pokud jste o něj nežádali, e-mail prosím ignorujte.</p>
    `),
  });
}

/** Po uplatnění kódu: potvrzení, že adresa funguje, a jak se přihlásit příště. */
export async function posliVitejteEmail(para: { email: string; nazevSkoly: string; profilUrl: string; jmeno: string }) {
  return odesliEmail({
    to: para.email,
    subject: `Spravujete profil školy ${para.nazevSkoly}`,
    html: OBALKA(`
      <p>Dobrý den, ${esc(para.jmeno)},</p>
      <p>jste správcem profilu školy <strong>${esc(para.nazevSkoly)}</strong> na webu Přijímačky na školu. V profilu doplníte údaje o škole a pozvete kolegy, kteří vám s tím pomohou.</p>
      ${TLACITKO(para.profilUrl, 'Otevřít profil')}
      <p>Příště se přihlásíte na stránce Pro školy zadáním této e-mailové adresy; pošleme vám na ni odkaz. Heslo nepotřebujete.</p>
      <p>Pokud jste profil nezakládali vy, napište prosím na patrick@zandl.cz.</p>
    `),
  });
}

export async function posliPozvankuEmail(para: { email: string; nazevSkoly: string; pozval: string; odkaz: string }) {
  return odesliEmail({
    to: para.email,
    subject: `Pozvánka k úpravě profilu školy ${para.nazevSkoly}`,
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>${esc(para.pozval)} vás zve k úpravám profilu školy <strong>${esc(para.nazevSkoly)}</strong> na webu Přijímačky na školu.</p>
      ${TLACITKO(para.odkaz, 'Přijmout pozvánku')}
      <p>Pozvánka platí <strong>7 dní</strong>. Pokud pozvánku nečekáte, e-mail prosím ignorujte.</p>
    `),
  });
}

export async function posliPotvrzeniEmailu(para: { email: string; nazevSkoly: string; odkaz: string }) {
  return odesliEmail({
    to: para.email,
    subject: 'Potvrďte novou e-mailovou adresu',
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>v profilu školy <strong>${esc(para.nazevSkoly)}</strong> jste požádali o změnu přihlašovací adresy na tuto. Změnu potvrdíte tlačítkem:</p>
      ${TLACITKO(para.odkaz, 'Potvrdit adresu')}
      <p>Odkaz platí <strong>72 hodin</strong>. Pokud jste o změnu nežádali, e-mail ignorujte; nic se nezmění.</p>
    `),
  });
}

/** Správci: někdo z rejstříkové adresy školy poslal návrh mimo jeho tým (oddíl 2.2). */
export async function posliUpozorneniSpravci(para: { email: string; nazevSkoly: string; profilUrl: string }) {
  return odesliEmail({
    to: para.email,
    subject: `Nový návrh k profilu školy ${para.nazevSkoly}`,
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>z úředního e-mailu školy <strong>${esc(para.nazevSkoly)}</strong> uvedeného v rejstříku MŠMT přišel návrh úprav profilu. Posoudí ho redakce jako každý jiný.</p>
      <p>Pokud patří kolegovi, můžete ho pozvat do profilu, aby příště psal pod svým jménem:</p>
      ${TLACITKO(para.profilUrl, 'Otevřít profil')}
    `),
  });
}
