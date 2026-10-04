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

function Radek({ r }: { r: RadekOkruhuMesta }) {
  const druhy = [r.obor, r.doplnek, r.obec].filter(Boolean).join(' · ');
  return (
    <tr className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[#eef2f6] px-4 py-3 md:table-row md:px-0 md:py-0 md:hover:bg-[#f5f8fc]">
      <td className="col-span-2 md:px-5 md:py-3 md:align-top">
        {r.href ? (
          <Link href={r.href} className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-[#0062c4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]">
            {r.skola}
          </Link>
        ) : (
          <span className="text-[15px] font-semibold leading-snug text-slate-800">{r.skola}</span>
        )}
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{druhy}</span>
      </td>
      <td className="mt-1.5 md:mt-0 md:px-3 md:py-3 md:align-top">
        {r.zarazeni ? <OdznakObtiznosti zarazeni={r.zarazeni} /> : (
          <span className="text-[13px] text-slate-600">
            {r.bezJednotneZkousky ? 'bez jednotné zkoušky' : r.lisiSe ? 'liší se podle zaměření' : 'bez údaje'}
          </span>
        )}
      </td>
      <td className="mt-1.5 text-right text-[14px] tabular-nums text-slate-700 md:mt-0 md:px-5 md:py-3 md:align-top">
        {cislo(r.uchazecu)}<span className="md:hidden"> uchazečů</span>
      </td>
    </tr>
  );
}

function Okruh({ o, rok }: { o: OkruhMestaKZobrazeni; rok: number }) {
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
          <caption className="sr-only">Obory okruhu {o.nazev}: škola a obor, obtížnost přijetí v 1. kole {rok} a počet uchazečů</caption>
          <thead className="hidden bg-[#f4f6f9] md:table-header-group">
            <tr className="text-[13px] font-semibold text-slate-600">
              <th scope="col" className="px-5 py-2 font-semibold">Škola a obor</th>
              <th scope="col" className="w-[12rem] px-3 py-2 font-semibold">Obtížnost přijetí {rok}</th>
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
  { okruhy, nastavby, rok }: { okruhy: OkruhMestaKZobrazeni[]; nastavby: OkruhMestaKZobrazeni[]; rok: number },
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
        Data o uchazečích 1. kola {rok}, okruhy ze sloučených ročníků přihlášek. Obory na okraji okruhu se mohou mezi
        ročníky přesunout do sousedního. Okruh popisuje, jak se uchazeči hlásili, neříká, jak dopadne váš výsledek.
      </p>
      {okruhy.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-[14px] border border-[#dde4ee] bg-white">
          {okruhy.map(o => <Okruh key={o.id} o={o} rok={rok} />)}
        </div>
      )}
      {nastavby.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[19px] font-bold text-[#16325c]">Kam po výučním listu</h3>
          <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-slate-600">
            Nástavbové studium pro absolventy učebních oborů. Je to samostatná volba, proto je mimo okruhy výše.
          </p>
          <div className="mt-3 overflow-hidden rounded-[14px] border border-[#dde4ee] bg-white">
            {nastavby.map(o => <Okruh key={o.id} o={o} rok={rok} />)}
          </div>
        </div>
      )}
    </section>
  );
}
