// Official mainnet RPC and Circle CCTP V2 contracts; never use Arc testnet here.
// https://docs.arc.io/arc/references/connect-to-arc
// https://developers.circle.com/cctp/references/contract-addresses
const RPC = 'https://rpc.mainnet.arc.io';
const TRANSMITTER = '0x81d40f21f12a8f0e3252bccb954d722d4c464b64';
const MESSENGERS = ['0x28b5a0e9c621a5badaa536219b3a228c8168cf5d', '0x71f54f818671cd0d7ea140da213e5c8b5c92a408'];
const USDC = '0x3600000000000000000000000000000000000000';
const ARC_DOMAIN = 26;
// Event signatures from Circle's BaseTokenMessenger/TokenMessengerV2/MessageTransmitterV2.
const DEPOSIT = '0x0c8c1cbdc5190613ebd485511d4e2812cfa45eecb79d845893331fedad5130a5';
const MINT = '0x50c55e915134d457debfa58eb6f4342956f8b0616d51a89a3659360178e1ab63';
const RECEIVED = '0xff48c13eda96b1cceacc6b9edeedc9e9db9d6226afbc30146b720c19d3addb1c';
const CHUNK = 10000; // Public RPC rejects wider log ranges.
export const FLOW_SOURCE = `https://explorer.arc.io/address/${TRANSMITTER}?tab=logs`;

type RpcLog = { address: string; topics: string[]; data: string; blockNumber: string; blockHash: string; blockTimestamp?: string; transactionHash: string; logIndex: string; removed?: boolean };
type Block = { number: number; time: number; hash: string };
type Transfer = { domain: number; direction: 'in' | 'out'; units: bigint; log: RpcLog; time: number };
let nextLogRead = 0;
const isHex = (value: unknown): value is string => typeof value === 'string' && /^0x(?:[a-fA-F0-9]{2})*$/.test(value);
const hex = (value: number) => `0x${value.toString(16)}`;
const integer = (value: unknown) => {
  if (typeof value !== 'string' || !/^0x[\da-f]+$/i.test(value)) throw new Error('Invalid RPC integer');
  const number = Number.parseInt(value.slice(2), 16);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Unsafe RPC integer');
  return number;
};
function uint(data: string, offset: number, bytes = 32): bigint {
  if (!isHex(data) || data.length < 2 + (offset + bytes) * 2) throw new Error('Truncated event');
  return BigInt(`0x${data.slice(2 + offset * 2, 2 + (offset + bytes) * 2)}`);
}
function address(data: string, offset = 0): string {
  if (uint(data, offset) >> BigInt(160)) throw new Error('Invalid address padding');
  return `0x${data.slice(2 + offset * 2 + 24, 2 + (offset + 32) * 2)}`.toLowerCase();
}
function dynamicBytes(data: string, slot: number, minimum: number): string {
  const offset = Number(uint(data, slot));
  if (!Number.isSafeInteger(offset) || offset % 32 || offset < minimum) throw new Error('Invalid ABI offset');
  const length = Number(uint(data, offset));
  if (!Number.isSafeInteger(length) || length < 228 || data.length < 2 + (offset + 32 + length) * 2) throw new Error('Invalid burn message');
  return `0x${data.slice(2 + (offset + 32) * 2, 2 + (offset + 32 + length) * 2)}`;
}
async function rpc<T>(method: string, params: unknown[], deadline: number): Promise<T> {
  if (Date.now() >= deadline) throw new Error('Scan budget reached');
  // Public getLogs is metered much more tightly than ordinary block reads.
  if (method === 'eth_getLogs') {
    const wait = Math.max(0, nextLogRead - Date.now());
    if (Date.now() + wait >= deadline) throw new Error('Scan budget reached');
    nextLogRead = Date.now() + wait + 1100;
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  }
  const response = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), cache: 'no-store',
    signal: AbortSignal.timeout(Math.min(4000, Math.max(1, deadline - Date.now()))),
  });
  if (!response.ok) throw new Error(`Arc RPC HTTP ${response.status}`);
  const payload = await response.json() as { result?: T; error?: { code?: number } };
  if (payload.error || payload.result == null) throw new Error(`Arc RPC rejected ${method}`);
  return payload.result;
}
async function block(tag: string, deadline: number): Promise<Block> {
  const raw = await rpc<{ number: string; timestamp: string; hash: string }>('eth_getBlockByNumber', [tag, false], deadline);
  if (!/^0x[\da-f]{64}$/i.test(raw.hash)) throw new Error('Invalid block hash');
  return { number: integer(raw.number), time: integer(raw.timestamp) * 1000, hash: raw.hash };
}
// Find a block known to precede the window; extra boundary logs are filtered by timestamp.
async function startBlock(time: number, head: Block, deadline: number): Promise<Block> {
  const sample = await block(hex(Math.max(0, head.number - CHUNK)), deadline);
  const msPerBlock = Math.max(100, (head.time - sample.time) / Math.max(1, head.number - sample.number));
  let height = Math.max(0, head.number - Math.ceil((head.time - time) / msPerBlock * 1.02) - 100);
  for (let attempt = 0; attempt < 8; attempt++) {
    const lower = await block(hex(height), deadline);
    if (lower.time <= time || height === 0) return lower;
    height = Math.max(0, height - Math.ceil((lower.time - time) / msPerBlock * 1.1) - 1000);
  }
  throw new Error('Could not bound the time window');
}
async function readLogs(from: number, to: number, deadline: number): Promise<RpcLog[]> {
  const logs = await rpc<RpcLog[]>('eth_getLogs', [{ address: [TRANSMITTER, ...MESSENGERS], topics: [[DEPOSIT, MINT, RECEIVED]], fromBlock: hex(from), toBlock: hex(to) }], deadline);
  // Refuse possible result caps rather than assuming an abbreviated array covers the range.
  if (!Array.isArray(logs) || logs.length >= 10000) throw new Error('Incomplete log range');
  for (const log of logs) {
    if (![TRANSMITTER, ...MESSENGERS].includes(log.address?.toLowerCase()) || !Array.isArray(log.topics) || !isHex(log.data) || !/^0x[\da-f]{64}$/i.test(log.transactionHash) || !/^0x[\da-f]{64}$/i.test(log.blockHash)) throw new Error('Invalid log identity');
    const height = integer(log.blockNumber); integer(log.logIndex);
    if (height < from || height > to || log.removed) throw new Error('Non-canonical log');
  }
  return logs;
}
function decode(logs: RpcLog[], times: Map<number, number>, from: number, to: number) {
  const transfers: Transfer[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  const mints = new Map<string, Array<{ recipient: string; units: bigint; consumed: boolean }>>();
  // Pair each receive with an actual USDC mint in the same transaction. This also
  // supports non-EVM source domains without guessing their remote sender addresses.
  const ordered = [...logs].sort((a, b) => integer(a.blockNumber) - integer(b.blockNumber) || integer(a.logIndex) - integer(b.logIndex));
  for (const log of ordered) {
    const id = `${log.transactionHash.toLowerCase()}:${integer(log.logIndex)}`;
    if (seen.has(id)) continue; seen.add(id);
    try {
      const time = log.blockTimestamp ? integer(log.blockTimestamp) * 1000 : times.get(integer(log.blockNumber));
      if (time === undefined) throw new Error('Missing event time');
      if (time < from || time > to) continue;
      const emitter = log.address.toLowerCase(), topic = log.topics[0]?.toLowerCase();
      const tx = log.transactionHash.toLowerCase();
      let domain: number, units: bigint, direction: 'in' | 'out';
      if (topic === MINT && MESSENGERS.includes(emitter)) {
        if (log.topics.length !== 3 || address(log.topics[2]) !== USDC) continue;
        const list = mints.get(tx) ?? [];
        list.push({ recipient: address(log.topics[1]), units: uint(log.data, 0) + uint(log.data, 32), consumed: false });
        mints.set(tx, list); continue;
      } else if (topic === DEPOSIT && MESSENGERS.includes(emitter)) {
        if (log.topics.length !== 4) throw new Error('Unknown deposit format');
        if (address(log.topics[1]) !== USDC) continue;
        domain = Number(uint(log.data, 64)); units = uint(log.data, 0); direction = 'out';
      } else if (topic === RECEIVED && emitter === TRANSMITTER) {
        // MessageTransmitter also carries non-CCTP messages (e.g. Gateway).
        if (!mints.get(tx)?.some(row => !row.consumed)) continue;
        if (log.topics.length !== 4) throw new Error('Unknown receive format');
        domain = Number(uint(log.data, 0));
        const body = dynamicBytes(log.data, 64, 96);
        if (uint(body, 0, 4) !== BigInt(1)) throw new Error('Unknown burn message version');
        units = uint(body, 68); direction = 'in';
        const recipient = address(body, 36);
        const mint = mints.get(tx)?.findLast(row => !row.consumed && row.recipient === recipient && row.units === units);
        if (!mint) continue;
        mint.consumed = true;
      } else continue;
      if (!Number.isSafeInteger(domain) || domain < 0 || domain > 0xffffffff || domain === ARC_DOMAIN || units <= BigInt(0) || units > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invalid transfer');
      transfers.push({ domain, units, direction, time, log });
    } catch { if (log.topics[0]?.toLowerCase() !== RECEIVED) skipped++; }
  }
  for (const list of mints.values()) skipped += list.filter(row => !row.consumed).length;
  return { transfers, skipped };
}

export async function getFlowHead(deadline: number): Promise<Block> {
  const [chain, head] = await Promise.all([rpc<string>('eth_chainId', [], deadline), block('latest', deadline)]);
  if (integer(chain) !== 5042 || head.time > Date.now()+60000 || Date.now()-head.time>300000) throw new Error('Wrong or stale Arc mainnet');
  // Keep the last few blocks out of persisted ranges, even on a deterministic-finality chain.
  return block(hex(Math.max(0,head.number-20)),deadline);
}
export const getFlowStart = startBlock;
export async function readFlowRange(from: number, to: number, deadline: number) {
  const [first,last,logs] = await Promise.all([block(hex(from),deadline),block(hex(to),deadline),readLogs(from,to,deadline)]);
  const times = new Map<number,number>();
  for (const log of logs) {
    if (!log.blockTimestamp && !times.has(integer(log.blockNumber))) {
      const header = await block(log.blockNumber,deadline);times.set(header.number,header.time);
    }
  }
  const decoded = decode(logs,times,first.time,last.time);
  return {fromBlock:from,toBlock:to,fromTime:new Date(first.time).toISOString(),toTime:new Date(last.time).toISOString(),skipped:decoded.skipped,
    transfers:decoded.transfers.map(row=>({hash:row.log.transactionHash.toLowerCase(),logIndex:integer(row.log.logIndex),blockNumber:integer(row.log.blockNumber),timestamp:new Date(row.time).toISOString(),domain:row.domain,direction:row.direction,units:row.units.toString()}))};
}
export type FlowRange = Awaited<ReturnType<typeof readFlowRange>>;
