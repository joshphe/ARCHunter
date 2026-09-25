import { createHmac } from 'node:crypto';

export type TokenMetrics = {
  priceUsd: number | null;
  priceChange24h: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  totalFee: number | null;
  buys24h: number | null;
  sells24h: number | null;
  source: 'dexscreener' | 'dexscreener+okx' | 'okx';
  sourceUrl: string | null;
  updatedAt: string;
};

type DexPair = {
  chainId?: string;
  url?: string;
  baseToken?: { address?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

type OkxMetric = { priceUsd?: string; price?: string; marketCap?: string; volume24H?: string; liquidity?: string; holders?: string };
type CacheEntry = { expiresAt: number; value: TokenMetrics | null };

const ARC_CHAIN_INDEX = process.env.OKX_ARC_CHAIN_INDEX || '5042';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const addressPattern = /^0x[a-fA-F0-9]{40}$/;

const numberOrNull = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sum = (values: Array<number | null>) => {
  const available = values.filter((value): value is number => value != null);
  return available.length ? available.reduce((total, value) => total + value, 0) : null;
};

async function getDexScreenerMetrics(addresses: string[]): Promise<Map<string, TokenMetrics>> {
  const output = new Map<string, TokenMetrics>();
  if (!addresses.length) return output;
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`DEX Screener returned ${response.status}`);
  const payload = await response.json() as { pairs?: DexPair[] };
  const allPairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  for (const address of addresses) {
    const pairs = allPairs.filter((pair) => pair.chainId === 'arc' && pair.baseToken?.address?.toLowerCase() === address);
    if (!pairs.length) continue;
    const primary = [...pairs].sort((a, b) => (numberOrNull(b.liquidity?.usd) ?? 0) - (numberOrNull(a.liquidity?.usd) ?? 0))[0];
    output.set(address, {
      priceUsd: numberOrNull(primary.priceUsd),
      priceChange24h: numberOrNull(primary.priceChange?.h24),
      marketCapUsd: numberOrNull(primary.marketCap),
      fdvUsd: numberOrNull(primary.fdv),
      liquidityUsd: sum(pairs.map((pair) => numberOrNull(pair.liquidity?.usd))),
      volume24hUsd: sum(pairs.map((pair) => numberOrNull(pair.volume?.h24))),
      holders: null,
      totalFee: null,
      buys24h: sum(pairs.map((pair) => numberOrNull(pair.txns?.h24?.buys))),
      sells24h: sum(pairs.map((pair) => numberOrNull(pair.txns?.h24?.sells))),
      source: 'dexscreener',
      sourceUrl: primary.url || null,
      updatedAt: new Date().toISOString(),
    });
  }
  return output;
}

const hasOkxCredentials = () => Boolean(
  process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_API_PASSPHRASE,
);

async function okxRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const timestamp = new Date().toISOString();
  const bodyText = body == null ? '' : JSON.stringify(body);
  const signature = createHmac('sha256', process.env.OKX_SECRET_KEY!).update(`${timestamp}${method}${path}${bodyText}`).digest('base64');
  const response = await fetch(`https://www.okx.com${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': process.env.OKX_API_PASSPHRASE!,
      ...(process.env.OKX_PROJECT_ID ? { 'OK-ACCESS-PROJECT': process.env.OKX_PROJECT_ID } : {}),
    },
    body: bodyText || undefined,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`OKX returned ${response.status}`);
  const payload = await response.json() as { code?: string; msg?: string; data?: T };
  if (payload.code !== '0' || payload.data == null) throw new Error(payload.msg || `OKX returned code ${payload.code}`);
  return payload.data;
}

async function getOkxMetrics(addresses: string[]) {
  if (!hasOkxCredentials() || !addresses.length) return new Map<string, { market?: OkxMetric; totalFee?: number }>();
  const output = new Map<string, { market?: OkxMetric; totalFee?: number }>();
  try {
    const rows = await okxRequest<Array<OkxMetric & { tokenContractAddress?: string }>>('POST', '/api/v6/dex/market/price-info', addresses.map((tokenContractAddress) => ({ chainIndex: ARC_CHAIN_INDEX, tokenContractAddress })));
    for (let index = 0; index < rows.length; index += 1) {
      const address = rows[index].tokenContractAddress?.toLowerCase() || addresses[index];
      output.set(address, { market: rows[index] });
    }
  } catch (error) {
    console.warn('Could not load OKX token market metrics:', error instanceof Error ? error.message : 'unknown error');
  }

  await Promise.all(addresses.map(async (address) => {
    try {
      const path = `/api/v6/dex/market/token/advanced-info?chainIndex=${encodeURIComponent(ARC_CHAIN_INDEX)}&tokenContractAddress=${encodeURIComponent(address)}`;
      const rows = await okxRequest<Array<{ totalFee?: string }>>('GET', path);
      const current = output.get(address) || {};
      current.totalFee = numberOrNull(rows[0]?.totalFee) ?? undefined;
      output.set(address, current);
    } catch (error) {
      console.warn(`Could not load OKX fee data for ${address}:`, error instanceof Error ? error.message : 'unknown error');
    }
  }));
  return output;
}

export async function getTokenMetrics(inputAddresses: string[]): Promise<Map<string, TokenMetrics>> {
  const addresses = [...new Set(inputAddresses.filter((address) => addressPattern.test(address)).map((address) => address.toLowerCase()))].slice(0, 30);
  const result = new Map<string, TokenMetrics>();
  const now = Date.now();
  const missing = addresses.filter((address) => {
    const cached = cache.get(address);
    if (!cached || cached.expiresAt <= now) return true;
    if (cached.value) result.set(address, cached.value);
    return false;
  });
  if (!missing.length) return result;

  let dexMetrics = new Map<string, TokenMetrics>();
  try { dexMetrics = await getDexScreenerMetrics(missing); }
  catch (error) { console.warn('Could not load DEX Screener token data:', error instanceof Error ? error.message : 'unknown error'); }
  const okxMetrics = await getOkxMetrics(missing);

  missing.forEach((address) => {
    const dex = dexMetrics.get(address) ?? null;
    const okx = okxMetrics.get(address);
    const market = okx?.market;
    const metric: TokenMetrics | null = dex || market ? {
      priceUsd: dex?.priceUsd ?? numberOrNull(market?.priceUsd ?? market?.price),
      priceChange24h: dex?.priceChange24h ?? null,
      marketCapUsd: dex?.marketCapUsd ?? numberOrNull(market?.marketCap),
      fdvUsd: dex?.fdvUsd ?? null,
      liquidityUsd: dex?.liquidityUsd ?? numberOrNull(market?.liquidity),
      volume24hUsd: dex?.volume24hUsd ?? numberOrNull(market?.volume24H),
      holders: numberOrNull(market?.holders),
      totalFee: okx?.totalFee ?? null,
      buys24h: dex?.buys24h ?? null,
      sells24h: dex?.sells24h ?? null,
      source: dex && market ? 'dexscreener+okx' : dex ? 'dexscreener' : 'okx',
      sourceUrl: dex?.sourceUrl ?? null,
      updatedAt: new Date().toISOString(),
    } : null;
    cache.set(address, { expiresAt: now + CACHE_TTL_MS, value: metric });
    if (metric) result.set(address, metric);
  });
  return result;
}

export const isTokenAddress = (value: string) => addressPattern.test(value);
