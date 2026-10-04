'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KriteriaSkoly, OborProKriteria, Predvyplneni } from '@/lib/portal-kriteria';
import { nazevZdrojeKriterii, odkazNaPodklad, stavKriterii, type DolozenePravidlo } from '@/lib/kriteria-stav';
import {
  DRUHY_SLOZEK, NA_CO_MINIMUM, ROVNOST_NABIDKA, jeFormularRozpracovan, overStrukturu, prazdnaStruktura, souhrnBodovani,
  type DruhSlozky, type MinimumKriterii, type StrukturaKriterii,
} from '@/lib/kriteria-struktura';

interface Props {
  redizo: string;
  /** Ročníky z registru (sada dipsy-kriteria), nejnovější první. */
  roky: number[];
  nabidky: Record<number, OborProKriteria[]>;
  ulozena: KriteriaSkoly[];
  podklady: DolozenePravidlo[];
  /** Klíč oboru → návrh ze strojového přepisu PDF. */
  predvyplneni: Record<string, Predvyplneni>;
  dostupne: boolean;
}

const datum = (hodnota: string) => new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeZone: 'Europe/Prague' }).format(new Date(hodnota));
const body = (n: number | null) => n === null ? '?' : n.toLocaleString('cs-CZ');
const POLE = 'mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm';

/** Číslo z pole formuláře; prázdné = null, desetinná čárka povolena. */
function cisloZPole(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const naText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

function CisloPole({ label, value, onChange, napoveda, min, placeholder }: {
  label: string; value: number | null; onChange: (n: number | null) => void; napoveda?: string; min?: number; placeholder?: string;
}) {
  const [text, setText] = useState(naText(value));
  const [videno, setVideno] = useState(value);
  // Hodnota se změnila zvenčí (předvyplnění, kopie): přepsat i text pole.
  if (value !== videno) { setVideno(value); setText(naText(value)); }
  const n = cisloZPole(text);
  const chyba = text.trim() !== '' && (n === null || (min !== undefined && n < min));
  // Neplatný text nesmí projít jako „neznámé maximum“: nativní validita zablokuje odeslání.
  const pole = useRef<HTMLInputElement>(null);
  useEffect(() => { pole.current?.setCustomValidity(chyba ? `${label}: zadejte číslo.` : ''); }, [chyba, label]);
  return (
    <label className="block text-sm font-medium text-slate-700">{label}
      <input ref={pole} inputMode="decimal" value={text} placeholder={placeholder} aria-invalid={chyba}
        onChange={(e) => { setText(e.target.value); const m = cisloZPole(e.target.value); setVideno(m); onChange(m); }}
        className={`${POLE} ${chyba ? 'border-red-500' : ''}`} />
      {chyba && <span className="mt-1 block text-xs text-red-700">Zadejte číslo{min !== undefined ? ` od ${naText(min)}` : ''}.</span>}
      {napoveda && !chyba && <span className="mt-1 block text-xs font-normal text-slate-500">{napoveda}</span>}
    </label>
  );
}

export function PortalKriteriaForm({ redizo, roky, nabidky, ulozena, podklady, predvyplneni, dostupne }: Props) {
  const rokNovy = roky[0];
  const [rok, setRok] = useState(rokNovy);
  const [oborKlic, setOborKlic] = useState(nabidky[rokNovy]?.[0]?.klic ?? '');
  const [vsechnaKola, setVsechnaKola] = useState(true);
  const [kolo, setKolo] = useState(1);
  const [zaznamy, setZaznamy] = useState(ulozena);

  const vychozi = (r: number, klic: string, cisloKola: number | null) => {
    const zaznam = zaznamy.find((z) => z.rok === r && z.obor_klic === klic && z.kolo === cisloKola);
    return { struktura: zaznam?.struktura ?? null, popis: zaznam?.popis ?? '', odkaz: zaznam?.odkaz ?? '' };
  };
  const [prvni] = useState(() => vychozi(rokNovy, nabidky[rokNovy]?.[0]?.klic ?? '', null));
  const [struktura, setStruktura] = useState<StrukturaKriterii | null>(prvni.struktura);
  const [popis, setPopis] = useState(prvni.popis);
  const [odkaz, setOdkaz] = useState(prvni.odkaz);
  const [zPrepisu, setZPrepisu] = useState(false);
  const [zkontrolovano, setZkontrolovano] = useState(false);
  const [stav, setStav] = useState<'klid' | 'odesilam' | 'ulozeno' | 'chyba'>('klid');
  const [zprava, setZprava] = useState('');
  const [kopieZ, setKopieZ] = useState('');

  const nabidka = nabidky[rok] ?? [];
  const obor = nabidka.find((o) => o.klic === oborKlic);
  const koloHodnota = vsechnaKola ? null : kolo;
  const soucasny = useMemo(() => zaznamy.find((z) => z.obor_klic === oborKlic && z.rok === rok && z.kolo === koloHodnota), [zaznamy, oborKlic, rok, koloHodnota]);
  const spolecny = zaznamy.find((z) => z.obor_klic === oborKlic && z.rok === rok && z.kolo === null);
  const vsechna = zaznamy.filter((z) => z.rok === rok && z.obor_klic === oborKlic).sort((a, b) => (a.kolo ?? 0) - (b.kolo ?? 0));
  const navrh = obor ? predvyplneni[obor.klic] : undefined;
  const maKartyNove = (nabidky[rokNovy] ?? []).some((o) => o.podkladRok === rokNovy);
  const keSparovani = maKartyNove ? zaznamy.filter((z) =>
    z.rok === rokNovy && z.podklad_rok < rokNovy &&
    !(nabidky[rokNovy] ?? []).some((o) => o.podkladRok === rokNovy && o.klic === z.obor_klic)) : [];
  const stavPravidel = useMemo(() => stavKriterii([
    ...zaznamy.map((z): DolozenePravidlo => ({
      id: z.id, oborKlic: z.obor_klic, rok: z.rok, kolo: z.kolo, rezim: z.rezim,
      popis: z.popis, zdroj: 'skola', zdrojUrl: z.odkaz,
      zjistenoAt: z.platne_od, publikovanoAt: null, overenoAt: null,
    })),
    ...podklady,
  ], oborKlic, rok, koloHodnota), [zaznamy, podklady, oborKlic, rok, koloHodnota]);

  // Kopírovat jde z uložených pravidel jiného zaměření, kola nebo předchozího roku.
  const kopirovatelne = zaznamy.filter((z) => z.struktura && !(z.obor_klic === oborKlic && z.rok === rok && z.kolo === koloHodnota));
  const popisZaznamu = (z: KriteriaSkoly) => {
    const o = (nabidky[z.rok] ?? []).find((x) => x.klic === z.obor_klic);
    const nazev = o ? `${o.kkov} ${o.nazev}${o.zamereni ? ` – ${o.zamereni}` : ''}` : (z.obor_identita?.kkov ?? 'obor');
    return `${nazev}, ${z.rok}, ${z.kolo === null ? 'všechna kola' : `${z.kolo}. kolo`}`;
  };

  // Neuložená změna: formulář se liší od záznamu této kombinace (nebo od prázdného formuláře).
  const rozpracovano = jeFormularRozpracovan(vychozi(rok, oborKlic, koloHodnota), { struktura, popis, odkaz }, obor?.konaJPZ === false);
  // Po zrušení se ovládací prvky překreslí (nový klíč), aby se vrátily na hodnotu, kterou drží state.
  const [obnova, setObnova] = useState(0);
  const smiZahodit = () => {
    if (!rozpracovano || window.confirm('Máte neuložené změny. Opravdu je chcete zahodit?')) return true;
    setObnova((n) => n + 1);
    return false;
  };

  useEffect(() => {
    if (!rozpracovano) return;
    const hlidej = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', hlidej);
    return () => window.removeEventListener('beforeunload', hlidej);
  }, [rozpracovano]);

  const nastav = (r: number, klic: string, cisloKola: number | null) => {
    const v = vychozi(r, klic, cisloKola);
    setStruktura(v.struktura);
    setPopis(v.popis);
    setOdkaz(v.odkaz);
    setZPrepisu(false);
    setZkontrolovano(false);
    setKopieZ('');
    setStav('klid');
    setZprava('');
  };

  const otevri = (z: KriteriaSkoly) => {
    if (stav === 'odesilam' || !smiZahodit()) return;
    setRok(z.rok);
    setOborKlic(z.obor_klic);
    setVsechnaKola(z.kolo === null);
    if (z.kolo !== null) setKolo(z.kolo);
    nastav(z.rok, z.obor_klic, z.kolo);
  };

  const zmenRok = (novy: number) => {
    if (!smiZahodit()) return;
    setRok(novy);
    const klic = (nabidky[novy] ?? []).find((o) => o.klic === oborKlic)?.klic ?? nabidky[novy]?.[0]?.klic ?? '';
    setOborKlic(klic);
    nastav(novy, klic, koloHodnota);
  };

  const pouzijNavrh = () => {
    if (!navrh || stav === 'odesilam' || !smiZahodit()) return;
    setStruktura(structuredClone(navrh.struktura));
    setZPrepisu(true);
    setZkontrolovano(false);
  };

  const zkopiruj = (id: string) => {
    const z = zaznamy.find((x) => x.id === id);
    if (!z?.struktura || stav === 'odesilam' || !smiZahodit()) return;
    setStruktura(structuredClone(z.struktura));
    setPopis(z.popis);
    setOdkaz(z.odkaz);
    setZPrepisu(false);
    setKopieZ(id);
  };

  const s = struktura;
  const zmen = (f: (x: StrukturaKriterii) => void) => setStruktura((old) => {
    const nove = structuredClone(old ?? prazdnaStruktura());
    f(nove);
    return nove;
  });
  const souhrn = s ? souhrnBodovani(s) : null;
  let chybaStruktury = '';
  if (s) { try { overStrukturu(s); } catch (e) { chybaStruktury = e instanceof Error ? e.message : 'Zkontrolujte údaje.'; } }

  const odesli = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!s) return;
    const vyber = `${rok}|${oborKlic}|${koloHodnota}`;
    setStav('odesilam');
    setZprava('');
    try {
      const response = await fetch('/api/portal/kriteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redizo, oborKlic, rok, kolo: koloHodnota, struktura: s, popis, odkaz,
          podkladRok: obor?.podkladRok, zdrojId: obor?.zdrojId,
          zdrojTyp: obor?.zdrojTyp, ocekavaneId: soucasny?.id ?? null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Zápis se nepodařil.');
      const saved = data.kriterium as KriteriaSkoly;
      setZaznamy((old) => [...old.filter((z) => !(z.obor_klic === saved.obor_klic && z.rok === saved.rok && z.kolo === saved.kolo)), saved]);
      // Výběr je během ukládání zamčený; kontrola jen pojistka, ať odpověď nepatří jinam.
      if (`${saved.rok}|${saved.obor_klic}|${saved.kolo}` !== vyber) return;
      // Formulář se srovná s uloženým záznamem (server ho mohl upravit), aby se po uložení neukazovala neuložená změna.
      setStruktura(saved.struktura);
      setPopis(saved.popis ?? '');
      setOdkaz(saved.odkaz ?? '');
      setZPrepisu(false);
      setStav('ulozeno');
      setZprava('Pravidla jsme uložili k vybranému oboru, ročníku a rozsahu kol.');
    } catch (error) {
      setStav('chyba');
      setZprava(error instanceof Error ? error.message : 'Zápis se nepodařil.');
    }
  };

  const posun = (i: number, o: number) => zmen((x) => {
    const j = i + o;
    if (j < 0 || j >= x.rovnost.length) return;
    [x.rovnost[i], x.rovnost[j]] = [x.rovnost[j], x.rovnost[i]];
  });

  const vyberKopie = kopirovatelne.length > 0 && <label className="block text-sm text-slate-700">{s ? 'Zkopírovat z uloženého (přepíše formulář):' : 'Nebo zkopírovat z uloženého:'}
    <select key={`kopie${obnova}`} value={kopieZ} onChange={(e) => zkopiruj(e.target.value)} className={POLE}>
      <option value="">vyberte obor, rok a kolo…</option>
      {kopirovatelne.map((z) => <option key={z.id} value={z.id}>{popisZaznamu(z)}</option>)}
    </select>
  </label>;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="kriteria-nadpis">
      <h2 id="kriteria-nadpis" className="text-lg font-semibold text-slate-900">Bodování po oborech</h2>
      <p className="mt-2 text-sm text-slate-600">U každého oboru a ročníku zadejte, za co a kolik bodů uchazeč dostane. Pravidla můžou platit pro všechna kola, nebo jen pro konkrétní kolo; pravidlo kola má přednost.</p>
      <p className="mt-2 text-sm text-slate-600">Uložené bodování se uchazečům zobrazí na stránce oboru u oborů, které na webu vedeme.</p>
      {keSparovani.length > 0 && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <strong>Plánované záznamy vyžadují kontrolu párování s kartami {rokNovy}.</strong>
        <ul className="mt-1 list-disc pl-5">{keSparovani.map((z) => <li key={z.id}>
          {z.obor_identita?.kkov ?? 'Obor bez uložených složek klíče'}{z.obor_identita?.zamereni ? ` · ${z.obor_identita.zamereni}` : ''}, {z.kolo === null ? 'všechna kola' : `${z.kolo}. kolo`}. Pravidlo se do nové nabídky nepřenáší automaticky.
        </li>)}</ul>
      </div>}
      {!dostupne && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Databázová část pilotu zatím není připravená. Formulář nyní nelze uložit.</p>}
      {zaznamy.length > 0 && <nav aria-label="Uložené kombinace" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold">Uložené kombinace ({zaznamy.length})</p>
        <ul className="mt-2 space-y-1">
          {[...zaznamy].sort((a, b) => b.rok - a.rok || popisZaznamu(a).localeCompare(popisZaznamu(b), 'cs')).map((z) => {
            const aktualni = z.rok === rok && z.obor_klic === oborKlic && z.kolo === koloHodnota;
            const vNabidce = (nabidky[z.rok] ?? []).some((o) => o.klic === z.obor_klic);
            return <li key={z.id}>
              <button type="button" onClick={() => otevri(z)} disabled={aktualni || !vNabidce || stav === 'odesilam'} aria-current={aktualni ? 'true' : undefined}
                title={vNabidce ? undefined : 'Obor už není v nabídce tohoto ročníku.'}
                className="text-left text-blue-700 underline disabled:text-slate-500 disabled:no-underline">
                {popisZaznamu(z)}{z.struktura ? '' : ' · jen text'}{aktualni ? ' (otevřeno)' : ''}
              </button>
            </li>;
          })}
        </ul>
      </nav>}
      <form onSubmit={odesli} className="mt-5 space-y-6">
        <fieldset disabled={stav === 'odesilam'} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <label className="block text-sm font-medium text-slate-700">Rok přijímání
            <select key={`rok${obnova}`} value={rok} onChange={(e) => zmenRok(Number(e.target.value))} className={POLE}>
              {roky.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Obor a zaměření
            <select key={`obor${obnova}`} value={oborKlic} onChange={(e) => { if (!smiZahodit()) return; setOborKlic(e.target.value); nastav(rok, e.target.value, koloHodnota); }} required className={POLE}>
              {nabidka.map((o) => <option key={o.klic} value={o.klic}>{o.kkov} · {o.nazev}{o.zamereni ? ` – ${o.zamereni}` : ''}</option>)}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Pravidla platí pro</legend>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input key={`vse${obnova}`} type="radio" checked={vsechnaKola} onChange={() => { if (!smiZahodit()) return; setVsechnaKola(true); nastav(rok, oborKlic, null); }} />všechna kola</label>
            <label className="flex items-center gap-2"><input key={`kolo${obnova}`} type="radio" checked={!vsechnaKola} onChange={() => { if (!smiZahodit()) return; setVsechnaKola(false); nastav(rok, oborKlic, kolo); }} />jen kolo</label>
            {!vsechnaKola && <select key={`cislo${obnova}`} aria-label="Číslo kola" value={kolo} onChange={(e) => { if (!smiZahodit()) return; const n = Number(e.target.value); setKolo(n); nastav(rok, oborKlic, n); }} className="rounded-lg border border-slate-300 p-2">
              {[1, 2, 3].map((k) => <option key={k} value={k}>{k}.</option>)}
            </select>}
          </div>
          {!vsechnaKola && !soucasny && spolecny && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Pro {kolo}. kolo teď platí pravidla pro všechna kola. Uložením vytvoříte výjimku pro toto kolo.</p>}
        </fieldset>
        {obor && obor.podkladRok !== rok && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Tento obor známe z nabídky {obor.podkladRok}. Pro rok {rok} jde zatím o plánované údaje; nabídku v DiPSy ještě nemáme potvrzenou.</p>}
        {obor && stavPravidel.stav !== 'nezname' && <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <summary className="cursor-pointer font-medium">Co o bodování tohoto oboru už víme</summary>
          {stavPravidel.stav === 'historicka' && <p className="mt-2">Pro rok {rok} pravidla potvrzená nemáme. V roce {stavPravidel.rok} {stavPravidel.pravidla[0].rezim === 'jine' ? 'škola bodovala i něco jiného než prostý součet JPZ' : 'škola bodovala prostý součet JPZ'}.</p>}
          {stavPravidel.stav === 'zmena_k_overeni' && <p className="mt-2">U podkladu pro rok {stavPravidel.rok} jsme zjistili novou verzi, kterou musí zkontrolovat redakce.</p>}
          {stavPravidel.stav === 'rozpor' && <p className="mt-2">Podklady pro rok {stavPravidel.rok} si odporují.</p>}
          <ul className="mt-2 space-y-1 text-slate-600">
            {stavPravidel.pravidla.map((p) => <li key={p.id}>
              Zdroj: {nazevZdrojeKriterii(p.zdroj)}; {p.zdroj === 'skola' ? 'zadáno' : 'získáno'} {datum(p.zjistenoAt)}{p.overenoAt ? `; ověřeno ${datum(p.overenoAt)}` : ''}{p.novaVerzeAt ? `; nová verze ${datum(p.novaVerzeAt)} čeká na kontrolu` : ''}.
              {odkazNaPodklad(p.zdrojUrl) && <> <a href={odkazNaPodklad(p.zdrojUrl) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Podklad</a></>}
              {p.popis && <p className="mt-1 whitespace-pre-wrap text-slate-800">{p.popis}</p>}
            </li>)}
          </ul>
        </details>}

        {obor && !s && <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
          <p className="font-medium">Jak chcete začít?</p>
          <div className="flex flex-wrap gap-2">
            {navrh && <button type="button" onClick={pouzijNavrh} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white">Předvyplnit z kritérií {navrh.rok}</button>}
            <button type="button" onClick={() => zmen((x) => { if (obor.konaJPZ === false) { x.jpz.cjl_max = 0; x.jpz.mat_max = 0; } })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800">Začít od prázdného</button>
          </div>
          {navrh && <p className="text-slate-600">Předvyplnění vychází z kritérií {navrh.rok}, která škola vložila do DiPSy; převedl je počítač.</p>}
          {vyberKopie}
        </div>}

        {s && <>
          {zPrepisu && <div role="alert" className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Zkontrolujte všechno níže: přepsal to počítač z kritérií {navrh?.rok}.</p>
            <p className="mt-1">Přepis bývá zhruba u každého desátého oboru podstatně chybný. Opravte čísla podle kritérií pro rok {rok}, doplňte, co chybí, a smažte, co u vás neplatí.</p>
            <label className="mt-2 flex items-start gap-2 font-medium"><input type="checkbox" checked={zkontrolovano} onChange={(e) => setZkontrolovano(e.target.checked)} className="mt-0.5" />Údaje jsem zkontroloval(a) podle kritérií pro rok {rok}.</label>
          </div>}
          {!zPrepisu && vyberKopie}

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-base font-semibold text-slate-900">Jednotná přijímací zkouška</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <CisloPole label="Maximum z češtiny" value={s.jpz.cjl_max} min={0} onChange={(n) => zmen((x) => { x.jpz.cjl_max = n; })} napoveda="Obvykle 50 bodů." />
              <CisloPole label="Maximum z matematiky" value={s.jpz.mat_max} min={0} onChange={(n) => zmen((x) => { x.jpz.mat_max = n; })} napoveda="Obvykle 50 bodů." />
              <CisloPole label="Přepočet bodů JPZ, %" value={s.jpz.prepoctovy_koeficient_pct} min={1} placeholder="bez přepočtu" onChange={(n) => zmen((x) => { x.jpz.prepoctovy_koeficient_pct = n; })} napoveda="Jen když se body JPZ násobí, např. 60 % ze 100 = 60 bodů." />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm font-medium text-slate-700">Vyšší váha jednoho předmětu
                <select value={s.jpz.vyssi_vaha?.predmet ?? ''} onChange={(e) => zmen((x) => {
                  const v = e.target.value;
                  x.jpz.vyssi_vaha = v === 'cjl' || v === 'mat' ? { predmet: v, nasobek: x.jpz.vyssi_vaha?.nasobek ?? 1.5 } : null;
                })} className={POLE}>
                  <option value="">ne, oba předměty stejně</option>
                  <option value="mat">matematika</option>
                  <option value="cjl">čeština</option>
                </select>
              </label>
              {s.jpz.vyssi_vaha && <div className="w-40"><CisloPole label="Násobek" value={s.jpz.vyssi_vaha.nasobek} min={0.1} onChange={(n) => zmen((x) => { if (x.jpz.vyssi_vaha) x.jpz.vyssi_vaha.nasobek = n ?? 0; })} napoveda="Např. 1,5." /></div>}
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-base font-semibold text-slate-900">Další body</legend>
            <p className="text-sm text-slate-600">Všechno, co se boduje kromě JPZ: prospěch, školní zkouška, soutěže… Srážku (například za chování) zadejte se záporným maximem. Když maximum neznáte, nechte pole prázdné.</p>
            {s.slozky.length === 0 && <p className="text-sm text-slate-500">Žádné další body: boduje se jen JPZ.</p>}
            <ol className="space-y-3">
              {s.slozky.map((x, i) => <li key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[12rem_1fr_7rem_auto] sm:items-end">
                <label className="block text-sm font-medium text-slate-700">Druh
                  <select value={x.druh} onChange={(e) => zmen((y) => { y.slozky[i].druh = e.target.value as DruhSlozky; })} className={POLE}>
                    {DRUHY_SLOZEK.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">Za co přesně
                  <input value={x.nazev} maxLength={300} onChange={(e) => zmen((y) => { y.slozky[i].nazev = e.target.value; })} placeholder="např. průměr z 8. a 9. třídy" className={POLE} />
                </label>
                <CisloPole label="Max. bodů" value={x.max} onChange={(n) => zmen((y) => { y.slozky[i].max = n; })} />
                <button type="button" onClick={() => zmen((y) => { y.slozky.splice(i, 1); })} className="rounded-lg px-2 py-2 text-sm text-red-700 hover:bg-red-50" aria-label={`Odebrat řádek ${i + 1}`}>Odebrat</button>
                <label className="block text-sm text-slate-600 sm:col-span-4">Poznámka (nepovinná)
                  <input value={x.poznamka} maxLength={300} onChange={(e) => zmen((y) => { y.slozky[i].poznamka = e.target.value; })} placeholder="např. průměr 1,0 = 20 bodů, každá desetina −1 bod" className={POLE} />
                </label>
              </li>)}
            </ol>
            <button type="button" onClick={() => zmen((y) => { y.slozky.push({ druh: 'prospech', nazev: '', max: null, poznamka: '' }); })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800">+ Přidat další body</button>
          </fieldset>

          {souhrn && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800" aria-live="polite">
            <p className="font-semibold">Součet</p>
            <p className="mt-1">JPZ nejvýše {body(souhrn.jpzMax)} bodů, další body nejvýše {body(souhrn.ostatniMax)}, celkem {body(souhrn.celkem)} bodů.
              {souhrn.podilJpzPct !== null && <> Přijímačky tvoří <b>{souhrn.podilJpzPct} %</b> bodů.</>}
              {souhrn.jenJpz ? ' Boduje se jen prostý součet JPZ.' : ''}</p>
            {souhrn.ostatniMax === null && <p className="mt-1 text-amber-900">U některých dalších bodů chybí maximum, proto celkový součet neznáme.</p>}
            <div className="mt-3 max-w-xs"><CisloPole label="Celkové maximum podle vyhlášených kritérií (pro kontrolu)" value={s.vyslovne_max_celkem} min={1} onChange={(n) => zmen((x) => { x.vyslovne_max_celkem = n; })} /></div>
            {souhrn.rozdilProtiVyhlasenemu !== null && souhrn.rozdilProtiVyhlasenemu !== 0 && <p role="alert" className="mt-2 text-amber-900">Součet ({body(souhrn.celkem)}) se liší od vyhlášeného maxima ({body(s.vyslovne_max_celkem)}) o {body(Math.abs(souhrn.rozdilProtiVyhlasenemu))} bodů. Zkontrolujte maxima a přepočet.</p>}
          </div>}

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-base font-semibold text-slate-900">Minima</legend>
            <p className="text-sm text-slate-600">Hranice, pod kterou uchazeč nevyhoví, i když má jinak dost bodů.</p>
            <ol className="space-y-3">
              {s.minima.map((m, i) => <li key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[14rem_7rem_8rem_auto] sm:items-end">
                <label className="block text-sm font-medium text-slate-700">Čeho se týká
                  <select value={m.na_co} onChange={(e) => zmen((y) => { y.minima[i].na_co = e.target.value as MinimumKriterii['na_co']; })} className={POLE}>
                    {NA_CO_MINIMUM.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </label>
                <CisloPole label="Hodnota" value={m.hodnota} min={0} onChange={(n) => zmen((y) => { y.minima[i].hodnota = n; })} />
                <label className="block text-sm font-medium text-slate-700">Jednotka
                  <select value={m.jednotka} onChange={(e) => zmen((y) => { y.minima[i].jednotka = e.target.value === 'procenta' ? 'procenta' : 'body'; })} className={POLE}>
                    <option value="body">bodů</option><option value="procenta">% bodů</option>
                  </select>
                </label>
                <button type="button" onClick={() => zmen((y) => { y.minima.splice(i, 1); })} className="rounded-lg px-2 py-2 text-sm text-red-700 hover:bg-red-50" aria-label={`Odebrat minimum ${i + 1}`}>Odebrat</button>
                <label className="block text-sm text-slate-600 sm:col-span-4">Upřesnění (nepovinné)
                  <input value={m.popis} maxLength={300} onChange={(e) => zmen((y) => { y.minima[i].popis = e.target.value; })} className={POLE} />
                </label>
              </li>)}
            </ol>
            <button type="button" onClick={() => zmen((y) => { y.minima.push({ na_co: 'jpz_celkem', hodnota: null, jednotka: 'body', popis: '' }); })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800">+ Přidat minimum</button>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-base font-semibold text-slate-900">Při rovnosti bodů rozhoduje</legend>
            <ol className="space-y-2">
              {s.rovnost.map((r, i) => <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-right text-sm font-semibold text-slate-500">{i + 1}.</span>
                <input value={r} maxLength={200} aria-label={`Pravidlo při rovnosti ${i + 1}`} onChange={(e) => zmen((y) => { y.rovnost[i] = e.target.value; })} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm" />
                <button type="button" onClick={() => posun(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-sm disabled:opacity-30" aria-label={`Posunout pravidlo ${i + 1} výš`}>↑</button>
                <button type="button" onClick={() => posun(i, 1)} disabled={i === s.rovnost.length - 1} className="rounded px-2 py-1 text-sm disabled:opacity-30" aria-label={`Posunout pravidlo ${i + 1} níž`}>↓</button>
                <button type="button" onClick={() => zmen((y) => { y.rovnost.splice(i, 1); })} className="rounded px-2 py-1 text-sm text-red-700" aria-label={`Odebrat pravidlo ${i + 1}`}>Odebrat</button>
              </li>)}
            </ol>
            <div className="flex flex-wrap gap-2">
              {ROVNOST_NABIDKA.filter((r) => !s.rovnost.includes(r)).map((r) => <button key={r} type="button" onClick={() => zmen((y) => { y.rovnost.push(r); })} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">+ {r}</button>)}
              <button type="button" onClick={() => zmen((y) => { y.rovnost.push(''); })} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">+ vlastní pravidlo</button>
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-slate-700">Další pravidla a výjimky
            <textarea value={popis} onChange={(e) => setPopis(e.target.value)} maxLength={3000} rows={4} placeholder="Cokoli, co se do polí výše nevejde: zdravotní způsobilost, cizinci, výjimky, zvláštní přepočty…" className={POLE} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{popis.length} / 3000 znaků</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">Odkaz na vyhlášená kritéria, pokud už existují
            <input type="url" value={odkaz} onChange={(e) => setOdkaz(e.target.value)} maxLength={500} placeholder="https://…" className={POLE} />
          </label>
        </>}

        {vsechna.length > 0 && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Uložené rozsahy:</strong> {vsechna.map((v) => `${v.kolo === null ? 'všechna kola' : `${v.kolo}. kolo`}${v.podklad_rok < v.rok ? ' · plánované' : ''}${v.struktura ? '' : ' · jen text'}`).join('; ')}</div>}
        {nabidka.length === 0 && <p className="text-sm text-amber-900">V dostupných datech pro tuto školu nemáme žádný obor. Chybějící nabídku nám prosím pošlete přes „Nahlásit chybu“ spolu s rokem a kódem oboru.</p>}
        {chybaStruktury && <p role="alert" className="text-sm text-red-700">{chybaStruktury}</p>}
        {s && <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button type="submit" disabled={!dostupne || !obor || stav === 'odesilam' || Boolean(chybaStruktury) || (zPrepisu && !zkontrolovano)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{stav === 'odesilam' ? 'Ukládám…' : 'Uložit pravidla'}</button>
          {zPrepisu && !zkontrolovano && <span className="text-sm text-amber-900">Nejdřív potvrďte kontrolu předvyplněných údajů.</span>}
        </div>}
        </fieldset>
        {zprava && <p role="status" className={`text-sm ${stav === 'chyba' ? 'text-red-700' : 'text-green-800'}`}>{zprava}</p>}
      </form>
    </section>
  );
}
