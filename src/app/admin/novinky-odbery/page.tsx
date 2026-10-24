import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { vyzadujAdmina } from '@/lib/admin-relace';
import { jeDbNastavena } from '@/lib/novinky-db';
import { odberyPodleZdroje, type RadekZdroje } from '@/lib/novinky-admin';

// Odběry novinek podle místa přihlášení a týdne (#523, E1). Jen počty, bez adres.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Odběry podle zdroje',
  robots: { index: false, follow: false },
};

const den = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`;
};

export default async function OdberyPodleZdrojePage() {
  await vyzadujAdmina();

  let radky: RadekZdroje[] | null = null;
  if (jeDbNastavena()) {
    try {
      radky = await odberyPodleZdroje();
    } catch (chyba) {
      console.error('Přehled odběrů se nenačetl:', chyba);
    }
  }

  const podleTydne = new Map<string, RadekZdroje[]>();
  for (const r of radky ?? []) podleTydne.set(r.tyden, [...(podleTydne.get(r.tyden) ?? []), r]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Odběry podle zdroje</h1>
          <p className="text-sm text-slate-500">
            Potvrzené odběry novinek za posledních 12 týdnů podle místa, kde se rodina přihlásila. Týden začíná
            pondělím potvrzení. Odhlášeno je z potvrzených těch, kteří odběr později zrušili. Jen počty, bez adres.
          </p>
        </div>
        {radky === null ? (
          <p className="text-sm text-slate-600">Odběr novinek není nakonfigurován, nebo se přehled nenačetl.</p>
        ) : radky.length === 0 ? (
          <p className="text-sm text-slate-600">V posledních 12 týdnech nikdo odběr nepotvrdil.</p>
        ) : (
          [...podleTydne].map(([tyden, rr]) => (
            <section key={tyden} className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Týden od {den(tyden)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-1 pr-4 font-medium">Zdroj</th>
                      <th className="py-1 pr-4 font-medium text-right">Potvrzeno</th>
                      <th className="py-1 font-medium text-right">Odhlášeno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rr.map((r) => (
                      <tr key={r.zdroj} className="border-b border-slate-100">
                        <td className="py-1 pr-4 font-mono">{r.zdroj}</td>
                        <td className="py-1 pr-4 text-right">{r.potvrzeno}</td>
                        <td className="py-1 text-right">{r.odhlaseno}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}
