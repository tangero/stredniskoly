'use client';

import { useEffect, useState } from 'react';

/**
 * Novinky z webu školy: termínová karta a doplňkový seznam.
 *
 * Návrh: docs/skolske-novinky-rss-2027.md, oddíl 3.6; pojmy: docs/slovnik-pojmu.md.
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
  zobrazeni: 'karta_terminu' | 'karta' | 'odkaz' | 'seznam';
  tridy: string[];
  terminy: string[];
}

interface Odpoved {
  stav: string;
  polozky?: Novinka[];
  zdrojOverenAt?: string | null;
  zdrojVypadek?: boolean;
}

const DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

function datumCesky(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${DNY[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function datumKratce(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function NovinkySkoly({ redizo }: { redizo: string }) {
  const [data, setData] = useState<Odpoved | null>(null);

  useEffect(() => {
    let platne = true;
    fetch(`/api/skoly/${redizo}/novinky`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (platne) setData(j);
      })
      .catch(() => {
        // Chyba čtení není zjištění „škola nemá novinky": blok zůstane skrytý.
      });
    return () => {
      platne = false;
    };
  }, [redizo]);

  const polozky = data?.stav === 'ok' ? data.polozky ?? [] : [];
  if (polozky.length === 0) return null;

  const karty = polozky.filter((p) => p.zobrazeni === 'karta_terminu' && p.terminy.length > 0);
  const ostatni = polozky.filter((p) => !karty.includes(p));
  const overeno = datumKratce(data?.zdrojOverenAt ?? null);

  return (
    <div className="space-y-3">
      {karty.map((p) => (
        <div key={p.id} className="space-y-2 rounded-2xl border border-[#b5e0d4] bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[18px] font-bold text-[#0b7a65]">
              {p.tridy.includes('dod') ? 'Den otevřených dveří' : 'Termín oznámený školou'}
            </h3>
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-slate-500">
              z webu školy, automaticky
            </span>
          </div>
          <ul className="space-y-1 text-[16px] font-semibold text-slate-900">
            {p.terminy.map((t) => (
              <li key={t}>{datumCesky(t)}</li>
            ))}
          </ul>
          <p className="text-[15px] text-slate-700">
            <a href={p.url} rel="noopener noreferrer" className="font-semibold text-[#0b7a65] underline">
              {p.titulek}
            </a>
          </p>
          <p className="text-[12px] text-slate-500">
            Převzato z webu školy{overeno ? `, zdroj naposledy ověřen ${overeno}` : ''}. Termín ověřte
            u školy: pořadatelem akce je škola, ne tento web.
          </p>
        </div>
      ))}

      {ostatni.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-[16px] font-bold text-[#16325c]">
            Novinky z webu školy ({ostatni.length})
          </summary>
          <ul className="mt-3 space-y-2 text-[15px]">
            {ostatni.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-2">
                <a href={p.url} rel="noopener noreferrer" className="font-semibold text-[#0074e4] hover:underline">
                  {p.titulek}
                </a>
                {p.tridy.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-500">
                    k přijímačkám
                  </span>
                )}
                <span className="text-[13px] text-slate-500">{datumKratce(p.publikovano)}</span>
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
