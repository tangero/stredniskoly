import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OdberBlok } from '@/components/novinky/OdberBlok';
import calendar from '@/data/admissions-2027.json';

export const metadata: Metadata = {
  title: 'Kalendář přijímaček 2027: přihlášky, JPZ a výsledky',
  description: 'Ověřené termíny přijímacího řízení pro nástup v září 2027. Střední školy, konzervatoře, první i druhé kolo a kalendář ke stažení.',
  alternates: { canonical: '/prijimacky-2027' },
};

export default function Admissions2027Page() {
  return (
    <>
      <Header />
      <main className="bg-slate-50 text-slate-800">
        <section className="bg-slate-900 text-white px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <p className="text-blue-300 text-sm font-semibold mb-3">NÁSTUP DO ŠKOLY V ZÁŘÍ 2027</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-5">Kalendář přijímaček 2027</h1>
            <p className="text-slate-200 text-lg max-w-2xl">Kdy podat přihlášku, kdy se píší testy a kdy zjistíš výsledek. Termíny podle zveřejněného harmonogramu MŠMT.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {calendar.groups.map(group => <a key={group.id} href={`#${group.id}`} className="border border-slate-500 rounded-lg px-4 py-2 hover:bg-slate-800">{group.title.split(' · ')[0]}</a>)}
            </div>
            <p className="text-sm text-slate-300 mt-6">Ověřeno 11. září 2026 · školní rok 2026/2027 · <a href="#zdroje" className="underline underline-offset-4">oficiální zdroje</a></p>
          </div>
        </section>
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <aside className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <h2 className="font-bold mb-2">Konzervatoř? Přihlášku podej už v listopadu 2026.</h2>
            <p className="text-sm">Na ostatní střední školy je termín 1.–22. února 2027. Kritéria a kapacity jednotlivých škol pro rok 2027 zatím postupně přibudou. Výsledky 2026 na tomto webu popisují minulý ročník.</p>
          </aside>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Ulož si termíny</h2><p className="text-sm text-slate-600 mt-1">Soubor obsahuje všechny tři skupiny. Po importu si ponech relevantní události; stažená kopie se sama neaktualizuje.</p></div>
            <a href="/prijimacky-2027.ics" download className="shrink-0 rounded-lg bg-blue-700 text-white px-5 py-3 font-semibold text-center hover:bg-blue-800">Stáhnout kalendář (.ics)</a>
          </div>
          {/* Stažená kopie se sama neaktualizuje, odběr je odpověď na to
              (docs/novinky-k-prijimackam-2027.md, oddíl 4). */}
          <div className="mt-4">
            <OdberBlok
              zdroj="kalendar"
              varianta="stranka"
              nadpis="Termíny a novinky ti pošleme e-mailem"
            />
          </div>
          {calendar.groups.map(group => (
            <section key={group.id} id={group.id} className="pt-12 scroll-mt-24">
              <h2 className="text-2xl font-bold mb-2">{group.title}</h2>
              <p className="text-slate-600 mb-5">{group.intro}</p>
              <ol className="space-y-3">
                {group.events.map(event => <li key={event.id} className={`rounded-xl border p-5 grid gap-2 md:grid-cols-[190px_1fr] ${'important' in event && event.important ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <div className="font-semibold text-blue-800"><time dateTime={event.start}>{event.date}</time></div>
                  <div><h3 className="font-semibold">{event.title}</h3><p className="text-sm text-slate-600 mt-1">{event.note}</p></div>
                </li>)}
              </ol>
            </section>
          ))}
          <section className="pt-10"><h2 className="text-xl font-bold mb-2">Třetí a další kola</h2><p className="text-slate-600">Termíny a podmínky se řídí vyhlášením konkrétní školy v DiPSy. Nemají jeden společný den pro všechny školy.</p></section>
          <section id="zdroje" className="mt-10 border-t border-slate-200 pt-8 scroll-mt-24">
            <h2 className="text-xl font-bold mb-3">Zdroje a platnost</h2>
            <ul className="space-y-2 text-blue-700 underline underline-offset-4">
              <li><a href={calendar.source}>MŠMT: harmonogram přijímacího řízení 2026/2027 (PDF, strany 1–3)</a></li>
              <li><a href={calendar.jpzSource}>MŠMT: sdělení o termínech JPZ 2027 (PDF)</a></li>
              <li><a href="https://www.dipsy.cz/">DiPSy: přihlášky a informace o řízení</a></li>
            </ul>
            <p className="text-sm text-slate-600 mt-4">Kalendář uvádí termíny pro uchazeče a pracovní dny školních zkoušek. Přesný čas, místo, přílohy a podmínky účasti ověř v kritériích školy a v pozvánce. Poslední kontrola zdrojů: <time dateTime={calendar.checkedAt}>11. 9. 2026</time>.</p>
            <div className="flex flex-wrap gap-5 mt-6 text-blue-700 font-semibold"><Link href="/skoly">Prozkoumat školy →</Link><Link href="/vysledky/2026">Historické výsledky 2026 →</Link></div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
