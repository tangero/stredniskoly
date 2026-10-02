/**
 * Je shrnutí inspekce aktuální? Seznam inspekcí ČŠI (`csi_inspections.json`) se obnovuje
 * týdně, strojová shrnutí zpráv (`inspection_extractions.json`) ručně. Když ČŠI eviduje
 * inspekci novější než tu, ze které je shrnutí, stránka to musí říct, aby rodič nebral staré
 * hodnocení za aktuální (issue #259). Čistá funkce bez přístupu k souborům.
 */
import type { CSISchoolData } from '@/types/school';

export interface NovejsiInspekce {
  /** Začátek novější inspekce, RRRR-MM-DD. */
  datum: string;
  /** Odkaz na zprávu ČŠI, pokud ji seznam uvádí. */
  reportUrl: string | null;
}

/**
 * Nejnovější inspekce ze seznamu ČŠI, pokud začala později než inspekce, ze které je shrnutí.
 * `datumShrnuti` je začátek shrnuté inspekce (RRRR-MM-DD). Bez shrnutí nebo bez seznamu null.
 */
export function novejsiInspekce(seznam: CSISchoolData | null | undefined, datumShrnuti: string | null | undefined): NovejsiInspekce | null {
  if (!seznam || !datumShrnuti) return null;
  const nejnovejsi = [...seznam.inspections]
    .filter(i => i.dateFrom)
    .sort((a, b) => b.dateFrom.localeCompare(a.dateFrom))[0];
  if (!nejnovejsi) return null;
  const datum = nejnovejsi.dateFrom.slice(0, 10);
  return datum > datumShrnuti.slice(0, 10) ? { datum, reportUrl: nejnovejsi.reportUrl || null } : null;
}
