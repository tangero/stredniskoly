import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  overAdminToken,
  getStavDatovychSad,
  getHlaseni,
  getPortalPrehled,
  getOtevreneNavrhy,
  getLinkaFronta,
  getBehyActions,
  getNovinkyPrehled,
  formatDatumCz,
  formatDatumCasCz,
  stariSlovy,
  StavSady,
} from '@/lib/admin';
import { jeDbNastavena } from '@/lib/novinky-db';
import { nactiPilot, stavSkolPortalu, type PilotSkola, type StavSkolyPortalu } from '@/lib/portal-admin';
import { cteni } from '@/lib/portal-relace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Administrace',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ k?: string }>;
}

const STAV_BADGE: Record<StavSady, string> = {
  OK: 'bg-green-50 text-green-700 border-green-200',
  'po termínu': 'bg-amber-50 text-amber-700 border-amber-200',
  zastaralá: 'bg-red-50 text-red-700 border-red-200',
};

const VYSLEDEK_BADGE: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  failure: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
};

function Sekce({ titulek, children }: { titulek: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{titulek}</h2>
      {children}
    </section>
  );
}

/** Pilot účtů portálu (docs/ucty-portalu-skol-2027.md, oddíl 4): 20 škol a jejich aktivita. */
async function getPilot(): Promise<{ skola: PilotSkola; stav: StavSkolyPortalu | null }[] | null> {
  const pilot = await nactiPilot();
  if (pilot.length === 0) return [];
  if (!jeDbNastavena()) return null;
  try {
    const stav = new Map((await stavSkolPortalu(cteni, pilot.map((p) => p.redizo))).map((s) => [s.redizo, s]));
    return pilot.map((skola) => ({ skola, stav: stav.get(skola.redizo) ?? null }));
  } catch (e) {
    console.error('❌ Admin: stav pilotu', e);
    return null;
  }
}

function Poznamka({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 italic">{children}</p>;
}

/** České počítadlo odběratelů: 1 odběratel, 2–4 odběratelé, 5+ odběratelů. */
function odberateleSlovy(n: number): string {
  if (n === 1) return '1 odběratel';
  if (n < 5) return `${n} odběratelé`;
  return `${n} odběratelů`;
}

export default async function AdminPage({ searchParams }: Props) {
  const { k } = await searchParams;

  // Vstup s tokenem v URL: přesměrovat na /admin/auth, který token ověří,
  // nastaví HttpOnly cookie a přesměruje zpět na čisté /admin. Redirect
  // response nemá tělo, takže se token nedostane do žádného HTML.
  if (k !== undefined) {
    redirect(`/admin/auth?k=${encodeURIComponent(k)}`);
  }

  const jar = await cookies();
  if (!overAdminToken(jar.get('admin_token')?.value)) {
    notFound();
  }

  const dnes = new Date();
  const [sady, portal, navrhy, hlaseni, linka, behyActions, novinky] = await Promise.all([
    getStavDatovychSad(dnes),
    getPortalPrehled(),
    getOtevreneNavrhy(dnes),
    getHlaseni(),
    getLinkaFronta(),
    getBehyActions(),
    getNovinkyPrehled(),
  ]);
  const pilot = await getPilot();

  const sadyPoTerminu = sady.filter((s) => s.stav !== 'OK').length;
  const pocetNavrhu = navrhy?.length ?? null;
  const posledniBeh = behyActions?.[0] ?? null;
  const posledniBehOk = posledniBeh ? posledniBeh.vysledek === 'success' : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Administrace</h1>
            <p className="text-sm text-slate-500">
              {pocetNavrhu === null ? 'hlášení nenakonfigurováno' : `${pocetNavrhu} ${pocetNavrhu === 1 ? 'nesrovnalost čeká' : pocetNavrhu < 5 ? 'nesrovnalosti čekají' : 'nesrovnalostí čeká'}`}
              {' · '}
              {sadyPoTerminu === 0 ? 'všechny sady v pořádku' : `${sadyPoTerminu} ${sadyPoTerminu === 1 ? 'sada' : sadyPoTerminu < 5 ? 'sady' : 'sad'} po termínu`}
              {' · '}
              {novinky === null ? 'odběr novinek nenakonfigurován' : `${odberateleSlovy(novinky.odberatele)} novinek`}
              {' · '}
              {posledniBehOk === null
                ? 'běhy automatizací neznámé'
                : `poslední běh automatizací ${posledniBehOk ? 'OK' : 'selhal'}`}
            </p>
          </div>

          {/* 0. Pilot účtů portálu */}
          <Sekce titulek="Pilot účtů portálu">
            {pilot === null ? (
              <Poznamka>Databáze účtů není nastavena nebo neodpovídá.</Poznamka>
            ) : pilot.length === 0 ? (
              <Poznamka>Pilotní výběr (data/portal/pilot.json) není k dispozici.</Poznamka>
            ) : (
              <div className="overflow-x-auto">
                <p className="text-sm text-slate-500 mb-3">
                  {pilot.filter((p) => p.stav?.spravce).length} z {pilot.length} škol má správce ·{' '}
                  {pilot.filter((p) => (p.stav?.navrhy ?? 0) > 0).length} poslalo návrh ·{' '}
                  <a href="/admin/portal" className="underline">všechny účty</a>{' '}·{' '}
                  <a href="/admin/portal/pozvanky" className="underline">pozvánky do pilotu</a>
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Škola</th>
                      <th className="py-2 pr-4 font-medium">Pozvánka</th>
                      <th className="py-2 pr-4 font-medium">Správce</th>
                      <th className="py-2 pr-4 font-medium">Editoři</th>
                      <th className="py-2 pr-4 font-medium">Poslední přihlášení</th>
                      <th className="py-2 font-medium">Návrhy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilot.map(({ skola, stav }) => (
                      <tr key={skola.redizo} className="border-b border-slate-50">
                        <td className="py-2 pr-4">
                          <a href={`/admin/portal?redizo=${skola.redizo}`} className="text-blue-600 hover:underline">
                            {skola.nazev}
                          </a>
                          <span className="block text-xs text-slate-500">
                            {skola.mesto} · {skola.typ}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{skola.pozvanka_odeslana ? formatDatumCz(skola.pozvanka_odeslana) : '–'}</td>
                        <td className="py-2 pr-4">{stav?.spravce ?? '–'}</td>
                        <td className="py-2 pr-4">{stav?.editori ?? 0}</td>
                        <td className="py-2 pr-4">
                          {stav?.posledni_prihlaseni ? formatDatumCasCz(new Date(stav.posledni_prihlaseni).toISOString()) : '–'}
                        </td>
                        <td className="py-2">{stav?.navrhy ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sekce>

          {/* 1. Hlášení chyb od návštěvníků: kontakt je jen tady, na GitHubu není */}
          <Sekce titulek="Hlášení chyb od návštěvníků">
            {hlaseni === null ? (
              <Poznamka>Hlášení nejsou nakonfigurována (chybí DATABASE_URL).</Poznamka>
            ) : hlaseni.length === 0 ? (
              <Poznamka>Žádné nevyřízené hlášení.</Poznamka>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Přišlo</th>
                      <th className="py-2 pr-4 font-medium">Co hlásí</th>
                      <th className="py-2 pr-4 font-medium">Kontakt</th>
                      <th className="py-2 pr-4 font-medium">Stránka</th>
                      <th className="py-2 font-medium">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hlaseni.map((h) => (
                      <tr key={h.id} className="border-b border-slate-50 align-top">
                        <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{formatDatumCasCz(h.vytvoreno)}</td>
                        <td className="py-2 pr-4 text-slate-900 max-w-md">{h.popis}</td>
                        <td className="py-2 pr-4 text-slate-600">
                          <a href={`mailto:${h.email}`} className="text-blue-600 hover:underline">
                            {h.email}
                          </a>
                        </td>
                        <td className="py-2 pr-4 text-slate-600 break-all">{h.url || '—'}</td>
                        <td className="py-2">
                          {h.issue ? (
                            <a
                              href={`https://github.com/tangero/stredniskoly/issues/${h.issue}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              #{h.issue}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sekce>

          {/* 2. Portál pro školy – nesrovnalosti v datech katalogu */}
          <Sekce titulek="Portál pro školy – nesrovnalosti v datech">
            {navrhy === null ? (
              <Poznamka>Hlášení nesrovnalostí není nakonfigurováno (chybí GITHUB_TOKEN).</Poznamka>
            ) : navrhy.length === 0 ? (
              <Poznamka>Žádná otevřená nesrovnalost. Údaje profilu sem nechodí – jdou rovnou na web.</Poznamka>
            ) : (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Issue</th>
                      <th className="py-2 pr-4 font-medium">Škola</th>
                      <th className="py-2 pr-4 font-medium">Vytvořeno</th>
                      <th className="py-2 pr-4 font-medium">Kanál</th>
                      <th className="py-2 font-medium">Stáří</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navrhy.map((n) => (
                      <tr key={n.cislo} className="border-b border-slate-50">
                        <td className="py-2 pr-4">
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            #{n.cislo}
                          </a>
                        </td>
                        <td className="py-2 pr-4 text-slate-900">{n.skola}</td>
                        <td className="py-2 pr-4 text-slate-600">{formatDatumCz(n.vytvoreno)}</td>
                        <td className="py-2 pr-4 text-slate-600">{n.kanal || '—'}</td>
                        <td className="py-2 text-slate-600">
                          {n.stariDni > 3 ? (
                            <span className="text-amber-700 font-medium">{stariSlovy(n.stariDni)}</span>
                          ) : (
                            stariSlovy(n.stariDni)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Profily škol na webu: {portal.pocet}
            </h3>
            {portal.posledni.length === 0 ? (
              <Poznamka>Zatím žádný školou potvrzený profil.</Poznamka>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Škola</th>
                      <th className="py-2 pr-4 font-medium">REDIZO</th>
                      <th className="py-2 pr-4 font-medium">Potvrzeno</th>
                      <th className="py-2 font-medium text-right">Vyplněných polí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portal.posledni.map((p) => (
                      <tr key={p.redizo} className="border-b border-slate-50">
                        <td className="py-2 pr-4 text-slate-900">{p.nazev}</td>
                        <td className="py-2 pr-4 text-slate-600">{p.redizo}</td>
                        <td className="py-2 pr-4 text-slate-600">{formatDatumCz(p.potvrzenoDne)}</td>
                        <td className="py-2 text-slate-600 text-right">{p.pocetPoli}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sekce>

          {/* 2. Školní novinky z RSS */}
          <Sekce titulek="Školní novinky z RSS">
            <p className="text-sm text-slate-600">
              Co jsme sklidili ze školních webů a co jsme z toho odvodili – třída zprávy,
              jistota, stav sdělení, termíny a důvod publikačního rozhodnutí.{' '}
              <a href="/admin/skolni-novinky" className="text-blue-600 hover:underline">
                otevřít přehled
              </a>
            </p>
          </Sekce>

          {/* 3. Odběr novinek */}
          <Sekce titulek="Odběr novinek">
            {novinky === null ? (
              <Poznamka>
                Odběr novinek není nakonfigurován (chybí DATABASE_URL), nebo se databáze
                nepodařilo přečíst.
              </Poznamka>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    aktivní odběratelé: {novinky.odberatele}
                  </span>
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    noví za 7 dní: {novinky.nove7}
                  </span>
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    noví za 30 dní: {novinky.nove30}
                  </span>
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    čeká na potvrzení: {novinky.cekajiciPotvrzeni}
                  </span>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      novinky.frontaCeka > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    fronta e-mailů: {novinky.frontaCeka}
                  </span>
                </div>

                {novinky.dleZdroje.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      Odkud se přihlašují
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {novinky.dleZdroje.map((z) => (
                        <span
                          key={z.zdroj}
                          className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                        >
                          {z.zdroj}: {z.pocet}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </Sekce>

          {/* 3. Datové sady */}
          <Sekce titulek="Datové sady">
            {sady.length === 0 ? (
              <Poznamka>Registr stavu datových sad se nepodařilo načíst.</Poznamka>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Sada</th>
                      <th className="py-2 pr-4 font-medium">Zobrazujeme</th>
                      <th className="py-2 pr-4 font-medium">Čekáme</th>
                      <th className="py-2 font-medium">Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sady.map((s) => (
                      <tr
                        key={s.klic}
                        className={`border-b border-slate-50 ${s.stav !== 'OK' ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="py-2 pr-4 text-slate-900">{s.nazev}</td>
                        <td className="py-2 pr-4 text-slate-600">
                          {s.zobrazujeme}
                          {s.zobrazujemePlatneK && (
                            <span className="block text-xs text-slate-400">
                              platné k {formatDatumCz(s.zobrazujemePlatneK)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {s.cekame ? `${s.cekame} (${s.cekameKdy || 'neznámo'})` : '—'}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${STAV_BADGE[s.stav]}`}
                          >
                            {s.stav}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sekce>

          {/* 4. Datová linka */}
          <Sekce titulek="Datová linka">
            {linka.ulohy.length === 0 && linka.behy.length === 0 ? (
              <Poznamka>Frontu datové linky se nepodařilo načíst, nebo je prázdná.</Poznamka>
            ) : (
              <>
                {Object.keys(linka.pocetDleStavu).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(linka.pocetDleStavu).map(([stav, pocet]) => (
                      <span
                        key={stav}
                        className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {stav}: {pocet}
                      </span>
                    ))}
                  </div>
                )}

                {linka.ulohy.length > 0 && (
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100">
                          <th className="py-2 pr-4 font-medium">Kód</th>
                          <th className="py-2 pr-4 font-medium">Sada</th>
                          <th className="py-2 pr-4 font-medium">Druh</th>
                          <th className="py-2 pr-4 font-medium">Období</th>
                          <th className="py-2 pr-4 font-medium">Stav</th>
                          <th className="py-2 font-medium">Poslední změna</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linka.ulohy.map((u) => (
                          <tr key={u.kod} className="border-b border-slate-50">
                            <td className="py-2 pr-4 font-mono text-slate-900">{u.kod}</td>
                            <td className="py-2 pr-4 text-slate-600">{u.sada}</td>
                            <td className="py-2 pr-4 text-slate-600">{u.druh}</td>
                            <td className="py-2 pr-4 text-slate-600">{u.obdobi}</td>
                            <td className="py-2 pr-4 text-slate-600">{u.stav}</td>
                            <td className="py-2 text-slate-600">{formatDatumCasCz(u.posledniZmena)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {linka.behy.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Poslední běhy</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="py-2 pr-4 font-medium">Čas</th>
                            <th className="py-2 pr-4 font-medium text-right">Nové úlohy</th>
                            <th className="py-2 pr-4 font-medium text-right">Informace</th>
                            <th className="py-2 font-medium text-right">Nedostupné</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linka.behy.map((b, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="py-2 pr-4 text-slate-600">{formatDatumCasCz(b.cas)}</td>
                              <td className="py-2 pr-4 text-slate-600 text-right">{b.noveUlohy}</td>
                              <td className="py-2 pr-4 text-slate-600 text-right">{b.informace}</td>
                              <td className="py-2 text-slate-600 text-right">{b.nedostupne}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </Sekce>

          {/* 5. Automatizace */}
          <Sekce titulek="Automatizace (GitHub Actions)">
            {behyActions === null ? (
              <Poznamka>Automatizace nejsou nakonfigurované (chybí GITHUB_TOKEN).</Poznamka>
            ) : behyActions.length === 0 ? (
              <Poznamka>Běhy se nepodařilo načíst, nebo zatím žádné nejsou.</Poznamka>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">Workflow</th>
                      <th className="py-2 pr-4 font-medium">Výsledek</th>
                      <th className="py-2 pr-4 font-medium">Kdy</th>
                      <th className="py-2 font-medium">Odkaz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behyActions.map((b, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 pr-4 text-slate-900">{b.nazev}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${VYSLEDEK_BADGE[b.vysledek] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {b.vysledek}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-600">{formatDatumCasCz(b.kdy)}</td>
                        <td className="py-2">
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            run →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sekce>
        </div>
      </main>

      <Footer />
    </div>
  );
}
