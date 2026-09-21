import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  CLOVEKODNU_CELKEM,
  HODIN_ZA_DEN,
  VLASTNI_CAS_HODIN,
} from '@/lib/naklady-vyvoje';
import {
  DOKLADY,
  FAZE_AGENTNI,
  FAZE_ZAKAZKA,
  SMLOUVY,
  SROVNANI,
  ZAKAZKA_MESICU,
  type Faze,
} from '@/lib/zpusob-vyvoje';

/**
 * Jak projekt vznikal: dva způsoby vedení téhož díla.
 *
 * Doplněk k manažerskému shrnutí na /o-projektu, které odpovídá na otázku
 * „co by to stálo“. Tahle stránka odpovídá na otázku „proč by to vypadalo
 * jinak“, a to je jiná otázka: rozdíl mezi oběma postupy není hlavně v ceně,
 * ale v tom, kdy se rozhoduje, co web bude umět.
 *
 * Stránka drží dvě pravidla, aby nečetla jako propagace:
 *  1. **Slabiny obou modelů stojí vedle sebe.** Zakázkový model se nekarikuje;
 *     má důvody, proč vypadá, jak vypadá. Agentní postup má vypsanou svou
 *     hlavní slabinu, tedy že autor si schvaluje sám.
 *  2. **Tvrzení o tomto projektu mají doklad v repozitáři.** Oddíl s nálezy
 *     odkazuje na konkrétní rozbory a záznamy změn, ne na dojmy.
 *
 * Neodkazovaná stejně jako /o-projektu: `robots: noindex`, mimo mapu webu.
 */

export const metadata: Metadata = {
  title: 'Jak projekt vznikal: zakázka proti rozhodování za pochodu',
  description:
    'Tentýž web dvěma způsoby vedení: jako veřejná zakázka pro ministerstvo a jako projekt, '
    + 've kterém se o zadání rozhoduje průběžně. Co každý postup umí a kde selhává.',
  robots: { index: false, follow: false },
};

const cislo = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);
const milionyKc = (n: number) =>
  `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(n / 1_000_000)} mil. Kč`;

function Nadpis({ id, cislo: poradi, children }: { id: string; cislo: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl md:text-3xl font-bold mt-14 mb-4 scroll-mt-24" style={{ color: '#28313b' }}>
      <span className="text-slate-400 mr-2">{poradi}.</span>
      {children}
    </h2>
  );
}

/** Jedna fáze jako karta. Stejný tvar pro oba modely, aby šly číst vedle sebe. */
function Krok({ faze, poradi, barva }: { faze: Faze; poradi: number; barva: string }) {
  return (
    <div className="flex gap-4">
      <div
        className="shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center"
        style={{ backgroundColor: barva }}
      >
        {poradi}
      </div>
      <div className="flex-1 pb-6 border-b border-slate-200">
        <div className="font-semibold text-slate-800">{faze.nazev}</div>
        <p className="text-sm text-slate-700 mt-1">{faze.popis}</p>
        <dl className="mt-2 text-xs text-slate-600 space-y-0.5">
          <div>
            <dt className="inline font-medium">Rozhoduje: </dt>
            <dd className="inline">{faze.rozhoduje}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Výstup: </dt>
            <dd className="inline">{faze.vystup}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Trvá: </dt>
            <dd className="inline">{faze.doba}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function JakVznikalPage() {
  const hodinTymu = CLOVEKODNU_CELKEM * HODIN_ZA_DEN;
  const prumerSmlouvy = SMLOUVY.celkemKc / SMLOUVY.pocet;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12" style={{ backgroundColor: '#ffffff' }}>
          <div className="max-w-3xl mx-auto px-4">

            <p className="text-sm text-slate-500 mb-2">
              <Link href="/o-projektu" className="underline" style={{ color: '#0074e4' }}>
                O projektu
              </Link>{' '}
              / Jak vznikal
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#28313b' }}>
              Jak projekt vznikal
            </h1>
            <p className="text-lg text-slate-700">
              Co by se stalo, kdyby tenhle web zadalo ministerstvo? Zadání, soutěž, specifikace,
              realizace, přejímka. Standardní postup veřejné správy, kterým u nás vzniká skoro
              každý státní web. Já šel jinudy: o tom, co web bude umět, jsem rozhodoval průběžně
              a podle toho, co se zrovna našlo ve zdrojových datech.
            </p>
            <p className="text-slate-700 mt-4">
              Tahle stránka nestaví jeden postup proti druhému jako dobrý proti špatnému. Staví
              je vedle sebe, protože <strong>každý chrání před jiným rizikem</strong> a za tu
              ochranu platí jinou cenu. Kdo si má vybrat, potřebuje vědět kterou.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="riziko" cislo={1}>Proti čemu se který postup chrání</Nadpis>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="p-5 rounded-lg border-t-4 bg-slate-50" style={{ borderColor: '#64748b' }}>
                <div className="font-bold text-slate-800 mb-2">Zakázka chrání zadavatele</div>
                <p className="text-sm text-slate-700">
                  Ministerstvo utrácí veřejné peníze a musí doložit, že dostalo, co objednalo.
                  Proto se zadání zafixuje na začátku a přejímka hlídá shodu s ním. Bez toho by
                  nešlo poznat dodavatele, který dodal, od toho, který nedodal. Dává to smysl.
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  <strong>Cena té ochrany:</strong> zadání vzniká dřív, než kdokoli otevřel
                  zdrojová data. Co se zjistí později, je změna zadání.
                </p>
              </div>
              <div className="p-5 rounded-lg border-t-4 bg-slate-50" style={{ borderColor: '#0074e4' }}>
                <div className="font-bold text-slate-800 mb-2">Průběžné vedení chrání výsledek</div>
                <p className="text-sm text-slate-700">
                  Když oprava chybného rozhodnutí stojí hodiny, vyplatí se opravit i to, co by
                  se jinak obhajovalo do konce projektu. Zadání se smí měnit, protože změna
                  nikoho nestojí smluvní spor.
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  <strong>Cena té ochrany:</strong> nikdo nezávislý nekontroluje, že autor
                  rozhodl správně. Schvaluje si sám.
                </p>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="zakazka" cislo={2}>Cesta první: zakázka pro ministerstvo</Nadpis>
            <p className="text-slate-700 mb-6">
              Sedm fází, kterými v té či oné podobě projde každá veřejná zakázka na informační
              systém. Pořadí je závazné a fáze nejdou přeskočit: každá se opírá o schválený výstup
              té předchozí.
            </p>
            <div className="space-y-0">
              {FAZE_ZAKAZKA.map((f, i) => (
                <Krok key={f.nazev} faze={f} poradi={i + 1} barva="#64748b" />
              ))}
            </div>
            <div className="mt-6 p-5 rounded-lg border-l-4 bg-slate-50" style={{ borderColor: '#64748b' }}>
              <div className="text-sm text-slate-600 mb-1">Od záměru k webu, který uvidí veřejnost</div>
              <div className="text-2xl font-bold" style={{ color: '#28313b' }}>
                {ZAKAZKA_MESICU.od} až {ZAKAZKA_MESICU.do} měsíců
              </div>
              <div className="text-sm text-slate-700 mt-2">
                Součet dolních a horních mezí fází. Práce na webu z toho tvoří zhruba polovinu,
                zbytek je příprava, soutěž, schvalování a přejímka. Je to odhad běžného průběhu,
                ne měření konkrétní zakázky.
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="prubezne" cislo={3}>Cesta druhá: rozhodování za pochodu</Nadpis>
            <p className="text-slate-700 mb-6">
              Tady jde o <strong>smyčku</strong>. Každá funkce projde těmito pěti kroky zvlášť
              a projde jimi znovu, když se ukáže, že napoprvé stála na špatném předpokladu. Právě
              to opakování je na celém postupu podstatné.
            </p>
            <div className="space-y-0">
              {FAZE_AGENTNI.map((f, i) => (
                <Krok key={f.nazev} faze={f} poradi={i + 1} barva="#0074e4" />
              ))}
            </div>
            <div className="mt-6 p-5 rounded-lg border-l-4" style={{ backgroundColor: '#f1f7ff', borderColor: '#0074e4' }}>
              <div className="text-sm text-slate-600 mb-1">Od začátku k webu, který uvidí veřejnost</div>
              <div className="text-2xl font-bold" style={{ color: '#28313b' }}>
                první den
              </div>
              <div className="text-sm text-slate-700 mt-2">
                První verze šla ven v den, kdy projekt začal, a od té doby se mění dál. Za to
                nemůže rychlost psaní. Nasazení prostě nečeká na přejímku.
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="srovnani" cislo={4}>Osm otázek, ve kterých se to liší</Nadpis>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-3 font-semibold w-1/3">Otázka</th>
                    <th className="py-2 pr-3 font-semibold">Zakázka</th>
                    <th className="py-2 font-semibold">Za pochodu</th>
                  </tr>
                </thead>
                <tbody>
                  {SROVNANI.map((s) => (
                    <tr key={s.otazka} className="border-b border-slate-200 align-top">
                      <td className="py-3 pr-3 font-medium text-slate-800">{s.otazka}</td>
                      <td className="py-3 pr-3 text-slate-700">{s.zakazka}</td>
                      <td className="py-3 text-slate-700">{s.agentni}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Poslední dva řádky se v podobných srovnáních obvykle vynechávají. Nezávislá
              kontrola a odolnost proti odchodu člověka jsou skutečné přednosti zakázkového
              modelu. Formality navíc to nejsou.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="doklady" cislo={5}>Pět případů, kdy se rozhodnutí ukázalo jako špatné</Nadpis>
            <p className="text-slate-700">
              Tohle je jádro celého rozdílu. Ve všech pěti případech jsem až po rozhodnutí
              zjistil, že stálo na špatném předpokladu. Všechny jsou doložené v repozitáři,
              včetně toho, co jsem zamítl a proč.
            </p>
            <div className="mt-5 space-y-5">
              {DOKLADY.map((d) => (
                <div key={d.zdroj + d.nalez.slice(0, 20)} className="border-l-4 border-slate-300 pl-4">
                  <p className="text-slate-700">{d.nalez}</p>
                  <p className="text-sm text-slate-600 mt-2">
                    <strong>V zakázce:</strong> {d.vZakazce}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{d.zdroj}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-700 mt-6">
              Zakázkový model by tenhle web nepostavil špatně. Postavil by ho podle zadání,
              které vzniklo dřív, než kdokoli otevřel zdrojová data. A právě v těch datech se
              našla podstatná část toho, co web dnes umí.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="cena" cislo={6}>Co to stojí</Nadpis>
            <p className="text-slate-700">
              Odhad práce na webu je v{' '}
              <Link href="/o-projektu#cena" className="underline" style={{ color: '#0074e4' }}>
                manažerském shrnutí
              </Link>{' '}
              rozepsaný na bloky: {cislo(CLOVEKODNU_CELKEM)} člověkodnů, tedy{' '}
              {cislo(hodinTymu)} hodin. To je ale jen fáze realizace. Zakázkový model k ní přidává
              přípravu zadání, soutěž, specifikaci, přejímku a předávací dokumentaci, což u díla
              této velikosti bývá zhruba čtvrtina až třetina rozpočtu navíc.
            </p>
            <p className="text-slate-700 mt-4">
              Pro řádovou představu, v jakém pásmu se takové smlouvy pohybují: registr smluv
              obsahuje <strong>{cislo(SMLOUVY.pocet)} smluv</strong> veřejných institucí
              zařazených do informačních technologií se vztahem k portálům, informačním systémům
              a vzdělávání, v pásmu {milionyKc(SMLOUVY.pasmoOdKc)} až{' '}
              {milionyKc(SMLOUVY.pasmoDoKc)}, v celkové hodnotě{' '}
              {milionyKc(SMLOUVY.celkemKc)}. Průměr vychází na {milionyKc(prumerSmlouvy)}.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Je to <strong>hrubý filtr</strong>. Množina obsahuje vývoj, provoz i licence
              dohromady a klíčová slova nerozliší web od účetního systému. Co stojí postavit
              tenhle web, z ní nevyčtete. Říká jen, v jakém řádu se pohybují smlouvy, pod které
              by takové dílo spadlo. Data k {SMLOUVY.kDatu} z{' '}
              <a
                href={SMLOUVY.odkaz}
                className="underline"
                style={{ color: '#0074e4' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                registru smluv přes Hlídač státu
              </a>.
            </p>
            <p className="text-slate-700 mt-4">
              Proti tomu stojí zhruba {cislo(VLASTNI_CAS_HODIN)} hodin mého času, ve kterých
              navíc vznikal i druhý projekt. Dělit jedno druhým a vydávat výsledek za míru úspory
              by bylo přehnané, protože porovnávám odhad s odhadem. Řádový rozdíl je ale příliš
              velký na to, aby ho vysvětlila nepřesnost obou čísel.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="komu" cislo={7}>Pro co se který postup hodí</Nadpis>
            <p className="text-slate-700">
              Znamená to snad, že má veřejná správa přestat soutěžit zakázky? Nic takového.
              Plyne z toho jen, kdy je který postup na místě.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div className="p-5 rounded-lg border border-slate-300">
                <div className="font-bold text-slate-800 mb-2">Zakázka se hodí, když</div>
                <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
                  <li>je předem jasné, co má systém dělat, protože to určuje zákon nebo vyhláška,</li>
                  <li>dílo musí běžet i po odchodu kohokoli, kdo ho stavěl,</li>
                  <li>je potřeba nezávislá kontrola, protože jde o veřejné peníze a odpovědnost,</li>
                  <li>výsledek se bude provozovat léta a někdo za něj musí ručit.</li>
                </ul>
              </div>
              <div className="p-5 rounded-lg border border-slate-300">
                <div className="font-bold text-slate-800 mb-2">Průběžné vedení se hodí, když</div>
                <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
                  <li>se teprve zjišťuje, co v datech je a co z nich jde říct,</li>
                  <li>se dá nasazovat po částech a mýlka se opraví bez škody,</li>
                  <li>má kdo rozhodovat rychle a nést za to odpovědnost,</li>
                  <li>je přijatelné, že projekt stojí a padá s jedním člověkem.</li>
                </ul>
              </div>
            </div>
            <p className="text-slate-700 mt-5">
              Tenhle web je druhý případ. Kdyby ho měl převzít stát a provozovat jako veřejnou
              službu, potřeboval by ten první: někoho, kdo za něj ručí, a kontrolu nezávislou na
              jednom člověku. Odpověď na tuhle otázku tady nenajdete.
            </p>

            {/* ------------------------------------------------------------ */}
            <div className="mt-14 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Co web umí, odkud bere data a co by stál jeho vývoj, je v{' '}
                <Link href="/o-projektu" className="underline" style={{ color: '#0074e4' }}>
                  manažerském shrnutí
                </Link>
                . Zdrojový kód a všechny rozbory jsou na{' '}
                <a
                  href="https://github.com/tangero/stredniskoly"
                  className="underline"
                  style={{ color: '#0074e4' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHubu
                </a>.
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
