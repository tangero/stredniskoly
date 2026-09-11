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
