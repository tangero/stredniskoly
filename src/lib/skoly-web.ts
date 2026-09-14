import { promises as fs } from 'fs';
import path from 'path';

/** Web školy z rejstříku MŠMT, public/skoly_web.json (scripts/build-skoly-web.py). */
let cache: Record<string, string> | null = null;

export async function getWebSkoly(redizo: string): Promise<string | null> {
  if (!cache) {
    try {
      cache = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', 'skoly_web.json'), 'utf-8')).weby ?? {};
    } catch {
      cache = {};
    }
  }
  return cache![redizo] ?? null;
}
