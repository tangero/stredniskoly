import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RegionSchoolsTable } from '@/components/RegionSchoolsTable';
import { getAllKraje } from '@/lib/data';
import { getKrajPrehled } from '@/lib/krajData';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { MESTA } from '@/lib/cityData';
import { cislo, KOHORTA_NENI_KVALITA, vKraji } from '@/lib/obor-profil';
import { tvar } from '@/lib/cesky-tvar';

/**
 * Přehled škol v kraji: docs/navrh-stranky-kraje-2027.md.
 *
 * Rok se bere z registru stavu datových sad, nikdy napevno (CLAUDE.md, pravidlo 1).
 * Stránka je statická; filtry čte a zapisuje až klientská komponenta.
 */

const noKrajSuffix = ['Hlavní město Praha', 'Vysočina'];
function krajLabel(nazev: string): string {
  return noKrajSuffix.includes(nazev) ? nazev : `${nazev} kraj`;
}

interface Props {
  params: Promise<{ kraj: string }>;
}

export async function generateStaticParams() {
  const kraje = await getAllKraje();
  return kraje.map((k) => ({ kraj: k.slug }));
}

function skol(n: number): string {
  return n === 1 ? 'škola' : n >= 2 && n <= 4 ? 'školy' : 'škol';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kraj: krajSlug } = await params;
  const kraje = await getAllKraje();
  const kraj = kraje.find((k) => k.slug === krajSlug);
  if (!kraj) return { title: 'Region nenalezen' };

  const prehled = await getKrajPrehled(kraj.kod);
  const rok = await zobrazeneObdobi('cermat-vysledky');
  const pocet = prehled?.skoly.length ?? 0;
  const kde = vKraji(kraj.nazev === 'Vysočina' ? 'Kraj Vysočina' : kraj.nazev);
  return {
    alternates: { canonical: `/regiony/${kraj.slug}` },
    title: `Střední školy ${kde}: jak těžké bylo se dostat`,
    description: `${cislo(pocet)} ${skol(pocet)} ${kde}: obtížnost přijetí${rok ? ` v 1. kole ${rok}` : ''}, kam se hlásí jako na první volbu, maturita a počty míst.`,
    openGraph: {
      title: `Střední školy ${kde} | Přijímačky na střední školy`,
      description: `Přehled ${cislo(pocet)} středních škol ${kde} po školách a oborech.`,
    },
  };
}

function Vysvetlivka({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-24 rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-slate-50">
        <span className="text-sm text-slate-400 transition-transform group-open:rotate-90">▶</span>
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </summary>
      <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{children}</div>
    </details>
  );
}

export default async function RegionPage({ params }: Props) {
  const { kraj: krajSlug } = await params;
  const kraje = await getAllKraje();
  const kraj = kraje.find((k) => k.slug === krajSlug);
  if (!kraj) notFound();

  const prehled = await getKrajPrehled(kraj.kod);
  if (!prehled) notFound();
  const { skoly, rok, rokDruhehoKola, rokMaturity } = prehled;
  const pocetNabidek = skoly.reduce((a, s) => a + s.nabidky.length, 0);
  // Seznam měst píše kraje tvarem „Jihomoravský kraj“ a „Kraj Vysočina“.
  // U Prahy je město totéž co kraj; odkaz by vedl na stejný seznam škol.
  const mesta = MESTA.filter(m => [krajLabel(kraj.nazev), `Kraj ${kraj.nazev}`].includes(m.kraj) && m.nazev !== 'Praha');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 py-10 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <nav className="mb-4 text-sm text-blue-200">
              <Link href="/" className="hover:text-white">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/regiony" className="hover:text-white">Regiony</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{kraj.nazev}</span>
            </nav>
            <h1 className="mb-1 text-3xl font-bold md:text-4xl">Střední školy - {krajLabel(kraj.nazev)}</h1>
            <p className="text-blue-200">
              {cislo(skoly.length)} {skol(skoly.length)}, {cislo(pocetNabidek)} {tvar(pocetNabidek, 'nabídka', 'nabídky', 'nabídek')} v 1. kole {rok}
            </p>
            {mesta.length > 0 && (
              <p className="mt-4 text-sm text-blue-100">
                Přehled po městech:{' '}
                {mesta.map((m, i) => (
                  <span key={m.slug}>
                    {i > 0 && ', '}
                    <Link href={`/mesto/${m.slug}`} className="underline hover:text-white">{m.nazev}</Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
          <section>
            <p className="mb-5 max-w-3xl text-sm text-slate-600">
              Jeden řádek je jedna škola: obtížnost přijetí a pozice na přihlášce za 1. kolo {rok}, počet míst
              a maturita. Jednotlivé obory najdete po kliknutí na školu. Přehled zahrnuje obory s jednotnou
              přijímací zkouškou; učební obory bez maturity v něm nejsou.
            </p>
            <RegionSchoolsTable skoly={skoly} krajNazev={kraj.nazev === 'Vysočina' ? 'Kraj Vysočina' : kraj.nazev} rok={rok} rokDruhehoKola={rokDruhehoKola} />
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-700">Jak číst přehled</h2>
            <div className="space-y-2">
              <Vysvetlivka title="Co je obtížnost přijetí?">
                Slovní zařazení podle toho, kolik soutěžících uchazečů se na obor dostalo, tedy těch, kdo splnili
                požadavky školy a nedostali se na obor, který měli na přihlášce výš. Stupně jsou: místo pro všechny
                (nikdo nebyl odmítnut kvůli kapacitě), dostala se většina (aspoň dvě třetiny), středně těžké
                (polovina až dvě třetiny), těžké (třetina až polovina) a velmi těžké (méně než třetina). Popisuje
                jeden ročník, ne kvalitu školy ani obtížnost studia, a neříká, jakou šanci má konkrétní uchazeč.
                U oborů s méně než deseti soutěžícími se neuvádí. Mezi ročníky se mění, proto je u něj i předchozí rok.
              </Vysvetlivka>
              <Vysvetlivka title="Co je pozice na přihlášce?">
                Porovnává podíl uchazečů, kteří si obor zapsali jako první volbu, s obory stejného typu v celé zemi
                (osmiletá gymnázia s osmiletými, nástavby s nástavbami). <b>Škola první volby</b> je v horní třetině
                svého typu, <b>záložní volba</b> v dolní třetině, mezi nimi je <b>smíšená pozice</b>. Srovnává se jen
                uvnitř typu, protože podíl prvních voleb se mezi typy liší: u nástaveb je medián 57 %, u lyceí 26 %.
                {' '}{KOHORTA_NENI_KVALITA} Neříká ani, jak těžké je se dostat: obor, který si skoro všichni dávají
                jako první, může mít volná místa. Mezi dvěma posledními ročníky zůstaly ve stejné skupině zhruba dvě třetiny oborů.
              </Vysvetlivka>
              <Vysvetlivka title="Co jsou přihlášky na místo?">
                Počet přihlášek dělený počtem míst. Nadsazuje konkurenci: jeden uchazeč podává víc přihlášek a kdo
                se dostal na obor výš na své přihlášce, o tohle místo už nesoutěžil. Mezi typy studia se nesrovnává.
              </Vysvetlivka>
              <Vysvetlivka id="poradi-vysledky" title="Co je pořadí v kraji podle výsledků přijatých?">
                <p>
                  Pořadí ukazuje, s jak dobrými výsledky jednotné přijímací zkoušky přišli na obor přijatí uchazeči,
                  ve srovnání s obory stejného typu ve stejném kraji a roce.
                </p>
                <p className="mt-2 font-medium text-slate-700">Jak se počítá</p>
                <ol className="ml-5 list-decimal space-y-1">
                  <li>
                    U každého přijatého se vezme výsledek z češtiny a matematiky dohromady a zjistí se, kolik ze 100
                    uchazečů v celé zemi mělo stejný nebo horší výsledek (percentil). Percentil 80 znamená lepší
                    nebo stejný výsledek než 80 % všech uchazečů.
                  </li>
                  <li>Z percentilů všech přijatých na obor se udělá průměr. Zveřejňuje ho CERMAT v souhrnech 1. kola.</li>
                  <li>
                    Obory se podle průměru seřadí, ale jen mezi obory stejného typu a délky studia v kraji:
                    osmiletá gymnázia mezi osmiletými, lycea mezi lycei.
                  </li>
                </ol>
                <p className="mt-2">
                  „1. ze 32“ u osmiletého gymnázia tedy znamená, že přijatí na tento obor měli v průměru nejlepší
                  umístění v celé zemi ze všech 32 osmiletých gymnázií v kraji. Pod pořadím je předchozí rok, aby bylo
                  vidět, jestli jde o stálý stav, nebo výkyv jednoho ročníku.
                </p>
                <p className="mt-2 font-medium text-slate-700">Proč percentil a ne body</p>
                <p>
                  Test je každý rok jinak těžký, takže body se mezi roky srovnávat nedají. Mezi dvěma posledními ročníky
                  se průměr přijatých v bodech posunul typicky o 2,6 bodu, zatímco jejich umístění v celé zemi se skoro
                  nezměnilo. Percentil tenhle posun odstraní, proto jde pořadí za dva roky položit vedle sebe.
                </p>
                <p className="mt-2 font-medium text-slate-700">Co pořadí neříká</p>
                <ul className="ml-5 list-disc space-y-1">
                  <li>
                    <b>Která škola je lepší.</b> Popisuje, s jakými výsledky sem přicházejí spolužáci, ne kvalitu výuky.
                    O studiu víc řekne sloupec maturity.
                  </li>
                  <li><b>Kolik bodů stačí na přijetí.</b> Je to průměr přijatých; část z nich měla výsledky pod ním.</li>
                  <li>
                    <b>Jak těžké je se dostat.</b> Na to je obtížnost přijetí. Obor s dobře umístěnými přijatými může mít
                    volná místa, když se na něj hlásí málo uchazečů.
                  </li>
                  <li>
                    <b>Srovnání se všemi, kam se uchazeči hlásí.</b> Hranice kraje neodpovídá skutečným přihláškám:
                    u gymnázia J. S. Machara v Brandýse leží zhruba polovina oborů, které mají uchazeči na přihlášce vedle
                    něj, v Praze.
                  </li>
                </ul>
                <p className="mt-2 font-medium text-slate-700">Kdy se pořadí ukáže</p>
                <ul className="ml-5 list-disc space-y-1">
                  <li>Jen po výběru typu studia, protože obory různých typů se neporovnávají.</li>
                  <li>Jen ve skupině s aspoň deseti obory v kraji; v menší by jeden obor pořadím zbytečně házel.</li>
                  <li>Stejná hodnota dává stejné pořadí, proto se objevuje například „10.–11. ze 32“.</li>
                  <li>
                    V tabulce je u školy pořadí jejího nejlépe umístěného oboru zvoleného typu; pořadí jednotlivých
                    oborů je v detailu školy.
                  </li>
                  <li>
                    Mezi dvěma posledními ročníky zůstaly ve stejné třetině pořadí zhruba dvě třetiny oborů a typický
                    posun byl pět míst. Údaj je poměrně stálý, jednotlivá místa ale nejsou přesné měřítko.
                  </li>
                </ul>
                <p className="mt-2">
                  Podle obtížnosti přijetí se neřadí, protože se mezi roky přehazuje příliš: gymnázium J. S. Machara
                  bylo podle ní v jednom roce 7. a v dalším 17. z 32.
                </p>
              </Vysvetlivka>
              <Vysvetlivka id="poradi-zajem" title="Co je pořadí v kraji podle zájmu?">
                Řadí obory stejného typu a délky v kraji podle toho, kolik uchazečů si obor zapsalo jako první volbu
                na jedno místo (tlak prvních voleb). Ze všech ukazatelů poptávky nejlépe předpovídá, zda se na obor
                další rok někdo nevejde. Platí stejná pravidla zobrazení jako u pořadí podle výsledků přijatých
                a stejně tak neříká, která škola je lepší.
              </Vysvetlivka>
              {rokMaturity && (
                <Vysvetlivka title="Co znamená sloupec Maturita?">
                  Kolik přihlášených u školy maturitu v roce {rokMaturity} udělalo a jak často byla škola v češtině
                  nad středem podobných škol za poslední čtyři roky. Podobné školy jsou školy se stejným typem oborů
                  v celé zemi. Údaj platí za celou školu, ne za jednotlivý obor.
                </Vysvetlivka>
              )}
              {rokDruhehoKola && (
                <Vysvetlivka title="Co znamená „bylo i 2. kolo“?">
                  Škola v roce {rokDruhehoKola} po 1. kole vypsala na obor i 2. kolo. Je to údaj o minulém ročníku,
                  ne příslib pro další rok.
                </Vysvetlivka>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
