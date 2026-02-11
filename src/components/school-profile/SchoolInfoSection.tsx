import { SchoolInspisData } from '@/types/inspis';

function formatTuition(value: number | null): string {
  if (value === null) return 'Neuvedeno';
  if (value === 0) return 'Zdarma';
  return `${value.toLocaleString('cs-CZ')} Kč/rok`;
}

function yesNo(value: boolean | null): string {
  if (value === null) return 'Neuvedeno';
  return value ? 'Ano' : 'Ne';
}

function renderList(values: string[] | null): string {
  if (!values || values.length === 0) return 'Neuvedeno';
  return values.join(', ');
}

export function SchoolInfoSection({ data }: { data: SchoolInspisData }) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-semibold text-slate-900">O škole</h2>
        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
          InspIS
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Školné</div>
          <div className="text-lg font-semibold text-slate-900">{formatTuition(data.rocni_skolne)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Zaměření</div>
          <div className="text-lg font-semibold text-slate-900">{renderList(data.zamereni)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Studenti</div>
          <div className="text-lg font-semibold text-slate-900">
            {data.aktualni_pocet_zaku ?? 'Neuvedeno'} / {data.nejvyssi_povoleny_pocet_zaku ?? 'Neuvedeno'}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border border-slate-100 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">Jazyky a výuka</h3>
          <div className="text-sm text-slate-700"><strong>Jazyky:</strong> {renderList(data.vyuka_jazyku)}</div>
          <div className="text-sm text-slate-700"><strong>CLIL:</strong> {yesNo(data.clil_metoda)}</div>
          <div className="text-sm text-slate-700"><strong>CLIL jazyky:</strong> {renderList(data.clil_jazyky)}</div>
          <div className="text-sm text-slate-700"><strong>Internet ve výuce:</strong> {yesNo(data.vyuziti_internetu_ve_vyuce)}</div>
        </div>

        <div className="border border-slate-100 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">Přijímací řízení</h3>
          <div className="text-sm text-slate-700"><strong>Zkoušky:</strong> {data.prijimaci_zkousky || 'Neuvedeno'}</div>
          <div className="text-sm text-slate-700"><strong>Předměty:</strong> {renderList(data.zkousky_z_predmetu)}</div>
          <div className="text-sm text-slate-700"><strong>Přípravné kurzy:</strong> {yesNo(data.pripravne_kurzy)}</div>
          <div className="text-sm text-slate-700"><strong>Dny otevřených dveří:</strong> {data.dny_otevrenych_dveri || 'Neuvedeno'}</div>
          <div className="text-sm text-slate-700"><strong>Termín přijímaček:</strong> {data.termin_prijimacich_zkousek || 'Neuvedeno'}</div>
        </div>

        <div className="border border-slate-100 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">Vybavení</h3>
          <div className="text-sm text-slate-700"><strong>Odborné učebny:</strong> {renderList(data.odborne_ucebny)}</div>
          <div className="text-sm text-slate-700"><strong>Tělesná výchova:</strong> {renderList(data.prostory_telocvik)}</div>
          <div className="text-sm text-slate-700"><strong>Přístup k PC:</strong> {yesNo(data.pristup_k_pc)}</div>
        </div>

        <div className="border border-slate-100 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">Dostupnost</h3>
          <div className="text-sm text-slate-700"><strong>Bezbariérovost:</strong> {data.bezbariery_pristup || 'Neuvedeno'}</div>
          <div className="text-sm text-slate-700"><strong>Doprava:</strong> {renderList(data.dopravni_dostupnost)}</div>
          <div className="text-sm text-slate-700"><strong>Linka MHD:</strong> {data.linka_mhd || 'Neuvedeno'}</div>
          <div className="text-sm text-slate-700"><strong>Nejbližší zastávka:</strong> {data.nejblizsi_zastavka_m ?? 'Neuvedeno'} m</div>
          <div className="text-sm text-slate-700"><strong>Umístění:</strong> {data.umisteni_v_obci || 'Neuvedeno'}</div>
        </div>
      </div>
    </section>
  );
}
