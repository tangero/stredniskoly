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

type ZaznamViditelnosti = { isIntersecting: boolean; intersectionRatio: number; intersectionRect: { height: number } };

/** Oddíl je dost vidět, když z něj je vidět polovina, nebo když zabírá aspoň polovinu výšky okna (vysoký oddíl). */
export function dostatecneVidet(z: ZaznamViditelnosti, vyskaOkna: number): boolean {
  return z.isIntersecting && (z.intersectionRatio >= PRAH_PODILU || z.intersectionRect.height >= vyskaOkna * PRAH_PODILU - 1);
}

/** Prahy pozorovatele: čtvrtiny a podíl prvku, při kterém zabírá polovinu okna (u prvku vyššího než půl okna). */
export function prahyPozorovani(vyskaPrvku: number, vyskaOkna: number): number[] {
  const prahy = [0, 0.25, 0.5, 0.75, 1];
  if (vyskaPrvku > 0) {
    const podil = (vyskaOkna * PRAH_PODILU) / vyskaPrvku;
    if (podil > 0 && podil < 1) prahy.push(podil, Math.min(1, podil + 0.001));
  }
  return prahy.sort((a, b) => a - b);
}

/**
 * Pošle `naVidet(id)` jednou za oddíl, který je dost vidět nepřetržitě `PRAH_VIDITELNOSTI_MS`.
 * Každý prvek má vlastního pozorovatele s prahy podle své výšky, aby se vysoký oddíl vyhodnotil
 * i tehdy, když jeho podíl nepřekročí 0,5. Vrací funkci, která pozorování ukončí.
 */
export function sledujViditelnost(prvky: Element[], naVidet: (id: string) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const videno = new Set<string>();
  const casovace = new Map<Element, ReturnType<typeof setTimeout>>();
  const pozorovatele: IntersectionObserver[] = [];

  for (const prvek of prvky) {
    const io = new IntersectionObserver(zaznamy => {
      for (const z of zaznamy) {
        const id = (z.target as HTMLElement).dataset.oddil;
        if (!id || videno.has(id)) continue;
        if (dostatecneVidet(z, globalThis.innerHeight)) {
          if (casovace.has(z.target)) continue;
          casovace.set(z.target, setTimeout(() => {
            casovace.delete(z.target);
            videno.add(id);
            naVidet(id);
            io.unobserve(z.target);
          }, PRAH_VIDITELNOSTI_MS));
        } else if (casovace.has(z.target)) {
          clearTimeout(casovace.get(z.target));
          casovace.delete(z.target);
        }
      }
    }, { threshold: prahyPozorovani(prvek.getBoundingClientRect().height, globalThis.innerHeight) });
    io.observe(prvek);
    pozorovatele.push(io);
  }

  return () => {
    casovace.forEach(t => clearTimeout(t));
    pozorovatele.forEach(io => io.disconnect());
  };
}

export type TypStranky = 'skola' | 'obor';
export type StavNabidky = 'vypsany' | 'nevypsany' | 'bez_jpz';
