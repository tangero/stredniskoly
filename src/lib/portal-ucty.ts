import { randomUUID } from 'crypto';
import type { Spojeni } from './novinky-db.ts';

// ============================================================================
// Účty portálu pro školy: role správce a editora (docs/ucty-portalu-skol-2027.md).
//
// Záznam se nikdy nepřepisuje. Změna = starý řádek dostane `zneplatneno`,
// nový řádek nese `nahrazuje_id`, `zmenu_provedl` a `duvod`. Obojí v jedné
// transakci, kterou dodává volající (`vTransakci`), aby šly funkce testovat
// nad podvrženým spojením.
//
// Jeden platný správce na školu hlídá unikátní index; kolizi převádíme na
// srozumitelnou chybu `SkolaMaSpravce`, ne na 500.
// ============================================================================

export type RoleTyp = 'spravce' | 'editor';

export interface PortalRole {
  id: string;
  redizo: string;
  osoba_id: string;
  role: RoleTyp;
  email: string;
  jmeno: string;
  funkce: string;
  zverejnit_jmeno: boolean;
  platne_od: string;
  zneplatneno: string | null;
  nahrazuje_id: string | null;
  zmenu_provedl: string;
  duvod: string | null;
}

export interface UdajeOsoby {
  email: string;
  jmeno: string;
  funkce: string;
  zverejnit_jmeno: boolean;
}

export type KodChyby =
  | 'skola_ma_spravce'
  | 'kod_uplatnen'
  | 'role_neplatna'
  | 'pozvanka_neplatna'
  | 'uz_ma_roli'
  | 'posledni_spravce'
  | 'neplatne_udaje';

/** Chyba s hláškou pro uživatele. Bez parameter properties: testy běží přes strip-types. */
export class PortalChyba extends Error {
  readonly kod: KodChyby;
  constructor(kod: KodChyby, zprava: string) {
    super(zprava);
    this.kod = kod;
  }
}

const UNIKATNI_PORUSENI = '23505';

function jeKolize(chyba: unknown, index?: string): boolean {
  const c = chyba as { code?: string; constraint?: string; message?: string };
  if (c?.code !== UNIKATNI_PORUSENI) return false;
  if (!index) return true;
  return c.constraint === index || Boolean(c.message?.includes(index));
}

// ----------------------------------------------------------------------------
// Validace údajů osoby
// ----------------------------------------------------------------------------

export const MAX_JMENO = 120;
export const MAX_FUNKCE = 120;

export function normalizujEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function jePlatnyEmail(email: string): boolean {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Ověří a očistí údaje z formuláře; vrací chybovou hlášku pro uživatele. */
export function overUdajeOsoby(
  vstup: Record<string, unknown>,
): { ok: true; udaje: UdajeOsoby } | { ok: false; chyba: string } {
  const email = normalizujEmail(typeof vstup.email === 'string' ? vstup.email : '');
  const jmeno = typeof vstup.jmeno === 'string' ? vstup.jmeno.trim().replace(/\s+/g, ' ') : '';
  const funkce = typeof vstup.funkce === 'string' ? vstup.funkce.trim().replace(/\s+/g, ' ') : '';
  if (!jePlatnyEmail(email)) return { ok: false, chyba: 'Zadejte platnou e-mailovou adresu.' };
  if (jmeno.length < 3 || !jmeno.includes(' ')) {
    return { ok: false, chyba: 'Zadejte jméno a příjmení.' };
  }
  if (jmeno.length > MAX_JMENO) return { ok: false, chyba: 'Jméno je příliš dlouhé.' };
  if (funkce.length > MAX_FUNKCE) return { ok: false, chyba: 'Funkce je příliš dlouhá.' };
  return { ok: true, udaje: { email, jmeno, funkce, zverejnit_jmeno: vstup.zverejnit_jmeno === true } };
}

// ----------------------------------------------------------------------------
// Čtení
// ----------------------------------------------------------------------------

const SLOUPCE = `id, redizo, osoba_id, role, email, jmeno, funkce, zverejnit_jmeno,
  platne_od, zneplatneno, nahrazuje_id, zmenu_provedl, duvod`;

export async function platneRoleOsoby(s: Spojeni, osobaId: string): Promise<PortalRole[]> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where osoba_id = $1 and zneplatneno is null order by redizo`,
    [osobaId],
  );
  return r.rows;
}

export async function platneRoleSkoly(s: Spojeni, redizo: string): Promise<PortalRole[]> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where redizo = $1 and zneplatneno is null
      order by (role = 'spravce') desc, platne_od`,
    [redizo],
  );
  return r.rows;
}

export async function spravceSkoly(s: Spojeni, redizo: string): Promise<PortalRole | null> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where redizo = $1 and role = 'spravce' and zneplatneno is null`,
    [redizo],
  );
  return r.rows[0] ?? null;
}

/** Osoby s platnou rolí podle e-mailu (přihlášení odkazem na vlastní adresu). */
export async function osobyPodleEmailu(s: Spojeni, email: string): Promise<string[]> {
  const r = await s.dotaz<{ osoba_id: string }>(
    `select distinct osoba_id from portal_role where lower(email) = $1 and zneplatneno is null`,
    [normalizujEmail(email)],
  );
  return r.rows.map((x) => x.osoba_id);
}

export async function roleProOsobuVeSkole(
  s: Spojeni,
  osobaId: string,
  redizo: string,
): Promise<PortalRole | null> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where osoba_id = $1 and redizo = $2 and zneplatneno is null`,
    [osobaId, redizo],
  );
  return r.rows[0] ?? null;
}

export async function historieSkoly(s: Spojeni, redizo: string): Promise<PortalRole[]> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where redizo = $1 order by platne_od, id`,
    [redizo],
  );
  return r.rows;
}

// ----------------------------------------------------------------------------
// Události (provozní stopa pro /admin a Telegram)
// ----------------------------------------------------------------------------

export type TypUdalosti =
  | 'kod_uplatnen'
  | 'spravce_z_rejstriku'
  | 'prihlaseni'
  | 'odkaz_vyzadan'
  | 'host_z_rejstriku'
  | 'navrh_odeslan'
  | 'pozvanka_odeslana'
  | 'pozvanka_prijata'
  | 'pozvanka_zrusena'
  | 'role_zmenena'
  | 'role_zrusena'
  | 'spravce_predan'
  | 'spravce_dosazen'
  | 'osoba_anonymizovana';

export async function zapisUdalost(
  s: Spojeni,
  redizo: string,
  roleId: string | null,
  typ: TypUdalosti,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await s.dotaz(
    `insert into portal_udalost (id, redizo, role_id, typ, detail) values ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), redizo, roleId, typ, JSON.stringify(detail)],
  );
}

// ----------------------------------------------------------------------------
// Vznik role
// ----------------------------------------------------------------------------

async function vlozRoli(
  s: Spojeni,
  z: {
    redizo: string;
    osobaId: string;
    role: RoleTyp;
    udaje: UdajeOsoby;
    zmenuProvedl: string;
    duvod?: string | null;
    nahrazujeId?: string | null;
  },
): Promise<PortalRole> {
  const id = randomUUID();
  const r = await s.dotaz<PortalRole>(
    `insert into portal_role
       (id, redizo, osoba_id, role, email, jmeno, funkce, zverejnit_jmeno, zmenu_provedl, duvod, nahrazuje_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning ${SLOUPCE}`,
    [
      id,
      z.redizo,
      z.osobaId,
      z.role,
      z.udaje.email,
      z.udaje.jmeno,
      z.udaje.funkce,
      z.role === 'spravce' ? z.udaje.zverejnit_jmeno : false,
      z.zmenuProvedl,
      z.duvod ?? null,
      z.nahrazujeId ?? null,
    ],
  );
  return r.rows[0];
}

/**
 * Stávající osoba se stejným e-mailem (např. správce dvou škol) si ponechá
 * osoba_id, aby měla jedno přihlášení. Jinak vzniká nová osoba.
 */
async function osobaProEmail(s: Spojeni, email: string): Promise<string> {
  // Hledá se i v zneplatněných záznamech: člověk, kterého admin znovu dosadí,
  // má zůstat stejnou osobou a mít souvislou historii.
  const r = await s.dotaz<{ osoba_id: string }>(
    `select osoba_id from portal_role where lower(email) = $1 order by platne_od desc limit 1`,
    [normalizujEmail(email)],
  );
  return r.rows[0]?.osoba_id ?? randomUUID();
}

/**
 * Uplatnění přihlašovacího kódu: vznikne správce a kód se spotřebuje.
 * Volat uvnitř transakce. Kód musí být předem ověřený proti data/portal/kody.json.
 */
export async function uplatniKod(
  s: Spojeni,
  kodHash: string,
  redizo: string,
  udaje: UdajeOsoby,
): Promise<PortalRole> {
  const pouzity = await s.dotaz(`select 1 from portal_kod_uplatneni where kod_hash = $1`, [kodHash]);
  if (pouzity.rowCount > 0) throw new PortalChyba('kod_uplatnen', 'Tento kód už byl uplatněn.');
  if (await spravceSkoly(s, redizo)) {
    throw new PortalChyba('skola_ma_spravce', 'Škola už správce profilu má. Požádejte ho o pozvání.');
  }
  let role: PortalRole;
  try {
    role = await vlozRoli(s, {
      redizo,
      osobaId: await osobaProEmail(s, udaje.email),
      role: 'spravce',
      udaje,
      zmenuProvedl: 'kod',
    });
    await s.dotaz(
      `insert into portal_kod_uplatneni (kod_hash, redizo, role_id) values ($1, $2, $3)`,
      [kodHash, redizo, role.id],
    );
  } catch (chyba) {
    if (jeKolize(chyba, 'portal_kod_uplatneni_pkey')) {
      throw new PortalChyba('kod_uplatnen', 'Tento kód už byl uplatněn.');
    }
    if (jeKolize(chyba)) {
      throw new PortalChyba('skola_ma_spravce', 'Škola už správce profilu má. Požádejte ho o pozvání.');
    }
    throw chyba;
  }
  await zapisUdalost(s, redizo, role.id, 'kod_uplatnen', { jmeno: role.jmeno, funkce: role.funkce, email: role.email });
  return role;
}

/** Škola bez správce: rejstříková adresa má stejnou váhu jako kód (§2.2). */
export async function zalozSpravceZRejstriku(
  s: Spojeni,
  redizo: string,
  udaje: UdajeOsoby,
  rejstrikovyEmail: string,
): Promise<PortalRole> {
  if (await spravceSkoly(s, redizo)) {
    throw new PortalChyba('skola_ma_spravce', 'Škola už správce profilu má. Požádejte ho o pozvání.');
  }
  let role: PortalRole;
  try {
    role = await vlozRoli(s, {
      redizo,
      osobaId: await osobaProEmail(s, udaje.email),
      role: 'spravce',
      udaje,
      zmenuProvedl: 'rejstrik-odkaz',
      duvod: `odkaz na ${normalizujEmail(rejstrikovyEmail)}`,
    });
  } catch (chyba) {
    if (jeKolize(chyba)) {
      throw new PortalChyba('skola_ma_spravce', 'Škola už správce profilu má. Požádejte ho o pozvání.');
    }
    throw chyba;
  }
  await zapisUdalost(s, redizo, role.id, 'spravce_z_rejstriku', {
    jmeno: role.jmeno,
    funkce: role.funkce,
    email: role.email,
  });
  return role;
}

// ----------------------------------------------------------------------------
// Změna a zrušení role: nový záznam zneplatní starší
// ----------------------------------------------------------------------------

async function zamkniPlatnou(s: Spojeni, roleId: string): Promise<PortalRole> {
  const r = await s.dotaz<PortalRole>(
    `select ${SLOUPCE} from portal_role where id = $1 and zneplatneno is null for update`,
    [roleId],
  );
  const role = r.rows[0];
  if (!role) throw new PortalChyba('role_neplatna', 'Záznam mezitím změnil někdo jiný. Načtěte stránku znovu.');
  return role;
}

async function zneplatni(s: Spojeni, roleId: string): Promise<void> {
  await s.dotaz(`update portal_role set zneplatneno = now() where id = $1 and zneplatneno is null`, [roleId]);
}

/** Které údaje se mezi dvěma záznamy liší (pro časovou osu a Telegram). */
export function rozdilRoli(stary: PortalRole, novy: PortalRole): Record<string, [unknown, unknown]> {
  const pole = ['role', 'email', 'jmeno', 'funkce', 'zverejnit_jmeno'] as const;
  const rozdil: Record<string, [unknown, unknown]> = {};
  for (const p of pole) {
    if (stary[p] !== novy[p]) rozdil[p] = [stary[p], novy[p]];
  }
  return rozdil;
}

/**
 * Změna e-mailu, jména, funkce nebo souhlasu. Osoba zůstává stejná (osoba_id),
 * starý záznam dostane `zneplatneno`. `zmenuProvedl` je `sam` nebo `admin:<kdo>`.
 */
export async function zmenRoli(
  s: Spojeni,
  roleId: string,
  zmeny: Partial<UdajeOsoby>,
  zmenuProvedl: string,
  duvod: string | null = null,
): Promise<PortalRole> {
  if (zmenuProvedl.startsWith('admin') && !duvod?.trim()) {
    throw new PortalChyba('neplatne_udaje', 'Změna v administraci musí mít důvod.');
  }
  const stara = await zamkniPlatnou(s, roleId);
  const udaje: UdajeOsoby = {
    email: zmeny.email !== undefined ? normalizujEmail(zmeny.email) : stara.email,
    jmeno: zmeny.jmeno ?? stara.jmeno,
    funkce: zmeny.funkce ?? stara.funkce,
    zverejnit_jmeno: zmeny.zverejnit_jmeno ?? stara.zverejnit_jmeno,
  };
  await zneplatni(s, stara.id);
  const nova = await vlozRoli(s, {
    redizo: stara.redizo,
    osobaId: stara.osoba_id,
    role: stara.role,
    udaje,
    zmenuProvedl,
    duvod,
    nahrazujeId: stara.id,
  });
  await zapisUdalost(s, nova.redizo, nova.id, 'role_zmenena', {
    provedl: zmenuProvedl,
    duvod,
    zmeny: rozdilRoli(stara, nova),
  });
  return nova;
}

/** Zrušení role editora (správcem nebo adminem). Správce se ruší jen předáním nebo dosazením. */
export async function zrusRoli(
  s: Spojeni,
  roleId: string,
  zmenuProvedl: string,
  duvod: string | null = null,
): Promise<void> {
  if (zmenuProvedl.startsWith('admin') && !duvod?.trim()) {
    throw new PortalChyba('neplatne_udaje', 'Zrušení v administraci musí mít důvod.');
  }
  const role = await zamkniPlatnou(s, roleId);
  if (role.role === 'spravce') {
    throw new PortalChyba('posledni_spravce', 'Správce nejde zrušit, jen předat nebo nahradit.');
  }
  await zneplatni(s, role.id);
  await zapisUdalost(s, role.redizo, role.id, 'role_zrusena', { provedl: zmenuProvedl, duvod, jmeno: role.jmeno });
}

/**
 * Předání správcovství editorovi téže školy. Starý správce zůstane editorem
 * (nový záznam), editor dostane nový záznam správce. Pořadí je dané unikátním
 * indexem: nejdřív zneplatnit starého správce, pak vložit nového.
 */
export async function predejSpravcovstvi(
  s: Spojeni,
  spravceRoleId: string,
  editorRoleId: string,
  zmenuProvedl: string,
  duvod: string | null = null,
): Promise<PortalRole> {
  const spravce = await zamkniPlatnou(s, spravceRoleId);
  const editor = await zamkniPlatnou(s, editorRoleId);
  if (spravce.role !== 'spravce' || editor.role !== 'editor' || spravce.redizo !== editor.redizo) {
    throw new PortalChyba('neplatne_udaje', 'Správcovství jde předat jen editorovi téže školy.');
  }
  await zneplatni(s, spravce.id);
  await zneplatni(s, editor.id);
  await vlozRoli(s, {
    redizo: spravce.redizo,
    osobaId: spravce.osoba_id,
    role: 'editor',
    udaje: { ...spravce, zverejnit_jmeno: false },
    zmenuProvedl,
    duvod,
    nahrazujeId: spravce.id,
  });
  const novy = await vlozRoli(s, {
    redizo: editor.redizo,
    osobaId: editor.osoba_id,
    role: 'spravce',
    // Souhlas se zveřejněním dává každý správce sám, nepřebírá se.
    udaje: { ...editor, zverejnit_jmeno: false },
    zmenuProvedl,
    duvod,
    nahrazujeId: editor.id,
  });
  await zapisUdalost(s, novy.redizo, novy.id, 'spravce_predan', {
    provedl: zmenuProvedl,
    duvod,
    od: spravce.jmeno,
    na: novy.jmeno,
  });
  return novy;
}

/**
 * Administrace: dosadí nového správce. Dosavadní správce se zneplatní
 * (volitelně zůstane editorem). Nová osoba se pozná podle e-mailu.
 */
export async function dosadSpravce(
  s: Spojeni,
  redizo: string,
  udaje: UdajeOsoby,
  kdo: string,
  duvod: string,
  puvodniZustaneEditorem: boolean,
): Promise<PortalRole> {
  if (!duvod.trim()) throw new PortalChyba('neplatne_udaje', 'Dosazení správce musí mít důvod.');
  const zmenuProvedl = `admin:${kdo}`;
  const puvodni = await spravceSkoly(s, redizo);
  if (puvodni) {
    await zamkniPlatnou(s, puvodni.id);
    await zneplatni(s, puvodni.id);
    if (puvodniZustaneEditorem && normalizujEmail(puvodni.email) !== udaje.email) {
      await vlozRoli(s, {
        redizo,
        osobaId: puvodni.osoba_id,
        role: 'editor',
        udaje: { ...puvodni, zverejnit_jmeno: false },
        zmenuProvedl,
        duvod,
        nahrazujeId: puvodni.id,
      });
    }
  }
  // Nová osoba může být editorem téže školy: její editorský záznam nahradíme.
  const osobaId = await osobaProEmail(s, udaje.email);
  const dosavadni = await roleProOsobuVeSkole(s, osobaId, redizo);
  if (dosavadni) await zneplatni(s, dosavadni.id);
  const novy = await vlozRoli(s, {
    redizo,
    osobaId,
    role: 'spravce',
    udaje,
    zmenuProvedl,
    duvod,
    nahrazujeId: dosavadni?.id ?? puvodni?.id ?? null,
  });
  await zapisUdalost(s, redizo, novy.id, 'spravce_dosazen', {
    provedl: zmenuProvedl,
    duvod,
    puvodni: puvodni?.jmeno ?? null,
    novy: novy.jmeno,
  });
  return novy;
}

// ----------------------------------------------------------------------------
// Pozvánky
// ----------------------------------------------------------------------------

export const POZVANKA_PLATNOST_DNI = 7;

export interface PortalPozvanka {
  id: string;
  redizo: string;
  email: string;
  role: RoleTyp;
  pozval_role_id: string | null;
  vytvoreno: string;
  plati_do: string;
  prijato: string | null;
  zruseno: string | null;
}

export async function vytvorPozvanku(
  s: Spojeni,
  pozval: PortalRole,
  email: string,
): Promise<PortalPozvanka> {
  if (pozval.role !== 'spravce') {
    throw new PortalChyba('neplatne_udaje', 'Kolegy zve správce profilu.');
  }
  const cisty = normalizujEmail(email);
  if (!jePlatnyEmail(cisty)) throw new PortalChyba('neplatne_udaje', 'Zadejte platnou e-mailovou adresu.');
  const maRoli = await s.dotaz(
    `select 1 from portal_role where redizo = $1 and lower(email) = $2 and zneplatneno is null`,
    [pozval.redizo, cisty],
  );
  if (maRoli.rowCount > 0) throw new PortalChyba('uz_ma_roli', 'Tato adresa už k profilu školy přístup má.');
  const r = await s.dotaz<PortalPozvanka>(
    `insert into portal_pozvanka (id, redizo, email, role, pozval_role_id, plati_do)
     values ($1, $2, $3, 'editor', $4, now() + ($5 || ' days')::interval)
     returning id, redizo, email, role, pozval_role_id, vytvoreno, plati_do, prijato, zruseno`,
    [randomUUID(), pozval.redizo, cisty, pozval.id, String(POZVANKA_PLATNOST_DNI)],
  );
  const pozvanka = r.rows[0];
  await zapisUdalost(s, pozval.redizo, pozval.id, 'pozvanka_odeslana', { email: cisty, pozvanka: pozvanka.id });
  return pozvanka;
}

export async function nactiPozvanku(s: Spojeni, id: string): Promise<PortalPozvanka | null> {
  const r = await s.dotaz<PortalPozvanka>(
    `select id, redizo, email, role, pozval_role_id, vytvoreno, plati_do, prijato, zruseno
       from portal_pozvanka
      where id = $1 and prijato is null and zruseno is null and plati_do > now()`,
    [id],
  );
  return r.rows[0] ?? null;
}

export async function otevrenePozvanky(s: Spojeni, redizo: string): Promise<PortalPozvanka[]> {
  const r = await s.dotaz<PortalPozvanka>(
    `select id, redizo, email, role, pozval_role_id, vytvoreno, plati_do, prijato, zruseno
       from portal_pozvanka
      where redizo = $1 and prijato is null and zruseno is null and plati_do > now()
      order by vytvoreno`,
    [redizo],
  );
  return r.rows;
}

/** Přijetí pozvánky: e-mail je daný pozvánkou, jméno a funkci doplní pozvaný. */
export async function prijmiPozvanku(
  s: Spojeni,
  pozvankaId: string,
  jmeno: string,
  funkce: string,
): Promise<PortalRole> {
  const r = await s.dotaz<PortalPozvanka>(
    `select id, redizo, email, role, pozval_role_id, vytvoreno, plati_do, prijato, zruseno
       from portal_pozvanka
      where id = $1 and prijato is null and zruseno is null and plati_do > now()
      for update`,
    [pozvankaId],
  );
  const pozvanka = r.rows[0];
  if (!pozvanka) throw new PortalChyba('pozvanka_neplatna', 'Pozvánka už neplatí.');
  const overeno = overUdajeOsoby({ email: pozvanka.email, jmeno, funkce });
  if (!overeno.ok) throw new PortalChyba('neplatne_udaje', overeno.chyba);
  let role: PortalRole;
  try {
    role = await vlozRoli(s, {
      redizo: pozvanka.redizo,
      osobaId: await osobaProEmail(s, pozvanka.email),
      role: 'editor',
      udaje: overeno.udaje,
      zmenuProvedl: `pozvanka:${pozvanka.id}`,
    });
  } catch (chyba) {
    if (jeKolize(chyba)) throw new PortalChyba('uz_ma_roli', 'K profilu této školy už přístup máte.');
    throw chyba;
  }
  await s.dotaz(`update portal_pozvanka set prijato = now(), prijal_role_id = $2 where id = $1`, [
    pozvanka.id,
    role.id,
  ]);
  await zapisUdalost(s, pozvanka.redizo, role.id, 'pozvanka_prijata', { jmeno: role.jmeno, pozvanka: pozvanka.id });
  return role;
}

export async function zrusPozvanku(s: Spojeni, pozvankaId: string, redizo: string, kdo: PortalRole | string) {
  const r = await s.dotaz(
    `update portal_pozvanka set zruseno = now() where id = $1 and redizo = $2 and prijato is null and zruseno is null`,
    [pozvankaId, redizo],
  );
  if (r.rowCount > 0) {
    await zapisUdalost(s, redizo, typeof kdo === 'string' ? null : kdo.id, 'pozvanka_zrusena', {
      pozvanka: pozvankaId,
      provedl: typeof kdo === 'string' ? kdo : 'spravce',
    });
  }
}

// ----------------------------------------------------------------------------
// Jednorázové odkazy
// ----------------------------------------------------------------------------

/** Spotřebuje nonce odkazu; vrací false, když už byl odkaz použitý. */
export async function spotrebujOdkaz(s: Spojeni, nonce: string, ucel: string): Promise<boolean> {
  const r = await s.dotaz(
    `insert into portal_odkaz (nonce, ucel) values ($1, $2) on conflict (nonce) do nothing`,
    [nonce, ucel],
  );
  return r.rowCount === 1;
}

// ----------------------------------------------------------------------------
// Výmaz osobních údajů na žádost (oddíl 7): platné role se zneplatní,
// jméno a e-mail se v celé historii osoby nahradí zástupným textem.
// ----------------------------------------------------------------------------

export async function anonymizujOsobu(s: Spojeni, osobaId: string, kdo: string, duvod: string): Promise<number> {
  if (!duvod.trim()) throw new PortalChyba('neplatne_udaje', 'Výmaz musí mít důvod.');
  const role = await s.dotaz<PortalRole>(`select ${SLOUPCE} from portal_role where osoba_id = $1`, [osobaId]);
  if (role.rows.some((r) => r.role === 'spravce' && r.zneplatneno === null)) {
    throw new PortalChyba('posledni_spravce', 'Nejdřív dosaďte škole jiného správce.');
  }
  await s.dotaz(
    `update portal_role
        set zneplatneno = coalesce(zneplatneno, now()),
            email = 'vymazano+' || left(id::text, 8) || '@invalid',
            jmeno = 'editor školy', funkce = '', zverejnit_jmeno = false
      where osoba_id = $1`,
    [osobaId],
  );
  for (const redizo of new Set(role.rows.map((r) => r.redizo))) {
    await zapisUdalost(s, redizo, null, 'osoba_anonymizovana', { provedl: `admin:${kdo}`, duvod });
  }
  return role.rowCount;
}

// ----------------------------------------------------------------------------
// Veřejné zobrazení: kdo profil spravuje
// ----------------------------------------------------------------------------

export interface VerejnySpravce {
  redizo: string;
  jmeno: string | null;
  funkce: string | null;
  od: string;
}

/** Všichni platní správci; jméno jen se souhlasem. Jedním dotazem pro celý web. */
export async function verejniSpravci(s: Spojeni): Promise<VerejnySpravce[]> {
  const r = await s.dotaz<{ redizo: string; jmeno: string; funkce: string; zverejnit_jmeno: boolean; od: string }>(
    `select redizo, jmeno, funkce, zverejnit_jmeno,
            (select min(p.platne_od) from portal_role p
              where p.redizo = r.redizo and p.osoba_id = r.osoba_id and p.role = 'spravce') as od
       from portal_role r
      where role = 'spravce' and zneplatneno is null`,
  );
  return r.rows.map((x) => ({
    redizo: x.redizo,
    jmeno: x.zverejnit_jmeno ? x.jmeno : null,
    funkce: x.zverejnit_jmeno ? x.funkce || null : null,
    od: new Date(x.od).toISOString(),
  }));
}
