/**
 * Výběr zvažovaných oborů: jedno úložiště pro celý web.
 *
 * Ukládá se **nabídka, ne škola** (docs/stranka-skoly-2027.md, oddíl 3), pod stejným klíčem
 * a se stejnými identifikátory jako simulátor, aby jeden výběr platil na obou místech
 * (docs/grafy-skoly-a-oboru-2027.md, oddíl 4.3, krok V1).
 *
 * Čte se přes `useSyncExternalStore`, proto se vrací surový řetězec z úložiště: hook porovnává
 * snímky identitou a nové pole při každém volání by vedlo k nekonečnému překreslování.
 * Na serveru vrací snímek `null`, což znamená „výběr ještě neznáme“ a odlišuje se od prázdného.
 */
// Relativní cesta s příponou, ne alias `@/`: testy v tests/ běží v Node, který alias nerozloží
// ani nedoplní příponu. tsconfig má `allowImportingTsExtensions`, takže zápis platí i pro build.
import { readSelection } from './simulator-state.ts';

export const KLIC_VYBERU = 'prijimacky-vyber-2027';
export const UDALOST_VYBERU = 'prijimacky-vyber-zmena';

/** Vlastní událost chytí změnu v téže záložce, `storage` v ostatních. */
export function odebiratVyber(zmena: () => void) {
  window.addEventListener('storage', zmena);
  window.addEventListener(UDALOST_VYBERU, zmena);
  return () => {
    window.removeEventListener('storage', zmena);
    window.removeEventListener(UDALOST_VYBERU, zmena);
  };
}

export function ctiSurovyVyber(): string {
  try {
    return localStorage.getItem(KLIC_VYBERU) ?? '';
  } catch {
    return '';
  }
}

/** Snímek na serveru: výběr žije jen v prohlížeči, takže se při vykreslení ještě nezná. */
export function bezVyberu(): null {
  return null;
}

export function zvazovaneObory(surovy: string | null): string[] {
  return readSelection(surovy || null);
}

/** Počet zvažovaných oborů, nebo null, dokud se výběr nenačte v prohlížeči. */
export function pocetZvazovanych(surovy: string | null): number | null {
  return surovy === null ? null : zvazovaneObory(surovy).length;
}
