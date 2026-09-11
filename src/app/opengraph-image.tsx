import { createOgImage } from '@/lib/og-image';

export const alt = 'Najdi si svou střední školu. Přijímání 2027 a historické výsledky škol.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Default Node runtime; local fonts and illustration are bundled with the route.
export default function Image() {
  return createOgImage('home');
}
