import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'stredniskoly-praha-dostupnost/0.1';
const REQUEST_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 10 * 60 * 1000;

type Suggestion = {
  label: string;
  value: string;
};

type CoverageMode = 'praha' | 'pid_region';

type NominatimItem = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
};

type CacheEntry = {
  suggestions: Suggestion[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

const PID_REGION_BBOX = {
  minLat: 49.35,
  maxLat: 50.75,
  minLon: 13.2,
  maxLon: 15.95,
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isPrahaAddress(item: { display_name?: string; address?: Record<string, string> }): boolean {
  const display = (item.display_name || '').toLowerCase();
  const city = (item.address?.city || '').toLowerCase();
  const municipality = (item.address?.municipality || '').toLowerCase();
  const district = (item.address?.city_district || '').toLowerCase();
  return (
    display.includes('praha') ||
    city.includes('praha') ||
    municipality.includes('praha') ||
    district.includes('praha')
  );
}

function inPidRegionByCoords(item: NominatimItem): boolean {
  const lat = Number.parseFloat(item.lat ?? '');
  const lon = Number.parseFloat(item.lon ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return (
    lat >= PID_REGION_BBOX.minLat &&
    lat <= PID_REGION_BBOX.maxLat &&
    lon >= PID_REGION_BBOX.minLon &&
    lon <= PID_REGION_BBOX.maxLon
  );
}

function isCzAddress(item: NominatimItem): boolean {
  const countryCode = (item.address?.country_code || '').toLowerCase();
  return countryCode === '' || countryCode === 'cz';
}

function buildSuggestion(item: NominatimItem, coverageMode: CoverageMode): Suggestion {
  const address = item.address || {};
  const road = address.road || address.pedestrian || address.footway || '';
  const number = address.house_number || '';
  const district = address.city_district || address.suburb || address.neighbourhood || '';
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    (coverageMode === 'praha' ? 'Praha' : '');
  const postcode = address.postcode || '';

  const head = [road, number].filter(Boolean).join(' ').trim();
  const tail = [district, city, postcode].filter(Boolean).join(', ');
  const label = head
    ? `${head}${tail ? `, ${tail}` : ''}`
    : (item.display_name || '').split(',').slice(0, 3).join(',').trim();
  const value = head
    ? [head, city || 'Česko'].filter(Boolean).join(', ')
    : (item.display_name || '').split(',').slice(0, 2).join(',').trim();

  return {
    label: label || value || 'Česko',
    value: value || label || 'Česko',
  };
}

function parseCoverageMode(raw: string | null): CoverageMode {
  return raw === 'praha' ? 'praha' : 'pid_region';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const qRaw = searchParams.get('q') || '';
  const q = qRaw.trim();
  const coverageMode = parseCoverageMode(searchParams.get('coverageMode'));
  const limitRaw = Number(searchParams.get('limit') || '6');
  const limit = Number.isFinite(limitRaw) ? Math.max(3, Math.min(10, Math.floor(limitRaw))) : 6;

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = `${normalize(q)}|${limit}|${coverageMode}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ suggestions: cached.suggestions });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', coverageMode === 'praha' ? `${q}, Praha, Česko` : `${q}, Česko`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(limit * 3));
  url.searchParams.set('countrycodes', 'cz');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('dedupe', '1');
  if (coverageMode === 'praha') {
    url.searchParams.set('viewbox', '14.1,50.2,14.8,49.9');
    url.searchParams.set('bounded', '1');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const items = (await response.json()) as NominatimItem[];

    const unique = new Set<string>();
    const suggestions: Suggestion[] = [];

    for (const item of items) {
      if (!isCzAddress(item)) continue;
      if (coverageMode === 'praha' && !isPrahaAddress(item)) continue;
      if (coverageMode === 'pid_region' && !inPidRegionByCoords(item)) continue;

      const suggestion = buildSuggestion(item, coverageMode);
      const key = normalize(suggestion.value);
      if (!key || unique.has(key)) continue;
      unique.add(key);
      suggestions.push(suggestion);
      if (suggestions.length >= limit) break;
    }

    cache.set(cacheKey, {
      suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
