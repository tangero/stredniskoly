'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { OdznakObtiznosti } from '@/components/nabidka/Odznaky';
import { cislo, ZARAZENI_POPISEK, PORADI_OBTIZNOSTI, type ZarazeniObtiznosti } from '@/lib/obor-profil';
import { SMERY_STUDIA, type SmerStudia } from '@/lib/smery-studia';

/**
 * Přehled oborů ve městě po kartách škol, zúžený směrem studia
 * (docs/navrh-prehled-oboru-ve-meste-2027.md). Řádek oboru nese jen obor, obtížnost přijetí
 * a počet míst; podrobnosti jsou na stránce oboru. Podle obtížnosti se neřadí.
 */
export type DruhOboru = 'jpz' | 'vyucni' | 'bez_zkousky' | 'mimo';

export interface RadekKarty {
  id: string;
  obor: string;
  /** Délka, zaměření, „výuční list“ nebo „nástavba po výučním listu“. */
  doplnek: string;
  smer: SmerStudia;
  druh: DruhOboru;
  zarazeni: ZarazeniObtiznosti | null;
  mista: number | null;
  /** Stránka oboru; obory bez jednotné zkoušky ji nemají. */
  href: string | null;
  /** Nabídka v zobrazeném ročníku chybí, údaje jsou starší. */
  nevypsano: boolean;
}

export interface KartaSkoly {
  redizo: string;
  /** Název s ulicí. */
  nazev: string;
  href: string | null;
  /** „soukromá škola“ nebo „církevní škola“; veřejné školy nic nenesou. */
  zrizovatel: string | null;
  radky: RadekKarty[];
}

export type VelikostMesta = 'male' | 'stredni' | 'velke';

type Doklad = 'vse' | 'maturita' | 'vyucni';

const pocetOboru = (n: number) => `${cislo(n)} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;
const pocetSkol = (n: number) => `${cislo(n)} ${n === 1 ? 'škola' : n >= 2 && n <= 4 ? 'školy' : 'škol'}`;
const pocetMist = (n: number) => `${cislo(n)} ${n === 1 ? 'místo' : n >= 2 && n <= 4 ? 'místa' : 'míst'}`;

const PORADI_SMERU = new Map(SMERY_STUDIA.map((s, i) => [s.id, i]));
/** Gymnázia a víceletá gymnázia rozliší už délka a ročník v řádku; popisek nad „Gymnázium“ by jen opakoval slovo. */
const BEZ_POPISKU = new Set<SmerStudia>(['gymnazia', 'viceleta']);

function textBezUdaje(r: RadekKarty): string {
  if (r.druh === 'mimo') return 'mimo náš přehled';
  if (r.druh !== 'jpz') return 'bez jednotné zkoušky';
  return 'bez údaje';
}

export function SkolyPodleSmeru({
  skoly, rok, velikost, hlavicka,
}: {
  skoly: KartaSkoly[];
  /** Zobrazený ročník 1. kola z registru. */
  rok: number | null;
  velikost: VelikostMesta;
  /** Nadpis a věta o městě; vykreslí se v tmavém pásu nad čipy směrů. */
  hlavicka: ReactNode;
}) {
  const [smer, setSmer] = useState<SmerStudia | 'vse'>('vse');
  const [doklad, setDoklad] = useState<Doklad>('vse');
  const [obtiznost, setObtiznost] = useState<ZarazeniObtiznosti | 'vse'>('vse');
  const [hledat, setHledat] = useState('');
  const [upresnit, setUpresnit] = useState(false);
  const idHledat = useId();
  const idObtiznost = useId();

  const vsechnyRadky = useMemo(() => skoly.flatMap(s => s.radky), [skoly]);

  const smery = useMemo(() => {
    const pocty = new Map<SmerStudia, number>();
    for (const r of vsechnyRadky) pocty.set(r.smer, (pocty.get(r.smer) ?? 0) + 1);
    return SMERY_STUDIA.filter(s => pocty.has(s.id)).map(s => ({ ...s, pocet: pocty.get(s.id)! }));
  }, [vsechnyRadky]);

  const cipy: { id: SmerStudia | 'vse'; nazev: string; pocet: number }[] = [
    { id: 'vse', nazev: 'Všechny směry', pocet: vsechnyRadky.length },
    ...smery.map(s => ({ id: s.id, nazev: s.kratce, pocet: s.pocet })),
  ];
  const maVyucni = vsechnyRadky.some(r => r.druh === 'vyucni');
  const maMaturitni = vsechnyRadky.some(r => r.druh === 'jpz');
  const ukazCipy = velikost !== 'male' && smery.length > 1;
  const ukazDoklad = velikost !== 'male' && maVyucni && maMaturitni;
  const ukazObtiznost = velikost !== 'male' && vsechnyRadky.some(r => r.zarazeni);
  const ukazHledani = velikost === 'velke';

  const dotaz = hledat.trim().toLocaleLowerCase('cs');
  const sedi = (r: RadekKarty, skola: KartaSkoly) => {
    if (smer !== 'vse' && r.smer !== smer) return false;
    if (doklad === 'maturita' && r.druh !== 'jpz') return false;
    if (doklad === 'vyucni' && r.druh !== 'vyucni') return false;
    if (obtiznost !== 'vse' && r.zarazeni !== obtiznost) return false;
    if (dotaz && !`${skola.nazev} ${r.obor} ${r.doplnek}`.toLocaleLowerCase('cs').includes(dotaz)) return false;
    return true;
  };

  const vysledek = skoly
    .map(s => ({
      ...s,
      radky: s.radky
        .filter(r => sedi(r, s))
        .sort((a, b) => (PORADI_SMERU.get(a.smer)! - PORADI_SMERU.get(b.smer)!) || a.obor.localeCompare(b.obor, 'cs')),
    }))
    .filter(s => s.radky.length > 0);
  const nRadku = vysledek.reduce((a, s) => a + s.radky.length, 0);

  const pocetObtiznosti = useMemo(() => {
    const m = new Map<ZarazeniObtiznosti, number>();
    for (const r of vsechnyRadky) {
      if (r.zarazeni && (smer === 'vse' || r.smer === smer)) m.set(r.zarazeni, (m.get(r.zarazeni) ?? 0) + 1);
    }
    return m;
  }, [vsechnyRadky, smer]);

  const filtrovano = smer !== 'vse' || doklad !== 'vse' || obtiznost !== 'vse' || dotaz !== '';
  const zrusit = () => { setSmer('vse'); setDoklad('vse'); setObtiznost('vse'); setHledat(''); };

  return (
    <>
      <div className="bg-[#16325c] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-6 md:pb-7 md:pt-8">
          {hlavicka}
          {ukazCipy && (
            <div className="mt-5 md:mt-6">
              <h2 className="mb-2 text-[17px] md:mb-3 font-semibold text-[#d6e2f3]">Co tu můžete studovat</h2>
              {/* Na telefonu dvě řady posouvané vodorovně jako celek, čtené po řádcích; od md jedna zalomená řada. */}
              <div role="group" aria-label="Směr studia" className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:overflow-visible md:px-0 md:pb-1">
                <div className="flex w-max flex-col gap-2 md:w-auto md:flex-row md:flex-wrap">
                  {[cipy.slice(0, Math.ceil(cipy.length / 2)), cipy.slice(Math.ceil(cipy.length / 2))].map((rada, i) => (
                    <div key={i} className="flex gap-2 md:contents">
                      {rada.map(c => (
                        <CipSmeru key={c.id} aktivni={smer === c.id} onClick={() => setSmer(c.id)} nazev={c.nazev} pocet={c.pocet} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-[13px] leading-snug text-[#c3d3ea] md:mt-3">
                Směry seskupují obory podle toho, co se v nich učí, podle číselníku oborů MŠMT. Jejich pořadí nic
                neříká o obtížnosti přijetí.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 md:pt-6">
        {(ukazDoklad || ukazObtiznost || ukazHledani) && (
          <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3 md:mb-4 md:gap-y-4">
            {ukazDoklad && (
              <div role="group" aria-label="Jaké vzdělání obor dává" className="inline-flex rounded-full bg-[#e6ecf3] p-1">
                {([['vse', 'Vše'], ['maturita', 'S maturitou'], ['vyucni', 'S výučním listem']] as [Doklad, string][]).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={doklad === k}
                    onClick={() => setDoklad(k)}
                    className={`min-h-[40px] rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] ${
                      doklad === k ? 'bg-white text-[#16325c] shadow-[0_1px_3px_rgba(22,50,92,0.18)]' : 'text-slate-700 hover:text-[#16325c]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            {(ukazObtiznost || ukazHledani) && (
              <button
                type="button"
                aria-expanded={upresnit}
                onClick={() => setUpresnit(!upresnit)}
                className="min-h-[44px] rounded-full border border-slate-300 bg-white px-4 text-[15px] font-semibold text-[#16325c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] md:hidden"
              >
                {upresnit ? 'Skrýt upřesnění' : 'Upřesnit výběr'}
              </button>
            )}
            <div className={`${upresnit ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-x-6 gap-y-4 md:flex md:w-auto md:flex-1`}>
            {ukazObtiznost && (
              <div className="flex flex-col gap-1">
                <label htmlFor={idObtiznost} className="text-[13px] font-medium text-slate-600">
                  Obtížnost přijetí{rok ? ` v 1. kole ${rok}` : ''}
                </label>
                <select
                  id={idObtiznost}
                  value={obtiznost}
                  onChange={e => setObtiznost(e.target.value as ZarazeniObtiznosti | 'vse')}
                  className="min-h-[44px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0074e4]"
                >
                  <option value="vse">všechny stupně</option>
                  {PORADI_OBTIZNOSTI.map(z => (
                    <option key={z} value={z} disabled={!pocetObtiznosti.get(z)}>
                      {ZARAZENI_POPISEK[z]} ({cislo(pocetObtiznosti.get(z) ?? 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {ukazHledani && (
              <div className="flex min-w-[240px] flex-1 flex-col gap-1 md:max-w-[340px]">
                <label htmlFor={idHledat} className="text-[13px] font-medium text-slate-600">Hledat školu nebo obor</label>
                <input
                  id={idHledat}
                  type="search"
                  value={hledat}
                  onChange={e => setHledat(e.target.value)}
                  placeholder="například Purkyňova nebo elektro"
                  className="min-h-[44px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0074e4]"
                />
              </div>
            )}
            </div>
          </div>
        )}

        <p className="max-w-[68ch] text-[14px] leading-relaxed text-slate-600">
          <b className="font-semibold text-slate-800">Obtížnost přijetí</b>{rok ? ` v 1. kole ${rok}` : ''}: kolik
          soutěžících uchazečů se dostalo, tedy těch, kdo splnili požadavky školy a nedostali se na obor, který měli
          na přihlášce výš. Kvalitu školy nepopisuje.
        </p>

        <div className="mb-3 mt-3 flex flex-wrap items-baseline justify-between gap-2 md:mb-4 md:mt-5" aria-live="polite">
          <p className="text-[15px] font-semibold text-[#16325c]">
            {pocetSkol(vysledek.length)}, {pocetOboru(nRadku)}
          </p>
          {filtrovano && (
            <button
              type="button"
              onClick={zrusit}
              className="min-h-[44px] rounded-full px-3 text-[14px] font-semibold text-[#0062c4] underline underline-offset-2 hover:text-[#16325c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0074e4]"
            >
              Zobrazit vše
            </button>
          )}
        </div>

        {vysledek.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-[16px] font-semibold text-slate-800">Tomuto výběru neodpovídá žádný obor.</p>
            <p className="mt-1 text-[14px] text-slate-600">Zkuste jiný směr nebo zrušte filtr.</p>
            <button
              type="button"
              onClick={zrusit}
              className="mt-4 min-h-[44px] rounded-full bg-[#0074e4] px-5 text-[15px] font-semibold text-white hover:bg-[#0062c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]"
            >
              Zobrazit všechny obory
            </button>
          </div>
        ) : (
          <ul className="grid items-start gap-4 md:grid-cols-2">
            {vysledek.map(s => (
              <li key={s.redizo}>
                <KartaSkolyView skola={s} rok={rok} seSkupinami={smer === 'vse'} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function CipSmeru({ aktivni, onClick, nazev, pocet }: { aktivni: boolean; onClick: () => void; nazev: string; pocet: number }) {
  return (
    <button
      type="button"
      aria-pressed={aktivni}
      onClick={onClick}
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        aktivni ? 'bg-white text-[#16325c]' : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {nazev}
      <span className={`tabular-nums text-[14px] font-medium ${aktivni ? 'text-[#0062c4]' : 'text-[#c3d3ea]'}`}>{cislo(pocet)}</span>
    </button>
  );
}

function KartaSkolyView({ skola, rok, seSkupinami }: { skola: KartaSkoly; rok: number | null; seSkupinami: boolean }) {
  const skupiny: { smer: SmerStudia; radky: RadekKarty[] }[] = [];
  for (const r of skola.radky) {
    const posledni = skupiny[skupiny.length - 1];
    if (posledni && posledni.smer === r.smer) posledni.radky.push(r);
    else skupiny.push({ smer: r.smer, radky: [r] });
  }
  const popisky = seSkupinami && skupiny.length > 1;
  return (
    <article className="rounded-[14px] border border-[#dde4ee] bg-white px-5 pb-3 pt-4">
      <h3 className="text-[17px] font-bold leading-snug text-[#16325c]">
        {skola.href ? (
          <Link href={skola.href} className="hover:text-[#0062c4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]">
            {skola.nazev}
          </Link>
        ) : skola.nazev}
      </h3>
      {skola.zrizovatel && <p className="mt-0.5 text-[13px] text-slate-600">{skola.zrizovatel}</p>}
      {skupiny.map((g, i) => {
        const sPopiskem = popisky && !BEZ_POPISKU.has(g.smer);
        // Skupina bez popisku navazuje na předchozí stejnou dělicí čarou jako řádky uvnitř skupiny.
        return (
        <div key={g.smer} className={i === 0 || sPopiskem ? 'mt-2' : 'border-t border-[#eef2f6]'}>
          {sPopiskem && (
            <p className="mt-3 text-[13px] font-semibold text-slate-500">
              {SMERY_STUDIA.find(s => s.id === g.smer)?.kratce}
            </p>
          )}
          <ul className="divide-y divide-[#eef2f6]">
            {g.radky.map(r => (
              <li key={r.id}>
                <RadekView r={r} rok={rok} />
              </li>
            ))}
          </ul>
        </div>
        );
      })}
    </article>
  );
}

function RadekView({ r, rok }: { r: RadekKarty; rok: number | null }) {
  const obsah = (
    <>
      <span className="min-w-0">
        <span className={`block text-[15px] font-semibold leading-snug ${r.href ? 'text-slate-900 group-hover:text-[#0062c4]' : 'text-slate-800'}`}>
          {r.obor}
        </span>
        {r.doplnek && <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{r.doplnek}</span>}
        {r.nevypsano && (
          <span className="mt-0.5 block text-[13px] text-amber-800">v 1. kole{rok ? ` ${rok}` : ''} nevypsán, údaje jsou starší</span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        {r.zarazeni ? <OdznakObtiznosti zarazeni={r.zarazeni} /> : (
          <span className="text-[13px] text-slate-600">{textBezUdaje(r)}</span>
        )}
        {r.mista !== null && <span className="text-[13px] tabular-nums text-slate-600">{pocetMist(r.mista)}</span>}
      </span>
    </>
  );
  const tridy = 'flex items-start justify-between gap-4 py-3';
  return r.href ? (
    <Link
      href={r.href}
      className={`group -mx-2 rounded-lg px-2 ${tridy} hover:bg-[#f5f8fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0074e4]`}
    >
      {obsah}
    </Link>
  ) : (
    <div className={tridy}>{obsah}</div>
  );
}
