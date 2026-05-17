import { promises as fs } from 'fs';
import path from 'path';
import type { CityStats } from './cityData';

export interface CityNarrative {
  celkovyObraz: string;
  gymnazia: string;
  odborneSkoly: string;
  koneknurence: string;
  trendVyvoj: string;
}

const CACHE_FILE = path.join(process.cwd(), 'data', 'city_narratives.json');

async function readCache(): Promise<Record<string, CityNarrative>> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCache(cache: Record<string, CityNarrative>): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
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
      lines.push(`  Průměr ČJ bodů přijatých 2026: ${t.avgCj2026 !== null ? formatNum(t.avgCj2026, 1) : 'N/A'} b. (škála 0–50 b.)`);
      lines.push(`  Průměr MA bodů přijatých 2026: ${t.avgMa2026 !== null ? formatNum(t.avgMa2026, 1) : 'N/A'} b. (škála 0–50 b.)`);
      lines.push(`  Průměr ČJ+MA celkem 2026: ${formatNum(t.avgCjMa2026, 1)} b. (škála 0–100 b., součet obou předmětů)`);
      lines.push(`  Průměr ČJ+MA celkem 2025: ${t.avgCjMaPrev !== null ? formatNum(t.avgCjMaPrev, 1) : 'N/A'} b.`);
      lines.push(`  Delta 2026 vs 2025: ${t.avgDelta !== null ? (t.avgDelta > 0 ? '+' : '') + formatNum(t.avgDelta, 1) : 'N/A'} b.`);
      lines.push(`  ČR průměr ČJ+MA 2026 pro ${t.label}: ${natCjMa} b. (z ${nat?.count ?? 0} oborů)`);
    }
    if (t.avgRankPct !== null) {
      lines.push(`  Průměrný percentil škol v ČR: ${formatNum(t.avgRankPct, 0)}. percentil (vyšší = lepší školy)`);
    }
  }

  return lines.join('\n');
}

export async function generateCityNarrative(stats: CityStats): Promise<CityNarrative> {
  const cacheKey = stats.mesto.slug;

  // Return cached version if available — avoids API call on every deploy
  const cache = await readCache();
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const dataContext = buildDataContext(stats);
  const mestoName = stats.mesto.nazev;

  const systemPrompt = `Jsi analytik vzdělávání, který píše faktické, novinářsky laděné texty o středním školství v ČR.
Píšeš pro rodiče a uchazeče o střední školy. Styl: přesný, srozumitelný, bez zbytečných superlativů.
Používáš čísla z dat, ale překládáš je do kontextu (snazší/těžší, roste/klesá, pod/nad průměrem ČR).
Každý odstavec má 3-5 vět. Nepoužívej odrážky ani nadpisy. Piš v češtině.

=== KONTEXT: JAK FUNGUJE PŘIJÍMACÍ ŘÍZENÍ NA STŘEDNÍ ŠKOLY V ČR (od roku 2024) ===
- Centrální digitální systém přihlášek (DiPSy) spravuje CERMAT.
- Každý uchazeč může v 1. kole podat až 3 přihlášky (do roku 2023 to byly 2). Pokud se hlásí na obor s talentovou zkouškou, podává navíc až 2 talentové přihlášky.
- Uchazeč si přihlášky seřadí podle priority. Pokud uspěje na více školách, je přijat na tu s nejvyšší prioritou; ostatní pořadí se nepoužije.
- Jednotnou přijímací zkoušku (JPZ) z češtiny a matematiky pořádá CERMAT pro všechny maturitní obory (gymnázia, lycea, SOŠ s maturitou). SOU/učiliště bez maturity JPZ nepíší.
- Z této struktury plyne: počet PŘIHLÁŠEK ≠ počet UCHAZEČŮ. Jeden uchazeč může v datech vystupovat až 3×. Skutečný počet odmítnutých osob je tedy podstatně nižší než (přihlášky − přijatí); typicky se 1 uchazeč = ~2–3 přihlášky.
- Index poptávky (přihlášky/kapacita) je proto inflační — hodnota 3× neznamená nutně 3 uchazeče na místo, ale spíše 1–1,5 uchazeče na místo po zohlednění duplikací.

=== DŮLEŽITÉ POJMY ===
- Index poptávky = přihlášky ÷ kapacita. Průměr ČR 2026 = 2,95×
- ČJ a MA jsou body z JPZ testu (0–50 b. za každý předmět), ČJ+MA celkem má rozsah 0–100 b.
- Při zmiňování výsledků říkej například "průměr 34 bodů z češtiny a 28 bodů z matematiky" (z max 50)
- Rank percentil: 80. percentil = lepší než 80 % škol daného typu v ČR
- Data 2026 jsou z 1. kola přijímacího řízení (CERMAT), kapacity SOU bez JPZ mohou být neúplné

=== KLÍČOVÉ PRAVIDLO PRO INTERPRETACI ===
Když píšeš o odmítnutých/neúspěšných uchazečích, NIKDY neuvádět rozdíl (přihlášky − přijatí) jako počet odmítnutých osob. Vždy zdůrazni, že protože jeden uchazeč mohl podat až 3 přihlášky, skutečný počet odmítnutých osob je výrazně nižší — odhadem 2–3× nižší než tento rozdíl.`;

  const userPrompt = `Níže jsou data pro město ${mestoName}. Napiš 5 oddělených odstavců (odděl je prázdným řádkem a prefixem ve formátu "BLOK:nazev_bloku"):

BLOK:celkovy_obraz — Celkový přehled situace ve městě: počet míst, přihlášek, index poptávky vs ČR průměr, celkový trend kapacit. Zmiň, zda je ve městě snazší nebo těžší dostat se na střední školu než průměrně v ČR.

BLOK:gymnazia — Situace u gymnázií (všech typů, které ve městě jsou). Kolik míst nabízí, jak velký je zájem, jak obtížné jsou přijímačky vs celorepublikový průměr (průměrné body ČJ+MA přijatých, max 100), jak se to meziročně změnilo (delta). Zmiň percentilové umístění škol v ČR.

BLOK:odborne_skoly — Situace u odborných škol (SOŠ, SOU, lycea). Zájem o tyto školy, srovnání s gymnázii, jak moc jsou dostupná místa. Pokud data chybí, vysvětli proč (SOU bez JPZ zkoušek).

BLOK:konkurence — Kolik uchazečů se nedostane. Vyjdi z čísel (přihlášky, přijatí, kapacita), ale POZOR: jeden uchazeč mohl podat až 3 přihlášky, takže rozdíl (přihlášky − přijatí) je zhruba 2–3× vyšší než skutečný počet odmítnutých osob. Tohle zohlední — neuváděj rozdíl jako počet uchazečů. Srovnej náročnost (index poptávky) s ČR průměrem 2,95×.

BLOK:trend_vyvoj — Tříletý vývoj 2024→2025→2026: jak se vyvíjejí kapacity a zájem. Mění se obtížnost přijetí? Jsou nějaké výrazné změny oproti minulým rokům?

Data:
${dataContext}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.prijimackynaskolu.cz',
      'X-Title': 'Prijimackynaskolu.cz',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  const text: string = json.choices?.[0]?.message?.content ?? '';

  const parse = (key: string): string => {
    const regex = new RegExp(`BLOK:${key}\\s*\\n([\\s\\S]*?)(?=\\nBLOK:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const narrative: CityNarrative = {
    celkovyObraz: parse('celkovy_obraz'),
    gymnazia: parse('gymnazia'),
    odborneSkoly: parse('odborne_skoly'),
    koneknurence: parse('konkurence'),
    trendVyvoj: parse('trend_vyvoj'),
  };

  // Persist to cache so next build skips the API call
  cache[cacheKey] = narrative;
  await writeCache(cache);

  return narrative;
}
