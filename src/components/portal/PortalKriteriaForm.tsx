'use client';

import { useMemo, useState } from 'react';
import type { KriteriaSkoly, OborProKriteria, RezimKriterii } from '@/lib/portal-kriteria';
import { nazevZdrojeKriterii, odkazNaPodklad, stavKriterii, type DolozenePravidlo } from '@/lib/kriteria-stav';

interface Props {
  redizo: string;
  nabidky: Record<2026 | 2027, OborProKriteria[]>;
  ulozena: KriteriaSkoly[];
  podklady: DolozenePravidlo[];
  dostupne: boolean;
}

const datum = (hodnota: string) => new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeZone: 'Europe/Prague' }).format(new Date(hodnota));

export function PortalKriteriaForm({ redizo, nabidky, ulozena, podklady, dostupne }: Props) {
  const uvodni = ulozena.find((z) => z.rok === 2027 && z.obor_klic === nabidky[2027][0]?.klic && z.kolo === null);
  const [rok, setRok] = useState<2026 | 2027>(2027);
  const [oborKlic, setOborKlic] = useState(nabidky[2027][0]?.klic ?? '');
  const [vsechnaKola, setVsechnaKola] = useState(true);
  const [kolo, setKolo] = useState(1);
  const [rezim, setRezim] = useState<RezimKriterii | ''>(uvodni?.rezim ?? '');
  const [popis, setPopis] = useState(uvodni?.popis ?? '');
  const [odkaz, setOdkaz] = useState(uvodni?.odkaz ?? '');
  const [zaznamy, setZaznamy] = useState(ulozena);
  const [stav, setStav] = useState<'klid' | 'odesilam' | 'ulozeno' | 'chyba'>('klid');
  const [zprava, setZprava] = useState('');
  const nabidka = nabidky[rok];
  const obor = nabidka.find((o) => o.klic === oborKlic);
  const koloHodnota = vsechnaKola ? null : kolo;
  const soucasny = useMemo(() => zaznamy.find((z) => z.obor_klic === oborKlic && z.rok === rok && z.kolo === koloHodnota), [zaznamy, oborKlic, rok, koloHodnota]);
  const spolecny = zaznamy.find((z) => z.obor_klic === oborKlic && z.rok === rok && z.kolo === null);
  const vsechna = zaznamy.filter((z) => z.rok === rok && z.obor_klic === oborKlic).sort((a, b) => (a.kolo ?? 0) - (b.kolo ?? 0));
  const maKarty2027 = nabidky[2027].some((o) => o.podkladRok === 2027);
  const keSparovani = maKarty2027 ? zaznamy.filter((z) =>
    z.rok === 2027 && z.podklad_rok === 2026 &&
    !nabidky[2027].some((o) => o.podkladRok === 2027 && o.klic === z.obor_klic)) : [];
  const stavPravidel = useMemo(() => stavKriterii([
    ...zaznamy.map((z): DolozenePravidlo => ({
      id: z.id, oborKlic: z.obor_klic, rok: z.rok, kolo: z.kolo, rezim: z.rezim,
      popis: z.popis, zdroj: 'skola', zdrojUrl: z.odkaz,
      zjistenoAt: z.platne_od, publikovanoAt: null, overenoAt: null,
    })),
    ...podklady,
  ], oborKlic, rok, koloHodnota), [zaznamy, podklady, oborKlic, rok, koloHodnota]);

  const obnovFormular = (r: 2026 | 2027, klic: string, cisloKola: number | null) => {
    const zaznam = zaznamy.find((z) => z.rok === r && z.obor_klic === klic && z.kolo === cisloKola);
    setRezim(zaznam?.rezim ?? '');
    setPopis(zaznam?.popis ?? '');
    setOdkaz(zaznam?.odkaz ?? '');
    setStav('klid');
    setZprava('');
  };

  const zmenRok = (novy: 2026 | 2027) => {
    setRok(novy);
    const klic = nabidky[novy][0]?.klic ?? '';
    setOborKlic(klic);
    obnovFormular(novy, klic, koloHodnota);
  };

  const odesli = async (event: React.FormEvent) => {
    event.preventDefault();
    setStav('odesilam');
    setZprava('');
    try {
      const response = await fetch('/api/portal/kriteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redizo, oborKlic, rok, kolo: koloHodnota, rezim, popis, odkaz,
          podkladRok: obor?.podkladRok, zdrojId: obor?.zdrojId,
          zdrojTyp: obor?.zdrojTyp, ocekavaneId: soucasny?.id ?? null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Zápis se nepodařil.');
      const saved = data.kriterium as KriteriaSkoly;
      setZaznamy((old) => [...old.filter((z) => !(z.obor_klic === saved.obor_klic && z.rok === saved.rok && z.kolo === saved.kolo)), saved]);
      setStav('ulozeno');
      setZprava('Pravidla jsme uložili k vybranému oboru, ročníku a rozsahu kol.');
    } catch (error) {
      setStav('chyba');
      setZprava(error instanceof Error ? error.message : 'Zápis se nepodařil.');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="kriteria-nadpis">
      <h2 id="kriteria-nadpis" className="text-lg font-semibold text-slate-900">Bodování po oborech</h2>
      <p className="mt-2 text-sm text-slate-600">U každého oboru a ročníku můžete zadat pravidla společná pro všechna kola nebo odlišná pro konkrétní kolo. Pravidlo konkrétního kola má přednost.</p>
      <p className="mt-2 text-sm text-slate-600">Toto je pilotní zadávání. Uložené údaje se zatím nezobrazují uchazečům; ověříme je spolu s kritérii zveřejněnými pro daný ročník.</p>
      {keSparovani.length > 0 && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <strong>Plánované záznamy vyžadují kontrolu párování s kartami 2027.</strong>
        <ul className="mt-1 list-disc pl-5">{keSparovani.map((z) => <li key={z.id}>
          {z.obor_identita?.kkov ?? 'Obor bez uložených složek klíče'}{z.obor_identita?.zamereni ? ` · ${z.obor_identita.zamereni}` : ''}, {z.kolo === null ? 'všechna kola' : `${z.kolo}. kolo`}. Pravidlo se do nové nabídky nepřenáší automaticky.
        </li>)}</ul>
      </div>}
      {!dostupne && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Databázová část pilotu zatím není připravená. Formulář nyní nelze uložit.</p>}
      <form onSubmit={odesli} className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Rok přijímání
            <select value={rok} onChange={(e) => zmenRok(Number(e.target.value) as 2026 | 2027)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2">
              <option value={2027}>2027</option><option value={2026}>2026</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Obor a zaměření
            <select value={oborKlic} onChange={(e) => { setOborKlic(e.target.value); obnovFormular(rok, e.target.value, koloHodnota); }} required className="mt-1 block w-full rounded-lg border border-slate-300 p-2">
              {nabidka.map((o) => <option key={o.klic} value={o.klic}>{o.kkov} · {o.nazev}{o.zamereni ? ` – ${o.zamereni}` : ''}</option>)}
            </select>
          </label>
        </div>
        {obor && obor.podkladRok !== rok && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Tento obor známe z nabídky {obor.podkladRok}. Pro rok {rok} jde zatím o plánované údaje školy; nabídku v DiPSy ještě nemáme potvrzenou.</p>}
        {obor && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          {stavPravidel.stav === 'historicka' && <p>Pro rok {rok} zatím pravidla potvrzená nemáme. V roce {stavPravidel.rok} {stavPravidel.pravidla[0].rezim === 'jine' ? 'škola používala jiné bodování než prostý součet JPZ' : 'škola používala prostý součet JPZ'}. {stavPravidel.vyssiPrioritaOvereni ? `Pro rok ${rok} je potřeba zjistit u školy, zda zvláštní pravidla zůstala.` : `Ani tento údaj nepotvrzuje pravidla pro rok ${rok}.`}</p>}
          {stavPravidel.stav === 'aktualni' && <p>Pro rok {rok} máme pravidla z uvedeného zdroje: {stavPravidel.pravidla[0].rezim === 'jine' ? 'jiné bodování než prostý součet JPZ' : 'prostý součet JPZ'}.</p>}
          {stavPravidel.stav === 'zmena_k_overeni' && <p role="alert">U podkladu pro rok {stavPravidel.rok} jsme zjistili novou nebo nejasnou verzi. Níže jsou dříve ověřená pravidla, která už nepovažujeme za potvrzený aktuální stav. Změnu musí zkontrolovat redakce.</p>}
          {stavPravidel.stav === 'rozpor' && <p>Podklady pro rok {stavPravidel.rok} si odporují. Bodování zatím nepovažujeme za potvrzené.</p>}
          {stavPravidel.stav === 'nezname' && <p>Bodování pro rok {rok} zatím neznáme. Chybějící pravidlo nepovažujeme za prostý součet JPZ.</p>}
          {stavPravidel.stav !== 'nezname' && <ul className="mt-2 space-y-1 text-slate-600">
            {stavPravidel.pravidla.map((p) => <li key={p.id}>
              Zdroj: {nazevZdrojeKriterii(p.zdroj)}; {p.zdroj === 'skola' ? 'zadáno' : 'získáno'} {datum(p.zjistenoAt)}{p.publikovanoAt ? `; zdroj uvádí zveřejnění ${datum(p.publikovanoAt)}` : ''}{p.overenoAt ? `; ověřeno ${datum(p.overenoAt)}` : ''}{p.novaVerzeAt ? `; nová verze zjištěna ${datum(p.novaVerzeAt)} a čeká na kontrolu` : ''}.
              {odkazNaPodklad(p.zdrojUrl) && <> <a href={odkazNaPodklad(p.zdrojUrl) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Podklad</a></>}
              {p.popis && <p className="mt-1 whitespace-pre-wrap text-slate-800">{p.popis}</p>}
            </li>)}
          </ul>}
        </div>}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Platnost pravidla</legend>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={vsechnaKola} onChange={() => { setVsechnaKola(true); obnovFormular(rok, oborKlic, null); }} />Všechna kola</label>
            <label className="flex items-center gap-2"><input type="radio" checked={!vsechnaKola} onChange={() => { setVsechnaKola(false); obnovFormular(rok, oborKlic, kolo); }} />Jen kolo</label>
            {!vsechnaKola && <input aria-label="Číslo kola" type="number" min={1} max={3} value={kolo} onChange={(e) => { const next = Number(e.target.value); setKolo(next); obnovFormular(rok, oborKlic, next); }} className="w-20 rounded-lg border border-slate-300 p-2" />}
          </div>
        </fieldset>
        {!vsechnaKola && !soucasny && spolecny && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Pro {kolo}. kolo nyní platí společné pravidlo pro všechna kola. Vložením pravidla pro toto kolo vytvoříte výjimku.</p>}
        {vsechnaKola && <p className="text-sm text-amber-900">Toto pravidlo se použije i v dalších kolech, pokud pro ně později nevložíte vlastní kritéria. Podmínky dalších kol mohou být odlišné.</p>}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Jak se přidělují body?</legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="radio" name="rezim" value="pouze_jpz" disabled={obor?.konaJPZ !== true} checked={rezim === 'pouze_jpz'} onChange={() => setRezim('pouze_jpz')} />Boduje se pouze prostý součet češtiny a matematiky z JPZ (bez vyšší váhy či dalších bodů)</label>
            <label className="flex items-start gap-2"><input type="radio" name="rezim" value="jine" checked={rezim === 'jine'} onChange={() => setRezim('jine')} />Bodování je jiné nebo obsahuje další body</label>
          </div>
          {obor?.konaJPZ === null && <p className="mt-2 text-sm text-amber-900">U tohoto oboru zatím nemáme ověřeno, zda se koná JPZ. Můžete popsat známá pravidla; volba „pouze součet JPZ“ bude dostupná po ověření nabídky.</p>}
        </fieldset>
        <label className="block text-sm font-medium text-slate-700">Popis pravidel{rezim === 'jine' ? ' (povinný)' : ''}
          <textarea value={popis} onChange={(e) => setPopis(e.target.value)} required={rezim === 'jine'} maxLength={3000} rows={5} placeholder="Uveďte váhy testů, body za známky či školní zkoušku, minima a pravidla při rovnosti." className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Odkaz na vyhlášená kritéria, pokud už existují
          <input type="url" value={odkaz} onChange={(e) => setOdkaz(e.target.value)} maxLength={500} placeholder="https://…" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
        </label>
        {vsechna.length > 0 && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Uložené rozsahy:</strong> {vsechna.map((v) => `${v.kolo === null ? 'všechna kola' : `${v.kolo}. kolo`}${v.podklad_rok < v.rok ? ' · plánované' : ''}`).join('; ')}</div>}
        {nabidka.length === 0 && <p className="text-sm text-amber-900">V dostupných datech pro tuto školu nemáme žádný obor. Chybějící nabídku nám prosím pošlete přes „Nahlásit chybu“ spolu s rokem a kódem oboru.</p>}
        <button type="submit" disabled={!dostupne || !obor || !rezim || stav === 'odesilam'} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{stav === 'odesilam' ? 'Ukládám…' : 'Uložit pravidla'}</button>
        {zprava && <p role="status" className={`text-sm ${stav === 'chyba' ? 'text-red-700' : 'text-green-800'}`}>{zprava}</p>}
      </form>
    </section>
  );
}
