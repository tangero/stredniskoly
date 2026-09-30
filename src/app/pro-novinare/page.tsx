import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  ADRESAR,
  cislo,
  datumSlovy,
  nactiSouhrn,
  nastaveni,
  procenta,
  velikost,
  type Balicek,
} from '@/lib/pro-novinare';

// Sekce pro novináře (docs/navrh-pro-novinare-2027.md). Čísla bere ze
// souhrnu, který vzniká s balíčky (scripts/build-pro-novinare.py); texty
// používají pojmy ze slovníku pojmů a u každého čísla rok a množinu.

export const metadata: Metadata = {
  title: 'Pro novináře: data o přijímačkách na střední školy ke stažení',
  description:
    'Balíčky dat o přijímacím řízení na střední školy: veletrhy škol, konzervatoře, výsledky 1. a 2. kola, kam se uchazeči dostali a kritéria přijetí. CSV a Excel s popisem dat.',
  alternates: { canonical: '/pro-novinare' },
  openGraph: {
    title: 'Data o přijímačkách pro novináře',
    description: 'Tabulky ke stažení s popisem, odkud čísla jsou a co neříkají.',
  },
};

const POPIS_BALICKU: Record<string, string> = {
  veletrhy: 'Pro články o sezóně veletrhů v kraji: kde a kdy se koná, kdo akci pořádá.',
  konzervatore: 'Pro články o přihláškách, které se podávají už v listopadu.',
  obory: 'Pro srovnání škol a oborů v kraji: zájem, přijatí, body přijatých, 2. kolo.',
  uchazeci: 'Pro články o tom, kolik dětí se v 1. a 2. kole nedostalo nikam, po krajích, a kolik míst zbylo.',
  druhe_kolo: 'Pro články o 2. kole: kde byla místa a kde se nevešli ani ve 2. kole.',
  kriteria: 'Pro články o tom, co vedle jednotné zkoušky rozhoduje. Jmenovitě jen s ověřením u školy.',
};

function Odkaz({ soubor, children }: { soubor: string; children: React.ReactNode }) {
  return (
    <a href={`${ADRESAR}/${soubor}`} download className="underline underline-offset-2" style={{ color: '#0074e4' }}>
      {children}
    </a>
  );
}

function KartaBalicku({ b }: { b: Balicek }) {
  const xlsx = b.soubory.find((f) => f.format === 'xlsx');
  const csv = b.soubory.filter((f) => f.format === 'csv');
  return (
    <li className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-lg">{b.nazev}</h3>
      <p className="text-sm text-slate-600 mt-1">{POPIS_BALICKU[b.klic]}</p>
      <p className="text-sm text-slate-700 mt-2">{b.popis}</p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {xlsx && (
          <a
            href={`${ADRESAR}/${xlsx.soubor}`}
            download
            className="rounded-lg bg-blue-700 text-white px-4 py-2 font-semibold hover:bg-blue-800 no-underline"
          >
            Excel ({velikost(xlsx.soubor)})
          </a>
        )}
        {csv.map((f) => (
          <span key={f.soubor} className="self-center">
            <Odkaz soubor={f.soubor}>CSV: {f.list}</Odkaz>{' '}
            <span className="text-slate-500">({cislo(f.radku ?? 0)} řádků)</span>
          </span>
        ))}
      </div>
    </li>
  );
}

export default function ProNovinarePage() {
  const s = nactiSouhrn();
  const { veletrhy, konzervatore, uchazeci, druhe_kolo: k2, kriteria } = s.cisla;
  const r = s.obdobi;
  const d9 = uchazeci.rocniky['9'];
  const k2u = uchazeci.kolo2;
  const k9 = k2u.rocniky['9'];
  const v9 = k2u.volno_9;
  const kraje9 = Object.entries(uchazeci.kraje_9).sort((a, b) => b[1].nikam / b[1].uchazecu - a[1].nikam / a[1].uchazecu);
  const kraje2 = Object.entries(k2.kraje_jpz).sort((a, b) => b[1].mist - a[1].mist);
  const kd = konzervatore.kolo1_denni;

  return (
    <>
      <Header />
      <main className="bg-slate-50 text-slate-800">
        <section className="bg-slate-900 text-white px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <p className="text-blue-300 text-sm font-semibold mb-3">PRO NOVINÁŘE</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-5">Data o přijímačkách ke stažení</h1>
            <p className="text-slate-200 text-lg max-w-2xl">
              Balíčky dat, tedy tabulky ke stažení s popisem, odkud čísla jsou a co neříkají. Veletrhy škol,
              konzervatoře, výsledky 1. a 2. kola přijímacího řízení a kritéria přijetí.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 items-center">
              <a
                href={`${ADRESAR}/${s.zip}`}
                download
                className="rounded-lg bg-white text-slate-900 px-5 py-3 font-semibold hover:bg-slate-100 no-underline"
              >
                Stáhnout vše (ZIP, {velikost(s.zip)})
              </a>
              <a href="#citace" className="border border-slate-500 rounded-lg px-4 py-3 hover:bg-slate-800">
                Jak nás citovat
              </a>
            </div>
            <p className="text-sm text-slate-300 mt-6">Balíčky připraveny {datumSlovy(s.vytvoreno)}</p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-12">
          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="ted">
            <h2 id="ted" className="text-2xl font-bold mb-4">Co se děje teď</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold">Sezóna veletrhů středních škol</h3>
                <p className="text-sm mt-2">
                  Veletrh středních škol je akce, kde se na jednom místě představí školy z kraje najednou. Víme o{' '}
                  <strong>{cislo(veletrhy.akci_potvrzenych)} akcích s potvrzeným termínem</strong> v{' '}
                  {veletrhy.kraju} krajích, nejvíc v říjnu ({cislo(veletrhy.mesicu[`${Number(r.veletrhy) - 1}-10`])})
                  a listopadu ({cislo(veletrhy.mesicu[`${Number(r.veletrhy) - 1}-11`])}). Dalších{' '}
                  {cislo(veletrhy.akci_cekajicich)} akcí čeká na potvrzení termínu u pořadatele.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Přehled není úplný: obsahuje akce, o kterých víme. Kdo na akci vystavuje, neuvádí žádný zdroj.{' '}
                  <Link href="/veletrhy" style={{ color: '#0074e4' }}>
                    Živý přehled po krajích
                  </Link>
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold">Konzervatoře: přihlášky do 30. listopadu</h3>
                <p className="text-sm mt-2">
                  Konzervatoře mají samostatný podzimní termín: kritéria zveřejní {konzervatore.terminy['kon-kriteria']},
                  přihlášky se podávají {konzervatore.terminy['kon-prihlasky']}. Ostatní střední školy včetně
                  talentových oborů přijímají přihlášky až v únoru.
                </p>
                <p className="text-sm mt-2">
                  Konzervatoří je {konzervatore.skol}. V 1. kole {konzervatore.kolo1_rok} (denní studium) nabídly{' '}
                  {cislo(kd.mist)} míst, přišlo na ně {cislo(kd.prihlasek)} přihlášek a přijato bylo {cislo(kd.prijatych)}{' '}
                  uchazečů. U {cislo(kd.nedosahlo)} přihlášek uchazeč nedosáhl požadavku školy, typicky neprošel talentovou
                  zkouškou. Jeden uchazeč podává víc přihlášek, proto se přihlášky a přijatí nedají dát do poměru jako lidé.
                </p>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="uchazeci">
            <h2 id="uchazeci" className="text-2xl font-bold mb-2">
              Kolik uchazečů se v 1. a 2. kole {r.uchazeci} nedostalo nikam
            </h2>
            <p className="text-slate-700">
              Počítáme uchazeče, které v daném kole nepřijal žádný obor z přihlášky. Každý uchazeč se počítá jednou, se všemi
              svými přihláškami včetně učebních oborů. Nepočítají se ti, kdo se hlásili jen na dálkové nebo zkrácené studium
              či na nástavbu, protože to nejsou žáci základní školy. <strong>Ročníky se nesčítají:</strong> kdo se nedostal na víceleté
              gymnázium, pokračuje na základní škole.
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full bg-white border border-slate-200 rounded-xl text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="p-3">Hlásí se z</th>
                    <th className="p-3 text-right">Uchazečů 1. kola</th>
                    <th className="p-3 text-right">Nepřijati v 1. kole</th>
                    <th className="p-3 text-right">Uchazečů 2. kola*</th>
                    <th className="p-3 text-right">Přijati ve 2. kole</th>
                    <th className="p-3 text-right">Nepřijati ani ve 2. kole</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['9. třídy', '9'],
                      ['5. třídy (osmiletá gymnázia)', '5'],
                      ['7. třídy (šestiletá gymnázia)', '7'],
                    ] as const
                  ).map(([popis, roc]) => {
                    const p1 = uchazeci.rocniky[roc];
                    const p2 = k2u.rocniky[roc];
                    return (
                      <tr key={roc} className="border-t border-slate-200">
                        <td className="p-3">{popis}</td>
                        <td className="p-3 text-right">{cislo(p1.uchazecu)}</td>
                        <td className="p-3 text-right">
                          {cislo(p1.nikam)} ({procenta(p1.nikam, p1.uchazecu)})
                        </td>
                        <td className="p-3 text-right">{cislo(p2.uchazecu)}</td>
                        <td className="p-3 text-right">{cislo(p2.prijati)}</td>
                        <td className="p-3 text-right font-semibold">{cislo(p2.neprijati)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              * Uchazečů 2. kola: kdo podal přihlášku do 2. kola. Hlásit se mohou děti, kterým nevyšlo 1. kolo, ale také ti,
              kdo v 1. kole přihlášku nepodali nebo se přijetí vzdali. Soubory 1. a 2. kola nemají společný identifikátor
              uchazeče, proto konkrétní dítě z 1. kola ve 2. kole nedohledáme a porovnávat jde jen počty. Deváťáků s výsledkem
              jednotné zkoušky, kterou šlo psát jen v 1. kole, zůstalo po 1. kole bez místa {cislo(d9.nikam_s_jpz)} a ve 2. kole
              jich bylo {cislo(k9.s_vysledkem_jpz)}. Kolik z nich jsou tytéž děti, z dat určit nejde.
            </p>

            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-lg">
                {cislo(k9.neprijati)} deváťáků bez místa ani po 2. kole: co o nich víme
              </h3>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-700">
                <li>
                  <strong>{cislo(k9.jen_ucebni)}</strong> z nich se ve 2. kole hlásilo jen na obory bez maturity, například učební
                  obory s výučním listem; {cislo(k9.jen_maturitni)} jen na maturitní obory a {cislo(k9.ucebni_i_maturitni)} na oboje.
                </li>
                <li>
                  <strong>{cislo(k9.jen_pozadavek)}</strong> všude nedosáhlo požadavku školy, například minima bodů,{' '}
                  {cislo(k9.jen_kapacita)} se všude nevešlo kvůli kapacitě a u {cislo(k9.obe)} se stalo obojí.
                </li>
                <li>
                  <strong>{cislo(k9.bez_vysledku_jpz)}</strong> nemá výsledek jednotné přijímací zkoušky, tedy ji v 1. kole nepsali
                  nebo se na ni nepřihlásili. <strong>{cislo(k9.jedna_prihlaska)}</strong> podalo do 2. kola jedinou přihlášku.
                </li>
                <li>
                  Volná místa existovala: po 2. kole zůstalo na oborech pro deváťáky{' '}
                  <strong>{cislo(v9['s maturitou']?.volnych_mist)} volných míst na maturitních oborech</strong> a{' '}
                  <strong>{cislo(v9['bez maturity']?.volnych_mist)} na oborech bez maturity</strong>, počítáno jen u oborů, které
                  2. kolo vypsaly. Nemusela ale být tam, kde je děti potřebovaly: v jiném kraji, jiném oboru nebo s požadavky,
                  které nesplnily.
                </li>
              </ul>
              <p className="text-sm text-slate-700 mt-3">
                <strong>Co nevíme:</strong> kam tyto děti nakonec nastoupily. Po 2. kole mohou školy vypisovat další kola na
                volná místa, o nich ale CERMAT data nezveřejňuje. Kolik dětí zůstalo po přijímacím řízení bez střední školy, proto
                ze zveřejněných dat zjistit nelze.
              </p>
            </div>

            <details className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
              <summary className="cursor-pointer font-semibold">Deváťáci bez místa podle krajů</summary>
              <p className="text-sm text-slate-600 mt-2">
                Kraj je kraj školy, kterou měl uchazeč na přihlášce jako první; bydliště uchazeče zdroj neuvádí.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-3">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="py-1.5 font-normal">Kraj</th>
                      <th className="py-1.5 font-normal text-right">Nepřijati v 1. kole</th>
                      <th className="py-1.5 font-normal text-right">Nepřijati ani ve 2. kole</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kraje9.map(([kraj, c]) => {
                      const c2 = k2u.kraje_9[kraj];
                      return (
                        <tr key={kraj} className="border-t border-slate-100">
                          <td className="py-1.5">{kraj}</td>
                          <td className="py-1.5 text-right">
                            {cislo(c.nikam)} z {cislo(c.uchazecu)} ({procenta(c.nikam, c.uchazecu)})
                          </td>
                          <td className="py-1.5 text-right">
                            {c2 ? `${cislo(c2.neprijati)} z ${cislo(c2.uchazecu)} (${procenta(c2.neprijati, c2.uchazecu)})` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="text-xs text-slate-500 mt-3">
              Zdroj: CERMAT, data uchazečů 1. a 2. kola {r.uchazeci}, předběžné verze: platné přihlášky k 13. květnu (1. kolo)
              a 23. červnu {r.uchazeci} (2. kolo). Přijetí zahrnuje i ty, kdo se ho později vzdali. Volná místa: kapacita 2. kola
              minus přijatí, bez nástaveb.
            </p>
          </section>

          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="druhe-kolo">
            <h2 id="druhe-kolo" className="text-2xl font-bold mb-2">Druhé kolo {r.kolo2}: místa byla, ale ne všude</h2>
            <p className="text-slate-700">
              Když se obor v 1. kole nenaplní, škola může vypsat 2. kolo. V roce {r.kolo2} vypsaly školy u oborů s jednotnou
              přijímací zkouškou <strong>{cislo(k2.jpz.mist)} míst</strong> v {cislo(k2.jpz.nabidek)} nabídkách a přijaly{' '}
              {cislo(k2.jpz.prijatych)} uchazečů: obsazeno bylo {procenta(k2.jpz.prijatych, k2.jpz.mist)} míst. Přesto se
              u {cislo(k2.jpz.s_nevesli)} nabídek někdo nevešel kvůli kapacitě, dohromady {cislo(k2.jpz.neveslo)} přihlášek.
              Obory bez jednotné zkoušky, například učební obory s výučním listem, nabídly dalších {cislo(k2.bez_jpz.mist)} míst.
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full bg-white border border-slate-200 rounded-xl text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="p-3">Kraj (obory s jednotnou zkouškou)</th>
                    <th className="p-3 text-right">Místa</th>
                    <th className="p-3 text-right hidden sm:table-cell">Přihlášky*</th>
                    <th className="p-3 text-right">Přijatí</th>
                    <th className="p-3 text-right">Obsazeno</th>
                    <th className="p-3 text-right">Nevešli se**</th>
                  </tr>
                </thead>
                <tbody>
                  {kraje2.map(([kraj, c]) => (
                    <tr key={kraj} className="border-t border-slate-200">
                      <td className="p-3">{kraj}</td>
                      <td className="p-3 text-right">{cislo(c.mist)}</td>
                      <td className="p-3 text-right hidden sm:table-cell">{cislo(c.prihlasek)}</td>
                      <td className="p-3 text-right">{cislo(c.prijatych)}</td>
                      <td className="p-3 text-right">{procenta(c.prijatych, c.mist)}</td>
                      <td className="p-3 text-right">{cislo(c.neveslo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              * Přihlášky: jeden uchazeč podává víc přihlášek, proto počet přihlášek není počet uchazečů a přijatí vydělení
              přihláškami nejsou podíl úspěšných uchazečů. Kolik uchazečů se do 2. kola hlásilo, tato data neříkají.
            </p>
            <p className="text-sm text-slate-600 mt-1">
              ** Nevešli se: přihlášky uchazečů, kteří splnili požadavky školy, ale na místo se nedostali, protože jiní měli
              lepší výsledek.
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Vypsané 2. kolo neznamená, že ho škola vypíše znovu: obory, které se v 1. kole nenaplnily, ho v roce{' '}
              {r.kolo2} vypsaly jen asi v polovině případů.
            </p>
            <p className="text-xs text-slate-500 mt-2">Zdroj: CERMAT, agregovaná data škol a oborů, 2. kolo {r.kolo2}; denní nezkrácené studium.</p>
          </section>

          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="kriteria">
            <h2 id="kriteria" className="text-2xl font-bold mb-2">Co vedle jednotné zkoušky rozhodovalo v roce {r.kriteria}</h2>
            <p className="text-slate-700">
              Podle přepisu kritérií přijetí {r.kriteria}, tedy pravidel, podle kterých školy v roce {r.kriteria} řadily
              uchazeče, bodovala jen jednotná přijímací zkouška u{' '}
              <strong>{cislo(kriteria.jen_jpz)} z {cislo(kriteria.nabidek)} nabídek</strong> ({procenta(kriteria.jen_jpz, kriteria.nabidek)}).
              Ostatní přidávaly extra body, tedy body za něco jiného než jednotnou přijímací zkoušku:
            </p>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(s.skupiny_kriterii).map(([klic, nazev]) => (
                <li key={klic} className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex justify-between gap-3">
                  <span>{nazev}</span>
                  <span className="font-semibold whitespace-nowrap">{cislo(kriteria[klic])}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-600 mt-3">
              Přepis vznikl strojově z PDF kritérií, která školy vložily do DiPSy, a není ověřený: kontrola vzorku našla
              podstatnou chybu zhruba u každého desátého. Skupiny přiřazujeme podle názvu složky, jedna nabídka může mít víc
              skupin. Pro nové přijímací řízení platí nová kritéria, školy je zveřejní 15.–31. ledna. Údaj o konkrétní škole
              proto před zveřejněním ověřte v jejích kritériích.
            </p>
          </section>

          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="balicky">
            <h2 id="balicky" className="text-2xl font-bold mb-2">Balíčky ke stažení</h2>
            <p className="text-slate-700">
              Každý balíček je sešit Excelu s listem „O datech“ (zdroj, platnost, co čísla neříkají) a tytéž tabulky jako
              CSV pro strojové zpracování (UTF-8, čárka, desetinná tečka). Prázdná buňka znamená, že údaj zdroj nenese, ne nulu.
            </p>
            <ul className="mt-4 space-y-4">
              {s.balicky.map((b) => (
                <KartaBalicku key={b.klic} b={b} />
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------------ */}
          <section aria-labelledby="jak-cist">
            <h2 id="jak-cist" className="text-2xl font-bold mb-3">Jak čísla nepoplést</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>
                <strong>Přihlášky nejsou uchazeči.</strong> Jeden uchazeč si podává přihlášky až na tři obory, proto se přihlášky
                za různé obory nesčítají a počet přihlášek na místo konkurenci nadsazuje.
              </li>
              <li>
                <strong>Průměr bodů přijatých neříká, s kolika body se dalo dostat.</strong> Ani nejnižší výsledek přijatých to
                neříká přesně: škola mohla vážit i jiná kritéria než test a bodovou hranici, pod kterou by nikoho nepřijala,
                nikdo nezveřejňuje.
              </li>
              <li>
                <strong>Uveďte rok a kolo.</strong> Čísla popisují minulý přijímací ročník; nabídku oborů pro nové řízení zveřejní
                školy spolu s kritérii přijetí v lednu.
              </li>
              <li>
                <strong>Není to šance konkrétního uchazeče.</strong> Podíl přijatých ze soutěžících uchazečů, tedy těch, kdo splnili
                požadavky školy a nedostali se na obor, který měli na přihlášce výš, popisuje minulý ročník.
              </li>
              <li>
                <strong>Rozsah:</strong> výsledky po oborech pokrývají denní nezkrácené studium s jednotnou zkouškou. Učební obory
                bez jednotné zkoušky jsou v balíčku uchazečů a 2. kola, konzervatoře ve vlastním balíčku.
              </li>
            </ul>
          </section>

          {/* ------------------------------------------------------------ */}
          <section id="citace" aria-labelledby="citace-nadpis" className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 id="citace-nadpis" className="text-2xl font-bold mb-3">Jak nás citovat</h2>
            <p className="text-slate-700">Data smíte převzít do článku, grafu i vlastních tabulek. Uveďte prosím zdroj, například:</p>
            <blockquote className="mt-3 border-l-4 border-blue-600 bg-slate-50 px-4 py-3 font-medium">{nastaveni.citace_kratka}</blockquote>
            <p className="text-sm text-slate-600 mt-3">
              Plná citace: {nastaveni.citace_plna}. Na webu prosím s odkazem na{' '}
              <a href={nastaveni.web} style={{ color: '#0074e4' }}>
                prijimackynaskolu.cz
              </a>{' '}
              nebo na konkrétní stránku školy či oboru.
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Licence:{' '}
              <a href={nastaveni.licence.url} style={{ color: '#0074e4' }}>
                {nastaveni.licence.nazev}
              </a>
              . {nastaveni.licence.veta}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Dotazy k datům, jiné řezy a rozhovory:{' '}
              <a href={`mailto:${nastaveni.kontakt.email}`} style={{ color: '#0074e4' }}>
                {nastaveni.kontakt.email}
              </a>
              . Metodika a zdrojový kód jsou na stránce{' '}
              <Link href="/o-projektu" style={{ color: '#0074e4' }}>
                O projektu
              </Link>
              .
            </p>
          </section>

          <section className="text-sm text-slate-600">
            <h2 className="font-semibold text-slate-800 mb-2">Zdroje</h2>
            <p>
              CERMAT: agregovaná data škol a oborů 1. a 2. kola {r.vysledky} (výsledky 1. kola platné k{' '}
              {datumSlovy(s.zdroje.platnost_vysledku)}), data uchazečů 1. kola {r.uchazeci}. MŠMT: rejstřík škol
              ({datumSlovy(konzervatore.rejstrik_k)}) a harmonogram přijímacího řízení. DiPSy: PDF kritérií přijetí{' '}
              {r.kriteria}. Veletrhy: vlastní rešerše, termíny ověřené na stránkách pořadatelů. Podrobný popis ke každému
              balíčku je v jeho listu „O datech“. Termíny přijímaček najdete v{' '}
              <Link href="/prijimacky-2027" style={{ color: '#0074e4' }}>
                kalendáři přijímaček
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
