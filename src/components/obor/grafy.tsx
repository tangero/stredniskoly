import { cislo, zOd } from '@/lib/obor-profil';

/**
 * Grafy stránky oboru jako serverové komponenty bez knihovny (docs/grafy-skoly-a-oboru-2027.md).
 * Barvy nehodnotí: modrá nese tento obor a přijaté, oranžová jen ty, kdo se nevešli kvůli kapacitě.
 * Každá hodnota je v grafu popsaná nebo v tabulce „Údaje v číslech“.
 */
export const BARVY = {
  prijati: '#0074e4',
  nevesli: '#eb6834',
  vyse: '#1baf7a',
  pozadavek: '#eda100',
  vzdali: '#9aa6b2',
  niz: '#86b6ef',
  tecka: '#c3ccd6',
  mrizka: '#e3e9f1',
  navy: '#16325c',
};

function Legenda({ polozky }: { polozky: [string, string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
      {polozky.map(([barva, popis]) => (
        <li key={popis} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: barva }} />
          {popis}
        </li>
      ))}
    </ul>
  );
}

/**
 * Mřížka soutěžících uchazečů: každý čtvereček jeden uchazeč, plné jsou přijatí.
 * Nad 150 soutěžícími uchazeči se mřížka přepočítá na 100, aby zůstala čitelná.
 */
export function MrizkaSoutezicich({ prijati, soutezici }: { prijati: number; soutezici: number }) {
  const naSto = soutezici > 150;
  const celkem = naSto ? 100 : soutezici;
  const plnych = naSto ? Math.round((100 * prijati) / soutezici) : prijati;
  return (
    <figure className="space-y-2">
      <div
        role="img"
        aria-label={`${cislo(prijati)} přijatých z ${cislo(soutezici)} soutěžících uchazečů`}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${celkem > 60 ? 10 : 14}px, 1fr))` }}
      >
        {Array.from({ length: celkem }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[2px]"
            style={{ background: i < plnych ? BARVY.prijati : BARVY.mrizka }}
          />
        ))}
      </div>
      <figcaption className="text-[13px] text-slate-500">
        {naSto
          ? `Přepočteno na 100 soutěžících uchazečů: ${cislo(plnych)} plných čtverečků jsou přijatí.`
          : `Každý čtvereček je jeden soutěžící uchazeč, plné jsou přijatí.`}
      </figcaption>
    </figure>
  );
}

export interface RadekRoku {
  rok: number;
  prijati: number;
  nevesli: number;
}

/**
 * Grafy jsou z HTML, ne z SVG: popisky tak zůstávají čitelné i na úzkém displeji,
 * kde by se text uvnitř zmenšeného SVG scvrkl pod 8 px.
 */
function Rok({ rok }: { rok: number }) {
  return <span className="w-11 shrink-0 text-[14px] font-bold tabular-nums text-[#16325c]">{rok}</span>;
}

/** Přijatí a nevešlí soutěžící uchazeči po ročnících na jedné ose. */
export function SloupceSoutezicich({ radky }: { radky: RadekRoku[] }) {
  const max = Math.max(...radky.map(r => r.prijati + r.nevesli), 1);
  return (
    <div className="space-y-3">
      <Legenda polozky={[[BARVY.prijati, 'přijatí'], [BARVY.nevesli, 'nevešli se kvůli kapacitě']]} />
      <ul className="space-y-3" aria-label="Přijatí a nevešlí soutěžící uchazeči po letech">
        {radky.map(r => {
          const celkem = r.prijati + r.nevesli;
          return (
            <li key={r.rok} className="flex items-start gap-2">
              <Rok rok={r.rok} />
              <div className="min-w-0 flex-1">
                <div className="flex h-6 gap-[2px]" style={{ width: `${(100 * celkem) / max}%` }}>
                  {r.prijati > 0 && <span className="rounded-[4px]" style={{ flex: r.prijati, background: BARVY.prijati }} title={`přijatí ${r.prijati}`} />}
                  {r.nevesli > 0 && <span className="rounded-[4px]" style={{ flex: r.nevesli, background: BARVY.nevesli }} title={`nevešli se ${r.nevesli}`} />}
                </div>
                <p className="mt-1 text-[13px] text-slate-600">
                  přijato {cislo(r.prijati)} {zOd(celkem)} {cislo(celkem)} soutěžících uchazečů{r.nevesli ? `, ${cislo(r.nevesli)} se nevešlo` : ', nikdo neodmítnut kvůli kapacitě'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface RozpadRoku {
  rok: number;
  prijati: number;
  nevesli: number;
  vyse: number;
  pozadavek: number;
  vzdali: number;
}

/** Co se stalo se všemi přihláškami po ročnících. */
export function RozpadPrihlasek({ radky }: { radky: RozpadRoku[] }) {
  const casti: [keyof RozpadRoku, string, string][] = [
    ['prijati', BARVY.prijati, 'přijatí'],
    ['nevesli', BARVY.nevesli, 'nevešli se kvůli kapacitě'],
    ['vyse', BARVY.vyse, 'přijati na obor výš na přihlášce'],
    ['pozadavek', BARVY.pozadavek, 'nedosáhli požadavku školy'],
    ['vzdali', BARVY.vzdali, 'vzdali se přijetí'],
  ];
  return (
    <div className="space-y-3">
      <Legenda polozky={casti.map(([, b, p]) => [b, p])} />
      <ul className="space-y-2" aria-label="Rozpad všech přihlášek podle výsledku">
        {radky.map(r => {
          const celkem = casti.reduce((s, [k]) => s + (r[k] as number), 0) || 1;
          return (
            <li key={r.rok} className="flex items-center gap-2">
              <Rok rok={r.rok} />
              <div className="flex h-7 min-w-0 flex-1 gap-[2px]">
                {casti.map(([k, barva, popis]) => {
                  const v = r[k] as number;
                  if (!v) return null;
                  const podil = (100 * v) / celkem;
                  return (
                    <span key={k} title={`${popis}: ${v} z ${celkem}`} className="flex items-center overflow-hidden rounded-[3px] px-1.5 text-[12px] font-bold tabular-nums"
                      style={{ flex: v, background: barva, color: k === 'vzdali' ? BARVY.navy : '#fff' }}>
                      {podil >= 9 ? cislo(v) : ''}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Soutěžící uchazeči v bodových pásmech a kolik se jich dostalo. */
export function PasmaBodu({ pasma }: { pasma: { od: number; do: number; prijato: number; soutezilo: number }[] }) {
  const max = Math.max(...pasma.map(p => p.soutezilo), 1);
  return (
    <div className="space-y-3">
      <Legenda polozky={[[BARVY.prijati, 'přijatí'], [BARVY.mrizka, 'soutěžící uchazeči v pásmu celkem']]} />
      <ul className="space-y-1.5" aria-label="Přijatí podle bodového pásma">
        {pasma.map(p => (
          <li key={p.od} className="grid grid-cols-[5.5rem_1fr_3.75rem] items-center gap-2 text-[13px]">
            <span className="tabular-nums text-slate-700">{cislo(p.od)}–{cislo(p.do)} bodů</span>
            <span className="relative h-3.5">
              <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${(100 * p.soutezilo) / max}%`, background: BARVY.mrizka }} />
              <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${(100 * p.prijato) / max}%`, background: BARVY.prijati }} />
            </span>
            <span className="text-right font-bold tabular-nums text-[#16325c]">{cislo(p.prijato)} {zOd(p.soutezilo)} {cislo(p.soutezilo)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tečkový graf oborů stejného typu v kraji s vyznačeným oborem. */
export function SkupinaVKraji({ hodnoty, hodnota, predchozi, format, formatOsy = format, osa }: {
  hodnoty: number[];
  hodnota: number;
  predchozi: number | null;
  format: (v: number) => string;
  formatOsy?: (v: number) => string;
  osa: number[];
}) {
  const min = osa[0];
  const max = osa[osa.length - 1];
  const x = (v: number) => `${(100 * (Math.min(Math.max(v, min), max) - min)) / (max - min)}%`;
  const serazene = [...hodnoty].sort((a, b) => a - b);
  return (
    <div className="px-3" role="img" aria-label={`Obory stejného typu v kraji; tento obor ${format(hodnota)}`}>
      <div className="relative h-24">
        {osa.map(v => <span key={v} aria-hidden="true" className="absolute inset-y-0 w-px" style={{ left: x(v), background: BARVY.mrizka }} />)}
        {serazene.map((v, i) => (
          <span key={i} aria-hidden="true" className="absolute h-[7px] w-[7px] -translate-x-1/2 rounded-full" style={{ left: x(v), top: `${10 + ((i * 37) % 64)}px`, background: BARVY.tecka }} />
        ))}
        {predchozi !== null && (
          <span title={`předchozí rok: ${format(predchozi)}`} className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white/60" style={{ left: x(predchozi), borderColor: BARVY.prijati }} />
        )}
        <span title={format(hodnota)} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: x(hodnota), background: BARVY.prijati }} />
      </div>
      <div className="relative mt-1 h-5 text-[12px] tabular-nums text-slate-500" aria-hidden="true">
        {osa.map(v => <span key={v} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: x(v) }}>{formatOsy(v)}</span>)}
      </div>
    </div>
  );
}

/** Kam se v 1. kole dostali všichni uchazeči, kteří měli obor na přihlášce. */
export function VysledekUchazecu({ sem, vys, niz, nikam }: { sem: number; vys: number; niz: number; nikam: number }) {
  const casti: [number, string, string][] = [
    [sem, BARVY.prijati, 'přijati sem'],
    [vys, BARVY.vyse, 'přijati na obor výš na přihlášce'],
    [niz, BARVY.niz, 'přijati na obor níž na přihlášce'],
    [nikam, BARVY.nevesli, 'v 1. kole nikam'],
  ];
  const celkem = sem + vys + niz + nikam || 1;
  return (
    <div className="space-y-3">
      <Legenda polozky={casti.map(([, b, p]) => [b, p])} />
      <div className="flex h-9 w-full overflow-hidden rounded-md" role="img" aria-label={casti.map(([v, , p]) => `${p} ${v}`).join(', ')}>
        {casti.map(([v, barva, popis]) => v > 0 && (
          <div key={popis} title={`${popis}: ${v}`} className="flex items-center border-r-2 border-white px-2 text-[13px] font-bold last:border-r-0"
            style={{ width: `${(100 * v) / celkem}%`, background: barva, color: barva === BARVY.niz ? BARVY.navy : '#fff' }}>
            {(100 * v) / celkem > 7 ? cislo(v) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
