import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/** Datum posledního ověření faktů na této stránce. Při další kontrole zdrojů ho změň. */
const OVERENO = '2026-11-13';

const TITULEK = 'Příprava na přijímačky 2027: zdarma, nanečisto i placené';
const POPISEK =
  'Ověřené možnosti přípravy na jednotnou přijímací zkoušku 2027: cvičné zadání CERMAT, aplikace TAU, starší testy zdarma a placené nanečisto. Reforma 2029 je tu jako ohlášený plán.';

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: '/priprava-na-prijimacky-2027' },
  openGraph: {
    title: TITULEK,
    description: POPISEK,
    type: 'article',
    url: '/priprava-na-prijimacky-2027',
  },
};

const ZDROJE = [
  {
    href: 'https://ct24.ceskatelevize.cz/clanek/domaci/plaga-testy-by-mohly-predchazet-podavani-prihlasek-na-stredni-skoly-od-jara-2029-379553',
    text: 'ČT24, 12. 11. 2026: vyjádření ministra k přípravě 2027 a k plánu od jara 2029',
  },
  {
    href: 'https://www.novinky.cz/clanek/domaci-ministerstvo-poodhalilo-jak-bude-vypadat-nahrada-prijimacek-nanecisto-40608360',
    text: 'Novinky, 13. 11. 2026: cvičné zadání v březnu 2027, řešení a videa',
  },
  {
    href: 'https://prijimacky.cermat.cz/menu/testova-zadani-k-procvicovani/',
    text: 'CERMAT: testová zadání k procvičování',
  },
  {
    href: 'https://tau.cermat.cz/',
    text: 'CERMAT: aplikace TAU (Trénuj a uč se!)',
  },
  {
    href: 'https://prijimacky.cermat.cz/',
    text: 'CERMAT: jednotná přijímací zkouška',
  },
  {
    href: 'https://msmt.gov.cz/',
    text: 'MŠMT: úvodní stránka ministerstva',
  },
  {
    href: 'https://centrum-eruditio.cz/prijimacky-nanecisto',
    text: 'Centrum Eruditio: přijímačky nanečisto',
  },
  {
    href: 'https://jdunastredni.cz/',
    text: 'Jdu na střední: ceník přípravy',
  },
  {
    href: 'https://www2.scio.cz/trenink-na-prijimaci-zkousky-pro-8-tridy',
    text: 'Scio: trénink na přijímací zkoušky pro 8. třídy',
  },
] as const;

function formatujOvereni(iso: string) {
  const [rok, mesic, den] = iso.split('-');
  return `${Number(den)}. ${Number(mesic)}. ${rok}`;
}

export default function PripravaNaPrijimacky2027Page() {
  return (
    <>
      <Header />
      <main className="bg-slate-50 text-slate-800">
        <section className="bg-slate-900 text-white px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <p className="text-blue-300 text-sm font-semibold mb-3">ŠKOLNÍ ROK 2026/2027</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-5">
              Příprava na přijímačky 2027: možnosti zdarma i placené, nanečisto
            </h1>
            <p className="text-slate-200 text-lg max-w-2xl">
              Přehled ověřených možností, jak se letos připravit na jednotnou přijímací zkoušku.
              Uvádíme jen to, co jsme ověřili, s odkazy na zdroje. Nejde o žebříček ani o doporučení
              placených kurzů.
            </p>
            <p className="text-sm text-slate-300 mt-6">
              Ověřeno <time dateTime={OVERENO}>{formatujOvereni(OVERENO)}</time>
              {' · '}
              <a href="#zdroje" className="underline underline-offset-4">zdroje</a>
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
          <aside className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-bold mb-2">Oficiální dokument k novinkám zatím není</h2>
            <p className="text-sm leading-relaxed">
              K 13. 11. 2026 není na webu ministerstva školství (msmt.gov.cz) ani na webu CERMATu
              (cermat.cz, prijimacky.cermat.cz) oficiální dokument, který by popisoval zrušení
              lednového nanečisto, cvičné zadání v březnu 2027 nebo reformu přijímaček od
              roku 2029. Tyto body proto opíráme o vyjádření ministra školství Roberta Plagy z
              12.&nbsp;11.&nbsp;2026, jak je zachytila ČT24 a Novinky. Až ministerstvo nebo CERMAT
              zveřejní oficiální zprávu, text upravíme.
            </p>
          </aside>

          <section id="zmena" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Co se změnilo proti loňsku</h2>
            <div className="space-y-4 text-[17px] leading-relaxed text-slate-700">
              <p>
                V letech 2025 a 2026 pořádal CERMAT v lednu dobrovolné Přijímačky nanečisto
                na základních školách. V této podobě se v roce 2027 konat nebudou.
              </p>
              <p>
                Ministr školství 12. listopadu 2026 v médiích řekl, že v březnu 2027
                CERMAT zveřejní nová cvičná zadání. Žáci si je budou moci zkusit ve škole
                nebo doma. K zadání mají přibýt správná řešení a vysvětlující videa.
                Aplikace TAU zůstává.
              </p>
              <p>
                Přihlášky na střední školy (kromě konzervatoří) je potřeba podat do 22.&nbsp;února&nbsp;2027,
                tedy ještě před ohlášeným březnovým cvičným zadáním. Úplný kalendář termínů je
                na stránce{' '}
                <Link href="/prijimacky-2027" className="font-semibold text-[#0074e4] hover:underline">
                  Termíny přijímaček 2027
                </Link>.
              </p>
            </div>
          </section>

          <section id="zdarma" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Zdarma</h2>
            <div className="space-y-4">
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-lg">Aplikace TAU (Trénuj a uč se!)</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Oficiální bezplatná aplikace CERMATu k procvičování testů a úloh z minulých
                  jednotných přijímacích zkoušek, včetně vyhodnocení. Můžete v ní řešit celý test
                  nebo jen skupinu úloh.
                </p>
                <p className="mt-3">
                  <a
                    href="https://tau.cermat.cz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    tau.cermat.cz →
                  </a>
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-lg">Testová zadání z minulých let</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Na webu CERMATu jsou ke stažení zadání, záznamové archy a klíče správných řešení
                  z minulých ročníků. Hodí se k nácviku formátu zkoušky a práce s časem. Rozsah
                  učiva se mezi roky může lišit, proto je vhodné porovnat zadání s aktuálními
                  specifikacemi požadavků na webu CERMATu.
                </p>
                <p className="mt-3">
                  <a
                    href="https://prijimacky.cermat.cz/menu/testova-zadani-k-procvicovani/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    Testová zadání k procvičování →
                  </a>
                </p>
              </article>

              <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="font-semibold text-lg">Cvičné zadání a videa v březnu 2027</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Podle vyjádření ministra mají v březnu 2027 vyjít nová cvičná zadání,
                  řešení a videa, která půjde vyzkoušet ve škole i doma. Přesný den zveřejnění,
                  počet testů a podoba videí v oficiálním dokumentu k 13.&nbsp;11.&nbsp;2026
                  ještě nejsou.{' '}
                  <a
                    href="https://www.novinky.cz/clanek/domaci-ministerstvo-poodhalilo-jak-bude-vypadat-nahrada-prijimacek-nanecisto-40608360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    Novinky
                  </a>
                  {' '}uvádějí polovinu března,{' '}
                  <a
                    href="https://ct24.ceskatelevize.cz/clanek/domaci/plaga-testy-by-mohly-predchazet-podavani-prihlasek-na-stredni-skoly-od-jara-2029-379553"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    ČT24
                  </a>
                  {' '}začátek března. Není to totéž jako loňské lednové nanečisto na školách.
                </p>
              </article>
            </div>
          </section>

          <section id="placene" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Placené možnosti</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Nejde o doporučení ani o úplný seznam. Uvádíme jen nabídky, u kterých jsme
              13.&nbsp;11.&nbsp;2026 ověřili cenu, termín a odkaz. Ceny se mohou změnit,
              ověřte je proto přímo u pořadatele.
            </p>
            <div className="space-y-4">
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-lg">Centrum Eruditio — přijímačky nanečisto</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Pro žáky 9. třídy. Prezenčně v Hostivicích a Říčanech, deset termínů
                  od 29.&nbsp;11.&nbsp;2026 do 4.&nbsp;4.&nbsp;2027. Cena je 799&nbsp;Kč za termín
                  při 1 až 4 termínech, 749&nbsp;Kč při 5 až 7 termínech a 699&nbsp;Kč při osmi
                  a více termínech. Pro 5. a 7. třídu pořadatel nanečisto zatím nepořádá.
                </p>
                <p className="mt-3">
                  <a
                    href="https://centrum-eruditio.cz/prijimacky-nanecisto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    centrum-eruditio.cz/prijimacky-nanecisto →
                  </a>
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-lg">Jdu na střední — online procvičování</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Diagnostika s plánem stojí 39&nbsp;Kč. Premium stojí 199&nbsp;Kč měsíčně
                  a lze ho zrušit, nebo jednorázově 549&nbsp;Kč na 3 měsíce a 849&nbsp;Kč
                  na 6 měsíců. Část přípravy je po registraci zdarma.
                </p>
                <p className="mt-3">
                  <a
                    href="https://jdunastredni.cz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    jdunastredni.cz →
                  </a>
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-lg">Scio — trénink pro 8. třídy</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">
                  Tato nabídka je pro žáky 8. tříd, ne pro letošní deváťáky, kteří půjdou
                  k přijímačkám v dubnu 2027. Testuje češtinu, matematiku a obecné studijní
                  předpoklady, ve škole nebo doma, od 26.&nbsp;4. do 21.&nbsp;5.&nbsp;2027
                  za 230&nbsp;Kč za žáka. Výsledky mají být ve ScioDat 4.&nbsp;6.&nbsp;2027.
                </p>
                <p className="mt-3">
                  <a
                    href="https://www2.scio.cz/trenink-na-prijimaci-zkousky-pro-8-tridy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    www2.scio.cz/trenink-na-prijimaci-zkousky-pro-8-tridy →
                  </a>
                </p>
              </article>
            </div>
          </section>

          <section id="osa" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Časová osa 2026/2027</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Termíny přijímacího řízení jsou z oficiálního harmonogramu MŠMT, jak je uvádí
              i náš{' '}
              <Link href="/prijimacky-2027" className="font-semibold text-[#0074e4] hover:underline">
                kalendář přijímaček 2027
              </Link>
              . Cvičné zadání v březnu je ohlášené v médiích; přesný den zveřejnění
              v oficiálním dokumentu není.
            </p>
            <ol className="space-y-3">
              <li className="rounded-xl border border-slate-200 bg-white p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">1.–30. listopadu 2026</div>
                <div>Přihlášky na konzervatoře.</div>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">15.–31. ledna 2027</div>
                <div>Školy zveřejní kritéria přijetí.</div>
              </li>
              <li className="rounded-xl border border-blue-200 bg-blue-50 p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">1.–22. února 2027</div>
                <div>Přihlášky na střední školy, včetně oborů s talentovou zkouškou.</div>
              </li>
              <li className="rounded-xl border border-amber-200 bg-amber-50 p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">březen 2027</div>
                <div>
                  Ohlášené cvičné zadání CERMAT, řešení a videa. Přesný den v oficiálním
                  dokumentu k 13.&nbsp;11.&nbsp;2026 není.{' '}
                  <a
                    href="https://www.novinky.cz/clanek/domaci-ministerstvo-poodhalilo-jak-bude-vypadat-nahrada-prijimacek-nanecisto-40608360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    Novinky
                  </a>
                  {' '}uvádějí polovinu března,{' '}
                  <a
                    href="https://ct24.ceskatelevize.cz/clanek/domaci/plaga-testy-by-mohly-predchazet-podavani-prihlasek-na-stredni-skoly-od-jara-2029-379553"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0074e4] hover:underline"
                  >
                    ČT24
                  </a>
                  {' '}začátek března.
                </div>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">15. března – 23. dubna 2027</div>
                <div>Školní a talentové zkoušky, pokud je obor vyžaduje.</div>
              </li>
              <li className="rounded-xl border border-blue-200 bg-blue-50 p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">12. a 13. dubna 2027</div>
                <div>Jednotná přijímací zkouška: čtyřleté obory a nástavby.</div>
              </li>
              <li className="rounded-xl border border-blue-200 bg-blue-50 p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">14. a 15. dubna 2027</div>
                <div>Jednotná přijímací zkouška: šestiletá a osmiletá gymnázia.</div>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">29. a 30. dubna 2027</div>
                <div>Náhradní termíny jednotné přijímací zkoušky.</div>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-5 grid gap-2 md:grid-cols-[190px_1fr]">
                <div className="font-semibold text-blue-800">14. května 2027</div>
                <div>Výsledky prvního kola středních škol.</div>
              </li>
            </ol>
          </section>

          <section id="plan-2029" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Ohlášený plán od roku 2029</h2>
            <div className="space-y-4 text-[17px] leading-relaxed text-slate-700">
              <p>
                Ministr školství 12.&nbsp;11.&nbsp;2026 řekl, že od jara 2029 by jednotná přijímací
                zkouška mohla předcházet podání přihlášek a že počet přihlášek by měl být pět,
                bez ohledu na to, zda jde o obor s talentovou zkouškou. Platilo by to pro žáky
                devátých tříd. U víceletých gymnázií by podle ministra zůstal současný systém.
                Návrh chce předložit do konce roku.
              </p>
              <p>
                Jde o ohlášený plán, ne o platné pravidlo. Zákon k tomu zatím není a oficiální
                dokument ministerstva k 13.&nbsp;11.&nbsp;2026 zveřejněný není. Pro přijímačky 2027
                platí dosavadní harmonogram.
              </p>
            </div>
          </section>

          <section id="zdroje" className="border-t border-slate-200 pt-8 scroll-mt-24">
            <h2 className="text-xl font-bold mb-3">Zdroje a platnost</h2>
            <ul className="space-y-2 text-blue-700 underline underline-offset-4">
              {ZDROJE.map((zdroj) => (
                <li key={zdroj.href}>
                  <a href={zdroj.href} target="_blank" rel="noopener noreferrer">
                    {zdroj.text}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-600 mt-4">
              Poslední kontrola zdrojů:{' '}
              <time dateTime={OVERENO}>{formatujOvereni(OVERENO)}</time>.
              Ceny a termíny placených nabídek ověřte u pořadatele, mohou se změnit.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
