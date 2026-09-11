/** Popis poptávky, nikoli predikce přijetí. Nula přihlášek je platná, nula míst není jmenovatel. */
export function applicationsPerPlace(applications: number | null | undefined, capacity: number | null | undefined): number | null {
  if (applications == null || capacity == null || !Number.isFinite(applications) || !Number.isFinite(capacity) || applications < 0 || capacity <= 0) return null;
  return applications / capacity;
}


export interface AdmissionContext {
  tested_all: number | null;
  tested_accepted: number | null;
  average_all: number | null;
  average_accepted: number | null;
  accepted: number | null;
  higher_priority: number | null;
  capacity_rejected: number | null;
  conditions_not_met: number | null;
  withdrawn: number | null;
  outcomes_complete: boolean;
}

export function capacitySummary(context: AdmissionContext | null | undefined): string | null {
  if (!context?.outcomes_complete || context.capacity_rejected === null) return null;
  return context.capacity_rejected === 0
    ? 'V roce 2026 nebyl nikdo odmítnut kvůli nedostatku míst.'
    : `Počet nepřijatých kvůli nedostatku míst v roce 2026: ${context.capacity_rejected.toLocaleString('cs-CZ')}.`;
}


/** Stejné skóre má stabilní pořadí podle ID; neověřený průměr se neřadí. */
export function rankAdmissionOffers<T extends { id: string; admission_context?: AdmissionContext | null; history?: { average: number | null } | null }>(offers: T[]): T[] {
  const score = (offer: T) => offer.admission_context ? offer.admission_context.average_accepted : offer.history?.average;
  return offers.filter(offer => {
    const value = score(offer);
    return value != null && Number.isFinite(value) && value >= 0 && value <= 100;
  }).sort((a, b) => score(b)! - score(a)! || a.id.localeCompare(b.id));
}

export function rankingPages(page: number, total: number): Array<number | string> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, '…', total];
  if (page >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}
