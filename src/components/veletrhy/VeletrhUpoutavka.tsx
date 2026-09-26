import Link from 'next/link';
import { akceProObec, OVERENO_K, type Veletrh } from '@/lib/veletrhy';
import { formatujDen } from '@/lib/veletrhy-pocty';
import { VeletrhSkryvani } from './VeletrhSkryvani';

/**
 * Upoutávka na veletrh ve městě školy pro stránku školy a stránku oboru.
 *
 * Veletrh je fakt o městě, ne o škole: seznam vystavovatelů neexistuje
 * v žádném zdroji (docs/zdroje-dat.md, oddíl 3), takže text nikdy netvrdí,
 * že se škola akce účastní. Ukazují se jen akce s potvrzeným termínem,
 * které ještě neproběhly a jejichž termín je ověřený u pořadatele — přísněji
 * než seznam na /veletrhy, viz `akceProObec` (docs/veletrhy-skol-2027.md).
 * Když ve městě taková akce není, komponenta nevykreslí nic, ani obal. Když je ve městě akce potvrzená, je to
 * pro rodinu nejlevnější způsob, jak si ověřit, co čte o jedné škole,
 * proti ostatním z kraje.
 */

/** Víc akcí do jedné upoutávky nedáváme: blok má dokreslit kontext, ne přerůst v přehled. */
const MAX_AKCI = 2;

/**
 * Datum ověření, které blok smí tvrdit: nejstarší ze zobrazených akcí.
 * `checkedAt` souboru se posouvá s každou rešerší, ale akce ověřená dřív
 * by pak nesla novější datum, než jaké má doložené.
 */
function nejstarsiOvereni(akce: Veletrh[]): string {
  return akce.map((a) => a.overeno ?? OVERENO_K).sort()[0] ?? OVERENO_K;
}

function Odkazy({ a }: { a: Veletrh }) {
  return (
    <span className="block text-[14px]">
      {a.url && (
        <a href={a.url} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">
          Stránka akce ↗
        </a>
      )}
      {a.url && ' · '}
      <Link href="/veletrhy" className="font-semibold text-[#0074e4] hover:underline">
        Všechny veletrhy
      </Link>
    </span>
  );
}

function VetaDalsich({ pocet }: { pocet: number }) {
  const slovo = pocet === 1 ? 'jedna akce' : pocet <= 4 ? 'akce' : 'akcí';
  return (
    <p className="text-[14px] text-slate-600">
      Ve městě se v sezóně koná ještě {pocet === 1 ? slovo : `${pocet} ${slovo}`} — úplný přehled
      je na stránce <Link href="/veletrhy" className="font-semibold text-[#0074e4] hover:underline">Veletrhy</Link>.
    </p>
  );
}

export function VeletrhUpoutavka({
  obec,
  variant,
  ke,
  className = '',
}: {
  obec: string;
  variant: 'skola' | 'obor';
  /** Čas čtení; předává ho test, produkce volá bez něj. */
  ke?: Date;
  /** Odsazení karty od okolí; bez akce se nevykreslí ani ono. Jen varianta skola. */
  className?: string;
}) {
  const vse = akceProObec(obec, ke);
  if (vse.length === 0) return null;
  const akce = vse.slice(0, MAX_AKCI);
  // Skrývá se podle poslední zobrazené akce; kdyby ve městě běžela delší
  // nezobrazená akce, do hodiny ji stejně doplní revalidace stránky.
  const doKonce = akce.map((a) => (a.end ?? a.start)!).sort().at(-1)!;

  if (variant === 'obor') {
    return (
      <VeletrhSkryvani doKonce={doKonce}>
        {akce.map((a) => (
          <li key={a.id}>
            <b className="text-[#16325c]">{a.nazev}</b> — {a.datum}
            {a.cas ? `, ${a.cas}` : ''}, {a.misto}. Za odpoledne porovnáte školy z kraje
            na jednom místě; účast této školy mezi vystavovateli nemáme doloženou.
            {a.poznamkaTerminu && <> {a.poznamkaTerminu}</>}
            <Odkazy a={a} />
          </li>
        ))}
        {vse.length > MAX_AKCI && (
          <li>
            <VetaDalsich pocet={vse.length - MAX_AKCI} />
          </li>
        )}
      </VeletrhSkryvani>
    );
  }

  return (
    <VeletrhSkryvani doKonce={doKonce}>
      <div className={`space-y-3 rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec] ${className}`.trim()}>
        {/* „ve městě Příbram“: jméno města zůstává v 1. pádě, tvar
            „v Příbrami“ by potřeboval skloňovat všech 87 měst zdroje. */}
        <h3 className="text-[19px] font-bold text-[#16325c]">
          {akce.length === 1 ? 'Veletrh středních škol' : 'Veletrhy středních škol'} ve městě {obec}
        </h3>
        {akce.map((a) => (
          <div key={a.id} className="space-y-1">
            <p className="text-[16px]">
              <b className="text-[#16325c]">{a.nazev}</b>
            </p>
            <p className="text-[15px] text-slate-700">
              <b>{a.datum}</b>
              {a.cas ? `, ${a.cas}` : ''} · {a.misto}
            </p>
            {a.poznamkaTerminu && <p className="text-[14px] text-slate-600">{a.poznamkaTerminu}</p>}
            <Odkazy a={a} />
          </div>
        ))}
        <p className="text-[15px] leading-relaxed text-slate-600">
          Za jedno odpoledne tam porovnáte desítky škol z kraje, které byste jinak objížděli
          po jedné. Účast této školy mezi vystavovateli nemáme doloženou.
        </p>
        {vse.length > MAX_AKCI && <VetaDalsich pocet={vse.length - MAX_AKCI} />}
        <p className="text-[13px] leading-relaxed text-slate-500">
          Termín ověřen {formatujDen(nejstarsiOvereni(akce))} na webu pořadatele — pořádá akci on,
          ne tento web.
        </p>
      </div>
    </VeletrhSkryvani>
  );
}
