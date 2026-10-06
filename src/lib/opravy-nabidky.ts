/**
 * Ruční opravy nabídky škol podle hlášení škol (src/data/opravy-nabidky-skol.json, issue #371).
 * Čisté funkce bez čtení souborů: data dostanou parametrem, volající je importuje.
 * Opravy s `plati_pro: '2027'` se jen ukládají pro opravu nabídky 2027; zobrazení je nečte.
 */

export type PoleOpravy = 'zamereni' | 'kapacita' | 'neotevira';

export interface OpravaNabidky {
  redizo: string;
  kkov: string;
  pole: PoleOpravy;
  hodnota: string | number | boolean | null;
  plati_pro: 'zobrazeni' | '2027';
  poznamka?: string;
  zdroj: string;
  hlaseno: string;
  issue: number;
}

/**
 * Zaměření k zobrazení. Bez opravy vrátí původní; oprava s hodnotou `null` zaměření skryje.
 * Adresy stránek se z opravy nepočítají, zůstávají podle zaměření ze zdroje.
 */
export function zobrazeneZamereni(opravy: OpravaNabidky[], redizo: string, kkov: string, zamereni: string | null | undefined): string {
  const oprava = opravy.find(o => o.pole === 'zamereni' && o.plati_pro === 'zobrazeni' && o.redizo === redizo && o.kkov === kkov);
  if (!oprava) return zamereni ?? '';
  return typeof oprava.hodnota === 'string' ? oprava.hodnota : '';
}

/** Název oboru se zaměřením po opravě: „Obor - zaměření“, nebo jen obor. */
export function nazevSZamerenim(opravy: OpravaNabidky[], redizo: string, kkov: string, obor: string, zamereni: string | null | undefined): string {
  const z = zobrazeneZamereni(opravy, redizo, kkov, zamereni);
  return z && z !== obor ? `${obor} - ${z}` : obor;
}

/** Opravy uložené pro nabídku 2027. Na webu je zatím nic nečte. */
export function opravyProNabidku2027(opravy: OpravaNabidky[]): OpravaNabidky[] {
  return opravy.filter(o => o.plati_pro === '2027');
}
