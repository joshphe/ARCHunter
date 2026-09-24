import { NextResponse } from 'next/server';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

type ChartPoint = [number, number];
type ProtocolFee = {
  name: string;
  slug?: string;
  module?: string;
  category?: string;
  logo?: string;
  total24h?: number;
  total7d?: number;
  total30d?: number;
  change_1d?: number;
  twitter?: string;
};
type FeeOverview = {
  total24h?: number;
  total7d?: number;
  total30d?: number;
  change_1d?: number;
  totalDataChart?: ChartPoint[];
  protocols?: ProtocolFee[];
};
type TvlPoint = { date: number; tvl: number };
async function fetchLlama<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const response = await fetch(`https://api.llama.fi${path}`, {
      next: { revalidate },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const [fees, dex, tvl] = await Promise.all([
    fetchLlama<FeeOverview>('/overview/fees/Arc?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false'),
    fetchLlama<FeeOverview>('/overview/dexs/Arc?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false'),
    fetchLlama<TvlPoint[]>('/v2/historicalChainTvl/Arc'),
  ]);

  const history = new Map<number, { timestamp: number; tvl?: number; fees?: number; volume?: number }>();
  for (const point of tvl ?? []) {
    const timestamp = Math.floor(point.date / 86400) * 86400;
    if (timestamp < ARC_LAUNCH_START_TIMESTAMP) continue;
    history.set(timestamp, { ...(history.get(timestamp) ?? { timestamp }), tvl: point.tvl });
  }
  for (const [date, value] of fees?.totalDataChart ?? []) {
    const timestamp = Math.floor(date / 86400) * 86400;
    if (timestamp < ARC_LAUNCH_START_TIMESTAMP) continue;
    history.set(timestamp, { ...(history.get(timestamp) ?? { timestamp }), fees: value });
  }
  for (const [date, value] of dex?.totalDataChart ?? []) {
    const timestamp = Math.floor(date / 86400) * 86400;
    if (timestamp < ARC_LAUNCH_START_TIMESTAMP) continue;
    history.set(timestamp, { ...(history.get(timestamp) ?? { timestamp }), volume: value });
  }
  if (!history.has(ARC_LAUNCH_START_TIMESTAMP)) history.set(ARC_LAUNCH_START_TIMESTAMP, { timestamp: ARC_LAUNCH_START_TIMESTAMP });

  const tvlHistory = [...(tvl ?? [])].sort((a, b) => a.date - b.date);
  const latestTvl = tvlHistory.at(-1)?.tvl ?? null;
  const previousTvl = tvlHistory.at(-2)?.tvl ?? null;
  const tvlChange24h = latestTvl !== null && previousTvl ? ((latestTvl - previousTvl) / previousTvl) * 100 : null;
  const protocols = (fees?.protocols ?? [])
    .filter((protocol) => typeof protocol.total24h === 'number')
    .sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
    .slice(0, 8);
  const protocolsWithX = await Promise.all(protocols.map(async (protocol) => {
    const slug = protocol.slug ?? protocol.module?.split('/')[0];
    if (!slug) return protocol;
    const metadata = await fetchLlama<{ twitter?: string }>(`/protocol/${encodeURIComponent(slug)}`, 86400);
    return { ...protocol, twitter: metadata?.twitter ?? protocol.twitter };
  }));

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    source: 'DefiLlama',
    metrics: {
      tvl: latestTvl,
      tvlChange24h,
      fees24h: fees?.total24h ?? null,
      feesChange24h: fees?.change_1d ?? null,
      fees7d: fees?.total7d ?? null,
      dexVolume24h: dex?.total24h ?? null,
      dexVolumeChange24h: dex?.change_1d ?? null,
      protocolCount: fees?.protocols?.length ?? null,
    },
    history: [...history.values()].sort((a, b) => a.timestamp - b.timestamp),
    topProtocols: protocolsWithX,
    partial: !fees || !dex || !tvl,
  });
}
