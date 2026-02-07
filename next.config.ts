import type { NextConfig } from "next";

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com",
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

const nextConfig: NextConfig = {
  // Include data files in serverless function bundles (Vercel)
  outputFileTracingIncludes: {
    '/api/dostupnost': ['./data/transit_graph.json', './data/school_locations.json'],
    '/api/dostupnost/stop-suggest': ['./data/transit_graph.json'],
  },

  // Security a cache headers
  async headers() {
    return [
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

  // Optimalizace pro produkci
  poweredByHeader: false, // Skrýt X-Powered-By header

  // Komprese
  compress: true,
};

export default nextConfig;
