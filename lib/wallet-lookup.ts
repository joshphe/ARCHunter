import { ARC_USDC as USDC, BLOCKSCOUT_API as API, EVM_ADDRESS as addressPattern, EVM_HASH as hashPattern,
  WalletProviderError as ProviderError, walletRecord as record, walletBlockscout, walletUsdcBalance as readBalance,
  cachedWalletRequest, type WalletReason } from './wallet-provider';
export { WalletBusyError } from './wallet-provider';
export type { WalletReason } from './wallet-provider';

// Provider requests and credentials stay on the server. The client imports types only.
const uintPattern = /^\d+$/;
export type WalletRange = '7d' | '30d' | '90d' | 'all';
export type WalletTransaction = {
  hash: string; timestamp: string; from: { hash: string }; to: { hash: string } | null;
  fee: { value: string } | null; value: string; method: string | null;
  status: string; block: number | null;
};
export type WalletTransfer = {
  transaction_hash: string; log_index: number; timestamp: string;
  from: { hash: string }; to: { hash: string };
  total: { value: string; decimals: string | null };
  token: { symbol: string; address_hash: string }; method: string | null;
};
type History<T> = { items: T[]; status: 'complete' | 'partial' | 'unavailable'; reason: WalletReason | null };
export type WalletLookup = {
  address: string; range: WalletRange; checkedAt: string;
  balanceUnits: string | null; balanceSource: 'arc-rpc' | 'blockscout' | null;
  transactions: History<WalletTransaction>; transfers: History<WalletTransfer>;
};
export const isWalletAddress = (value: string) => addressPattern.test(value);
export const isWalletRange = (value: string): value is WalletRange => ['7d', '30d', '90d', 'all'].includes(value);
function address(value: unknown): { hash: string } {
  const row = record(value);
  if (typeof row.hash !== 'string' || !addressPattern.test(row.hash)) throw new ProviderError('unavailable');
  return { hash: row.hash.toLowerCase() };
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new ProviderError('unavailable');
  return value;
}
function transaction(value: unknown): WalletTransaction {
  const row = record(value);
  if (typeof row.hash !== 'string' || !hashPattern.test(row.hash) || !['ok', 'error'].includes(String(row.status))) throw new ProviderError('unavailable');
  const fee = record(row.fee);
  if (typeof fee.value !== 'string' || !uintPattern.test(fee.value)) throw new ProviderError('unavailable');
  return {
    hash: row.hash, timestamp: timestamp(row.timestamp), from: address(row.from), to: row.to == null ? null : address(row.to),
    fee: { value: fee.value }, value: typeof row.value === 'string' && uintPattern.test(row.value) ? row.value : '0',
    method: typeof row.method === 'string' ? row.method : null, status: String(row.status),
    block: typeof row.block_number === 'number' ? row.block_number : null,
  };
}
function transfer(value: unknown): WalletTransfer | null {
  const row = record(value); const total = record(row.total); const token = record(row.token);
  if (typeof token.address_hash !== 'string' || !addressPattern.test(token.address_hash)) throw new ProviderError('unavailable');
  if (token.address_hash.toLowerCase() !== USDC) return null;
  const logIndex = typeof row.log_index === 'string' && uintPattern.test(row.log_index) ? Number(row.log_index) : row.log_index;
  const decimals = total.decimals ?? token.decimals ?? '6';
  if (typeof row.transaction_hash !== 'string' || !hashPattern.test(row.transaction_hash)
    || !Number.isSafeInteger(logIndex) || Number(logIndex) < 0
    || typeof total.value !== 'string' || !uintPattern.test(total.value)
    || String(decimals) !== '6') throw new ProviderError('unavailable');
  return {
    transaction_hash: row.transaction_hash, log_index: Number(logIndex), timestamp: timestamp(row.timestamp),
    from: address(row.from), to: address(row.to), total: { value: total.value, decimals: '6' },
    token: { symbol: 'USDC', address_hash: USDC }, method: typeof row.method === 'string' ? row.method : null,
  };
}
async function history<T extends { timestamp: string }>(
  path: string, key: string | undefined, since: number | null, now: number, maxPages: number,
  parse: (value: unknown) => T | null, identity: (value: T) => string, signal: AbortSignal,
): Promise<History<T>> {
  if (!key) return { items: [], status: 'unavailable', reason: 'key-required' };
  const items = new Map<string, T>(); const cursors = new Set<string>();
  let cursor: Record<string, string> = {};
  try {
    for (let page = 0; page < maxPages; page++) {
      const url = new URL(`${API}${path}`);
      for (const [name, value] of Object.entries(cursor)) url.searchParams.set(name, value);
      const data = record(await walletBlockscout(url.pathname.slice('/5042/api/v2'.length) + url.search, signal));
      if (!Array.isArray(data.items) || !Object.hasOwn(data, 'next_page_params')) throw new ProviderError('unavailable');
      let reachedStart = false;
      for (const raw of data.items) {
        const row = record(raw);
        // Pending transactions have neither a settled fee nor a timestamp.
        if (row.timestamp == null && row.status !== 'ok' && row.status !== 'error') continue;
        const time = Date.parse(timestamp(row.timestamp));
        if (since !== null && time < since) { reachedStart = true; continue; }
        const item = parse(raw);
        if (!item) continue;
        if (time <= now) items.set(identity(item), item);
      }
      if (reachedStart || data.next_page_params === null) return { items: [...items.values()], status: 'complete', reason: null };
      const next = record(data.next_page_params);
      if (!data.items.length) throw new ProviderError('unavailable');
      cursor = {};
      for (const [name, value] of Object.entries(next)) {
        if (value == null) continue;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new ProviderError('unavailable');
        cursor[name] = String(value);
      }
      const marker = JSON.stringify(cursor);
      if (!Object.keys(cursor).length || cursors.has(marker)) throw new ProviderError('unavailable');
      cursors.add(marker);
    }
    return { items: [...items.values()], status: 'partial', reason: 'limit' };
  } catch (error) {
    return { items: [...items.values()], status: items.size ? 'partial' : 'unavailable', reason: error instanceof ProviderError ? error.reason : 'unavailable' };
  }
}

export async function lookupWallet(wallet: string, range: WalletRange): Promise<WalletLookup> {
  const normalized = wallet.toLowerCase(); const cacheKey = `${normalized}:${range}`;
  return cachedWalletRequest('history:' + cacheKey, async () => {
    const now = Date.now(); const key = process.env.BLOCKSCOUT_API_KEY?.trim();
    const since = range === 'all' ? null : now - (range === '7d' ? 7 : range === '30d' ? 30 : 90) * 86400000;
    const signal = AbortSignal.timeout(18_000);
    const [balance, transactions, transfers] = await Promise.all([
      readBalance(normalized, AbortSignal.timeout(7000)).catch(() => null),
      history(`/addresses/${normalized}/transactions?filter=from`, key, since, now, 10, transaction, tx => tx.hash.toLowerCase(), signal),
      history(`/addresses/${normalized}/token-transfers?token=${USDC}`, key, since, now, 8, transfer, tx => `${tx.transaction_hash.toLowerCase()}:${tx.log_index}`, signal),
    ]);
    let balanceUnits = balance;
    let balanceSource: WalletLookup['balanceSource'] = balance === null ? null : 'arc-rpc';
    if (balanceUnits === null && key) {
      try {
        const info = record(await walletBlockscout(`/addresses/${normalized}`, AbortSignal.timeout(4000)));
        if (typeof info.coin_balance === 'string' && uintPattern.test(info.coin_balance)) {
          balanceUnits = (BigInt(info.coin_balance) / BigInt(1_000_000_000_000)).toString();
          balanceSource = 'blockscout';
        }
      } catch { /* History remains usable when the current balance is unavailable. */ }
    }
    const result: WalletLookup = { address: normalized, range, checkedAt: new Date(now).toISOString(), balanceUnits, balanceSource, transactions, transfers };
    return result;
  }, value => value.balanceUnits !== null && value.transactions.status === 'complete' && value.transfers.status === 'complete' ? 60_000 : 15_000);
}
