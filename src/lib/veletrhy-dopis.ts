// ============================================================================
// Dopis pořadatelům veletrhů s nabídkou online mediálního partnerství.
//
// Text je schválený v docs/podklady/dopis-poradatelum-veletrhu.md; tahle
// šablona ho musí držet slovo od slova. Podepisuje člověk a odchází
// z eda@prijimackynaskolu.cz, kde odpovědi vyřizuje Eduarda — stejný vzor
// jako pozvánka do pilotu portálu (src/lib/portal-email.ts).
//
// Akce se berou ze src/data/veletrhy-2027.json podle id, ne z textu dopisu:
// termín v e-mailu tak nemůže tvrdit něco jiného než stránka, na kterou vede.
// ============================================================================

import data from '@/data/veletrhy-2027.json';
import { esc, odesliEmail, PODPORA_EMAIL } from './portal-email';
import type { Veletrh } from './veletrhy';

/** Řádek „Od“: člověk, protože ho příjemce uvidí dřív než podpis. */
export const ODESILATEL_DOPISU = `Patrick Zandl – Přijímačky na školu <${PODPORA_EMAIL}>`;

/**
 * Jak dopis mluví o termínu. Odpovídá stupňům doloženosti na stránce:
 * ověřený u pořadatele, převzatý z agregátoru, nebo přibližný.
 */
export type VariantaTerminu = 'overeno' | 'agregator' | 'pribligny';

export interface Adresat {
  /** Identifikátor adresáta v seznamu obesílání. */
  id: string;
  /** Víc adres dostane jeden společný e-mail (Plzeň: produkce a správa webu). */
  email: string | string[];
  osloveni: string;
  /** Jak se akce jmenuje v předmětu. */
  predmet: string;
  /** Id akcí ze src/data/veletrhy-2027.json. */
  akce: string[];
  /** Cesta ke stránce kraje, např. `/regiony/kralovehradecky`. */
  kraj: string;
  varianta: VariantaTerminu;
  /**
   * Čí web termín nese, když to není web adresáta (např. `SPŠ Ostrov`). KAM
   * po ZŠ má termíny všech tří škol jen na webu SPŠ Ostrov a karta akce vede
   * tam; „ověřili na vašem webu“ ani „odkazujeme na vaši stránku“ by nebyla pravda.
   */
  zdrojTerminu?: string;
  /** Proč zrovna tahle adresa a co zvážit; do e-mailu nejde. */
  poznamka?: string;
}

const VSECHNY = (data as unknown as { akce: Veletrh[] }).akce;
const WEB = 'https://www.prijimackynaskolu.cz';

/** Akce adresáta. Neznámé id je chyba, ne důvod akci potichu vynechat. */
export function akceAdresata(a: Adresat): Veletrh[] {
  return a.akce.map((id) => {
    const nalez = VSECHNY.find((v) => v.id === id);
    if (!nalez) throw new Error(`Adresát ${a.id}: akce ${id} v datech není.`);
    if (!nalez.datum) throw new Error(`Adresát ${a.id}: akce ${id} nemá termín, dopis by ho nemohl uvést.`);
    return nalez;
  });
}

// Viditelný text odkazu je celá adresa s https://. Kdyby poštovní program
// značku <a> zahodil nebo zobrazil textovou verzi, adresu pořád pozná
// a udělá z ní odkaz; samotné „www.…“ tak spolehlivě nepoznají všechny.
const odkaz = (url: string) => `<a href="${url}" style="color: #0074e4;">${esc(url)}</a>`;

function vetaOTerminu(v: VariantaTerminu, jedna: boolean, zdrojTerminu?: string): string {
  if (v === 'overeno' && zdrojTerminu) {
    return `${jedna ? 'Termín' : 'Termíny'} jsme našli na webu ${esc(zdrojTerminu)} a u ${jedna ? 'akce' : 'akcí'} odkazujeme tam. Máte-li vlastní stránku ${jedna ? 'akce' : 'akcí'}, pošlete mi prosím odkaz, použijeme ji. Kdyby se cokoli změnilo, napište mi, opravíme to.`;
  }
  switch (v) {
    case 'agregator':
      return 'Termín jsme převzali z přehledu akcí, na vašem webu jsme ho zatím nenašli. Proto ho u akce vedeme s poznámkou, že ho pořadatel nepotvrdil. Potvrdíte mi ho prosím? Poznámku pak odstraníme.';
    case 'pribligny':
      return 'Termín uvádíme jako přibližný, protože harmonogram videohovorů podle okresů jsme nenašli. Pošlete mi ho prosím, až bude hotový; doplníme ho.';
    default:
      return `${jedna ? 'Termín' : 'Termíny'} jsme ověřili na vašem webu. Kdyby se cokoli změnilo, napište mi prosím, opravíme to.`;
  }
}

/**
 * Textová verze pro programy, které HTML nezobrazí. Vzniká z HTML, ale odkaz
 * se nahradí jen svou adresou — obecný převod z portálu píše „text: adresa“,
 * což u odkazu, jehož text je adresa, dá tutéž adresu dvakrát za sebou.
 */
export function textDopisu(html: string): string {
  return html
    .replace(/<a [^>]*href="mailto:([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, '$1')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/(p|li|ul)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function dopisPoradateli(a: Adresat): { subject: string; html: string; odesilatel: string } {
  const akce = akceAdresata(a);
  const jedna = akce.length === 1;
  const polozky = akce
    .map((v) => {
      const kde = v.online ? 'online' : [v.mesto, v.misto !== v.mesto ? v.misto : null].filter(Boolean).join(', ');
      return jedna
        ? `<p style="margin-left: 16px;"><strong>${esc(v.nazev)}</strong>, ${esc(v.datum!)}, ${esc(kde)}</p>`
        : `<li>${esc(v.datum!)}, ${esc(kde)}</li>`;
    })
    .join('\n');

  return {
    odesilatel: ODESILATEL_DOPISU,
    subject: `${a.predmet} v přehledu veletrhů na Přijímačky na školu`,
    html: `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>${esc(a.osloveni)},</p>
      <p>provozuji web Přijímačky na školu (${odkaz(WEB)}), na kterém rodiče a uchazeči
         vybírají střední školu. Obory, kapacity a výsledky přijímacího řízení na něm přebíráme z otevřených dat
         CERMATu, rejstříku MŠMT a České školní inspekce. Od února 2026, kdy jsme začali měřit, zaznamenal web přes
         25 000 návštěv, nejvíc v únoru a v květnu.</p>
      <p>Nově na webu vedeme přehled veletrhů a přehlídek středních škol podle krajů a měst:
         ${odkaz(`${WEB}/veletrhy`)}. ${jedna ? 'Je v něm i vaše akce:' : `Jsou v něm i vaše akce „${esc(a.predmet)}“:`}</p>
      ${jedna ? polozky : `<ul>\n${polozky}\n</ul>`}
      <p>U ${jedna ? 'akce' : 'akcí'} uvádíme vás jako pořadatele${a.zdrojTerminu ? '.' : ' a odkazujeme na vaši stránku.'} ${vetaOTerminu(a.varianta, jedna, a.zdrojTerminu)}</p>
      <p>Rád bych vám nabídl, aby se náš web stal online mediálním partnerem ${jedna ? 'akce' : 'akcí'}. Znamenalo by to
         jedinou věc: na stránce ${jedna ? 'akce' : 'akcí'} byste odkázali na náš přehled, buď na veletrhy
         (${odkaz(`${WEB}/veletrhy`)}), nebo na střední školy ve vašem kraji
         (${odkaz(`${WEB}${a.kraj}`)}). Vyberte, co se k vaší stránce hodí víc.
         My na ${jedna ? 'vaši akci' : 'vaše akce'} odkazujeme už teď a v přehledu ${jedna ? 'ji' : 'je'} necháme tak jako tak, partnerství na
         tom nic nemění.</p>
      <p>Proč o odkaz stojíme, řeknu rovnou: přehled je nový a bez odkazů z webů, které se veletrhům skutečně věnují,
         ho rodiny ve vyhledávači nenajdou. Vašim návštěvníkům zase ukáže, jaké další akce se v kraji konají a které
         školy v okolí jsou.</p>
      <p>Partnerství je zdarma, nevyžaduje smlouvu a stačí k němu odpověď na tento e-mail.</p>
      <p>Ještě dvě prosby, obě nezávazné:</p>
      <ul>
        <li>Pokud zveřejňujete seznam vystavujících škol, pošlete mi ho prosím nebo odkaz na něj. Rádi bychom později
            na stránce každé školy ukázali, na kterém veletrhu ji rodiny potkají.</li>
        <li>Pořádáte-li další akci, kterou v přehledu nemáme, můžete ji nahlásit na
            ${odkaz(`${WEB}/veletrhy/nahlasit`)}. Před zveřejněním ji ověříme.</li>
      </ul>
      <p>Tenhle e-mail přišel z adresy ${PODPORA_EMAIL}. Odpovídá na ní Eduarda, naše asistentka s umělou inteligencí,
         která za projekt vyřizuje veškerou administrativu; v podpisu to vždy uvádí. Cokoli, co chcete řešit přímo se
         mnou, pište prosím na <a href="mailto:patrick@zandl.cz" style="color: #0074e4;">patrick@zandl.cz</a>.</p>
      <p>Děkuji a budu rád za odpověď, i za kritickou.</p>
      <p>S pozdravem<br><br>
         Patrick Zandl<br>
         provozovatel projektu Přijímačky na školu<br>
         <a href="mailto:patrick@zandl.cz" style="color: #0074e4;">patrick@zandl.cz</a></p>
    </div>
  </body>
  </html>`.replace(/\s*\n\s*/g, ' ').replace(/>\s+/g, '>').trim(),
  };
}

/** Odešle dopis na `na`, nebo na adresu adresáta. Vrací, jestli ho Resend přijal. */
export async function posliDopis(a: Adresat, na?: string): Promise<boolean> {
  const { subject, html, odesilatel } = dopisPoradateli(a);
  return odesliEmail({ to: na ?? a.email, subject, html, odesilatel, text: textDopisu(html) });
}
