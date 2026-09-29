import { NextResponse } from 'next/server';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

type MetricKey = 'transactions' | 'activeAddresses' | 'contractsDeployed' | 'feesUsdc';
type ArcscanPoint = { t: number; v: string; c: boolean; b: number; u: number };
type ArcscanChart = {
  points?: ArcscanPoint[];
  coverage?: Array<{ computed_at?: number; block_to?: number }>;
};

const chartMetrics: Array<{ id: string; key: MetricKey }> = [
  { id: 'tx', key: 'transactions' },
  { id: 'active-address', key: 'activeAddresses' },
  { id: 'deployed-contracts', key: 'contractsDeployed' },
  { id: 'transactionfee', key: 'feesUsdc' },
];

async function fetchChart(id: string): Promise<ArcscanChart | null> {
  try {
    const response = await fetch(`https://api.arc-scan.org/v1/charts/${id}?granularity=d&days=90`, {
      next: { revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json() as ArcscanChart;
  } catch {
    return null;
  }
}

export async function GET() {
  const charts = await Promise.all(chartMetrics.map(async ({ id, key }) => ({ key, chart: await fetchChart(id) })));
  const availableCharts = charts.filter((item) => item.chart?.points?.length);
  if (!availableCharts.length) {
    return NextResponse.json({ error: 'Arc network activity is temporarily unavailable.' }, { status: 503 });
  }

  const pointsByTime = new Map<number, Record<string, number | boolean>>();
  let updatedAtSeconds = 0;
  let latestBlock = Number.MAX_SAFE_INTEGER;

  for (const { key, chart } of availableCharts) {
    for (const coverage of chart?.coverage ?? []) {
      if (coverage.computed_at) updatedAtSeconds = Math.max(updatedAtSeconds, coverage.computed_at);
      if (coverage.block_to) latestBlock = Math.min(latestBlock, coverage.block_to);
    }
    for (const point of chart?.points ?? []) {
      if (point.t < ARC_LAUNCH_START_TIMESTAMP) continue;
      const value = Number(point.v);
      if (!Number.isFinite(value)) continue;
      const row = pointsByTime.get(point.t) ?? {};
      row[key] = value;
      row.complete = row.complete === undefined ? point.c : Boolean(row.complete) && point.c;
      row.block = point.b;
      pointsByTime.set(point.t, row);
      updatedAtSeconds = Math.max(updatedAtSeconds, point.u || 0);
    }
  }

  const history = [...pointsByTime.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, point]) => ({ timestamp, ...point }));

  return NextResponse.json({
    source: 'Arcscan',
    updatedAt: updatedAtSeconds ? new Date(updatedAtSeconds * 1000).toISOString() : null,
    latestBlock: latestBlock === Number.MAX_SAFE_INTEGER ? null : latestBlock,
    partial: availableCharts.length !== chartMetrics.length,
    history,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
