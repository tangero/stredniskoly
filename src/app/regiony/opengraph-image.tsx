import { createOgImage } from '@/lib/og-image';

export const alt = 'Střední školy podle krajů. Obory a možnosti dojíždění ve 14 krajích ČR.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Default Node runtime; local fonts and illustration are bundled with the route.
export default function Image() {
  return createOgImage('regions');
}
