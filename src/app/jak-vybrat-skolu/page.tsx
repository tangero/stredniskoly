import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import calendar from '@/data/admissions-2027.json';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

/**
 * Průvodce výběrem školy: jeden návod místo dvou stránek.
 *
 * Návrh a rozhodnutí: docs/pruvodce-vyberem-skoly-2027.md. Stránka /jak-funguje-prijimani
 * se sem trvale přesměrovává, proto krok „Jak se rozhoduje o přijetí“ nese její obsah celý
 * i její slova v nadpisu; míří na něj odkazy ze stránky školy a oboru (kotva #jak-se-rozhoduje).
 *
 * Pravidla, která tahle stránka drží (návrh, oddíl 4):
 * - žádný letopočet napevno: ročník z registru, termíny z harmonogramu MŠMT;
 * - bodová škála 0 až 100, tedy 50 za češtinu a 50 za matematiku;
 * - vymyšlené příklady se označují jako vymyšlené;
 * - žádná osobní predikce přijetí, žádná „hranice přijetí“, žádný žebříček.
 */

export const metadata: Metadata = {
  alternates: { canonical: '/jak-vybrat-skolu' },
  title: 'Jak vybrat střední školu a jak funguje přijímací řízení',
  description:
    'Návod krok za krokem: kdy co podat, jak se rozhoduje o přijetí, jak najít a posoudit školu '
    + 'a jak sestavit tři přihlášky. Včetně toho, co o školách víme a co ne.',
  openGraph: {
    title: 'Jak vybrat střední školu a jak funguje přijímací řízení',
    description: 'Návod krok za krokem od prvního hledání po tři obory na přihlášce.',
    type: 'article',
    url: '/jak-vybrat-skolu',
  },
};

const KROKY = [
  { id: 'kalendar', cislo: 0, nadpis: 'Kdy co bude' },
  { id: 'jak-se-rozhoduje', cislo: 1, nadpis: 'Jak funguje přijímací řízení' },
  { id: 'kriteria', cislo: 2, nadpis: 'Co škola zveřejní a co z toho neplyne' },
  { id: 'kandidati', cislo: 3, nadpis: 'Najít kandidáty' },
  { id: 'posoudit', cislo: 4, nadpis: 'Posoudit jednu školu' },
  { id: 'prihlasky', cislo: 5, nadpis: 'Sestavit tři přihlášky' },
  { id: 'porovnat', cislo: 6, nadpis: 'Porovnat kandidáty vedle sebe' },
  { id: 'priprava', cislo: 7, nadpis: 'Připravit se na zkoušku' },
  { id: 'druhe-kolo', cislo: 8, nadpis: 'Když to nevyjde' },
];

/** Čtyři milníky prvního kola z harmonogramu MŠMT; datum se nikdy nepíše do kódu. */
const MILNIKY = ['ss-kriteria', 'ss-prihlasky', 'jpz-4-1', 'ss-vysledky'];

function udalost(id: string) {
  for (const skupina of calendar.groups) {
    const nalezena = skupina.events.find(e => e.id === id);
    if (nalezena) return nalezena;
  }
  return null;
}

function Krok({ id, cislo, nadpis, otazka, children }: {
  id: string; cislo: number; nadpis: string; otazka: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0074e4] text-[16px] font-bold text-white" aria-hidden="true">{cislo}</span>
        <h2 className="text-[26px] font-bold leading-tight text-[#16325c] md:text-[30px]">{nadpis}</h2>
      </div>
      <p className="mt-3 max-w-[70ch] text-[19px] leading-relaxed text-slate-800">{otazka}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Karta({ children, barva = 'bila' }: { children: React.ReactNode; barva?: 'bila' | 'modra' | 'vystraha' }) {
  const styl = barva === 'modra' ? 'bg-[#eef5ff] border-[#cfe0f7]'
    : barva === 'vystraha' ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-slate-200';
  return <div className={`rounded-2xl border p-5 ${styl}`}>{children}</div>;
}

function Dal({ href, children, popis }: { href: string; children: React.ReactNode; popis: string }) {
  return (
    <p className="text-[16px]">
      <Link href={href} className="font-semibold text-[#0074e4] hover:underline">{children} →</Link>
      <span className="ml-2 text-slate-600">{popis}</span>
    </p>
  );
}

export default async function JakVybratSkoluPage() {
  // Ročník, ke kterému se čísla na webu vztahují. Nikdy se nepíše do textu napevno.
  const rocnikDat = await zobrazeneObdobi('cermat-vysledky');
  const milniky = MILNIKY.map(udalost).filter((e): e is NonNullable<typeof e> => e !== null);
  const druheKolo = calendar.groups.find(g => g.id === 'druhe-kolo');

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb]">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
          <nav className="text-[14px] text-slate-500" aria-label="Drobečková navigace">
            <Link href="/" className="hover:text-[#0074e4]">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Jak vybrat školu</span>
          </nav>

          <h1 className="mt-4 text-[34px] font-bold leading-[1.1] text-[#16325c] [text-wrap:balance] md:text-[44px]">
            Jak vybrat střední školu
          </h1>
          <p className="mt-4 max-w-[70ch] text-[20px] leading-relaxed text-slate-700">
            Návod v osmi krocích: od prvního hledání až po tři obory na přihlášce. U každého kroku je
            odkaz na místo, kde si to na tomhle webu ověříš daty.
          </p>
          <p className="mt-3 max-w-[70ch] text-[16px] leading-relaxed text-slate-600">
            Čísla o školách na webu popisují{rocnikDat ? <> přijímací řízení <b className="text-[#16325c]">{rocnikDat}</b></> : <> poslední zveřejněné přijímací řízení</>}.
            Je to popis toho, jak dopadli uchazeči tehdy, ne předpověď pro tvůj ročník.
          </p>

          <nav aria-label="Obsah návodu" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-slate-500">Osm kroků</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
              {KROKY.map(k => (
                <li key={k.id} className="text-[16px]">
                  <a href={`#${k.id}`} className="text-[#0074e4] hover:underline">
                    <span className="mr-2 font-bold tabular-nums text-slate-400">{k.cislo}</span>{k.nadpis}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-14">

            {/* ---------------------------------------------------------------- 0 */}
            <Krok id="kalendar" cislo={0} nadpis="Kdy co bude" otazka="Přijímací řízení má pevný harmonogram. Tyhle čtyři termíny stačí znát na začátku; zbytek je v kalendáři.">
              <ol className="grid gap-3 md:grid-cols-2">
                {milniky.map(e => (
                  <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[15px] font-bold text-[#0074e4]">{e.date}</p>
                    <p className="mt-1 text-[17px] font-semibold text-[#16325c]">{e.title}</p>
                    {'note' in e && e.note ? <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{e.note}</p> : null}
                  </li>
                ))}
              </ol>
              <Karta barva="modra">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  <b>Nejdůležitější je únor.</b> Přihlášky se podávají v jednom krátkém okně a školy do té doby
                  musí zveřejnit kritéria přijetí, tedy pravidla, podle kterých uchazeče řadí. Kdo si nechá výběr
                  na poslední týden, rozhoduje se bez toho, co si mohl přečíst v lednu.
                </p>
              </Karta>
              <Dal href="/prijimacky-2027" popis="všechny termíny včetně náhradních, konzervatoří a druhého kola">Celý kalendář</Dal>
              <Dal href="/novinky" popis="ozveme se, až se termín blíží; nic jiného neposíláme">Termíny e-mailem</Dal>
            </Krok>

            {/* ---------------------------------------------------------------- 1 */}
            <Krok id="jak-se-rozhoduje" cislo={1} nadpis="Jak funguje přijímací řízení" otazka="Tohle je jediná část, kterou se vyplatí přečíst celou. Většina rad, které kolují mezi rodiči, stojí na nepochopení jednoho pravidla.">
              <Karta barva="modra">
                <p className="text-[19px] font-bold text-[#16325c]">O přijetí rozhodují jen výsledky, ne pořadí na přihlášce.</p>
                <p className="mt-2 text-[17px] leading-relaxed text-slate-800">
                  Každá škola si seřadí všechny uchazeče podle svých kritérií. Pořadí, ve kterém sis obory
                  zapsal na přihlášku, do toho pořadí nevstupuje. Určuje jen jedno: <b>kam nastoupíš, když tě
                  přijme víc škol</b>.
                </p>
              </Karta>

              <h3 className="pt-2 text-[20px] font-bold text-[#16325c]">Jak to probíhá</h3>
              <ol className="space-y-3">
                {[
                  ['Školy sestaví pořadí', 'Každá škola seřadí uchazeče podle svých kritérií: výsledek jednotné zkoušky, u části škol i školní zkouška, prospěch nebo soutěže.'],
                  ['Každý se uchází o obor, který má na přihlášce nejvýš', 'Systém zkusí umístit uchazeče na jeho první volbu. Kdo se tam vejde do počtu míst, je zatím přijatý.'],
                  ['Kdo se nevešel, posouvá se níž', 'Systém ho automaticky zkusí umístit na další obor z jeho přihlášky. Nic pro to nemusí dělat.'],
                  ['Posuny pokračují, dokud se to neustálí', 'Nově příchozí uchazeč s lepším výsledkem může vytlačit někoho, kdo už místo měl. Ten se pak posouvá dál. Proto se tomu říká odložené přijetí: přijetí je jisté až na konci.'],
                ].map(([nadpis, text], i) => (
                  <li key={nadpis} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16325c] text-[15px] font-bold text-white" aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="text-[17px] font-semibold text-[#16325c]">{nadpis}</p>
                      <p className="mt-1 text-[16px] leading-relaxed text-slate-700">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <h3 className="pt-2 text-[20px] font-bold text-[#16325c]">Na příkladu</h3>
              <Karta>
                <p className="text-[16px] leading-relaxed text-slate-700">
                  Gymnázium má <b>2 místa</b> a tři uchazeče. Čísla jsou vymyšlená; skutečné výsledky přijatých
                  najdeš u konkrétního oboru. Body jsou na škále 0 až 100, tedy nejvýš 50 za češtinu a 50 za matematiku.
                </p>
                <ul className="mt-4 grid gap-3 md:grid-cols-3">
                  {[['Anna', 80], ['Boris', 85], ['Cyril', 75]].map(([jmeno, body]) => (
                    <li key={String(jmeno)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <p className="text-[16px] font-semibold text-[#16325c]">{jmeno}</p>
                      <p className="text-[22px] font-bold tabular-nums text-[#0074e4]">{body}</p>
                      <p className="text-[13px] text-slate-500">bodů ze 100</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 space-y-3 text-[16px] leading-relaxed text-slate-800">
                  <p>
                    <b>Když se Boris dostane jinam</b> na obor, který má na přihlášce výš, o tenhle obor se už neuchází.
                    Místa zůstanou Anně a Cyrilovi a oba jsou přijatí.
                  </p>
                  <p>
                    <b>Když se Boris jinam nedostane</b>, posune se sem. S 85 body je před Cyrilem se 75, takže
                    obsadí druhé místo a <b>Cyril se posouvá na další obor ze své přihlášky</b>. Cyril neudělal
                    nic špatně a nic nezanedbal; jen se uvolnilo méně míst, než čekal.
                  </p>
                </div>
                <p className="mt-4 rounded-xl bg-[#eef5ff] p-4 text-[16px] leading-relaxed text-slate-800">
                  Z toho plyne to hlavní: <b>ambiciózní škola na prvním místě tě nic nestojí</b>. Když se na ni
                  nedostaneš, systém tě sám posune na další obor z přihlášky, a to se stejnými výsledky, jaké bys
                  měl, kdybys ji tam nenapsal.
                </p>
              </Karta>

              <h3 className="pt-2 text-[20px] font-bold text-[#16325c]">Tři rady, které kolují a neplatí</h3>
              <ul className="space-y-3">
                {[
                  ['„Dej si školu na první místo, zvýšíš tím šanci.“', 'Škola pořadí na přihlášce nevidí při řazení uchazečů. Zvýšit tím šanci nelze.'],
                  ['„U toho oboru měli skoro všichni přijatí první volbu, tam se jinak nedostaneš.“', 'Vzniká to tím, že kdo se dostal na obor zapsaný výš, sem už nenastoupí. Je to popis, ne pravidlo.'],
                  ['„Třetí volba je ztracená, tam už se nikdo nedostane.“', 'Třetí obor se posuzuje úplně stejně jako první. Rozdíl je jen v tom, že se na něj dostane řada na uchazeče, které přijal obor výš.'],
                ].map(([mytus, realita]) => (
                  <li key={mytus} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-[16px] font-semibold text-slate-500">{mytus}</p>
                    <p className="mt-2 text-[17px] leading-relaxed text-[#16325c]">{realita}</p>
                  </li>
                ))}
              </ul>
            </Krok>

            {/* ---------------------------------------------------------------- 2 */}
            <Krok id="kriteria" cislo={2} nadpis="Co škola zveřejní a co z toho neplyne" otazka="Kritéria přijetí vyhlašuje každá škola sama a jsou závazná. Najdeš je na jejím webu, ne u nás.">
              <Karta barva="vystraha">
                <p className="text-[18px] font-bold text-[#16325c]">O přijetí často nerozhoduje jen jednotná zkouška.</p>
                <p className="mt-2 text-[17px] leading-relaxed text-slate-800">
                  Školy smí k výsledku jednotné zkoušky připočítat body za prospěch na základní škole, za soutěže
                  nebo za vlastní školní zkoušku. U části škol jde o významný díl hodnocení.{' '}
                  <b>Tyhle body v datech nemáme</b> a nikdo je centrálně nezveřejňuje. Znamená to, že průměry
                  přijatých, které u oborů ukazujeme, popisují jen jednotnou zkoušku.
                </p>
                <p className="mt-2 text-[17px] leading-relaxed text-slate-800">
                  Proto je čtení kritérií na webu školy nenahraditelný krok. Je to jediný závazný text.
                </p>
              </Karta>
              <Karta>
                <p className="text-[17px] font-semibold text-[#16325c]">Co v kritériích hledat</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] leading-relaxed text-slate-700">
                  <li>jestli škola pořádá <b>vlastní školní zkoušku</b> a kdy;</li>
                  <li>kolik váží jednotná zkouška proti ostatnímu;</li>
                  <li>jestli je stanovené <b>minimum bodů</b>, bez kterého škola nepřijme nikoho;</li>
                  <li>jestli se vyžaduje potvrzení lékaře nebo jiný doklad.</li>
                </ul>
              </Karta>
              <p className="text-[16px] leading-relaxed text-slate-700">
                Odkaz na web školy je na stránce každého oboru. U škol, které nám údaje potvrdily, najdeš
                kritéria a termíny rovnou u nás, označené jako potvrzené školou.
              </p>
            </Krok>

            {/* ---------------------------------------------------------------- 3 */}
            <Krok id="kandidati" cislo={3} nadpis="Najít kandidáty" otazka="Než začneš porovnávat, potřebuješ seznam škol, které přicházejí v úvahu. Rozhodují dvě věci: co chce dítě dělat a jak daleko je ochotné jezdit.">
              <div className="grid gap-4 md:grid-cols-2">
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Podle místa</p>
                  <p className="mt-1 text-[16px] leading-relaxed text-slate-700">
                    Dvě hodiny dojíždění denně jsou čtyři roky života. Dojezdovost počítá skutečné spojení
                    veřejnou dopravou, ne vzdálenost vzdušnou čarou.
                  </p>
                  <div className="mt-3 space-y-1">
                    <Dal href="/dostupnost" popis="kam se dostaneš do zvolené doby">Dojezdovost</Dal>
                    <Dal href="/mesto" popis="přehled podle měst">Školy ve městě</Dal>
                    <Dal href="/regiony" popis="přehled podle krajů">Školy v kraji</Dal>
                  </div>
                </Karta>
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Podle typu oboru</p>
                  <p className="mt-1 text-[16px] leading-relaxed text-slate-700">
                    Gymnázium odkládá rozhodnutí o povolání, odborná škola ho dělá teď. Víceletá gymnázia
                    znamenají přijímačky už z 5. nebo 7. třídy.
                  </p>
                  <div className="mt-3 space-y-1">
                    <Dal href="/skoly" popis="obory seřazené podle zájmu uchazečů">Přehled oborů</Dal>
                  </div>
                </Karta>
              </div>
              <Karta barva="modra">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  <b>Pozor na jedno číslo.</b> „Přihlášek na místo“ vypadá jako míra obtížnosti, ale nadsazuje ji:
                  jeden uchazeč podává až tři přihlášky, takže se tytéž děti počítají víckrát. Spolehlivější je
                  podíl přijatých ze <b>soutěžících uchazečů</b>, tedy z těch, kdo splnili požadavky školy a
                  nedostali se na obor, který měli na přihlášce výš. Ten u každého oboru ukazujeme.
                </p>
              </Karta>
            </Krok>

            {/* ---------------------------------------------------------------- 4 */}
            <Krok id="posoudit" cislo={4} nadpis="Posoudit jednu školu" otazka="U konkrétní školy se dá zjistit víc, než kolik lidí se tam hlásí. Stránka školy odpovídá na pět otázek, stránka oboru na tři.">
              <div className="grid gap-4 md:grid-cols-2">
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Stránka školy</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] leading-relaxed text-slate-700">
                    <li>co tu lze studovat a jak těžké je se dostat;</li>
                    <li>jak si škola vede u maturity proti podobným školám;</li>
                    <li>co o ní píše školní inspekce: co chválí, co vytýká, komu škola sedne;</li>
                    <li>kde přesně je a jak se tam jezdí;</li>
                    <li>kam se hlásí titíž uchazeči, tedy co si rodiny vybírají vedle ní.</li>
                  </ul>
                </Karta>
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Stránka oboru</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] leading-relaxed text-slate-700">
                    <li>jak dopadli uchazeči v posledním kole;</li>
                    <li>co o přijetí rozhodlo a s jakými výsledky přicházejí spolužáci;</li>
                    <li>jestli se obor naplnil, nebo bylo druhé kolo.</li>
                  </ul>
                </Karta>
              </div>
              <Karta barva="modra">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  <b>Maturitní výsledky čti opatrně.</b> Popisují úroveň maturitního ročníku, ne kvalitu výuky.
                  Do výsledku se hlavně promítá, koho škola přijala: výběrové gymnázium bude mít lepší čísla
                  než odborná škola bez ohledu na to, jak učí. Proto u nich vždy ukazujeme i to, s jakými
                  výsledky přicházeli přijatí uchazeči.
                </p>
              </Karta>
              <Karta>
                <p className="text-[17px] font-semibold text-[#16325c]">Na co se zeptat na dni otevřených dveří</p>
                <p className="mt-1 text-[16px] leading-relaxed text-slate-700">
                  Data neodpoví na to, jestli se tam bude dítě cítit dobře. U škol s rozborem inspekční zprávy
                  navrhujeme konkrétní otázky přímo na stránce školy. Obecně stojí za to zeptat se, kolik žáků
                  ročník nedokončí, jak škola pomáhá, když někdo nestíhá, a co dělají absolventi.
                </p>
              </Karta>
            </Krok>

            {/* ---------------------------------------------------------------- 5 */}
            <Krok id="prihlasky" cislo={5} nadpis="Sestavit tři přihlášky" otazka="Přihlášky se podávají až na tři obory. Protože pořadí nerozhoduje o přijetí, nejlepší strategie je rozptýlit ambice.">
              <ol className="space-y-3">
                {[
                  ['Škola, kterou dítě opravdu chce', 'I když to vypadá nadsazeně. Když se nedostane, systém ho sám posune dál a nic tím neztratí.'],
                  ['Škola, kde to podle loňských výsledků vychází', 'Porovnej výsledky přijatých v posledním kole s tím, jak dítě píše testy nanečisto.'],
                  ['Škola, kde se dostala většina uchazečů', 'Ne jako rezignace, ale jako jistota, že dítě někam nastoupí. Musí to být škola, kam je ochotné jít.'],
                ].map(([nadpis, text], i) => (
                  <li key={nadpis} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0074e4] text-[15px] font-bold text-white" aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="text-[17px] font-semibold text-[#16325c]">{nadpis}</p>
                      <p className="mt-1 text-[16px] leading-relaxed text-slate-700">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Karta barva="vystraha">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  <b>Jedna chyba stojí za všechny ostatní:</b> dát si jistotu na první místo. Když tě přijme,
                  na obory zapsané níž se už nedostaneš, i kdyby tě taky přijaly. Pořadí totiž určuje právě to,
                  kam nastoupíš, když uspěješ víckrát.
                </p>
              </Karta>
            </Krok>

            {/* ---------------------------------------------------------------- 6 */}
            <Krok id="porovnat" cislo={6} nadpis="Porovnat kandidáty vedle sebe" otazka="Když máš užší výběr, vyplatí se položit obory vedle sebe. U každého oboru je tlačítko „Uložit mezi zvažované“ a uložené obory se porovnají v jedné tabulce.">
              <Karta>
                <p className="text-[16px] leading-relaxed text-slate-700">
                  V porovnání můžeš zadat, kolik bodů dítě psalo v testech nanečisto, a uvidíš rozdíl proti
                  průměru přijatých v posledním kole. Body zůstávají v tomhle prohlížeči, nikam se neodesílají.
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-slate-700">
                  <b>Co ten rozdíl není:</b> není to pravděpodobnost přijetí ani bodové minimum. Průměr přijatých
                  je průměr, takže polovina přijatých ho měla nižší. A obtížnost testů se rok od roku liší, takže
                  se body dvou ročníků nesmí stavět vedle sebe bez přepočtu.
                </p>
              </Karta>
              <Dal href="/simulator?vyber=1" popis="uložené obory vedle sebe, s vlastními body">Zvažované obory</Dal>
            </Krok>

            {/* ---------------------------------------------------------------- 7 */}
            <Krok id="priprava" cislo={7} nadpis="Připravit se na zkoušku" otazka="Jednotná zkouška je jeden test z češtiny a jeden z matematiky, každý za 50 bodů. Píše se ve dvou termínech a počítá se lepší výsledek.">
              <div className="grid gap-4 md:grid-cols-2">
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Postup, který funguje</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-[16px] leading-relaxed text-slate-700">
                    <li>napsat jeden loňský test naostro a změřit čas;</li>
                    <li>podívat se, kde se ztrácely body, ne kolik jich bylo;</li>
                    <li>procvičovat právě ta místa, ne celý předmět znovu;</li>
                    <li>zopakovat celý test za měsíc a porovnat.</li>
                  </ol>
                </Karta>
                <Karta>
                  <p className="text-[17px] font-semibold text-[#16325c]">Kde vzít zadání</p>
                  <p className="mt-1 text-[16px] leading-relaxed text-slate-700">
                    Zadání ani testy nanečisto nemáme, dělá je CERMAT a další. Oficiální zadání minulých ročníků
                    jsou zdarma na webu CERMATu.
                  </p>
                  <p className="mt-3 text-[16px]">
                    <a href="https://prijimacky.cermat.cz/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">prijimacky.cermat.cz →</a>
                    <span className="ml-2 text-slate-600">zadání a klíče minulých let</span>
                  </p>
                </Karta>
              </div>
              <Karta barva="modra">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  <b>Počítej s časem.</b> Většina ztracených bodů nevzniká tím, že by uchazeč úlohu neuměl, ale
                  tím, že na ni nedošlo. Trénovat se proto musí i tempo, ne jen látka.
                </p>
              </Karta>
            </Krok>

            {/* ---------------------------------------------------------------- 8 */}
            <Krok id="druhe-kolo" cislo={8} nadpis="Když to nevyjde" otazka="Nepřijetí v prvním kole není konec. Školy, kterým zůstala volná místa, vypisují druhé kolo a to má vlastní termíny.">
              {druheKolo && (
                <ol className="grid gap-3 md:grid-cols-2">
                  {druheKolo.events.map(e => (
                    <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[15px] font-bold text-[#0074e4]">{e.date}</p>
                      <p className="mt-1 text-[17px] font-semibold text-[#16325c]">{e.title}</p>
                    </li>
                  ))}
                </ol>
              )}
              <Karta>
                <p className="text-[16px] leading-relaxed text-slate-700">
                  U každého oboru píšeme, jestli druhé kolo v posledním kole vypsal, a kolik v něm bylo míst.
                  Není to příslib pro příští rok, ale vodítko: obor, který druhé kolo vypisuje pravidelně, ho
                  nejspíš vypíše zas.
                </p>
              </Karta>
              <Karta barva="modra">
                <p className="text-[16px] leading-relaxed text-slate-800">
                  Ve druhém kole se výsledek jednotné zkoušky z prvního kola <b>použije znovu</b>, nepíše se
                  nová. Kritéria si ale škola stanovuje pro druhé kolo samostatně.
                </p>
              </Karta>
            </Krok>
          </div>

          <div className="mt-14 rounded-2xl bg-[#16325c] p-6 text-white md:p-8">
            <h2 className="text-[24px] font-bold">Začni u seznamu kandidátů</h2>
            <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed text-slate-200">
              Najdi školy v dosahu, otevři si jejich stránky a obory, které vypadají dobře, si ulož mezi
              zvažované. Porovnáš je pak na jednom místě.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/skoly" className="rounded-lg bg-white px-5 py-3 text-[16px] font-semibold text-[#16325c] hover:bg-slate-100">Přehled oborů</Link>
              <Link href="/dostupnost" className="rounded-lg border border-white/40 px-5 py-3 text-[16px] font-semibold text-white hover:bg-white/10">Dojezdovost</Link>
              <Link href="/prijimacky-2027" className="rounded-lg border border-white/40 px-5 py-3 text-[16px] font-semibold text-white hover:bg-white/10">Kalendář termínů</Link>
            </div>
          </div>

          <p className="mt-8 text-[14px] leading-relaxed text-slate-500">
            Termíny jsou opsané z harmonogramu MŠMT, ověřeno {calendar.checkedAt}. Údaje o školách pocházejí
            z otevřených dat CERMATu, MŠMT a České školní inspekce. Kritéria přijetí vyhlašuje každá škola
            sama a platí to, co zveřejní ona.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
