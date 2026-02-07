import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type TransitGraphData = {
  stops: Record<string, [string, number, number]>;
  edges: Record<string, [string, number][]>;
};

let graphCache: TransitGraphData | null = null;

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
    const queryNorm = normalizeText(query);
    const results: Array<{ stopId: string; name: string; lat: number; lon: number }> = [];

    for (const [stopId, [name, lat, lon]] of Object.entries(graph.stops)) {
      const nameNorm = normalizeText(name);
      if (nameNorm.includes(queryNorm)) {
        results.push({ stopId, name, lat, lon });
        if (results.length >= limit * 3) break;
      }
    }

    results.sort((a, b) => {
      const aNorm = normalizeText(a.name);
      const bNorm = normalizeText(b.name);
      const aExact = aNorm === queryNorm ? 0 : 1;
      const bExact = bNorm === queryNorm ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = aNorm.startsWith(queryNorm) ? 0 : 1;
      const bStarts = bNorm.startsWith(queryNorm) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.length - b.name.length;
    });

    return NextResponse.json({
      suggestions: results.slice(0, limit),
    });
  } catch (error) {
    console.error('Stop suggest error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
