import { promises as fs } from 'fs';
import path from 'path';
import { adresaPrehledu } from '@/lib/adresa-oboru.mjs';
import { getSchoolsByRedizo } from '@/lib/data';

// ============================================================================
// Identifikace školy na vstupu do portálu (docs/ucty-portalu-skol-2027.md, 2.2).
// Kdo uplatňuje kód nebo odkaz, musí poznat, ke které škole se hlásí: katalog
// nese jen zkrácený název („Gymnázium“), plný název a IČO jsou v rejstříku.
// ============================================================================

export interface IdentifikaceSkoly {
  redizo: string;
  nazev: string;
  ico: string;
  adresa: string;
  profil: string | null;
}

interface ZaznamRejstriku {
  uplny_nazev: string;
  ico: string;
  adresa: string;
}

async function nactiZRejstriku(redizo: string): Promise<ZaznamRejstriku | null> {
  try {
    const obsah = await fs.readFile(path.join(process.cwd(), 'data', 'msmt_rejstrik', 'nazvy-oboru.json'), 'utf-8');
    const index = JSON.parse(obsah) as { identifikace?: Record<string, ZaznamRejstriku> };
    return index.identifikace?.[redizo] ?? null;
  } catch (e) {
    console.error('❌ Portál: data/msmt_rejstrik/nazvy-oboru.json nejde načíst', e);
    return null;
  }
}

/** Plný název, IČO a adresa z rejstříku; bez záznamu v rejstříku název a adresa z katalogu. */
/** Nabídky školy z katalogu; chybějící nebo poškozený katalog není důvod selhat. */
async function nactiNabidky(redizo: string) {
  try {
    return await getSchoolsByRedizo(redizo);
  } catch (e) {
    console.error('❌ Portál: katalog škol nejde načíst', e);
    return [];
  }
}

export async function getIdentifikaceSkoly(redizo: string, nazevKatalog: string): Promise<IdentifikaceSkoly> {
  const [rejstrik, nabidky] = await Promise.all([nactiZRejstriku(redizo), nactiNabidky(redizo)]);
  const prvni = nabidky[0];
  return {
    redizo,
    nazev: rejstrik?.uplny_nazev || nazevKatalog,
    ico: rejstrik?.ico || '',
    adresa: rejstrik?.adresa || prvni?.adresa || '',
    profil: prvni ? `/skola/${adresaPrehledu(redizo, prvni.nazev)}` : null,
  };
}
