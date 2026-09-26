import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-static';

export function GET() {
  return new Response(readFileSync(join(process.cwd(), 'public/app-icons/icon-512.png')), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
