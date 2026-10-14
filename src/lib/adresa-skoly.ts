// ============================================================================
// Adresa školy s orientačním číslem. Katalog (public/school_analysis.json)
// nese adresu jen s číslem popisným („Vejprnická 663, Plzeň, 31800“); rejstřík
// škol MŠMT (index data/msmt_rejstrik/nazvy-oboru.json, oddíl identifikace)
// vede i orientační číslo („Vejprnická 663/56, 318 00 Plzeň – Skvrňany“).
// Škola se podepisuje orientačním číslem, proto ho do zobrazené adresy
// doplňujeme, a to jen tam, kde se ulice a číslo popisné v obou zdrojích shodují.
// ============================================================================

/**
 * Vrátí katalogovou adresu s orientačním číslem z rejstříku, jinak adresu beze změny.
 * Mění jen první část (ulice a čísla), obec a PSČ zůstávají z katalogu.
 */
export function doplnOrientacniCislo(adresaKatalog: string, adresaRejstrik: string | null | undefined): string {
  if (!adresaRejstrik) return adresaKatalog;
  const ulicKatalog = adresaKatalog.split(',')[0]?.trim();
  const ulicRejstrik = adresaRejstrik.split(',')[0]?.trim();
  if (!ulicKatalog || !ulicRejstrik || !ulicRejstrik.startsWith(`${ulicKatalog}/`)) return adresaKatalog;
  // Za lomítkem musí být orientační číslo (např. 56, 9a), ne cokoli jiného.
  if (!/^\d+[A-Za-z]?$/.test(ulicRejstrik.slice(ulicKatalog.length + 1))) return adresaKatalog;
  return [ulicRejstrik, ...adresaKatalog.split(',').slice(1).map((c) => c.trim())].join(', ');
}
