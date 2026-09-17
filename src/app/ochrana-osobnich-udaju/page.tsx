import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// ============================================================================
// Zásady ochrany osobních údajů.
//
// NÁVRH K PRÁVNÍ KONTROLE. Vznikl podle docs/novinky-k-prijimackam-2027.md,
// oddíl 5 a oddíl 6 (doby uložení po druzích záznamů). Před spuštěním odběru
// musí projít kontrolou; do té doby je stránka dostupná, ale odběr zapnutý není.
//
// Co text musí držet a co se nesmí rozejít se skutečností:
//  - rozsah údajů odpovídá schématu v db/migrace/001-novinky.sql,
//  - doby uložení odpovídají poznámkám ke schématu,
//  - jmenovaní zpracovatelé odpovídají tomu, co web opravdu používá.
// ============================================================================

export const metadata = {
  title: 'Ochrana osobních údajů',
  description:
    'Jaké údaje web Přijímačky na školu zpracovává, proč, jak dlouho je drží a jak svá práva uplatnit.',
};

const POSLEDNI_ZMENA = '17. 9. 2026';

export default function OchranaOsobnichUdajuPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12" style={{ backgroundColor: '#ffffff' }}>
          <div className="max-w-3xl mx-auto px-4 prose-slate">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#28313b' }}>
              Ochrana osobních údajů
            </h1>
            <p className="text-sm text-slate-500 mb-8">Poslední změna: {POSLEDNI_ZMENA}</p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Kdo údaje zpracovává</h2>
            <p className="text-slate-700">
              Web prijimackynaskolu.cz provozuje Patrick Zandl jako správce údajů. Napsat mu jde na{' '}
              <a href="mailto:patrick@zandl.cz" className="text-blue-700 underline">
                patrick@zandl.cz
              </a>
              . Web vzniká ve spolupráci s Hlídačem státu.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Bez přihlášení nic neukládáme</h2>
            <p className="text-slate-700">
              Prohlížení webu, vyhledávání škol ani simulátor nepotřebují žádné údaje o vás. Co si
              v simulátoru uložíte, zůstává ve vašem prohlížeči.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Odběr termínů e-mailem</h2>
            <p className="text-slate-700">
              Když se přihlásíte k odběru termínů přijímacího řízení, zpracováváme:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>
                <strong>e-mailovou adresu</strong>, na kterou odběr posíláme,
              </li>
              <li>
                <strong>ročník přijímacího řízení a druh studia</strong>, abychom vám poslali jen to,
                co se vás týká,
              </li>
              <li>
                <strong>kraj</strong>, pokud jste ho vyplnili; je nepovinný,
              </li>
              <li>
                <strong>místo formuláře</strong>, ze kterého jste odběr založili, abychom viděli, co
                lidem pomáhá,
              </li>
              <li>
                <strong>doklad souhlasu</strong>: znění souhlasu, se kterým jste odběr zakládali,
                a čas potvrzení,
              </li>
              <li>
                <strong>záznam o odeslaných e-mailech</strong> a jejich doručení, aby se zpráva
                neposlala dvakrát a aby nedoručitelná adresa odběr ukončila.
              </li>
            </ul>
            <p className="text-slate-700 mt-3">
              <strong>Právní titul je váš souhlas</strong> (čl. 6 odst. 1 písm. a GDPR). Odvolat ho
              jde jedním kliknutím v každém e-mailu nebo ve správě odběru; odběr tím skončí.
            </p>
            <p className="text-slate-700 mt-3">
              Odběr zakládá dospělý: buď pro sebe, nebo pro své dítě. Uchazečům mladším 15 let
              zakládá odběr rodič, protože souhlas dítěte s takovou službou zákon od 15 let
              podmiňuje (§ 7 zákona č. 110/2019 Sb.).
            </p>
            <p className="text-slate-700 mt-3">
              <strong>Dokud odběr nepotvrdíte, nezakládáme ho.</strong> Držíme jen vaši žádost, která
              sama propadne do 72 hodin. Adresu, kterou vám zadal někdo jiný, tedy nikde nedržíme.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Jak dlouho údaje držíme</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>
                <strong>žádost o potvrzení:</strong> 72 hodin; u výzvy k dalšímu ročníku 30 dnů,
              </li>
              <li>
                <strong>odběr:</strong> do odhlášení, nejdéle do konce přijímacího řízení, na které
                je přihlášený,
              </li>
              <li>
                <strong>doklad souhlasu:</strong> 3 roky po skončení odběru, a to už jen jako otisk
                adresy bez adresy samotné; slouží k obraně, kdyby někdo namítl, že souhlas nedal,
              </li>
              <li>
                <strong>záznam o odeslaných e-mailech:</strong> 12 měsíců, s otiskem adresy,
              </li>
              <li>
                <strong>počitadlo ochrany formuláře:</strong> 30 dnů, jen jako otisk adresy nebo IP,
              </li>
              <li>
                <strong>rozpracovaný e-mail:</strong> adresa v něm zůstává, dokud se odeslání
                nedokončí, nejdéle 24 hodin; u případu, který musí rozhodnout člověk, nejdéle 30 dnů.
              </li>
            </ul>
            <p className="text-slate-700 mt-3">
              Po odhlášení adresu mažeme. Zůstávají doklady a záznamy o odeslání, ve kterých je
              místo adresy jen její otisk počítaný s naším tajným klíčem.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Komu se údaje dostanou</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>
                <strong>Vercel</strong> — provoz webu,
              </li>
              <li>
                <strong>Neon</strong> — databáze odběru, v evropském regionu,
              </li>
              <li>
                <strong>Resend</strong> — odesílání e-mailů; jde o zpracovatele ve Spojených státech,
                takže součástí zpracování je přenos do třetí země na základě standardních smluvních
                klauzulí,
              </li>
              <li>
                <strong>Matomo</strong> na serveru Hlídače státu — měření návštěvnosti webu.
              </li>
            </ul>
            <p className="text-slate-700 mt-3">
              Adresy nikomu neprodáváme ani nepředáváme k marketingu. Školy k nim nemají přístup.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">E-maily neměříme</h2>
            <p className="text-slate-700">
              V e-mailech nejsou sledovací obrázky ani měřené odkazy: nevíme, kdo e-mail otevřel ani
              na co klikl. Odkazy v e-mailu nesou označení, že návštěva přišla z odběru, ale to se
              měří až na webu a až po vašem kliknutí.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Měření návštěvnosti</h2>
            <p className="text-slate-700">
              Návštěvnost webu měříme v Matomu na serveru Hlídače státu, ne u zahraničních služeb.
              Potvrzovací a odhlašovací stránky odběru se neměří vůbec, aby se do měření nedostala
              adresa ani odkaz z e-mailu.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Vaše práva</h2>
            <p className="text-slate-700">
              Máte právo na přístup ke svým údajům, na jejich opravu a výmaz, na omezení zpracování,
              na přenositelnost a právo souhlas kdykoli odvolat. Nejrychlejší cesta je odkaz
              <em> Upravit odběr</em> nebo <em>Odhlásit se</em> v každém e-mailu; jinak napište na{' '}
              <a href="mailto:patrick@zandl.cz" className="text-blue-700 underline">
                patrick@zandl.cz
              </a>{' '}
              a odpovíme do jednoho měsíce. Když si budete myslet, že s údaji zacházíme špatně, můžete
              se obrátit na Úřad pro ochranu osobních údajů.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">Data o školách</h2>
            <p className="text-slate-700">
              Údaje o školách, oborech a výsledcích přijímacího řízení pocházejí z otevřených dat
              CERMATu, MŠMT a České školní inspekce. Nejsou to osobní údaje uchazečů: web pracuje
              s hromadnými počty za obory a školy, ne s jednotlivými dětmi. Přehled zdrojů je
              v dokumentaci projektu.
            </p>

            <p className="text-slate-700 mt-10">
              <Link href="/novinky" className="text-blue-700 underline">
                Zpět na odběr termínů
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
