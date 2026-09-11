import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Pořadí nerozhoduje: podle specifikace robots.txt vyhrává nejdelší
      // shoda vzoru, takže konkrétní Allow přebije obecné Disallow: /api/.
      allow: [
        '/',
        // Strojově čitelné profily škol inzerované v /llms.txt.
        // Veřejné /skola/{slug}.md a .json sem míří přes rewrite
        // v next.config.ts, crawler ale může narazit i na cílovou cestu.
        '/api/skola/',
        // Vyhledávání škol, rovněž uvedené v /llms.txt.
        '/api/schools/search',
      ],
      // Zbytek API je buď zápisový (bug-report), nebo jde o interní
      // dotazovací rozhraní stránek bez samostatné informační hodnoty.
      disallow: ['/api/', '/_next/'],
    },
    sitemap: 'https://prijimackynaskolu.cz/sitemap.xml',
  };
}
