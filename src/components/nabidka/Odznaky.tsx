import {
  cislo, zOd, KOHORTA_POPISEK, KOHORTA_VETA, ZARAZENI_POPISEK,
  type KohortaPozice, type ZarazeniObtiznosti,
} from '@/lib/obor-profil';

/**
 * Odznaky nabídky sdílené přehledy města a kraje (docs/navrh-stranky-kraje-2027.md, oddíl 4.3),
 * aby rodina na obou stránkách viděla totéž v téže podobě.
 */

/**
 * Odstíny jedné barvy od nejtěžšího po nejsnazší. Záměrně **není semafor**:
 * obor, kam se dostal každý, není horší škola, jen jiná poptávka. Stupeň nese
 * slovo, odstín jen napovídá pořadí.
 */
export const ODSTIN_OBTIZNOSTI: Record<ZarazeniObtiznosti, string> = {
  velmi_tezke: 'bg-slate-800 text-white',
  tezke: 'bg-slate-600 text-white',
  stredne_tezke: 'bg-slate-400 text-white',
  vetsina_uspela: 'bg-slate-200 text-slate-800',
  kapacita_nerozhodovala: 'bg-slate-100 text-slate-700',
};

/** Odznak obtížnosti přijetí. V tabulce stačí krátký popisek (slovník pojmů). */
export function OdznakObtiznosti({ zarazeni }: { zarazeni: ZarazeniObtiznosti | null }) {
  if (!zarazeni) {
    return <span className="text-[12px] text-slate-500">bez údaje</span>;
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${ODSTIN_OBTIZNOSTI[zarazeni]}`}
    >
      {ZARAZENI_POPISEK[zarazeni]}
    </span>
  );
}

/**
 * Odznak kohorty podle pozice na přihlášce. Obrys místo výplně a jiný odstín než obtížnost,
 * aby se dva údaje nečetly jako jedna stupnice; **žádná červená** (slovník: neříká nic o kvalitě).
 */
export function OdznakKohorty({ kohorta }: { kohorta: KohortaPozice | null }) {
  if (!kohorta) return null;
  return (
    <span
      title={KOHORTA_VETA[kohorta]}
      className="inline-block whitespace-nowrap rounded-full border border-[#0074e4]/40 bg-[#eef5fd] px-2.5 py-0.5 text-[12px] font-medium text-[#16325c]"
    >
      {KOHORTA_POPISEK[kohorta]}
    </span>
  );
}

/** Minimum údajů pro doprovodnou větu k odznaku obtížnosti. */
export interface UdajeObtiznosti {
  zarazeni: ZarazeniObtiznosti | null;
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  predchoziRok: number | null;
  soutezici: number | null;
  prijati: number | null;
  prihlasky: number | null;
  nesplniliPodminky: number | null;
}

/**
 * Doprovodná věta k odznaku: podíl přijatých, předchozí ročník a nesplněné
 * podmínky školy.
 *
 * Předchozí ročník se vypisuje i tam, kde kapacita nerozhodovala — jinak by
 * u 226 nabídek zmizela doložená změna obtížnosti. Nesplněné podmínky se
 * uvádějí, kdykoli dosáhnou počtu přijatých nebo 20 % přihlášek: bez nich
 * „místo pro všechny“ zamlčí, že hlavní překážkou byly požadavky školy
 * (slovník ukazatelů, obtížnost přijetí slovy).
 */
export function VetaObtiznosti({ u }: { u: UdajeObtiznosti }) {
  const casti: string[] = [];

  if (u.soutezici !== null && u.prijati !== null && u.zarazeni !== 'kapacita_nerozhodovala') {
    casti.push(`přijato ${cislo(u.prijati)} ${zOd(u.soutezici)} ${cislo(u.soutezici)}`);
  }

  if (u.zarazeniPredchozi && u.predchoziRok) {
    casti.push(`v roce ${u.predchoziRok} ${ZARAZENI_POPISEK[u.zarazeniPredchozi]}`);
  }

  const nesplnili = u.nesplniliPodminky;
  if (nesplnili !== null && nesplnili > 0 && u.prihlasky
      && (nesplnili >= (u.prijati ?? 0) || nesplnili >= 0.2 * u.prihlasky)) {
    casti.push(`${cislo(nesplnili)} ${zOd(u.prihlasky)} ${cislo(u.prihlasky)} přihlášených nedosáhlo požadavků školy`);
  }

  if (casti.length === 0) return null;
  return <span className="text-[12px] text-slate-500">{casti.join(' · ')}</span>;
}
