import { NextRequest, NextResponse } from 'next/server';
import { getTokenMetrics, isTokenAddress } from '@/lib/token-metrics';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('addresses') || request.nextUrl.searchParams.get('address') || '';
  const addresses = [...new Set(raw.split(',').map((address) => address.trim()).filter(Boolean))];
  if (!addresses.length || addresses.length > 30 || addresses.some((address) => !isTokenAddress(address))) {
    return NextResponse.json({ error: 'Provide 1–30 valid EVM addresses in the address or addresses query parameter.' }, { status: 400 });
  }
  const metrics = await getTokenMetrics(addresses);
  return NextResponse.json(Object.fromEntries(metrics), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
