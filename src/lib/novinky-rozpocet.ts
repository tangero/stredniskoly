import { createHash } from 'crypto';

// ============================================================================
// Období, rozpočet kvóty a klíč idempotence
// (docs/novinky-k-prijimackam-2027.md, oddíl 6, kroky 5.3 a 5.5).
//
// Čisté funkce bez databáze, aby se daly testovat samostatně. SQL, které je
// používá, je v novinky-fronta.ts.
// ============================================================================

/** Rezerva pro portál pro školy a hlášení chyb. Novinky pod ni nesmí sáhnout. */
export const REZERVA_PORTALU = 5000;

/** Kolik e-maily unese jedna dávka Resendu. */
export const DAVKA_MAX = 100;

/**
 * Jak dlouho před koncem období se dávka už nepředává. Bez tohoto pravidla by
 * první volání mohlo spadnout do období, pro které rezervace neplatí.
 */
export const OKNO_PRED_KONCEM_MS = 10 * 60 * 1000; // 10 minut

/** Okno, ve kterém Resend uzná opakování téhož klíče idempotence. */
export const OKNO_OPAKOVANI_MS = 24 * 60 * 60 * 1000;

/** Po této době bez výsledku se zkouší opakování. */
export const PRODLENI_PRED_OPAKOVANIM_MS = 6 * 60 * 60 * 1000;

export type UcelRozpoctu = 'celkem' | 'potvrzeni';

/**
 * Kolik potvrzovacích e-mailů smí odejít za jeden den.
 *
 * Je to pojistka proti nárazu, ne cíl: strop na měsíc drží řádek `celkem`
 * (kvóta tarifu bez rezervy portálu), takže dvě tisícovky denně se do měsíce
 * nevejdou a vázající zůstane měsíční strop. Denní limit má zabránit tomu, aby
 * jediný den — ať už zájmem, nebo robotem — spotřeboval kapacitu celého měsíce.
 *
 * 500 bylo na zkoušení; pro provoz to zvýšil zadavatel 18. 9. 2026 na 2000.
 */
export const DENNI_LIMIT_POTVRZENI = 2000;

/** Měsíční kvóta tarifu Resendu; z prostředí, aby se dala změnit bez nasazení. */
export function kvotaTarifu(): number {
  const z = Number(process.env.RESEND_MESICNI_KVOTA ?? '50000');
  return Number.isFinite(z) && z > 0 ? z : 50000;
}

/**
 * Limit, s jakým vzniká nový řádek rozpočtu. Musí být na jednom místě, protože
 * řádek zakládá jak cron, tak rezervace při přihlášení z formuláře.
 */
export function limitRozpoctu(ucel: UcelRozpoctu): number {
  return ucel === 'celkem' ? mesicniStrop(kvotaTarifu()) : DENNI_LIMIT_POTVRZENI;
}

/** Měsíční období pro strop všech e-mailů novinek, například `mesic:2027-01`. */
export function mesicniObdobi(kdy: Date): string {
  const rok = kdy.getUTCFullYear();
  const mesic = String(kdy.getUTCMonth() + 1).padStart(2, '0');
  return `mesic:${rok}-${mesic}`;
}

/** Denní období pro doplňkový limit potvrzení, například `den:2026-11-03`. */
export function denniObdobi(kdy: Date): string {
  return `den:${kdy.toISOString().slice(0, 10)}`;
}

/** Konec měsíčního období v UTC. */
export function konecMesice(kdy: Date): Date {
  return new Date(Date.UTC(kdy.getUTCFullYear(), kdy.getUTCMonth() + 1, 1));
}

/** Konec dne v UTC. */
export function konecDne(kdy: Date): Date {
  const d = new Date(kdy);
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

/**
 * Smí se dávka teď předat? V posledních 10 minutách období ne: předání se
 * odloží a rezervace se pořídí rovnou na následující období.
 */
export function smiSePredat(kdy: Date, ucel: UcelRozpoctu): boolean {
  const konec = ucel === 'potvrzeni' ? konecDne(kdy) : konecMesice(kdy);
  return konec.getTime() - kdy.getTime() > OKNO_PRED_KONCEM_MS;
}

/**
 * Období, do kterých se má rezervovat. Pro obsahové zprávy jen měsíční strop,
 * pro potvrzení měsíční i denní. Když je do konce období méně než okno, použije
 * se už období následující, protože v něm odeslání skutečně nastane.
 */
export function obdobiKRezervaci(
  kdy: Date,
  ucel: 'potvrzeni' | 'uvitani' | 'obsah' | 'vyzva',
): Array<{ obdobi: string; ucel: UcelRozpoctu }> {
  const casMesic = smiSePredat(kdy, 'celkem') ? kdy : konecMesice(kdy);
  const seznam: Array<{ obdobi: string; ucel: UcelRozpoctu }> = [
    { obdobi: mesicniObdobi(casMesic), ucel: 'celkem' },
  ];
  if (ucel === 'potvrzeni') {
    const casDen = smiSePredat(kdy, 'potvrzeni') ? kdy : konecDne(kdy);
    seznam.push({ obdobi: denniObdobi(casDen), ucel: 'potvrzeni' });
  }
  return seznam;
}

/** Měsíční strop novinek: kvóta tarifu bez rezervy portálu. */
export function mesicniStrop(kvotaTarifu: number, rezerva = REZERVA_PORTALU): number {
  return Math.max(0, kvotaTarifu - rezerva);
}

/**
 * Zbývá dost kvóty? Hlavička `x-resend-monthly-quota` udává **spotřebovanou**
 * kvótu, ne zbývající, proto se zbytek dopočítává.
 */
export function zbyvaKvota(kvotaTarifu: number, spotrebovano: number, rezerva = REZERVA_PORTALU): number {
  return Math.max(0, kvotaTarifu - rezerva - spotrebovano);
}

/** Otisk těla požadavku; počítá se nad hotovým textem, ne nad objektem. */
export function otiskTela(telo: string): string {
  return createHash('sha256').update(telo).digest('hex');
}

/** Otisk složení dávky ze setříděných identifikátorů položek. */
export function otiskClenu(idPolozek: string[]): string {
  return createHash('sha256').update([...idPolozek].sort().join(',')).digest('hex');
}

/**
 * Klíč idempotence. Obsahuje otisk těla, takže jiné tělo znamená jiný klíč
 * a Resend nemůže vrátit `invalid_idempotent_request`.
 */
export function klicIdempotence(zprava: string, otiskTelaHex: string): string {
  return `${zprava}/${otiskTelaHex.slice(0, 32)}`;
}

/** Identifikátor zprávy vždy nese ročník, aby nekolidoval mezi roky. */
export function identifikatorZpravy(rocnik: string, nazev: string): string {
  return `novinky/${rocnik}/${nazev}`;
}
