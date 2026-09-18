import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OdberBlok } from '@/components/novinky/OdberBlok';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Stránka odběru: adresa pro sdílení, pro výchovné poradce a pro QR kód
// (docs/novinky-k-prijimackam-2027.md, oddíl 4).
// ============================================================================

export const metadata = {
  title: 'Novinky k přijímačkám e-mailem',
  description:
    'Pošleme ti termíny přijímacího řízení s předstihem, napíšeme, co je potřeba připravit, a dáme vědět, když na web přibudou nová data o školách a oborech.',
};

export const revalidate = 3600;

export default async function NovinkyPage() {
  const rocnik = await zobrazeneObdobi('msmt-harmonogram');
  const dnes = new Date().toISOString().slice(0, 10);
  const nejblizsi = calendar.groups
    .filter((g) => g.id !== 'konzervatore')
    .flatMap((g) => g.events)
    .filter((e) => (e.end ?? e.start) >= dnes)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12" style={{ backgroundColor: '#ffffff' }}>
          <div className="max-w-3xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#28313b' }}>
              Novinky k přijímačkám e-mailem
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              {rocnik
                ? `Pošleme ti s předstihem termíny přijímacího řízení ${rocnik}, napíšeme, co je potřeba připravit, a dáme vědět, když na web přibudou nová data. Jeden odběr, nejvýš pár e-mailů měsíčně, a běží dál i v dalších letech.`
                : 'Odběr otevřeme, až MŠMT zveřejní harmonogram dalšího přijímacího řízení.'}
            </p>

            <OdberBlok zdroj="novinky" varianta="stranka" />

            <h2 className="text-2xl font-bold mt-12 mb-4" style={{ color: '#28313b' }}>
              Co ti přijde
            </h2>
            <ul className="space-y-2 text-slate-700">
              <li>
                <strong>Kritéria přijetí:</strong> co v nich hledat a kde je školy zveřejňují.
              </li>
              <li>
                <strong>Přihlášky:</strong> kdy je podat, co k nim patří a připomínka před koncem
                termínu. Pořadí na přihlášce šanci na přijetí nemění, škola řadí jen podle svých
                kritérií.
              </li>
              <li>
                <strong>Jednotná zkouška:</strong> který den se píše pro čtyřleté obory a který pro
                víceletá gymnázia, co s sebou a jak je to s náhradním termínem.
              </li>
              <li>
                <strong>Výsledky a 2. kolo:</strong> jak zjistit výsledek a co dělat, když se uchazeč
                nedostal nikam. Přihlášky do 2. kola se podávají jen několik dní.
              </li>
              <li>
                <strong>Nová data na webu:</strong> když přibudou obory, místa nebo výsledky.
              </li>
            </ul>

            {nejblizsi.length > 0 && (
              <>
                <h2 className="text-2xl font-bold mt-12 mb-4" style={{ color: '#28313b' }}>
                  Nejbližší termíny
                </h2>
                <ul className="space-y-1 text-slate-700">
                  {nejblizsi.map((e) => (
                    <li key={e.id}>
                      <strong>{e.title}:</strong> {e.date}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-500 mt-3">
                  Zdroj termínů je harmonogram MŠMT. Přesný čas, místo a přílohy ověř v kritériích
                  školy. Celý přehled je v{' '}
                  <Link href="/prijimacky-2027" className="text-blue-700 underline">
                    kalendáři přijímaček
                  </Link>
                  .
                </p>
              </>
            )}

            <h2 className="text-2xl font-bold mt-12 mb-4" style={{ color: '#28313b' }}>
              Co s adresou děláme
            </h2>
            <p className="text-slate-700">
              Adresu použijeme jen pro tyhle e-maily. Odběr začne, až ho potvrdíš odkazem, a odhlásit
              se jde jedním kliknutím v každém e-mailu. V e-mailech neměříme otevření ani kliknutí.
              Podrobnosti jsou v{' '}
              <Link href="/ochrana-osobnich-udaju" className="text-blue-700 underline">
                zásadách ochrany osobních údajů
              </Link>
              .
            </p>
            <p className="text-slate-700 mt-3">
              Odběr je jeden pro všechny a není vázaný na ročník: běží dál, dokud se neodhlásíš,
              takže se dá založit i rok dopředu. Konzervatoře zatím neposíláme, protože je web
              nepokrývá; jejich termíny najdeš v kalendáři.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
