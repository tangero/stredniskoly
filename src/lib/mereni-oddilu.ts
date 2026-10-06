/**
 * Měření oddílů stránek škol a oborů v Microsoft Clarity (#386).
 *
 * Identifikátor oddílu je stálý: u oddílu je to jeho `id` (`prijeti`, `vede`…), u rozbalovacího důkazu
 * `dukaz-` a nadpis bez diakritiky. Nezávisí na pořadí na stránce ani na škole, takže stejný oddíl má
 * na každé stránce stejný štítek. Do události jde jen tento identifikátor, nikdy nic o návštěvníkovi.
 */
export const PRAH_VIDITELNOSTI_MS = 3000;
export const PRAH_PODILU = 0.5;

export function idDukazu(nadpis: string): string {
  const slug = nadpis
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dukaz-${slug}`;
}

export const UDALOST_VIDET = 'oddil_videt';
export const UDALOST_ROZBALEN = 'oddil_rozbalen';

export type TypStranky = 'skola' | 'obor';
export type StavNabidky = 'vypsany' | 'nevypsany' | 'bez_jpz';
