import type { NextConfig } from "next";
import { SITE_URL } from "./src/lib/site.mjs";

// Security headers pro ochranu aplikace
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://ma.hlidacstatu.cz",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com https://ma.hlidacstatu.cz https://www.vibecoding.cz",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
];

// Cache headers pro statická data - snížení bandwidth nákladů
const cacheHeaders = [
  {
    key: 'Cache-Control',
    value: 'public, max-age=86400, stale-while-revalidate=604800'
  }
];

const PORTAL_DATA = [
  './data/portal/kody.json',
  './data/portal/emaily.json',
  './data/portal/pilot.json',
  './data/inspis_school_profiles.json',
  './data/msmt_rejstrik/nazvy-oboru.json',
];

const nextConfig: NextConfig = {
  // Include data files in serverless function bundles (Vercel)
  outputFileTracingIncludes: {
    '/api/dostupnost': ['./data/transit_graph.json', './data/school_locations.json'],
    '/api/dostupnost/stop-suggest': ['./data/transit_graph.json'],
    '/admin': ['./data/portal/pilot.json'],
    // Portál čte data/ za běhu (fs.readFile), Next je sám nepřibalí. Bez nich
    // se každý kód tváří jako neplatný a rejstříková adresa jako neznámá.
    '/pro-skoly/**': PORTAL_DATA,
    '/api/portal/**': PORTAL_DATA,
    '/api/portal-skoly': PORTAL_DATA,
    '/api/portal-magic': PORTAL_DATA,
    '/admin/**': PORTAL_DATA,
  },

  // Security a cache headers
  async headers() {
    return [
      // Vercel preview zůstává funkční, ale nesmí se indexovat (ani JSON/PDF).
      {
        source: '/:path*',
        has: [{ type: 'host', value: '.*\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      // Security headers pro všechny stránky
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Cache headers pro velké JSON soubory (snížení bandwidth)
      {
        source: '/schools_data.json',
        headers: cacheHeaders,
      },
      {
        source: '/school_analysis.json',
        headers: cacheHeaders,
      },
      {
        source: '/school_details/:path*',
        headers: cacheHeaders,
      },
    ];
  },

  // Permanent redirects
  async redirects() {
    return [
      // Pouze známý veřejný alias, ne všechny vývojové deploymenty.
      // Next zachová cestu i query string; 308 zachovává i HTTP metodu.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'stredniskoly\\.vercel\\.app' }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
      {
        source: '/praha-dostupnost',
        destination: '/dostupnost',
        permanent: true,
      },
      {
        source: '/praha-dostupnost/:path*',
        destination: '/dostupnost',
        permanent: true,
      },
      {
        source: '/regiony/praha',
        destination: '/regiony/hlavni-mesto-praha',
        permanent: true,
      },
      {
        source: '/vysledky-2026',
        destination: '/vysledky/2026',
        permanent: true,
      },
      // /moje-sance zrušena. Přesměrování musí být trvalé (308): dřív ho dělala
      // stránka přes `redirect()`, což je 307, a vyhledávač dočasné přesměrování
      // nebere jako přestěhování – starou adresu drží v indexu a nepřenese na ni
      // navázané odkazy. Parametr výběru (?skoly=…) i ostatní dotazy přenese Next sám,
      // protože cíl žádné vlastní nemá.
      {
        source: '/moje-sance',
        destination: '/simulator',
        permanent: true,
      },
      {
        source: '/moje-sance/:path*',
        destination: '/simulator',
        permanent: true,
      },
      // Průvodci sloučeni do jednoho návodu (docs/pruvodce-vyberem-skoly-2027.md).
      // Kotva míří na krok, který nese obsah zrušené stránky.
      {
        source: '/jak-funguje-prijimani',
        destination: '/jak-vybrat-skolu#jak-se-rozhoduje',
        permanent: true,
      },
    ];
  },

  // Optimalizace pro produkci
  poweredByHeader: false, // Skrýt X-Powered-By header

  // Komprese
  compress: true,

  // Rewrites pro strojově čitelné formáty stránek škol
  async rewrites() {
    return [
      { source: '/skola/:slug.md', destination: '/api/skola/:slug/md' },
      { source: '/skola/:slug.json', destination: '/api/skola/:slug/json' },
    ];
  },
};

export default nextConfig;
