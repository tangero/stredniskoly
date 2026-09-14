import type { SkolaVOkoli } from '@/lib/skola-profil-data';

/**
 * Schéma okolí: škola uprostřed, okolní školy podle směru a vzdálenosti vzdušnou čarou.
 * Bez mapového podkladu (docs/stranka-skoly-2027.md, oddíl 5). Odmocninové měřítko,
 * aby se blízké školy nesléval do středu. Školy, kam se hlásí stejní uchazeči, nesou číslo podle počtu.
 */
interface SchemaOkoliProps {
  nazevSkoly: string;
  okoli: SkolaVOkoli[];
  poradiSoubehu: Map<string, number>;
  maxKm?: number;
}

export function SchemaOkoli({ nazevSkoly, okoli, poradiSoubehu, maxKm = 20 }: SchemaOkoliProps) {
  const C = 200, R = 178;
  const r = (km: number) => R * Math.sqrt(Math.min(km, maxKm) / maxKm);
  const bod = (km: number, smer: number) => [C + r(km) * Math.sin((smer * Math.PI) / 180), C - r(km) * Math.cos((smer * Math.PI) / 180)];
  const vSchematu = okoli.filter(s => s.km <= maxKm);
  const ostatni = vSchematu.filter(s => !poradiSoubehu.has(s.redizo));
  const soubezne = vSchematu.filter(s => poradiSoubehu.has(s.redizo)).sort((a, b) => poradiSoubehu.get(b.redizo)! - poradiSoubehu.get(a.redizo)!);
  const koruzky = [5, 10, 20].filter(k => k <= maxKm);

  return (
    <svg viewBox="0 0 400 400" className="mx-auto block h-auto w-full max-w-[440px]" role="img"
      aria-label={`Schéma okolí školy ${nazevSkoly}: ${vSchematu.length} škol s jednotnou zkouškou do ${maxKm} km vzdušnou čarou`}>
      {koruzky.map(k => (
        <g key={k}>
          <circle cx={C} cy={C} r={r(k)} fill="none" stroke="#e3e9f1" strokeWidth={1.5} />
          <text x={C + 4} y={C - r(k) + 13} fontSize={11} fill="#64748b">{k} km</text>
        </g>
      ))}
      <text x={C} y={12} fontSize={11} fontWeight={700} textAnchor="middle" fill="#64748b">S</text>
      {ostatni.map(s => {
        const [x, y] = bod(s.km, s.smer);
        return (
          <circle key={s.redizo} cx={x} cy={y} r={s.podobna ? 4 : 3} fill={s.podobna ? '#fff' : '#c3ccd6'} stroke={s.podobna ? '#64748b' : 'none'} strokeWidth={1.5}>
            <title>{`${s.nazev}, ${s.obec} · ${s.km.toLocaleString('cs-CZ')} km`}</title>
          </circle>
        );
      })}
      {soubezne.map(s => {
        const [x, y] = bod(s.km, s.smer);
        return (
          <g key={s.redizo}>
            <circle cx={x} cy={y} r={10} fill="#0074e4" stroke="#fff" strokeWidth={2}>
              <title>{`${s.nazev}, ${s.obec} · ${s.km.toLocaleString('cs-CZ')} km · ${s.soubeh} společných uchazečů`}</title>
            </circle>
            <text x={x} y={y + 3.5} fontSize={10} fontWeight={700} fill="#fff" textAnchor="middle" pointerEvents="none">{poradiSoubehu.get(s.redizo)}</text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={9} fill="#16325c" stroke="#fff" strokeWidth={3}><title>{nazevSkoly}</title></circle>
    </svg>
  );
}
