import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { changelog } from '@/lib/changelog';
import {
  casovaOsa,
  mesicuVyvoje,
  pokryti,
  prehledDatovychSad,
  type Pouziti,
} from '@/lib/o-projektu';
import {
  BLOKY,
  CLOVEKODNU_CELKEM,
  CLOVEKODNU_PRACE,
  CLOVEKODNU_RIZENI,
  DOKUMENTACE,
  HODIN_ZA_DEN,
  MERENO,
  BEHU_CI,
  COMMITU,
  RADKU_CELKEM,
  REZIE_RIZENI,
  SAZBY,
  TESTU,
  VLASTNI_CAS_HODIN,
  VYHRADY,
  cenaZaSazbu,
} from '@/lib/naklady-vyvoje';

/**
 * Manažerské shrnutí projektu.
 *
 * Komu je určené: školám, úřadům a novinářům, kteří chtějí vědět, odkud web
 * bere čísla, jak s nimi zachází a co takové dílo stojí. Proto jde po
 * doložitelnosti, ne po marketingu.
 *
 * Stránka je **neodkazovaná**: nevede na ni nic z navigace ani z patičky, není
 * v mapě webu (`scripts/generate-sitemap.mjs` staví seznam statických adres
 * výčtem) a nese `robots: noindex`. Posílá se odkazem. Až se má zveřejnit,
 * stačí odebrat `robots` a přidat adresu do výčtu v generátoru.
 *
 * Co se odkud bere:
 *  - počty škol, nabídek a pokrytí ze souborů, které web stejně používá,
 *  - přehled datových sad z registru `public/stav_datovych_sad.json`,
 *  - časová osa z veřejného changelogu,
 *  - rozsah kódu a odhad ceny z `src/lib/naklady-vyvoje.ts`, kde je i postup.
 *
 * Napevno se tu nepíše žádný letopočet dat ani počet škol. Jediná ruční čísla
 * jsou v modulu nákladů a nesou datum měření.
 */

export const metadata: Metadata = {
  title: 'O projektu: data, provoz a cena vývoje',
  description:
    'Manažerské shrnutí webu Přijímačky na školu. Jaká veřejná data používá, jak je zpracovává, '
    + 'jak je postavený a kolik by jeho vývoj stál u dodavatele.',
  robots: { index: false, follow: false },
};

const DATUM_SHRNUTI = '21. 9. 2026';

const cislo = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);
const koruny = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
    .format(n);
const milionyKc = (n: number) =>
  `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(n / 1_000_000)} mil. Kč`;

/** Český tvar počitatelného podstatného jména: 1 ukazatel, 2 ukazatele, 5 ukazatelů. */
function tvar(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return jeden;
  if (n >= 2 && n <= 4) return dva;
  return pet;
}

/** Datum z registru (RRRR-MM-DD) do tvaru, jakým se píše v textu. */
function datumCesky(iso: string | null): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : iso;
}

/**
 * Období datové sady pro čtenáře. Registr u průběžně sklízených zdrojů vede
 * místo ročníku slovo „prubezne“, které do textu nepatří.
 */
function obdobiCesky(obdobi: string | null): string {
  if (!obdobi) return '—';
  if (obdobi === 'prubezne') return 'průběžně';
  return datumCesky(obdobi) ?? obdobi;
}

const POUZITI_POPIS: Record<Pouziti, { stitek: string; barva: string }> = {
  web: { stitek: 'zobrazuje se', barva: '#0074e4' },
  analyza: { stitek: 'jen rozbory', barva: '#7c3aed' },
  planovano: { stitek: 'schváleno, nenasazeno', barva: '#b45309' },
  nepouzito: { stitek: 'leží ladem', barva: '#64748b' },
  nezobrazovat: { stitek: 'zobrazovat se nesmí', barva: '#be123c' },
};

const AUTOMATIZACE_POPIS: Record<string, string> = {
  plna: 'celé automaticky',
  priprava: 'stažení a kontrola automaticky, převzetí schvaluje člověk',
  detekce: 'automaticky jen upozornění, že data vyšla',
  rucni: 'ručně',
  zadna: 'neaktualizuje se',
};

function Nadpis({ id, cislo: poradi, children }: { id: string; cislo: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl md:text-3xl font-bold mt-14 mb-4 scroll-mt-24" style={{ color: '#28313b' }}>
      <span className="text-slate-400 mr-2">{poradi}.</span>
      {children}
    </h2>
  );
}

function Cislo({ hodnota, popis }: { hodnota: string; popis: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="text-2xl md:text-3xl font-bold" style={{ color: '#0074e4' }}>{hodnota}</div>
      <div className="text-sm text-slate-600 mt-1">{popis}</div>
    </div>
  );
}

export default async function OProjektuPage() {
  const [sady, kryti] = await Promise.all([prehledDatovychSad(), pokryti()]);
  const osa = casovaOsa(changelog);
  const mesicu = mesicuVyvoje(osa);
  const rocnikuKatalogu = kryti.rocnikyKatalogu.length;
  const strednihoProudu = SAZBY.find((s) => s.nazev === 'Střed') ?? SAZBY[1];
  const nejnizsi = Math.min(...SAZBY.map((s) => cenaZaSazbu(s.kcZaHodinu)));
  const nejvyssi = Math.max(...SAZBY.map((s) => cenaZaSazbu(s.kcZaHodinu)));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12" style={{ backgroundColor: '#ffffff' }}>
          <div className="max-w-3xl mx-auto px-4">

            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#28313b' }}>
              O projektu: data, provoz a cena vývoje
            </h1>
            <p className="text-lg text-slate-700">
              Manažerské shrnutí webu <strong>Přijímačky na školu</strong>. Co web dělá, z jakých
              veřejných dat staví, jak je zpracovává a co by jeho vývoj stál, kdyby ho dodala
              běžná agentura.
            </p>
            <p className="text-sm text-slate-500 mt-3">
              Stav k {DATUM_SHRNUTI}. Čísla o datech a školách se berou z týchž souborů, které
              pohánějí web, takže stárnou spolu s ním. Rozsah kódu a odhad ceny jsou měření
              a model k datu {MERENO}.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="co-to-je" cislo={1}>Co web dělá</Nadpis>
            <p className="text-slate-700">
              Přijímací řízení na střední školy vytváří každý rok velké množství veřejných dat.
              CERMAT zveřejňuje, kolik se na který obor přihlásilo uchazečů, kolik jich škola
              přijala a s jakými výsledky jednotné zkoušky. Česká školní inspekce vydává zprávy
              o školách. MŠMT vede rejstřík škol. Data jsou veřejná, ale leží v desítkách
              tabulek, které rodič ani ředitel školy neotevře.
            </p>
            <p className="text-slate-700 mt-4">
              Web tato data spojuje do jednoho místa a odpovídá jimi na otázky, které rodiče
              a žáci skutečně mají: jak velký je o obor zájem, s kolika body se tam někdo dostal
              v posledním uzavřeném ročníku, jak škola dopadá u maturity, co o ní napsala inspekce
              a jak dlouho se tam dítě dostane hromadnou dopravou. Každé číslo má dohledatelný
              zdroj a uvedený rok.
            </p>
            <p className="text-slate-700 mt-4">
              Web vzniká jako otevřený projekt Patricka Zandla ve spolupráci s Hlídačem státu.
              Veškerý kód i postupy zpracování dat jsou veřejné na{' '}
              <a
                href="https://github.com/tangero/stredniskoly"
                className="underline"
                style={{ color: '#0074e4' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHubu
              </a>. Kdokoli si může ověřit, jak se konkrétní číslo spočítalo.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="v-cislech" cislo={2}>Web v číslech</Nadpis>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              <Cislo hodnota={cislo(kryti.skol)} popis="středních škol v katalogu" />
              <Cislo hodnota={cislo(kryti.nabidek)} popis="oborů s vlastní stránkou" />
              <Cislo hodnota={cislo(kryti.kraju)} popis="krajů, tedy celá republika" />
              <Cislo hodnota={cislo(sady.sady.length)} popis="datových sad v registru" />
              <Cislo hodnota={cislo(sady.pocetNaWebu)} popis="z nich se zobrazuje na webu" />
              <Cislo
                hodnota={`${rocnikuKatalogu}`}
                popis={`${tvar(rocnikuKatalogu, 'ročník', 'ročníky', 'ročníků')} přijímacího řízení vedle sebe`}
              />
              <Cislo hodnota={cislo(kryti.extrahovanychZprav)} popis="rozebraných inspekčních zpráv" />
              <Cislo hodnota={cislo(kryti.profiluInspis)} popis="profilů škol z portálu INSPIS" />
              <Cislo hodnota={cislo(kryti.skolSFeedem)} popis="škol, jejichž novinky sklízíme" />
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Katalog drží {kryti.rocnikyKatalogu.map((r) => `${r.rok} (${cislo(r.nabidek)} nabídek)`).join(', ')}.
              Díky tomu jde u oboru ukázat vývoj, ne jen poslední číslo. Seznam škol z inspekce
              je širší než katalog, protože zahrnuje i základní a mateřské školy: je v něm{' '}
              {cislo(kryti.skolVSeznamuCSI)} záznamů.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="data" cislo={3}>Jaká data používáme</Nadpis>
            <p className="text-slate-700">
              Všechna data jsou <strong>veřejná a anonymizovaná</strong>. Web nesbírá nic
              o návštěvnících a nepracuje s údaji o konkrétních dětech; i tam, kde zdroj obsahuje
              jednotlivé uchazeče, jsou to anonymní řádky bez jakékoli možnosti ztotožnění.
            </p>
            <p className="text-slate-700 mt-4">
              Zdroje vede registr datových sad. U každé sady je zapsané, jaké období web
              zobrazuje, kdy se kontrolovala, co se z ní počítá a jak se aktualizuje. Registr je
              závazný: dokud v něm období nepřepneme, web novější data neukáže, ani když už je
              máme stažená. Naposledy se registr měnil {datumCesky(sady.aktualizovano) ?? 'neuvedeno'}.
            </p>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-3 font-semibold">Zdroj</th>
                    <th className="py-2 pr-3 font-semibold">Období</th>
                    <th className="py-2 pr-3 font-semibold">Jak se aktualizuje</th>
                    <th className="py-2 font-semibold">K čemu</th>
                  </tr>
                </thead>
                <tbody>
                  {sady.sady.map((s) => {
                    const p = POUZITI_POPIS[s.pouziti] ?? POUZITI_POPIS.nepouzito;
                    return (
                      <tr key={s.klic} className="border-b border-slate-200 align-top">
                        <td className="py-2 pr-3 text-slate-800">
                          {s.nazev}
                          {s.pocetUkazatelu > 0 && (
                            <span className="block text-xs text-slate-500">
                              {s.pocetUkazatelu}{' '}
                              {tvar(s.pocetUkazatelu, 'ukazatel', 'ukazatele', 'ukazatelů')} na webu
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                          {obdobiCesky(s.obdobi)}
                        </td>
                        <td className="py-2 pr-3 text-slate-600 text-xs">
                          {AUTOMATIZACE_POPIS[s.automatizace] ?? s.automatizace}
                        </td>
                        <td className="py-2 text-xs font-medium whitespace-nowrap" style={{ color: p.barva }}>
                          {p.stitek}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-slate-600 mt-4">
              Že v registru stojí i sady, které se nezobrazují, není nepořádek, ale záměr.
              Soupis má být úplný, aby se při návrhu nové funkce hledalo mezi tím, co projekt
              opravdu má, a ne mezi tím, co už je na webu vidět. Jedna sada je dokonce vedená
              jako <em>zobrazovat se nesmí</em>: obsahuje starší dopočty, které se rozcházejí
              s nynější metodikou.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="zpracovani" cislo={4}>Jak se data dostanou na web</Nadpis>
            <p className="text-slate-700">
              Žádný zdroj se nepřebírá přímo. Mezi zveřejněním dat a jejich zobrazením je linka
              o pěti krocích, kterou z větší části obsluhuje stroj, ale <strong>poslední slovo
              má vždy člověk</strong>:
            </p>
            <ol className="mt-4 space-y-3">
              {[
                ['Zjištění', 'Stroj se pravidelně ptá sledovaných adres, zda se soubor změnil nebo přibyl nový ročník.'],
                ['Příprava', 'Stáhne soubor, spočítá jeho otisk, zkontroluje, že má očekávané sloupce, a zkusmo ho zpracuje stranou od webu.'],
                ['Oznámení', 'Pošle správci shrnutí: co se změnilo, jak velký je rozdíl proti tomu, co web ukazuje, a co se stane po schválení.'],
                ['Schválení', 'Správce odpoví „schvaluji“. Bez toho se nestane nic.'],
                ['Předání', 'Teprve pak vznikne návrh změny ke kontrole. I po jeho přijetí web zobrazí nový ročník až po samostatném přepnutí v registru.'],
              ].map(([nazev, popis], i) => (
                <li key={nazev} className="flex gap-3">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center"
                    style={{ backgroundColor: '#0074e4' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-slate-700">
                    <strong>{nazev}.</strong> {popis}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-slate-700 mt-4">
              Dvojí pojistka, tedy schválení a pak samostatné přepnutí období, je tam schválně.
              Data o přijímacím řízení vycházejí nejprve předběžně a upřesňují se o rok později.
              Kdyby se web aktualizoval sám, mohl by rodičům ukázat čísla, která se ještě změní,
              a nikdo by si toho nevšiml.
            </p>
            <p className="text-slate-700 mt-4">
              Kontrola struktury není formalita. Když zdroj přejmenuje list v tabulce nebo
              vypustí sloupec, zpracování se zastaví a ohlásí to, místo aby tiše vyrobilo web
              s prázdnými hodnotami.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="jak-funguje" cislo={5}>Jak je web postavený</Nadpis>
            <p className="text-slate-700">
              Stránky škol a oborů se <strong>předgenerují dopředu</strong>, ne až při návštěvě.
              Když si rodič otevře konkrétní gymnázium, server nepočítá nic: posílá hotovou
              stránku. Má to tři důsledky, které stojí za zmínku.
            </p>
            <ul className="mt-4 space-y-2 list-disc pl-6 text-slate-700">
              <li>
                <strong>Únor a květen web nepoloží.</strong> Návštěvnost má dva ostré vrcholy,
                kolem podávání přihlášek a kolem výsledků; v únoru je zhruba šestkrát vyšší než
                v létě. Předgenerovaná stránka stojí stejně u sta i u sta tisíc návštěv.
              </li>
              <li>
                <strong>Chyba v datech se projeví při sestavení, ne u návštěvníka.</strong>
                Kontroly běží nad celým katalogem najednou, takže je vidět, že například
                čtrnáct oborů sdílí jednu adresu, dřív než si toho všimne rodič.
              </li>
              <li>
                <strong>Provoz je levný.</strong> Většina webu jsou soubory, ne výpočty.
              </li>
            </ul>
            <p className="text-slate-700 mt-4">
              Dynamické části jsou jen tam, kde bez nich nejde být: vyhledávání, dotaz na dojezd
              hromadnou dopravou, odběr novinek e-mailem a portál, přes který školy spravují
              svůj profil. Ty používají databázi. Sklízeč novinek z webů škol běží dvakrát denně
              odděleně od webu, aby výpadek cizího feedu neovlivnil nic dalšího.
            </p>
            <p className="text-slate-700 mt-4">
              Nad tím vším běží {cislo(TESTU)} automatických testů a {cislo(BEHU_CI)} pravidelných
              kontrol. Některé
              testy prohánějí celou datovou linku proti falešnému zdroji, aby se dalo ověřit
              i chování při rozbitém vstupu, aniž by se čekalo na to, až se rozbije doopravdy.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="casova-osa" cislo={6}>Jak vývoj probíhal</Nadpis>
            <p className="text-slate-700">
              Od první verze {changelog[changelog.length - 1]?.date} do dneška vyšlo{' '}
              {cislo(changelog.length)} vydání. Úplný přehled je ve{' '}
              <Link href="/changelog" className="underline" style={{ color: '#0074e4' }}>
                veřejném changelogu
              </Link>; tady jsou jen měsíce a to hlavní, co v nich přibylo.
            </p>
            <div className="mt-5 space-y-4">
              {osa.map((m) => (
                <div key={m.klic} className="flex gap-4">
                  <div className="shrink-0 w-28 text-sm font-semibold text-slate-500 pt-0.5">
                    {m.popis}
                  </div>
                  <div className="flex-1 border-l-2 border-slate-200 pl-4 pb-1">
                    <div className="text-xs text-slate-500 mb-1">
                      {m.vydani} vydání
                    </div>
                    {m.hlavni.length > 0 ? (
                      <ul className="text-sm text-slate-700 space-y-0.5">
                        {m.hlavni.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">jen opravy</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Rozložení není rovnoměrné a nemá být. Únor stavěl dopravní dostupnost a inspekce,
              jaro patřilo výsledkům přijímaček, léto bylo mrtvé období a září přineslo data
              ročníku {kryti.rocnikyKatalogu[kryti.rocnikyKatalogu.length - 1]?.rok}, přepsané
              stránky školy i oboru, portál pro školy a odběr novinek.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="cena" cislo={7}>Co by vývoj stál</Nadpis>
            <p className="text-slate-700">
              Otázka zní: kolik by stálo objednat tentýž výsledek u dodavatele. Odpověď je odhad
              a nemůže být nic jiného, protože nikdo neodpracoval a nevykázal hodiny, ze kterých
              by se dala sečíst. Aby šel odhad oponovat po částech, je rozepsaný na bloky
              i s tím, proč u každého vychází tolik, kolik vychází.
            </p>
            <p className="text-slate-700 mt-4">
              Změřený rozsah k {MERENO}: <strong>{cislo(RADKU_CELKEM)} řádků kódu</strong> a{' '}
              <strong>{cislo(DOKUMENTACE.souboru)} dokumentů</strong> o zhruba{' '}
              {cislo(DOKUMENTACE.slov)} slovech. Dokumentace tu není přílepek: velkou část tvoří
              rozbory zdrojů a zdůvodnění, proč se ten či onen ukazatel počítá takhle a ne jinak.
            </p>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-3 font-semibold">Blok</th>
                    <th className="py-2 pr-3 font-semibold text-right whitespace-nowrap">Řádků</th>
                    <th className="py-2 font-semibold text-right whitespace-nowrap">Člověkodnů</th>
                  </tr>
                </thead>
                <tbody>
                  {BLOKY.map((b) => (
                    <tr key={b.nazev} className="border-b border-slate-200 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">{b.nazev}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{b.popis}</div>
                        <div className="text-xs text-slate-500 mt-1 italic">{b.zduvodneni}</div>
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-700 whitespace-nowrap">
                        {b.radku === null ? '—' : cislo(b.radku)}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {b.clovekodnu}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200">
                    <td className="py-2 pr-3 text-slate-700">
                      Vedení projektu, koordinace a přejímka
                      <span className="text-xs text-slate-500 block">
                        {Math.round(REZIE_RIZENI * 100)} % k práci výše, běžná režie u dodávky této velikosti
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-500">—</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{CLOVEKODNU_RIZENI}</td>
                  </tr>
                  <tr className="border-t-2 border-slate-400">
                    <td className="py-3 pr-3 font-bold text-slate-900">Celkem</td>
                    <td className="py-3 pr-3 text-right text-slate-700">{cislo(RADKU_CELKEM)}</td>
                    <td className="py-3 text-right font-bold text-lg" style={{ color: '#0074e4' }}>
                      {CLOVEKODNU_CELKEM}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              {CLOVEKODNU_PRACE} člověkodnů práce plus {CLOVEKODNU_RIZENI} na vedení. Pro
              představu: {CLOVEKODNU_CELKEM} člověkodnů odpovídá zhruba dvěma rokům jednoho
              člověka na plný úvazek, nebo osmi měsícům čtyřčlenného týmu.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-3" style={{ color: '#28313b' }}>
              Při běžných českých sazbách
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-3 font-semibold">Varianta</th>
                    <th className="py-2 pr-3 font-semibold text-right whitespace-nowrap">Kč/hod</th>
                    <th className="py-2 font-semibold text-right whitespace-nowrap">Cena dodávky</th>
                  </tr>
                </thead>
                <tbody>
                  {SAZBY.map((s) => (
                    <tr key={s.nazev} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-800">{s.nazev}</div>
                        <div className="text-xs text-slate-600">{s.popis}</div>
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-700 whitespace-nowrap">
                        {cislo(s.kcZaHodinu)}
                      </td>
                      <td
                        className="py-2 text-right font-semibold whitespace-nowrap"
                        style={{ color: s.nazev === 'Střed' ? '#0074e4' : '#28313b' }}
                      >
                        {koruny(cenaZaSazbu(s.kcZaHodinu))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 p-5 rounded-lg border-l-4" style={{ backgroundColor: '#f1f7ff', borderColor: '#0074e4' }}>
              <div className="text-sm text-slate-600 mb-1">Odhad ceny vývoje u dodavatele</div>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: '#28313b' }}>
                {milionyKc(nejnizsi)} až {milionyKc(nejvyssi)}
              </div>
              <div className="text-sm text-slate-700 mt-2">
                Střed {milionyKc(cenaZaSazbu(strednihoProudu.kcZaHodinu))} při{' '}
                {CLOVEKODNU_CELKEM} člověkodnech, {HODIN_ZA_DEN} hodinách denně a sazbě{' '}
                {cislo(strednihoProudu.kcZaHodinu)} Kč za hodinu.
              </div>
            </div>

            <h3 className="text-xl font-bold mt-8 mb-3" style={{ color: '#28313b' }}>
              Kde se odhad může mýlit
            </h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              {VYHRADY.map((v) => <li key={v}>{v}</li>)}
            </ul>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="skutecnost" cislo={8}>Kolik to stálo doopravdy</Nadpis>
            <p className="text-slate-700">
              Tým to nedělal. Web postavil jeden člověk ve spolupráci s jazykovým modelem,
              metodou, které se říká vibecoding: člověk určuje, co se má stát a proč, rozhoduje
              sporné otázky a dílo přebírá; model píše kód, rozbory a dokumentaci.
            </p>
            <p className="text-slate-700 mt-4">
              Nejde o to, že by se práce zlevnila o pár procent. Rozdíl je řádový, a stojí za to
              říct nahlas, čím to je. Nejdražší položka klasické dodávky bývá rozbor dat: někdo
              musí otevřít tabulku o devadesáti jedna sloupcích a zjistit, co v nich je. Tahle
              práce je pro model levná a rychlá, zatímco pro tým znamená týdny. Druhá věc je, že
              oponentura vlastního návrhu tu nic nestojí. Když se ukáže, že ukazatel je
              postavený špatně, přepíše se, místo aby se obhajoval do konce projektu.
            </p>
            <p className="text-slate-700 mt-4">
              Co to naopak nezlevnilo: rozhodování, co se smí rodičům tvrdit. Právě proto je
              v repozitáři {cislo(DOKUMENTACE.souboru)} dokumentů. Většina z nich neříká, jak
              kód funguje, ale proč se něco počítá tak a ne jinak, a co se zamítlo.
            </p>

            <div className="mt-6 p-5 rounded-lg border-l-4" style={{ backgroundColor: '#f1f7ff', borderColor: '#0074e4' }}>
              <div className="text-sm text-slate-600 mb-1">Odpracovaný čas autora</div>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: '#28313b' }}>
                zhruba {cislo(VLASTNI_CAS_HODIN)} hodin
              </div>
              <div className="text-sm text-slate-700 mt-2">
                Za {mesicu} {tvar(mesicu, 'měsíc', 'měsíce', 'měsíců')}, od{' '}
                {changelog[changelog.length - 1]?.date}. Nikdo si
                hodiny nevykazoval; číslo vychází z časových odstupů mezi {cislo(COMMITU)}{' '}
                commity. <strong>Není to čistý čas nad tímto webem</strong> - v týchž hodinách
                vznikal i jiný projekt.
              </div>
            </div>
            <p className="text-slate-700 mt-4">
              Vedle sebe to tedy stojí takhle: zhruba {cislo(VLASTNI_CAS_HODIN)} hodin proti{' '}
              {cislo(CLOVEKODNU_CELKEM * HODIN_ZA_DEN)} hodinám, které by na týž rozsah potřeboval
              dodavatelský tým. Dělit jedno druhým a vydávat výsledek za míru úspory by ale bylo
              přehnané: obě čísla jsou odhady, ne měření, a každé se může mýlit o desítky procent.
              Řádový rozdíl ta dvojice ukazuje spolehlivě, přesný násobek ne.
            </p>

            {/* ------------------------------------------------------------ */}
            <Nadpis id="provoz" cislo={9}>Co stojí provoz</Nadpis>
            <p className="text-slate-700">
              Provoz je oproti vývoji zanedbatelný, protože web je z velké části hotové soubory.
              Platí se čtyři věci:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-3 font-semibold">Položka</th>
                    <th className="py-2 pr-3 font-semibold">K čemu</th>
                    <th className="py-2 font-semibold text-right whitespace-nowrap">Řádově měsíčně</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Hosting webu', 'Sestavení a rozvoz stránek, měření návštěvnosti', '20 USD'],
                    ['Sklízeč novinek', 'Dvakrát denně obejde feedy škol; běží odděleně od webu', '5 USD'],
                    ['Databáze', 'Odběry e-mailem, novinky škol, účty portálu', '0 až 19 USD'],
                    ['Doména', 'prijimackynaskolu.cz', 'do 30 Kč'],
                  ].map(([polozka, kcemu, cena]) => (
                    <tr key={polozka} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-3 font-medium text-slate-800">{polozka}</td>
                      <td className="py-2 pr-3 text-slate-600 text-xs">{kcemu}</td>
                      <td className="py-2 text-right text-slate-700 whitespace-nowrap">{cena}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              Odhad z veřejných ceníků, ne z faktur; databáze je zatím v bezplatném pásmu.
              Dohromady řádově <strong>600 až 1 100 Kč měsíčně</strong> při kurzu kolem 23 Kč za
              dolar. Odesílání e-mailů se v tomto objemu vejde do bezplatného pásma.
            </p>
            <p className="text-slate-700 mt-4">
              Podstatné je, jak se částka chová při růstu. Předgenerované stránky rostou s
              návštěvností pomalu; kdyby se únorová špička ztrojnásobila, hosting to nepocítí.
              Dražší by bylo spíš rozšíření odběru novinek, kde se platí za odeslané zprávy.
            </p>

            {/* ------------------------------------------------------------ */}
            <div className="mt-14 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Otázky k tomuto shrnutí, k metodice výpočtů nebo k datům:{' '}
                <a href="mailto:eda@prijimackynaskolu.cz" className="underline" style={{ color: '#0074e4' }}>
                  eda@prijimackynaskolu.cz
                </a>. Zdrojový kód a všechny rozbory jsou na{' '}
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
