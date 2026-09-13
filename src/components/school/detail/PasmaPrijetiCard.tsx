import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';
import { MIN_PRIJATYCH_PRO_HRANICI } from '@/lib/pasma-prijeti';
import { cislo, tvar } from '@/lib/cesky-tvar';

interface PasmaPrijetiCardProps {
  data: PasmaPrijetiObor | null;
  /** Rok dat o uchazečích z registru stavu datových sad, sada cermat-uchazeci-kolo1. */
  rok: number;
  /** Rok nabídky z registru, sada cermat-prihlasky. */
  rokNabidky: number;
  /** Nabídka je vypsaná v 1. kole roku nabídky. Bez ní se při chybějících datech nic nezobrazí. */
  vypsana?: boolean;
  /** Nabídka je v roce nabídky nová, například nové zaměření existujícího oboru. */
  nova?: boolean;
}



/**
 * Verdikt o tom, co o přijetí rozhodlo. Zobrazuje se věta, nikdy hodnota:
 * plocha pod ROC křivkou je pro čtenáře nesrozumitelná a projekt ji už jednou
 * popsal špatně.
 */
function vetaOTom(rozhodl: number): string {
  if (rozhodl >= 0.97) return 'O přijetí rozhodoval hlavně výsledek testu, pořadí podle něj odpovídalo výsledku přijímání.';
  if (rozhodl >= 0.85) return 'Rozhodoval hlavně výsledek testu, ale kritéria školy s pořadím znatelně hýbala.';
  return 'O přijetí rozhodlo z velké části něco jiného než test. Bez kritérií školy se odhadnout nedá nic.';
}

function Obal({ children }: { children: React.ReactNode }) {
  return (
    <section className="my-6 rounded-xl bg-white p-6">
      <h2 className="font-semibold text-lg">Jak to dopadlo loni</h2>
      {children}
    </section>
  );
}

/** Upozornění, která mění výklad všech čísel pod nimi, proto stojí nahoře. */
function Upozorneni({ data, nova, rok, rokNabidky }: { data: PasmaPrijetiObor; nova?: boolean; rok: number; rokNabidky: number }) {
  if (!data.vice_zamereni && !nova) return null;
  return (
    <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {nova && (
        <p>
          Tuto nabídku vedeme v roce {rokNabidky} jako novou. Údaje níže popisují celý obor školy
          v roce {rok}, tedy dobu před jejím vypsáním.
        </p>
      )}
      {data.vice_zamereni && !nova && (
        <p>
          Údaje platí za celý obor školy, protože zdroj jednotlivá zaměření nerozlišuje.
          Stejná čísla proto uvidíte i u ostatních zaměření tohoto oboru.
        </p>
      )}
    </div>
  );
}

export function PasmaPrijetiCard({ data, rok, rokNabidky, vypsana, nova }: PasmaPrijetiCardProps) {
  if (!data) {
    // Mlčet by šlo, ale rodič by nepoznal, zda údaj chybí, nebo jsme na něj zapomněli.
    if (!vypsana) return null;
    return (
      <Obal>
        <p className="mt-2 text-slate-700">
          Za 1. kolo {rok} nemáme o uchazečích o tento obor údaje, takže nelze ukázat,
          s jakým výsledkem se sem loni dostávali.
        </p>
      </Obal>
    );
  }

  // Bez odmítnutých kvůli kapacitě nemá hranice ani tabulka co rozlišovat.
  if (data.nikdo_neodmitnut_pro_kapacitu) {
    return (
      <Obal>
        <Upozorneni data={data} nova={nova} rok={rok} rokNabidky={rokNabidky} />
        <p className="mt-3 text-slate-700">
          V roce {rok} se na tento obor <strong>nikdo nevešel kvůli kapacitě</strong>.
          {data.nesplnilo_podminky > 0 && (
            <> Neznamená to, že se dostali všichni: {cislo(data.nesplnilo_podminky)}{' '}
            {tvar(data.nesplnilo_podminky, 'uchazeč nesplnil', 'uchazeči nesplnili', 'uchazečů nesplnilo')}{' '}
            podmínky školy, tedy jiné kritérium než výsledek testu.</>
          )}
        </p>
      </Obal>
    );
  }

  // Pod deseti přijatými je nejnižší výsledek údaj o jednom uchazeči, ne o oboru.
  const hraniceSmysl = data.prijatych >= MIN_PRIJATYCH_PRO_HRANICI;
  const lo = data.pasmo_nejistoty?.[0] ?? data.min_prijaty;
  const hi = data.pasmo_nejistoty?.[1];
  // Přesné počty z generátoru; součet pětibodových pásem by zahrnul i uchazeče mimo rozmezí.
  const soutezilo = data.pasmo_nejistoty_soutezilo ?? 0;
  const prijato = data.pasmo_nejistoty_prijato ?? 0;
  const maPasma = !!data.pasma && data.pasma.length > 0;

  // Není co ukázat: málo přijatých a žádná tabulka.
  if (!hraniceSmysl && !maPasma) return null;

  return (
    <Obal>
      <p className="mt-1 text-sm text-slate-500">
        Výsledky jednotné zkoušky uchazečů o tento obor v 1. kole přijímacího řízení {rok}.
        Body jsou součet češtiny a matematiky, každá za nejvýš 50 bodů, a to lepší z obou
        pokusů. U upravených testů se procentní výsledek s body přesně neshoduje.
      </p>

      <Upozorneni data={data} nova={nova} rok={rok} rokNabidky={rokNabidky} />

      {hraniceSmysl ? (
        <ul className="mt-4 space-y-2 text-slate-800">
          <li>
            Pod <strong>{cislo(lo)} bodů</strong> se nedostal nikdo.
            <span className="text-slate-500"> Stejně nebo méně bodů mělo {Math.round(data.min_prijaty_percentil)} ze 100 uchazečů v celé zemi.</span>
          </li>
          {hi !== undefined && hi > lo && (
            <>
              <li>Nad <strong>{cislo(hi)} bodů</strong> se dostali všichni.</li>
              <li>
                Mezi {cislo(lo)} a {cislo(hi)} body rozhodovala i další kritéria
                {soutezilo > 0 && (
                  <>; z {cislo(soutezilo)} {tvar(soutezilo, 'uchazeče', 'uchazečů', 'uchazečů')} v tomto
                  rozmezí {tvar(prijato, 'se dostal', 'se dostali', 'se dostalo')} {cislo(prijato)}</>
                )}.
              </li>
            </>
          )}
          {hi !== undefined && hi === lo && (
            <li>
              Nad {cislo(lo)} bodů se dostali všichni. Přesně s {cislo(lo)} body
              se někdo dostal a někdo ne, rozhodla další kritéria školy.
            </li>
          )}
          {hi !== undefined && hi < lo && (
            <li>Nad {cislo(hi)} bodů se dostali všichni; mezi {cislo(hi)} a {cislo(lo)} body nebyl nikdo.</li>
          )}
        </ul>
      ) : (
        <p className="mt-4 text-slate-700">
          Přijatých bylo jen {cislo(data.prijatych)}, takže nejnižší výsledek by byl údajem
          o jednom uchazeči, ne o oboru. Neuvádíme ho.
        </p>
      )}

      {data.talentova_zkouska ? (
        <p className="mt-4 text-slate-700">
          U tohoto oboru rozhoduje o přijetí i talentová zkouška, o které údaje nemáme.
          Výsledek jednotné zkoušky proto šanci na přijetí popisuje jen zčásti.
        </p>
      ) : data.rozhodl_test !== undefined && (
        <p className="mt-4 text-slate-700">{vetaOTom(data.rozhodl_test)}</p>
      )}

      <p className="mt-4 text-sm text-slate-500">
        Hranice se mezi ročníky posouvá o jednotky bodů; mění se totiž i obtížnost samotné
        zkoušky, ne jen zájem o školu. Čísla popisují jen 1. kolo roku {rok}, nikoli druhé
        kolo, a nejsou předpovědí.
      </p>

      {(data.prijato_na_vyssi_prioritu > 0 || data.nesplnilo_podminky > 0) && (
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          {data.prijato_na_vyssi_prioritu > 0 && (
            <li>
              Nejsou tu započítáni uchazeči, kteří byli přijati na obor uvedený na přihlášce
              výš, a o toto místo proto už nesoutěžili. Loni {tvar(data.prijato_na_vyssi_prioritu, 'to byl', 'to byli', 'jich bylo')}{' '}
              {cislo(data.prijato_na_vyssi_prioritu)} a mívají lepší výsledky než ostatní.
            </li>
          )}
          {data.nesplnilo_podminky > 0 && (
            <li>
              {tvar(data.nesplnilo_podminky, 'Další', 'Další', 'Dalších')} {cislo(data.nesplnilo_podminky)}{' '}
              {tvar(data.nesplnilo_podminky, 'uchazeč nesplnil', 'uchazeči nesplnili', 'uchazečů nesplnilo')}{' '}
              podmínky školy, tedy jiné kritérium než výsledek testu. Do počtů výše nevstupují.
            </li>
          )}
        </ul>
      )}

      {maPasma && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Podrobné rozdělení podle výsledku
          </summary>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th scope="col" className="py-1 font-medium">Výsledek</th>
                <th scope="col" className="py-1 text-right font-medium">Přijato ze soutěžících</th>
              </tr>
            </thead>
            <tbody>
              {data.pasma!.map(p => (
                <tr key={p.od} className="border-t border-slate-100">
                  <th scope="row" className="py-1.5 font-normal">
                    {cislo(p.od)} až {cislo(p.do)} bodů
                  </th>
                  <td className="py-1.5 text-right tabular-nums">
                    {cislo(p.prijato)} z {cislo(p.soutezilo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            Soutěžící jsou přijatí a ti, kdo se nevešli kvůli kapacitě. Pásmo s méně než pěti
            uchazeči je sloučené se sousedním, proto nejsou všechna stejně široká.
          </p>
        </details>
      )}
    </Obal>
  );
}
