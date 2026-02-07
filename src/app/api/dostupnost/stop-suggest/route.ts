import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type TransitGraphData = {
  stops: Record<string, [string, number, number]>;
  edges: Record<string, [string, number][]>;
};

type StopEntry = {
  stopId: string;
  name: string;
  nameNorm: string;
  lat: number;
  lon: number;
};

let graphCache: TransitGraphData | null = null;
let stopIndex: StopEntry[] | null = null;
let prefixMap: Map<string, number[]> | null = null;

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

function buildIndex(graph: TransitGraphData): void {
  if (stopIndex) return;

  const entries: StopEntry[] = [];
  const pMap = new Map<string, number[]>();

  for (const [stopId, [name, lat, lon]] of Object.entries(graph.stops)) {
    const nameNorm = normalizeText(name);
    const idx = entries.length;
    entries.push({ stopId, name, nameNorm, lat, lon });

    // Build prefix map for 1, 2, and 3 character prefixes
    for (let len = 1; len <= Math.min(3, nameNorm.length); len++) {
      const prefix = nameNorm.slice(0, len);
      let arr = pMap.get(prefix);
      if (!arr) {
        arr = [];
        pMap.set(prefix, arr);
      }
      arr.push(idx);
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

    // Sort: exact → startsWith → contains, then shorter name first
    matches.sort((a, b) => {
      const aExact = a.nameNorm === queryNorm ? 0 : 1;
      const bExact = b.nameNorm === queryNorm ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = a.nameNorm.startsWith(queryNorm) ? 0 : 1;
      const bStarts = b.nameNorm.startsWith(queryNorm) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.length - b.name.length;
    });

    const results = matches.slice(0, limit).map((e) => ({
      stopId: e.stopId,
      name: e.name,
      lat: e.lat,
      lon: e.lon,
    }));

    return NextResponse.json({ suggestions: results, totalFound });
  } catch (error) {
    console.error('Stop suggest error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
