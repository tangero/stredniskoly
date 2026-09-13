import type { DruheKoloNabidky, ZaznamDruhehoKola } from '@/lib/druhe-kolo';
import { cislo, tvar } from '@/lib/cesky-tvar';

interface DruheKoloCardProps {
  data: DruheKoloNabidky | null;
}

const mist = (n: number) => `${cislo(n)} ${tvar(n, 'místo', 'místa', 'míst')}`;

/** Věta o předchozím roce: pomáhá odhadnout, zda se 2. kolo opakuje, ale nic neslibuje. */
function vetaOPredchozimRoce(rok: number, predchozi: ZaznamDruhehoKola | null, letos: ZaznamDruhehoKola): string | null {
  if (!predchozi) return null;
  const vypsanoLetos = letos.stav === 'vypsano';
  if (predchozi.stav === 'vypsano') {
    return `V roce ${rok - 1} škola 2. kolo ${vypsanoLetos ? 'vypsala také' : 'vypsala'}: ${mist(predchozi.kapacita)}, přijato ${cislo(predchozi.prijati)}.`;
  }
  return `V roce ${rok - 1} škola 2. kolo ${vypsanoLetos ? 'nevypsala' : 'také nevypsala'}.`;
}

export function DruheKoloCard({ data }: DruheKoloCardProps) {
  if (!data) return null;
  const { rok, zaznam, predchozi } = data;
  const predchoziVeta = vetaOPredchozimRoce(rok, predchozi, zaznam);

  return (
    <section className="my-6 rounded-xl bg-white p-6">
      <h2 className="font-semibold text-lg">Druhé kolo · {rok}</h2>

      {zaznam.stav === 'vypsano' && (
        <div className="mt-3 space-y-2 text-slate-800">
          {zaznam.prihlasky === 0 ? (
            <p>Ve 2. kole škola vypsala {mist(zaznam.kapacita)}, ale nikdo se nepřihlásil.</p>
          ) : (
            <p>
              Ve 2. kole škola vypsala <strong>{mist(zaznam.kapacita)}</strong>. Přišlo{' '}
              {cislo(zaznam.prihlasky)} {tvar(zaznam.prihlasky, 'přihláška', 'přihlášky', 'přihlášek')} a{' '}
              {tvar(zaznam.prijati, 'přijat byl', 'přijati byli', 'přijato bylo')} <strong>{cislo(zaznam.prijati)}</strong>.
            </p>
          )}
          {zaznam.neveslo_se > 0 ? (
            <p>
              {cislo(zaznam.neveslo_se)} {tvar(zaznam.neveslo_se, 'uchazeč se nevešel', 'uchazeči se nevešli', 'uchazečů se nevešlo')}{' '}
              ani ve 2. kole, takže ani to není jistota.
            </p>
          ) : zaznam.prihlasky > 0 && zaznam.prijati >= zaznam.kapacita ? (
            <p>Místa ve 2. kole se zaplnila.</p>
          ) : null}
          {zaznam.min_prijaty !== undefined && (
            <p>Nejslabší přijatý ve 2. kole měl {cislo(zaznam.min_prijaty)} bodů ze 100.</p>
          )}
        </div>
      )}

      {zaznam.stav === 'nenaplneno_bez_2_kola' && (
        <p className="mt-3 text-slate-800">
          V 1. kole škola přijala {cislo(zaznam.kolo1_prijati)} {tvar(zaznam.kolo1_prijati, 'uchazeče', 'uchazeče', 'uchazečů')} na{' '}
          {mist(zaznam.kolo1_kapacita)}, a přesto 2. kolo nevypsala. <strong>Volná místa po 1. kole neznamenají,
          že 2. kolo bude.</strong>
        </p>
      )}

      {zaznam.stav === 'bez_2_kola' && (
        <p className="mt-3 text-slate-800">Obor se naplnil v 1. kole a 2. kolo škola nevypsala.</p>
      )}

      {predchoziVeta && <p className="mt-3 text-slate-700">{predchoziVeta}</p>}

      <p className="mt-4 text-sm text-slate-500">
        Čísla popisují denní studium. Druhé kolo škola vypisuje podle volných míst a nemusí se opakovat;
        čísla nejsou předpovědí pro další rok.
      </p>
    </section>
  );
}
