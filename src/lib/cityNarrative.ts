import Anthropic from '@anthropic-ai/sdk';
import type { CityStats } from './cityData';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface CityNarrative {
  celkovyObraz: string;
  gymnazia: string;
  odborneSkoly: string;
  koneknurence: string;
  trendVyvoj: string;
}

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function trend(a: number, b: number): string {
  const diff = b - a;
  if (Math.abs(diff) < 0.05 * a) return 'stabilní';
  return diff > 0 ? 'rostoucí' : 'klesající';
}

function buildDataContext(stats: CityStats): string {
  const { mesto, totals, byType, national } = stats;

  const lines: string[] = [
    `=== Data pro ${mesto.nazev} (${mesto.kraj}) ===`,
    '',
    '--- CELKOVÉ STATISTIKY ---',
    `Kapacita 2024: ${formatNum(totals.kapacita2024)} míst`,
    `Kapacita 2025: ${formatNum(totals.kapacita2025)} míst`,
    `Kapacita 2026: ${formatNum(totals.kapacita2026)} míst (pozn: neúplná data pro SOU/obory bez JPZ)`,
    `Přihlášky 2024: ${formatNum(totals.prihlasky2024)}`,
    `Přihlášky 2025: ${formatNum(totals.prihlasky2025)}`,
    `Přihlášky 2026: ${formatNum(totals.prihlasky2026)}`,
    `Přijatí 2026 (CERMAT): ${formatNum(totals.prijati2026)}`,
    `Index poptávky 2026 (město): ${totals.kapacita2026 > 0 ? formatNum(totals.prihlasky2026 / totals.kapacita2026, 2) : 'N/A'}`,
    `Index poptávky 2026 (ČR průměr): ${formatNum(totals.nationalIndex2026, 2)}`,
    `Trend kapacity 2024→2026: ${trend(totals.kapacita2024, totals.kapacita2026)}`,
    `Trend přihlášek 2024→2026: ${trend(totals.prihlasky2024, totals.prihlasky2026)}`,
    '',
    '--- STATISTIKY PODLE TYPU ŠKOLY ---',
  ];

  for (const t of byType) {
    const nat = national[t.typ];
    const idx2026 = t.kapacita2026 > 0 ? t.prihlasky2026 / t.kapacita2026 : null;
    const natCjMa = nat ? formatNum(nat.avgCjMa, 1) : 'N/A';
    lines.push(`\n[${t.label}]`);
    lines.push(`  Oborů celkem (2025): ${t.totalCount2025}, z toho s CERMAT daty 2026: ${t.cermatCount}`);
    lines.push(`  Kapacita: 2024=${formatNum(t.kapacita2024)}, 2025=${formatNum(t.kapacita2025)}, 2026=${formatNum(t.kapacita2026)}`);
    lines.push(`  Přihlášky: 2024=${formatNum(t.prihlasky2024)}, 2025=${formatNum(t.prihlasky2025)}, 2026=${formatNum(t.prihlasky2026)}`);
    lines.push(`  Index poptávky 2026: ${idx2026 ? formatNum(idx2026, 2) : 'N/A'}×`);
    lines.push(`  Přijatí 2026: ${formatNum(t.prijati2026)}`);
    if (t.avgCjMa2026 !== null) {
      lines.push(`  Průměr CJ+MA přijatých 2026: ${formatNum(t.avgCjMa2026, 1)} bodů (max 100)`);
      lines.push(`  Průměr CJ+MA přijatých 2025: ${t.avgCjMaPrev !== null ? formatNum(t.avgCjMaPrev, 1) : 'N/A'} bodů`);
      lines.push(`  Delta 2026 vs 2025: ${t.avgDelta !== null ? (t.avgDelta > 0 ? '+' : '') + formatNum(t.avgDelta, 1) : 'N/A'} bodů`);
      lines.push(`  ČR průměr CJ+MA 2026 pro ${t.label}: ${natCjMa} bodů (z ${nat?.count ?? 0} oborů)`);
    }
    if (t.avgRankPct !== null) {
      lines.push(`  Průměrný percentil škol v ČR: ${formatNum(t.avgRankPct, 0)}. percentil (vyšší = lepší školy)`);
    }
  }

  return lines.join('\n');
}

export async function generateCityNarrative(stats: CityStats): Promise<CityNarrative> {
  const dataContext = buildDataContext(stats);
  const mestoName = stats.mesto.nazev;

  const systemPrompt = `Jsi analytik vzdělávání, který píše faktické, novinářsky laděné texty o středním školství v ČR.
Píšeš pro rodiče a uchazeče o střední školy. Styl: přesný, srozumitelný, bez zbytečných superlativů.
Používáš čísla z dat, ale překládáš je do kontextu (snazší/těžší, roste/klesá, pod/nad průměrem ČR).
Každý odstavec má 3-5 vět. Nepoužívej odrážky ani nadpisy. Piš v češtině.

DŮLEŽITÉ:
- Index poptávky = přihlášky ÷ kapacita. Průměr ČR 2026 = 2,95×
- CJ+MA skóre = součet bodů z češtiny (max 50) a matematiky (max 50), celkem max 100 bodů (CERMAT JPZ test)
- Rank percentil: 80. percentil = lepší než 80 % škol daného typu v ČR
- Data 2026 jsou z 1. kola přijímacího řízení (CERMAT), kapacity SOU bez JPZ mohou být neúplné
- Každý uchazeč může podat 2 přihlášky → skutečný počet odmítnutých osob je nižší než přihlášky minus přijatí`;

  const userPrompt = `Níže jsou data pro město ${mestoName}. Napiš 5 oddělených odstavců (odděl je prázdným řádkem a prefixem ve formátu "BLOK:nazev_bloku"):

BLOK:celkovy_obraz — Celkový přehled situace ve městě: počet míst, přihlášek, index poptávky vs ČR průměr, celkový trend kapacit. Zmiň, zda je ve městě snazší nebo těžší dostat se na střední školu než průměrně v ČR.

BLOK:gymnazia — Situace u gymnázií (všech typů, které ve městě jsou). Kolik míst nabízí, jak velký je zájem, jak obtížné jsou přijímačky vs celorepublikový průměr (CJ+MA skóre), jak se to meziročně změnilo (delta). Zmiň percentilové umístění škol v ČR.

BLOK:odborne_skoly — Situace u odborných škol (SOŠ, SOU, lycea). Zájem o tyto školy, srovnání s gymnázii, jak moc jsou dostupná místa. Pokud data chybí, vysvětli proč (SOU bez JPZ zkoušek).

BLOK:konkurence — Kolik uchazečů se nedostane. Přihlášky minus přijatí. Upozorni, že jeden uchazeč mohl podat 2 přihlášky, takže skutečné odmítnuté osoby je méně. Srovnej s ČR průměrem.

BLOK:trend_vyvoj — Tříletý vývoj 2024→2025→2026: jak se vyvíjejí kapacity a zájem. Mění se obtížnost přijetí? Jsou nějaké výrazné změny oproti minulým rokům?

Data:
${dataContext}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const response = await getClient().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse blocks
  const parse = (key: string): string => {
    const regex = new RegExp(`BLOK:${key}\\s*\\n([\\s\\S]*?)(?=\\nBLOK:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    celkovyObraz: parse('celkovy_obraz'),
    gymnazia: parse('gymnazia'),
    odborneSkoly: parse('odborne_skoly'),
    koneknurence: parse('konkurence'),
    trendVyvoj: parse('trend_vyvoj'),
  };
}
