import Link from 'next/link';
import { OdznakObtiznosti } from '@/components/nabidka/Odznaky';
import type { ZarazeniObtiznosti } from '@/lib/obor-profil';

/**
 * Oddíl „Které další obory v okolí uchazeči také volí“ na stránce města (issue #277, etapa 2c).
 * Okruh = obory, které měli titíž uchazeči často zároveň na přihlášce (*Okruh oborů*, slovník
 * ukazatelů); „v okolí“ je podle přihlášek, ne podle vzdálenosti (slovník pojmů).
 * Řadí se podle počtu uchazečů, nikdy podle obtížnosti. Okruh se nepojmenovává, nese tři největší obory.
 */
export interface RadekOkruhu {
  klic: string;
  /** Název školy s ulicí („Gymnázium, Křenová“), ne zkrácený název z rejstříku. */
  skola: string;
  obor: string;
  /** Délka studia a zaměření, když jsou jednoznačné. */
  doplnek: string | null;
  /** Přehled školy; null, když škola stránku nemá. */
  href: string | null;
  /** Obec oboru, jen když se liší od města stránky. */
  obec: string | null;
  uchazecu: number;
  zarazeni: ZarazeniObtiznosti | null;
  bezJednoteZkousky: boolean;
}

export interface OkruhKZobrazeni {
  id: number;
  uchazecu: number;
  radky: RadekOkruhu[];
  presun: { od: number; do: number } | null;
}

function fmt(n: number) {
  return n.toLocaleString('cs-CZ');
}

function pocetOboru(n: number) {
  return `${fmt(n)} ${n === 1 ? 'obor' : n < 5 ? 'obory' : 'oborů'}`;
}

/** Názvy škol samy obsahují čárku („Gymnázium, Křenová“), proto je odděluje tečka. */
function nazevOkruhu(radky: RadekOkruhu[]) {
  const nazvy = Array.from(new Set(radky.map((r) => r.skola))).slice(0, 3);
  return radky.length > nazvy.length ? `${nazvy.join(' · ')} a další` : nazvy.join(' · ');
}

function Okruh({ o, rok }: { o: OkruhKZobrazeni; rok: number }) {
  return (
    <details id={`okruh-${o.id}`} className="group scroll-mt-24 rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-start gap-2 px-4 py-3 hover:bg-slate-50">
        <span className="mt-0.5 text-sm text-slate-400 transition-transform group-open:rotate-90">▶</span>
        <span>
          <span className="block text-[15px] font-semibold text-slate-900">{nazevOkruhu(o.radky)}</span>
          <span className="block text-[13px] text-slate-500">
            {pocetOboru(o.radky.length)}, zhruba {fmt(o.uchazecu)} uchazečů v 1. kole {rok}
          </span>
        </span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <ul className="divide-y divide-slate-100">
          {o.radky.map((r) => (
            <li key={r.klic} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <div>
                <div className="text-[15px] font-semibold text-slate-900">
                  {r.href ? <Link href={r.href} className="hover:text-[#0074e4] hover:underline">{r.skola}</Link> : r.skola}
                </div>
                <div className="text-[13px] text-slate-600">
                  {[r.obor, r.doplnek, r.obec].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.bezJednoteZkousky && (
                  <span className="whitespace-nowrap rounded-full border border-slate-300 px-2 py-0.5 text-[12px] text-slate-600">
                    bez jednotné zkoušky
                  </span>
                )}
                {r.zarazeni && <OdznakObtiznosti zarazeni={r.zarazeni} />}
                <span className="text-[13px] tabular-nums text-slate-500">{fmt(r.uchazecu)} uchazečů</span>
              </div>
            </li>
          ))}
        </ul>
        {o.presun && (
          <p className="text-[13px] leading-relaxed text-slate-600">
            Zájem se mezi obory tohoto okruhu mezi ročníky {o.presun.od} a {o.presun.do} přesouvá. Obor, kam se v jednom
            roce dostal skoro každý, může být další rok těžký.
          </p>
        )}
      </div>
    </details>
  );
}

export function OkruhyVeMeste(
  { okruhy, nastavby, rok }: { okruhy: OkruhKZobrazeni[]; nastavby: OkruhKZobrazeni[]; rok: number },
) {
  if (okruhy.length === 0 && nastavby.length === 0) return null;
  return (
    <section id="okruhy" className="scroll-mt-24">
      <h2 className="mb-2 text-2xl font-bold">Které další obory v okolí uchazeči také volí</h2>
      <p className="mb-2 text-sm text-slate-600">
        Obory, mezi kterými se uchazeči rozhodovali: měli je často zároveň na přihlášce. „V okolí“ znamená podle
        přihlášek uchazečů, ne podle vzdálenosti, proto okruh sahá i za hranice města. Okruhy jsou seřazené podle počtu
        uchazečů, ne podle obtížnosti přijetí. Rozbalte okruh a uvidíte jeho obory.
      </p>
      <p className="mb-6 text-[13px] text-slate-500">
        Data o uchazečích 1. kola {rok}. Okruh jsme spočítali z toho, které obory měli uchazeči na přihlášce zároveň.
        Obory na okraji okruhu se mohou mezi ročníky přesunout do sousedního. Okruh popisuje, jak se uchazeči hlásili,
        neříká, jak dopadne váš výsledek.
      </p>
      {okruhy.length > 0 && (
        <div className="space-y-2">
          {okruhy.map((o) => <Okruh key={o.id} o={o} rok={rok} />)}
        </div>
      )}
      {nastavby.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-lg font-bold text-slate-800">Kam po výučním listu</h3>
          <p className="mb-3 text-sm text-slate-600">
            Nástavbové studium pro absolventy učebních oborů. Je to samostatná volba, proto je mimo okruhy výše.
          </p>
          <div className="space-y-2">
            {nastavby.map((o) => <Okruh key={o.id} o={o} rok={rok} />)}
          </div>
        </div>
      )}
    </section>
  );
}
