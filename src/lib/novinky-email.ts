import { odhlasovaciOdkaz } from './novinky-token.ts';

// ============================================================================
// Odesílání e-mailů novinek přes Resend
// (docs/novinky-k-prijimackam-2027.md, oddíl 6, kroky 5.5 a 7).
//
// Tělo dávky se skládá jednou, uloží se jako text a opakovaný pokus posílá
// tytéž bajty pod týmž klíčem idempotence. Každý e-mail nese značku (tag)
// s identifikátorem položky, aby se webhook dal spárovat i bez resend_id.
//
// Odesílá se z **hlavní domény** prijimackynaskolu.cz, která je nastavená
// a ověřená (rozhodnutí zadavatele 18. 9. 2026). Kvůli tomu sdílí novinky
// reputaci s odkazy portálu a hlášením chyb, takže je o to důležitější umět
// plošné zprávy pozastavit, zatímco provozní e-maily běží dál.
//
// Měření otevření a kliknutí se na doméně nezapíná; slib „v e-mailech
// neměříme“ stojí na nastavení domény, ne na jednotlivém volání.
// ============================================================================

export const ODESILATEL_NOVINKY = 'Přijímačky na školu <novinky@prijimackynaskolu.cz>';
const API_DAVKA = 'https://api.resend.com/emails/batch';

export interface ZpravaProAdresata {
  polozkaId: string;
  email: string;
  predmet: string;
  html: string;
  text: string;
  /** Token pro odhlášení jedním kliknutím; u potvrzení se nepoužívá. */
  odhlasovaciToken?: string;
}

export interface VysledekOdeslani {
  ok: boolean;
  /** Prokazatelně neodesláno (například 422), takže se smí vrátit do fronty. */
  jistaChyba: boolean;
  stav?: number;
  /** Identifikátory e-mailů v pořadí, v jakém byly v dávce. */
  idEmailu: string[];
  chyba?: string;
}

/**
 * Sestaví tělo požadavku jako **text**, ne objekt: `jsonb` v databázi
 * nezachovává pořadí klíčů ani mezery a opakovaný pokus musí poslat tytéž bajty.
 */
export function sestavTeloDavky(zpravy: ZpravaProAdresata[]): string {
  const polozky = zpravy.map((z) => {
    const hlavicky: Record<string, string> = {};
    if (z.odhlasovaciToken) {
      hlavicky['List-Unsubscribe'] = `<${odhlasovaciOdkaz(z.odhlasovaciToken)}>`;
      hlavicky['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    return {
      from: ODESILATEL_NOVINKY,
      to: [z.email],
      subject: z.predmet,
      html: z.html,
      text: z.text,
      headers: hlavicky,
      tags: [{ name: 'polozka', value: z.polozkaId }],
    };
  });
  return JSON.stringify(polozky);
}

/** Je odesílání nakonfigurované? Bez klíče se nic neposílá a nic se netvrdí. */
export function jeResendNastaven(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Odešle připravené tělo dávky. Klíč idempotence zajistí, že opakování téhož
 * požadavku nepošle e-maily dvakrát a vrátí původní odpověď.
 */
export async function odesliDavku(
  telo: string,
  klicIdempotence: string,
  apiKey = process.env.RESEND_API_KEY,
): Promise<VysledekOdeslani> {
  if (!apiKey) {
    return { ok: false, jistaChyba: true, idEmailu: [], chyba: 'RESEND_API_KEY není nastaven' };
  }
  let odpoved: Response;
  try {
    odpoved = await fetch(API_DAVKA, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': klicIdempotence,
      },
      body: telo,
    });
  } catch (chyba) {
    // Síťová chyba je **neznámý výsledek**, ne jistá chyba: požadavek mohl dojít.
    return { ok: false, jistaChyba: false, idEmailu: [], chyba: String(chyba) };
  }

  const text = await odpoved.text();
  if (odpoved.ok) {
    return { ok: true, jistaChyba: false, stav: odpoved.status, idEmailu: idZOdpovedi(text) };
  }
  // 4xx kromě 429 znamená, že Resend požadavek odmítl a nic neodeslal.
  const jistaChyba = odpoved.status >= 400 && odpoved.status < 500 && odpoved.status !== 429;
  return { ok: false, jistaChyba, stav: odpoved.status, idEmailu: [], chyba: text.slice(0, 500) };
}

/** Z odpovědi dávky vytáhne identifikátory e-mailů v jejich pořadí. */
export function idZOdpovedi(text: string): string[] {
  try {
    const data = JSON.parse(text) as { data?: Array<{ id?: string }> };
    return (data.data ?? []).map((r) => r.id ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

/** Kolik sekund čekat podle `Retry-After`, když Resend vrátí 429. */
export function pockejPodleRetryAfter(hlavicka: string | null, vychozi = 1): number {
  if (!hlavicka) return vychozi;
  const sekundy = Number(hlavicka);
  if (Number.isFinite(sekundy) && sekundy > 0) return Math.min(sekundy, 60);
  const datum = Date.parse(hlavicka);
  if (!Number.isNaN(datum)) return Math.min(Math.max(1, (datum - Date.now()) / 1000), 60);
  return vychozi;
}

/** Obálka e-mailu; texty se drží v repozitáři, ne v administraci Resendu. */
export function obalka(obsah: string, patickaOdkazy: string): string {
  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${obsah}
    <p style="color: #818c99; font-size: 13px; margin-top: 32px; border-top: 1px solid #e0e6ed; padding-top: 16px;">
      ${patickaOdkazy}<br>
      <a href="https://www.prijimackynaskolu.cz" style="color: #0074e4;">prijimackynaskolu.cz</a>
    </p>
  </div>
</body>
</html>`;
}
