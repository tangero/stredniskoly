import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalKodForm } from '@/components/portal/PortalKodForm';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';
import { ProfilUkazka } from '@/components/portal/ProfilUkazka';
import { PORTAL_POLE } from '@/lib/portal-skol';

export const metadata: Metadata = {
  title: 'Pro školy: doplňte profil své školy',
  description:
    'Doplňte na stránku své školy dny otevřených dveří, kritéria přijetí a odkaz na jejich plné znění. Zdarma, bez registrace a bez hesla.',
  alternates: { canonical: '/pro-skoly' },
};

const PRINOSY: Array<{ nadpis: string; text: string; pripravujeme?: boolean }> = [
  {
    nadpis: 'Méně opakovaných dotazů',
    text: 'Termíny dnů otevřených dveří, kritéria a podmínky studia budou tam, kde rodiče při výběru školy hledají. Co najdou tady, na to se vás nemusí ptát.',
  },
  {
    nadpis: 'Zdarma a bez hesla',
    text: 'Za profil ani za úpravy nic neplatíte. Přihlásíte se kódem, nebo odkazem, který pošleme na e-mail školy z rejstříku MŠMT.',
  },
  {
    nadpis: 'Odkaz na úplné informace',
    text: 'Ke stručnému shrnutí kritérií přidáte odkaz na jejich vyhlášené znění na webu školy. Rodič se k závaznému textu dostane jedním klepnutím.',
  },
  {
    nadpis: 'Otevřená data pro další služby',
    text: 'Údaje, které škola potvrdí, uvolníme pod licencí CC BY 4.0 jako strojově čitelná data. U každého bude datum a to, že ho potvrdila škola. Jména těch, kdo údaje zadali, nezveřejňujeme.',
  },
  {
    nadpis: 'Jak si stojíte proti školám v okolí',
    text: 'U každého oboru uvidíte, jaký o něj byl zájem proti oborům stejného typu v kraji a na jaké další školy se hlásili titíž uchazeči. Žebříček škol nesestavujeme.',
    pripravujeme: true,
  },
];

const KROKY: Array<{ nadpis: string; text: string }> = [
  {
    nadpis: 'Přihlaste se',
    text: 'Kódem, který jsme škole poslali, nebo odkazem na e-mail školy uvedený v rejstříku MŠMT.',
  },
  {
    nadpis: 'Zkontrolujte a doplňte',
    text: 'Obory, kapacity a přihlášky z oficiálních dat potvrdíte tlačítkem „Údaje sedí“. Chybějící informace o škole doplníte do formuláře.',
  },
  {
    nadpis: 'Redakce změny projde',
    text: 'Než se cokoli objeví na webu, přečte to člověk. Když něco nesedí, ozveme se.',
  },
  {
    nadpis: 'Údaje jsou na stránce školy',
    text: 'Zobrazí se odděleně od statistik, se značkou „potvrzeno školou“ a s datem.',
  },
];

const OTAZKY: Array<{ otazka: string; odpoved: string }> = [
  {
    otazka: 'Musí škola něco vyplnit?',
    odpoved:
      'Ne. Stránka školy funguje i bez vás a nic z ní nezmizí. Údaje, které škola nepotvrdila, označujeme jako údaje z datových zdrojů.',
  },
  {
    otazka: 'Kdo potvrzené údaje uvidí?',
    odpoved:
      'Každý, kdo otevře stránku školy. Zároveň je uvolníme jako otevřená data, aby je mohly použít další weby a aplikace.',
  },
  {
    otazka: 'Co když se termín nebo kritéria změní?',
    odpoved:
      'Přihlaste se znovu a údaj upravte. Změna projde stejnou kontrolou a na stránce se zobrazí nové datum potvrzení.',
  },
  {
    otazka: 'Proč nemůžeme upravit kapacity a výsledky přijímacího řízení?',
    odpoved:
      'Přebíráme je z oficiálních dat CERMATu a rejstříku MŠMT a na webu mají mít stejnou hodnotu jako u zdroje. Když nesedí, dejte vědět ve formuláři a ověříme je.',
  },
  {
    otazka: 'Kdo za webem stojí?',
    odpoved:
      'Web Přijímačky na školu provozuje Patrick Zandl s Hlídačem státu. Data o přijímacím řízení přebírá z otevřených dat CERMATu, rejstříku MŠMT a České školní inspekce.',
  },
];

/** Popisek pole bez letopočtu; období určuje registr, ne text stránky. */
function bezRoku(label: string): string {
  return label.replace(/\s+\d{4}$/, '');
}

export default function ProSkolyPage() {
  const pole = PORTAL_POLE.filter((p) => !p.prezentacni).map((p) => bezRoku(p.label));
  const prezentacni = PORTAL_POLE.filter((p) => p.prezentacni).map((p) => bezRoku(p.label));

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d2b3a]">
      <Header />

      <main className="flex-1">
        {/* Úvod: tvrzení vlevo, ukázka profilu vpravo */}
        <section className="border-b border-[#e3e9f1] bg-[linear-gradient(#f4f7fb,#f4f7fb)] lg:bg-[linear-gradient(90deg,#fff_0,#fff_52%,#f4f7fb_52%)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
            <div className="max-w-xl self-center">
              <h1 className="text-[2.1rem] font-bold leading-[1.12] text-[#16325c] sm:text-5xl sm:leading-[1.08]">
                Profil vaší školy tu už je. Doplňte do něj, co víte jen vy.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-[#3c4b5c]">
                Rodiče a uchazeči tu porovnávají školy podle výsledků přijímacího řízení. Termíny dnů
                otevřených dveří, kritéria přijetí nebo ubytování ale znáte jen vy. Doplňte je jednou
                a rodiče je najdou dřív, než vám napíšou.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <a
                  href="#vstup"
                  className="rounded-lg bg-[#0074e4] px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_20px_-10px_rgba(0,116,228,0.8)] transition-colors hover:bg-[#005fbd]"
                >
                  Upravit profil školy
                </a>
                <a href="#postup" className="font-semibold text-[#16325c] underline decoration-[#16325c]/25 underline-offset-4 hover:decoration-[#16325c]">
                  Jak to probíhá
                </a>
              </div>
              <p className="mt-5 text-sm text-[#5b6877]">Zdarma, bez registrace a bez hesla.</p>
            </div>

            <div className="lg:pl-4">
              <ProfilUkazka starsiZdroj="starší údaje z InspIS" />
            </div>
          </div>
        </section>

        {/* Co škola získá */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight text-[#16325c]">Co tím škola získá</h2>
          <div className="mt-10 grid gap-x-14 gap-y-10 md:grid-cols-2">
            {PRINOSY.map((p) => (
              <div
                key={p.nadpis}
                className={`border-l-2 pl-5 ${p.pripravujeme ? 'border-[#b9b3ec] md:col-span-2 md:max-w-[44rem]' : 'max-w-[34rem] border-[#d5deea]'}`}
              >
                <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-bold text-[#16325c]">
                  {p.nadpis}
                  {p.pripravujeme && (
                    <span className="rounded-full bg-[#ecebfa] px-2.5 py-0.5 text-xs font-semibold text-[#4338a8]">
                      Připravujeme
                    </span>
                  )}
                </h3>
                <p className="mt-2 leading-relaxed text-[#3c4b5c]">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Postup je skutečná posloupnost, proto číslovaný */}
        <section id="postup" className="scroll-mt-6 bg-[#16325c] text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-3xl font-bold leading-tight">Jak to probíhá</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {KROKY.map((k, i) => (
                <li key={k.nadpis} className="relative">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 text-lg font-bold"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{k.nadpis}</h3>
                  <p className="mt-2 leading-relaxed text-white/80">{k.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Co jde doplnit a co zůstává z oficiálních dat */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <h2 className="text-3xl font-bold leading-tight text-[#16325c]">Co můžete doplnit</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-[#3c4b5c]">
              Vyplníte, co se hodí. Každé pole je nepovinné.
            </p>
            <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {pole.map((label) => (
                <li key={label} className="flex gap-3 leading-snug">
                  <span aria-hidden="true" className="mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-[#0074e4]" />
                  {label}
                </li>
              ))}
            </ul>
            {prezentacni.length > 0 && (
              <p className="mt-6 max-w-xl leading-relaxed text-[#3c4b5c]">
                <strong className="font-semibold text-[#1d2b3a]">{prezentacni.join(', ')}</strong> se
                na stránce zobrazí zvlášť s označením „od školy“, aby rodiče rozeznali prezentaci
                školy od údajů z dat.
              </p>
            )}
          </div>

          <div className="self-start rounded-lg bg-[#f4f7fb] p-6 ring-1 ring-[#e3e9f1] sm:p-8">
            <h2 className="text-xl font-bold text-[#16325c]">Co zůstává z oficiálních dat</h2>
            <p className="mt-3 leading-relaxed text-[#3c4b5c]">
              Obory, kapacity, počty přihlášek a výsledky přijímacího řízení přebíráme od CERMATu,
              údaje o škole z rejstříku MŠMT. Ve formuláři je uvidíte a potvrdíte, ale nepřepíšete.
            </p>
            <p className="mt-3 leading-relaxed text-[#3c4b5c]">
              Když něco nesedí, zvolte „Hlásím nesrovnalost“ a napište, co má být jinak. Ověříme to
              u zdroje.
            </p>
          </div>
        </section>

        {/* Vstup do úpravy */}
        <section id="vstup" className="scroll-mt-6 border-y border-[#e3e9f1] bg-[#f4f7fb]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-3xl font-bold leading-tight text-[#16325c]">Upravit profil školy</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-[#3c4b5c]">
              Jedna z cest stačí. Úprava se vždy týká jen školy, ke které kód nebo e-mail patří.
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-6 ring-1 ring-[#d5deea] sm:p-8">
                <h3 className="text-xl font-bold text-[#16325c]">Máme přihlašovací kód</h3>
                <p className="mb-5 mt-2 text-[#5b6877]">
                  Kód jsme škole poslali. Má tvar XXXX-XXXX-XXXX.
                </p>
                <PortalKodForm />
              </div>

              <div className="rounded-lg bg-white p-6 ring-1 ring-[#d5deea] sm:p-8">
                <h3 className="text-xl font-bold text-[#16325c]">Pošlete odkaz na e-mail školy</h3>
                <p className="mb-5 mt-2 text-[#5b6877]">
                  Zadejte e-mail školy, jak je uvedený v rejstříku MŠMT. Pošleme na něj odkaz, který
                  otevře úpravu profilu a platí 72 hodin.
                </p>
                <PortalMagicForm />
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#5b6877]">
              Portál je v pilotním provozu. Když odkaz nedorazí nebo škola v rejstříku e-mail nemá,
              napište na{' '}
              <a href="mailto:patrick@zandl.cz" className="font-semibold text-[#0074e4] hover:underline">
                patrick@zandl.cz
              </a>{' '}
              a uveďte název školy a REDIZO.
            </p>
          </div>
        </section>

        {/* Časté otázky */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold leading-tight text-[#16325c]">Časté otázky</h2>
          <div className="mt-8 divide-y divide-[#e3e9f1] border-y border-[#e3e9f1]">
            {OTAZKY.map((o) => (
              <details key={o.otazka} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold text-[#16325c] [&::-webkit-details-marker]:hidden">
                  {o.otazka}
                  <span
                    aria-hidden="true"
                    className="text-2xl font-normal leading-none text-[#0074e4] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-[#3c4b5c]">{o.odpoved}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-[#3c4b5c]">
            Chcete vidět, jak stránka školy vypadá dnes?{' '}
            <Link href="/skoly" className="font-semibold text-[#0074e4] hover:underline">
              Najděte svou školu v přehledu
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
