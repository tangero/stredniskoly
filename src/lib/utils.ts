import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper pro slugifikaci textu
 */
function slugify(text: string, maxLength?: number): string {
  let slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // odstranit diakritiku
    .replace(/[^a-z0-9\s-]/g, '') // pouze alfanumerické znaky
    .replace(/\s+/g, '-') // mezery na pomlčky
    .replace(/-+/g, '-') // odstranit duplicitní pomlčky
    .replace(/^-|-$/g, ''); // odstranit pomlčky na začátku/konci

  // Zkrátit na maxLength, pokud je zadáno (zaříznout na poslední pomlčce)
  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > maxLength * 0.6) {
      slug = slug.substring(0, lastDash);
    }
  }

  return slug;
}

/**
 * Vytvoří SEO-friendly slug z názvu školy, oboru a zaměření
 * Maximální délka slugu je omezena kvůli souborovému systému
 */
export function createSlug(name: string, obor?: string, zamereni?: string): string {
  // Omezit délku jednotlivých částí
  let slug = slugify(name, 60);

  if (obor) {
    slug = `${slug}-${slugify(obor, 40)}`;
  }

  if (zamereni) {
    slug = `${slug}-${slugify(zamereni, 40)}`;
  }

  // Celkový slug max 150 znaků (+ 10 znaků pro redizo = 160 celkem, bezpečné pro FS)
  if (slug.length > 150) {
    slug = slug.substring(0, 150);
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > 100) {
      slug = slug.substring(0, lastDash);
    }
  }

  return slug;
}

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
