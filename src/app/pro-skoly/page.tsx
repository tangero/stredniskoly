import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalKodForm } from '@/components/portal/PortalKodForm';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';

export const metadata: Metadata = {
  title: 'Portál pro školy',
  description: 'Školy zde potvrzují a doplňují údaje o svém profilu na Přijímačkách na střední školy.',
  robots: { index: false, follow: false },
};

export default function ProSkolyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Portál pro školy</h1>

          <div className="prose prose-slate max-w-none mb-8">
            <p>
              Tady mohou školy zkontrolovat a doplnit údaje, které o nich ukazujeme uchazečům –
              například dny otevřených dveří, kritéria přijímacího řízení pro rok 2027 nebo informace
              o ubytování. Čísla z přijímacího řízení předvyplňujeme z oficiálních dat, škola je jen
              potvrzuje nebo rozporuje.
            </p>
            <p>
              Odeslané změny nejdřív projdou moderací redakce a teprve potom se zobrazí na stránce
              školy se značkou „potvrzeno školou“. Portál zatím běží v pilotním režimu pro vybrané
              školy, kterým jsme poslali přihlašovací kód.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Mám přihlašovací kód</h2>
            <p className="text-sm text-slate-500 mb-4">
              Kód vám poslal provozovatel webu. Má tvar XXXX-XXXX-XXXX.
            </p>
            <PortalKodForm />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Nemám kód</h2>
            <p className="text-sm text-slate-500 mb-4">
              Zadejte e-mail školy uvedený v rejstříku MŠMT – pošleme vám odkaz, který otevře
              úpravu profilu (platí 72 hodin, žádné heslo).
            </p>
            <PortalMagicForm />
            <p className="text-sm text-slate-500 mt-4">
              Kódy rozesíláme školám v pilotní skupině. Pokud chcete být v další vlně,
              napište nám na{' '}
              <a href="mailto:patrick@zandl.cz" className="text-blue-600 hover:underline">
                patrick@zandl.cz
              </a>{' '}
              a uveďte název školy a REDIZO.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
