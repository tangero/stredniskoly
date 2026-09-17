import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProfilOboruData, PoradiVKraji } from '@/lib/obor-profil-data';
import { vetyDruhehoKola, VYSVETLENI_DRUHEHO_KOLA } from '@/lib/druhe-kolo-vyklad';
import {
  ZARAZENI_POPISEK, cislo, slovniPodil, vKraji, soutezicichUchazecu, textPoradi, vetaPozadavku, zOd, zminitPozadavek,
} from '@/lib/obor-profil';
import {
  MrizkaSoutezicich, PasmaBodu, RozpadPrihlasek, SkupinaVKraji, SloupceSoutezicich, VysledekUchazecu,
} from '@/components/obor/grafy';

/**
 * Stránka oboru ve třech otázkách: jak těžké bude se dostat, co pomůže, jak se tu studuje.
 * Rozvržení a rozhodnutí: docs/vrstvy-stranky-oboru-2027.md; pojmy: docs/slovnik-pojmu.md.
 */
interface ProfilOboruProps {
  data: ProfilOboruData;
  inspekceHref: string | null;
}

const VYSVETLENI_SOUTEZICICH = 'tedy těch, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš';

function Otazka({ id, cislo: poradi, nadpis, rok, children }: { id: string; cislo: number; nadpis: string; rok?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-200 py-10 last:border-b-0">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-[#16325c] md:text-[28px]">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#16325c] text-base text-white">{poradi}</span>
          {nadpis}
        </h2>
        {rok && <span className="rounded-full border border-slate-300 px-3 py-0.5 text-[13px] font-semibold text-slate-500">{rok}</span>}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">{children}</div>
    </section>
  );
}

function Odpoved({ children }: { children: ReactNode }) {
  return <div className="space-y-4 rounded-2xl bg-white p-6 shadow-[0_1px_0_#dbe3ec,0_12px_32px_-24px_rgba(22,50,92,0.35)] ">{children}</div>;
}

function Dukaz({ nadpis, rok, otevreny = false, children }: { nadpis: string; rok: string; otevreny?: boolean; children: ReactNode }) {
  return (
    <details open={otevreny} className="group rounded-2xl bg-white shadow-[0_1px_0_#dbe3ec]">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[17px] font-bold text-[#16325c]">{nadpis}</span>
        <span className="ml-auto whitespace-nowrap text-[13px] text-slate-500">{rok}</span>
        <span aria-hidden="true" className="text-xl leading-none text-[#0074e4] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-3 px-5 pb-5">{children}</div>
    </details>
  );
}

function Proc({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-slate-600">{children}</p>;
}

function Zdroj({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-slate-500">{children}</p>;
}

function VetaPoradi({ p, rok, predchoziRok, podle, skupina, kraj, vysvetleni }: { p: PoradiVKraji; rok: number; predchoziRok: number | null; podle: string; skupina: string; kraj: string; vysvetleni: string }) {
  const drive = p.predchozi && predchoziRok
    ? p.predchozi.od === p.poradi.od && p.predchozi.do === p.poradi.do ? `, v roce ${predchoziRok} také ${textPoradi(p.predchozi)}` : `, v roce ${predchoziRok} ${textPoradi(p.predchozi)} ${zOd(p.predchozi.z)} ${cislo(p.predchozi.z)}`
    : '';
  return (
    <p className="text-[15px] leading-relaxed text-slate-700">
      <b className="text-[#16325c]">{textPoradi(p.poradi)} {zOd(p.poradi.z)} {cislo(p.poradi.z)}</b> {skupina} {vKraji(kraj)} {podle} ({rok}{drive}). {vysvetleni}
    </p>
  );
}

export function ProfilOboru({ data, inspekceHref }: ProfilOboruProps) {
  const { rok, predchoziRok, aktualni: r, predchozi: p, stav, zarazeni, skupinaNazev, krajNazev } = data;
  const soutezici = soutezicichUchazecu(r) ?? 0;
  const soutezicichDriv = p ? soutezicichUchazecu(p) : null;
  const kontext = data.kontext;
  const pasma = data.pasma?.data;
  // CERMAT vydává data o uchazečích nejdřív předběžně, finální revizi až o rok
  // později. Dokud web ukazuje předběžný ročník, musí to být u čísel vidět.
  const verzeUchazecu = data.verzeUchazecu?.startsWith('předběžná') ? ` Údaje jsou z ${data.verzeUchazecu}.` : '';
  const dk = data.druheKolo;
  const dkVety = dk ? vetyDruhehoKola(dk) : null;
  const roky = [p && predchoziRok ? { rok: predchoziRok, r: p } : null, { rok, r }].filter((x): x is { rok: number; r: typeof r } => !!x);
  const rozsahRoku = predchoziRok && p ? `${predchoziRok}–${rok}` : String(rok);

  let hlavni: ReactNode;
  if (stav === 'nevesli_se' && zarazeni && zarazeni !== 'kapacita_nerozhodovala') {
    hlavni = zarazeni === 'vetsina_uspela' ? `V 1. kole ${rok} se dostala většina soutěžících uchazečů, ale ne všichni.` : `V 1. kole ${rok} bylo ${ZARAZENI_POPISEK[zarazeni]} se sem dostat.`;
  } else if (stav === 'nevesli_se') {
    hlavni = `V 1. kole ${rok} se sem někdo kvůli kapacitě nevešel.`;
  } else {
    hlavni = `V 1. kole ${rok} bylo místo pro všechny, kdo splnili požadavky školy.`;
  }

  return (
    <div className="bg-[#f4f7fb]">
      <nav aria-label="Otázky na stránce" className="sticky top-0 z-20 border-b border-slate-200 bg-[#f4f7fb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 text-[15px] font-semibold [scrollbar-width:none]">
          <a href="#prijeti" className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-white hover:text-[#16325c]">1 Jak těžké se dostat</a>
          <a href="#pomoc" className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-white hover:text-[#16325c]">2 Co vám pomůže</a>
          <a href="#studium" className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-white hover:text-[#16325c]">3 Jak se tu studuje</a>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4">
        {/* 1 · Jak těžké bude se dostat */}
        <Otazka id="prijeti" cislo={1} nadpis="Jak těžké je se sem dostat" rok={`1. kolo ${rok}`}>
          <Odpoved>
            <p className="text-[26px] font-bold leading-tight text-[#16325c]">{hlavni}</p>
            {stav === 'nevesli_se' ? (
              <p className="text-[17px] leading-relaxed text-slate-800">
                {zOd(soutezici) === 'ze' ? 'Ze' : 'Z'} <b>{cislo(soutezici)} soutěžících uchazečů</b>, {VYSVETLENI_SOUTEZICICH}, se dostalo {cislo(r.prijati ?? 0)}, což je <b>{slovniPodil(r.prijati ?? 0, soutezici)}</b>.
                {p && predchoziRok && soutezicichDriv ? (
                  (p.capacity_rejected ?? 0) > 0
                    ? <> V roce {predchoziRok}: {slovniPodil(p.prijati ?? 0, soutezicichDriv)}, {cislo(p.prijati ?? 0)} {zOd(soutezicichDriv)} {cislo(soutezicichDriv)}.</>
                    : <> V roce {predchoziRok} kapacita nerozhodovala.</>
                ) : null}
              </p>
            ) : (
              <p className="text-[17px] leading-relaxed text-slate-800">
                Škola přijala {cislo(r.prijati ?? 0)} {(r.prijati ?? 0) >= 1 && (r.prijati ?? 0) <= 4 ? 'uchazeče' : 'uchazečů'} na {cislo(r.kapacita ?? 0)} {r.kapacita === 1 ? 'místo' : (r.kapacita ?? 0) >= 2 && (r.kapacita ?? 0) <= 4 ? 'místa' : 'míst'} a nikoho neodmítla kvůli kapacitě.
                {dk?.zaznam.stav === 'vypsano' && <> Volná místa nabídla ve <b>2. kole</b> ({cislo(dk.zaznam.kapacita)}).</>}
              </p>
            )}
            {stav === 'nevesli_se' && soutezici >= 10 && <MrizkaSoutezicich prijati={r.prijati ?? 0} soutezici={soutezici} />}
            {zminitPozadavek(r) && (
              <p className="text-[15px] leading-relaxed text-slate-700">
                Kromě toho <b>{cislo(r.conditions_not_met ?? 0)} {zOd(r.prihlasky ?? 0)} {cislo(r.prihlasky ?? 0)}</b> uchazečů {vetaPozadavku(kontext?.data.odvozena_hranice)}.
                {kontext?.data.odvozena_hranice && kontext.data.odvozena_hranice.typ !== 'nevysvetleno_vysledkem_jpz' && kontext.rok !== rok && <> (Hranice odvozená z roku {kontext.rok}.)</>}
              </p>
            )}
            {data.poradiZajem && (
              <VetaPoradi p={data.poradiZajem} rok={rok} predchoziRok={predchoziRok} podle="podle zájmu" skupina={skupinaNazev} kraj={krajNazev} vysvetleni="Zájem tu znamená, kolik uchazečů mělo obor jako 1. volbu na jedno místo." />
            )}
            <Zdroj>Popisuje, jak dopadli uchazeči v uplynulých ročnících. Neříká, jestli se dostanete vy; mezi roky se to mění.</Zdroj>
          </Odpoved>

          <div className="space-y-3">
            <Dukaz nadpis="Kolik soutěžících uchazečů se dostalo" rok={rozsahRoku} otevreny={stav === 'nevesli_se'}>
              <Proc>Soutěžící uchazeči jsou ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš.</Proc>
              <SloupceSoutezicich radky={roky.map(x => ({ rok: x.rok, prijati: x.r.prijati ?? 0, nevesli: x.r.capacity_rejected ?? 0 }))} />
              <Zdroj>CERMAT, souhrny 1. kola. Předchozí rok jen u oboru, který jde mezi roky jednoznačně přiřadit.</Zdroj>
            </Dukaz>

            {data.poradiZajem && (
              <Dukaz nadpis="Pořadí v kraji podle zájmu" rok={String(rok)}>
                <Proc>Každá tečka je jeden obor stejného typu a délky {vKraji(krajNazev)}. Poloha je tlak prvních voleb: kolik uchazečů chtělo obor jako 1. volbu na jedno místo. Plná modrá tečka je tento obor, kroužek předchozí rok.</Proc>
                <SkupinaVKraji
                  hodnoty={data.poradiZajem.hodnoty}
                  hodnota={data.poradiZajem.hodnota}
                  predchozi={data.poradiZajem.hodnotaPredchozi}
                  format={v => `${cislo(v, Number.isInteger(v) ? 0 : 1)}×`}
                  osa={(() => { const top = Math.max(2, Math.ceil(Math.max(...data.poradiZajem!.hodnoty) * 1.05)); const krok = top > 6 ? 2 : 1; return Array.from({ length: Math.floor(top / krok) + 1 }, (_, i) => i * krok); })()}
                />
                <Zdroj>{textPoradi(data.poradiZajem.poradi)} {zOd(data.poradiZajem.poradi.z)} {cislo(data.poradiZajem.poradi.z)} podle zájmu. Pořadí neříká, která škola je lepší.</Zdroj>
              </Dukaz>
            )}

            <Dukaz nadpis="Co se stalo se všemi přihláškami" rok={rozsahRoku} otevreny={stav !== 'nevesli_se'}>
              <Proc>Všechny přihlášky na obor podle výsledku. Uchazeči, kteří nedosáhli požadavku školy nebo se dostali na obor výš na přihlášce, mezi soutěžící uchazeče nepatří.</Proc>
              <RozpadPrihlasek radky={roky.map(x => ({ rok: x.rok, prijati: x.r.prijati ?? 0, nevesli: x.r.capacity_rejected ?? 0, vyse: x.r.higher_priority ?? 0, pozadavek: x.r.conditions_not_met ?? 0, vzdali: x.r.withdrawn ?? 0 }))} />
            </Dukaz>

            {stav === 'nevesli_se' && data.pasma && pasma?.pasma && pasma.pasma.length > 0 && (
              <Dukaz nadpis="S kolika body se kdo dostal" rok={`1. kolo ${data.pasma.rok}`}>
                <Proc>
                  Soutěžící uchazeči v roce {data.pasma.rok}, tedy ti, kdo splnili požadavky školy a nedostali se na obor výš na přihlášce, podle bodů (součet češtiny a matematiky, každý test nejvýš 50 bodů).
                  {pasma.prijatych >= 10 && <> Pod <b>{cislo(pasma.min_prijaty)} bodů</b> se nedostal nikdo; stejně nebo méně bodů mělo {Math.round(pasma.min_prijaty_percentil)} ze 100 uchazečů v celé zemi.</>}
                </Proc>
                <PasmaBodu pasma={pasma.pasma} />
                <Zdroj>Data o uchazečích 1. kola {data.pasma.rok}. Není to šance konkrétního uchazeče a platí za obor školy bez zaměření.{verzeUchazecu}</Zdroj>
              </Dukaz>
            )}

            <Dukaz nadpis="Údaje v číslech" rok={rozsahRoku}>
              <div className="overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left text-[13px] text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Údaj</th>
                      {roky.map(x => <th key={x.rok} className="py-2 pl-3 text-right font-semibold">{x.rok}</th>)}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {([
                      ['Místa', (x: typeof r) => cislo(x.kapacita ?? 0)],
                      ['Přihlášky', (x: typeof r) => cislo(x.prihlasky ?? 0)],
                      ['Přihlášky na místo', (x: typeof r) => x.index_poptavky !== undefined ? `${cislo(x.index_poptavky, 1)}×` : '—'],
                      ['Tlak prvních voleb', (x: typeof r) => x.tlak_prvnich_voleb !== undefined ? `${cislo(x.tlak_prvnich_voleb, 1)}×` : '—'],
                      ['Přijatí', (x: typeof r) => cislo(x.prijati ?? 0)],
                      ['Nevešli se kvůli kapacitě', (x: typeof r) => cislo(x.capacity_rejected ?? 0)],
                      ['Nedosáhli požadavku školy', (x: typeof r) => cislo(x.conditions_not_met ?? 0)],
                      ['Přijati na obor výš na přihlášce', (x: typeof r) => cislo(x.higher_priority ?? 0)],
                      ['Průměrné umístění přijatých v celé zemi', (x: typeof r) => x.prumerne_umisteni_prijatych !== undefined ? `${Math.round(x.prumerne_umisteni_prijatych)}. percentil` : '—'],
                    ] as [string, (x: typeof r) => string][]).map(([popis, fn]) => (
                      <tr key={popis} className="border-t border-slate-100">
                        <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-600">{popis}</th>
                        {roky.map(x => <td key={x.rok} className="py-2 pl-3 text-right text-slate-900">{fn(x.r)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Zdroj>Přihlášky na místo konkurenci nadsazují: jeden uchazeč podává přihlášky až na tři obory. Body se mezi roky nesrovnávají, protože se mění obtížnost testu; proto umístění v percentilech.</Zdroj>
            </Dukaz>
          </div>
        </Otazka>

        {/* 2 · Co vám pomůže */}
        <Otazka id="pomoc" cislo={2} nadpis="Co vám pomůže">
          <Odpoved>
            <ul className="space-y-4 text-[16px] leading-relaxed text-slate-800">
              {kontext && (
                <li>
                  Ze <b>{cislo(kontext.data.uchazecu)} uchazečů</b>, kteří měli obor na přihlášce, se v 1. kole {kontext.rok} dostalo sem {cislo(kontext.data.vysledek_uchazecu.sem)}, na obor výš na přihlášce {cislo(kontext.data.vysledek_uchazecu.vys)}, na obor níž {cislo(kontext.data.vysledek_uchazecu.niz)} a <b>nikam {cislo(kontext.data.vysledek_uchazecu.nikam)}</b>, tedy na žádný obor z přihlášky.
                  {kontext.data.vysledek_uchazecu.nikam / kontext.data.uchazecu >= 0.25 && (() => {
                    const tezke = [...kontext.vys, ...kontext.niz].filter(o => o.zarazeni === 'velmi_tezke' || o.zarazeni === 'tezke').length;
                    const vse = [...kontext.vys, ...kontext.niz].filter(o => o.zarazeni).length;
                    return vse > 0 && tezke / vse >= 0.5
                      ? <> Obory, které měli výš i níž, byly většinou také těžké; pomůže mít na přihlášce i obor, kde v 1. kole místo bylo.</>
                      : <> Pomůže mít na přihlášce i obor, kde v 1. kole místo bylo.</>;
                  })()}
                </li>
              )}
              <li>
                Rozhodují <b>kritéria přijetí</b>, která škola vyhlašuje na svém webu.
                {data.web && <span className="block text-[14px]"><a href={data.web} className="font-semibold text-[#0074e4] hover:underline" rel="noopener noreferrer">Web školy</a></span>}
              </li>
              <li>
                Pořadí oborů na přihlášce šanci na přijetí <b>nemění</b>, škola řadí jen podle svých kritérií. Seřaďte obory podle toho, kam chcete chodit.
                <span className="block text-[14px]"><Link href="/jak-funguje-prijimani" className="font-semibold text-[#0074e4] hover:underline">Jak rozřazení funguje</Link></span>
              </li>
              {pasma?.talentova_zkouska && <li>O přijetí rozhoduje i <b>talentová zkouška</b>, o které údaje nemáme.</li>}
              {!pasma?.talentova_zkouska && stav === 'nevesli_se' && pasma?.rozhodl_test !== undefined && pasma.rozhodl_test >= 0.97 && (
                <li>V roce {data.pasma!.rok} o přijetí rozhodoval hlavně <b>výsledek jednotné zkoušky</b>; pořadí podle testu odpovídalo výsledku přijímání.</li>
              )}
              {dk && dkVety && (dk.zaznam.stav !== 'bez_2_kola' || stav === 'nevesli_se') && (
                <li>
                  <b>2. kolo:</b> {dkVety.hlavni}
                  {dk.zaznam.stav === 'vypsano' && dk.zaznam.neveslo_se > 0 ? <> {dkVety.doplnky[0]}</> : null}
                </li>
              )}
            </ul>
          </Odpoved>

          <div className="space-y-3">
            {kontext && (
              <Dukaz nadpis="Jak dopadli všichni, kdo se sem hlásili" rok={`1. kolo ${kontext.rok}`} otevreny>
                <Proc>Všichni uchazeči, kteří měli tento obor na přihlášce, podle toho, kam je v 1. kole {kontext.rok} rozřadili.</Proc>
                <VysledekUchazecu {...kontext.data.vysledek_uchazecu} />
                <Zdroj>Data o uchazečích 1. kola {kontext.rok}, {cislo(kontext.data.uchazecu)} uchazečů. Neříká, jak dopadnete vy; pořadí na přihlášce šanci nemění.{verzeUchazecu}</Zdroj>
              </Dukaz>
            )}
            {kontext && (kontext.vys.length > 0 || kontext.niz.length > 0) && (
              <Dukaz nadpis="Obory výš a níž na přihlášce" rok={`1. kolo ${kontext.rok}`} otevreny>
                <Proc>Obory, které měli uchazeči na přihlášce před tímto oborem a za ním, a jak těžké bylo se na ně dostat. Tento obor v roce {kontext.rok}: {data.zarazeniPredchozi && predchoziRok === kontext.rok ? ZARAZENI_POPISEK[data.zarazeniPredchozi] : zarazeni ? ZARAZENI_POPISEK[zarazeni] : '—'}.</Proc>
                <div className="overflow-x-auto">
                  <table className="w-full text-[15px]">
                    <thead><tr className="text-left text-[13px] text-slate-500"><th className="py-2 pr-3 font-semibold">Obor</th><th className="py-2 px-3 text-right font-semibold">Společných uchazečů</th><th className="py-2 pl-3 font-semibold">Obtížnost přijetí</th></tr></thead>
                    {([['Měli výš na přihlášce', kontext.vys], ['Měli níž na přihlášce', kontext.niz]] as const).map(([nadpis, obory]) => obory.length > 0 && (
                      <tbody key={nadpis}>
                        <tr><th colSpan={3} className="pt-4 pb-1 text-left text-[13px] font-semibold uppercase tracking-wide text-slate-500">{nadpis}</th></tr>
                        {obory.map(o => (
                          <tr key={o.klic} className="border-t border-slate-100 align-top">
                            <td className="py-2 pr-3">
                              {o.href ? <Link href={o.href} className="font-semibold text-slate-900 hover:text-[#0074e4]">{o.skola}</Link> : <span className="font-semibold">{o.skola}</span>}
                              <span className="block text-[13px] text-slate-500">{[o.obec, o.obor, o.delka ? `${o.delka}leté` : ''].filter(Boolean).join(' · ')}</span>
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">{cislo(o.uchazecu)}</td>
                            <td className="py-2 pl-3">
                              <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[13px] font-semibold text-slate-800">{o.zarazeni ? ZARAZENI_POPISEK[o.zarazeni] : 'bez údajů'}</span>
                              {o.soutezici ? <span className="block text-[12px] text-slate-500">{cislo(o.prijati ?? 0)} {zOd(o.soutezici)} {cislo(o.soutezici)}</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
                <Zdroj>Jen obory s aspoň 10 společnými uchazeči. Pořadí na přihlášce říká, kam kdo chtěl víc, ne jak je obor těžký: tatáž škola bývá u různých uchazečů výš i níž.</Zdroj>
              </Dukaz>
            )}
            {dk && (
              <Dukaz nadpis="2. kolo" rok={dk.predchozi ? `${dk.rok - 1}–${dk.rok}` : String(dk.rok)} otevreny={stav !== 'nevesli_se'}>
                <p className="text-[16px] leading-relaxed text-slate-800">{dkVety!.hlavni}</p>
                {dkVety!.doplnky.map(v => <p key={v} className="text-[15px] leading-relaxed text-slate-700">{v}</p>)}
                {dkVety!.predchozi && <p className="text-[15px] text-slate-700">{dkVety!.predchozi}</p>}
                <Zdroj>{VYSVETLENI_DRUHEHO_KOLA} CERMAT, výsledky 2. kola {dk.rok}.</Zdroj>
              </Dukaz>
            )}
          </div>
        </Otazka>

        {/* 3 · Jak se tu studuje */}
        <Otazka id="studium" cislo={3} nadpis="Jak se tu studuje" rok={data.inspekce ? `${rok} a inspekce ${data.inspekce.datum.slice(0, 4)}` : String(rok)}>
          <Odpoved>
            {r.prumerne_umisteni_prijatych !== undefined ? (
              <p className="text-[19px] leading-relaxed text-slate-800">
                Přijatí v roce {rok} měli v jednotné zkoušce průměrné umístění kolem <b className="text-[#16325c]">{Math.round(r.prumerne_umisteni_prijatych)}. percentilu</b> celé země; percentil říká, kolik ze 100 uchazečů v celé zemi mělo stejný nebo horší výsledek.
                {r.cj_prijati !== undefined && r.ma_prijati !== undefined && <> V bodech: čeština průměrně {cislo(r.cj_prijati, 1)} a matematika {cislo(r.ma_prijati, 1)} z 50.</>}
                {pasma?.median_prijatych !== undefined && <> Polovina přijatých měla dohromady <b className="text-[#16325c]">{cislo(pasma.median_prijatych, 1)} bodů</b> nebo míň.</>}
                {r.prumerne_umisteni_uchazecu !== undefined && (
                  <> Všichni, kdo se sem hlásili a zkoušku konali, měli průměrné umístění {Math.round(r.prumerne_umisteni_uchazecu)}. percentilu
                    {r.prumerne_umisteni_uchazecu < r.prumerne_umisteni_prijatych - 2
                      ? <>, takže obor si z uchazečů vybíral ty s lepším výsledkem.</>
                      : <>, tedy podobné jako přijatí.</>}
                  </>
                )}
              </p>
            ) : (
              <p className="text-[17px] text-slate-700">Výsledky přijatých v jednotné zkoušce pro tento obor nemáme.</p>
            )}
            {data.poradiVysledky && (
              <VetaPoradi p={data.poradiVysledky} rok={rok} predchoziRok={predchoziRok} podle="podle výsledků přijatých" skupina={skupinaNazev} kraj={krajNazev} vysvetleni="Pořadí neříká, která škola je lepší." />
            )}
            {data.jazyky && data.jazyky.length > 0 && (
              <p className="text-[15px] text-slate-700">Vyučované jazyky podle profilu v InspIS: {data.jazyky.join(', ')}.</p>
            )}
            <Zdroj>Popisuje, s jakými výsledky sem přicházejí spolužáci, ne náročnost studia ani kvalitu výuky. Inspekce a podpora žáků platí pro celou školu.{pasma?.median_prijatych !== undefined && ` Průměr je z dat CERMATu za tuto nabídku, prostřední hodnota z dat o uchazečích za celý obor školy bez zaměření (1. kolo ${data.pasma?.rok}); u šikmého rozdělení leží pod průměrem.${verzeUchazecu}`}</Zdroj>
          </Odpoved>

          <div className="space-y-3">
            {data.poradiVysledky && (
              <Dukaz nadpis="Pořadí v kraji podle výsledků přijatých" rok={String(rok)} otevreny>
                <Proc>Každá tečka je jeden obor stejného typu a délky {vKraji(krajNazev)}: průměrné umístění přijatých v celé zemi, v percentilech. Plná modrá tečka je tento obor, kroužek předchozí rok.</Proc>
                <SkupinaVKraji hodnoty={data.poradiVysledky.hodnoty} hodnota={data.poradiVysledky.hodnota} predchozi={data.poradiVysledky.hodnotaPredchozi} format={v => `${cislo(v)}. percentil`} formatOsy={v => cislo(v)} osa={[0, 25, 50, 75, 100]} />
                <Zdroj>{textPoradi(data.poradiVysledky.poradi)} {zOd(data.poradiVysledky.poradi.z)} {cislo(data.poradiVysledky.poradi.z)} podle výsledků přijatých. Pořadí neříká, která škola je lepší.</Zdroj>
              </Dukaz>
            )}
          </div>
            {data.inspekce && (
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
                {([['Co inspekce chválí', data.inspekce.silne], ['Na co si dát pozor', data.inspekce.rizika], ['Podpora žáků', data.inspekce.podpora], ['Na co se zeptat na dni otevřených dveří', data.inspekce.otazky]] as const)
                  .filter(([, polozky]) => polozky.length > 0)
                  .map(([nadpis, polozky]) => (
                    <div key={nadpis} className="rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec]">
                      <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">{nadpis}</h3>
                      <ul className="list-disc space-y-1.5 pl-4 text-[14px] leading-relaxed text-slate-700">
                        {polozky.map(x => <li key={x}>{x}</li>)}
                      </ul>
                    </div>
                  ))}
                {inspekceHref && (
                  <p className="text-[14px] sm:col-span-2 lg:col-span-4">
                    <Link href={inspekceHref} className="font-semibold text-[#0074e4] hover:underline">Celé shrnutí inspekce a odkaz na zprávu ČŠI</Link>
                    <span className="text-slate-500"> · shrnutí vytvořené automaticky ze zprávy z {data.inspekce.datum.split('-').reverse().map(Number).join('. ')}</span>
                  </p>
                )}
              </div>
            )}
        </Otazka>
      </div>
    </div>
  );
}
