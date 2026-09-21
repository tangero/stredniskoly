import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProfilSkolyData, OborSkoly } from '@/lib/skola-profil-data';
import {
  cislo, zOd, ZARAZENI_POPISEK, NADPIS_OBTIZNOSTI, PORADI_OBTIZNOSTI,
  type ZarazeniObtiznosti,
} from '@/lib/obor-profil';
import { delkaSlovy, jakCastoNadStredem, nazevSObci, oboryVetou, pocetOboru, STAV_POPISEK } from '@/lib/skola-vyklad';
import { formatDatumCz } from '@/lib/portal-skol';
import { SkupinaVKraji } from '@/components/obor/grafy';
import { UlozitObor } from '@/components/obor/UlozitObor';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { SchemaOkoli } from '@/components/skola/SchemaOkoli';
import { NovinkySkoly, ZeZivotaSkoly } from '@/components/skola/NovinkySkoly';
import { OdberBlok, OdkazNaOdber } from '@/components/novinky/OdberBlok';
import { vetyDruhehoKola } from '@/lib/druhe-kolo-vyklad';

/**
 * Stránka školy v pěti otázkách: co tu lze studovat, jak si škola vede, jaká škola je, kde je a co je v okolí.
 * Rozvržení, pravidla přednosti a značky původu: docs/stranka-skoly-2027.md; pojmy: docs/slovnik-pojmu.md.
 */
interface ProfilSkolyProps {
  data: ProfilSkolyData;
  skola: { nazev: string; adresa: string; obec: string; okres: string; kraj: string; zrizovatel: string };
  odkazy: { prehled: string; kraj: string; inspekce: string | null };
}

const EDITACE = '/pro-skoly';


function malePismeno(text: string) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function Fajfka() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <path d="M2.2 6.3l2.4 2.4 5.2-5.4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Značka původu. `redakce` je údaj, který škola zadala a my jsme v něm zpětně
 * opravili chybu – nesmí nést „Potvrdila škola“, protože v té podobě, v jaké
 * je na stránce, ho škola nepotvrdila.
 */
function Puvod({ typ, children }: { typ: 'skola' | 'redakce' | 'text' | 'stroj' | 'archiv'; children?: ReactNode }) {
  const trida = typ === 'skola' || typ === 'text'
    ? 'border border-[#b5e0d4] bg-[#e6f5f1] text-[#0b7a65]'
    : typ === 'redakce'
      ? 'border border-amber-200 bg-amber-50 text-amber-800'
      : 'bg-slate-100 text-slate-500';
  const text = children ?? { skola: 'Potvrdila škola', redakce: 'Opravila redakce', text: 'text školy', stroj: 'shrnutí vytvořené automaticky', archiv: 'starší údaj z InspIS' }[typ];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 align-middle text-[12px] font-bold ${trida}`}>
      {typ === 'skola' && <Fajfka />}
      {text}
    </span>
  );
}

function Oddil({ id, nadpis, stitek, children }: { id: string; nadpis: string; stitek?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-slate-200 py-10 last:border-b-0">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[26px] font-bold text-[#16325c] md:text-[30px]">{nadpis}</h2>
          {stitek && <span className="rounded-full border border-slate-300 px-3 py-0.5 text-[13px] font-semibold text-slate-500">{stitek}</span>}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

function Karta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec] ${className}`}>{children}</div>;
}

function Dukaz({ nadpis, stitek, otevreny = false, children }: { nadpis: string; stitek?: string; otevreny?: boolean; children: ReactNode }) {
  return (
    <details open={otevreny} className="group rounded-2xl bg-white shadow-[0_1px_0_#dbe3ec]">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[17px] font-bold text-[#16325c]">{nadpis}</span>
        <span className="whitespace-nowrap text-[13px] text-slate-500">{stitek}</span>
        <span aria-hidden="true" className="text-xl leading-none text-[#0074e4] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-3 px-5 pb-5">{children}</div>
    </details>
  );
}

function Stitky({ polozky }: { polozky: string[] | null | undefined }) {
  const p = (polozky ?? []).filter(x => x && x !== 'jiné');
  if (!p.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {p.map(x => <li key={x} className="rounded-md bg-slate-100 px-2 py-0.5 text-[14px] text-[#16325c]">{x}</li>)}
    </ul>
  );
}

function Zdroj({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-slate-500">{children}</p>;
}

function RadekOboru({ o, rok }: { o: OborSkoly; rok: number | null }) {
  const nadpis = o.zarazeni ? NADPIS_OBTIZNOSTI[o.zarazeni] : o.prijati !== null ? `Přijato ${cislo(o.prijati)}` : 'Údaje o přijímání nemáme';
  // Každá karta je vlastní mřížka, takže sloupec `auto` by v každé vyšel jinak široký podle obsahu
  // a karty by se rozjely. Poslední sloupec má proto pevnou míru a akce v něm jsou v obou stavech
  // stejně široké (viz kompaktní podoba UlozitObor).
  return (
    <article className="grid gap-3 rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,20rem)] md:items-center md:gap-6">
      <div className="min-w-0">
        <h3 className="text-[19px] font-bold leading-snug text-[#16325c]">
          <Link href={o.href} className="hover:text-[#0074e4]">{o.nazev}{o.delka ? `, ${o.delka}leté` : ''}</Link>
        </h3>
        <p className="text-[15px] text-slate-600">
          pro žáky {o.proKoho} · {delkaSlovy(o.delka)}{o.kapacita !== null ? ` · ${cislo(o.kapacita)} míst` : ''}
        </p>
        {(o.novy || o.drivejsiNazev) && (
          <p className="mt-1 text-[13px] text-slate-500">
            {o.novy && <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">nový obor v nabídce {rok}</span>}
            {o.drivejsiNazev && <>dříve „{o.drivejsiNazev}“</>}
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <span className="text-[18px] font-bold text-[#16325c]">{nadpis}</span>
        {o.soutezici && o.zarazeni && o.zarazeni !== 'kapacita_nerozhodovala' ? (
          <div className="flex h-2.5 max-w-xs overflow-hidden rounded bg-[#e3e9f1]" role="img" aria-label={`${o.prijati} přijatých ${zOd(o.soutezici)} ${o.soutezici} soutěžících uchazečů`}>
            <span className="bg-[#0074e4]" style={{ width: `${(100 * (o.prijati ?? 0)) / o.soutezici}%` }} />
          </div>
        ) : null}
        <span className="text-[14px] text-slate-600 tabular-nums">
          {o.soutezici && o.zarazeni && o.zarazeni !== 'kapacita_nerozhodovala'
            ? `přijato ${cislo(o.prijati ?? 0)} ${zOd(o.soutezici)} ${cislo(o.soutezici)} soutěžících uchazečů`
            : o.prijati !== null && o.kapacita !== null ? `přijato ${cislo(o.prijati)} na ${cislo(o.kapacita)} míst` : ''}
          {o.predchoziRok && o.zarazeniPredchozi ? ` · v roce ${o.predchoziRok} ${ZARAZENI_POPISEK[o.zarazeniPredchozi]}` : ''}
          {o.tlak !== null ? ` · tlak prvních voleb ${cislo(o.tlak, 1)}×` : ''}
        </span>
        {(o.prihlasky !== null || o.cjPrijati !== null) && (
          <span className="text-[13px] text-slate-500 tabular-nums">
            {o.prihlasky !== null ? `${cislo(o.prihlasky)} přihlášek` : ''}
            {o.cjPrijati !== null && o.maPrijati !== null ? ` · přijatí průměrně čeština ${cislo(o.cjPrijati, 1)} a matematika ${cislo(o.maPrijati, 1)} z 50 bodů` : ''}
          </span>
        )}
        {o.druheKolo && (
          <span className="text-[13px] text-slate-600" title={[vetyDruhehoKola(o.druheKolo).hlavni, ...vetyDruhehoKola(o.druheKolo).doplnky].join(' ')}>
            {vetyDruhehoKola(o.druheKolo).kratce}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] font-semibold">
        <Link href={o.href} className="text-[#0074e4] hover:underline">Detail oboru</Link>
        <UlozitObor programId={o.id} kompaktni />
      </div>
    </article>
  );
}

export function ProfilSkoly({ data, skola, odkazy }: ProfilSkolyProps) {
  const { rok, obory, maturita, inspekce, inspis, portal, poloha, okoli, soubeh } = data;
  const u = portal?.udaje ?? {};
  const pole = (k: string) => (u[k]?.hodnota?.trim() ? u[k]! : null);
  // Značka za skupinu polí: „Opravila redakce“ stačí u jediného opraveného,
  // aby se u žádné hodnoty netvrdilo víc, než co škola sama potvrdila.
  const znacka = (...klice: string[]): 'skola' | 'redakce' =>
    klice.some((k) => u[k]?.zdroj === 'redakce') ? 'redakce' : 'skola';
  const vyplneno = Object.entries(u).filter(([, v]) => v?.hodnota?.trim());
  const posledniPotvrzeni = vyplneno.map(([, v]) => v!.potvrzeno_dne).sort().at(-1);
  const vypsane = obory.filter(o => o.vypsano);
  const nevypsane = obory.filter(o => !o.vypsano);
  // Rejstřík odliší obor, který škola dokončuje se stávajícími žáky, od oboru,
  // který v tomto roce jen nevypsala a příští rok ho vypsat může.
  const nenabirane = nevypsane.filter(o => o.nenabira);
  const nejiste = nevypsane.filter(o => !o.nenabira);
  const mist = vypsane.reduce((s, o) => s + (o.kapacita ?? 0), 0);
  const nejtezsi = PORADI_OBTIZNOSTI.map(z => vypsane.find(o => o.zarazeni === z)).find(Boolean);
  const verejna = /veřejn|státní/i.test(skola.zrizovatel);

  const poradiSoubehu = new Map(
    [...okoli].filter(s => s.soubeh > 0).sort((a, b) => b.soubeh - a.soubeh).slice(0, 8).map((s, i) => [s.redizo, i + 1]),
  );
  const hlavniSoubeh = [...okoli].filter(s => s.soubeh > 0).sort((a, b) => b.soubeh - a.soubeh)[0];
  const podobne = okoli.filter(s => s.podobna).slice(0, 8);
  const jazyky = (inspis?.vyuka_jazyku ?? []).filter(j => j !== 'jiné');
  // Pro rodinu nejdřív psycholog a poradci, metodik prevence až za nimi.
  const vahaSpecialisty = (s: string) => ['psycholog', 'výchovný poradce', 'speciální pedagog', 'kariérový poradce'].findIndex(k => s.includes(k)) >>> 0;
  const specialiste = [...(inspis?.pritomnost_specialistu ?? [])].filter(s => s !== 'jiné').sort((a, b) => vahaSpecialisty(a) - vahaSpecialisty(b));
  const rokyInspekce = inspekce ? inspekce.datum.slice(0, 4) : null;

  const tridy = [...new Set(vypsane.map(o => o.proKoho.match(/(\d+)\. třídy/)?.[1]).filter(Boolean))].map(Number).sort((a, b) => a - b);
  const poVyuceni = vypsane.some(o => o.proKoho === 'po vyučení');
  const proKohoSkola = [tridy.length ? `${tridy[0] === 7 ? 'ze' : 'z'} ${tridy.join('. a ')}. třídy` : null, poVyuceni ? 'po vyučení' : null].filter(Boolean).join(' a ');
  const ukazatelOborovMist = `${pocetOboru(vypsane.length)} pro žáky ${proKohoSkola}`;

  return (
    <div className="bg-[#f4f7fb]">
      {/* Hlavička */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl space-y-4 px-4 pb-6 pt-4">
          <nav className="text-[14px] text-slate-500" aria-label="Drobečková navigace">
            <Link href="/" className="hover:text-[#0074e4]">Domů</Link><span className="mx-1.5">/</span>
            <Link href="/skoly" className="hover:text-[#0074e4]">Školy</Link><span className="mx-1.5">/</span>
            <Link href={odkazy.kraj} className="hover:text-[#0074e4]">{skola.kraj}</Link><span className="mx-1.5">/</span>
            <span className="text-slate-700">{skola.nazev}</span>
          </nav>
          <div>
            <h1 className="text-[32px] font-bold leading-[1.1] text-[#16325c] [text-wrap:balance] md:text-[44px]">{nazevSObci(skola.nazev, skola.obec)}</h1>
            {obory.length > 0 && <p className="mt-1 text-[18px] text-slate-600">{oboryVetou(vypsane.length ? vypsane.map(o => ({ obor: o.nazev, delka: o.delka })) : obory.map(o => ({ obor: o.nazev, delka: o.delka })))}</p>}
          </div>
          <ul className="flex flex-wrap gap-2 text-[14px] text-slate-700">
            <li className="rounded-full bg-slate-100 px-3 py-1">{skola.adresa}</li>
            {skola.zrizovatel && <li className="rounded-full bg-slate-100 px-3 py-1">zřizovatel: {skola.zrizovatel}</li>}
            <li className="rounded-full bg-slate-100 px-3 py-1">okres {skola.okres}, {skola.kraj}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {data.web && <a href={data.web} rel="noopener noreferrer" className="rounded-lg bg-[#0074e4] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#005fbd]">Web školy</a>}
            <Link href="/simulator" className="rounded-lg border border-[#0074e4] px-4 py-2.5 text-[15px] font-semibold text-[#0074e4] hover:bg-blue-50">Porovnat v simulátoru</Link>
          </div>
          {posledniPotvrzeni ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#e6f5f1] px-4 py-2.5 text-[15px] text-[#0b7a65]">
              <span><Puvod typ={znacka(...Object.keys(u))} /> <b>Údaje od školy</b> potvrzené {formatDatumCz(posledniPotvrzeni)}</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <OdkazNaOdber className="font-bold underline underline-offset-4" />
                <Link href={EDITACE} className="font-bold underline underline-offset-4">Editujte: pro vedení školy</Link>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[15px] text-slate-600">
              <span>Škola zatím nic nedoplnila. Údaje na stránce jsou z oficiálních zdrojů.</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <OdkazNaOdber className="font-bold text-[#0074e4] underline underline-offset-4" />
                <Link href={EDITACE} className="font-bold text-[#0074e4] underline underline-offset-4">Editujte: pro vedení školy</Link>
              </span>
            </div>
          )}

          {/* Propagace služeb, které platí provoz webu: povinná součást stránky, nahoře */}
          <VibecordingPromo />

          {/* Rozcestník */}
          <nav aria-label="Odpovědi na pět otázek" className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_#dbe3ec,0_12px_32px_-28px_rgba(22,50,92,0.5)] ring-1 ring-slate-100">
            {[
              vypsane.length > 0 ? {
                href: '#obory', q: 'Co tu lze studovat',
                a: <><b>{ukazatelOborovMist}</b>, {cislo(mist)} míst v 1. kole {rok}{nejtezsi?.zarazeni && nejtezsi.zarazeni !== 'kapacita_nerozhodovala' && nejtezsi.zarazeni !== 'vetsina_uspela' ? <>; na {malePismeno(nejtezsi.nazev)} ({nejtezsi.delka}leté) bylo {ZARAZENI_POPISEK[nejtezsi.zarazeni]} se dostat</> : null}{pole('dny_otevrenych_dveri') ? <>; den otevřených dveří <b>{pole('dny_otevrenych_dveri')!.hodnota}</b> <Puvod typ={znacka('dny_otevrenych_dveri')} /></> : null}</>,
              } : null,
              (maturita || inspekce) ? {
                href: '#vede', q: 'Jak dobrá škola je',
                a: <>{maturita?.celkem?.passed !== undefined && maturita.celkem.registered ? <>maturitu {maturita.celkem.rok} udělalo <b>{cislo(maturita.celkem.passed)} {zOd(maturita.celkem.registered)} {cislo(maturita.celkem.registered)}</b> přihlášených{jakCastoNadStredem(maturita.skupiny) ? <>, v češtině <b>{jakCastoNadStredem(maturita.skupiny)} nad středem podobných škol</b></> : null}</> : null}{maturita && inspekce ? '; ' : ''}{inspekce ? <>inspekce {rokyInspekce}: přednost „{malePismeno(inspekce.silne[0]?.tag ?? '')}“{inspekce.rizika[0] ? <>, výtka „{malePismeno(inspekce.rizika[0].tag)}“</> : null}</> : null}</>,
              } : null,
              inspis ? {
                href: '#jaka', q: 'Jaká škola je',
                a: <>{inspis.aktualni_pocet_zaku ? <><b>{cislo(inspis.aktualni_pocet_zaku)} žáků</b>, </> : null}{specialiste.slice(0, 2).join(' a ')}{jazyky.length ? `, ${jazyky.length} cizích jazyků` : ''}{inspis.bezbariery_pristup === 'ne' ? <>, <b>bez bezbariérového přístupu</b></> : inspis.bezbariery_pristup ? `, bezbariérový přístup: ${inspis.bezbariery_pristup}` : ''}</>,
              } : null,
              {
                href: '#kde', q: 'Kde je',
                a: <>{skola.adresa}{poloha ? <>; nejbližší zastávka <b>{poloha.zastavka.split(', ').at(-1)}</b> zhruba {cislo(Math.round(poloha.zastavkaKm * 1000 / 10) * 10)} m od školy</> : null}</>,
              },
              hlavniSoubeh ? {
                href: '#okoli', q: 'Jiné školy v okolí',
                a: <>Nejvíc uchazečů se zároveň hlásí na <b>{hlavniSoubeh.nazev}</b>{hlavniSoubeh.obec && hlavniSoubeh.obec !== skola.obec ? ` (${hlavniSoubeh.obec})` : ''}, {cislo(hlavniSoubeh.km, 1)} km vzdušnou čarou</>,
              } : okoli.length ? { href: '#okoli', q: 'Jiné školy v okolí', a: <>{cislo(okoli.filter(s => s.km <= 20).length)} škol s jednotnou zkouškou do 20 km vzdušnou čarou</> } : null,
            ].filter(Boolean).map(r => (
              <a key={r!.href} href={r!.href} className="grid gap-0.5 border-t border-slate-100 px-5 py-3.5 text-slate-800 first:border-t-0 hover:bg-slate-50 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-5">
                <span className="text-[14px] font-bold text-slate-500">{r!.q}</span>
                <span className="text-[16px] leading-snug">{r!.a}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <nav aria-label="Oddíly stránky" className="sticky top-0 z-20 border-b border-slate-200 bg-[#f4f7fb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 text-[15px] font-semibold [scrollbar-width:none]">
          {[['#obory', 'Obory'], ['#vede', 'Jak si škola vede'], ['#jaka', 'Jaká škola je'], ['#kde', 'Kde je a okolí']].map(([h, t]) => (
            <a key={h} href={h} className="whitespace-nowrap rounded-full px-3 py-1.5 text-slate-600 hover:bg-white hover:text-[#16325c]">{t}</a>
          ))}
        </div>
      </nav>

      {/* 1 · Obory */}
      <Oddil id="obory" nadpis="Co tu lze studovat" stitek={rok ? `1. kolo ${rok}` : undefined}>
        {vypsane.length > 0 ? (
          <>
            <p className="text-[15px] text-slate-600">Obtížnost přijetí popisuje, kolik soutěžících uchazečů se v 1. kole dostalo; soutěžící uchazeči jsou ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš. Každý obor má vlastní přijímání, za školu se nesčítá.</p>
            <div className="space-y-2.5">{vypsane.map(o => <RadekOboru key={o.id} o={o} rok={rok} />)}</div>
          </>
        ) : (
          <Karta><p className="text-slate-700">Škola v 1. kole {rok} nevypsala obor s jednotnou přijímací zkouškou, který bychom měli v datech.</p></Karta>
        )}

        {(pole('kriteria_vlastnimi_slovy') || pole('odkaz_kriteria') || pole('dny_otevrenych_dveri') || pole('pripravne_kurzy')) ? (
          <div className="space-y-3 rounded-2xl border border-[#b5e0d4] bg-[#e6f5f1] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[18px] font-bold text-[#0b7a65]">Přijímací řízení podle školy</h3>
              <Puvod typ={znacka('kriteria_vlastnimi_slovy', 'odkaz_kriteria', 'dny_otevrenych_dveri', 'pripravne_kurzy')} />
            </div>
            <dl className="divide-y divide-[#b5e0d4]">
              {[['kriteria_vlastnimi_slovy', 'Kritéria přijetí'], ['odkaz_kriteria', 'Vyhlášená kritéria'], ['dny_otevrenych_dveri', 'Dny otevřených dveří'], ['pripravne_kurzy', 'Přípravné kurzy']].map(([k, popis]) => {
                const v = pole(k);
                if (!v) return null;
                return (
                  <div key={k} className="grid gap-1 py-2.5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-4">
                    <dt className="text-[14px] font-semibold text-slate-600">{popis}</dt>
                    <dd className="text-[15px] text-slate-900">
                      {k === 'odkaz_kriteria' ? <a href={v.hodnota} rel="noopener noreferrer" className="font-semibold text-[#0b7a65] underline">Kritéria na webu školy</a> : <span className="whitespace-pre-line">{v.hodnota}</span>}
                      <span className="block text-[12px] text-slate-500">potvrzeno školou {formatDatumCz(v.potvrzeno_dne)}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            <Zdroj>Údaje zadala škola v portálu pro školy a před zveřejněním prošly kontrolou. <Link href={EDITACE} className="font-semibold text-[#0b7a65] underline">Editujte: pro vedení školy</Link></Zdroj>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <h3 className="text-[18px] font-bold text-[#16325c]">Přijímací řízení</h3>
            <p className="text-[15px] text-slate-700">
              Kritéria přijetí, dny otevřených dveří a přípravné kurzy škola zatím nedoplnila.
              {data.web ? <> Kritéria vyhlašuje škola na svém webu: <a href={data.web} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">{data.web.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>.</> : ' Kritéria vyhlašuje škola na svém webu.'}
            </p>
            <Zdroj>Jste z vedení školy? Doplňte je zdarma, uvidí je rodiny na této stránce. <Link href={EDITACE} className="font-semibold text-[#0074e4] hover:underline">Editujte: pro vedení školy</Link></Zdroj>
          </div>
        )}

        <NovinkySkoly redizo={data.redizo} />

        {nevypsane.length > 0 && (
          <Dukaz nadpis="Obory z dřívějších let" stitek={`${nevypsane.length}`}>
            {nenabirane.length > 0 && (
              <>
                <p className="text-[15px] text-slate-600">Do těchto oborů už škola nenabírá: dokončuje je se stávajícími žáky a nové uchazeče do nich nepřijímá. Vede je tak rejstřík škol MŠMT.</p>
                <ul className="space-y-1 text-[15px]">
                  {nenabirane.map(o => <li key={o.id}><Link href={o.href} className="font-semibold text-[#0074e4] hover:underline">{o.nazev}, {o.delka}leté</Link></li>)}
                </ul>
              </>
            )}
            {nejiste.length > 0 && (
              <>
                <p className={`text-[15px] text-slate-600${nenabirane.length > 0 ? ' mt-3' : ''}`}>U těchto oborů nemáme jednoznačnou shodu s 1. kolem {rok}. Neznamená to, že je škola neotevírá: řada škol vypisuje obor jen jednou za dva roky. Nabídku ověřte u školy.</p>
                <ul className="space-y-1 text-[15px]">
                  {nejiste.map(o => <li key={o.id}><Link href={o.href} className="font-semibold text-[#0074e4] hover:underline">{o.nazev}, {o.delka}leté</Link></li>)}
                </ul>
              </>
            )}
          </Dukaz>
        )}
        <Zdroj>Nabídka oborů pro další přijímací řízení se zveřejňuje až po uzávěrce škol; údaje o oborech jsou z 1. kola {rok}, CERMAT{data.platnostDat ? `, stav k ${formatDatumCz(data.platnostDat)}` : ''}.</Zdroj>
      </Oddil>

      {/* 2 · Jak si škola vede */}
      <Oddil id="vede" nadpis="Jak si škola vede" stitek={[maturita ? `maturita ${maturita.roky.at(-Math.min(4, maturita.roky.length))}–${maturita.roky.at(-1)}` : null, rokyInspekce ? `inspekce ${rokyInspekce}` : null].filter(Boolean).join(' · ') || undefined}>
        {!maturita && !inspekce && (
          <Karta><p className="text-slate-700">Maturitní výsledky ani shrnutí inspekce pro tuto školu zatím nemáme.{data.inspekceSeznam?.lastInspectionDate ? ` Poslední inspekce proběhla ${formatDatumCz(data.inspekceSeznam.lastInspectionDate.slice(0, 10))}.` : ''}</p></Karta>
        )}
        {maturita && (() => {
          const posledniRok = maturita.roky.at(-1)!;
          const jakCasto = jakCastoNadStredem(maturita.skupiny);
          const celkem = maturita.celkem;
          const vstupy = maturita.skupiny.filter(s => s.vstup).map(s => s.vstup!);
          const rozsah = (hodnoty: number[]) => {
            const r = [...new Set(hodnoty.map(Math.round))].sort((a, b) => a - b);
            return r.length > 1 ? `${r[0]}–${r.at(-1)}` : `${r[0]}`;
          };
          const tecka = (stav: string | null) => stav === 'above' ? 'bg-[#16325c]' : stav === 'indistinguishable' ? 'border-2 border-[#16325c] bg-white' : stav === 'below' ? 'border-2 border-dashed border-slate-500 bg-white' : 'bg-slate-200';
          return (
            <>
              <Karta className="space-y-3">
                <p className="max-w-[64ch] text-[19px] leading-relaxed text-slate-800">
                  {celkem?.passed !== undefined && celkem.registered ? (
                    <>Maturitu v roce {celkem.rok} udělalo <b className="text-[#16325c]">{cislo(celkem.passed)} {zOd(celkem.registered)} {cislo(celkem.registered)}</b> přihlášených maturantů.{' '}</>
                  ) : null}
                  {jakCasto === 'v žádném ze sledovaných let' ? (
                    <>V češtině nebyli maturanti nad středem podobných škol <b className="text-[#16325c]">v žádném ze sledovaných let</b>.</>
                  ) : jakCasto ? (
                    <>V češtině byli {maturita.skupiny.length > 1 ? 'maturanti všech oborů ' : 'maturanti '}<b className="text-[#16325c]">{jakCasto} nad středem podobných škol</b>.</>
                  ) : (
                    <>Srovnání s podobnými školami chybí, protože maturantů bylo v každém roce méně než 10.</>
                  )}
                </p>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  Podobné školy jsou školy se stejným typem oborů v celé zemi, například všechna osmiletá gymnázia. Střed znamená, že polovina z nich dopadla lépe a polovina hůř.
                  {vstupy.length > 0 && <> Na výsledek má velký vliv, koho škola přijímá: přijatí tu měli u přijímaček {rok} průměrně lepší výsledek než {rozsah(vstupy.map(v => v.umisteni))} ze 100 uchazečů, na podobných školách obvykle {rozsah(vstupy.map(v => v.median))}. Dobrá maturita proto sama o sobě neměří kvalitu výuky.</>}
                </p>
              </Karta>

              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_#dbe3ec]">
                <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)] gap-4 border-b border-slate-100 px-5 py-3 text-[13px] font-semibold text-slate-500 md:grid">
                  <span>Obor</span><span>Maturitu udělalo {posledniRok}</span><span>Čeština {posledniRok}</span><span>Nad středem podobných škol</span><span>Matematika {posledniRok}</span>
                </div>
                {maturita.skupiny.map(s => {
                  const z = s.posledni!.zaznam;
                  const cj = z.cj ?? {};
                  const ma = z.ma ?? {};
                  const sc = z.spolecna_cast ?? {};
                  const malo = cj.quality === 'counts_only';
                  return (
                    <div key={s.smo16} className="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)] md:items-start md:gap-4">
                      <div>
                        <h3 className="text-[17px] font-bold text-[#16325c]">{s.nazev.charAt(0).toUpperCase() + s.nazev.slice(1)}</h3>
                        <p className="text-[13px] text-slate-500">{s.posledni!.rok !== posledniRok ? `poslední maturita ${s.posledni!.rok}` : `${cislo(sc.registered ?? cj.took ?? 0)} přihlášených`}{cj.quality === 'small_sample' ? ', malý ročník' : ''}</p>
                      </div>
                      <div className="text-[15px]">
                        <span className="text-[12px] text-slate-500 md:hidden">Maturitu udělalo {s.posledni!.rok}: </span>
                        {sc.passed !== undefined && sc.registered ? <b className="text-[#16325c] tabular-nums">{cislo(sc.passed)} {zOd(sc.registered)} {cislo(sc.registered)}</b> : '—'}
                        {sc.absent ? <span className="block text-[13px] text-slate-500">{cislo(sc.absent)} {sc.absent === 1 ? 'ke zkoušce nešel' : sc.absent < 5 ? 'ke zkoušce nešli' : 'ke zkoušce nešlo'}</span> : null}
                      </div>
                      <div className="text-[15px]">
                        <span className="text-[12px] text-slate-500 md:hidden">Čeština: </span>
                        {malo || cj.averagePercentScore === undefined ? (
                          <span className="text-slate-600">výsledek nezveřejňujeme, maturantů bylo méně než 10</span>
                        ) : (
                          <>
                            <b className="text-[#16325c]">{cislo(cj.averagePercentScore, 1)} %</b> bodů v testu
                            {s.stredPodobnychSkol !== null ? <span className="block text-[13px] text-slate-500">střed podobných škol: {cislo(s.stredPodobnychSkol, 1)} %</span> : null}
                            {cj.averagePercentile !== undefined ? <span className="block text-[13px] text-slate-500">v celé zemi lépe než {Math.round(cj.averagePercentile)} ze 100 maturantů</span> : null}
                          </>
                        )}
                      </div>
                      <div className="text-[15px]">
                        <span className="text-[12px] text-slate-500 md:hidden">Nad středem podobných škol: </span>
                        <ol className="inline-flex gap-2 align-middle md:flex" aria-label="Čeština proti středu podobných škol po letech">
                          {s.roky.map(r => (
                            <li key={r.rok} className="grid justify-items-center gap-0.5 text-[11px] text-slate-500" title={`${r.rok}: ${r.stav ? STAV_POPISEK[r.stav] : 'bez srovnání, málo maturantů'}`}>
                              <span className={`block h-3.5 w-3.5 rounded-full ${tecka(r.stav)}`} />
                              {String(r.rok).slice(2)}
                            </li>
                          ))}
                        </ol>
                        <span className="ml-2 text-slate-700 md:ml-0 md:mt-1 md:block">{s.letSeZarazenim ? `${s.letNad} ${zOd(s.letSeZarazenim)} ${s.letSeZarazenim} let` : 'bez srovnání'}</span>
                      </div>
                      <div className="text-[15px] text-slate-700">
                        <span className="text-[12px] text-slate-500 md:hidden">Matematika: </span>
                        {ma.subjectChoiceShare !== undefined ? <>volilo <b className="text-[#16325c]">{Math.round(ma.subjectChoiceShare)} %</b></> : '—'}
                        <span className="block text-[13px] text-slate-500">{ma.averagePercentile !== undefined ? `lépe než ${Math.round(ma.averagePercentile)} ze 100 maturantů, kteří ji psali` : ma.took ? 'výsledek nezveřejňujeme, psalo ji méně než 10' : ''}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-[12px] text-slate-600">
                  <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${tecka('above')}`} />nad středem</span>
                  <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${tecka('indistinguishable')}`} />nerozlišitelné, rozdíl je u takto velkého ročníku příliš malý</span>
                  <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${tecka('below')}`} />pod středem</span>
                  <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${tecka(null)}`} />bez srovnání</span>
                </div>
              </div>

              <Dukaz nadpis="Podrobně po letech" stitek={`jaro ${maturita.roky.at(-Math.min(4, maturita.roky.length))}–${posledniRok}`}>
                {maturita.skupiny.map(s => {
                  const cj = s.posledni!.zaznam.cj ?? {};
                  return (
                    <div key={s.smo16} className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                      <h3 className="text-[16px] font-bold text-[#16325c]">{s.nazev.charAt(0).toUpperCase() + s.nazev.slice(1)}</h3>
                      {cj.averagePercentScore !== undefined && s.skoryPodobnychSkol.length >= 10 && (
                        <>
                          <SkupinaVKraji hodnoty={s.skoryPodobnychSkol} hodnota={cj.averagePercentScore} predchozi={null} format={v => `${cislo(v, 1)} % bodů`} formatOsy={v => cislo(v)} osa={[0, 25, 50, 75, 100]} />
                          <Zdroj>Čeština {s.posledni!.rok}: každá tečka je jedna podobná škola s aspoň 10 maturanty ({s.skolVeSkupine ? cislo(s.skolVeSkupine) : ''} škol), modrá je tato škola. Osa je průměrný podíl bodů z testu, tedy táž veličina, ze které se počítá střed i srovnání. Pořadí škol stránka neuvádí.</Zdroj>
                        </>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[14px] tabular-nums">
                          <thead><tr className="text-left text-[12px] text-slate-500"><th className="py-1.5 pr-2">Rok</th><th className="px-2 text-right">Maturitu udělalo</th><th className="px-2 text-right">Ke zkoušce nešlo</th><th className="px-2 text-right">Čeština, % bodů</th><th className="px-2 text-right">Střed podobných škol</th><th className="pl-2">Srovnání</th></tr></thead>
                          <tbody>
                            {s.roky.map(r => {
                              const sc = r.zaznam?.spolecna_cast;
                              const cjRok = r.zaznam?.cj;
                              return (
                                <tr key={r.rok} className="border-t border-slate-200">
                                  <td className="py-1.5 pr-2">{r.rok}</td>
                                  <td className="px-2 text-right">{sc?.passed !== undefined && sc.registered ? `${cislo(sc.passed)} ${zOd(sc.registered)} ${cislo(sc.registered)}` : '—'}</td>
                                  {/* Neúčast jako podíl s počtem, bez výkladu (maturitní návrh §5.1, metrika 5). */}
                                  <td className="px-2 text-right">{sc?.absent === undefined ? '—' : !sc.absent ? '0' : sc.nonParticipationRate !== undefined ? `${cislo(sc.absent)} (${cislo(sc.nonParticipationRate, 1)} %)` : cislo(sc.absent)}</td>
                                  <td className="px-2 text-right">{cjRok?.averagePercentScore !== undefined ? `${cislo(cjRok.averagePercentScore, 1)} %` : '—'}</td>
                                  <td className="px-2 text-right">{cjRok?.groupComparison ? `${cislo(cjRok.groupComparison.medianPercentScore, 1)} %` : '—'}</td>
                                  <td className="pl-2">{r.stav ? STAV_POPISEK[r.stav] : 'bez srovnání'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                <Zdroj>Maturita: společná část, jarní období, CERMAT. Sloupec „ke zkoušce nešlo“ je počet přihlášených maturantů, kteří zkoušku nekonali, a jeho podíl z přihlášených; důvod data neuvádějí, může jít o nemoc i o neuzavřený ročník. Srovnání s podobnými školami stojí na jediné veličině, na průměrném podílu bodů z testu: střed je prostředek podobných škol a podle něj se počítá i srovnání, které bere v úvahu velikost ročníku, takže u malého ročníku bývá rozdíl nerozlišitelný. Údaj „v celé zemi lépe než 84 ze 100 maturantů“ je jiný pohled: neporovnává školu s podobnými školami, ale její maturanty se všemi maturanty v zemi.</Zdroj>
              </Dukaz>
            </>
          );
        })()}
        {inspekce && (
          <>
            <Karta className="space-y-2">
              <p className="max-w-[70ch] text-[17px] leading-relaxed text-slate-800">{inspekce.souhrn}</p>
              <Puvod typ="stroj">shrnutí vytvořené automaticky ze zprávy ČŠI z {formatDatumCz(inspekce.datum)}</Puvod>
            </Karta>
            <div className="grid gap-3 md:grid-cols-3">
              {([['Co inspekce chválí', inspekce.silne], ['Na co si dát pozor', inspekce.rizika]] as const).map(([nadpis, polozky]) => polozky.length > 0 && (
                <Karta key={nadpis}>
                  <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">{nadpis}</h3>
                  <ul className="list-disc space-y-2 pl-4 text-[14px] leading-relaxed text-slate-700">
                    {polozky.map(x => <li key={x.tag}><b className="text-[#16325c]">{x.tag}.</b> {x.detail}</li>)}
                  </ul>
                </Karta>
              ))}
              {inspekce.zmena && (
                <Karta>
                  <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">Co se změnilo od minulé inspekce</h3>
                  <p className="text-[14px] leading-relaxed text-slate-700">{inspekce.zmena}</p>
                </Karta>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {inspekce.otazky.length > 0 && (
                <Karta>
                  <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">Na co se zeptat na dni otevřených dveří</h3>
                  <ul className="list-disc space-y-1.5 pl-4 text-[14px] text-slate-700">{inspekce.otazky.map(x => <li key={x}>{x}</li>)}</ul>
                </Karta>
              )}
              {data.inspekceSeznam && data.inspekceSeznam.inspections.length > 0 && (
                <Karta>
                  <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">Inspekce ve škole</h3>
                  <ul className="space-y-1 text-[14px] text-slate-700">
                    {data.inspekceSeznam.inspections.slice(0, 4).map(i => (
                      <li key={i.dateFrom}>{formatDatumCz(i.dateFrom.slice(0, 10))} · <a href={i.reportUrl} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">zpráva ČŠI</a></li>
                    ))}
                  </ul>
                  {odkazy.inspekce && <p className="mt-2 text-[14px]"><Link href={odkazy.inspekce} className="font-semibold text-[#0074e4] hover:underline">Celé shrnutí inspekce</Link></p>}
                </Karta>
              )}
            </div>
          </>
        )}
        <Zdroj>Jak si vedou absolventi školy, tedy ti, kdo ji dokončili, tu nenajdete. Veřejná data o uplatnění po jednotlivých školách v Česku nejsou: nejpodrobnější zdroj, statistika MPSV, uvádí jen počet absolventů v evidenci úřadu práce, ne kolik jich škola má, takže z něj podíl spočítat nejde. MŠMT navíc samo označuje evidenci dokončeného studia za nevěrohodnou, protože školy maturitu do matriky nedoplňují u celých ročníků. Raději to řekneme takhle, než abychom tu otázku mlčky vynechali.</Zdroj>
      </Oddil>

      {/* 3 · Jaká škola je */}
      <Oddil id="jaka" nadpis="Jaká škola je" stitek={[rokyInspekce ? `inspekce ${rokyInspekce}` : null, inspis ? 'profil InspIS' : null].filter(Boolean).join(' · ') || undefined}>
        {pole('popis_skoly') && (
          <figure className="space-y-2 rounded-2xl border border-[#b5e0d4] bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[17px] font-bold text-[#0b7a65]">Škola o sobě</h3>
              <Puvod typ="text">text školy · {formatDatumCz(pole('popis_skoly')!.potvrzeno_dne)}</Puvod>
            </div>
            <blockquote className="max-w-[68ch] whitespace-pre-line text-[17px] leading-relaxed text-slate-800">{pole('popis_skoly')!.hodnota}</blockquote>
            <figcaption className="text-[13px] text-slate-500">{skola.nazev} vlastními slovy; text školy neověřujeme.</figcaption>
          </figure>
        )}
        {inspekce && (inspekce.sedi.length > 0 || inspekce.opatrne.length > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            {([['Komu škola sedne', inspekce.sedi], ['Kdo má být opatrný', inspekce.opatrne]] as const).map(([nadpis, polozky]) => polozky.length > 0 && (
              <Karta key={nadpis}>
                <h3 className="mb-2 text-[16px] font-bold text-[#16325c]">{nadpis}</h3>
                <ul className="list-disc space-y-1.5 pl-4 text-[15px] text-slate-700">{polozky.map(x => <li key={x}>{x}</li>)}</ul>
              </Karta>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {inspis?.aktualni_pocet_zaku ? (
            <Karta className="space-y-1">
              <p className="text-[13px] font-semibold text-slate-500">Velikost</p>
              <p className="text-[18px] font-bold text-[#16325c]">{cislo(inspis.aktualni_pocet_zaku)} žáků</p>
              {inspis.nejvyssi_povoleny_pocet_zaku ? <p className="text-[14px] text-slate-600">nejvýš povoleno {cislo(inspis.nejvyssi_povoleny_pocet_zaku)}</p> : null}
              <Puvod typ="archiv" />
            </Karta>
          ) : null}
          <Karta className="space-y-1">
            <p className="text-[13px] font-semibold text-slate-500">Zřizovatel a školné</p>
            <p className="text-[18px] font-bold text-[#16325c]">{skola.zrizovatel || '—'}</p>
            {pole('skolne') ? (
              <><p className="text-[14px] text-slate-700">{pole('skolne')!.hodnota}</p><Puvod typ={znacka('skolne')} /></>
            ) : typeof inspis?.rocni_skolne === 'number' && inspis.rocni_skolne > 0 ? (
              <><p className="text-[14px] text-slate-700">školné {cislo(inspis.rocni_skolne)} Kč ročně</p><Puvod typ="archiv" /></>
            ) : verejna ? (
              <p className="text-[14px] text-slate-600">veřejná škola, školné se neplatí</p>
            ) : (
              <p className="text-[14px] text-slate-600">školné neuvedeno</p>
            )}
          </Karta>
          {(inspis?.pritomnost_specialistu?.length || inspekce?.podpora.length || pole('podpora_svp') || pole('kontakt_vychovny_poradce')) ? (
            <Karta className="space-y-1">
              <p className="text-[13px] font-semibold text-slate-500">Podpora žáků</p>
              {specialiste.length ? <p className="text-[16px] font-bold leading-snug text-[#16325c]">{specialiste.join(', ')}</p> : null}
              {pole('podpora_svp') && <p className="text-[14px] text-slate-700">{pole('podpora_svp')!.hodnota}</p>}
              {pole('kontakt_vychovny_poradce') && <p className="text-[14px] text-slate-700">Výchovný poradce: {pole('kontakt_vychovny_poradce')!.hodnota}</p>}
              {(pole('podpora_svp') || pole('kontakt_vychovny_poradce')) && <Puvod typ={znacka('podpora_svp', 'kontakt_vychovny_poradce')} />}
              {inspekce?.podpora.length ? <p className="text-[13px] text-slate-500">Podle zprávy ČŠI: {malePismeno(inspekce.podpora[0])}</p> : null}
            </Karta>
          ) : null}
          {inspis?.bezbariery_pristup ? (
            <Karta className="space-y-1">
              <p className="text-[13px] font-semibold text-slate-500">Bezbariérový přístup</p>
              <p className="text-[18px] font-bold text-[#16325c]">{inspis.bezbariery_pristup}</p>
              <Puvod typ="archiv" />
            </Karta>
          ) : null}
          {pole('prestupy') && (
            <Karta className="space-y-1">
              <p className="text-[13px] font-semibold text-slate-500">Přestupy během studia</p>
              <p className="text-[15px] text-slate-800">{pole('prestupy')!.hodnota}</p>
              <Puvod typ={znacka('prestupy')} />
            </Karta>
          )}
        </div>
        {inspis && (
          <>
            <Dukaz nadpis="Výuka a vybavení">
              {inspis.zamereni?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Zaměření</p><Stitky polozky={inspis.zamereni} /></div> : null}
              {jazyky.length ? <div><p className="mb-1 text-[13px] text-slate-500">Cizí jazyky</p><Stitky polozky={jazyky} /></div> : null}
              {inspis.clil_metoda ? <div><p className="mb-1 text-[13px] text-slate-500">Výuka předmětů v cizím jazyce</p><Stitky polozky={inspis.clil_jazyky} /></div> : null}
              {inspis.odborne_ucebny?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Odborné učebny</p><Stitky polozky={inspis.odborne_ucebny} /></div> : null}
              {inspis.prostory_telocvik?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Sport</p><Stitky polozky={inspis.prostory_telocvik} /></div> : null}
              {inspis.podpory_zaku?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Formy podpory</p><Stitky polozky={inspis.podpory_zaku} /></div> : null}
            </Dukaz>
            {(inspis.zpusob_informovani_rodicu?.length || inspis.funkce_sis?.length) ? (
              <Dukaz nadpis="Komunikace s rodiči">
                {inspis.zpusob_informovani_rodicu?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Jak škola informuje</p><Stitky polozky={inspis.zpusob_informovani_rodicu} /></div> : null}
                {inspis.funkce_sis?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Školní informační systém</p><Stitky polozky={inspis.funkce_sis} /></div> : null}
              </Dukaz>
            ) : null}
            <Dukaz nadpis="Mimo výuku">
              {inspis.zajmove_cinnosti?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Zájmové činnosti</p><Stitky polozky={inspis.zajmove_cinnosti} /></div> : null}
              {inspis.mezinarodni_spoluprace?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Zahraničí</p><Stitky polozky={inspis.mezinarodni_spoluprace} /></div> : null}
              {inspis.sportovni_kurzy?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Kurzy</p><Stitky polozky={inspis.sportovni_kurzy} /></div> : null}
              {inspis.specificke_akce?.length ? <div><p className="mb-1 text-[13px] text-slate-500">Akce</p><Stitky polozky={inspis.specificke_akce} /></div> : null}
              {(inspis.evropske_projekty || inspis.spoluprace_s_firmami?.length || inspis.certifikaty?.length || inspis.nabidka_dalsiho_vzdelavani?.length) ? (
                <div><p className="mb-1 text-[13px] text-slate-500">Spolupráce</p><Stitky polozky={[...(inspis.evropske_projekty ? ['evropské projekty'] : []), ...(inspis.spoluprace_s_firmami ?? []), ...(inspis.certifikaty ?? []), ...(inspis.nabidka_dalsiho_vzdelavani ?? [])]} /></div>
              ) : null}
              {inspis.skolni_parlament ? <p className="text-[14px] text-slate-700">Škola má školní parlament.</p> : null}
            </Dukaz>
            <Zdroj><Puvod typ="archiv" /> Výuka, vybavení, komunikace a akce jsou ze starého profilu školy v InspIS, export 11. 2. 2026; zdroj ČŠI mezitím zanikl. Údaje, které potvrdí škola, mají přednost.</Zdroj>
          </>
        )}
      </Oddil>

      {/* 4 · Kde je a okolí */}
      <Oddil id="kde" nadpis="Kde je a jaké školy jsou v okolí" stitek={soubeh ? `souběžné přihlášky 1. kolo ${soubeh.rok}` : undefined}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <Karta className="space-y-3">
              <p className="text-[18px] leading-relaxed text-slate-800">
                <b className="text-[#16325c]">{skola.adresa}</b>.
                {poloha ? <> Nejbližší zastávka <b className="text-[#16325c]">{poloha.zastavka}</b> je zhruba {cislo(Math.round(poloha.zastavkaKm * 100) * 10)} m od školy.</> : null}
              </p>
              <dl className="space-y-2 text-[15px]">
                {(inspis?.dopravni_dostupnost?.length || inspis?.umisteni_v_obci) ? (
                  <div><dt className="text-[13px] text-slate-500">Doprava a umístění</dt><dd>{[...(inspis?.dopravni_dostupnost ?? []), inspis?.umisteni_v_obci ? `škola stojí: ${inspis.umisteni_v_obci}` : null, inspis?.linka_mhd ? `linka ${inspis.linka_mhd}` : null].filter(Boolean).join(' · ')} <Puvod typ="archiv" /></dd></div>
                ) : null}
                {(inspis?.v_blizkosti_skoly?.length || inspis?.mista_volny_cas?.length) ? (
                  <div><dt className="text-[13px] text-slate-500">V blízkosti školy</dt><dd>{[...(inspis?.v_blizkosti_skoly ?? []), ...(inspis?.mista_volny_cas ?? []).map(m => `ve škole ${m}`)].filter(x => x !== 'jiné').join(' · ')} <Puvod typ="archiv" /></dd></div>
                ) : null}
                {pole('stravovani') && <div><dt className="text-[13px] text-slate-500">Stravování</dt><dd>{pole('stravovani')!.hodnota} <Puvod typ={znacka('stravovani')} /></dd></div>}
                {(pole('ubytovani') || pole('ubytovani_poznamka')) && (
                  <div><dt className="text-[13px] text-slate-500">Ubytování</dt><dd>{pole('ubytovani') ? (pole('ubytovani')!.hodnota === 'ano' ? 'ano' : 'ne') : ''}{pole('ubytovani_poznamka') ? `${pole('ubytovani') ? ', ' : ''}${pole('ubytovani_poznamka')!.hodnota}` : ''} <Puvod typ={znacka('ubytovani', 'ubytovani_poznamka')} /></dd></div>
                )}
              </dl>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
                <a href={`https://mapy.cz/zakladni?q=${encodeURIComponent(skola.adresa)}`} rel="noopener noreferrer" className="text-[#0074e4] hover:underline">Otevřít v Mapy.cz</a>
                <Link href="/dostupnost" className="text-[#0074e4] hover:underline">Spočítat dojezd z domova</Link>
              </p>
            </Karta>
            {poloha && okoli.length > 0 && (
              <Karta className="space-y-3" >
                <div id="okoli" className="scroll-mt-16" />
                <SchemaOkoli nazevSkoly={skola.nazev} okoli={okoli} poradiSoubehu={poradiSoubehu} />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
                  <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#16325c]" />tato škola</li>
                  {poradiSoubehu.size > 0 && <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0074e4]" />hlásí se sem stejní uchazeči (číslo podle počtu)</li>}
                  <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-slate-500 bg-white" />školy se stejným typem oborů</li>
                  <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#c3ccd6]" />jiné střední školy</li>
                </ul>
                <Zdroj>Vzdálenost vzdušnou čarou, sever nahoře, kružnice 5, 10 a 20 km. Do 20 km je {cislo(okoli.filter(s => s.km <= 20).length)} škol s jednotnou zkouškou.{okoli.filter(s => s.km > 20 && poradiSoubehu.has(s.redizo)).map(s => ` ${s.nazev} (${cislo(s.km, 1)} km) je mimo schéma.`).join('')}</Zdroj>
              </Karta>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {soubeh ? (
              <Karta className="space-y-3">
                <h3 className="text-[19px] font-bold text-[#16325c]">Kam se hlásí stejní uchazeči</h3>
                <p className="text-[15px] text-slate-600">Obory, které měli na přihlášce i uchazeči oborů této školy. Ukazují skutečné alternativy: polovina z nich nebývá mezi deseti nejbližšími školami.</p>
                {soubeh.obory.map((o, i) => (
                  <details key={o.nazev} open={i === 0} className="group rounded-xl bg-slate-50">
                    <summary className="flex cursor-pointer list-none items-baseline gap-2 px-4 py-3 font-bold text-[#16325c] [&::-webkit-details-marker]:hidden">
                      {o.nazev}<span className="ml-auto text-[13px] font-normal text-slate-500">{cislo(o.uchazecu)} uchazečů</span>
                    </summary>
                    <div className="overflow-x-auto px-4 pb-3">
                      <table className="w-full text-[14px] tabular-nums">
                        <thead><tr className="text-left text-[12px] text-slate-500"><th className="py-1.5 pr-2">Škola a obor</th><th className="px-2 text-right">Společných</th><th className="px-2 text-right">Vzdálenost</th><th className="pl-2">Obtížnost přijetí {soubeh.rok}</th></tr></thead>
                        <tbody>
                          {o.radky.map(r => {
                            const cisloSkoly = [...poradiSoubehu.entries()].find(([red]) => r.href?.startsWith(`/skola/${red}-`))?.[1];
                            return (
                              <tr key={`${r.nazev}-${r.obor}`} className="border-t border-slate-200 align-top">
                                <td className="py-2 pr-2">
                                  {cisloSkoly && !r.tataSkola ? <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-[#0074e4] text-[11px] font-bold text-white">{cisloSkoly}</span> : null}
                                  {r.tataSkola ? <b>Tato škola</b> : r.href ? <Link href={r.href} className="font-semibold text-slate-900 hover:text-[#0074e4]">{r.nazev}</Link> : <b>{r.nazev}</b>}
                                  <span className="block text-[12px] text-slate-500">{r.obor}{r.tataSkola ? '' : ` · ${r.obec}`}</span>
                                </td>
                                <td className="px-2 py-2 text-right">{cislo(r.uchazecu)}</td>
                                <td className="px-2 py-2 text-right">{r.km !== null ? `${cislo(r.km, 1)} km` : '—'}</td>
                                <td className="py-2 pl-2">
                                  {r.zarazeni ? <span className="whitespace-nowrap rounded-full bg-slate-200/70 px-2 py-0.5 text-[12px] font-semibold text-[#16325c]">{ZARAZENI_POPISEK[r.zarazeni]}</span> : <span className="text-[12px] text-slate-500">bez údaje</span>}
                                  {r.soutezici && r.zarazeni !== 'kapacita_nerozhodovala' ? <span className="block text-[12px] text-slate-500">{cislo(r.prijati ?? 0)} {zOd(r.soutezici)} {cislo(r.soutezici)}</span> : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
                <Zdroj>Data o uchazečích 1. kola {soubeh.rok}, jen obory s aspoň 10 uchazeči. Počty se mezi obory této školy nesčítají: jeden uchazeč mohl mít na přihlášce dva z nich.</Zdroj>
              </Karta>
            ) : null}
            {podobne.length > 0 && (
              <Dukaz nadpis="Nejbližší školy se stejným typem oborů" stitek="vzdušnou čarou" otevreny={!soubeh}>
                <ul className="divide-y divide-slate-100 text-[15px]">
                  {podobne.map(s => (
                    <li key={s.redizo} className="flex items-baseline justify-between gap-3 py-2">
                      <span><Link href={s.href} className="font-semibold text-slate-900 hover:text-[#0074e4]">{s.nazev}</Link><span className="block text-[13px] text-slate-500">{s.obec}{s.soubeh ? ` · ${cislo(s.soubeh)} společných uchazečů` : ''}</span></span>
                      <span className="whitespace-nowrap tabular-nums text-slate-700">{cislo(s.km, 1)} km</span>
                    </li>
                  ))}
                </ul>
                <Zdroj>Pro rodinu, která hledá v dojezdu. Dojezdová doba se může od vzdálenosti výrazně lišit.</Zdroj>
              </Dukaz>
            )}
          </div>
        </div>
      </Oddil>

      {/* Patička */}
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-12">
        {/* Ze života školy až tady: dokresluje, čím škola žije, ale není to
            odpověď na otázku, kvůli které rodina stránku otevřela. */}
        <ZeZivotaSkoly redizo={data.redizo} />
        {/* Odběr novinek. Stránka školy je hlavní vstup z vyhledávání, takže
            tady nabídku potká i ten, kdo na titulní stránku nikdy nepřijde.
            Tmavá karta na světlém pozadí, aby byla vidět; stojí až za odpovědí
            na otázky rodiny, ne mezi nimi.

            Až za rubrikou „ze života školy“ schválně: ta mluví o zprávách
            z webu školy a tenhle blok o e-mailu od nás. Nad sebou by si dvě
            různé věci říkaly „novinky“. Blok se schová sám, když je odběr
            vypnutý nebo když ročník nemá budoucí událost.

            Nadpis pojmenovává, co v e-mailu přijde (termíny), místo obecného
            „vše nové“: čtenář sem dojde po pěti minutách čtení o konkrétní
            škole a potřebuje důvod, ne popis kanálu. Zdroj `skola-kontext`
            odlišuje tuto verzi od původní v odběrech i v Matomo události
            `formular_odeslan`, aby šlo změřit, jestli nadpis pomohl. */}
        <OdberBlok id="odber-novinek" zdroj="skola-kontext" varianta="karta" nadpis="Termíny a novinky k přijímačkám e-mailem" samostatna />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-[0_1px_0_#dbe3ec]">
          <p className="text-[15px] text-slate-700"><b className="text-[#16325c]">Jste z vedení školy?</b> Doplňte kritéria přijetí, dny otevřených dveří a popis školy. Je to zdarma a údaje uvidí rodiny na této stránce.</p>
          <Link href={EDITACE} className="font-bold text-[#0074e4] underline underline-offset-4">Editujte: pro vedení školy</Link>
        </div>
        <div className="space-y-2 text-[14px] text-slate-600">
          <p className="flex flex-wrap items-center gap-2"><b className="text-slate-700">Značky původu:</b> <Puvod typ="skola" /> údaj zadal pověřený člověk školy, nekontrolujeme ho předem · <Puvod typ="redakce" /> údaj od školy, ve kterém jsme opravili chybu · <Puvod typ="text" /> škola o sobě, neověřujeme · <Puvod typ="stroj" /> ze zprávy ČŠI · <Puvod typ="archiv" /> export 11. 2. 2026 · bez značky: oficiální data CERMAT, MŠMT a ČŠI</p>
          <p>Stránka neřadí školy podle kvality. Srovnání se týká jen podobných škol, tedy škol se stejným typem oborů, a je vždy s rokem.</p>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            Otevřená data:
            <a href={`${odkazy.prehled}.md`} className="rounded border border-slate-200 px-2 py-0.5 hover:border-slate-300 hover:text-slate-700">Markdown</a>
            <a href={`${odkazy.prehled}.json`} className="rounded border border-slate-200 px-2 py-0.5 hover:border-slate-300 hover:text-slate-700">JSON</a>
          </p>
        </div>
      </div>
    </div>
  );
}
