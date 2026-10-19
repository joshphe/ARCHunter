import { getFlowHead, getFlowStart, readFlowRange } from './capital-flow-rpc';
import { acquireCollectionLease, readCollectionState, releaseCollectionLease, storeFlowRange } from './capital-flow-store';

// A daily free cron keeps collecting without visitors. Page reads can request a bounded
// catch-up after returning stored data; the database lease is shared by all function instances.
export async function collectCapitalFlows({ budgetMs=22000, force=false }: { budgetMs?: number; force?: boolean } = {}) {
  const budget = Math.min(240000,Math.max(5000,budgetMs));
  const owner = await acquireCollectionLease(budget,force);
  if (!owner) return { status:'busy_or_current', ranges:0, transfers:0 };
  const deadline = Date.now()+budget;
  let changed=false,error=false,complete=false,ranges=0,transfers=0;
  try {
    const [state,head] = await Promise.all([readCollectionState(),getFlowHead(deadline)]);
    const since=Date.now()-8*86400000;
    const start=await getFlowStart(since,head,deadline);
    const stored = new Map(state.ranges.map(range=>[Number(range.fromBlock),range]));
    // Recent ranges first; an interrupted historical backfill resumes at the first missing range.
    let cursor=head.number;
    for (;cursor>=start.number&&Date.now()<deadline-5000;) {
      const from=Math.floor(cursor/10000)*10000,to=cursor;
      cursor=from-1;
      const old=stored.get(from);
      if (old&&Number(old.toBlock)>=to&&old.skipped===0) continue;
      const result=await readFlowRange(from,to,deadline);
      await storeFlowRange(result,owner);
      ranges++;transfers+=result.transfers.length;changed=true;
    }
    complete=cursor<start.number;
  } catch (cause) {
    error=true;console.warn('CCTP collection paused:',cause instanceof Error?cause.message:'Source unavailable');
  } finally { await releaseCollectionLease(owner,error,changed,complete); }
  return {status:error?'paused':complete?'complete':'backfilling',ranges,transfers};
}
