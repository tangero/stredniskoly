import { SITE_URL } from '@/lib/site.mjs';

/**
 * Strukturovaná data drobečkové navigace (schema.org BreadcrumbList; #405, fáze 1, SEO audit 20. 9. 2026,
 * bod 8). Položky jsou tytéž jako ve viditelné navigaci stránky, poslední je stránka sama (bez adresy).
 * Adresy jsou absolutní a se stejným originem jako canonical (`SITE_URL`).
 */
export interface Drobek {
  nazev: string;
  /** Cesta od kořene webu („/regiony/jihomoravsky“); u poslední položky (aktuální stránka) chybí. */
  cesta?: string;
}

export function drobeckyJsonLd(polozky: Drobek[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: polozky.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nazev,
      ...(p.cesta ? { item: new URL(p.cesta, SITE_URL).toString() } : {}),
    })),
  };
}
