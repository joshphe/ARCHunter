import { NextResponse } from 'next/server';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

type DefiLlamaProtocol = { name: string; slug?: string; total24h?: number; total7d?: number; total30d?: number; category?: string };
type DefiLlamaOverview = { total24h?: number; total7d?: number; protocols?: DefiLlamaProtocol[] };
type StablecoinHistoryPoint = {
  date: string;
  totalCirculatingUSD?: Record<string, number>;
};
type StablecoinAsset = {
  name: string;
  symbol: string;
  chainCirculating?: Record<string, { current?: Record<string, number>; circulatingPrevDay?: Record<string, number>; circulatingPrevWeek?: Record<string, number> }>;
};
type StablecoinResponse = {
  chains?: Array<{ name: string; totalCirculatingUSD?: Record<string, number> }>;
  peggedAssets?: StablecoinAsset[];
};
type AaveResponse = {
  currentChainTvls?: Record<string, number>;
  chainTvls?: Record<string, { tvl?: Array<{ date: number; totalLiquidityUSD: number }> }>;
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

const usd = (values?: Record<string, number>) => values?.peggedUSD ?? 0;

export async function GET() {
  const [stablecoins, stablecoinHistory, dex, aave] = await Promise.all([
    getJson<StablecoinResponse>('https://stablecoins.llama.fi/stablecoins?chain=Arc&includePrices=true'),
    getJson<StablecoinHistoryPoint[]>('https://stablecoins.llama.fi/stablecoincharts/Arc'),
    getJson<DefiLlamaOverview>('https://api.llama.fi/overview/dexs/Arc?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'),
    getJson<AaveResponse>('https://api.llama.fi/protocol/aave-v4'),
  ]);

  const arcStablecoinSummary = stablecoins?.chains?.find((chain) => chain.name === 'Arc');
  const stablecoinAssets = (stablecoins?.peggedAssets ?? [])
    .map((asset) => {
      const circulation = asset.chainCirculating?.Arc;
      const current = usd(circulation?.current);
      return {
        name: asset.name,
        symbol: asset.symbol,
        current,
        change24h: current - usd(circulation?.circulatingPrevDay),
        change7d: current - usd(circulation?.circulatingPrevWeek),
      };
    })
    .filter((asset) => asset.current > 0)
    .sort((left, right) => right.current - left.current);

  const stablecoinHistoryData: Array<{ timestamp: number; value: number | null }> = (stablecoinHistory ?? [])
    .map((point) => ({ timestamp: Number(point.date), value: usd(point.totalCirculatingUSD) }))
    .filter((point) => point.timestamp >= ARC_LAUNCH_START_TIMESTAMP && Number.isFinite(point.value))
    .sort((left, right) => left.timestamp - right.timestamp);
  if (!stablecoinHistoryData.some((point) => point.timestamp === ARC_LAUNCH_START_TIMESTAMP)) {
    stablecoinHistoryData.unshift({ timestamp: ARC_LAUNCH_START_TIMESTAMP, value: null });
  }

  const dexTotal24h = dex?.total24h ?? null;
  const dexVenues = (dex?.protocols ?? [])
    .filter((protocol) => typeof protocol.total24h === 'number' && protocol.total24h > 0)
    .sort((left, right) => (right.total24h ?? 0) - (left.total24h ?? 0))
    .slice(0, 8)
    .map((protocol) => ({
      name: protocol.name,
      category: protocol.category ?? 'DEX',
      volume24h: protocol.total24h ?? 0,
      volume7d: protocol.total7d ?? null,
      share24h: dexTotal24h ? ((protocol.total24h ?? 0) / dexTotal24h) * 100 : null,
    }));

  const supply = aave?.currentChainTvls?.Arc ?? null;
  const borrowed = aave?.currentChainTvls?.['Arc-borrowed'] ?? null;
  const aaveHistory = (aave?.chainTvls?.Arc?.tvl ?? [])
    .filter((point) => point.date >= ARC_LAUNCH_START_TIMESTAMP)
    .sort((left, right) => left.date - right.date);
  const latestAaveTvl = aaveHistory.at(-1)?.totalLiquidityUSD ?? supply;

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    stablecoins: {
      supplyUsd: arcStablecoinSummary ? usd(arcStablecoinSummary.totalCirculatingUSD) : null,
      assets: stablecoinAssets,
      history: stablecoinHistoryData,
    },
    dex: { volume24h: dexTotal24h, volume7d: dex?.total7d ?? null, venues: dexVenues },
    lending: supply !== null && borrowed !== null ? [{
      name: 'Aave V4',
      supplyUsd: latestAaveTvl ?? supply,
      borrowedUsd: borrowed,
      utilization: supply > 0 ? (borrowed / supply) * 100 : null,
    }] : [],
    partial: !stablecoins || !stablecoinHistory || !dex || !aave,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
