import { notFound, redirect } from 'next/navigation';
import { getSchools2026Data, getSchoolAnalysis } from '@/lib/data';
import { adresaNabidkyVeSkole, adresaPrehledu } from '@/lib/adresa-oboru.mjs';

/**
 * Stránka nabídky se od 19. 9. 2026 jen **přesměrovává na stránku oboru**.
 *
 * Vznikla podle docs/adr/0002 v době, kdy se adresa oboru skládala z loňského katalogu
 * a pro nabídku bez protějšku v něm žádná nebyla. Od chvíle, kdy adresu skládá jedno místo
 * z letošního ročníku (docs/adresa-oboru-2027.md, kroky C a D), má každá nabídka vlastní
 * adresu a druhá, chudší podoba téhož oboru ztratila důvod: neměla vlastní titulek pro
 * vyhledávače ani nic z toho, co stránka oboru ukazuje.
 *
 * Adresa zůstává, protože ji nesou uložené odkazy a odkazy ze simulátoru.
 */
export default async function NabidkaPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const vsechny = await getSchools2026Data();
  const shody = vsechny.filter(row => row.source_id === sourceId);
  if (shody.length !== 1) notFound();

  const nabidka = shody[0];
  const analyza = await getSchoolAnalysis();
  // Název pro adresu bere stejný zdroj jako data.ts, jinak by adresa nesedla.
  const nazev = Object.values(analyza).find(s => s.id.split('_')[0] === nabidka.redizo)?.nazev ?? nabidka.nazev;
  const nabidkySkoly = vsechny.filter(row => row.redizo === nabidka.redizo);

  // Ne trvale: cíl závisí na datech ročníku (při změně katalogu se adresa může posunout),
  // a trvalé přesměrování si prohlížeč pamatuje déle, než platí jeho důvod.
  const adresa = adresaNabidkyVeSkole(nabidka.redizo, nazev, nabidka, nabidkySkoly);
  redirect(adresa ? `/skola/${adresa}` : `/skola/${adresaPrehledu(nabidka.redizo, nazev)}`);
}
