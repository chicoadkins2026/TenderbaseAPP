import { NextResponse } from 'next/server';
import { fetchETendersPage } from '@/lib/etenders-client.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = Number(url.searchParams.get('start') ?? 0);
  const length = Number(url.searchParams.get('length') ?? 20);
  const search = url.searchParams.get('q') ?? '';

  try {
    const page = await fetchETendersPage({ start, length, search });
    return NextResponse.json({
      source: 'etenders',
      total: page.recordsFiltered,
      start,
      length,
      results: page.data,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'eTenders discovery failed';
    console.error('[discovery] eTenders request failed:', message);
    return NextResponse.json({
      source: 'etenders',
      error: 'DISCOVERY_SOURCE_UNAVAILABLE',
      message,
    }, { status: 502 });
  }
}
