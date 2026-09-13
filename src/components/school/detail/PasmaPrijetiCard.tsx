import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';

interface PasmaPrijetiCardProps {
  data: PasmaPrijetiObor | null;
  /** Zobrazí se jen u nabídek, které škola letos vypsala. */
  nazevOboru?: string;
}

const cislo = (v: number) => v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });

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

export function PasmaPrijetiCard({ data, nazevOboru }: PasmaPrijetiCardProps) {
  if (!data) return null;

  // Bez odmítnutých kvůli kapacitě nemá hranice ani tabulka co rozlišovat.
  if (data.nikdo_neodmitnut_pro_kapacitu) {
    return (
      <section className="my-6 rounded-xl bg-white p-6">
        <h2 className="font-semibold text-lg">Jak to dopadlo loni</h2>
        <p className="mt-2 text-slate-700">
          V roce 2025 se na tento obor <strong>nikdo nevešel kvůli kapacitě</strong>.
          {data.nesplnilo_podminky > 0 && (
            <> Neznamená to, že se dostali všichni: {cislo(data.nesplnilo_podminky)} uchazečů
            nesplnilo podmínky školy, tedy jiné kritérium než výsledek testu.</>
          )}
        </p>
      </section>
    );
  }

  const lo = data.pasmo_nejistoty?.[0] ?? data.min_prijaty;
  const hi = data.pasmo_nejistoty?.[1];
  const vPasmu = data.pasma
    ? data.pasma.filter(p => hi !== undefined && p.od < hi && p.do > lo)
    : [];
  const soutezilo = vPasmu.reduce((s, p) => s + p.soutezilo, 0);
  const prijato = vPasmu.reduce((s, p) => s + p.prijato, 0);

  return (
    <section className="my-6 rounded-xl bg-white p-6">
      <h2 className="font-semibold text-lg">
        Jak to dopadlo loni{nazevOboru ? ` · ${nazevOboru}` : ''}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Výsledky jednotné zkoušky uchazečů o tento obor v 1. kole 2025, na škále 0 až 100 bodů
        za češtinu a matematiku dohromady.
      </p>

      <ul className="mt-4 space-y-2 text-slate-800">
        <li>
          Pod <strong>{cislo(lo)} bodů</strong> se nedostal nikdo.
          <span className="text-slate-500"> To je víc než u {Math.round(data.min_prijaty_percentil)} ze 100 uchazečů v celé zemi.</span>
        </li>
        {hi !== undefined && hi > lo && (
          <>
            <li>Nad <strong>{cislo(hi)} bodů</strong> se dostali všichni.</li>
            <li>
              Mezi {cislo(lo)} a {cislo(hi)} body rozhodovala i další kritéria
              {soutezilo > 0 && <>; z {cislo(soutezilo)} uchazečů v tomto rozmezí se dostalo {cislo(prijato)}</>}.
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

      {data.rozhodl_test !== undefined && !data.talentova_zkouska && (
        <p className="mt-4 text-slate-700">{vetaOTom(data.rozhodl_test)}</p>
      )}

      <p className="mt-4 text-sm text-slate-500">
        Hranice se mezi ročníky posouvá o jednotky bodů; mění se totiž i obtížnost samotné
        zkoušky, ne jen zájem o školu. Čísla popisují rok 2025 a nejsou předpovědí.
      </p>

      {(data.vice_zamereni || data.nastoupilo_jinam > 0 || data.nesplnilo_podminky > 0) && (
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          {data.vice_zamereni && (
            <li>Údaje platí za celý obor školy, protože zdroj jednotlivá zaměření nerozlišuje.</li>
          )}
          {data.nastoupilo_jinam > 0 && (
            <li>
              Nejsou tu započítáni uchazeči, kteří se sem dostali, ale nastoupili na obor
              uvedený na přihlášce výš. Loni jich bylo {cislo(data.nastoupilo_jinam)} a mívají
              lepší výsledky než ostatní.
            </li>
          )}
          {data.nesplnilo_podminky > 0 && (
            <li>
              Dalších {cislo(data.nesplnilo_podminky)} uchazečů nesplnilo podmínky školy,
              tedy jiné kritérium než výsledek testu. Ti do počtů výše nevstupují.
            </li>
          )}
        </ul>
      )}

      {data.pasma && data.pasma.length > 0 && (
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
              {data.pasma.map(p => (
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
    </section>
  );
}
