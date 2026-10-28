/**
 * Ruční opravy nabídky škol podle hlášení škol (src/data/opravy-nabidky-skol.json, issue #371).
 * Čisté funkce bez čtení souborů: data dostanou parametrem, volající je importuje.
 * Opravy s `plati_pro: '2027'` se jen ukládají pro opravu nabídky 2027; zobrazení je nečte.
 */

export type PoleOpravy = 'zamereni' | 'kapacita' | 'neotevira' | 'obor_doplneny';

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
  /** Jen u `obor_doplneny`: název a forma oboru, který škola doplnila do nabídky 2027. */
  nazev?: string;
  forma?: string;
  /** Jen u `obor_doplneny`: adresa dokladu (karta DiPSy, web školy). */
  zdroj_adresa?: string;
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

/**
 * Obory, které škola doplnila do nabídky 2027. Uchovávají se, na webu se nečtou
 * (veřejná stránka ukazuje jen obory z oficiálních dat, issue #541).
 */
export function oboryDoplneneSkolou2027(opravy: OpravaNabidky[]): OpravaNabidky[] {
  return opravy.filter(o => o.pole === 'obor_doplneny' && o.plati_pro === '2027');
}

/**
 * Chyby záznamu `obor_doplneny`: musí mít KKOV, název, formu, zdroj s adresou a datum hlášení.
 * Z hlášení samotného bez zdroje záznam nevzniká.
 */
export function chybyDoplnenehoOboru(o: OpravaNabidky): string[] {
  const chyby: string[] = [];
  if (o.pole !== 'obor_doplneny') return chyby;
  if (o.plati_pro !== '2027') chyby.push('plati_pro musí odpovídat nabídce, do které se obor doplňuje');
  if (!/^\d{9}$/.test(o.redizo ?? '')) chyby.push('chybí RED IZO');
  if (!/^\d{2}-\d{2}-[A-Z]\/\d{2}$/.test(o.kkov ?? '')) chyby.push('chybí KKOV');
  if (!o.nazev?.trim()) chyby.push('chybí název');
  if (!o.forma?.trim()) chyby.push('chybí forma');
  if (!o.zdroj?.trim()) chyby.push('chybí zdroj');
  if (!/^https?:\/\/\S+$/.test(o.zdroj_adresa ?? '')) chyby.push('chybí adresa zdroje');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.hlaseno ?? '')) chyby.push('chybí datum hlášení');
  return chyby;
}
