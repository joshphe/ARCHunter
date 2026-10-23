import { NextResponse } from 'next/server';
import { ARC_USDC, EVM_ADDRESS, WalletBusyError } from '@/lib/wallet-provider';
import { isWalletRange } from '@/lib/wallet-lookup';
import { getWalletPnl } from '@/lib/wallet-pnl';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const address = params.get('address')?.trim() ?? '';
  const token = params.get('token')?.trim() ?? '';
  const range = params.get('range') ?? '30d';
  if (!EVM_ADDRESS.test(address) || !EVM_ADDRESS.test(token) || token.toLowerCase() === ARC_USDC || !isWalletRange(range)) {
    return NextResponse.json({ code: 'INVALID_QUERY' }, { status: 400 });
  }
  try { return NextResponse.json(await getWalletPnl(address, token, range), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) {
    const busy = error instanceof WalletBusyError;
    return NextResponse.json({ code: busy ? 'BUSY' : 'UNAVAILABLE' }, { status: busy ? 429 : 503,
      headers: { 'Cache-Control': 'no-store', ...(busy ? { 'Retry-After': '15' } : {}) } });
  }
}
