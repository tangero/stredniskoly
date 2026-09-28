import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getPasmaPrijetiZaRok, rokPasemPrijeti } from '@/lib/pasma-prijeti';
import { getAllSchools, getSchoolsByRedizo } from '@/lib/data';
import { nactiPrevodTestu } from '@/lib/prevod-testu';
import { kriteriaOboru, poziceOboru } from '@/lib/pozice-kriteria';
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

/** Bez diakritiky a velkých písmen, ať „plzen“ najde Plzeň. */
const bezDiakritiky = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function hledej(dotaz: string, rok: number): Promise<{ id: string; text: string }[]> {
  const slova = bezDiakritiky(dotaz).split(/\s+/).filter(Boolean);
  if (!slova.length) return [];
  const videno = new Set<string>();
  const nalezeno: { id: string; text: string }[] = [];
  for (const s of await getAllSchools()) {
    // Záznamy katalogu nesou obor jen v `id` (REDIZO_KKOV[_zaměření]); data pásem zaměření nerozlišují.
    const klic = s.id.split('_').slice(0, 2).join('_');
    if (videno.has(klic)) continue;
    const text = bezDiakritiky(`${s.nazev} ${s.obec} ${s.obor}`);
    if (!slova.every(w => text.includes(w))) continue;
    if (!(await getPasmaPrijetiZaRok(klic, rok))) continue;
    videno.add(klic);
    nalezeno.push({ id: klic, text: `${s.nazev}, ${s.obec} · ${s.obor}` });
    if (nalezeno.length >= 30) break;
  }
  return nalezeno;
}

async function nactiUkazky(rok: number, navic?: string): Promise<UkazkovyObor[]> {
  const seznam = navic && !UKAZKY.some(u => u.id === navic)
    ? [{ id: navic, popis: 'vybraný obor' }, ...UKAZKY]
    : UKAZKY;
  const nactene = await Promise.all(
    seznam.map(async ({ id, popis }) => {
      const data = await getPasmaPrijetiZaRok(id, rok);
      if (!data) return null;
      const [redizo] = id.split('_');
      // Název a obec z katalogu; prototyp nemá vlastní zdroj a mít ho nemá.
      let nazev = redizo;
      let obec = '';
      let obor = id.split('_')[1] ?? '';
      try {
        const nabidky = await getSchoolsByRedizo(redizo);
        // Obor se pozná z `id` (REDIZO_KKOV[_zaměření]); samostatné pole kódu katalog nemá.
        const kkov = id.split('_')[1];
        const prvni = nabidky.find(n => String(n.id ?? '').split('_')[1] === kkov);
        if (prvni) {
          nazev = String(prvni.nazev ?? redizo);
          obec = String(prvni.obec ?? '');
          obor = `${prvni.obor ?? obor}`;
        }
      } catch {
        // Katalog není povinný: prototyp se má ukázat i bez názvů.
      }
      const klic = id.split('_').slice(0, 2).join('_');
      const [pozice, kriteria] = await Promise.all([poziceOboru(klic), kriteriaOboru(klic)]);
      return { id, nazev, obec, obor: `${obor} — ${popis}`, data, pozice, kriteria };
    }),
  );
  return nactene.filter((x) => x !== null) as UkazkovyObor[];
}

export default async function PrototypPasmaPage({ searchParams }: {
  searchParams: Promise<{ obor?: string; hledat?: string }>;
}) {
  const { obor: vybranyObor, hledat } = await searchParams;
  const rok = await rokPasemPrijeti();
  const obory = rok ? await nactiUkazky(rok, vybranyObor) : [];
  const prevod = await nactiPrevodTestu();
  const nalezene = rok && hledat ? await hledej(hledat, rok) : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Rozpracovaný prototyp.</strong> Není to součást webu — slouží k posouzení
          návrhu. Čísla jsou skutečná, podoba se ještě změní.
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Kde stojím proti uchazečům roku {rok ?? '—'}</h1>
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

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Najít obor (škola, město nebo obor)</span>
            <input name="hledat" defaultValue={hledat ?? ''} placeholder="např. gymnázium Plzeň" className="w-80 rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Hledat</button>
          <span className="text-xs text-slate-500">Víceletá gymnázia mají vlastní testy; převod se vybere podle oboru.</span>
        </form>
        {hledat && (
          nalezene.length ? (
            <ul className="space-y-1 text-sm">
              {nalezene.map(n => (
                <li key={n.id}><a href={`?obor=${encodeURIComponent(n.id)}`} className="text-blue-700 underline">{n.text}</a></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Nic nenalezeno, nebo obor nemá data pásem za rok {rok}.</p>
          )
        )}

        {obory.length > 0 && rok ? (
          <PasmovyProuzek key={vybranyObor ?? ''} obory={obory} rok={rok} prevod={prevod} vybranyObor={vybranyObor} />
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
