// ============================================================================
// E-maily Portálu pro školy přes Resend (vzor: src/app/api/bug-report/route.ts).
// Obě funkce jsou best-effort: nikdy nehází výjimku, vrací true/false.
// Bez RESEND_API_KEY jen zalogují a vrátí false.
// ============================================================================

// Od 20. 9. 2026 odchází e-maily portálu rovnou z adresy podpory, ne z noreply:
// škola odpovídá tomu, od koho jí zpráva přišla, a nemusí hledat jinou adresu.
// Odpovědi vyřizuje Eduarda (AI asistentka), u pozvánky je to v textu vysvětlené.
export const PODPORA_EMAIL = 'eda@prijimackynaskolu.cz';

// Jméno odesílatele. Adresa je u všech e-mailů portálu stejná a musí zůstat na
// ověřené doméně: `zandl.cz` v Resendu ověřená není, takže z ní odeslat nejde
// a rozpadl by se DKIM i SPF.
//
// Provozní e-maily posílá Eduarda, protože na té adrese skutečně odpovídá.
// Pozvánka do pilotu je výjimka: nese přístupový kód a je podepsaná člověkem
// (docs/ucty-portalu-skol-2027.md, oddíl 5). Řádek „Od“ ředitel uvidí dřív než
// podpis, takže i tam musí stát člověk – jinak obrana proti dojmu podvodu
// padne přesně tam, kde má fungovat.
const JMENO_EDUARDA = 'Eduarda z Přijímačky na školu';
const JMENO_CLOVEK = 'Patrick Zandl – Přijímačky na školu';
const odesilatel = (jmeno: string) => `${jmeno} <${PODPORA_EMAIL}>`;

/** Textová verze vedle HTML: e-mail jen v HTML hodnotí spamové filtry hůř. */
export function htmlNaText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2: $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    // Entity se musí rozkódovat, jinak se `esc()` z HTML propíše do textové
    // verze: jméno „Nováková & spol.“ by v ní stálo jako „Nováková &amp; spol.“.
    // `&amp;` až nakonec, ať se `&amp;lt;` nerozpadne na `<`.
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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

/** `odesilatel` je hotový řádek „Od“ včetně adresy; bez něj píše Eduarda. */
async function odesliEmail(para: { to: string; subject: string; html: string; odesilatel?: string }): Promise<boolean> {
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
        from: para.odesilatel ?? odesilatel(JMENO_EDUARDA),
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

const PATICKA_AUTOMAT = `
        Tento e-mail byl odeslán automaticky. Na odpověď reaguje Eduarda, AI asistentka podpory;
        změny účtů a sporné věci řeší Patrick Zandl (patrick@zandl.cz).<br>`;

const OBALKA = (obsah: string, paticka: string = PATICKA_AUTOMAT) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      ${obsah}
      <p style="color: #818c99; font-size: 13px; margin-top: 32px;">
        ${paticka}
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

/**
 * Pozvánka do pilotu účtů pro 20 vybraných škol.
 * Text je schválený a jeho zdrojem pravdy je `docs/podklady/pozvanka-pilot-uctu-portalu.md`;
 * když se změní tam, musí se změnit i tady.
 *
 * Odchází z `eda@`, ale **podepisuje ji člověk**: kód podepsaný umělou
 * inteligencí ředitel snadno vyhodnotí jako podvod ([účty portálu], oddíl 5).
 * Proto má vlastní patičku bez věty „odesláno automaticky“ a v textu je
 * vysvětlené, kdo na adrese odpovídá.
 */
export interface PozvankaPara {
  nazevSkoly: string;
  /** „Vážená paní ředitelko“ / „Vážený pane řediteli“ / „Dobrý den“ */
  osloveni: string;
  kod: string;
}

/** Předmět a HTML pozvánky bez odeslání – kvůli náhledu v administraci. */
// Kód stojí sám na konci řádku kvůli čitelnosti a snadnému výběru myší, ne
// kvůli ověřování: `normalizeKod` z portal-skol.ts zahazuje všechno mimo [A-Z0-9],
// takže zkopírovaná tečka, čárka ani mezera přihlášení rozbít nemůžou.
//
// Do šablony nepatří HTML komentáře: `html` jde rovnou do Resendu a příjemce si
// je přečte přes „zobrazit originál“.
export function pozvankaDoPilotu(para: PozvankaPara): { subject: string; html: string; odesilatel: string } {
  const skola = esc(para.nazevSkoly);
  return {
    // Odesílatel patří k šabloně, ne k odesílací funkci: jediná kontrola před
    // nevratnou rozesílkou je náhled v administraci, a ten musí ukázat i řádek
    // „Od“. Právě ten ředitel uvidí dřív než podpis.
    odesilatel: odesilatel(JMENO_CLOVEK),
    subject: `Profil ${para.nazevSkoly} na Přijímačky na školu: pozvánka do pilotu`,
    html: OBALKA(
      `
      <p>${esc(para.osloveni)},</p>
      <p>na webu Přijímačky na školu (<a href="https://www.prijimackynaskolu.cz" style="color: #0074e4;">www.prijimackynaskolu.cz</a>)
         hledají rodiče a uchazeči střední školu podle výsledků přijímacího řízení. Stránku má i <strong>${skola}</strong>.
         Obory, kapacity a výsledky na ní přebíráme z otevřených dat CERMATu, rejstříku MŠMT a České školní inspekce.</p>
      <p>Zveme vaši školu mezi dvacet škol, které jako první vyzkouší, jak si škola svůj profil spravuje sama.
         Doplníte, co v úředních datech chybí: dny otevřených dveří, odkaz na vyhlášená kritéria přijetí, přípravné
         kurzy, ubytování nebo kontakt na výchovného poradce. Údaje se na stránce školy zobrazí se značkou
         „potvrdila škola“ a s datem. Je to zdarma a nic není povinné.</p>
      <p><strong>Jak na to</strong></p>
      <ol>
        <li>Otevřete <a href="https://www.prijimackynaskolu.cz/pro-skoly" style="color: #0074e4;">www.prijimackynaskolu.cz/pro-skoly</a>
            a zadejte kód:<br>
            <strong style="font-size: 18px; letter-spacing: 1px;">${esc(para.kod)}</strong></li>
        <li>Vyplňte své jméno, funkci a pracovní e-mail. Kdo kód použije první, stane se správcem profilu školy
            a kód tím přestane platit. Proto ho prosím předejte jen tomu, kdo bude profil spravovat.</li>
        <li>Správce může pozvat kolegy. Každý se pak přihlašuje svým e-mailem, bez hesla.</li>
        <li>Co vyplníte, se na stránce školy objeví obvykle do hodiny. Na schválení nic nečeká — věříme tomu,
            kdo za školu údaje zadává. Když v nich najdeme chybu, opravíme ji a dáme vám vědět; u opraveného
            údaje je pak místo „potvrdila škola“ uvedeno „opravila redakce“.</li>
      </ol>
      <p>Na stránce školy uvedeme „Profil spravuje škola“. Jméno a funkci správce tam uvedeme, jen když k tomu dá
         ve formuláři souhlas; odvolat ho jde kdykoli v profilu. Osobní údaje zpracovávám já jako jejich správce,
         jen pro přihlašování a pro vedení historie změn.</p>
      <p>Chystáme ještě dvě věci, zatím bez termínu: otevřená data s údaji potvrzenými školami a odznak pro web
         školy. O obojím vám dáme vědět.</p>
      <p>Tenhle e-mail přišel z adresy ${PODPORA_EMAIL} a odpovídá na ní Eduarda, naše asistentka s umělou
         inteligencí; v podpisu to vždy uvádí. Kód ani přístup k účtu vám Eduarda nevydá ani nezmění, to dělám
         jen já osobně. Změnu správce, ztracený přístup nebo cokoli, co má řešit člověk, pište prosím rovnou na
         <a href="mailto:patrick@zandl.cz" style="color: #0074e4;">patrick@zandl.cz</a>.</p>
      <p>Děkuji a budu rád za každou zpětnou vazbu, i kritickou.</p>
      <p>S pozdravem<br><br>
         Patrick Zandl<br>
         provozovatel projektu Přijímačky na školu<br>
         <a href="mailto:patrick@zandl.cz" style="color: #0074e4;">patrick@zandl.cz</a></p>
      `,
      `Pozvánku posílá Patrick Zandl, provozovatel projektu. Na odpovědi na této adrese reaguje Eduarda,
       asistentka s umělou inteligencí; změny účtů a sporné věci řeší Patrick Zandl (patrick@zandl.cz).<br>`,
    ),
  };
}

export async function posliPozvankuDoPilotu(para: PozvankaPara & { email: string }): Promise<boolean> {
  const { subject, html, odesilatel: od } = pozvankaDoPilotu(para);
  return odesliEmail({ to: para.email, subject, html, odesilatel: od });
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
