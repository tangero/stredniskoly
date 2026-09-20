import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCasCz, overAdminToken } from '@/lib/admin';
import { jeDbNastavena } from '@/lib/novinky-db';
import { stavSkolPortalu, udalostiSkoly } from '@/lib/portal-admin';
import { getNazevSkoly, PORTAL_POLE } from '@/lib/portal-skol';
import { historieProfilu } from '@/lib/portal-profil';
import { cteni } from '@/lib/portal-relace';
import { historieSkoly, jeTestovaciUcet, otevrenePozvanky, type PortalRole } from '@/lib/portal-ucty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrace účtů portálu',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ redizo?: string; ok?: string; chyba?: string }>;
}

const VSTUP = 'rounded border border-slate-300 px-2 py-1 text-sm';
const TLACITKO = 'rounded bg-slate-800 px-3 py-1 text-sm font-medium text-white hover:bg-slate-700';

const cas = (iso: string | null) => (iso ? formatDatumCasCz(new Date(iso).toISOString()) : '–');

function Duvod() {
  return <input name="duvod" required aria-label="Důvod zásahu" placeholder="důvod (povinný)" className={`${VSTUP} w-64`} />;
}

function Formular({ redizo, akce, children }: { redizo: string; akce: string; children: React.ReactNode }) {
  return (
    <form method="post" action="/admin/portal/akce" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="redizo" value={redizo} />
      <input type="hidden" name="akce" value={akce} />
      {children}
    </form>
  );
}

/**
 * Souhlas se zveřejněním jména dává jen osoba sama (oddíl 2.3). Administrace
 * ho může na žádost odvolat, udělit ne.
 */
function UdajeOsoby({ role }: { role?: PortalRole }) {
  return (
    <>
      <input name="jmeno" required aria-label="Jméno a příjmení" defaultValue={role?.jmeno} placeholder="jméno a příjmení" className={VSTUP} />
      <input name="funkce" aria-label="Funkce" defaultValue={role?.funkce} placeholder="funkce" className={VSTUP} />
      <input name="email" type="email" required aria-label="E-mail" defaultValue={role?.email} placeholder="e-mail" className={VSTUP} />
      {role?.zverejnit_jmeno && (
        <label className="text-sm">
          <input type="checkbox" name="odvolat_souhlas" /> odvolat souhlas se zveřejněním jména
        </label>
      )}
    </>
  );
}

export default async function AdminPortalPage({ searchParams }: Props) {
  if (!overAdminToken((await cookies()).get('admin_token')?.value)) notFound();
  const { redizo, ok, chyba } = await searchParams;

  if (!jeDbNastavena()) {
    return <p className="p-10">Databáze účtů není nastavena (DATABASE_URL).</p>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-slate-900">Účty portálu škol</h1>
            <form className="flex gap-2">
              <input name="redizo" defaultValue={redizo} placeholder="REDIZO" className={VSTUP} />
              <button className={TLACITKO}>Otevřít školu</button>
            </form>
          </div>
          {ok && <p role="status" className="rounded bg-green-50 px-4 py-2 text-green-800">{ok}</p>}
          {chyba && <p role="alert" className="rounded bg-red-50 px-4 py-2 text-red-700">{chyba}</p>}
          {redizo ? <DetailSkoly redizo={redizo} /> : <PrehledSkol />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

async function PrehledSkol() {
  const stav = await stavSkolPortalu(cteni);
  const nazvy = new Map(await Promise.all(stav.map(async (s) => [s.redizo, await getNazevSkoly(s.redizo)] as const)));
  return (
    <section className="bg-white rounded-xl border border-slate-100 p-6">
      <h2 className="text-xl font-semibold mb-4">Školy se stopou v portálu</h2>
      <p className="text-sm text-slate-500 mb-4">
        Pilotní školy jsou v přehledu na <Link href="/admin" className="underline">/admin</Link>.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-2 pr-4">Škola</th>
            <th className="py-2 pr-4">Správce</th>
            <th className="py-2 pr-4">Editoři</th>
            <th className="py-2 pr-4">Návrhy</th>
            <th className="py-2">Poslední dění</th>
          </tr>
        </thead>
        <tbody>
          {stav.map((s) => (
            <tr key={s.redizo} className="border-b border-slate-50">
              <td className="py-2 pr-4">
                <Link href={`/admin/portal?redizo=${s.redizo}`} className="text-blue-700 hover:underline">
                  {nazvy.get(s.redizo) || s.redizo}
                </Link>
              </td>
              <td className="py-2 pr-4">{s.spravce ?? '–'}</td>
              <td className="py-2 pr-4">{s.editori}</td>
              <td className="py-2 pr-4">{s.navrhy}</td>
              <td className="py-2">{cas(s.posledni_udalost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="text-lg font-semibold mt-6 mb-2">Výmaz kontaktu bez účtu</h3>
      <p className="text-sm text-slate-500 mb-2">
        Pro člověka, který poslal návrh bez účtu (host z rejstříkové adresy). Osobu s účtem vymažte u její role ve škole.
      </p>
      <Formular redizo="" akce="vymazat_kontakt">
        <input name="email" type="email" required aria-label="E-mail k výmazu" placeholder="e-mail" className={VSTUP} />
        <Duvod />
        <button className={TLACITKO}>Vymazat kontakt</button>
      </Formular>
    </section>
  );
}

async function DetailSkoly({ redizo }: { redizo: string }) {
  const [nazev, historie, udalosti, pozvanky, profil] = await Promise.all([
    getNazevSkoly(redizo),
    historieSkoly(cteni, redizo),
    udalostiSkoly(cteni, redizo),
    otevrenePozvanky(cteni, redizo),
    historieProfilu(cteni, redizo),
  ]);
  const platne = historie.filter((r) => !r.zneplatneno);
  const platneUdaje = profil.filter((p) => !p.zneplatneno);
  // Pole, jehož poslední verzí je smazání. Historie ho zná, na webu není –
  // a právě u něj je návrat k předchozí verzi nejvíc potřeba.
  const nejnovejsiPoPoli = new Map<string, (typeof profil)[number]>();
  for (const u of profil) if (!nejnovejsiPoPoli.has(u.pole)) nejnovejsiPoPoli.set(u.pole, u);
  const smazana = [...nejnovejsiPoPoli.values()].filter((u) => !u.hodnota.trim());
  const popisky = new Map(PORTAL_POLE.map((p) => [p.key, p.label]));
  popisky.set('ubytovani', 'Ubytování');

  return (
    <>
      <h2 className="text-2xl font-semibold">
        {nazev || 'Škola mimo katalog'} <span className="text-slate-500">({redizo})</span>
      </h2>

      {/*
        Zpětná moderace údajů profilu. Web na schválení nečeká, chyba se opravuje
        až tady; oprava i návrat jsou nový řádek, historie zůstává celá.
      */}
      <section className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Údaje profilu na webu</h3>
        {platneUdaje.length === 0 ? (
          <p className="text-sm text-slate-500">Škola zatím žádný údaj nepotvrdila.</p>
        ) : (
          platneUdaje.map((u) => (
            <div key={u.id} className="space-y-2 border-b border-slate-100 pb-4">
              <p className="text-sm">
                <strong>{popisky.get(u.pole) || u.pole}:</strong> {u.hodnota}{' '}
                <span className="text-slate-500">
                  · {u.zdroj === 'redakce' ? 'opravila redakce' : 'potvrdila škola'} {cas(u.platne_od)}
                  {u.jmeno ? ` · ${u.jmeno}` : ''}
                  {u.duvod ? ` · ${u.duvod}` : ''}
                </span>
              </p>
              <Formular redizo={redizo} akce="opravit_udaj">
                <input type="hidden" name="pole" value={u.pole} />
                <input
                  name="hodnota"
                  defaultValue={u.hodnota}
                  aria-label={`Opravená hodnota pole ${popisky.get(u.pole) || u.pole}`}
                  className={`${VSTUP} w-96`}
                />
                <Duvod />
                <button className={TLACITKO}>Opravit</button>
              </Formular>
              <Formular redizo={redizo} akce="vratit_udaj">
                <input type="hidden" name="pole" value={u.pole} />
                <Duvod />
                <button className={TLACITKO}>Vrátit předchozí verzi</button>
              </Formular>
            </div>
          ))
        )}

        {smazana.length > 0 && (
          <>
            <h3 className="text-lg font-semibold">Smazaná pole</h3>
            {smazana.map((u) => (
              <div key={u.id} className="space-y-2 border-b border-slate-100 pb-4">
                <p className="text-sm">
                  <strong>{popisky.get(u.pole) || u.pole}</strong> — smazáno {cas(u.platne_od)}{' '}
                  <span className="text-slate-500">
                    · {u.zmenu_provedl}
                    {u.duvod ? ` · ${u.duvod}` : ''}
                  </span>
                </p>
                <Formular redizo={redizo} akce="vratit_udaj">
                  <input type="hidden" name="pole" value={u.pole} />
                  <Duvod />
                  <button className={TLACITKO}>Vrátit poslední hodnotu</button>
                </Formular>
              </div>
            ))}
          </>
        )}

        {profil.length > platneUdaje.length && (
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600">Historie údajů ({profil.length})</summary>
            <ul className="mt-2 space-y-1 text-slate-600">
              {profil.map((u) => (
                <li key={u.id}>
                  {cas(u.platne_od)} · <strong>{popisky.get(u.pole) || u.pole}</strong>:{' '}
                  {u.hodnota.trim() ? u.hodnota : <em>smazáno</em>} · {u.zmenu_provedl}
                  {u.zneplatneno ? ` · zneplatněno ${cas(u.zneplatneno)}` : ' · platí'}
                  {u.duvod ? ` · ${u.duvod}` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <h3 className="text-lg font-semibold">Platné role</h3>
        {platne.length === 0 && <p className="text-sm text-slate-500">Škola nemá správce ani editory.</p>}
        {platne.map((r) => (
          <div key={r.id} className="space-y-2 border-b border-slate-100 pb-4">
            <p className="text-sm">
              <strong>{r.jmeno}</strong>, {r.funkce || 'bez funkce'} · {r.role} · {r.email} · jméno veřejně:{' '}
              {r.zverejnit_jmeno ? 'ano' : 'ne'} · od {cas(r.platne_od)} · zapsal {r.zmenu_provedl}
            </p>
            <Formular redizo={redizo} akce="zmenit">
              <input type="hidden" name="role_id" value={r.id} />
              <UdajeOsoby role={r} />
              <Duvod />
              <button className={TLACITKO}>Změnit údaje</button>
            </Formular>
            {(r.role === 'editor' || jeTestovaciUcet(r.email)) && (
              <Formular redizo={redizo} akce="odebrat">
                <input type="hidden" name="role_id" value={r.id} />
                <Duvod />
                <button className={TLACITKO}>
                  {r.role === 'editor' ? 'Odebrat editora' : 'Odebrat testovacího správce'}
                </button>
              </Formular>
            )}
          </div>
        ))}

        <h3 className="text-lg font-semibold">Dosadit správce</h3>
        <p className="text-sm text-slate-500">
          Nahradí dosavadního správce. Odkaz pro přihlášení si nový správce vyžádá na /pro-skoly svým e-mailem.
        </p>
        <Formular redizo={redizo} akce="dosadit">
          <UdajeOsoby />
          <label className="text-sm">
            <input type="checkbox" name="puvodni_editorem" defaultChecked /> původní zůstane editorem
          </label>
          <Duvod />
          <button className={TLACITKO}>Dosadit</button>
        </Formular>

        {pozvanky.length > 0 && (
          <>
            <h3 className="text-lg font-semibold">Otevřené pozvánky</h3>
            {pozvanky.map((p) => (
              <Formular key={p.id} redizo={redizo} akce="zrusit_pozvanku">
                <span className="text-sm">
                  {p.email}, platí do {cas(p.plati_do)}
                </span>
                <input type="hidden" name="pozvanka_id" value={p.id} />
                <Duvod />
                <button className={TLACITKO}>Zrušit</button>
              </Formular>
            ))}
          </>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold mb-3">Historie záznamů (i zneplatněné)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1 pr-3">Platí od</th>
              <th className="py-1 pr-3">Zneplatněno</th>
              <th className="py-1 pr-3">Role</th>
              <th className="py-1 pr-3">Osoba</th>
              <th className="py-1 pr-3">Zapsal / důvod</th>
              <th className="py-1">Výmaz osoby</th>
            </tr>
          </thead>
          <tbody>
            {historie.map((r) => (
              <tr key={r.id} className={`border-b border-slate-50 ${r.zneplatneno ? 'text-slate-400' : ''}`}>
                <td className="py-1 pr-3">{cas(r.platne_od)}</td>
                <td className="py-1 pr-3">{cas(r.zneplatneno)}</td>
                <td className="py-1 pr-3">{r.role}</td>
                <td className="py-1 pr-3">
                  {r.jmeno}, {r.funkce} · {r.email}
                </td>
                <td className="py-1 pr-3">
                  {r.zmenu_provedl}
                  {r.duvod && ` · ${r.duvod}`}
                </td>
                <td className="py-1">
                  {!r.email.startsWith('vymazano+') && (
                    <Formular redizo={redizo} akce="anonymizovat">
                      <input type="hidden" name="osoba_id" value={r.osoba_id} />
                      <Duvod />
                      <button className={TLACITKO}>Vymazat</button>
                    </Formular>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold mb-3">Události</h3>
        <ul className="space-y-1 text-sm">
          {udalosti.map((u) => (
            <li key={u.id}>
              <span className="text-slate-500">{cas(u.kdy)}</span> · <strong>{u.typ}</strong>
              {u.jmeno && ` · ${u.jmeno}`}
              {Object.keys(u.detail ?? {}).length > 0 && (
                <code className="ml-2 text-xs text-slate-500">{JSON.stringify(u.detail)}</code>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
