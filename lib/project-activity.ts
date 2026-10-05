export type ActivityContract = { address: string; label: string; sourceUrl: string };
export type ActivityTransaction = { hash: string; from: string; to: string; timestamp: string; input: string; success: boolean };
export type ActivityScan = { address: string; transactions: ActivityTransaction[]; complete: boolean; failed: boolean };
export type ActivityWindow = { days: number; transactions: number | null; activeAddresses: number | null; returningPercent: number | null; complete: boolean };
export type ProjectActivity = {
  scope: 'business' | 'token' | 'unconfigured';
  status: 'complete' | 'partial' | 'unavailable' | 'unconfigured';
  contracts: ActivityContract[]; fetchedAt: string; since: string;
  windows: ActivityWindow[]; lastActiveAt: string | null;
  daily: { date: string; transactions: number; addresses: number }[];
  change7d: number | null; failedContracts: number;
};
const DAY = 86400000;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
export const isActivityAddress = (value: string) => addressPattern.test(value);

// Counts only successful, direct contract calls in the requested rolling window.
// Addresses are transaction senders, not people; internal calls/user operations are not decoded.
export function summarizeActivity(scans: ActivityScan[], contracts: ActivityContract[], scope: ProjectActivity['scope'], now: number): ProjectActivity {
  const since = now - 30 * DAY;
  const complete = scans.length === contracts.length && scans.length > 0 && scans.every(s => s.complete && !s.failed);
  const failedContracts = scans.filter(s => s.failed).length;
  const anyAvailable = scans.some(s => !s.failed || s.transactions.length > 0);
  const allowed = new Set(contracts.map(c => c.address.toLowerCase()));
  const unique = new Map<string, ActivityTransaction>();
  for (const scan of scans) for (const tx of scan.transactions) {
    const timestamp = Date.parse(tx.timestamp);
    if (!tx.success || !/^0x[a-fA-F0-9]{64}$/.test(tx.hash) || !addressPattern.test(tx.from) || !allowed.has(tx.to.toLowerCase()) || !/^0x[a-fA-F0-9]{8,}$/.test(tx.input) || !Number.isFinite(timestamp) || timestamp < since || timestamp > now) continue;
    // ERC-20 transfers/approvals never stand in for business usage.
    if (scope === 'business' && ['0xa9059cbb','0x095ea7b3','0x23b872dd'].includes(tx.input.slice(0,10).toLowerCase())) continue;
    unique.set(tx.hash.toLowerCase(), {...tx, from: tx.from.toLowerCase()});
  }
  const txs = [...unique.values()].sort((a,b) => Date.parse(b.timestamp)-Date.parse(a.timestamp));
  const windows = [7,30].map(days => {
    const selected = txs.filter(t => Date.parse(t.timestamp) >= now-days*DAY);
    const addresses = new Map<string, Set<string>>();
    for (const tx of selected) { const dates = addresses.get(tx.from) ?? new Set<string>(); dates.add(new Date(tx.timestamp).toISOString().slice(0,10)); addresses.set(tx.from,dates); }
    return { days, transactions: anyAvailable ? selected.length : null, activeAddresses: anyAvailable ? addresses.size : null,
      returningPercent: complete && addresses.size > 0 ? 100*[...addresses.values()].filter(d=>d.size>=2).length/addresses.size : null, complete };
  });
  const daily: ProjectActivity['daily'] = [];
  for (let date = Date.parse(new Date(since).toISOString().slice(0,10)); date <= now; date += DAY) {
    const key = new Date(date).toISOString().slice(0,10);
    const selected = txs.filter(t => new Date(t.timestamp).toISOString().slice(0,10) === key);
    daily.push({date:key,transactions:selected.length,addresses:new Set(selected.map(t=>t.from)).size});
  }
  const previous = txs.filter(t=>Date.parse(t.timestamp)>=now-14*DAY && Date.parse(t.timestamp)<now-7*DAY).length;
  return { scope, status: !contracts.length ? 'unconfigured' : !anyAvailable ? 'unavailable' : complete ? 'complete' : 'partial', contracts,
    fetchedAt:new Date(now).toISOString(), since:new Date(since).toISOString(), windows,lastActiveAt:txs[0]?.timestamp ?? null,
    daily:anyAvailable ? daily : [], change7d:complete && previous>0 ? ((windows[0].transactions ?? 0)-previous)/previous*100 : null, failedContracts };
}
