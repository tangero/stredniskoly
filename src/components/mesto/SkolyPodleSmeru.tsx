'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { OdznakObtiznosti } from '@/components/nabidka/Odznaky';
import { cislo, ZARAZENI_POPISEK, PORADI_OBTIZNOSTI, type ZarazeniObtiznosti } from '@/lib/obor-profil';
import { SMERY_STUDIA, type SmerStudia } from '@/lib/smery-studia';
import type { DruhZrizovatele } from '@/lib/simulator-filter';

/**
 * Přehled oborů ve městě jako jedna tabulka: škola je záhlaví skupiny, pod ní její obory ve stálých
 * sloupcích (obor a zaměření, délka, obtížnost přijetí, místa), zúžená směrem studia
 * (docs/navrh-prehled-oboru-ve-meste-2027.md). Podrobnosti jsou na stránce oboru.
 * Podle obtížnosti se neřadí; školy jdou podle názvu.
 */
export type DruhOboru = 'jpz' | 'vyucni' | 'bez_zkousky' | 'mimo';

export interface RadekKarty {
  id: string;
  obor: string;
  /** Délka, zaměření, „výuční list“ nebo nástavba jedním řetězcem (hledání). */
  doplnek: string;
  /** Délka studia a ročník, ze kterého se hlásí; u učebních oborů „výuční list“. */
  delka: string;
  /** Zaměření, když se liší od názvu oboru. */
  zamereni: string;
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
  /** Zřizovatel; `null`, když ho katalog nezná. */
  zrizovatel: DruhZrizovatele | null;
  radky: RadekKarty[];
}

export type VelikostMesta = 'male' | 'stredni' | 'velke';

type Doklad = 'vse' | 'maturita' | 'vyucni';

const pocetOboru = (n: number) => `${cislo(n)} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;
const pocetMist = (n: number) => `${cislo(n)} ${n === 1 ? 'místo' : n >= 2 && n <= 4 ? 'místa' : 'míst'}`;
const pocetSkol = (n: number) => `${cislo(n)} ${n === 1 ? 'škola' : n >= 2 && n <= 4 ? 'školy' : 'škol'}`;

const PORADI_SMERU = new Map(SMERY_STUDIA.map((s, i) => [s.id, i]));

/** Slovník pojmů, heslo zřizovatel: soukromé a církevní školy mohou vybírat školné (výši neznáme). */
const ZRIZOVATEL_TEXT: Record<DruhZrizovatele, string | null> = {
  verejna: null,
  soukroma: 'soukromá škola · může vybírat školné',
  cirkevni: 'církevní škola · může vybírat školné',
};

const ZRIZOVATEL_VOLBA: [DruhZrizovatele | 'vse', string][] = [
  ['vse', 'všechny školy'], ['verejna', 'veřejné'], ['soukroma', 'soukromé'], ['cirkevni', 'církevní'],
];

function textBezUdaje(r: RadekKarty): string {
  if (r.druh === 'mimo') return 'mimo náš přehled';
  if (r.druh !== 'jpz') return 'bez jednotné zkoušky';
  return 'bez údaje';
}

/** Pole a výběr mají stejnou výšku i vzhled ve všech prohlížečích (Safari jinak výběr zmenší). */
const POLE = 'h-11 rounded-[10px] border border-slate-300 bg-white text-[15px] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0074e4]';
const POPISEK = 'text-[13px] font-medium leading-5 text-slate-600 whitespace-nowrap';

function Vyber({ id, value, onChange, children }: { id: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="relative block">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${POLE} w-full cursor-pointer appearance-none pl-3 pr-10`}
      >
        {children}
      </select>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
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
  const [zrizovatel, setZrizovatel] = useState<DruhZrizovatele | 'vse'>('vse');
  const [hledat, setHledat] = useState('');
  const [upresnit, setUpresnit] = useState(false);
  const idHledat = useId();
  const idObtiznost = useId();
  const idZrizovatel = useId();
  const idDoklad = useId();

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
  const ukazZrizovatele = velikost !== 'male' && skoly.some(s => s.zrizovatel && s.zrizovatel !== 'verejna');
  const ukazHledani = velikost === 'velke';
  const maUpresneni = ukazObtiznost || ukazZrizovatele || ukazHledani;

  const dotaz = hledat.trim().toLocaleLowerCase('cs');
  const sedi = (r: RadekKarty, skola: KartaSkoly) => {
    if (smer !== 'vse' && r.smer !== smer) return false;
    if (doklad === 'maturita' && r.druh !== 'jpz') return false;
    if (doklad === 'vyucni' && r.druh !== 'vyucni') return false;
    if (obtiznost !== 'vse' && r.zarazeni !== obtiznost) return false;
    if (zrizovatel !== 'vse' && skola.zrizovatel !== zrizovatel) return false;
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

  const pocetZrizovatele = useMemo(() => {
    const m = new Map<DruhZrizovatele, number>();
    for (const s of skoly) if (s.zrizovatel) m.set(s.zrizovatel, (m.get(s.zrizovatel) ?? 0) + 1);
    return m;
  }, [skoly]);

  const filtrovano = smer !== 'vse' || doklad !== 'vse' || obtiznost !== 'vse' || zrizovatel !== 'vse' || dotaz !== '';
  const zrusit = () => {
    setSmer('vse'); setDoklad('vse'); setObtiznost('vse'); setZrizovatel('vse'); setHledat('');
  };

  return (
    <>
      <div className="bg-[#16325c] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-6 md:pb-7 md:pt-8">
          {hlavicka}
          {ukazCipy && (
            <div className="mt-5 md:mt-6">
              <h2 className="mb-2 text-[17px] font-semibold text-[#d6e2f3] md:mb-3">Co tu můžete studovat</h2>
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
        {(ukazDoklad || maUpresneni) && (
          // Každý prvek: popisek ve stejné výšce a ovládání vysoké 44 px, aby řada držela jednu linku.
          <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-3 md:mb-4">
            {ukazDoklad && (
              <div className="flex flex-col gap-1.5">
                <span id={idDoklad} className={POPISEK}>Vzdělání</span>
                <div role="group" aria-labelledby={idDoklad} className="inline-flex h-11 items-center rounded-full bg-[#e6ecf3] p-1">
                  {([['vse', 'Vše'], ['maturita', 'S maturitou'], ['vyucni', 'S výučním listem']] as [Doklad, string][]).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={doklad === k}
                      onClick={() => setDoklad(k)}
                      className={`h-9 rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] ${
                        doklad === k ? 'bg-white text-[#16325c] shadow-[0_1px_3px_rgba(22,50,92,0.18)]' : 'text-slate-700 hover:text-[#16325c]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {maUpresneni && (
              <button
                type="button"
                aria-expanded={upresnit}
                onClick={() => setUpresnit(!upresnit)}
                className="h-11 rounded-full border border-slate-300 bg-white px-4 text-[15px] font-semibold text-[#16325c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] md:hidden"
              >
                {upresnit ? 'Skrýt upřesnění' : 'Upřesnit výběr'}
              </button>
            )}
            <div className={`${upresnit ? 'flex' : 'hidden'} w-full flex-col gap-3 md:flex md:w-auto md:flex-1 md:flex-row md:items-end md:gap-4`}>
              {ukazObtiznost && (
                <div className="flex flex-col gap-1.5 md:w-[15rem]">
                  <label htmlFor={idObtiznost} className={POPISEK}>
                    Obtížnost přijetí{rok ? ` v 1. kole ${rok}` : ''}
                  </label>
                  <Vyber id={idObtiznost} value={obtiznost} onChange={v => setObtiznost(v as ZarazeniObtiznosti | 'vse')}>
                    <option value="vse">všechny stupně</option>
                    {PORADI_OBTIZNOSTI.map(z => (
                      <option key={z} value={z} disabled={!pocetObtiznosti.get(z)}>
                        {ZARAZENI_POPISEK[z]} ({cislo(pocetObtiznosti.get(z) ?? 0)})
                      </option>
                    ))}
                  </Vyber>
                </div>
              )}
              {ukazZrizovatele && (
                <div className="flex flex-col gap-1.5 md:w-[15rem]">
                  <label htmlFor={idZrizovatel} className={POPISEK}>Zřizovatel školy</label>
                  <Vyber id={idZrizovatel} value={zrizovatel} onChange={v => setZrizovatel(v as DruhZrizovatele | 'vse')}>
                    {ZRIZOVATEL_VOLBA.map(([k, l]) => (
                      <option key={k} value={k} disabled={k !== 'vse' && !pocetZrizovatele.get(k)}>
                        {k === 'vse' ? l : `${l} (${cislo(pocetZrizovatele.get(k) ?? 0)})`}
                      </option>
                    ))}
                  </Vyber>
                </div>
              )}
              {ukazHledani && (
                <div className="flex flex-col gap-1.5 md:min-w-[15rem] md:flex-1">
                  <label htmlFor={idHledat} className={POPISEK}>Hledat školu nebo obor</label>
                  <input
                    id={idHledat}
                    type="search"
                    value={hledat}
                    onChange={e => setHledat(e.target.value)}
                    placeholder="například Purkyňova nebo elektro"
                    className={`${POLE} w-full px-3 placeholder:text-slate-500`}
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
          {ukazZrizovatele && ' Zřizovatel je ten, kdo školu založil a odpovídá za ni; soukromé a církevní školy mohou vybírat školné.'}
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
          <div className="overflow-hidden rounded-[14px] border border-[#dde4ee] bg-white">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Obory ve městě po školách: obor a zaměření, délka studia, obtížnost přijetí{rok ? ` v 1. kole ${rok}` : ''} a počet míst
              </caption>
              <thead className="hidden bg-[#f4f6f9] md:table-header-group">
                <tr className="text-[13px] font-semibold text-slate-600">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Obor</th>
                  <th scope="col" className="w-[11rem] px-3 py-2.5 font-semibold">Délka</th>
                  <th scope="col" className="w-[12rem] px-3 py-2.5 font-semibold">Obtížnost přijetí{rok ? ` ${rok}` : ''}</th>
                  <th scope="col" className="w-[6rem] px-5 py-2.5 text-right font-semibold">Míst</th>
                </tr>
              </thead>
              {vysledek.map(s => (
                <SkolaView key={s.redizo} skola={s} rok={rok} />
              ))}
            </table>
          </div>
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

function SkolaView({ skola, rok }: { skola: KartaSkoly; rok: number | null }) {
  const zrizovatel = skola.zrizovatel ? ZRIZOVATEL_TEXT[skola.zrizovatel] : null;
  return (
    <tbody className="border-t border-[#dde4ee] first-of-type:border-t-0">
      {/* Název školy přes sloupce Obor a Délka, zřizovatel ve sloupci obtížnosti: štítky jsou pod sebou na jedné linii. */}
      <tr className="block bg-[#f7f9fc] px-4 pb-2 pt-3.5 md:table-row md:p-0">
        <th scope="colgroup" colSpan={2} className="block text-left font-normal md:table-cell md:px-5 md:pb-2.5 md:pt-3.5 md:align-middle">
          <span className="text-[17px] font-bold leading-snug text-[#16325c]">
            {skola.href ? (
              <Link href={skola.href} className="hover:text-[#0062c4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]">
                {skola.nazev}
              </Link>
            ) : skola.nazev}
          </span>
        </th>
        <td colSpan={2} className={`${zrizovatel ? 'mt-1.5 block' : 'hidden'} md:mt-0 md:table-cell md:px-3 md:pb-2.5 md:pt-3.5 md:align-middle`}>
          {zrizovatel && (
            <span className="inline-block whitespace-nowrap rounded-full border border-[#b9893a] bg-[#fdf6e9] px-2.5 py-0.5 text-[13px] font-medium text-[#7a4e0c]">
              {zrizovatel}
            </span>
          )}
        </td>
      </tr>
      {skola.radky.map(r => (
        <RadekView key={r.id} r={r} rok={rok} />
      ))}
    </tbody>
  );
}

function RadekView({ r, rok }: { r: RadekKarty; rok: number | null }) {
  return (
    <tr className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[#eef2f6] px-4 py-3 md:table-row md:px-0 md:py-0 md:hover:bg-[#f5f8fc]">
      <td className="col-span-3 md:px-5 md:py-3 md:align-top">
        {r.href ? (
          <Link href={r.href} className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-[#0062c4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]">
            {r.obor}
          </Link>
        ) : (
          <span className="text-[15px] font-semibold leading-snug text-slate-800">{r.obor}</span>
        )}
        {r.zamereni && <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{r.zamereni}</span>}
        {r.nevypsano && (
          <span className="mt-0.5 block text-[13px] text-amber-800">v 1. kole{rok ? ` ${rok}` : ''} nevypsán, údaje jsou starší</span>
        )}
      </td>
      <td className="mt-1.5 text-[14px] text-slate-700 md:mt-0 md:px-3 md:py-3 md:align-top">{r.delka}</td>
      <td className="mt-1.5 md:mt-0 md:px-3 md:py-3 md:align-top">
        {r.zarazeni ? <OdznakObtiznosti zarazeni={r.zarazeni} /> : (
          <span className="text-[13px] text-slate-600">{textBezUdaje(r)}</span>
        )}
      </td>
      <td className="mt-1.5 text-right text-[14px] tabular-nums text-slate-700 md:mt-0 md:px-5 md:py-3 md:align-top">
        {r.mista !== null ? (
          <>
            <span className="md:hidden">{pocetMist(r.mista)}</span>
            <span className="hidden md:inline">{cislo(r.mista)}</span>
          </>
        ) : <span className="text-slate-500" aria-label="počet míst neuvádíme">–</span>}
      </td>
    </tr>
  );
}
