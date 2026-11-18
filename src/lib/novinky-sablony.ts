import { obalka } from './novinky-email.ts';
import { potvrzovaciOdkaz } from './novinky-token.ts';

// ============================================================================
// Texty servisních e-mailů odběru (potvrzení termínů a hlídání, uvítání).
//
// Obsahové zprávy vznikají jinak: generují se ze šablon v `content/novinky/`
// do `public/novinky/{rocnik}/` a schvalují se sloučením pull requestu
// (docs/novinky-k-prijimackam-2027.md, oddíl 7). Tady jsou jen dva e-maily,
// které musí odejít hned a nečekají na schválení, protože je vyvolal člověk.
//
// Pravidla textu (slovník pojmů, §5): rok vždy výslovně, slova „letos“ a
// „loni“ se nepoužívají; tyká se a oslovuje se rodina.
// ============================================================================

export const PATICKA_POTVRZENI =
  'Tento e-mail jsi dostal proto, že někdo zadal tuto adresu do formuláře na prijimackynaskolu.cz. Bez potvrzení odkazem ti nic dalšího nepřijde.';

function patickaOdberu(spravaOdkaz: string, odhlasitOdkaz: string): string {
  return `<a href="${spravaOdkaz}" style="color: #0074e4;">Upravit odběr</a> · <a href="${odhlasitOdkaz}" style="color: #0074e4;">Odhlásit se</a>`;
}

export interface PotvrzeniPara {
  token: string;
}

/** E-mail s potvrzovacím odkazem. Odkaz jen otevře stránku, odběr nezaloží. */
export function potvrzovaciEmail(para: PotvrzeniPara): { predmet: string; html: string; text: string } {
  const odkaz = potvrzovaciOdkaz(para.token);
  const co = 'připomínky důležitých termínů přijímacího řízení a pokyny, co je potřeba připravit';

  const predmet = 'Potvrď odběr připomínek termínů přijímaček';
  const html = obalka(
    `<p>Dobrý den,</p>
     <p>někdo zadal tuto adresu, aby dostával ${co}. Odběr začne, až ho potvrdíš:</p>
     <p style="text-align: center; margin: 24px 0;">
       <a href="${odkaz}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Potvrdit odběr</a>
     </p>
     <p>Odkaz platí 72 hodin a použít ho jde jednou. Pokud jsi o odběr nežádal, e-mail prostě ignoruj: bez potvrzení nic dalšího nepřijde a adresu si nikam neukládáme.</p>`,
    PATICKA_POTVRZENI,
  );
  const text = [
    'Dobrý den,',
    '',
    `někdo zadal tuto adresu, aby dostával ${co}. Odběr začne, až ho potvrdíš na této adrese:`,
    odkaz,
    '',
    'Odkaz platí 72 hodin a použít ho jde jednou. Pokud jsi o odběr nežádal, e-mail ignoruj.',
    '',
    PATICKA_POTVRZENI,
  ].join('\n');
  return { predmet, html, text };
}

export interface PotvrzeniHlidaniPara extends PotvrzeniPara {
  /** Kolik škol žádost nese; jména se do e-mailu nedávají, rodina ví, co vybrala. */
  skol: number;
}

/** Počet škol slovy: „vybranou školu“, „2 vybrané školy“, „5 vybraných škol“. */
export function skolSlovy(n: number): string {
  if (n === 1) return 'vybranou školu';
  if (n >= 2 && n <= 4) return `${n} vybrané školy`;
  return `${n} vybraných škol`;
}

/**
 * Potvrzení hlídání škol (#523, E6). Stejná cesta jako potvrzení termínů, jen
 * text říká, co hlídání pošle: jeden denní souhrn, když se u škol něco změní.
 */
export function potvrzovaciEmailHlidani(para: PotvrzeniHlidaniPara): { predmet: string; html: string; text: string } {
  const odkaz = potvrzovaciOdkaz(para.token);
  const co = `hlídat ${skolSlovy(para.skol)}: když se na webu u školy něco změní (dny otevřených dveří, kritéria přijetí, nová data), přijde jeden souhrnný e-mail denně; v den bez změny nepřijde nic`;

  const predmet = 'Potvrď hlídání škol na prijimackynaskolu.cz';
  const html = obalka(
    `<p>Dobrý den,</p>
     <p>někdo zadal tuto adresu, aby mohl ${co}. Hlídání začne, až ho potvrdíš:</p>
     <p style="text-align: center; margin: 24px 0;">
       <a href="${odkaz}" style="display: inline-block; background: #0074e4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Potvrdit hlídání</a>
     </p>
     <p>Odkaz platí 72 hodin a použít ho jde jednou. Pokud jsi o hlídání nežádal, e-mail prostě ignoruj: bez potvrzení nic dalšího nepřijde a nepotvrzená žádost sama propadne do 72 hodin.</p>`,
    PATICKA_POTVRZENI,
  );
  const text = [
    'Dobrý den,',
    '',
    `někdo zadal tuto adresu, aby mohl ${co}. Hlídání začne, až ho potvrdíš na této adrese:`,
    odkaz,
    '',
    'Odkaz platí 72 hodin a použít ho jde jednou. Pokud jsi o hlídání nežádal, e-mail ignoruj.',
    '',
    PATICKA_POTVRZENI,
  ].join('\n');
  return { predmet, html, text };
}

export interface UvitaniPara {
  /** Ročník přijímacího řízení, jehož termíny právě běží; z registru, ne z kódu. */
  rocnik: string;
  /** Nejbližší termíny z kalendáře MŠMT: popis a datum slovy. */
  terminy: Array<{ nazev: string; datum: string }>;
  spravaOdkaz: string;
  odhlasitOdkaz: string;
  /**
   * Podmíněný blok o datech, která na web nedávno přibyla. Nový odběratel
   * žádný „poslední e-mail“ nemá, takže se vypisuje jen když je co říct.
   */
  novaData?: string | null;
}

/** Uvítací e-mail: přehled termínů ročníku a co dělat teď. */
export function uvitaciEmail(para: UvitaniPara): { predmet: string; html: string; text: string } {
  const predmet = `Termíny přijímaček ${para.rocnik} a co je potřeba připravit`;
  const seznamHtml = para.terminy
    .map((t) => `<li><strong>${t.nazev}:</strong> ${t.datum}</li>`)
    .join('');
  const blokData = para.novaData
    ? `<p style="background: #f2f5f7; padding: 12px; border-radius: 6px;">${para.novaData}</p>`
    : '';

  const html = obalka(
    `<p>Dobrý den,</p>
     <p>odběr je potvrzený. Termíny přijímacího řízení ${para.rocnik} ti pošleme vždy s předstihem, ať na nic nezapomeneš. Tady je přehled:</p>
     <ul>${seznamHtml}</ul>
     ${blokData}
     <p>Termíny si můžeš uložit do kalendáře v telefonu:
       <a href="https://www.prijimackynaskolu.cz/prijimacky-2027" style="color: #0074e4;">kalendář přijímaček</a>.
       Přesný čas, místo a přílohy vždy ověř v kritériích školy.</p>
     <p>Zdroj termínů je harmonogram MŠMT.</p>`,
    patickaOdberu(para.spravaOdkaz, para.odhlasitOdkaz),
  );
  const text = [
    'Dobrý den,',
    '',
    `odběr je potvrzený. Termíny přijímacího řízení ${para.rocnik} ti pošleme vždy s předstihem.`,
    '',
    ...para.terminy.map((t) => `- ${t.nazev}: ${t.datum}`),
    ...(para.novaData ? ['', para.novaData] : []),
    '',
    'Kalendář: https://www.prijimackynaskolu.cz/prijimacky-2027',
    'Přesný čas, místo a přílohy vždy ověř v kritériích školy. Zdroj termínů je harmonogram MŠMT.',
    '',
    `Upravit odběr: ${para.spravaOdkaz}`,
    `Odhlásit se: ${para.odhlasitOdkaz}`,
  ].join('\n');
  return { predmet, html, text };
}
