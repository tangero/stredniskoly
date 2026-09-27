import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { overAdminToken, formatDatumCasCz } from '@/lib/admin';
import { dotaz, jeDbNastavena } from '@/lib/novinky-db';
import { diffNavrhu, navrh, vraceniNavrhu } from '@/lib/veletrhy-sklad';
import { diffTextem, navrhZTokenu, VYSLEDKY } from '@/lib/veletrhy-schvaleni';
import { cesskyDen } from '@/lib/veletrhy-pocty';

// ============================================================================
// Rozhodnutí o návrhu změny veletrhů (docs/veletrhy-api-2027.md, oddíl 4.3).
//
// Vstup buď podepsaným odkazem z e-mailu (?t=…), nebo z /admin (?id=…
// s cookie admin_token). GET nic nemění: poštovní skenery odkazy otevírají
// předem. Rozhoduje až POST formuláře na /admin/veletrhy/akce.
// ============================================================================

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Návrh změny veletrhů',
  robots: { index: false, follow: false },
};

const POPIS_STAVU: Record<string, string> = {
  ceka: 'Čeká na rozhodnutí',
  schvaleno: 'Schváleno, ale nešlo provést',
  provedeno: 'Provedeno, změna je na webu',
  zamitnuto: 'Zamítnuto',
  stazeno: 'Staženo Eduardou',
};

interface Props {
  searchParams: Promise<{ t?: string; id?: string; v?: string }>;
}

export default async function RozhodnutiPage({ searchParams }: Props) {
  const { t, id, v: kod } = await searchParams;
  const vysledek = kod && Object.hasOwn(VYSLEDKY, kod) ? VYSLEDKY[kod as keyof typeof VYSLEDKY] : null;
  const jar = await cookies();
  const jeAdmin = overAdminToken(jar.get('admin_token')?.value);
  const navrhId = t ? navrhZTokenu(t) : jeAdmin ? id ?? null : null;
  if (!navrhId) {
    if (t) {
      return (
        <main className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-slate-900">Odkaz neplatí</h1>
          <p className="mt-2 text-slate-700">Odkaz vypršel nebo je poškozený. Návrh najdete v /admin.</p>
        </main>
      );
    }
    notFound();
  }
  if (!jeDbNastavena()) return <main className="p-10">Databáze není nastavena.</main>;

  const n = await navrh({ dotaz }, navrhId);
  if (!n) notFound();
  const v = await diffNavrhu({ dotaz }, n, cesskyDen());
  const lzeSchvalit = n.stav === 'ceka';
  const lzeZamitnout = lzeSchvalit || (n.stav === 'schvaleno' && n.chyba !== null);
  const vraceni = n.stav === 'provedeno' ? await vraceniNavrhu({ dotaz }, n.id) : null;
  const lzeVratit = n.stav === 'provedeno' && !vraceni && !n.klic.startsWith('vraceni:');

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Návrh změny veletrhů</h1>
        <p className="text-sm text-slate-500">
          od {n.autor} · {formatDatumCasCz(n.vytvoreno)} · <b>{POPIS_STAVU[n.stav] ?? n.stav}</b>
          {n.rozhodl === 'auto' && ' · zveřejněno automaticky'}
          {vraceni && ` · vráceno ${formatDatumCasCz(vraceni.rozhodnuto ?? vraceni.vytvoreno)}`}
        </p>
      </div>

      {vysledek && (
        <p className={`rounded-lg border p-3 ${vysledek.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {vysledek.text}
        </p>
      )}
      {n.chyba && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">Provedení selhalo: {n.chyba}</p>}
      {n.duvod && <p className="text-slate-700">Důvod rozhodnutí: {n.duvod}</p>}

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-900">Změny</h2>
        {v.diff.length > 0 ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">{diffTextem(v.diff).join('\n')}</pre>
        ) : (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">{JSON.stringify(n.operace, null, 2)}</pre>
        )}
        {lzeSchvalit && v.chyby.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Proti dnešnímu stavu návrh neprojde, schválení ho neprovede:
            <ul className="list-disc pl-5">{v.chyby.map((c, i) => <li key={i}>{c.pole}: {c.zprava}</li>)}</ul>
          </div>
        )}
        {v.varovani.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Varování:
            <ul className="list-disc pl-5">{v.varovani.map((c, i) => <li key={i}>{c.pole}: {c.zprava}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="text-sm text-slate-700 space-y-1">
        <p>Zdroj: {n.zdroj_url ? <a className="text-blue-600 underline" href={n.zdroj_url} rel="noopener noreferrer">{n.zdroj_url}</a> : '–'}</p>
        <p>E-mail / reference: {n.zdroj_email ?? '–'}</p>
        {n.poznamka && <p>Poznámka: {n.poznamka}</p>}
      </section>

      {lzeVratit && (
        <form method="post" action="/admin/veletrhy/akce" className="space-y-3 rounded-lg border border-slate-200 p-4">
          {t ? <input type="hidden" name="t" value={t} /> : <input type="hidden" name="id" value={n.id} />}
          <p className="text-sm text-slate-700">
            Vrácení nastaví akce do stavu před tímto návrhem. Jde jen tehdy, když se od té doby nezměnily.
          </p>
          <label className="block text-sm">
            Důvod (povinný)
            <input name="duvod" required className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" />
          </label>
          <button name="akce" value="vratit" className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700">
            Vrátit změnu
          </button>
        </form>
      )}

      {lzeZamitnout && (
        <form method="post" action="/admin/veletrhy/akce" className="space-y-3 rounded-lg border border-slate-200 p-4">
          {t ? <input type="hidden" name="t" value={t} /> : <input type="hidden" name="id" value={n.id} />}
          <label className="block text-sm">
            Důvod (u zamítnutí povinný)
            <input name="duvod" className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" />
          </label>
          <div className="flex gap-3">
            {lzeSchvalit && (
              <button name="akce" value="schvalit" className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
                Schválit a zveřejnit
              </button>
            )}
            <button name="akce" value="zamitnout" className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-900 hover:bg-slate-300">
              Zamítnout
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
