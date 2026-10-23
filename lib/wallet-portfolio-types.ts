import type { WalletRange } from './wallet-lookup';
import type { HistoryStatus, WalletReason } from './wallet-provider';

export type WalletAsset = {
  address: string; name: string; symbol: string; decimals: number;
  balanceUnits: string | null; balance: number | null;
  balanceSource: 'arc-rpc' | 'blockscout' | null;
  priceUsd: number | null; priceUpdatedAt: string | null; valueUsd: number | null;
  priceChange24h: number | null; liquidityUsd: number | null;
  pricing: 'quoted' | 'low-liquidity' | 'unpriced' | 'usdc-reference';
};
export type WalletPortfolio = {
  address: string; checkedAt: string; status: HistoryStatus; reason: WalletReason | null;
  assets: WalletAsset[]; pricedTotalUsd: number | null; pricedCount: number; unpricedCount: number;
};
export type WalletTradeKind = 'buy' | 'sell' | 'transfer-in' | 'transfer-out' | 'unclassified' | 'self';
export type WalletTrade = {
  hash: string; timestamp: string; block: number; kind: WalletTradeKind;
  quantity: number; usdc: number | null; gasUsdc: number | null;
  realizedUsdc: number | null;
};
export type WalletPnlIssue = 'history-limited' | 'unknown-cost' | 'unrecognized' | 'balance-mismatch' | 'no-price' | 'receipt-unavailable';
export type WalletPnl = {
  address: string; token: string; range: WalletRange; checkedAt: string; snapshotBlock: number | null;
  status: HistoryStatus; reason: WalletReason | null; issues: WalletPnlIssue[];
  historyComplete: boolean; balance: number | null; priceUsd: number | null;
  averageCostUsdc: number | null; remainingCostUsdc: number | null;
  realizedUsdc: number | null; knownRealizedUsdc: number | null; unrealizedUsdc: number | null;
  gasUsdc: number | null; totalPnlUsdc: number | null;
  trades: WalletTrade[]; scannedTransactions: number; verifiedSwaps: number;
};
