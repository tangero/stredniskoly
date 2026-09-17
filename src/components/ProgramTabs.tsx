import Link from 'next/link';

/**
 * Přepínač oborů školy.
 *
 * Soubor se do 17. 9. 2026 jmenoval SchoolDetailClient a měl 862 řádků s deseti
 * exportovanými komponentami. Devět z nich mělo jediného konzumenta,
 * page.v1_original.tsx, který nebyl route, a část vracela rovnou null; smazány
 * spolu s ním.
 */
interface ProgramTabsProps {
  programs: Array<{
    id: string;
    nazev: string;
    /** Název k zobrazení, u duplicitních názvů s délkou v závorce. */
    obor: string;
    /** Název oboru a zaměření bez délky studia. */
    zakladniNazev?: string;
    typ: string;
    delka_studia: number;
    kapacita?: number;
    slug: string;
    hasZamereni?: boolean;
    is_new_2026?: boolean;
    prev_zamereni_name?: string;
  }>;
  currentProgramId: string;
}

const DELKA_SLOVY: Record<number, string> = { 2: 'dvouleté', 3: 'tříleté', 4: 'čtyřleté', 5: 'pětileté', 6: 'šestileté', 8: 'osmileté' };

/** Ze které třídy se na obor hlásí; nástavby po vyučení. */
function proKoho(typ: string, delka: number): string {
  if (typ === 'NAS') return 'po vyučení';
  if (delka === 8) return 'z 5. třídy';
  if (delka === 6) return 'ze 7. třídy';
  return 'z 9. třídy';
}

const hezkyNazev = (nazev: string) => nazev.replace(/ - /g, ' – ');
const mist = (n: number) => `${n} ${n === 1 ? 'místo' : n >= 2 && n <= 4 ? 'místa' : 'míst'}`;

/**
 * Přepínač oborů školy. Ukazuje jen to, čím se obory liší: když mají všechny stejný název
 * (například tři gymnázia různé délky), název je jednou nad záložkami a záložky nesou délku,
 * pro koho obor je a počet míst.
 */
export function ProgramTabs({ programs, currentProgramId }: ProgramTabsProps) {
  // Jediný obor přepínač nepotřebuje – jeho data jsou rovnou na stránce.
  if (programs.length <= 1) return null;

  const nazevBezDelky = (p: ProgramTabsProps['programs'][number]) => p.zakladniNazev ?? p.obor.replace(/\s*\(\d+leté\)$/, '');
  const nazvy = new Set(programs.map(nazevBezDelky));
  const spolecnyNazev = nazvy.size === 1 ? [...nazvy][0] : null;
  const pocetPodleNazvu = new Map<string, number>();
  programs.forEach(p => pocetPodleNazvu.set(nazevBezDelky(p), (pocetPodleNazvu.get(nazevBezDelky(p)) ?? 0) + 1));

  // Od nejmladších uchazečů: osmileté (z 5. třídy), šestileté, pak čtyřleté a kratší; uvnitř podle názvu.
  const serazene = [...programs].sort((a, b) =>
    (b.delka_studia >= 6 ? b.delka_studia : 0) - (a.delka_studia >= 6 ? a.delka_studia : 0)
    || nazevBezDelky(a).localeCompare(nazevBezDelky(b), 'cs')
    || b.delka_studia - a.delka_studia);
  const totalKapacita = programs.reduce((sum, p) => sum + (p.kapacita || 0), 0);

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold text-slate-900">Obory školy</h2>
          <p className="text-sm text-slate-500">
            {programs.length} {programs.length < 5 ? 'obory' : 'oborů'}{totalKapacita > 0 && `, ${totalKapacita} míst celkem`}
          </p>
        </div>
        {spolecnyNazev && (
          <p className="mt-1 text-[15px] text-slate-700">
            <span className="font-semibold text-slate-900">{hezkyNazev(spolecnyNazev)}</span>, obory se liší délkou studia
          </p>
        )}

        <nav aria-label="Obory školy" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {serazene.map(program => {
            const isActive = program.id === currentProgramId;
            const nazev = nazevBezDelky(program);
            const delka = DELKA_SLOVY[program.delka_studia] ?? `${program.delka_studia}leté`;
            const hlavni = spolecnyNazev
              ? delka.charAt(0).toUpperCase() + delka.slice(1)
              : `${hezkyNazev(nazev)}${(pocetPodleNazvu.get(nazev) ?? 0) > 1 ? `, ${delka}` : ''}`;
            return (
              <Link
                key={program.id}
                href={`/skola/${program.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`group grid gap-0.5 rounded-xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span className="text-[16px] font-semibold leading-snug">{hlavni}</span>
                <span className={`text-[13px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                  {proKoho(program.typ, program.delka_studia)}
                  {spolecnyNazev || (pocetPodleNazvu.get(nazev) ?? 0) > 1 ? '' : ` · ${delka}`}
                  {program.kapacita ? ` · ${mist(program.kapacita)}` : ''}
                </span>
                {(program.is_new_2026 || program.prev_zamereni_name) && (
                  <span className={`text-[12px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {program.is_new_2026 && <span className={`mr-1.5 rounded px-1.5 py-0.5 font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>nový obor</span>}
                    {program.prev_zamereni_name && <>dříve „{program.prev_zamereni_name}“</>}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

