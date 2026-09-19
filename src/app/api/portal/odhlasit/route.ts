import { NextRequest, NextResponse } from 'next/server';
import { zrusRelaci } from '@/lib/portal-relace';

export async function POST(request: NextRequest) {
  const odpoved = NextResponse.redirect(new URL('/pro-skoly', request.url), 303);
  zrusRelaci(odpoved);
  return odpoved;
}
