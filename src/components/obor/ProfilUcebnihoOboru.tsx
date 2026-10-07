import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProfilUcebnihoOboruData, Nastavba } from '@/lib/ucebni-obor-profil-data';
import { BEZ_OBTIZNOSTI, type KategorieBezJpz } from '@/lib/obory-bez-jpz';
import { ZARAZENI_POPISEK, VYSVETLENI_SOUTEZICICH, bezPrijatychJinam, cislo, zOd } from '@/lib/obor-profil';
import { RozpadPrihlasek, SloupceSoutezicich, VysledekUchazecu } from '@/components/obor/grafy';
import { Dukaz, Odpoved, Otazka, Proc, TabulkaOboruNaPrihlasce, Zdroj } from '@/components/obor/ProfilOboru';
import { SoubezneObceObsah } from '@/components/obor/SoubezneObce';
import { OkruhOboruObsah } from '@/components/mesto/OkruhyMesta';
import { VeletrhVMeste } from '@/components/veletrhy/VeletrhVMeste';

/**
 * Stránka učebního oboru a ostatních nabídek bez jednotné zkoušky (issue #244, etapa 3a) v pěti otázkách
 * rodiny: je tam místo, stojí o obor někdo, kam se hlásí ostatní, co přijde potom, jak se tam dostat
 * (docs/navrh-obory-bez-jpz-2027.md, oddíly 10 a 11). Nic tu nestojí na bodech jednotné zkoušky; kde
 * údaj chybí, řekne to věta, nikdy prázdný blok. Pojmy: docs/slovnik-pojmu.md.
 */
interface Props {
  data: ProfilUcebnihoOboruData;
  adresa: string;
  obec: string;
  skolaHref: string;
}

const sklon = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
const mist = (n: number) => `${cislo(n)} ${sklon(n, 'místo', 'místa', 'míst')}`;
const uchazecu = (n: number) => `${cislo(n)} ${sklon(n, 'uchazeč', 'uchazeči', 'uchazečů')}`;
/** Čtvrtý pád: „přijala 1 uchazeče, 3 uchazeče, 9 uchazečů“. */
const uchazeceAk = (n: number) => `${cislo(n)} ${sklon(n, 'uchazeče', 'uchazeče', 'uchazečů')}`;
/** „1 uchazeč se nevešel, 2 uchazeči se nevešli, 5 uchazečů se nevešlo“. */
const neveslo = (n: number) => `${uchazecu(n)} se ${sklon(n, 'nevešel', 'nevešli', 'nevešlo')}`;
/** „přišla 1 přihláška, přišly 2 přihlášky, přišlo 7 přihlášek“. */
const prisloPrihlasek = (n: number) => `${sklon(n, 'přišla', 'přišly', 'přišlo')} ${cislo(n)} ${sklon(n, 'přihláška', 'přihlášky', 'přihlášek')}`;

/** Úvodní věta podle druhu oboru; vysvětlí pojem při prvním výskytu a proč tu nejsou body. */
function uvodOboru(kategorie: KategorieBezJpz): ReactNode {
  switch (kategorie) {
    case 'H':
      return <>Je to <b>učební obor</b>, tedy obor s výučním listem. Body tu nejsou, protože se jednotná přijímací zkouška nekoná; škola přijímá podle vlastních kritérií.</>;
    case 'E':
      return <>Je to <b>učební obor</b>, tedy obor s výučním listem. Body tu nejsou, protože se jednotná přijímací zkouška nekoná; škola přijímá podle vlastních kritérií.</>;
    case 'J':
      return <>Je to <b>obor bez maturity i výučního listu</b>, tedy dvouletý obor zakončený závěrečnou zkouškou a vysvědčením, bez maturity i výučního listu. Jednotná přijímací zkouška se tu nekoná.</>;
    case 'C':
      return <>Je to <b>praktická škola</b>. Jednotná přijímací zkouška se tu nekoná; škola přijímá podle vlastních kritérií.</>;
    case 'P':
      return <>Je to <b>konzervatoř</b>. Přijímá se talentovou zkouškou, která probíhá mimo jednotný harmonogram přijímacího řízení; jednotná přijímací zkouška se tu nekoná.</>;
    default:
      return <>Je to umělecký obor, na který se přijímá <b>talentovou zkouškou</b>. Jednotná přijímací zkouška se tu nekoná.</>;
  }
}

function SeznamNastaveb({ radky }: { radky: Nastavba[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {radky.map(r => (
        <li key={`${r.skola}-${r.obor}-${r.forma}-${r.obec}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
          <span className="min-w-0">
            {r.href
              ? <Link href={r.href} className="font-semibold text-slate-900 hover:text-[#0074e4] hover:underline">{r.obor}</Link>
              : <span className="font-semibold text-slate-900">{r.obor}</span>}
            <span className="block text-[13px] text-slate-600">{[r.skola, r.obec].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="whitespace-nowrap text-[14px] text-slate-700">
            {r.forma} studium{r.kapacita ? ` · ${mist(r.kapacita)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProfilUcebnihoOboru({ data, adresa, obec, skolaHref }: Props) {
  const { rok, predchoziRok, nabidka: n, zarazeni, soutezici, kontext } = data;
  const bezObtiznosti = BEZ_OBTIZNOSTI.has(n.kategorie);
  const maPocty = n.prijati !== null && n.prihlasky !== null;
  const dk = n.kolo_2;
  const minule = n.rok_2025 && n.rok_2025.jistota !== 'low' ? n.rok_2025 : null;
  const kamDal = data.nastavby;
  const otazky = [
    { id: 'misto', nadpis: 'Je tam místo' },
    { id: 'zajem', nadpis: 'Stojí o obor někdo' },
    { id: 'ostatni', nadpis: 'Kam se hlásí ostatní' },
    ...(kamDal ? [{ id: 'potom', nadpis: 'Co přijde potom' }] : []),
    { id: 'cesta', nadpis: 'Jak se tam dostat' },
  ];
  const poradi = (id: string) => otazky.findIndex(o => o.id === id) + 1;

  let hlavni: ReactNode;
  if (n.zbyla_mista !== null && n.kapacita !== null) {
    hlavni = n.zbyla_mista > 0
      ? <>Po 1. kole {rok} {n.zbyla_mista >= 2 && n.zbyla_mista <= 4 ? 'zbyla' : 'zbylo'} {mist(n.zbyla_mista)} {zOd(n.kapacita)} {cislo(n.kapacita)}.</>
      : <>Po 1. kole {rok} se obsadila všechna místa ({cislo(n.kapacita)}).</>;
  } else {
    hlavni = <>Škola nabídla {n.kapacita !== null ? mist(n.kapacita) : 'místa'}; kolik jich po 1. kole zbylo, data CERMATu u této nabídky neuvádějí.</>;
  }

  return (
    <div className="bg-[#f4f7fb]">
      <nav aria-label="Otázky na stránce" className="sticky top-0 z-20 border-b border-slate-200 bg-[#f4f7fb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 text-[15px] font-semibold [scrollbar-width:none]">
          {otazky.map((o, i) => (
            <a key={o.id} href={`#${o.id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-white hover:text-[#16325c]">{i + 1} {o.nadpis}</a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4">
        {/* 1 · Je tam místo */}
        <Otazka id="misto" cislo={poradi('misto')} nadpis="Je tam místo" rok={`1. kolo ${rok}`} uvod={<p className="max-w-3xl text-[16px] leading-relaxed text-slate-700">{uvodOboru(n.kategorie)}</p>}>
          <Odpoved>
            <p className="text-[26px] font-bold leading-tight text-[#16325c]">{hlavni}</p>
            {maPocty && (
              <p className="text-[17px] leading-relaxed text-slate-800">
                {!bezObtiznosti && zarazeni === 'kapacita_nerozhodovala' && <>V 1. kole bylo místo pro všechny, kdo splnili požadavky školy. </>}
                {!bezObtiznosti && zarazeni === 'vetsina_uspela' && soutezici !== null && (
                  <>V 1. kole {rok} se dostala většina soutěžících uchazečů, ale ne všichni: {zOd(soutezici) === 'ze' ? 'ze' : 'z'} <b>{cislo(soutezici)} soutěžících uchazečů</b>, {VYSVETLENI_SOUTEZICICH}, se dostalo {cislo(n.prijati!)}{bezPrijatychJinam(n.nepr_vyssi_priorita)}. </>
                )}
                {!bezObtiznosti && zarazeni && zarazeni !== 'kapacita_nerozhodovala' && zarazeni !== 'vetsina_uspela' && soutezici !== null && (
                  <>V 1. kole bylo {ZARAZENI_POPISEK[zarazeni]} se sem dostat: {zOd(soutezici) === 'ze' ? 'ze' : 'z'} <b>{cislo(soutezici)} soutěžících uchazečů</b>, {VYSVETLENI_SOUTEZICICH}, se dostalo {cislo(n.prijati!)}{bezPrijatychJinam(n.nepr_vyssi_priorita)}. </>
                )}
                {!bezObtiznosti && !zarazeni && <>Soutěžících uchazečů bylo méně než deset, obtížnost přijetí se proto neuvádí. </>}
                Škola přijala {uchazeceAk(n.prijati!)}{n.nepr_kapacita ? <>, {neveslo(n.nepr_kapacita)} kvůli kapacitě</> : null}.
              </p>
            )}
            {!maPocty && <p className="text-[17px] leading-relaxed text-slate-800">Počty přihlášek a přijatých CERMAT u této nabídky neuvádí.</p>}
            <p className="text-[16px] leading-relaxed text-slate-800">
              <b>2. kolo:</b>{' '}
              {dk
                ? <>škola nabídla {dk.kapacita !== null ? mist(dk.kapacita) : 'místa'}{dk.prihlasky !== null && <>, {prisloPrihlasek(dk.prihlasky)}</>}{dk.prijati !== null && <> a přijala {cislo(dk.prijati)}</>}.{dk.zbyla_mista ? <> Po 2. kole {dk.zbyla_mista >= 2 && dk.zbyla_mista <= 4 ? 'zbyla' : 'zbylo'} {mist(dk.zbyla_mista)}.</> : null}</>
                : <>v datech 2. kola obor není; škola ho ve 2. kole nevypsala, nebo ho nejde jednoznačně přiřadit.</>}
            </p>
            <Zdroj>CERMAT, souhrny 1. a 2. kola {rok}. Popisuje, jak dopadli uchazeči v uplynulém ročníku, ne jestli se dostanete vy.</Zdroj>
          </Odpoved>

          <div className="space-y-3">
            {maPocty && (n.nepr_kapacita ?? 0) > 0 && soutezici !== null && (
              <Dukaz nadpis="Kolik soutěžících uchazečů se dostalo" rok={String(rok)}>
                <Proc>Soutěžící uchazeči jsou ti, kdo splnili podmínky přijetí a nebyli přijati jinam podle vyšší priority na přihlášce.</Proc>
                <SloupceSoutezicich radky={[{ rok, prijati: n.prijati!, nevesli: n.nepr_kapacita!, jinam: n.nepr_vyssi_priorita }]} />
              </Dukaz>
            )}
            {maPocty && (
              <Dukaz nadpis="Co se stalo se všemi přihláškami" rok={String(rok)} otevreny>
                <Proc>Všechny přihlášky na obor podle výsledku. Kdo nedosáhl požadavku školy nebo se dostal na obor výš na přihlášce, mezi soutěžící uchazeče nepatří.</Proc>
                <RozpadPrihlasek radky={[{
                  rok, prijati: n.prijati ?? 0, nevesli: n.nepr_kapacita ?? 0, vyse: n.nepr_vyssi_priorita ?? 0,
                  pozadavek: n.nepr_podminky ?? 0, vzdali: n.nepr_vzdal_se ?? 0,
                }]} />
                <Zdroj>CERMAT, souhrny 1. kola {rok}.</Zdroj>
              </Dukaz>
            )}
          </div>
        </Otazka>

        {/* 2 · Stojí o obor někdo */}
        <Otazka id="zajem" cislo={poradi('zajem')} nadpis="Stojí o obor někdo" rok={minule ? `${predchoziRok}–${rok}` : String(rok)}>
          <Odpoved>
            {n.prihlasky !== null && n.kapacita !== null ? (
              <p className="text-[19px] leading-relaxed text-slate-800">
                Na {mist(n.kapacita)} {sklon(n.prihlasky, 'přišla', 'přišly', 'přišlo')} <b className="text-[#16325c]">{cislo(n.prihlasky)} {sklon(n.prihlasky, 'přihláška', 'přihlášky', 'přihlášek')}</b>
                {n.podil_prvnich_voleb !== null && <>; jako 1. volbu ho mělo <b className="text-[#16325c]">{cislo(Math.round(n.podil_prvnich_voleb * 100))} %</b> z nich</>}.
                {n.tlak_prvnich_voleb !== null && <> Na jedno místo připadlo {cislo(n.tlak_prvnich_voleb, 1)} uchazeče s oborem na 1. místě přihlášky.</>}
              </p>
            ) : (
              <p className="text-[17px] text-slate-700">Počty přihlášek CERMAT u této nabídky neuvádí.</p>
            )}
            {minule && minule.prihlasky !== null && (
              <p className="text-[16px] leading-relaxed text-slate-700">
                V roce {predchoziRok}: {cislo(minule.prihlasky)} přihlášek{minule.kapacita !== null && <> na {mist(minule.kapacita)}</>}{minule.prijati !== null && <>, přijatých {cislo(minule.prijati)}</>}.
              </p>
            )}
            <Zdroj>Přihlášky na místo konkurenci nadsazují: jeden uchazeč podává víc přihlášek. Ze dvou ročníků se o trendu nemluví.</Zdroj>
          </Odpoved>
          <div className="space-y-3">
            <Dukaz nadpis="Údaje v číslech" rok={minule ? `${predchoziRok}–${rok}` : String(rok)} otevreny>
              <div className="overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left text-[13px] text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Údaj</th>
                      {minule && <th className="py-2 pl-3 text-right font-semibold">{predchoziRok}</th>}
                      <th className="py-2 pl-3 text-right font-semibold">{rok}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {([
                      ['Místa', minule?.kapacita, n.kapacita],
                      ['Přihlášky', minule?.prihlasky, n.prihlasky],
                      ['Jako 1. volba', minule?.prihlasky_priorita[0], n.prihlasky_priorita[0]],
                      ['Podíl prvních voleb', minule?.podil_prvnich_voleb, n.podil_prvnich_voleb, 'procenta'],
                      ['Přijatí', minule?.prijati, n.prijati],
                    ] as [string, number | null | undefined, number | null, string?][]).map(([popis, driv, ted, druh]) => {
                      const f = (v: number | null | undefined) => v === null || v === undefined ? '—' : druh === 'procenta' ? `${cislo(Math.round(v * 100))} %` : cislo(v);
                      return (
                        <tr key={popis} className="border-t border-slate-100">
                          <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-600">{popis}</th>
                          {minule && <td className="py-2 pl-3 text-right text-slate-900">{f(driv)}</td>}
                          <td className="py-2 pl-3 text-right text-slate-900">{f(ted)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Zdroj>CERMAT, souhrny 1. kola.{minule ? ` Rok ${predchoziRok} jen u nabídky, kterou jde mezi roky přiřadit.` : ''}</Zdroj>
            </Dukaz>
          </div>
        </Otazka>

        {/* 3 · Kam se hlásí ostatní */}
        <Otazka id="ostatni" cislo={poradi('ostatni')} nadpis="Kam se hlásí ostatní" rok={kontext ? `1. kolo ${kontext.rok}` : undefined}>
          <Odpoved>
            {kontext ? (
              <p className="text-[17px] leading-relaxed text-slate-800">
                {zOd(kontext.data.uchazecu) === 'ze' ? 'Ze' : 'Z'} <b>{uchazecu(kontext.data.uchazecu)}</b>, kteří měli obor na přihlášce, se v 1. kole {kontext.rok} dostalo sem {cislo(kontext.data.vysledek_uchazecu.sem)}, na obor výš na přihlášce {cislo(kontext.data.vysledek_uchazecu.vys)}, na obor níž {cislo(kontext.data.vysledek_uchazecu.niz)} a <b>nikam {cislo(kontext.data.vysledek_uchazecu.nikam)}</b>, tedy na žádný obor z přihlášky.
              </p>
            ) : (
              <p className="text-[17px] text-slate-700">Kam se uchazeči tohoto oboru hlásili také, ukazujeme jen u oborů s aspoň deseti uchazeči.</p>
            )}
            <p className="text-[15px] leading-relaxed text-slate-700">
              Pořadí oborů na přihlášce šanci na přijetí <b>nemění</b>, škola řadí jen podle svých kritérií.
              <span className="block text-[14px]"><Link href="/jak-vybrat-skolu#jak-se-rozhoduje" className="font-semibold text-[#0074e4] hover:underline">Jak rozřazení funguje</Link></span>
            </p>
          </Odpoved>
          <div className="space-y-3">
            {kontext && (
              <Dukaz nadpis="Jak dopadli všichni, kdo se sem hlásili" rok={`1. kolo ${kontext.rok}`} otevreny>
                <VysledekUchazecu {...kontext.data.vysledek_uchazecu} />
                <Zdroj>Data o uchazečích 1. kola {kontext.rok}. Neříká, jak dopadnete vy.</Zdroj>
              </Dukaz>
            )}
            {kontext && (kontext.vys.length > 0 || kontext.niz.length > 0) && (
              <Dukaz nadpis="Obory výš a níž na přihlášce" rok={`1. kolo ${kontext.rok}`} otevreny>
                <Proc>Obory, které měli uchazeči na přihlášce před tímto oborem a za ním. Často jde o maturitní obor jako 1. volbu a učební obor jako pojistku.</Proc>
                <TabulkaOboruNaPrihlasce kontext={kontext} />
              </Dukaz>
            )}
            {(data.okruh || data.soubezneObce) && (
              <Dukaz nadpis="Které další obory v okolí uchazeči také volí" rok={`1. kolo ${data.okruh?.rok ?? data.soubezneObce!.rok}`}>
                {data.okruh && (
                  <OkruhOboruObsah okruh={data.okruh.zobrazeni} klic={data.okruh.klic} rokObtiznosti={data.okruh.rokObtiznosti} obec={data.okruh.obec} hrefMesta={data.okruh.hrefMesta} />
                )}
                {data.soubezneObce && (
                  <>
                    {data.okruh && <h3 className="pt-3 text-[16px] font-bold text-[#16325c]">Ve kterých obcích se uchazeči hlásí také</h3>}
                    <SoubezneObceObsah data={data.soubezneObce} />
                  </>
                )}
              </Dukaz>
            )}
          </div>
        </Otazka>

        {/* 4 · Co přijde potom (jen učební obory H a E) */}
        {kamDal && (
          <Otazka id="potom" cislo={poradi('potom')} nadpis="Co přijde potom">
            <Odpoved>
              <p className="text-[17px] leading-relaxed text-slate-800">
                Obor končí <b>výučním listem</b>, tedy dokladem o vyučení v oboru. Kdo chce maturitu, může pokračovat <b>nástavbou</b>, po které se skládá maturita.
              </p>
              {kamDal.skoly.length > 0 && <p className="text-[16px] text-slate-700">Tato škola nástavbu nabízí:</p>}
              {kamDal.skoly.length === 0 && kamDal.kraj.length > 0 && <p className="text-[16px] text-slate-700">Tato škola nástavbu nenabízí. Ve stejném oborovém směru ji v kraji nabízejí:</p>}
              {kamDal.skoly.length === 0 && kamDal.kraj.length === 0 && <p className="text-[16px] text-slate-700">Nástavbu ve stejném oborovém směru jsme v kraji nenašli.</p>}
            </Odpoved>
            <div className="space-y-3">
              {kamDal.skoly.length > 0 && <SeznamNastaveb radky={kamDal.skoly} />}
              {kamDal.skoly.length === 0 && kamDal.kraj.length > 0 && <SeznamNastaveb radky={kamDal.kraj.slice(0, 10)} />}
              {kamDal.skoly.length === 0 && kamDal.kraj.length > 10 && <Zdroj>A dalších {cislo(kamDal.kraj.length - 10)} nabídek v kraji.</Zdroj>}
              {(kamDal.skoly.length > 0 || kamDal.kraj.length > 0) && <Zdroj>Nástavby z 1. kola {rok}: denní i dálkové, kombinované a distanční. Oborový směr podle prvního dvojčíslí kódu oboru.</Zdroj>}
            </div>
          </Otazka>
        )}

        {/* 5 · Jak se tam dostat */}
        <Otazka id="cesta" cislo={poradi('cesta')} nadpis="Jak se tam dostat">
          <Odpoved>
            <p className="text-[17px] leading-relaxed text-slate-800">Škola sídlí na adrese <b>{adresa}</b>.</p>
            <p className="text-[15px] leading-relaxed text-slate-700">
              Jak dlouho se sem jede veřejnou dopravou, si orientačně ověříte v nástroji{' '}
              <Link href="/dostupnost" className="font-semibold text-[#0074e4] hover:underline">Dojezd do škol</Link>.
            </p>
            <p className="text-[15px] leading-relaxed text-slate-700">
              Podmínky přijetí vyhlašuje škola: najdete je na {data.web ? <a href={data.web} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">webu školy</a> : 'webu školy'} a v systému{' '}
              <a href="https://www.dipsy.cz/" rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">DiPSy</a>, přes který se podává přihláška.
            </p>
            {obec && <ul className="text-[15px]"><VeletrhVMeste obec={obec} variant="obor" /></ul>}
            <p className="text-[14px]"><Link href={skolaHref} className="font-semibold text-[#0074e4] hover:underline">Přehled školy: ostatní obory, inspekce, poloha</Link></p>
          </Odpoved>
          <div className="space-y-3">
            {data.domovy.length > 0 ? (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec]">
                <h3 className="mb-2 text-[17px] font-bold text-[#16325c]">Ubytování</h3>
                <ul className="space-y-1.5 text-[15px] text-slate-800">
                  {data.domovy.map(d => (
                    <li key={d.izo}>{d.nazev}{d.obec ? `, ${d.obec}` : ''}{d.kapacita ? ` · ${mist(d.kapacita)}` : ''}</li>
                  ))}
                </ul>
                <Zdroj>Domovy mládeže a internáty, které rejstřík škol MŠMT vede u této školy. Volnou kapacitu rejstřík neuvádí.</Zdroj>
              </div>
            ) : (
              <p className="text-[15px] text-slate-600">Domov mládeže ani internát rejstřík škol u této školy nevede.</p>
            )}
          </div>
        </Otazka>
      </div>
    </div>
  );
}
