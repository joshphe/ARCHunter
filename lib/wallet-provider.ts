import { setTimeout as delay } from 'node:timers/promises';

export const ARC_RPC = 'https://rpc.mainnet.arc.io';
export const BLOCKSCOUT_API = 'https://api.blockscout.com/5042/api/v2';
export const ARC_USDC = '0x3600000000000000000000000000000000000000';
export const NATIVE_USDC_EMITTER = '0xfffffffffffffffffffffffffffffffffffffffe';
export const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export const EVM_HASH = /^0x[0-9a-fA-F]{64}$/;
export type WalletReason = 'key-required' | 'authentication' | 'rate-limited' | 'unavailable' | 'limit';
export type HistoryStatus = 'complete' | 'partial' | 'unavailable';

export class WalletProviderError extends Error {
  constructor(public reason: WalletReason) { super(reason); }
}
export class WalletBusyError extends Error {}
let nextHistoryRequest = 0;
const cache = new Map<string, { until: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

// Bounded, per-instance cache and concurrency shared by all wallet endpoints.
export async function cachedWalletRequest<T>(key: string, load: () => Promise<T>, ttl: (value: T) => number): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  const active = pending.get(key);
  if (active) return active as Promise<T>;
  if (pending.size >= 4) throw new WalletBusyError('busy');
  const task = load().then(value => {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, until: Date.now() + ttl(value) });
    return value;
  });
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

export function walletRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WalletProviderError('unavailable');
  return value as Record<string, unknown>;
}
export function paginationCursor(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, item] of Object.entries(walletRecord(value))) {
    if (item == null) continue;
    if (!['string', 'number', 'boolean'].includes(typeof item)) throw new WalletProviderError('unavailable');
    result[name] = String(item);
  }
  if (!Object.keys(result).length) throw new WalletProviderError('unavailable');
  return result;
}
export async function walletBlockscout(path: string, signal: AbortSignal): Promise<unknown> {
  const key = process.env.BLOCKSCOUT_API_KEY?.trim();
  if (!key) throw new WalletProviderError('key-required');
  signal.throwIfAborted();
  const wait = Math.max(0, nextHistoryRequest - Date.now());
  nextHistoryRequest = Date.now() + wait + 350;
  if (wait) await delay(wait, undefined, { signal });
  const response = await fetch(BLOCKSCOUT_API + path, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}`, 'User-Agent': 'ARCWatch/1.0' },
    signal, cache: 'no-store',
  });
  if (!response.ok) throw new WalletProviderError([401, 402, 403].includes(response.status) ? 'authentication' : response.status === 429 ? 'rate-limited' : 'unavailable');
  return response.json();
}

export type RpcCall = { method: string; params: unknown[] };
export async function walletRpc(calls: RpcCall[], signal: AbortSignal): Promise<unknown[]> {
  // Verify the chain on every batch; never accidentally price balances from another network.
  const response = await fetch(ARC_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal, cache: 'no-store',
    body: JSON.stringify([{ jsonrpc: '2.0', id: 0, method: 'eth_chainId', params: [] },
      ...calls.map((call, index) => ({ jsonrpc: '2.0', id: index + 1, ...call }))]),
  });
  if (!response.ok) throw new WalletProviderError('unavailable');
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new WalletProviderError('unavailable');
  const rows = new Map(payload.map(value => { const row = walletRecord(value); return [row.id, row]; }));
  const chain = rows.get(0);
  if (chain?.error || String(chain?.result).toLowerCase() !== '0x13b2') throw new WalletProviderError('unavailable');
  return calls.map((_, index) => {
    const row = rows.get(index + 1);
    // A failed call stays unknown without invalidating the other batch items.
    return row && !row.error && Object.hasOwn(row, 'result') ? row.result : null;
  });
}
export const balanceOfCall = (token: string, wallet: string, block = 'latest'): RpcCall => ({
  method: 'eth_call', params: [{ to: token, data: '0x70a08231' + wallet.slice(2).padStart(64, '0') }, block],
});
export function rpcUint(value: unknown): bigint {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value) || value.length > 66) throw new WalletProviderError('unavailable');
  return BigInt(value);
}
export async function walletUsdcBalance(wallet: string, signal: AbortSignal): Promise<string> {
  const [balance] = await walletRpc([balanceOfCall(ARC_USDC, wallet)], signal);
  return rpcUint(balance).toString();
}
