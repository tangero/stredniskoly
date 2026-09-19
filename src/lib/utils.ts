import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Skládání adresy školy a oboru žije ve sdíleném modulu, protože ho vedle aplikace
 * používá i generátor sitemapy spouštěný Nodem. Viz src/lib/adresa-oboru.mjs.
 */
export { createSlug } from './adresa-oboru.mjs';

/**
 * Vytvoří SEO-friendly slug pro kraj
 */
export function createKrajSlug(krajKod: string, krajName: string): string {
  return krajName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Formátuje číslo s českou lokalizací
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Získá třídu obtížnosti
 */
export function getDifficultyClass(obtiznost: number): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  if (obtiznost >= 70) {
    return { label: 'Vysoká', colorClass: 'text-red-600', bgClass: 'bg-red-100' };
  }
  if (obtiznost >= 45) {
    return { label: 'Střední', colorClass: 'text-yellow-600', bgClass: 'bg-yellow-100' };
  }
  return { label: 'Nízká', colorClass: 'text-green-600', bgClass: 'bg-green-100' };
}

/**
 * Získá třídu pro index poptávky
 */
export function getDemandClass(index: number): {
  label: string;
  colorClass: string;
  emoji: string;
} {
  if (index >= 3) {
    return { label: 'Vysoká', colorClass: 'text-red-600', emoji: '🔥' };
  }
  if (index >= 2) {
    return { label: 'Střední', colorClass: 'text-yellow-600', emoji: '📈' };
  }
  if (index >= 1) {
    return { label: 'Nízká', colorClass: 'text-green-600', emoji: '✓' };
  }
  return { label: 'Velmi nízká', colorClass: 'text-gray-600', emoji: '📉' };
}

/**
 * Určí stav přijetí podle bodů
 */
export function getAdmissionStatus(
  userScore: number,
  minScore: number
): {
  status: 'accepted' | 'borderline' | 'rejected';
  label: string;
  colorClass: string;
  bgClass: string;
} {
  const diff = userScore - minScore;

  if (diff >= 10) {
    return {
      status: 'accepted',
      label: 'Přijat',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-100'
    };
  }
  if (diff >= -10) {
    return {
      status: 'borderline',
      label: 'Na hraně',
      colorClass: 'text-yellow-700',
      bgClass: 'bg-yellow-100'
    };
  }
  return {
    status: 'rejected',
    label: 'Nepřijat',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100'
  };
}

/**
 * Extrahuje REDIZO z ID školy
 */
export function extractRedizo(id: string): string {
  return id.split('_')[0];
}

/**
 * Extrahuje kód oboru z ID školy
 */
export function extractOborKod(id: string): string {
  return id.split('_')[1] || '';
}
