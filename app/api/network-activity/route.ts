import { NextRequest, NextResponse } from 'next/server';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

type MetricKey = 'transactions' | 'activeAddresses' | 'contractsDeployed' | 'feesUsdc';
type StatsPoint = { date: string; value: string; is_approximate?: boolean };
type StatsChart = { chart?: StatsPoint[]; info?: { id?: string; units?: string | null } };
const chartMetrics: Array<{ id: string; key: MetricKey }> = [
  { id: 'newTxns', key: 'transactions' },
  { id: 'activeAccounts', key: 'activeAddresses' },
  { id: 'newContracts', key: 'contractsDeployed' },
  { id: 'txnsFee', key: 'feesUsdc' },
];
const STATS_URL = 'https://explorer.arc.io/stats-service/api/v1/lines';
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.has('refresh');
  const now = Date.now();
  const today = Math.floor(now / 86400000) * 86400;
  const from = new Date(Math.max(ARC_LAUNCH_START_TIMESTAMP, today - 89 * 86400) * 1000).toISOString().slice(0, 10);
  const to = new Date(now).toISOString().slice(0, 10);
  const charts = await Promise.all(chartMetrics.map(async ({ id, key }) => {
    try {
      const response = await fetch(`${STATS_URL}/${id}?from=${from}&to=${to}&resolution=DAY`, {
        ...(forceRefresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
        signal: AbortSignal.timeout(7000), headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as StatsChart;
      if (!Array.isArray(data.chart) || data.info?.id !== id) throw new Error('Invalid chart response');
      if (key === 'feesUsdc' && data.info.units !== 'USDC') throw new Error('Unexpected fee unit');
      const points = data.chart.flatMap(point => {
        const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(point.date) ? Date.parse(`${point.date}T00:00:00Z`) / 1000 : NaN;
        const value = typeof point.value === 'string' && point.value.trim() ? Number(point.value) : NaN;
        if (!Number.isFinite(timestamp) || timestamp < ARC_LAUNCH_START_TIMESTAMP || timestamp > today || !Number.isFinite(value) || value < 0) return [];
        return [{ timestamp, value, complete: timestamp < today && point.is_approximate !== true }];
      });
      return { key, points };
    } catch (error) {
      console.warn(`Network activity provider failed (${id}):`, error instanceof Error ? error.message : 'Unknown provider error');
      return { key, points: [] };
    }
  }));
  const available = charts.filter(chart => chart.points.length);
  if (!available.length) return NextResponse.json({
    error: 'Network statistics provider is temporarily unavailable.', code: 'NETWORK_SOURCE_UNAVAILABLE',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const daily = new Map<number, { timestamp: number; metricComplete: Partial<Record<MetricKey, boolean>> } & Partial<Record<MetricKey, number>>>();
  for (const { key, points } of available) for (const point of points) {
    const row = daily.get(point.timestamp) ?? { timestamp: point.timestamp, metricComplete: {} };
    row[key] = point.value;
    row.metricComplete[key] = point.complete;
    daily.set(point.timestamp, row);
  }
  return NextResponse.json({
    source: 'Blockscout', sourceUrl: 'https://explorer.arc.io/stats',
    // The provider supplies daily completeness but no computation timestamp or indexed block.
    updatedAt: null, checkedAt: new Date(now).toISOString(), latestBlock: null,
    partial: available.length !== chartMetrics.length,
    unavailableMetrics: charts.filter(chart => !chart.points.length).map(chart => chart.key),
    history: [...daily.values()].sort((a, b) => a.timestamp - b.timestamp).map(row => ({
      ...row, complete: chartMetrics.every(({ key }) => row.metricComplete[key] === true),
    })),
  }, { headers: { 'Cache-Control': forceRefresh || available.length !== chartMetrics.length ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600' } });
}
