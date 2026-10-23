import { ARC_USDC, EVM_ADDRESS, WalletProviderError, cachedWalletRequest, paginationCursor,
  walletBlockscout, walletRecord, walletUsdcBalance, type HistoryStatus, type WalletReason } from './wallet-provider';
import { getWalletPrices } from './wallet-prices';
import type { WalletAsset, WalletPortfolio } from './wallet-portfolio-types';

function asset(value: unknown): WalletAsset | null {
  const row = walletRecord(value); const token = walletRecord(row.token);
  if (token.type !== 'ERC-20') return null;
  const address = String(token.address_hash).toLowerCase();
  const decimals = Number(token.decimals);
  if (!EVM_ADDRESS.test(address) || token.decimals == null || !Number.isInteger(decimals) || decimals < 0 || decimals > 36
    || typeof row.value !== 'string' || !/^\d{1,78}$/.test(row.value)) throw new WalletProviderError('unavailable');
  if (BigInt(row.value) === BigInt(0)) return null;
  if (address === ARC_USDC && decimals !== 6) throw new WalletProviderError('unavailable');
  return { address, name: typeof token.name === 'string' ? token.name.slice(0, 100) : address,
    symbol: typeof token.symbol === 'string' ? token.symbol.slice(0, 30) : 'TOKEN', decimals,
    balanceUnits: row.value, balance: Number(row.value) / 10 ** decimals, balanceSource: 'blockscout',
    priceUsd: null, priceUpdatedAt: null, valueUsd: null, priceChange24h: null, liquidityUsd: null, pricing: 'unpriced' };
}
async function discover(wallet: string) {
  const assets = new Map<string, WalletAsset>(); const cursors = new Set<string>();
  let status: HistoryStatus = 'partial'; let reason: WalletReason | null = 'limit';
  let cursor: Record<string, string> = {}; let invalid = false; let capped = false;
  const signal = AbortSignal.timeout(9000);
  try {
    for (let page = 0; page < 4; page++) {
      const query = new URLSearchParams({ ...cursor, type: 'ERC-20' });
      const data = walletRecord(await walletBlockscout(`/addresses/${wallet}/tokens?${query}`, signal));
      if (!Array.isArray(data.items) || !Object.hasOwn(data, 'next_page_params')) throw new WalletProviderError('unavailable');
      for (const row of data.items) {
        try { const token = asset(row); if (token) { if (assets.size < 200 || assets.has(token.address)) assets.set(token.address, token); else capped = true; } }
        catch { invalid = true; }
      }
      if (data.next_page_params === null) { status = invalid || capped ? 'partial' : 'complete'; reason = capped ? 'limit' : invalid ? 'unavailable' : null; break; }
      if (!data.items.length) throw new WalletProviderError('unavailable');
      cursor = paginationCursor(data.next_page_params);
      const marker = JSON.stringify(cursor);
      if (cursors.has(marker)) throw new WalletProviderError('unavailable');
      cursors.add(marker);
    }
  } catch (error) {
    status = assets.size ? 'partial' : 'unavailable';
    reason = error instanceof WalletProviderError ? error.reason : 'unavailable';
  }
  return { assets: [...assets.values()], status, reason };
}
function summarize(assets: WalletAsset[]) {
  assets.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1) || a.symbol.localeCompare(b.symbol));
  const priced = assets.filter(item => item.valueUsd !== null);
  const total = priced.reduce((total, item) => total + item.valueUsd!, 0);
  return { pricedTotalUsd: priced.length && Number.isFinite(total) ? total : null,
    pricedCount: priced.length, unpricedCount: assets.filter(item => item.balanceUnits !== '0' && item.valueUsd === null).length };
}
export async function getWalletPortfolio(input: string, includePrices = true): Promise<WalletPortfolio> {
  const address = input.toLowerCase();
  const holdings = await cachedWalletRequest('holdings:' + address, async (): Promise<WalletPortfolio> => {
    const [discovery, balanceUnits] = await Promise.all([
      discover(address), walletUsdcBalance(address, AbortSignal.timeout(7000)).catch(() => null),
    ]);
    const indexedUsdc = discovery.assets.find(asset => asset.address === ARC_USDC);
    const units = balanceUnits ?? indexedUsdc?.balanceUnits ?? null;
    const assets = discovery.assets.filter(asset => asset.address !== ARC_USDC);
    const balance = units === null ? null : Number(units) / 1e6;
    assets.push({ address: ARC_USDC, name: 'USD Coin', symbol: 'USDC', decimals: 6,
      balanceUnits: units, balance, balanceSource: balanceUnits !== null ? 'arc-rpc' : indexedUsdc ? 'blockscout' : null, priceUsd: 1,
      priceUpdatedAt: null, valueUsd: balance, priceChange24h: null, liquidityUsd: null, pricing: 'usdc-reference' });
    return { address, checkedAt: new Date().toISOString(), assets,
      status: discovery.status === 'complete' && units !== null ? 'complete' : assets.some(asset => asset.balanceUnits !== null) ? 'partial' : 'unavailable',
      reason: discovery.reason ?? (units === null ? 'unavailable' : null), ...summarize(assets) };
  }, value => value.status === 'complete' ? 60_000 : 15_000);
  if (!includePrices) return holdings;
  // Do not mutate the unpriced snapshot: it is sent first, before external quotes.
  return cachedWalletRequest('portfolio:' + address + ':' + holdings.checkedAt, async () => {
    const assets = holdings.assets.map(asset => ({ ...asset }));
    const prices = await getWalletPrices(assets.filter(item => item.address !== ARC_USDC).map(item => item.address));
    for (const token of assets) {
      if (token.address === ARC_USDC) continue;
      const price = prices.get(token.address);
      if (!price) continue;
      token.priceUsd = price.priceUsd; token.priceUpdatedAt = price.updatedAt;
      token.priceChange24h = price.change24h; token.liquidityUsd = price.liquidityUsd;
      token.pricing = price.usable ? 'quoted' : 'low-liquidity';
      const value = token.balance! * price.priceUsd;
      token.valueUsd = price.usable && Number.isFinite(value) ? value : null;
    }
    return { ...holdings, assets, ...summarize(assets) };
  }, value => value.status === 'complete' ? 60_000 : 15_000);
}
