// ============================================================================
// E-maily Portálu pro školy přes Resend (vzor: src/app/api/bug-report/route.ts).
// Obě funkce jsou best-effort: nikdy nehází výjimku, vrací true/false.
// Bez RESEND_API_KEY jen zalogují a vrátí false.
// ============================================================================

const ODESILATEL = 'Přijímačky na školu <noreply@prijimackynaskolu.cz>';

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
      body: JSON.stringify({ from: ODESILATEL, to: para.to, subject: para.subject, html: para.html }),
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
        Tento e-mail byl odeslán automaticky, prosím neodpovídejte na něj.<br>
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
      <p>pro úpravu profilu školy <strong>${para.nazevSkoly}</strong> na webu Přijímačky na střední školy použijte tento odkaz:</p>
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
    subject: '✅ Změny profilu školy byly přijaty',
    html: OBALKA(`
      <p>Dobrý den,</p>
      <p>úpravy profilu školy <strong>${para.nazevSkoly}</strong> jsme přijali. Teď je zkontroluje redakce a po schválení se zobrazí na stránce školy se značkou „potvrzeno školou“:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${para.skolaUrl}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Stránka vaší školy</a>
      </p>
      <p>Pokud redakce bude mít k úpravám dotaz, ozve se na tento e-mail.</p>
    `),
  });
}
