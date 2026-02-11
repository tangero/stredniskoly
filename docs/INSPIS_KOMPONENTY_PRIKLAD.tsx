/**
 * InspIS komponenty - referenční ukázky (VLNA 1)
 *
 * Tento soubor je dokumentační reference, ne produkční komponenta.
 * Aktuální implementace žije v:
 * - src/components/school-profile/SchoolInfoSection.tsx
 * - src/types/inspis.ts
 */

import type { SchoolInspisData } from '@/types/inspis';

export function SchoolInfoSectionReference({ data }: { data: SchoolInspisData }) {
  return (
    <section>
      <h2>O škole</h2>

      <div>
        <strong>Školné:</strong> {formatTuition(data.rocni_skolne)}
      </div>

      {data.vyuka_jazyku?.length ? (
        <div>
          <strong>Jazyky:</strong> {data.vyuka_jazyku.join(', ')}
        </div>
      ) : null}

      {data.odborne_ucebny?.length ? (
        <div>
          <strong>Odborné učebny:</strong> {data.odborne_ucebny.join(', ')}
        </div>
      ) : null}

      {data.prijimaci_zkousky ? (
        <div>
          <strong>Přijímací zkoušky:</strong> {data.prijimaci_zkousky}
        </div>
      ) : null}

      {data.bezbariery_pristup ? (
        <div>
          <strong>Bezbariérovost:</strong> {data.bezbariery_pristup}
        </div>
      ) : null}
    </section>
  );
}

function formatTuition(value: number | null): string {
  if (value === null) return 'Neuvedeno';
  if (value === 0) return 'Zdarma';
  return `${value.toLocaleString('cs-CZ')} Kč/rok`;
}
