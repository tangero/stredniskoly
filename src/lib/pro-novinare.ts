import fs from 'fs';
import path from 'path';
import nastaveni from '@/data/pro-novinare.json';

// Data sekce /pro-novinare (docs/navrh-pro-novinare-2027.md). Souhrn vzniká
// skriptem scripts/build-pro-novinare.py spolu s balíčky ke stažení; roky
// v něm nese generátor z registru stavu datových sad, stránka je nepíše.

export type Pocty = Record<string, number>;

export interface SouborBalicku {
  soubor: string;
  list: string | null;
  radku: number | null;
  format: 'csv' | 'xlsx';
}

export interface Balicek {
  klic: string;
  soubor: string;
  nazev: string;
  popis: string;
  soubory: SouborBalicku[];
}

export interface SouhrnProNovinare {
  vytvoreno: string;
  obdobi: { vysledky: string; kolo2: string; uchazeci: string; kriteria: string; veletrhy: string };
  zdroje: { platnost_vysledku: string };
  balicky: Balicek[];
  zip: string;
  skupiny_kriterii: Record<string, string>;
  cisla: {
    veletrhy: { akci_potvrzenych: number; akci_cekajicich: number; akci_od_dnes: number; kraju: number; mesicu: Record<string, number> };
    konzervatore: { skol: number; rejstrik_k: string; terminy: Record<string, string>; kolo1_rok: string; kolo1_denni: Pocty };
    obory: { nabidek: number; skol: number; prihlasek: number };
    uchazeci: {
      rocniky: Record<'9' | '7' | '5', Pocty>;
      kraje_9: Record<string, Pocty>;
      uchazecu: number;
      kolo2: { rocniky: Record<'9' | '7' | '5', Pocty>; kraje_9: Record<string, Pocty>; volno_9: Record<string, Pocty> };
    };
    druhe_kolo: { jpz: Pocty; bez_jpz: Pocty; kraje_jpz: Record<string, Pocty>; typy: Record<string, Pocty> };
    kriteria: Pocty;
  };
}

export const ADRESAR = '/pro-novinare';

export function nactiSouhrn(): SouhrnProNovinare {
  const cesta = path.join(process.cwd(), 'public', 'pro-novinare', 'souhrn.json');
  return JSON.parse(fs.readFileSync(cesta, 'utf-8')) as SouhrnProNovinare;
}

export { nastaveni };

/** Velikost souboru ke stažení pro popisek odkazu („420 kB“). */
export function velikost(soubor: string): string {
  try {
    const b = fs.statSync(path.join(process.cwd(), 'public', 'pro-novinare', soubor)).size;
    return b >= 1_000_000 ? `${(b / 1_000_000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1000))} kB`;
  } catch {
    return '';
  }
}

export const cislo = (n: number | undefined) => (n ?? 0).toLocaleString('cs-CZ');

/** Podíl jako celá procenta („10 %“). */
export const procenta = (citatel: number | undefined, jmenovatel: number | undefined) =>
  jmenovatel ? `${Math.round(((citatel ?? 0) / jmenovatel) * 100)} %` : '';

const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

/** „2026-09-29“ → „29. září 2026“. */
export function datumSlovy(iso: string): string {
  const [r, m, d] = iso.split('-').map(Number);
  return `${d}. ${MESICE[m - 1]} ${r}`;
}
