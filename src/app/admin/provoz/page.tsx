import { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDatumCasCz } from '@/lib/admin';
import { vyzadujAdmina } from '@/lib/admin-relace';
import {
  cekaniPodleDruhu,
  hlaseniPodlePuvodu,
  kvalitaPoTydnech,
  median,
  nactiProvoz,
  POREDI_REZIMU,
  STARE_DNI,
  stavTras,
  tydnyPodleRezimu,
  type StavTrasy,
} from '@/lib/admin-provoz';
import { nactiSignaly, type Hodnoceni, type RadekRychlosti, type SouhrnSignalu, type TydenSignalu } from '@/lib/admin-signaly';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Provoz projektu',
  robots: { index: false, follow: false },
};

// Přehled provozu (#479): šest otázek nad živými daty z GitHubu (mezipaměť 10 minut).

const STAV_TRIDA: Record<StavTrasy, string> = {
  chyba: 'border-red-300 bg-red-50 text-red-800',
  'běží řídce': 'border-amber-300 bg-amber-50 text-amber-800',
  pozor: 'border-amber-300 bg-amber-50 text-amber-800',
  nezavedeno: 'border-slate-300 bg-slate-50 text-slate-600',
  'v pořádku': 'border-green-300 bg-green-50 text-green-800',
};
const PORADI_STAVU: Record<StavTrasy, number> = { chyba: 0, 'běží řídce': 1, pozor: 2, nezavedeno: 3, 'v pořádku': 4 };
const BARVA_REZIMU: Record<string, string> = {
  'bez brány': 'bg-slate-300', R: 'bg-emerald-500', E: 'bg-teal-500', souhlas: 'bg-sky-500', L: 'bg-amber-400', K: 'bg-orange-500', H2: 'bg-rose-500', neznámý: 'bg-slate-200',
};

const cislo = (n: number) => n.toLocaleString('cs-CZ');
const desetiny = (n: number) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
const den = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`; };

function Sekce({ id, titulek, otazka, children }: { id: string; titulek: string; otazka: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{titulek}</h2>
        <p className="text-sm text-slate-500">{otazka}</p>
      </div>
      {children}
    </section>
  );
}

function Karta({ titulek, poznamka, children, siroka }: { titulek: string; poznamka?: string; children: ReactNode; siroka?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 space-y-2 min-w-0 ${siroka ? 'md:col-span-2' : ''}`}>
      <h3 className="font-medium text-slate-900">{titulek}</h3>
      {poznamka && <p className="text-xs text-slate-500">{poznamka}</p>}
      {children}
    </div>
  );
}

const Nedostupne = () => <p className="text-sm text-slate-500">Zdroj se nepodařilo načíst, zkus obnovit stránku za chvíli.</p>;

function Tabulka({ hlavicka, children, cisla = [] }: { hlavicka: string[]; children: ReactNode; cisla?: number[] }) {
  return (
    <div className="overflow-x-auto max-h-[28rem]">
      <table className="w-full text-sm tabular-nums">
        <thead className="sticky top-0 bg-white">
          <tr>{hlavicka.map((h, i) => <th key={h} className={`border-b border-slate-200 px-2 py-1 font-medium text-slate-500 ${cisla.includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const Td = ({ children, vpravo, trida = '' }: { children: ReactNode; vpravo?: boolean; trida?: string }) => (
  <td className={`border-b border-slate-100 px-2 py-1 align-top ${vpravo ? 'text-right whitespace-nowrap' : ''} ${trida}`}>{children}</td>
);

function Dlazdice({ popis, hodnota, pod, zle }: { popis: string; hodnota: string; pod: string; zle?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{popis}</div>
      <div className={`text-3xl font-semibold tabular-nums ${zle ? 'text-red-700' : 'text-slate-900'}`}>{hodnota}</div>
      <div className="text-xs text-slate-500">{pod}</div>
    </div>
  );
}

const HODNOCENI_TRIDA: Record<Hodnoceni, string> = { dobrá: 'text-green-800', 'ke zlepšení': 'text-amber-800', špatná: 'text-red-700' };
const datumTydne = (iso: string) => `${den(iso)} ${iso.slice(0, 4)}`;
const SLOUPCE_TYDNU = 'grid grid-cols-[11rem_6rem_7rem_9rem_minmax(8rem,1fr)] gap-x-3 items-baseline';

/** Hodnota rychlosti s hodnocením podle prahů Googlu, jak je zapsal skript souhrnu. */
function Metrika({ hodnota, hodnoceni, cls }: { hodnota: number | null; hodnoceni?: Hodnoceni; cls?: boolean }) {
  if (hodnota === null) return <>–</>;
  return <span className={hodnoceni ? HODNOCENI_TRIDA[hodnoceni] : ''}>{cls ? hodnota.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : `${cislo(Math.round(hodnota))} ms`}</span>;
}

function Vynechano({ souhrn, oddil }: { souhrn: SouhrnSignalu; oddil: string }) {
  return <p className="text-sm text-slate-500">Oddíl vynechán{souhrn.vynechano[oddil] ? `: ${souhrn.vynechano[oddil]}` : ''}.</p>;
}

/** Podrobnosti jednoho týdne: stránky, růst, události, rychlost. Hledané výrazy artefakt nemá (P1). */
function TydenSignaluDetail({ s }: { s: SouhrnSignalu }) {
  const rychlost = s.rychlost && 'radky' in s.rychlost ? s.rychlost : null;
  const sDaty: RadekRychlosti[] = rychlost ? rychlost.radky.filter((r) => !r.bezDat) : [];
  const bezDat = rychlost ? [...new Set(rychlost.radky.filter((r) => r.bezDat).map((r) => r.typ))] : [];
  const udalosti = [
    ...(s.udalostiAkce || []).slice(0, 5).map((r) => ({ ...r, druh: 'akce' })),
    ...(s.udalostiKategorie || []).slice(0, 5).map((r) => ({ ...r, druh: 'kategorie' })),
  ];
  return (
    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 items-start">
      <div className="space-y-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-700">Nejnavštěvovanější stránky</h4>
        {!s.stranky ? <Vynechano souhrn={s} oddil="stranky" /> : (
          <Tabulka hlavicka={['Stránka', 'Zobrazení']} cisla={[1]}>
            {s.stranky.slice(0, 5).map((r) => <tr key={r.stranka}><Td trida="break-all">{r.stranka}</Td><Td vpravo>{cislo(r.zobrazeni)}</Td></tr>)}
          </Tabulka>
        )}
      </div>
      <div className="space-y-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-700">Nejrychleji rostoucí stránky</h4>
        {!s.rust ? <Vynechano souhrn={s} oddil="rust" /> : (
          <Tabulka hlavicka={['Stránka', 'Zobrazení', 'Minulý týden']} cisla={[1, 2]}>
            {s.rust.slice(0, 5).map((r) => <tr key={r.stranka}><Td trida="break-all">{r.stranka}</Td><Td vpravo>{cislo(r.zobrazeni)}</Td><Td vpravo>{cislo(r.minulyTyden)}</Td></tr>)}
          </Tabulka>
        )}
      </div>
      <div className="space-y-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-700">Události</h4>
        {!s.udalostiAkce && !s.udalostiKategorie ? <Vynechano souhrn={s} oddil="udalosti_akce" /> : (
          <Tabulka hlavicka={['Akce nebo kategorie', 'Druh', 'Počet']} cisla={[2]}>
            {udalosti.map((r) => (
              <tr key={`${r.druh}-${r.nazev}`}><Td trida="break-all">{r.nazev}</Td><Td trida="text-slate-500">{r.druh}</Td><Td vpravo>{cislo(r.pocet)}</Td></tr>
            ))}
          </Tabulka>
        )}
      </div>
      <div className="space-y-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-700">Rychlost u skutečných uživatelů (CrUX)</h4>
        {!s.rychlost ? <p className="text-sm text-slate-500">Oddíl v souhrnu chybí.</p> : 'vynechano' in s.rychlost ? <p className="text-sm text-slate-500">Oddíl vynechán: {s.rychlost.vynechano}.</p> : (
          <>
            <p className="text-xs text-slate-500">Percentil p75 za klouzavých 28 dní{rychlost?.obdobi ? ` (${rychlost.obdobi})` : ''}, barva podle prahů Googlu. Mezitýdenní srovnání z toho nejde.</p>
            {sDaty.length > 0 && (
              <Tabulka hlavicka={['Stránka', 'Zařízení', 'LCP', 'INP', 'CLS']} cisla={[2, 3, 4]}>
                {sDaty.map((r) => (
                  <tr key={`${r.typ}-${r.zarizeni}`}>
                    <Td>{r.typ}</Td><Td>{r.zarizeni}</Td>
                    <Td vpravo><Metrika hodnota={r.lcp} hodnoceni={r.hodnoceni.lcp} /></Td>
                    <Td vpravo><Metrika hodnota={r.inp} hodnoceni={r.hodnoceni.inp} /></Td>
                    <Td vpravo><Metrika hodnota={r.cls} hodnoceni={r.hodnoceni.cls} cls /></Td>
                  </tr>
                ))}
              </Tabulka>
            )}
            {bezDat.length > 0 && <p className="text-xs text-slate-500">Bez dat (málo návštěv z Chromu): {bezDat.join(', ')}.</p>}
          </>
        )}
      </div>
    </div>
  );
}

/** Řádek seznamu týdnů; stejné sloupce jako hlavička, rozbalí se na podrobnosti. */
function RadekTydne({ t, otevreny }: { t: TydenSignalu; otevreny: boolean }) {
  const s = t.souhrn;
  const bunky = (
    <>
      <span>{s ? `${datumTydne(s.od)} až ${den(s.do)}` : `běh ${formatDatumCasCz(t.spusteno)}`}</span>
      <span className="text-right">{s?.navstevy ? cislo(s.navstevy.navstevy) : '—'}</span>
      <span className="text-right">{s?.navstevy ? cislo(s.navstevy.zobrazeni) : '—'}</span>
      <span className="text-right">{s?.hledaniBezVysledku ? `${cislo(s.hledaniBezVysledku.navstevy)} (${cislo(s.hledaniBezVysledku.vyrazu)} výr.)` : '—'}</span>
      <span className="min-w-0">
        <a href={t.odkaz} target="_blank" rel="noopener" className="underline">běh</a>
        {t.poznamka && <span className="text-amber-800"> · {t.poznamka}</span>}
      </span>
    </>
  );
  const radek = `${SLOUPCE_TYDNU} border-b border-slate-100 px-2 py-1 text-sm tabular-nums`;
  if (!s) return <div className={radek}>{bunky}</div>;
  return (
    <details open={otevreny}>
      <summary className={`${radek} cursor-pointer list-none hover:bg-slate-50 [&::-webkit-details-marker]:hidden`}>{bunky}</summary>
      <div className="border-b border-slate-100 px-2 py-3"><TydenSignaluDetail s={s} /></div>
    </details>
  );
}

export default async function ProvozPage() {
  await vyzadujAdmina();
  const [p, signaly] = await Promise.all([nactiProvoz(), nactiSignaly()]);
  const prvniSouhrn = signaly.tydny.findIndex((t) => t.souhrn);
  const stavy = p.trasy ? stavTras(p.trasy).sort((a, b) => PORADI_STAVU[a.stav] - PORADI_STAVU[b.stav]) : null;
  const tydny = p.slouceno ? tydnyPodleRezimu(p.slouceno) : null;
  const kvalita = p.slouceno && p.regrese ? kvalitaPoTydnech(p.slouceno, p.regrese) : null;
  const tento = tydny?.[tydny.length - 1];
  const minuly = tydny?.[tydny.length - 2];
  const medianHodin = p.slouceno && tento ? median(p.slouceno.filter((r) => r.tyden === tento.tyden).map((r) => r.hodinDoSlouceni)) : null;
  const tras_problem = stavy?.filter((s) => s.stav === 'chyba' || s.stav === 'běží řídce').length ?? null;
  const ceka_stare = p.ceka?.filter((r) => r.cekaDni > STARE_DNI).length ?? null;
  const regreseTyden = p.regrese && tento ? p.regrese.filter((r) => r.tyden === tento.tyden).length : null;
  const rezimy = tydny ? POREDI_REZIMU.filter((z) => tydny.some((t) => t.pocty[z])) : [];
  const maxTyden = tydny ? Math.max(1, ...tydny.map((t) => t.celkem)) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          <div>
            <a href="/admin" className="text-sm text-slate-500 underline">Administrace</a>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">Provoz projektu</h1>
            <p className="text-sm text-slate-600 mt-1">
              Stav k {formatDatumCasCz(new Date(p.ted).toISOString())} UTC, data z GitHubu se obnovují nejpozději po 10 minutách.
              {p.ceka && ` Na tebe čeká ${cislo(p.ceka.length)} věcí, z toho ${cislo(ceka_stare ?? 0)} déle než ${STARE_DNI} dny.`}
              {tras_problem !== null && ` Problém hlásí ${cislo(tras_problem)} tras.`}
            </p>
            {p.chyby.length > 0 && <p className="mt-2 text-xs text-amber-800">Nenačteno: {p.chyby.join('; ')}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Dlazdice popis="Čeká na tebe" hodnota={p.ceka ? cislo(p.ceka.length) : '—'} pod="věcí k rozhodnutí" zle={(ceka_stare ?? 0) > 0} />
            <Dlazdice popis="Trasy s problémem" hodnota={tras_problem === null ? '—' : cislo(tras_problem)} pod={stavy ? `z ${cislo(stavy.length)} sledovaných` : ''} zle={(tras_problem ?? 0) > 0} />
            <Dlazdice popis="Sloučeno tento týden" hodnota={tento ? cislo(tento.celkem) : '—'} pod={minuly ? `minulý týden ${cislo(minuly.celkem)}` : ''} />
            <Dlazdice popis="Od otevření po sloučení" hodnota={medianHodin === null ? '—' : `${desetiny(medianHodin)} h`} pod="medián, tento týden" />
            <Dlazdice popis="Regrese tento týden" hodnota={regreseTyden === null ? '—' : cislo(regreseTyden)} pod="z ověření v produkci" zle={(regreseTyden ?? 0) > 0} />
          </div>

          <Sekce id="ceka" titulek="1. Čeká něco na mě?" otazka={`Rozhodnutí, která AI udělat nesmí. Červeně to, co čeká déle než ${STARE_DNI} dny.`}>
            {!p.ceka ? <Nedostupne /> : (
              <div className="grid md:grid-cols-3 gap-3">
                <Karta titulek="Podle druhu">
                  <Tabulka hlavicka={['Druh', 'Počet', 'Nejstarší (dní)']} cisla={[1, 2]}>
                    {cekaniPodleDruhu(p.ceka).map((r) => (
                      <tr key={r.druh}><Td>{r.druh}</Td><Td vpravo>{cislo(r.pocet)}</Td><Td vpravo trida={r.nejstarsiDni > STARE_DNI ? 'text-red-700' : ''}>{desetiny(r.nejstarsiDni)}</Td></tr>
                    ))}
                  </Tabulka>
                </Karta>
                <Karta titulek="Seznam" poznamka="Číslo vede na PR nebo issue, kam přidat schvaleno nebo odpovědět." siroka>
                  <Tabulka hlavicka={['Druh', 'Číslo', 'Co', 'Čeká (dní)']} cisla={[3]}>
                    {[...p.ceka].sort((a, b) => b.cekaDni - a.cekaDni).map((r) => (
                      <tr key={`${r.druh}-${r.cislo}`}>
                        <Td>{r.druh}</Td>
                        <Td><a href={r.odkaz} target="_blank" rel="noopener" className="underline">#{r.cislo}</a></Td>
                        <Td>{r.titulek}</Td>
                        <Td vpravo trida={r.cekaDni > STARE_DNI ? 'text-red-700' : ''}>{desetiny(r.cekaDni)}</Td>
                      </tr>
                    ))}
                  </Tabulka>
                </Karta>
              </div>
            )}
          </Sekce>

          <Sekce id="stroj" titulek="2. Běží stroj?" otazka="Každá automatická trasa: kolikrát za posledních 24 hodin běžela proti plánu a kdy naposledy uspěla.">
            {!stavy ? <Nedostupne /> : (
              <Karta titulek="Trasy" poznamka="Chyba: poslední běh selhal, nebo trasa mlčí déle než dvojnásobek svého intervalu. Běží řídce: méně než polovina plánovaných běhů.">
                <Tabulka hlavicka={['Trasa', 'Stav', 'Proč']}>
                  {stavy.map((s) => (
                    <tr key={s.trasa}>
                      <Td>{s.trasa}</Td>
                      <Td><span className={`inline-block rounded border px-1.5 text-xs whitespace-nowrap ${STAV_TRIDA[s.stav]}`}>{s.stav}</span></Td>
                      <Td trida="text-slate-500">{s.popis}</Td>
                    </tr>
                  ))}
                </Tabulka>
              </Karta>
            )}
          </Sekce>

          <Sekce id="dodava" titulek="3. Dodává?" otazka="Sloučené změny podle režimu brány a co drží otevřené PR.">
            <div className="grid md:grid-cols-2 gap-3">
              <Karta titulek="Sloučené PR po týdnech" poznamka="Posledních 28 dní, týden od pondělí. „Bez brány“ jsou PR sloučené před jejím zavedením 3. 10." siroka>
                {!tydny ? <Nedostupne /> : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      {rezimy.map((z) => <span key={z}><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm ${BARVA_REZIMU[z]}`} />{z}</span>)}
                    </div>
                    {tydny.map((t) => (
                      <div key={t.tyden} className="flex items-center gap-2 text-sm">
                        <span className="w-20 shrink-0 text-slate-500">od {den(t.tyden)}</span>
                        <div className="flex h-5 flex-1 overflow-hidden rounded bg-slate-100" role="img" aria-label={`týden od ${den(t.tyden)}: ${rezimy.filter((z) => t.pocty[z]).map((z) => `${z} ${t.pocty[z]}`).join(', ')}`}>
                          {rezimy.filter((z) => t.pocty[z]).map((z) => (
                            <div key={z} className={BARVA_REZIMU[z]} style={{ width: `${(t.pocty[z] / maxTyden) * 100}%` }} title={`${z}: ${t.pocty[z]}`} />
                          ))}
                        </div>
                        <span className="w-10 shrink-0 text-right tabular-nums">{cislo(t.celkem)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Karta>
              <Karta titulek="Otevřené PR" poznamka="Na co čekají a jak dlouho se nepohnuly. Červeně přes 48 hodin." siroka>
                {!p.fronta ? <Nedostupne /> : p.fronta.length === 0 ? <p className="text-sm text-slate-500">Žádný otevřený PR.</p> : (
                  <Tabulka hlavicka={['Číslo', 'PR', 'Režim', 'Čeká na', 'Bez pohybu (h)']} cisla={[4]}>
                    {[...p.fronta].sort((a, b) => b.hodinBezPohybu - a.hodinBezPohybu).map((r) => (
                      <tr key={r.cislo}>
                        <Td><a href={r.odkaz} target="_blank" rel="noopener" className="underline">#{r.cislo}</a></Td>
                        <Td>{r.titulek}</Td>
                        <Td>{r.rezim}</Td>
                        <Td trida={r.cekaNa === 'tvůj souhlas' ? 'text-amber-800' : ''}>{r.cekaNa}</Td>
                        <Td vpravo trida={r.hodinBezPohybu > 48 ? 'text-red-700' : ''}>{desetiny(r.hodinBezPohybu)}</Td>
                      </tr>
                    ))}
                  </Tabulka>
                )}
              </Karta>
            </div>
          </Sekce>

          <Sekce id="kvalita" titulek="4. Je to dobré?" otazka="Regrese z ověření v produkci a vrácené změny proti počtu sloučených. Měřítko z návrhu řízení: nejvýš 1 z 10.">
            {!kvalita ? <Nedostupne /> : (
              <Karta titulek="Po týdnech" poznamka="Nula regresí znamená jen to, že ověření nenašlo nesplněné kritérium zadání. Chyby mimo kritéria nezachytí.">
                <Tabulka hlavicka={['Týden od', 'Sloučeno', 'Regrese', 'Vráceno', 'Podíl']} cisla={[1, 2, 3, 4]}>
                  {kvalita.map((r) => (
                    <tr key={r.tyden}>
                      <Td>{den(r.tyden)}</Td><Td vpravo>{cislo(r.slouceno)}</Td><Td vpravo>{cislo(r.regrese)}</Td><Td vpravo>{cislo(r.vraceni)}</Td>
                      <Td vpravo trida={r.podil > 0.1 ? 'text-red-700' : ''}>{Math.round(r.podil * 100)} %</Td>
                    </tr>
                  ))}
                </Tabulka>
              </Karta>
            )}
          </Sekce>

          <Sekce id="smer" titulek="5. Jde to správným směrem?" otazka="Otevřené projekty, hlášení a týdenní signály z návštěvnosti a rychlosti webu (#326).">
            <div className="grid md:grid-cols-2 gap-3">
              <Karta titulek="Projekty" poznamka="Hotové připojené úkoly a dny bez pohybu (červeně přes 14). Projekt bez schvaleno čeká na tebe.">
                {!p.projekty ? <Nedostupne /> : (
                  <Tabulka hlavicka={['Číslo', 'Projekt', 'Hotovo', 'Bez pohybu (dní)']} cisla={[2, 3]}>
                    {[...p.projekty].sort((a, b) => b.dniBezPohybu - a.dniBezPohybu).map((r) => (
                      <tr key={r.cislo}>
                        <Td><a href={r.odkaz} target="_blank" rel="noopener" className="underline">#{r.cislo}</a></Td>
                        <Td>{r.titulek}{!r.schvaleno && <span className="text-amber-800"> (bez schvaleno)</span>}</Td>
                        <Td vpravo>{r.celkem ? `${cislo(r.hotovo)} z ${cislo(r.celkem)}` : '—'}</Td>
                        <Td vpravo trida={r.dniBezPohybu > 14 ? 'text-red-700' : ''}>{desetiny(r.dniBezPohybu)}</Td>
                      </tr>
                    ))}
                  </Tabulka>
                )}
              </Karta>
              <Karta titulek="Hlášení" poznamka="Hlášení škol vyřizuje rutina sama (RA52), hlášení veřejnosti čekají na tvoje schvaleno.">
                {!p.hlaseni ? <Nedostupne /> : (
                  <Tabulka hlavicka={['Od koho', 'Otevřeno', 'Bez schvaleno', 'Nejstarší (dní)']} cisla={[1, 2, 3]}>
                    {hlaseniPodlePuvodu(p.hlaseni).map((r) => (
                      <tr key={r.od}>
                        <Td>{r.od}</Td><Td vpravo>{cislo(r.otevreno)}</Td><Td vpravo>{cislo(r.bezSchvaleni)}</Td>
                        <Td vpravo trida={r.nejstarsiDni > STARE_DNI && r.bezSchvaleni > 0 ? 'text-red-700' : ''}>{desetiny(r.nejstarsiDni)}</Td>
                      </tr>
                    ))}
                  </Tabulka>
                )}
              </Karta>
            </div>
            <Karta titulek="Signály týdně" poznamka="Z artefaktu workflow Signály týdně na main, nejvýš 13 posledních běhů. Návštěvy a zobrazení stránek z Matomu za týden od pondělí do neděle. Hledání bez výsledku: počet návštěv, ve kterých hledání na webu nic nenašlo, a počet různých výrazů; samotné výrazy se sem nepřenášejí. Klikni na týden pro podrobnosti.">
              {signaly.poznamka && <p className="text-sm text-amber-800">{signaly.poznamka}</p>}
              {signaly.tydny.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="min-w-[44rem]">
                    <div className={`${SLOUPCE_TYDNU} border-b border-slate-200 px-2 py-1 text-sm font-medium text-slate-500`}>
                      <span>Týden</span><span className="text-right">Návštěvy</span><span className="text-right">Zobrazení</span><span className="text-right">Hledání bez výsl.</span><span>Běh</span>
                    </div>
                    {signaly.tydny.map((t, i) => <RadekTydne key={t.behId} t={t} otevreny={i === prvniSouhrn} />)}
                  </div>
                </div>
              )}
            </Karta>
          </Sekce>

          <Sekce id="naklady" titulek="6. Kolik to stojí?" otazka="Náklady AI proti rozpočtu košů.">
            <Karta titulek="Náklady AI" poznamka="Zdroj zatím chybí: cenu běhu rutiny zná jen Claude Code a Kimi běží přes předplatné bez ceny za úlohu.">
              <p className="text-sm text-slate-500">Bez údajů.</p>
            </Karta>
          </Sekce>
        </div>
      </main>
      <Footer />
    </div>
  );
}
