import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getPasmaPrijetiZaRok, rokPasemPrijeti } from '@/lib/pasma-prijeti';
import { getSchoolsByRedizo } from '@/lib/data';
import { PasmovyProuzek, type UkazkovyObor } from '@/components/prototyp/PasmovyProuzek';

// ============================================================================
// Prototyp pásmového proužku (docs/navrh-pasmovy-prouzek-2027.md).
//
// Stránka je nezalistovaná, ne chráněná: kdo zná adresu, otevře ji. Nikde na
// ni nevede odkaz, není v sitemapě (ta má pevný seznam cest) a nese
// `robots: noindex`. Do robots.txt ji zapsat **nesmíme** — zakázané procházení
// by vyhledávači zabránilo `noindex` vůbec přečíst.
//
// Zobrazuje jen veřejná data z katalogu, nic neukládá a nic neodesílá.
// ============================================================================

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Prototyp: pásmový proužek',
  robots: { index: false, follow: false },
};

/**
 * Ukázkové obory pokrývají všechny vizuální stavy proužku: těsné pásmo,
 * široké pásmo, nízký i vysoký práh, obor kde o pořadí nerozhodl test,
 * a případ, kdy mezi mezemi nebyl nikdo. Vybráno měřením nad daty 2026.
 */
const UKAZKY: { id: string; popis: string }[] = [
  { id: '600005691_79-41-K/81', popis: 'těsné pásmo vysoko' },
  { id: '600005691_79-41-K/41', popis: 'těsné pásmo vysoko' },
  { id: '600005518_79-41-K/41', popis: 'velmi těsné pásmo' },
  { id: '600016684_79-41-K/81', popis: 'nízký práh, těsné pásmo' },
  { id: '600006581_64-41-L/51', popis: 'nízký práh, širší pásmo' },
  { id: '600005216_65-42-M/02', popis: 'široké pásmo, test nerozhodl' },
  { id: '600005968_79-41-K/41', popis: 'extrémně široké pásmo' },
  { id: '600015785_79-41-K/41', popis: 'mezi mezemi nebyl nikdo' },
];

async function nactiUkazky(rok: number): Promise<UkazkovyObor[]> {
  const nactene = await Promise.all(
    UKAZKY.map(async ({ id, popis }) => {
      const data = await getPasmaPrijetiZaRok(id, rok);
      if (!data) return null;
      const [redizo] = id.split('_');
      // Název a obec z katalogu; prototyp nemá vlastní zdroj a mít ho nemá.
      let nazev = redizo;
      let obec = '';
      let obor = id.split('_')[1] ?? '';
      try {
        const nabidky = await getSchoolsByRedizo(redizo);
        const kkov = id.split('_')[1];
        const prvni = nabidky.find(n => String(n.kod_oboru) === kkov) ?? nabidky[0];
        if (prvni) {
          nazev = String(prvni.nazev ?? redizo);
          obec = String(prvni.obec ?? '');
          obor = `${prvni.obor ?? obor}`;
        }
      } catch {
        // Katalog není povinný: prototyp se má ukázat i bez názvů.
      }
      return { id, nazev, obec, obor: `${obor} — ${popis}`, data };
    }),
  );
  return nactene.filter((x): x is UkazkovyObor => x !== null);
}

export default async function PrototypPasmaPage() {
  const rok = await rokPasemPrijeti();
  const obory = rok ? await nactiUkazky(rok) : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Rozpracovaný prototyp.</strong> Není to součást webu — slouží k posouzení
          návrhu. Čísla jsou skutečná, podoba se ještě změní.
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Kde stojím proti loňským uchazečům</h1>
          <p className="mt-2 text-slate-600">
            Prototyp k návrhu <code className="text-sm">docs/navrh-pasmovy-prouzek-2027.md</code>.
            Nahrazuje dnešní porovnání s průměrem přijatých, které nezná rozptyl — dva obory
            se stejným průměrem mají pásmo nejistoty 2 body a 44 bodů.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Data 1. kola {rok ?? '—'}. Přepínej obory a zadávej body; ukázky schválně pokrývají
            i krajní případy, na kterých se proužek láme.
          </p>
        </div>

        {obory.length > 0 ? (
          <PasmovyProuzek obory={obory} />
        ) : (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900">
            Data pásem přijetí nejsou k dispozici. Zkontrolujte sadu
            <code className="mx-1">cermat-uchazeci-kolo1</code> v registru stavu datových sad.
          </p>
        )}

        <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">Na co se při posuzování dívat</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Je z proužku hned jasné, co znamenají tři zóny, bez čtení popisků?</li>
            <li>Funguje věta pod proužkem s počty („ze 41 se dostalo 24“) lépe než procento?</li>
            <li>Dává smysl sloupcové rozdělení za proužkem, nebo je to šum?</li>
            <li>Co u oboru, kde je pásmo přes půl osy — není takový obrázek spíš matoucí?</li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
