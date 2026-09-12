/** Textové termíny InspIS nemají ověřenou platnost pro přijímací ročník. */
export function ArchivedAdmissionText({ value }: { value: string | null | undefined }) {
  return <span className="block mt-1">
    <span className="text-slate-600">Pro rok 2027 neověřeno. Aktuální údaj ověřte u školy.</span>
    {value && <details className="mt-2 text-sm text-slate-500">
      <summary className="cursor-pointer">Starší údaj z InspIS (export 11. 2. 2026)</summary>
      <span className="block mt-1">{value}</span>
    </details>}
  </span>;
}
