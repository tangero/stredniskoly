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

// Index má skoro megabajt a `JSON.parse` je synchronní, takže každé čtení na tu
// dobu zastaví celou instanci — a visí na veřejném neautentizovaném
// /api/portal/kod. Cachuje se příslib, ne hodnota, aby souběžné požadavky
// nespustily tolik čtení, kolik jich přijde, než první dobehne.
let rejstrikCache: Promise<Record<string, ZaznamRejstriku>> | null = null;

function nactiRejstrik(): Promise<Record<string, ZaznamRejstriku>> {
  if (!rejstrikCache) {
    rejstrikCache = fs
      .readFile(path.join(process.cwd(), 'data', 'msmt_rejstrik', 'nazvy-oboru.json'), 'utf-8')
      .then((obsah) => (JSON.parse(obsah) as { identifikace?: Record<string, ZaznamRejstriku> }).identifikace ?? {})
      .catch((e) => {
        rejstrikCache = null; // ať se po výpadku dá zkusit znovu
        throw e;
      });
  }
  return rejstrikCache;
}

async function nactiZRejstriku(redizo: string): Promise<ZaznamRejstriku | null> {
  try {
    return (await nactiRejstrik())[redizo] ?? null;
  } catch (e) {
    console.error('❌ Portál: data/msmt_rejstrik/nazvy-oboru.json nejde načíst', e);
    return null;
  }
}

/** Nabídky školy z katalogu; chybějící nebo poškozený katalog není důvod selhat. */
async function nactiNabidky(redizo: string) {
  try {
    return await getSchoolsByRedizo(redizo);
  } catch (e) {
    console.error('❌ Portál: katalog škol nejde načíst', e);
    return [];
  }
}

/** Plný název, IČO a adresa z rejstříku; bez záznamu v rejstříku název a adresa z katalogu. */
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
