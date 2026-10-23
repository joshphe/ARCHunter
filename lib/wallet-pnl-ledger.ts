import type { WalletPnl, WalletPnlIssue, WalletTrade, WalletTradeKind } from './wallet-portfolio-types';

export type WalletMovement = {
  hash: string; timestamp: string; block: number; logIndex: number;
  delta: bigint; kind: WalletTradeKind; usdcWei: bigint | null; gasWei: bigint | null;
};
const ZERO = BigInt(0);
const usdc = (value: bigint) => Number(value) / 1e18;

// Cost is kept in native USDC integer units. Rounding only happens at a disposal,
// and a full disposal consumes the complete remaining basis.
export function calculateWalletLedger(
  movements: WalletMovement[], balance: bigint | null, decimals: number,
  historyComplete: boolean, since: number | null, priceUsd: number | null,
): Pick<WalletPnl, 'averageCostUsdc' | 'remainingCostUsdc' | 'realizedUsdc' | 'knownRealizedUsdc' |
  'unrealizedUsdc' | 'gasUsdc' | 'totalPnlUsdc' | 'trades' | 'verifiedSwaps' | 'issues'> {
  const ordered = [...movements].sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  const net = ordered.reduce((sum, movement) => sum + movement.delta, ZERO);
  const issues = new Set<WalletPnlIssue>();
  // Partial history starts with inferred holdings of unknown acquisition cost.
  const opening = historyComplete ? ZERO : balance === null ? ZERO : balance - net;
  const reconciles = balance !== null && (historyComplete ? net === balance : opening >= ZERO);
  if (!reconciles) issues.add('balance-mismatch');
  if (!historyComplete) issues.add('history-limited');
  let quantity = opening > ZERO ? opening : ZERO;
  let cost = ZERO;
  let known = quantity === ZERO;
  let realized = ZERO; let knownSells = 0; let unknownSales = 0;
  let gas = ZERO; let gasKnown = true; let swaps = 0;
  const trades: WalletTrade[] = [];
  for (const movement of ordered) {
    const inRange = since === null || Date.parse(movement.timestamp) >= since;
    let saleProfit: bigint | null = null;
    const size = movement.delta < ZERO ? -movement.delta : movement.delta;
    if (movement.delta > ZERO) {
      if (quantity === ZERO) { known = true; cost = ZERO; }
      if (movement.kind === 'buy' && movement.usdcWei !== null) cost += movement.usdcWei;
      else { known = false; issues.add('unknown-cost'); }
      quantity += size;
    } else if (movement.delta < ZERO) {
      if (size > quantity) { quantity = size; known = false; issues.add('unknown-cost'); }
      const consumed = quantity === size ? cost : cost * size / quantity;
      if (movement.kind === 'sell' && movement.usdcWei !== null) {
        if (known) saleProfit = movement.usdcWei - consumed;
        else if (inRange) unknownSales++;
      } else if (movement.kind === 'unclassified' && inRange) unknownSales++;
      if (inRange && saleProfit !== null) { realized += saleProfit; knownSells++; }
      quantity -= size; cost -= consumed;
      if (quantity === ZERO) { known = true; cost = ZERO; }
    }
    if (movement.kind === 'unclassified') issues.add('unrecognized');
    if (inRange) {
      if (movement.kind === 'buy' || movement.kind === 'sell') {
        swaps++;
        if (movement.gasWei === null) gasKnown = false; else gas += movement.gasWei;
      }
      trades.push({ hash: movement.hash, timestamp: movement.timestamp, block: movement.block, kind: movement.kind,
        quantity: Number(size) / 10 ** decimals, usdc: movement.usdcWei === null ? null : usdc(movement.usdcWei),
        gasUsdc: movement.gasWei === null ? null : usdc(movement.gasWei), realizedUsdc: saleProfit === null ? null : usdc(saleProfit) });
    }
  }
  const basisKnown = known && reconciles && quantity === balance;
  if (!known) issues.add('unknown-cost');
  const remainingCostUsdc = basisKnown ? usdc(cost) : null;
  const currentValue = quantity === ZERO ? 0 : priceUsd === null ? null : Number(quantity) / 10 ** decimals * priceUsd;
  const unrealizedUsdc = remainingCostUsdc !== null && currentValue !== null && Number.isFinite(currentValue) ? currentValue - remainingCostUsdc : null;
  if (priceUsd === null && balance !== ZERO) issues.add('no-price');
  const realizedUsdc = historyComplete && reconciles && unknownSales === 0 ? usdc(realized) : null;
  const gasUsdc = gasKnown ? usdc(gas) : null;
  return { averageCostUsdc: basisKnown && quantity > ZERO ? usdc(cost) / (Number(quantity) / 10 ** decimals) : null,
    remainingCostUsdc, realizedUsdc, knownRealizedUsdc: knownSells && reconciles ? usdc(realized) : null, unrealizedUsdc,
    gasUsdc,
    totalPnlUsdc: since === null && realizedUsdc !== null && unrealizedUsdc !== null && gasUsdc !== null && !issues.has('unrecognized')
      ? realizedUsdc + unrealizedUsdc - gasUsdc : null,
    trades: trades.reverse(), verifiedSwaps: swaps, issues: [...issues] };
}
