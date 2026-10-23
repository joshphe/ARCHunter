import { NextResponse } from 'next/server';
import { isWalletAddress, isWalletRange, lookupWallet, WalletBusyError } from '@/lib/wallet-lookup';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const address = params.get('address')?.trim() ?? '';
  const range = params.get('range') ?? '30d';
  if (!isWalletAddress(address) || !isWalletRange(range)) {
    return NextResponse.json({ code: 'INVALID_QUERY' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const result = await lookupWallet(address, range);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const busy = error instanceof WalletBusyError;
    return NextResponse.json({ code: busy ? 'BUSY' : 'UNAVAILABLE' }, {
      status: busy ? 429 : 503,
      headers: { 'Cache-Control': 'no-store', ...(busy ? { 'Retry-After': '15' } : {}) },
    });
  }
}
