export type FlowDirection = 'all' | 'in' | 'out';
export type FlowWindow = '24h' | '7d';
export type FlowRecord = { hash: string; logIndex: number; direction: 'in' | 'out'; domain: number; amount: number; timestamp: string };
export type FlowHistoryPoint = { timestamp: string; domain: number; inflow: number; outflow: number; transfers: number };
export type ChainFlow = {
  domain: number; name: string; short: string; color: string;
  inflow: number; outflow: number; transfers: number;
};
export type CapitalFlowSnapshot = {
  status: 'complete' | 'partial' | 'unavailable';
  protocol: 'CCTP'; asset: 'USDC'; window: FlowWindow;
  from: string; to: string; checkedAt: string;
  coverageFrom: string | null; coverageTo: string | null; sourceUrl: string;
  fromBlock: number | null; toBlock: number | null;
  chains: ChainFlow[]; transfers: number;
  skipped: number;
  evidence: FlowRecord[];
  history: FlowHistoryPoint[];
  coveragePercent: number;
  collecting: boolean;
  stale: boolean;
  persisted: boolean;
};

// Domain IDs, not EVM chain IDs. Circle's CCTP mainnet domain registry.
export const FLOW_CHAINS = [
  { domain: 0, name: 'Ethereum', short: 'ETH', color: '#8da5f7' },
  { domain: 6, name: 'Base', short: 'B', color: '#4e83ff' },
  { domain: 3, name: 'Arbitrum', short: 'ARB', color: '#54b7ed' },
  { domain: 2, name: 'OP Mainnet', short: 'OP', color: '#ff6677' },
  { domain: 5, name: 'Solana', short: 'SOL', color: '#a18cff' },
  { domain: 1, name: 'Avalanche', short: 'AVAX', color: '#ee7680' },
  { domain: 7, name: 'Polygon', short: 'POL', color: '#ae8af0' },
  { domain: 19, name: 'HyperEVM', short: 'H', color: '#76d5bd' },
  { domain: 15, name: 'Monad', short: 'MON', color: '#b3a1f5' },
  { domain: 10, name: 'Unichain', short: 'UNI', color: '#ec8db6' },
  { domain: 11, name: 'Linea', short: 'L', color: '#a3cdd3' },
  { domain: 13, name: 'Sonic', short: 'S', color: '#80bcde' },
  { domain: 14, name: 'World Chain', short: 'W', color: '#c5c9d0' },
  { domain: 12, name: 'Codex', short: 'C', color: '#b1c593' },
  { domain: 16, name: 'Sei', short: 'SEI', color: '#dd908f' },
  { domain: 18, name: 'XDC', short: 'XDC', color: '#78a6d0' },
  { domain: 21, name: 'Ink', short: 'INK', color: '#ac96e7' },
  { domain: 22, name: 'Plume', short: 'P', color: '#e5a884' },
  { domain: 28, name: 'EDGE', short: 'E', color: '#99d1b0' },
  { domain: 29, name: 'Injective', short: 'INJ', color: '#79cde3' },
  { domain: 30, name: 'Morph', short: 'M', color: '#9bd77b' },
  { domain: 31, name: 'Pharos', short: 'P', color: '#a4b5ef' },
  { domain: 32, name: 'Cronos', short: 'CRO', color: '#90a7cc' },
  { domain: 33, name: 'Plasma', short: 'XPL', color: '#a4cebb' },
  { domain: 37, name: 'X Layer', short: 'X', color: '#b0b9b3' },
  { domain: 8, name: 'Sui', short: 'SUI', color: '#88bfec' },
  { domain: 9, name: 'Aptos', short: 'APT', color: '#a0c7bc' },
  { domain: 25, name: 'Starknet', short: 'STRK', color: '#ce9fab' },
  { domain: 27, name: 'Stellar', short: 'XLM', color: '#b8c9da' },
] as const;

// Presentation fixture only. The client requires an explicit Preview action to use it.
export const DEMO_FLOWS: ChainFlow[] = FLOW_CHAINS.slice(0, 12).map((chain, i) => ({
  ...chain,
  inflow: [2820000,1460000,980000,620000,340000,520000,280000,175000,245000,120000,85000,55000][i],
  outflow: [1360000,720000,1140000,290000,760000,210000,465000,320000,180000,45000,160000,74000][i],
  transfers: [184,132,96,81,73,64,52,41,39,28,19,14][i],
}));
