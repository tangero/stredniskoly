'use client';

import mapa from '@/data/mapa-kraju.json';
import { nadpisKraje } from '@/lib/kraje.mjs';
import { akci } from '@/lib/veletrhy-pocty';

/**
 * Mapa krajů nad čipy na /veletrhy (docs/navrh-mapa-a-odkazy-veletrhu-2027.md).
 *
 * Je to druhá podoba téhož ovladače, ne nový: výběr kraje i najetí sdílí
 * s čipy přes stav v `VeletrhySeznam`. Pro čtečku a klávesnici je skrytá
 * (`aria-hidden`) a její kraje nejsou v pořadí tabulátoru — čipy nesou
 * tentýž název i počet, a tabulátor by jinak prošel 28 zastávek, než
 * dojde k první akci.
 *
 * Všechny kraje mají stejnou výplň. Počet akcí říká, o kolika víme, ne
 * kolik se jich koná (slovník ukazatelů 6a); sytost barvy podle počtu by
 * vydávala mezeru v rešerši za skutečnost.
 */

type KrajMapy = { kod: string; d: string; stitek: [number, number] };
const KRAJE = mapa.kraje as KrajMapy[];
const [SIRKA, VYSKA] = mapa.viewBox as [number, number];

/**
 * Praha má 0,6 % plochy republiky; na mobilu (šířka mapy 343 px, tedy
 * 0,343 px na jednotku) by měřila asi 17 × 14 px. Kruh o poloměru 65
 * jednotek dá tamtéž dotykovou plochu přes 44 px, doporučené minimum.
 */
const PRAHA = 'CZ010';
export const POLOMER_ZASAHU_PRAHY = 65;

const BARVA = {
  vychozi: '#e8eef6',
  bezAkci: '#f5f7fa',
  najeti: '#dbeafe',
  vybrany: '#1d4ed8',
};

interface Props {
  /** Počet akcí podle kódu kraje; kraj bez akcí v mapě chybí nebo má 0. */
  pocty: Map<string, number>;
  vybrany: string;
  najety: string;
  onVyber: (kod: string) => void;
  onNajeti: (kod: string) => void;
}

export function MapaKraju({ pocty, vybrany, najety, onVyber, onNajeti }: Props) {
  // Opakovaný klik na vybraný kraj výběr zruší, stejně jako u čipu.
  const klik = (kod: string) => onVyber(vybrany === kod ? '' : kod);

  const vypln = (kod: string) => {
    if (kod === vybrany) return BARVA.vybrany;
    if (kod === najety) return BARVA.najeti;
    return (pocty.get(kod) ?? 0) > 0 ? BARVA.vychozi : BARVA.bezAkci;
  };

  const bublina = (kod: string) => {
    const n = pocty.get(kod) ?? 0;
    return n > 0 ? `${nadpisKraje(kod)}: ${akci(n)} s potvrzeným termínem` : `${nadpisKraje(kod)}: teď o žádné akci nevíme`;
  };

  // Praha se kreslí nakonec: leží uvnitř Středočeského a jeho plocha by
  // jinak její obrys i zásahový kruh překryla.
  const poradi = [...KRAJE].sort((a, b) => Number(a.kod === PRAHA) - Number(b.kod === PRAHA));

  return (
    <svg
      viewBox={`0 0 ${SIRKA} ${VYSKA}`}
      className="h-auto w-full select-none"
      aria-hidden="true"
      data-mapa-kraju=""
      onMouseLeave={() => onNajeti('')}
    >
      {poradi.map((k) => (
        <g
          key={k.kod}
          data-mapa-kraj={k.kod}
          className="cursor-pointer"
          onClick={() => klik(k.kod)}
          onMouseEnter={() => onNajeti(k.kod)}
        >
          <title>{bublina(k.kod)}</title>
          <path
            d={k.d}
            fill={vypln(k.kod)}
            stroke={k.kod === vybrany || k.kod === najety ? '#1e3a8a' : '#ffffff'}
            strokeWidth={k.kod === vybrany || k.kod === najety ? 2.5 : 1.5}
            strokeLinejoin="round"
            className="transition-colors"
          />
          {k.kod === PRAHA && (
            <circle
              cx={k.stitek[0]}
              cy={k.stitek[1]}
              r={POLOMER_ZASAHU_PRAHY}
              fill="transparent"
              data-zasah-prahy=""
            />
          )}
        </g>
      ))}
      {/* Štítky až nad všemi plochami a bez zásahu myši: jinak by štítek
          Středočeského kraje zakrýval kus plochy a klik by nedošel. */}
      <g pointerEvents="none">
        {KRAJE.map((k) => {
          const n = pocty.get(k.kod) ?? 0;
          if (n === 0) return null;
          const aktivni = k.kod === vybrany;
          return (
            <g key={k.kod} data-stitek={k.kod}>
              <circle cx={k.stitek[0]} cy={k.stitek[1]} r={28} fill={aktivni ? '#ffffff' : '#1d4ed8'} />
              <text
                x={k.stitek[0]}
                y={k.stitek[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={30}
                fontWeight={700}
                fill={aktivni ? '#1d4ed8' : '#ffffff'}
              >
                {n}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
