import { NextResponse } from 'next/server';

export const revalidate = 1800;

type StablecoinChartDay = {
  date?: number | string;
  totalCirculatingUSD?: { peggedUSD?: number };
};

export async function GET() {
  try {
    const response = await fetch('https://stablecoins.llama.fi/stablecoincharts/Arc', {
      next: { revalidate },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`DeFiLlama returned ${response.status}`);

    const days = await response.json() as StablecoinChartDay[];
    const now = Math.floor(Date.now() / 1000);
    const history = days
      .map((day) => {
        const timestamp = Number(day.date);
        const value = Number(day.totalCirculatingUSD?.peggedUSD);
        if (!Number.isFinite(timestamp) || !Number.isFinite(value) || value < 0 || timestamp > now) return null;
        return { timestamp, value };
      })
      .filter((day): day is { timestamp: number; value: number } => day !== null)
      .sort((left, right) => left.timestamp - right.timestamp);
    const latestDataDay = history.at(-1)?.timestamp;

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      latestDataDay: latestDataDay ? new Date(latestDataDay * 1000).toISOString() : null,
      history,
    }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ error: 'Arc stablecoin history is temporarily unavailable.' }, {
      status: 503,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }
}
