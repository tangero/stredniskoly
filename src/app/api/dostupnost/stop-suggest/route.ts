import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type TransitGraphData = {
  stops: Record<string, [string, number, number]>;
  edges: Record<string, [string, number, string[]][]>;
  headways?: Record<string, number>;
};

type StopEntry = {
  stopId: string;
  name: string;
  nameNorm: string;
  lat: number;
  lon: number;
  context: string | null;
};

let graphCache: TransitGraphData | null = null;
let stopIndex: StopEntry[] | null = null;
let prefixMap: Map<string, number[]> | null = null;

const REGION_TAG_TO_LABEL: Record<string, string> = {
  PID: 'Praha + Středočeský kraj',
  PID_ASW: 'Praha + Středočeský kraj',
  PID_GTFS: 'Praha + Středočeský kraj',
  IDPK: 'Plzeňský kraj',
  IDSJMK: 'Jihomoravský kraj',
  JMK_GTFS: 'Jihomoravský kraj',
  DUK: 'Ústecký kraj',
  IDZK: 'Zlínský kraj',
  DPO: 'Moravskoslezský kraj',
  DPO_GTFS: 'Moravskoslezský kraj',
  PMDP_GTFS: 'Plzeňský kraj',
  DPKV: 'Karlovarský kraj',
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadGraph(): Promise<TransitGraphData> {
  if (graphCache) return graphCache;
  const filePath = path.join(process.cwd(), 'data', 'transit_graph.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as TransitGraphData;
  graphCache = parsed;
  return parsed;
}

function addPrefixes(pMap: Map<string, number[]>, word: string, idx: number): void {
  for (let len = 1; len <= Math.min(3, word.length); len++) {
    const prefix = word.slice(0, len);
    let arr = pMap.get(prefix);
    if (!arr) {
      arr = [];
      pMap.set(prefix, arr);
    }
    arr.push(idx);
  }
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const absValue = Math.abs(value).toFixed(3);
  const hemisphere = value >= 0 ? positive : negative;
  return `${absValue}°${hemisphere}`;
}

function contextFromCoordinates(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return null;
  }
  return `${formatCoordinate(lat, 'N', 'S')}, ${formatCoordinate(lon, 'E', 'W')}`;
}

function contextFromStopId(stopId: string): string | null {
  const labels = new Set<string>();

  for (const token of stopId.split('|')) {
    const sep = token.indexOf(':');
    if (sep <= 0) continue;
    const tag = token.slice(0, sep);
    const regionLabel = REGION_TAG_TO_LABEL[tag];
    if (regionLabel) {
      labels.add(regionLabel);
    }
  }

  if (labels.size === 0) return null;
  return [...labels].join(' / ');
}

function fallbackIdContext(stopId: string): string | null {
  for (const token of stopId.split('|')) {
    if (token.startsWith('CRZ:')) {
      return `CRZ ${token.slice(4)}`;
    }
    if (token.startsWith('CISJR:')) {
      return `CISJR ${token.slice(6)}`;
    }
  }
  return null;
}

function buildDisambiguationContext(entry: Pick<StopEntry, 'stopId' | 'lat' | 'lon'>): string {
  return (
    contextFromStopId(entry.stopId) ??
    contextFromCoordinates(entry.lat, entry.lon) ??
    fallbackIdContext(entry.stopId) ??
    'jiná lokalita'
  );
}

function buildIndex(graph: TransitGraphData): void {
  if (stopIndex) return;

  const entries: StopEntry[] = [];
  const pMap = new Map<string, number[]>();
  const nameCounts = new Map<string, number>();
  const seen = new Set<string>();

  for (const [stopId, [name, lat, lon]] of Object.entries(graph.stops)) {
    const nameNorm = normalizeText(name);
    const idx = entries.length;
    entries.push({ stopId, name, nameNorm, lat, lon, context: null });
    nameCounts.set(nameNorm, (nameCounts.get(nameNorm) ?? 0) + 1);

    // Index prefixes of every word so substring search works
    // e.g. "brandys nad labem-stara boleslav, zahradni mesto"
    // → words: brandys, nad, labem, stara, boleslav, zahradni, mesto
    seen.clear();
    const words = nameNorm.split(/[\s,\-]+/);
    for (const word of words) {
      if (word.length === 0 || seen.has(word)) continue;
      seen.add(word);
      addPrefixes(pMap, word, idx);
    }
  }

  // Deduplicate indices within each prefix bucket
  for (const [key, arr] of pMap) {
    pMap.set(key, [...new Set(arr)]);
  }

  // Only names with duplicates need extra context in autocomplete.
  for (const entry of entries) {
    if ((nameCounts.get(entry.nameNorm) ?? 0) > 1) {
      entry.context = buildDisambiguationContext(entry);
    }
  }

  stopIndex = entries;
  prefixMap = pMap;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  const limitRaw = Number(searchParams.get('limit') ?? '10');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(30, limitRaw)) : 10;

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const graph = await loadGraph();
    buildIndex(graph);

    const queryNorm = normalizeText(query);
    const index = stopIndex!;
    const pMap = prefixMap!;

    // Determine candidate set
    let candidates: StopEntry[];
    const prefixKey = queryNorm.slice(0, Math.min(3, queryNorm.length));
    const candidateIndices = pMap.get(prefixKey);

    if (candidateIndices) {
      candidates = candidateIndices.map((i) => index[i]);
    } else {
      // No prefix match at all — return empty
      return NextResponse.json({ suggestions: [], totalFound: 0 });
    }

    // Filter candidates
    const matches: StopEntry[] = [];
    for (const entry of candidates) {
      if (entry.nameNorm.includes(queryNorm)) {
        matches.push(entry);
      }
    }

    const totalFound = matches.length;

    // Sort: exact → nameStartsWith → wordBoundary → contains, then shorter name first
    const isWordStart = (name: string, q: string): boolean => {
      const idx = name.indexOf(q);
      if (idx <= 0) return idx === 0;
      const ch = name[idx - 1];
      return ch === ' ' || ch === ',' || ch === '-';
    };

    matches.sort((a, b) => {
      const aExact = a.nameNorm === queryNorm ? 0 : 1;
      const bExact = b.nameNorm === queryNorm ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = a.nameNorm.startsWith(queryNorm) ? 0 : 1;
      const bStarts = b.nameNorm.startsWith(queryNorm) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aWord = isWordStart(a.nameNorm, queryNorm) ? 0 : 1;
      const bWord = isWordStart(b.nameNorm, queryNorm) ? 0 : 1;
      if (aWord !== bWord) return aWord - bWord;
      const lenDiff = a.name.length - b.name.length;
      if (lenDiff !== 0) return lenDiff;
      const nameDiff = a.name.localeCompare(b.name, 'cs');
      if (nameDiff !== 0) return nameDiff;
      return (a.context ?? '').localeCompare(b.context ?? '', 'cs');
    });

    const results = matches.slice(0, limit).map((e) => ({
      stopId: e.stopId,
      name: e.name,
      lat: e.lat,
      lon: e.lon,
      context: e.context ?? undefined,
    }));

    return NextResponse.json({ suggestions: results, totalFound });
  } catch (error) {
    console.error('Stop suggest error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
