import type { NextRequest } from 'next/server';

export function isDemoRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname === '/demo';
}
