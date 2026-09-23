/** Úzká kontrola zjevné propagace hazardu v titulku školní novinky.
 * Odkaz musí nést stejný motiv; samotná zmínka o hazardu ve školním článku
 * nestačí. Výsledek je podklad pro karanténu a ruční kontrolu, ne obecný
 * klasifikátor obsahu školy.
 */
export function podezreniNaSpam(titulek: string, url: string): string | null {
  const normalizuj = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = normalizuj(titulek);
  const cesta = (() => {
    try { return normalizuj(decodeURIComponent(new URL(url).pathname)); }
    catch { return ''; }
  })();
  const kasino = /casin|kasin|kasyn|kazin|казино/i;
  const automaty = /gokken|speelautomaten|hracie.automaty/i;
  const ruleta = /roulette|rulet/i;
  const blackjack = /blackjack/i;
  if (
    (kasino.test(text) && kasino.test(cesta)) ||
    (automaty.test(text) && automaty.test(cesta)) ||
    (ruleta.test(text) && ruleta.test(cesta) && /fiches|virtual|digitale|vyplat|online|live/i.test(text)) ||
    (blackjack.test(text) && blackjack.test(cesta) && /online|elettronico|bonus|casino/i.test(text))
  ) return 'propagace hazardu v titulku i odkazu';
  if (/كازينو/.test(text) && /kzynw/.test(cesta)) return 'propagace hazardu v titulku i odkazu';
  return null;
}
