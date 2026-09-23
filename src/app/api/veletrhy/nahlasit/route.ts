import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { krajNames } from '@/lib/kraje.mjs';

// ============================================================================
// Nahlášení veletrhu nebo přehlídky SŠ (docs/veletrhy-skol-2027.md, § 5.5).
//
// **Nahlášení není zveřejnění.** Cokoli sem přijde, jde ke kontrole; na web
// se akce dostane teprve poté, co člověk ověří, že existuje a termín sedí.
// Platí to i pro hlášení od samotného pořadatele. Důvod je v tom, co web
// odnesl u pole `dny_otevrenych_dveri` z InspIS: nekontrolovaný volný text
// zestárne a lže. Přijímat ho vlastním formulářem a rovnou publikovat by
// byla tatáž chyba, jen spáchaná vlastní rukou.
//
// Hlásit může kdokoli — pořadatel, výchovná poradkyně, rodič od plakátu.
// Ověřuje se akce, ne ten, kdo ji nahlásil.
// ============================================================================

const PRIJEMCE = process.env.VELETRHY_PRIJEMCE || 'redakce@prijimackynaskolu.cz';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Čítač žije v paměti instance. Na serverless se mezi instancemi nesdílí,
// takže limit je brzda proti nešikovnému opakování, ne ochrana proti
// cílenému zahlcení; tu dělá honeypot a povinný odkaz na stránku akce.
const rateLimitMap = new Map<string, number[]>();

const SPAM_KEYWORDS = [
  'viagra', 'casino', 'bitcoin', 'crypto', 'loan', 'weight loss',
  'click here', 'buy now', 'limited offer', 'congratulations',
  'winner', 'prize', 'cash', 'make money', 'work from home',
];

export function jeRateLimited(identifikator: string, ted: number = Date.now()): boolean {
  const nedavne = (rateLimitMap.get(identifikator) || []).filter((t) => ted - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(identifikator, nedavne);
  if (nedavne.length >= RATE_LIMIT_MAX) return true;
  nedavne.push(ted);
  rateLimitMap.set(identifikator, nedavne);
  return false;
}

export function jeSpam(text: string): boolean {
  const male = text.toLowerCase();
  if (SPAM_KEYWORDS.some((k) => male.includes(k))) return true;
  if ((text.match(/https?:\/\//g) || []).length > 3) return true;
  return false;
}

export interface NahlaseniVstup {
  nazev?: unknown;
  start?: unknown;
  end?: unknown;
  adresa?: unknown;
  mesto?: unknown;
  krajKod?: unknown;
  popis?: unknown;
  url?: unknown;
  poradatel?: unknown;
  email?: unknown;
  /** Honeypot: vyplněné pole znamená robota. */
  website?: unknown;
}

// Číselník krajů je jeden pro celý web; formulář i ověření berou týž.
const KRAJE = new Set(Object.keys(krajNames));

/** Odpověď je vždy stejná, ať akci známe, nebo ne. */
export const NEUTRALNI_ODPOVED = {
  ok: true,
  zprava: 'Děkujeme. Akci ověříme a teprve potom ji zveřejníme.',
};

/** Nejdéle čekáme na databázi; pak jdeme poštou, ať hlášení někde skončí. */
const DB_LIMIT_MS = 3000;

/** Nejdéle čekáme na poštu. Na rozdíl od databáze ji umíme opravdu zrušit. */
const POSTA_LIMIT_MS = 8000;

/** Vrátí `null`, když slib nestihne limit. Nezastaví ho, jen přestane čekat. */
async function sLimitem<T>(slib: Promise<T>, ms: number, popis: string): Promise<T | null> {
  let casovac: ReturnType<typeof setTimeout> | undefined;
  // Pozdní výsledek už nikdo nečte; bez tohoto zachycení by se z chyby
  // stalo neošetřené odmítnutí a proces by podle nastavení mohl spadnout.
  slib.catch((e) => console.error(`[veletrhy] ${popis} selhalo až po limitu:`, e));
  try {
    return await Promise.race([
      slib,
      new Promise<null>((vrat) => {
        casovac = setTimeout(() => vrat(null), ms);
      }),
    ]);
  } finally {
    if (casovac) clearTimeout(casovac);
  }
}

/**
 * Uloží hlášení do fronty ke kontrole a vrátí jeho id.
 *
 * `null` znamená, že záznam nikde není — buď databáze není nastavená, nebo
 * zápis selhal. Volající pak nesmí potvrdit přijetí, pokud neuspěla ani pošta.
 */
async function ulozNahlaseni(d: Record<string, string>): Promise<number | null> {
  if (!jeDbNastavena()) return null;
  try {
    // Visící `connect()` by bez limitu zdržel i e-mail: databáze nemá
    // nastavený timeout, takže by se čekalo, dokud požadavek neutne
    // platforma, a hlášení by neskončilo nikde.
    const id = await sLimitem(vTransakci(async (s) => {
      const v = await s.dotaz<{ id: string | number }>(
        `insert into veletrh_nahlaseni
           (nazev, start_den, konec_den, adresa, mesto, kraj_kod, url, poradatel, email, popis)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id`,
        [d.nazev, d.start, d.end, d.adresa, d.mesto, d.krajKod, d.url, d.poradatel, d.email, d.popis || null],
      );
      return Number(v.rows[0].id);
    }), DB_LIMIT_MS, 'uložení hlášení');
    if (id === null) console.error('[veletrhy] databáze neodpověděla do limitu, jdeme poštou');
    return id;
  } catch (e) {
    console.error('[veletrhy] nahlášení se nepodařilo uložit:', e);
    return null;
  }
}

/** Poznamená, jestli hlášení odešlo i e-mailem. Selhání zápisu nevadí. */
async function oznacOdeslani(id: number, odeslano: boolean): Promise<void> {
  if (!odeslano) return;
  try {
    await sLimitem(
      vTransakci((s) =>
        s.dotaz('update veletrh_nahlaseni set odeslano_mailem = true where id = $1', [id]),
      ),
      DB_LIMIT_MS,
      'zápis příznaku odeslání',
    );
  } catch (e) {
    console.error('[veletrhy] stav odeslání se nepodařilo zapsat:', e);
  }
}

/** Datum existuje v kalendáři: 2026-02-30 ani 2026-99-99 neprojde. */
export function jeDatumPlatne(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Adresa musí být http(s) a rozeberatelná; „https://a b“ neprojde. */
export function jeUrlPlatna(url: string): boolean {
  if (url.length > 500 || /\s/.test(url)) return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Nejdelší rozumná délka pole; delší vstup je chyba nebo útok. */
const DELKY: Record<string, number> = {
  nazev: 200, adresa: 200, mesto: 100, poradatel: 200, email: 200, popis: 2000,
};

export function overVstup(telo: NahlaseniVstup): { chyba: string } | { data: Record<string, string> } {
  const text = (h: unknown) => (typeof h === 'string' ? h.trim() : '');

  const nazev = text(telo.nazev);
  const start = text(telo.start);
  const adresa = text(telo.adresa);
  const mesto = text(telo.mesto);
  const krajKod = text(telo.krajKod);
  const url = text(telo.url);
  const poradatel = text(telo.poradatel);
  const email = text(telo.email).toLowerCase();

  const popis = text(telo.popis);
  for (const [pole, hodnota] of Object.entries({ nazev, adresa, mesto, poradatel, email, popis })) {
    if (hodnota.length > DELKY[pole]) {
      return { chyba: `Pole je delší, než dokážeme přijmout (nejvýš ${DELKY[pole]} znaků).` };
    }
  }

  if (!nazev) return { chyba: 'Vyplňte prosím název akce.' };
  if (!jeDatumPlatne(start)) return { chyba: 'Vyplňte prosím platné datum konání.' };
  if (!adresa) return { chyba: 'Vyplňte prosím adresu, kde se akce koná.' };
  if (!mesto) return { chyba: 'Vyplňte prosím město.' };
  if (!KRAJE.has(krajKod)) return { chyba: 'Vyberte prosím kraj.' };
  if (!jeUrlPlatna(url)) return { chyba: 'Vyplňte prosím platný odkaz na stránku akce.' };
  if (!poradatel) return { chyba: 'Vyplňte prosím, kdo akci pořádá.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { chyba: 'Zadejte prosím platnou e-mailovou adresu.' };

  const end = text(telo.end);
  if (end && !jeDatumPlatne(end)) return { chyba: 'Datum konce má neplatný tvar.' };
  if (end && end < start) return { chyba: 'Konec akce nemůže být dřív než začátek.' };

  return {
    data: {
      nazev, start, end: end || start, adresa, mesto, krajKod, url, poradatel, email,
      popis,
    },
  };
}

export async function POST(request: NextRequest) {
  let telo: NahlaseniVstup;
  try {
    const rozebrane: unknown = await request.json();
    // `null` a pole jsou platný JSON, ale ne objekt s poli formuláře.
    if (rozebrane === null || typeof rozebrane !== 'object' || Array.isArray(rozebrane)) {
      return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
    }
    telo = rozebrane as NahlaseniVstup;
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  // Honeypot: odpověď je stejná jako při úspěchu, aby robot nepoznal odmítnutí.
  if (typeof telo.website === 'string' && telo.website.length > 0) {
    return NextResponse.json(NEUTRALNI_ODPOVED);
  }

  const vysledek = overVstup(telo);
  if ('chyba' in vysledek) {
    return NextResponse.json({ error: vysledek.chyba }, { status: 400 });
  }
  const data = vysledek.data;

  if (jeSpam(`${data.nazev} ${data.popis} ${data.poradatel}`)) {
    return NextResponse.json(NEUTRALNI_ODPOVED);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'neznama';
  // Obě strany se vyhodnotí vždy. Se zkráceným `||` by se při blokované IP
  // e-mailu nezapočítal pokus a jeho okno by se posouvalo pomaleji, než
  // odpovídá skutečnému počtu odeslání.
  const prekrocenaIp = jeRateLimited(ip);
  const prekrocenyEmail = jeRateLimited(data.email);
  if (prekrocenaIp || prekrocenyEmail) {
    // Neslibujeme, že hlášení máme: mezi pokusy mohlo být odmítnuté
    // odeslání, takže „už jsme přijali“ by mohlo být nepravda.
    return NextResponse.json(
      { error: 'Zkuste to prosím za čtvrt hodiny — přijímáme nejvýš tři nahlášení za patnáct minut.' },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000) } },
    );
  }

  // Uložit dřív, než se pošle e-mail: záznam pak platí, i když pošta selže.
  const ulozeno = await ulozNahlaseni(data);
  const { prijato, odeslano } = await odesliKeKontrole(data);
  // Příznak nese skutečné předání poště, ne vývojové „stačí log“.
  if (ulozeno !== null) await oznacOdeslani(ulozeno, odeslano);

  // Přijetí potvrdíme, když hlášení někde je — v databázi nebo v poště.
  if (ulozeno !== null) {
    return NextResponse.json(NEUTRALNI_ODPOVED);
  }
  const doruceno = prijato;
  if (!doruceno) {
    // Nepotvrzujeme přijetí, které jsme nedokázali doručit ani uložit.
    // Uživatel to zkusí znovu, místo aby odešel s vírou, že máme hotovo.
    return NextResponse.json(
      {
        error:
          'Nahlášení se nepodařilo odeslat. Zkuste to prosím za chvíli znovu, nebo nám napište na ' +
          PRIJEMCE + '.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json(NEUTRALNI_ODPOVED);
}

/**
 * Doručení ke kontrole. E-mail nese všechna pole, aby šlo ověřit rovnou
 * z pošty; bez nastaveného Resendu se jen zaloguje, aby vývoj nespadl.
 *
 * Vrací dvě různé věci:
 * - `prijato`: smíme uživateli potvrdit, že hlášení někde skončilo,
 * - `odeslano`: pošta ho skutečně převzala.
 *
 * Ve vývoji bez klíče je `prijato` pravda (log je dohledatelný), ale
 * `odeslano` nepravda — jinak by se do databáze zapsalo, že e-mail odešel,
 * ačkoli se jen vypsal do konzole. Resend vrací 429 a 5xx jako regulérní
 * odpověď, ne jako výjimku, takže `await fetch` bez kontroly `ok` selhání
 * nepozná.
 */
async function odesliKeKontrole(
  d: Record<string, string>,
): Promise<{ prijato: boolean; odeslano: boolean }> {
  const radky = [
    `Akce: ${d.nazev}`,
    `Termín: ${d.start}${d.end !== d.start ? ` – ${d.end}` : ''}`,
    `Město: ${d.mesto} (${d.krajKod})`,
    `Adresa: ${d.adresa}`,
    `Pořadatel: ${d.poradatel}`,
    `Stránka akce: ${d.url}`,
    `Kontakt: ${d.email}`,
    d.popis ? `Popis: ${d.popis}` : '',
    '',
    'Před zveřejněním ověřit termín na stránce pořadatele a zapsat do src/data/veletrhy-2027.json.',
  ].filter(Boolean);

  const klic = process.env.RESEND_API_KEY;
  if (!klic) {
    // Ve vývoji je log dohledatelné místo, takže přijetí potvrdit můžeme.
    // V produkci by to byla lež: hlášení nikde není a nikdo se o něm
    // nedozví, protože serverové logy nikdo nečte jako poštu.
    console.log('[veletrhy] nahlášení (Resend není nastaven):\n' + radky.join('\n'));
    return { prijato: process.env.NODE_ENV !== 'production', odeslano: false };
  }

  try {
    // AbortSignal spojení opravdu přeruší, na rozdíl od Promise.race u DB.
    const odpoved = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(POSTA_LIMIT_MS),
      headers: { Authorization: `Bearer ${klic}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Přijímačky na školu <noreply@prijimackynaskolu.cz>',
        to: PRIJEMCE,
        reply_to: d.email,
        subject: `Nahlášená akce: ${d.nazev} (${d.mesto}, ${d.start})`,
        text: radky.join('\n'),
      }),
    });

    if (!odpoved.ok) {
      // I čtení těla může viset, proto vlastní limit.
      const telo = await sLimitem(odpoved.text(), 2000, 'čtení chybové odpovědi pošty').catch(() => '') ?? '';
      console.error(`[veletrhy] Resend odmítl nahlášení (HTTP ${odpoved.status}): ${telo.slice(0, 300)}`);
      console.log('[veletrhy] nedoručené nahlášení:\n' + radky.join('\n'));
      return { prijato: false, odeslano: false };
    }
    return { prijato: true, odeslano: true };
  } catch (e) {
    console.error('[veletrhy] nahlášení se nepodařilo odeslat:', e);
    console.log('[veletrhy] nedoručené nahlášení:\n' + radky.join('\n'));
    return { prijato: false, odeslano: false };
  }
}
