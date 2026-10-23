import { NextResponse } from 'next/server';
import { EVM_ADDRESS, WalletBusyError } from '@/lib/wallet-provider';
import { getWalletPortfolio } from '@/lib/wallet-portfolio';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const address = params.get('address')?.trim() ?? '';
  if (!EVM_ADDRESS.test(address)) return NextResponse.json({ code: 'INVALID_QUERY' }, { status: 400 });
  try { return NextResponse.json(await getWalletPortfolio(address, params.get('includePrices') !== '0'), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) {
    const busy = error instanceof WalletBusyError;
    return NextResponse.json({ code: busy ? 'BUSY' : 'UNAVAILABLE' }, { status: busy ? 429 : 503,
      headers: { 'Cache-Control': 'no-store', ...(busy ? { 'Retry-After': '15' } : {}) } });
  }
}
