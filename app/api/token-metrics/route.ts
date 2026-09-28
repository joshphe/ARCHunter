import { NextRequest, NextResponse } from 'next/server';
import { getTokenMetrics, isTokenAddress } from '@/lib/token-metrics';
import { listPublishedTokenAddresses } from '@/lib/projects-db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('addresses') || request.nextUrl.searchParams.get('address') || '';
  const addresses = [...new Set(raw.split(',').map((address) => address.trim()).filter(Boolean))];
  if (!addresses.length || addresses.length > 30 || addresses.some((address) => !isTokenAddress(address))) {
    return NextResponse.json({ error: 'Provide 1–30 valid EVM addresses in the address or addresses query parameter.' }, { status: 400 });
  }
  let registered: string[];
  try {
    registered = await listPublishedTokenAddresses();
  } catch {
    return NextResponse.json({ error: 'Token metrics are temporarily unavailable.' }, { status: 503 });
  }
  const allowed = new Set(registered);
  const requested = addresses.map((address) => address.toLowerCase()).filter((address) => allowed.has(address));
  if (!requested.length || requested.length !== addresses.length) {
    return NextResponse.json({ error: 'Only published project token addresses are supported.' }, { status: 400 });
  }
  const metrics = await getTokenMetrics(requested);
  return NextResponse.json(Object.fromEntries(metrics), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
