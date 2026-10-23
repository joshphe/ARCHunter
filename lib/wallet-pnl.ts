import { ARC_USDC, NATIVE_USDC_EMITTER, EVM_ADDRESS, EVM_HASH, WalletProviderError, cachedWalletRequest,
  walletBlockscout, walletRecord as record, walletRpc, rpcUint, balanceOfCall, paginationCursor,
  type HistoryStatus, type WalletReason, type RpcCall } from './wallet-provider';
import { getWalletPrices } from './wallet-prices';
import { calculateWalletLedger, type WalletMovement } from './wallet-pnl-ledger';
import type { WalletRange } from './wallet-lookup';
import type { WalletPnl } from './wallet-portfolio-types';

const ZERO = BigInt(0);
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const V2_SWAP = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const V3_SWAP = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
// Event signatures: Uniswap v2/v3 pool interfaces. Launchpad curves and complex
// routes need their own reviewed adapter; opposing transfers alone are not a swap.
type TokenRow = { hash: string; timestamp: string; block: number; logIndex: number; delta: bigint; decimals: number };
type Log = { address: string; topics: string[]; data: string };
type Receipt = { from: string; to: string | null; input: string; block: number; logs: Log[]; gas: bigint | null };
type Analysis = {
  checkedAt: string; block: number | null; balance: bigint | null; decimals: number;
  historyComplete: boolean; status: HistoryStatus; reason: WalletReason | null;
  movements: WalletMovement[]; receiptFailures: boolean; priceUsd: number | null;
};
function safeInteger(value: unknown): number {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0) throw new WalletProviderError('unavailable');
  return parsed;
}
function parseTransfer(value: unknown, wallet: string, token: string): TokenRow | null {
  const row = record(value); const total = record(row.total); const info = record(row.token);
  if (typeof info.address_hash !== 'string' || info.address_hash.toLowerCase() !== token) throw new WalletProviderError('unavailable');
  const from = String(record(row.from).hash).toLowerCase(); const to = String(record(row.to).hash).toLowerCase();
  if (!EVM_ADDRESS.test(from) || !EVM_ADDRESS.test(to) || ![from, to].includes(wallet)
    || typeof row.transaction_hash !== 'string' || !EVM_HASH.test(row.transaction_hash)
    || typeof row.timestamp !== 'string' || !Number.isFinite(Date.parse(row.timestamp))
    || typeof total.value !== 'string' || !/^\d{1,78}$/.test(total.value)) throw new WalletProviderError('unavailable');
  const decimals = safeInteger(total.decimals ?? info.decimals);
  if (decimals > 36) throw new WalletProviderError('unavailable');
  const amount = BigInt(total.value);
  return { hash: row.transaction_hash.toLowerCase(), timestamp: row.timestamp, block: safeInteger(row.block_number),
    logIndex: safeInteger(row.log_index), decimals,
    delta: (to === wallet ? amount : ZERO) - (from === wallet ? amount : ZERO) };
}
async function tokenHistory(wallet: string, token: string, block: number, signal: AbortSignal) {
  const rows = new Map<string, TokenRow>(); const cursors = new Set<string>();
  let cursor: Record<string, string> = {};
  try {
    // Always read back toward acquisition, independent of the UI's date filter.
    for (let page = 0; page < 20; page++) {
      const query = new URLSearchParams({ ...cursor, type: 'ERC-20', token });
      const data = record(await walletBlockscout(`/addresses/${wallet}/token-transfers?${query}`, signal));
      if (!Array.isArray(data.items) || !Object.hasOwn(data, 'next_page_params')) throw new WalletProviderError('unavailable');
      for (const raw of data.items) {
        const row = parseTransfer(raw, wallet, token);
        if (row && row.block <= block) rows.set(`${row.hash}:${row.logIndex}`, row);
      }
      if (data.next_page_params === null) return { rows: [...rows.values()], complete: true, reason: null };
      if (!data.items.length) throw new WalletProviderError('unavailable');
      cursor = paginationCursor(data.next_page_params);
      const marker = JSON.stringify(cursor);
      if (cursors.has(marker)) throw new WalletProviderError('unavailable');
      cursors.add(marker);
    }
    return { rows: [...rows.values()], complete: false, reason: 'limit' as WalletReason };
  } catch (error) {
    return { rows: [...rows.values()], complete: false, reason: error instanceof WalletProviderError ? error.reason : 'unavailable' as WalletReason };
  }
}
function topicAddress(value: string): string {
  if (!/^0x0{24}[0-9a-f]{40}$/.test(value)) throw new WalletProviderError('unavailable');
  return '0x' + value.slice(-40);
}
function transferLog(log: Log) {
  if (log.topics[0] !== TRANSFER || log.topics.length !== 3 || !/^0x[0-9a-f]{64}$/.test(log.data)) return null;
  return { from: topicAddress(log.topics[1]), to: topicAddress(log.topics[2]), amount: BigInt(log.data) };
}
function parseReceipt(value: unknown, transaction: unknown, hash: string, block: number): Receipt {
  const row = record(value); const tx = record(transaction);
  if (String(row.transactionHash).toLowerCase() !== hash || String(tx.hash).toLowerCase() !== hash
    || row.status !== '0x1' || Number(rpcUint(row.blockNumber)) !== block || Number(rpcUint(tx.blockNumber)) !== block
    || !Array.isArray(row.logs) || row.logs.length > 2000
    || typeof tx.from !== 'string' || !EVM_ADDRESS.test(tx.from)
    || (tx.to !== null && (typeof tx.to !== 'string' || !EVM_ADDRESS.test(tx.to)))
    || typeof tx.input !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.input)) throw new WalletProviderError('unavailable');
  const logs = row.logs.map(raw => {
    const log = record(raw);
    if (typeof log.address !== 'string' || !EVM_ADDRESS.test(log.address) || !Array.isArray(log.topics)
      || log.topics.some(topic => typeof topic !== 'string' || !EVM_HASH.test(topic))
      || typeof log.data !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(log.data) || log.removed === true) throw new WalletProviderError('unavailable');
    return { address: log.address.toLowerCase(), topics: (log.topics as string[]).map(topic => topic.toLowerCase()), data: log.data.toLowerCase() };
  });
  let gas: bigint | null = null;
  try { gas = rpcUint(row.gasUsed) * rpcUint(row.effectiveGasPrice); } catch { /* Unknown fee remains unknown. */ }
  return { from: tx.from.toLowerCase(), to: tx.to === null ? null : (tx.to as string).toLowerCase(), input: tx.input.toLowerCase(), block, logs, gas };
}
async function rpcChunks(calls: RpcCall[], signal: AbortSignal): Promise<unknown[]> {
  const output: unknown[] = [];
  for (let start = 0; start < calls.length; start += 16) {
    const batches = [calls.slice(start, start + 8), calls.slice(start + 8, start + 16)].filter(batch => batch.length);
    const rows = await Promise.all(batches.map(batch => walletRpc(batch, signal).catch(() => batch.map(() => null))));
    output.push(...rows.flat());
  }
  return output;
}
function poolDirection(log: Log, targetIs0: boolean): bigint | null {
  const data = log.data.slice(2);
  if (log.topics.length !== 3) return null;
  if (log.topics[0] === V2_SWAP && data.length === 256) {
    const words = [0, 1, 2, 3].map(i => BigInt('0x' + data.slice(i * 64, (i + 1) * 64)));
    return targetIs0 ? words[0] - words[2] : words[1] - words[3];
  }
  if (log.topics[0] === V3_SWAP && data.length === 320) {
    const word = BigInt('0x' + data.slice(targetIs0 ? 0 : 64, targetIs0 ? 64 : 128));
    return word >= BigInt(2) ** BigInt(255) ? word - BigInt(2) ** BigInt(256) : word;
  }
  return null;
}
function classify(movement: WalletMovement, receipt: Receipt, poolTokens: Map<string, [string, string]>, wallet: string, token: string): WalletMovement {
  const target = receipt.logs.filter(log => log.address === token).flatMap(log => { const parsed = transferLog(log); return parsed ? [parsed] : []; });
  const delta = target.reduce((sum, log) => sum + (log.to === wallet ? log.amount : ZERO) - (log.from === wallet ? log.amount : ZERO), ZERO);
  if (delta !== movement.delta) throw new WalletProviderError('unavailable');
  const systemLogs = receipt.logs.filter(log => log.address === NATIVE_USDC_EMITTER).flatMap(log => { const parsed = transferLog(log); return parsed ? [parsed] : []; });
  const native = systemLogs.filter(log => log.from === wallet || log.to === wallet);
  const usdcDelta = native.reduce((sum, log) => sum + (log.to === wallet ? log.amount : ZERO) - (log.from === wallet ? log.amount : ZERO), ZERO);
  const ercUsdcAtWallet = receipt.logs.filter(log => log.address === ARC_USDC).some(log => { const parsed = transferLog(log); return parsed && (parsed.from === wallet || parsed.to === wallet); });
  const otherAssets = receipt.logs.some(log => {
    if ([token, ARC_USDC, NATIVE_USDC_EMITTER].includes(log.address)) return false;
    const parsed = transferLog(log);
    return parsed && (parsed.from === wallet || parsed.to === wallet);
  });
  const swaps = receipt.logs.filter(log => [V2_SWAP, V3_SWAP].includes(log.topics[0]));
  if (delta === ZERO) return { ...movement, kind: 'self' };
  if (!otherAssets && receipt.from === wallet && swaps.length === 1 && native.length > 0) {
    const swap = swaps[0]; const pair = poolTokens.get(`${swap.address}:${receipt.block}`);
    const validPair = pair && pair.includes(token) && pair.includes(ARC_USDC) && pair[0] !== pair[1];
    const poolDelta = validPair ? poolDirection(swap, pair[0] === token) : null;
    const allowed = new Set([swap.address, receipt.to]);
    const cleanTransfers = [...target.filter(log => log.from === wallet || log.to === wallet), ...native]
      .every(log => allowed.has(log.from === wallet ? log.to : log.from));
    if (cleanTransfers && poolDelta !== null && ((delta > ZERO && poolDelta < ZERO && usdcDelta < ZERO) || (delta < ZERO && poolDelta > ZERO && usdcDelta > ZERO))) {
      return { ...movement, kind: delta > ZERO ? 'buy' : 'sell', usdcWei: usdcDelta < ZERO ? -usdcDelta : usdcDelta, gasWei: receipt.gas };
    }
  }
  if (!otherAssets && native.length === 0 && !ercUsdcAtWallet && swaps.length === 0) {
    if (delta > ZERO && receipt.from !== wallet) return { ...movement, kind: 'transfer-in' };
    if (delta < ZERO && receipt.to === token && ['0xa9059cbb', '0x23b872dd'].includes(receipt.input.slice(0, 10))) return { ...movement, kind: 'transfer-out' };
  }
  return movement;
}
async function loadAnalysis(wallet: string, token: string): Promise<Analysis> {
  const checkedAt = new Date().toISOString(); const signal = AbortSignal.timeout(24_000);
  const empty: Analysis = { checkedAt, block: null, balance: null, decimals: 18, historyComplete: false,
    status: 'unavailable', reason: 'unavailable', movements: [], receiptFailures: false, priceUsd: null };
  if (!process.env.BLOCKSCOUT_API_KEY?.trim()) return { ...empty, reason: 'key-required' };
  try {
    const [blockValue] = await walletRpc([{ method: 'eth_blockNumber', params: [] }], signal);
    const block = Number(rpcUint(blockValue));
    if (!Number.isSafeInteger(block)) throw new WalletProviderError('unavailable');
    const blockTag = '0x' + block.toString(16);
    const [history, [balanceValue, decimalValue], prices] = await Promise.all([
      tokenHistory(wallet, token, block, signal),
      walletRpc([balanceOfCall(token, wallet, blockTag), { method: 'eth_call', params: [{ to: token, data: '0x313ce567' }, blockTag] }], signal),
      getWalletPrices([token]),
    ]);
    const balance = rpcUint(balanceValue); const decimals = Number(rpcUint(decimalValue));
    if (!Number.isInteger(decimals) || decimals > 36 || history.rows.some(row => row.decimals !== decimals)) throw new WalletProviderError('unavailable');
    const grouped = new Map<string, WalletMovement>();
    for (const row of history.rows) {
      const previous = grouped.get(row.hash);
      if (previous) { previous.delta += row.delta; previous.logIndex = Math.min(previous.logIndex, row.logIndex); }
      else grouped.set(row.hash, { hash: row.hash, timestamp: row.timestamp, block: row.block, logIndex: row.logIndex,
        delta: row.delta, kind: 'unclassified', usdcWei: null, gasWei: null });
    }
    const ordered = [...grouped.values()].sort((a, b) => b.block - a.block || b.logIndex - a.logIndex);
    const selected = ordered.slice(0, 40);
    const complete = history.complete && ordered.length <= 40;
    const calls = selected.flatMap(item => [
      { method: 'eth_getTransactionReceipt', params: [item.hash] }, { method: 'eth_getTransactionByHash', params: [item.hash] },
    ]);
    const rpcRows = await rpcChunks(calls, signal);
    const receipts = new Map<string, Receipt>(); let receiptFailures = false;
    selected.forEach((item, index) => {
      try { receipts.set(item.hash, parseReceipt(rpcRows[index * 2], rpcRows[index * 2 + 1], item.hash, item.block)); }
      catch { receiptFailures = true; }
    });
    const pools = new Map<string, { address: string; block: number }>();
    for (const receipt of receipts.values()) {
      const swaps = receipt.logs.filter(log => [V2_SWAP, V3_SWAP].includes(log.topics[0]));
      // Multi-swap routes cannot qualify in this adapter, so do not spend RPC
      // capacity fetching their pool metadata.
      if (receipt.from === wallet && swaps.length === 1) {
        const log = swaps[0];
        pools.set(`${log.address}:${receipt.block}`, { address: log.address, block: receipt.block });
      }
    }
    const poolEntries = [...pools.entries()];
    const poolData = await rpcChunks(poolEntries.flatMap(([, pool]) => ['0x0dfe1681', '0xd21220a7'].map(data => ({
      method: 'eth_call', params: [{ to: pool.address, data }, '0x' + pool.block.toString(16)],
    }))), signal);
    const poolTokens = new Map<string, [string, string]>();
    poolEntries.forEach(([id], index) => {
      try { poolTokens.set(id, [topicAddress(String(poolData[index * 2]).toLowerCase()), topicAddress(String(poolData[index * 2 + 1]).toLowerCase())]); }
      catch { /* Unverified pools never qualify as buys or sells. */ }
    });
    const movements = selected.map(item => {
      const receipt = receipts.get(item.hash);
      if (!receipt) return item;
      try { return classify(item, receipt, poolTokens, wallet, token); }
      catch { receiptFailures = true; return item; }
    });
    const price = prices.get(token);
    return { checkedAt, block, balance, decimals, historyComplete: complete,
      status: complete && !receiptFailures ? 'complete' : selected.length ? 'partial' : history.reason ? 'unavailable' : 'partial',
      reason: history.reason ?? (!complete ? 'limit' : receiptFailures ? 'unavailable' : null), movements, receiptFailures,
      priceUsd: price?.usable ? price.priceUsd : null };
  } catch (error) { return { ...empty, reason: error instanceof WalletProviderError ? error.reason : 'unavailable' }; }
}
export async function getWalletPnl(address: string, token: string, range: WalletRange): Promise<WalletPnl> {
  const wallet = address.toLowerCase(); const normalizedToken = token.toLowerCase();
  // Date changes reuse acquisition history, receipts and prices for two minutes.
  const data = await cachedWalletRequest(`pnl:${wallet}:${normalizedToken}`, () => loadAnalysis(wallet, normalizedToken), value => value.status === 'complete' ? 120_000 : 30_000);
  const since = range === 'all' ? null : Date.parse(data.checkedAt) - (range === '7d' ? 7 : range === '30d' ? 30 : 90) * 86400000;
  const ledger = calculateWalletLedger(data.movements, data.balance, data.decimals, data.historyComplete, since, data.priceUsd);
  return { address: wallet, token: normalizedToken, range, checkedAt: data.checkedAt, snapshotBlock: data.block,
    balance: data.balance === null ? null : Number(data.balance) / 10 ** data.decimals, priceUsd: data.priceUsd,
    status: data.status, reason: data.reason, historyComplete: data.historyComplete, ...ledger,
    issues: [...new Set([...ledger.issues, ...(data.receiptFailures ? ['receipt-unavailable' as const] : [])])],
    scannedTransactions: data.movements.length };
}
