import { PortalZaznam, zaznamMaObsah, formatDatumCz } from '@/lib/portal-skol';

// Zobrazovaná pole v daném pořadí; popis_skoly se vykresluje odděleně („od školy“)
const DISPLAY_FIELDS: Array<{ key: string; label: string; typ?: 'url' | 'ubytovani' }> = [
  { key: 'dny_otevrenych_dveri', label: 'Dny otevřených dveří' },
  { key: 'odkaz_kriteria', label: 'Kritéria přijímacího řízení 2027', typ: 'url' },
  { key: 'kriteria_vlastnimi_slovy', label: 'Kritéria vlastními slovy' },
  { key: 'pripravne_kurzy', label: 'Přípravné kurzy / přijímačky nanečisto' },
  { key: 'ubytovani', label: 'Ubytování', typ: 'ubytovani' },
  { key: 'skolne', label: 'Školné a poplatky' },
  { key: 'podpora_svp', label: 'Podpora žáků se SVP' },
  { key: 'prestupy', label: 'Přestupy v průběhu studia' },
];

export function SchoolPortalSection({ zaznam }: { zaznam: PortalZaznam | null }) {
  if (!zaznamMaObsah(zaznam)) return null;
  const z = zaznam!;

  const nejnovejsi = Object.values(z.udaje)
    .map((v) => v?.potvrzeno_dne)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  const popis = z.udaje.popis_skoly?.hodnota?.trim();

  const radky = DISPLAY_FIELDS.flatMap((f) => {
    const entry = z.udaje[f.key];
    if (!entry || !entry.hodnota.trim()) {
      // Ubytování může mít jen poznámku bez ano/ne
      if (f.key === 'ubytovani') {
        const poznamka = z.udaje.ubytovani_poznamka;
        if (poznamka && poznamka.hodnota.trim()) {
          return [{ ...f, hodnota: poznamka.hodnota, potvrzeno_dne: poznamka.potvrzeno_dne }];
        }
      }
      return [];
    }
    if (f.typ === 'ubytovani') {
      const zaklad = entry.hodnota === 'ano' ? 'Ano' : 'Ne';
      const poznamka = z.udaje.ubytovani_poznamka?.hodnota?.trim();
      return [{ ...f, hodnota: poznamka ? `${zaklad} – ${poznamka}` : zaklad, potvrzeno_dne: entry.potvrzeno_dne }];
    }
    return [{ ...f, hodnota: entry.hodnota, potvrzeno_dne: entry.potvrzeno_dne }];
  });

  if (radky.length === 0 && !popis) return null;

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-semibold text-slate-900">Údaje potvrzené školou</h2>
        {nejnovejsi && (
          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
            potvrzeno školou {formatDatumCz(nejnovejsi)}
          </span>
        )}
      </div>

      {radky.length > 0 && (
        <dl className="divide-y divide-slate-100">
          {radky.map((r) => (
            <div key={r.key} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm text-slate-500">{r.label}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2 text-sm text-slate-900">
                {r.typ === 'url' ? (
                  <a
                    href={r.hodnota}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    Vyhlášená kritéria na webu školy
                  </a>
                ) : (
                  <span className="whitespace-pre-line">{r.hodnota}</span>
                )}
                <span className="block text-xs text-slate-400 mt-0.5">
                  potvrzeno školou {formatDatumCz(r.potvrzeno_dne)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {popis && (
        <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-slate-900">O škole vlastními slovy</h3>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">od školy</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line">{popis}</p>
          <p className="text-xs text-slate-400 mt-2">
            potvrzeno školou {formatDatumCz(z.udaje.popis_skoly!.potvrzeno_dne)}
          </p>
        </div>
      )}
    </section>
  );
}
