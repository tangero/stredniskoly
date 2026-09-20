import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Pozvánky do pilotu účtů portálu: kdo je má dostat a s jakým oslovením.
//
// Vstupy leží mimo git a **nejsou nasazené**, protože nesou přístupové kódy
// v plaintextu a jména ředitelů:
//   data/portal/kody-plaintext.json   ← scripts/portal-generate-codes.js --out …
//   data/portal/pilot-kontakty.json   ← scripts/portal-vyber-pilotu.py --out …
// Administrace pozvánek proto funguje jen tam, kde ty soubory jsou, tedy
// lokálně. Na produkci vypíše, co chybí, a neodešle nic – to je záměr, ne vada:
// kdyby plaintext kódů ležel na serveru, celé hashování s pepřem ztrácí smysl.
// ============================================================================

const ROOT = process.cwd();
const PILOT = path.join(ROOT, 'data', 'portal', 'pilot.json');
const KODY = path.join(ROOT, 'data', 'portal', 'kody-plaintext.json');
const KONTAKTY = path.join(ROOT, 'data', 'portal', 'pilot-kontakty.json');

export interface RadekPozvanky {
  redizo: string;
  nazev: string;
  mesto: string;
  email: string;
  osloveni: string;
  maKod: boolean;
  pozvanka_odeslana: string | null;
}

export interface PrehledPozvanek {
  radky: RadekPozvanky[];
  /** Které vstupy chybí; s neprázdným seznamem se nedá odeslat nic. */
  chybi: string[];
  pocty: { celkem: number; kOdeslani: number; jizOdeslano: number; bezKodu: number; bezAdresy: number };
}

/**
 * Oslovení z ředitelova jména. České ženské příjmení končí na -ová nebo -á;
 * souhláska a přídavné -ý tedy znamenají muže. Zbylé samohlásky (Krejčí, Janů,
 * Svoboda, cizí jména na -a) rod neurčují a končí neutrálním pozdravem —
 * špatně oslovená ředitelka je horší než „Dobrý den“.
 */
export function osloveni(reditel: string | null | undefined): string {
  const casti = String(reditel || '')
    .split(/[\s,]+/)
    // Tituly nesou tečku („Mgr.“, „Ph.D.“, „CSc.“) a o rodu nic neříkají.
    .filter((c) => c && !c.includes('.'));
  const prijmeni = casti.pop() || '';
  if (/(ová|á)$/i.test(prijmeni)) return 'Vážená paní ředitelko';
  if (/(ý|[bcčdďfghjklmnňprřsštťvwxzž])$/i.test(prijmeni)) return 'Vážený pane řediteli';
  return 'Dobrý den';
}

async function ctiJson<T>(cesta: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(cesta, 'utf-8')) as T;
  } catch {
    return null;
  }
}

interface PilotSoubor {
  skoly: Array<{ redizo: string; nazev: string; mesto: string; pozvanka_odeslana: string | null }>;
}
interface KodySoubor {
  kody: Array<{ redizo: string; kod: string }>;
}
interface KontaktySoubor {
  skoly: Array<{ redizo: string; email_rejstrik: string; reditel: string }>;
}

export async function nactiPozvanky(): Promise<PrehledPozvanek> {
  const [pilot, kody, kontakty] = await Promise.all([
    ctiJson<PilotSoubor>(PILOT),
    ctiJson<KodySoubor>(KODY),
    ctiJson<KontaktySoubor>(KONTAKTY),
  ]);

  const chybi: string[] = [];
  if (!pilot) chybi.push('data/portal/pilot.json');
  if (!kody) chybi.push('data/portal/kody-plaintext.json (spusťte scripts/portal-generate-codes.js --out …)');
  if (!kontakty) chybi.push('data/portal/pilot-kontakty.json (spusťte scripts/portal-vyber-pilotu.py --out …)');

  const kodPodle = new Map((kody?.kody ?? []).map((k) => [String(k.redizo), k.kod]));
  const kontaktPodle = new Map((kontakty?.skoly ?? []).map((s) => [String(s.redizo), s]));

  const radky: RadekPozvanky[] = (pilot?.skoly ?? []).map((s) => {
    const kontakt = kontaktPodle.get(s.redizo);
    return {
      redizo: s.redizo,
      nazev: s.nazev,
      mesto: s.mesto,
      email: kontakt?.email_rejstrik ?? '',
      osloveni: osloveni(kontakt?.reditel),
      maKod: kodPodle.has(s.redizo),
      pozvanka_odeslana: s.pozvanka_odeslana ?? null,
    };
  });

  return {
    radky,
    chybi,
    pocty: {
      celkem: radky.length,
      kOdeslani: radky.filter((r) => !r.pozvanka_odeslana && r.maKod && r.email).length,
      jizOdeslano: radky.filter((r) => r.pozvanka_odeslana).length,
      bezKodu: radky.filter((r) => !r.maKod).length,
      bezAdresy: radky.filter((r) => !r.email).length,
    },
  };
}

/** Kód školy z plaintextu. Nikdy se nesmí dostat na veřejnou stránku. */
export async function kodProSkolu(redizo: string): Promise<string | null> {
  const kody = await ctiJson<KodySoubor>(KODY);
  return kody?.kody.find((k) => String(k.redizo) === redizo)?.kod ?? null;
}

/** Zapíše datum odeslání do pilot.json. Soubor patří do gitu, změnu je třeba commitnout. */
export async function zapisOdeslano(redizo: string[], datum: string): Promise<void> {
  const pilot = await ctiJson<PilotSoubor>(PILOT);
  if (!pilot) throw new Error('data/portal/pilot.json nejde přečíst.');
  for (const s of pilot.skoly) {
    if (redizo.includes(s.redizo)) s.pozvanka_odeslana = datum;
  }
  await fs.writeFile(PILOT, JSON.stringify(pilot, null, 1) + '\n');
}
