import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RegistracePasskey, ZrusitPasskey } from '@/components/admin/PasskeyTlacitka';
import { formatDatumCasCz } from '@/lib/admin';
import { seznamPasskey, type Passkey } from '@/lib/admin-passkey';
import { vyzadujAdmina } from '@/lib/admin-relace';
import { dotaz } from '@/lib/novinky-db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Zabezpečení administrace',
  robots: { index: false, follow: false },
};

const UDALOSTI: Record<string, string> = {
  prihlaseni: 'přihlášení',
  odmitnuto: 'odmítnuté přihlášení',
  odhlaseni: 'odhlášení',
  odhlaseni_vse: 'odhlášení všech zařízení',
  passkey_pridan: 'přidán passkey',
  passkey_zrusen: 'zrušen passkey',
};

export default async function ZabezpeceniPage() {
  const relace = await vyzadujAdmina();
  const s = { dotaz };
  let passkey: Passkey[] = [];
  let udalosti: { kdy: string; udalost: string; zpusob: string | null; detail: Record<string, unknown> }[] = [];
  try {
    passkey = await seznamPasskey(s);
    udalosti = (await dotaz<{ kdy: string | Date; udalost: string; zpusob: string | null; detail: Record<string, unknown> }>(
      'select kdy, udalost, zpusob, detail from admin_udalost order by kdy desc limit 20',
    )).rows.map((r) => ({ ...r, kdy: new Date(r.kdy).toISOString() }));
  } catch {
    // Bez tabulek (migrace 008 nespuštěná) se ukáže prázdný stav.
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          <div>
            <a href="/admin" className="text-sm text-slate-500 underline">Administrace</a>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Zabezpečení</h1>
            <p className="text-sm text-slate-600 mt-1">
              Přihlášeno {relace.zpusob === 'passkey' ? 'passkey' : `přes GitHub (${relace.githubLogin ?? 'účet vlastníka'})`}, relace platí do {formatDatumCasCz(relace.vyprsi)}.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Passkey</h2>
            <p className="text-sm text-slate-600">Přihlášení otiskem prstu, Face ID nebo PINem zařízení. Doporučuji aspoň dvě zařízení, například telefon a počítač.</p>
            {passkey.length === 0 ? (
              <p className="text-sm text-amber-800">Zatím žádný passkey. Bez něj se přihlásíš jen přes GitHub.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded border border-slate-200">
                {passkey.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span><strong>{p.nazev}</strong> <span className="text-slate-500">přidán {formatDatumCasCz(p.vytvoreno)}{p.naposledy ? `, naposledy ${formatDatumCasCz(p.naposledy)}` : ''}</span></span>
                    <ZrusitPasskey id={p.id} nazev={p.nazev} />
                  </li>
                ))}
              </ul>
            )}
            <RegistracePasskey />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Odhlášení</h2>
            <div className="flex flex-wrap gap-2">
              <form method="post" action="/admin/odhlaseni"><button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Odhlásit</button></form>
              <form method="post" action="/admin/odhlaseni"><input type="hidden" name="vse" value="1" /><button className="rounded border border-red-300 px-3 py-2 text-sm text-red-800 hover:bg-red-50">Odhlásit všechna zařízení</button></form>
            </div>
            <p className="text-xs text-slate-500">Po ztrátě telefonu odhlas všechna zařízení a zruš jeho passkey.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Poslední události</h2>
            {udalosti.length === 0 ? <p className="text-sm text-slate-500">Žádné záznamy.</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {udalosti.map((u, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 pr-3 text-slate-500 whitespace-nowrap">{formatDatumCasCz(u.kdy)}</td>
                      <td className="py-1 pr-3">{UDALOSTI[u.udalost] ?? u.udalost}</td>
                      <td className="py-1 text-slate-500">{u.zpusob ?? ''}{typeof u.detail?.nazev === 'string' ? ` · ${u.detail.nazev}` : ''}{typeof u.detail?.login === 'string' ? ` · ${u.detail.login}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
