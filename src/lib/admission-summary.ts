/** Popis poptávky, nikoli predikce přijetí. Nula přihlášek je platná, nula míst není jmenovatel. */
export function applicationsPerPlace(applications: number | null | undefined, capacity: number | null | undefined): number | null {
  if (applications == null || capacity == null || !Number.isFinite(applications) || !Number.isFinite(capacity) || applications < 0 || capacity <= 0) return null;
  return applications / capacity;
}
