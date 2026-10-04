import Link from 'next/link';
import { OdznakObtiznosti } from '@/components/nabidka/Odznaky';
import { cislo } from '@/lib/obor-profil';
import type { OkruhMestaKZobrazeni, RadekOkruhuMesta } from '@/lib/mesto-karty';

/**
 * Oddíl „Které další obory v okolí uchazeči také volí“ na stránce města (issue #277).
 * Okruh = obory, které měli titíž uchazeči často zároveň na přihlášce (*Okruh oborů*, slovník
 * ukazatelů); „v okolí“ je podle přihlášek, ne podle vzdálenosti (slovník pojmů). Řadí se podle
 * počtu uchazečů, nikdy podle obtížnosti. Vzhled drží tabulku hlavního přehledu školy po oborech.
 */
const pocetOboru = (n: number) => `${cislo(n)} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;

function Sipka() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="mt-1.5 shrink-0 text-slate-500 transition-transform duration-150 group-open:rotate-90">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** `kompaktni`: řádek na dva řádky i na počítači, pro úzký sloupec stránky oboru. */
function Radek({ r, tento = false, kompaktni = false }: { r: RadekOkruhuMesta; tento?: boolean; kompaktni?: boolean }) {
  const druhy = [r.obor, r.doplnek, r.obec].filter(Boolean).join(' · ');
  const md = (t: string) => (kompaktni ? '' : t);
  return (
    <tr
      aria-current={tento ? 'true' : undefined}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[#eef2f6] px-4 py-3 first:border-t-0 ${md('md:table-row md:px-0 md:py-0')} ${tento ? 'bg-[#eef5fd]' : md('md:hover:bg-[#f5f8fc]')}`}
    >
      <td className={`col-span-2 ${md('md:px-5 md:py-3 md:align-top')}`}>
        {r.href ? (
          <Link href={r.href} className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-[#0062c4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]">
            {r.skola}
          </Link>
        ) : (
          <span className="text-[15px] font-semibold leading-snug text-slate-800">{r.skola}</span>
        )}
        {tento && <span className="ml-2 rounded-full bg-[#0074e4] px-2 py-0.5 align-middle text-[12px] font-semibold text-white">tento obor</span>}
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{druhy}</span>
      </td>
      <td className={`mt-1.5 ${md('md:mt-0 md:px-3 md:py-3 md:align-top')}`}>
        {r.zarazeni ? <OdznakObtiznosti zarazeni={r.zarazeni} /> : (
          <span className="text-[13px] text-slate-600">
            {r.bezJednotneZkousky ? 'bez jednotné zkoušky' : r.lisiSe ? 'liší se podle zaměření' : 'bez údaje'}
          </span>
        )}
      </td>
      <td className={`mt-1.5 text-right text-[14px] tabular-nums text-slate-700 ${md('md:mt-0 md:px-5 md:py-3 md:align-top')}`}>
        {cislo(r.uchazecu)}<span className={md('md:hidden')}> uchazečů</span>
      </td>
    </tr>
  );
}

function Okruh({ o, rokObtiznosti }: { o: OkruhMestaKZobrazeni; rokObtiznosti: number | null }) {
  const rokText = rokObtiznosti ? ` ${rokObtiznosti}` : '';
  return (
    <details id={`okruh-${o.id}`} className="group scroll-mt-24 border-t border-[#dde4ee] first:border-t-0">
      <summary className="flex min-h-[56px] cursor-pointer list-none gap-3 px-4 py-3.5 hover:bg-[#f5f8fc] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0074e4] md:px-5">
        <Sipka />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <span className="text-[17px] font-bold leading-snug text-[#16325c]">{o.nazev}</span>
            <span className="text-[14px] tabular-nums text-slate-600">
              {pocetOboru(o.radky.length)}, zhruba {cislo(o.uchazecu)} uchazečů
            </span>
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{o.skoly}</span>
        </span>
      </summary>
      <div className="pb-3">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Obory okruhu {o.nazev}: škola a obor, obtížnost přijetí v 1. kole{rokText} a počet uchazečů</caption>
          <thead className="hidden bg-[#f4f6f9] md:table-header-group">
            <tr className="text-[13px] font-semibold text-slate-600">
              <th scope="col" className="px-5 py-2 font-semibold">Škola a obor</th>
              <th scope="col" className="w-[12rem] px-3 py-2 font-semibold">Obtížnost přijetí{rokText}</th>
              <th scope="col" className="w-[7rem] px-5 py-2 text-right font-semibold">Uchazečů</th>
            </tr>
          </thead>
          <tbody>
            {o.radky.map(r => <Radek key={r.klic} r={r} />)}
          </tbody>
        </table>
        {o.presun && (
          <p className="mx-4 mt-3 max-w-[68ch] text-[13px] leading-relaxed text-slate-600 md:mx-5">
            Zájem se mezi obory tohoto okruhu mezi ročníky {o.presun.od} a {o.presun.do} přesouvá. Obor, kam se v jednom
            roce dostal skoro každý, může být další rok těžký.
          </p>
        )}
      </div>
    </details>
  );
}

export function OkruhyMesta(
  { okruhy, nastavby, rok, rokObtiznosti }: {
    okruhy: OkruhMestaKZobrazeni[]; nastavby: OkruhMestaKZobrazeni[]; rok: number; rokObtiznosti: number | null;
  },
) {
  if (okruhy.length === 0 && nastavby.length === 0) return null;
  return (
    <section id="okruhy" className="scroll-mt-24" aria-labelledby="okruhy-nadpis">
      <h2 id="okruhy-nadpis" className="text-[24px] font-bold leading-tight text-[#16325c]">Které další obory v okolí uchazeči také volí</h2>
      <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-slate-700">
        Okruh jsou obory, mezi kterými se uchazeči rozhodovali: měli je často zároveň na přihlášce. „V okolí“ znamená
        podle přihlášek uchazečů, ne podle vzdálenosti, proto okruh sahá i za hranice města. Obory jsou seřazené podle
        počtu uchazečů, ne podle obtížnosti přijetí.
      </p>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-slate-600">
        Data o uchazečích 1. kola {rok}, okruhy ze sloučených ročníků přihlášek.
        {rokObtiznosti && rokObtiznosti !== rok ? ` Obtížnost přijetí je z 1. kola ${rokObtiznosti}.` : ''} Obory na okraji okruhu se mohou mezi
        ročníky přesunout do sousedního. Okruh popisuje, jak se uchazeči hlásili, neříká, jak dopadne váš výsledek.
      </p>
      {okruhy.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-[14px] border border-[#dde4ee] bg-white">
          {okruhy.map(o => <Okruh key={o.id} o={o} rokObtiznosti={rokObtiznosti} />)}
        </div>
      )}
      {nastavby.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[19px] font-bold text-[#16325c]">Kam po výučním listu</h3>
          <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-slate-600">
            Nástavbové studium pro absolventy učebních oborů. Je to samostatná volba, proto je mimo okruhy výše.
          </p>
          <div className="mt-3 overflow-hidden rounded-[14px] border border-[#dde4ee] bg-white">
            {nastavby.map(o => <Okruh key={o.id} o={o} rokObtiznosti={rokObtiznosti} />)}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Obsah bloku na stránce oboru: okruh, do kterého obor patří, se stejným jménem a řádky jako na stránce
 * města; řádek oboru je zvýrazněný. Pojem okruh se vysvětlí při prvním výskytu (slovník pojmů).
 */
const POCET_NA_STRANCE_OBORU = 10;

export function OkruhOboruObsah({ okruh, klic, rokObtiznosti, obec, hrefMesta }: {
  okruh: OkruhMestaKZobrazeni; klic: string; rokObtiznosti: number | null; obec: string; hrefMesta: string | null;
}) {
  const rokText = rokObtiznosti ? ` ${rokObtiznosti}` : '';
  // Deset největších oborů okruhu; tento obor vždy, i když je menší (seznam zůstává řazený podle uchazečů).
  const ukazane = okruh.radky.filter((r, i) => i < POCET_NA_STRANCE_OBORU || r.klic === klic);
  const zbyva = okruh.radky.length - ukazane.length;
  return (
    <>
      <p className="text-[15px] leading-relaxed text-slate-700">
        Obor patří do okruhu <b className="font-semibold text-[#16325c]">{okruh.nazev}</b>. Okruh jsou obory, mezi kterými se
        uchazeči rozhodovali: měli je často zároveň na přihlášce. Obory jsou seřazené podle počtu uchazečů, ne podle
        obtížnosti přijetí.
      </p>
      <p className="text-[13px] text-slate-600">Obtížnost přijetí v 1. kole{rokText}, počet uchazečů, kteří měli obor na přihlášce.</p>
      <div className="overflow-hidden rounded-xl border border-[#dde4ee]">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Obory okruhu {okruh.nazev}: škola a obor, obtížnost přijetí v 1. kole{rokText} a počet uchazečů</caption>
          <tbody>
            {ukazane.map(r => <Radek key={r.klic} r={r} tento={r.klic === klic} kompaktni />)}
          </tbody>
        </table>
      </div>
      {zbyva > 0 && (
        <p className="text-[14px] text-slate-600">
          V okruhu je ještě {zbyva} {zbyva === 1 ? 'další obor' : zbyva <= 4 ? 'další obory' : 'dalších oborů'} s menším počtem uchazečů.
        </p>
      )}
      {okruh.presun && (
        <p className="text-[14px] leading-relaxed text-slate-600">
          Zájem se mezi obory tohoto okruhu mezi ročníky {okruh.presun.od} a {okruh.presun.do} přesouvá. Obor, kam se v jednom
          roce dostal skoro každý, může být další rok těžký.
        </p>
      )}
      {hrefMesta && (
        <p className="text-[15px]">
          <Link href={hrefMesta} className="font-semibold text-[#0074e4] hover:underline">
            {zbyva > 0 ? `Celý okruh (${okruh.radky.length} oborů)` : 'Okruhy oborů'} na stránce města {obec}
          </Link>
        </p>
      )}
    </>
  );
}
