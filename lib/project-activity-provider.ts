import { summarizeActivity, type ActivityScan, type ActivityTransaction, type ActivityContract, type ProjectActivity } from './project-activity';

type Row = { hash?: string; from?: { hash?: string }; to?: { hash?: string }; timestamp?: string; raw_input?: string; status?: string };
const cache = new Map<string,{until:number; value:ProjectActivity}>();
const pending = new Map<string,Promise<ProjectActivity>>();
const EXPLORER = 'https://explorer.arc.io';

export async function scanActivity(address: string, since: number, signal: AbortSignal, request: typeof fetch = fetch): Promise<ActivityScan> {
  const transactions: ActivityTransaction[] = [];
  const base = process.env.BLOCKSCOUT_API_KEY ? 'https://api.blockscout.com/5042' : EXPLORER;
  let cursor: Record<string,string|number> = {};
  const cursors = new Set<string>();
  try {
    for (let page=0;page<20;page++) {
      const url = new URL(`${base}/api/v2/addresses/${address}/transactions`);
      for (const [k,v] of Object.entries(cursor)) url.searchParams.set(k,String(v));
      url.searchParams.set('filter','to');
      if (process.env.BLOCKSCOUT_API_KEY) url.searchParams.set('apikey',process.env.BLOCKSCOUT_API_KEY);
      const response = await request(url,{signal,cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Provider unavailable');
      const data = await response.json() as {items?:Row[];next_page_params?:Record<string,string|number>|null};
      if (!Array.isArray(data.items) || !Object.hasOwn(data,'next_page_params')) throw new Error('Unexpected provider response');
      let reachedStart=false;
      for (const row of data.items) {
        if (!row.timestamp || !Number.isFinite(Date.parse(row.timestamp)) || !/^0x[a-fA-F0-9]{64}$/.test(row.hash ?? '') || !/^0x[a-fA-F0-9]{40}$/.test(row.from?.hash ?? '') || !/^0x[a-fA-F0-9]{40}$/.test(row.to?.hash ?? '') || typeof row.raw_input!=='string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(row.raw_input) || !['ok','error'].includes(row.status ?? '')) throw new Error('Incomplete provider row');
        if (Date.parse(row.timestamp)<since) reachedStart=true;
        transactions.push({hash:row.hash!,from:row.from!.hash!,to:row.to!.hash!,timestamp:row.timestamp,input:row.raw_input,success:row.status==='ok'});
      }
      if (reachedStart || data.next_page_params===null) return {address,transactions,complete:true,failed:false};
      if (!data.items.length || !data.next_page_params || typeof data.next_page_params!=='object') throw new Error('Invalid pagination');
      cursor=data.next_page_params;
      const key=JSON.stringify(cursor);
      if(cursors.has(key))throw new Error('Repeated page');
      cursors.add(key);
    }
    return {address,transactions,complete:false,failed:false};
  } catch { return {address,transactions,complete:false,failed:true}; }
}

export async function getProjectActivity(contracts: ActivityContract[], scope: ProjectActivity['scope']): Promise<ProjectActivity> {
  const key=JSON.stringify({contracts,scope});
  const existing=cache.get(key);
  if(existing && existing.until>Date.now())return existing.value;
  const inFlight=pending.get(key);if(inFlight)return inFlight;
  const task=(async()=>{
    const now=Date.now();const signal=AbortSignal.timeout(22000);
    const scans=await Promise.all(contracts.map(c=>scanActivity(c.address,now-30*86400000,signal)));
    const result=summarizeActivity(scans,contracts,scope,now);
    if(cache.size>=100)cache.delete(cache.keys().next().value!);
    cache.set(key,{until:Date.now()+(result.status==='complete'?300000:30000),value:result});
    return result;
  })();
  pending.set(key,task);
  try{return await task;}finally{pending.delete(key);}
}
