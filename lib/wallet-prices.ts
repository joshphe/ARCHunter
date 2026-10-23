import { getDexScreenerMetrics } from './token-metrics';

export type WalletPrice = { priceUsd: number; updatedAt: string; liquidityUsd: number; change24h: number | null; usable: boolean };
const entries = new Map<string, { until: number; value: WalletPrice | null }>();
// Wallet pricing deliberately never calls the optional authenticated OKX APIs.
export async function getWalletPrices(addresses: string[]): Promise<Map<string, WalletPrice>> {
  const unique = [...new Set(addresses)].slice(0, 200);
  const result = new Map<string, WalletPrice>();
  const missing: string[] = [];
  const deadline = Date.now() + 8000;
  for (const address of unique) {
    const entry = entries.get(address);
    if (entry && entry.until > Date.now()) { if (entry.value) result.set(address, entry.value); }
    else missing.push(address);
  }
  // Two batches at a time; the underlying provider accepts up to 30 tokens.
  for (let start = 0; start < missing.length; start += 60) {
    if (Date.now() >= deadline) break;
    await Promise.all([missing.slice(start, start + 30), missing.slice(start + 30, start + 60)].filter(batch => batch.length).map(async batch => {
      try {
        const metrics = await getDexScreenerMetrics(batch);
        for (const address of batch) {
          const metric = metrics.get(address);
          const price: WalletPrice | null = metric?.priceUsd != null && metric.priceUsd > 0 ? {
            priceUsd: metric.priceUsd, updatedAt: metric.updatedAt, liquidityUsd: metric.liquidityUsd ?? 0,
            change24h: metric.priceChange24h, usable: (metric.liquidityUsd ?? 0) >= 5000,
          } : null;
          if (entries.size >= 500) entries.delete(entries.keys().next().value!);
          entries.set(address, { value: price, until: Date.now() + 300_000 });
          if (price) result.set(address, price);
        }
      } catch { /* No quote is unknown, not a zero-valued asset. Do not cache an outage for five minutes. */ }
    }));
  }
  return result;
}
