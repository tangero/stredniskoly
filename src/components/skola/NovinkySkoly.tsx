'use client';

import { useEffect, useState } from 'react';

/**
 * Novinky z webu školy ve dvou blocích: k přijímačkám a ze života školy.
 *
 * Návrh: docs/skolske-novinky-rss-2027.md, oddíl 3.6; pojmy: docs/slovnik-pojmu.md.
 *
 * Dělení je záměr, ne technikálie. Den otevřených dveří a kritéria přijetí
 * jsou to, kvůli čemu rodina na stránku přišla; zpráva o seznamováku primy
 * dokresluje, čím škola žije, a patří proto na konec stránky, ne nad ni.
 * Obojí se bere z téhož zdroje, jen se nemíchá do jednoho seznamu.
 *
 * **Karta netvrdí datum.** Říká, o čem zpráva je („den otevřených dveří"), a
 * vede na článek školy; datum si čtenář přečte tam, kde ho napsala škola.
 * Hodnota bloku je v tom, že oddělí důležité od ostatního – ne v tom, že za
 * školu tvrdíme termín, který jsme z textu vyluštili jen možná správně
 * (rozhodnutí zadavatele 20. 9. 2026, `scripts/novinky_klasifikace.py`).
 *
 * Blok se **nenačítá se stránkou**, ale z `/api/skoly/[redizo]/novinky`. Důvod je
 * v tom, co má umět: vypnutí vadné položky přepínačem se musí projevit do minuty,
 * a to statické HTML stránky neumí – `revalidatePath` ani výjimka při čtení
 * databáze z už vygenerované stránky nezmizí. Cena je jeden požadavek navíc;
 * novinky jsou odkazy na cizí web, takže z první obrazovky nic nechybí.
 *
 * Když se novinky nepodaří přečíst, blok **není vidět vůbec**. Nikdy nesmí
 * vzniknout věta „škola nemá novinky" z toho, že nám neodpověděla databáze.
 */

interface Novinka {
  id: string;
  titulek: string;
  url: string;
  publikovano: string | null;
  /** Den, kdy jsme zprávu poprvé viděli. Posílá se jen bez data vydání. */
  objevenoAt: string | null;
  zobrazeni: 'karta_terminu' | 'karta' | 'odkaz' | 'seznam';
  tridy: string[];
}

interface Odpoved {
  stav: string;
  polozky?: Novinka[];
  zeZivota?: Novinka[];
  zdrojOverenAt?: string | null;
  zdrojVypadek?: boolean;
}

/**
 * Jedno načtení na stránku, i když se novinky renderují na dvou místech.
 *
 * Bloky stojí v rozvržení daleko od sebe (zprávy k přijímačkám u oborů,
 * život školy na konci), takže nemohou být jednou komponentou. Sdílený slib
 * podle REDIZO je levnější než React kontext a stačí: klíč se za život
 * stránky nemění a odpověď se stejně cachuje na 60 sekund.
 */
const NACTENI = new Map<string, Promise<Odpoved | null>>();

function nactiNovinky(redizo: string): Promise<Odpoved | null> {
  const ulozene = NACTENI.get(redizo);
  if (ulozene) return ulozene;
  const slib = fetch(`/api/skoly/${redizo}/novinky`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  NACTENI.set(redizo, slib);
  return slib;
}

/** Společné načtení pro oba bloky. */
function useNovinky(redizo: string): Odpoved | null {
  const [data, setData] = useState<Odpoved | null>(null);
  useEffect(() => {
    let platne = true;
    // Chyba čtení není zjištění „škola nemá novinky": blok zůstane skrytý.
    nactiNovinky(redizo).then((j) => {
      if (platne) setData(j);
    });
    return () => {
      platne = false;
    };
  }, [redizo]);
  return data;
}

function datumKratce(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

/**
 * Kdy zpráva vyšla. Bez data vydání se uvede den, kdy se objevila ve feedu –
 * je to slabší údaj, ale pravdivý; prázdné místo by čtenáři neřeklo nic.
 */
function kdy(p: Novinka): string | null {
  if (p.publikovano) return datumKratce(p.publikovano);
  const objeveno = datumKratce(p.objevenoAt);
  return objeveno ? `objevilo se ${objeveno}` : null;
}

/**
 * Čím zpráva je. Názvy se drží slovníku pojmů (docs/slovnik-pojmu.md).
 *
 * Štítek je jediné, co o obsahu tvrdíme my; všechno ostatní je titulek školy
 * a odkaz na její článek.
 */
const STITKY: Record<string, string> = {
  dod: 'Den otevřených dveří',
  prijimacky_nanecisto: 'Přijímačky nanečisto',
  setkani_uchazecu: 'Setkání s uchazeči',
  pripravny_kurz: 'Přípravný kurz k přijímačkám',
  kriteria: 'Kritéria přijetí',
  volna_mista: 'Hlášená volná místa',
  vysledky_prijm: 'Výsledky přijímacího řízení',
  talentove_zkousky: 'Talentová zkouška',
  nahradni_termin: 'Náhradní termín',
  terminy_jpz: 'Termíny jednotné přijímací zkoušky',
  prijimaci_rizeni: 'Přijímací řízení',
  prihlaska: 'Přihláška',
};

/** Od nejkonkrétnějšího k nejobecnějšímu: štítek nese první nalezená třída. */
const PORADI_STITKU = [
  'dod', 'prijimacky_nanecisto', 'setkani_uchazecu', 'pripravny_kurz', 'kriteria', 'volna_mista',
  'vysledky_prijm', 'talentove_zkousky', 'nahradni_termin', 'terminy_jpz',
  'prijimaci_rizeni', 'prihlaska',
];

function stitek(tridy: string[]): string {
  // Přehledový článek („co všechno letos platí") se chytá na víc témat naráz.
  // Konkrétní štítek by z něj udělal zprávu o jedné věci – ověřeno na škole
  // 600005399, kde se článek o jednotné přijímací zkoušce chytil zároveň na
  // talentové zkoušky, výsledky i termíny. Takový článek dostane obecný štítek.
  if (tridy.length >= 3) return STITKY.prijimaci_rizeni;
  return STITKY[PORADI_STITKU.find((t) => tridy.includes(t)) ?? ''] ?? STITKY.prijimaci_rizeni;
}

export function NovinkySkoly({ redizo }: { redizo: string }) {
  const data = useNovinky(redizo);

  const polozky = data?.stav === 'ok' ? data.polozky ?? [] : [];
  if (polozky.length === 0) return null;

  const karty = polozky.filter((p) => p.zobrazeni === 'karta' || p.zobrazeni === 'karta_terminu');
  const ostatni = polozky.filter((p) => !karty.includes(p));
  const overeno = datumKratce(data?.zdrojOverenAt ?? null);

  return (
    <div className="space-y-3">
      {karty.map((p) => (
        <div key={p.id} className="space-y-2 rounded-2xl border border-[#b5e0d4] bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[18px] font-bold text-[#0b7a65]">{stitek(p.tridy)}</h3>
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-slate-500">
              z webu školy, automaticky
            </span>
          </div>
          <p className="text-[16px]">
            <a href={p.url} rel="noopener noreferrer" className="font-semibold text-[#0b7a65] underline">
              {p.titulek}
            </a>
            {kdy(p) ? <span className="ml-2 text-[13px] font-normal text-slate-500">{kdy(p)}</span> : null}
          </p>
          <p className="text-[12px] text-slate-500">
            Převzato z webu školy{overeno ? `, zdroj naposledy ověřen ${overeno}` : ''}. Datum konání
            a podmínky najdete v článku školy: pořadatelem je škola, ne tento web.
          </p>
        </div>
      ))}

      {ostatni.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-[16px] font-bold text-[#16325c]">
            Další zprávy k přijímačkám ({ostatni.length})
          </summary>
          <ul className="mt-3 space-y-2 text-[15px]">
            {ostatni.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-2">
                <a href={p.url} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">
                  {p.titulek}
                </a>
                <span className="text-[13px] text-slate-500">{kdy(p)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-slate-500">
            Odkazy vedou na web školy. Sbíráme je automaticky z kanálu novinek školy
            {overeno ? `, naposledy ověřeno ${overeno}` : ''}
            {data?.zdrojVypadek ? '; poslední kontrola zdroje neuspěla, zobrazujeme dříve uložené položky' : ''}.
          </p>
        </details>
      )}
    </div>
  );
}

/**
 * Ze života školy: zprávy z webu školy, které se přijímacího řízení netýkají.
 *
 * Stojí na konci stránky schválně. Rodina sem přišla kvůli termínu a
 * podmínkám; výlet primy nebo úspěch v olympiádě je zajímavý kontext, ne
 * odpověď na otázku, kvůli které stránku otevřela. Proto zavřený seznam
 * titulků s odkazem na web školy – žádné perexy, žádné obrázky (přebíráme
 * jen titulek, odkaz a datum; viz docs/zdroje-dat.md, oddíl 2.14).
 */
export function ZeZivotaSkoly({ redizo }: { redizo: string }) {
  const data = useNovinky(redizo);

  const polozky = data?.stav === 'ok' ? data.zeZivota ?? [] : [];
  if (polozky.length === 0) return null;
  const overeno = datumKratce(data?.zdrojOverenAt ?? null);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer text-[16px] font-bold text-[#16325c]">
        Ze života školy ({polozky.length})
      </summary>
      <p className="mt-2 text-[13px] text-slate-600">
        Zprávy z webu školy, které se přijímacího řízení netýkají.
      </p>
      <ul className="mt-3 space-y-2 text-[15px]">
        {polozky.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-2">
            <a href={p.url} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">
              {p.titulek}
            </a>
            <span className="text-[13px] text-slate-500">{kdy(p)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-slate-500">
        Odkazy vedou na web školy. Sbíráme je automaticky z kanálu novinek školy
        {overeno ? `, naposledy ověřeno ${overeno}` : ''}. U zprávy, u které feed neuvedl
        použitelné datum vydání, píšeme den, kdy se u nás objevila.
      </p>
    </details>
  );
}
