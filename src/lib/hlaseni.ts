import { randomUUID } from 'crypto';
import type { Spojeni } from './novinky-db.ts';

// ============================================================================
// Hlášení chyb od návštěvníků (tlačítko „Nahlásit chybu“).
//
// Kontaktní e-mail oznamovatele je osobní údaj a repozitář je veřejný, takže
// do GitHub issue nesmí. Issue nese popis chyby, adresa žije tady a v `/admin`.
// Totéž pravidlo, jaké u portálu vzešlo z review PR #111, nález 1.
// ============================================================================

export interface Hlaseni {
  id: string;
  vytvoreno: string;
  email: string;
  popis: string;
  url: string;
  redizo: string | null;
  issue: number | null;
  vyrizeno: string | null;
  poznamka: string | null;
}

/**
 * REDIZO ze stránky, ze které se hlásilo. Slug školy i oboru začíná REDIZO
 * (`/skola/600171701-gymnazium…`), takže se hlášení dá přiřadit ke škole bez
 * toho, aby ho oznamovatel vybíral z číselníku.
 */
export function redizoZUrl(url: string): string | null {
  const m = /\/skola\/(\d{9,10})-/.exec(url || '');
  return m ? m[1] : null;
}

/**
 * Zapíše hlášení **dřív**, než se zakládá issue. Kontakt je povinný a od chvíle,
 * kdy přestal chodit do veřejného issue, je databáze jeho jediným trvalým
 * místem; kdyby se zapisoval až po GitHubu, selhání zápisu by ho ztratilo
 * a oznamovatel by přitom dostal potvrzení. Číslo issue se doplní potom.
 */
export async function zapisHlaseni(
  s: Spojeni,
  z: { email: string; popis: string; url: string; redizo?: string | null },
): Promise<string> {
  const id = randomUUID();
  await s.dotaz(
    `insert into hlaseni_chyby (id, email, popis, url, redizo) values ($1, $2, $3, $4, $5)`,
    [id, z.email, z.popis, z.url, z.redizo ?? redizoZUrl(z.url)],
  );
  return id;
}

/** Doplní číslo issue k už uloženému hlášení. Selhání nesmí hlášení zahodit. */
export async function propojIssue(s: Spojeni, id: string, issue: number): Promise<void> {
  await s.dotaz(`update hlaseni_chyby set issue = $2 where id = $1`, [id, issue]);
}

/**
 * `timestamptz` vrací ovladač Neonu jako `Date`, PGlite jako řetězec. Rozhraní
 * slibuje řetězec a stránka administrace ho rovnou vykresluje, takže se
 * sjednocuje tady — jinak React spadne na „Objects are not valid as a React child“.
 */
function naIso(hodnota: unknown): string | null {
  if (!hodnota) return null;
  return hodnota instanceof Date ? hodnota.toISOString() : String(hodnota);
}

function normalizuj(r: Hlaseni): Hlaseni {
  return { ...r, vytvoreno: naIso(r.vytvoreno) ?? '', vyrizeno: naIso(r.vyrizeno) };
}

/** Nevyřízená hlášení pro administraci, od nejnovějšího. */
export async function otevrenaHlaseni(s: Spojeni, limit = 50): Promise<Hlaseni[]> {
  const r = await s.dotaz<Hlaseni>(
    `select * from hlaseni_chyby where vyrizeno is null order by vytvoreno desc limit $1`,
    [limit],
  );
  return r.rows.map(normalizuj);
}

export async function vyridHlaseni(s: Spojeni, id: string, poznamka: string): Promise<void> {
  await s.dotaz(`update hlaseni_chyby set vyrizeno = now(), poznamka = $2 where id = $1`, [id, poznamka]);
}

/**
 * Výmaz kontaktu na žádost. Adresa se nahradí zástupným textem, hlášení samo
 * zůstane – je to podnět k opravě dat, ne osobní údaj. Vrací počet záznamů.
 */
export async function anonymizujHlaseni(s: Spojeni, email: string): Promise<number> {
  const r = await s.dotaz(
    `update hlaseni_chyby set email = 'smazáno na žádost' where lower(email) = lower($1)`,
    [email],
  );
  return r.rowCount;
}
