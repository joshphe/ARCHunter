import { getSql } from './db';
import { FLOW_SOURCE } from './capital-flow-rpc';
import { readCollectionState } from './capital-flow-store';
import { FLOW_CHAINS, type CapitalFlowSnapshot, type FlowDirection, type FlowWindow, type FlowRecord } from './capital-flow';

const snapshots=new Map<FlowWindow,{until:number;value:CapitalFlowSnapshot}>();
const pending=new Map<FlowWindow,Promise<CapitalFlowSnapshot>>();
export const flowMetadata=(domain:number)=>FLOW_CHAINS.find(chain=>chain.domain===domain)??{domain,name:`Domain ${domain}`,short:String(domain),color:'#8bad9e'};
async function readSnapshot(windowSize:FlowWindow):Promise<CapitalFlowSnapshot> {
  const now=Date.now(),since=now-(windowSize==='24h'?86400000:7*86400000);
  const state=await readCollectionState();
  const newest=state.ranges[0];
  let oldest=newest,skipped=0;
  if(newest)for(const range of state.ranges){
    if(Number(range.toBlock)<Number(oldest.fromBlock)-1)break;
    oldest=range;
    if(Date.parse(range.toTime)>=since)skipped+=range.skipped;
  }
  const coverageFrom=oldest?Math.max(since,Date.parse(oldest.fromTime)):null;
  const coverageTo=newest?Math.min(now,Date.parse(newest.toTime)):null;
  const covers=coverageFrom!==null&&coverageTo!==null&&coverageFrom<coverageTo;
  const fresh=coverageTo!==null&&now-coverageTo<10*60000;
  const result:CapitalFlowSnapshot={status:!covers?'unavailable':coverageFrom!==null&&coverageFrom<=since&&skipped===0&&fresh?'complete':'partial',
    protocol:'CCTP',asset:'USDC',window:windowSize,from:new Date(since).toISOString(),to:new Date(now).toISOString(),
    checkedAt:state.lastSuccessAt??new Date(now).toISOString(),coverageFrom:covers?new Date(coverageFrom!).toISOString():null,coverageTo:covers?new Date(coverageTo!).toISOString():null,
    fromBlock:oldest?Number(oldest.fromBlock):null,toBlock:newest?Number(newest.toBlock):null,sourceUrl:FLOW_SOURCE,
    chains:[],transfers:0,skipped,evidence:[],history:[],coveragePercent:covers?Math.min(100,Math.round((coverageTo!-coverageFrom!)/(now-since)*1000)/10):0,
    collecting:state.collecting,stale:!fresh,persisted:true};
  if(!covers)return result;
  // Return aggregates and a few proofs, never the full stored ledger.
  const rows=await getSql().query(`WITH windowed AS (
      SELECT domain,direction,amount_units,occurred_at,tx_hash,log_index FROM arc_cctp_transfers WHERE occurred_at>=$1::timestamptz AND occurred_at<=$2::timestamptz
    ), grouped AS (
      SELECT domain,COALESCE(sum(amount_units) FILTER(WHERE direction='in'),0)/1000000 AS inflow,
        COALESCE(sum(amount_units) FILTER(WHERE direction='out'),0)/1000000 AS outflow,count(*)::int AS transfers FROM windowed GROUP BY domain
    ), trend AS (
      SELECT date_trunc($3,occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS timestamp,domain,COALESCE(sum(amount_units) FILTER(WHERE direction='in'),0)/1000000 AS inflow,
        COALESCE(sum(amount_units) FILTER(WHERE direction='out'),0)/1000000 AS outflow,count(*)::int AS transfers FROM windowed GROUP BY 1,2
    ) SELECT (SELECT COALESCE(jsonb_agg(to_jsonb(g)),'[]') FROM grouped g) AS chains,
      (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY timestamp),'[]') FROM trend t) AS history,
      (SELECT COALESCE(jsonb_agg(to_jsonb(e)),'[]') FROM (SELECT tx_hash AS hash,log_index AS "logIndex",domain,direction,amount_units/1000000 AS amount,occurred_at AS timestamp FROM windowed ORDER BY occurred_at DESC,tx_hash,log_index DESC LIMIT 6)e) AS evidence`,[result.coverageFrom,result.coverageTo,windowSize==='24h'?'hour':'day']);
  const data=rows[0];
  result.chains=(data.chains as Array<{domain:number;inflow:number;outflow:number;transfers:number}>).map(row=>({...flowMetadata(row.domain),inflow:Number(row.inflow),outflow:Number(row.outflow),transfers:Number(row.transfers)}));
  result.transfers=result.chains.reduce((total,chain)=>total+chain.transfers,0);
  result.history=data.history as CapitalFlowSnapshot['history'];result.evidence=data.evidence as CapitalFlowSnapshot['evidence'];
  return result;
}
export async function getCapitalFlows(windowSize:FlowWindow,force=false):Promise<CapitalFlowSnapshot> {
  const old=snapshots.get(windowSize);
  if(old&&old.until>Date.now()&&!force)return old.value;
  const running=pending.get(windowSize);if(running)return running;
  const task=readSnapshot(windowSize).then(value=>{snapshots.set(windowSize,{until:Date.now()+15000,value});return value;});
  pending.set(windowSize,task);
  try{return await task;}catch(error){
    if(old&&Date.now()-Date.parse(old.value.checkedAt)<3600000)return {...old.value,status:'partial',stale:true,collecting:false};
    throw error;
  }finally{pending.delete(windowSize);}
}
export async function listFlowRecords(options:{window:FlowWindow;domain:number|null;direction:FlowDirection;page:number;sort:'recent'|'amount'}) {
  const snapshot=await getCapitalFlows(options.window);
  if(!snapshot.coverageFrom||!snapshot.coverageTo)return {records:[],total:0,page:options.page,pageSize:10};
  const rows=await getSql().query(`SELECT tx_hash AS hash,log_index AS "logIndex",domain,direction,amount_units/1000000 AS amount,occurred_at AS timestamp,count(*) OVER() AS total
    FROM arc_cctp_transfers WHERE occurred_at>=$1::timestamptz AND occurred_at<=$2::timestamptz AND ($3::int IS NULL OR domain=$3)
      AND ($4='all' OR direction=$4) ORDER BY ${options.sort==='amount'?'amount_units DESC,':''}occurred_at DESC,tx_hash,log_index DESC LIMIT 10 OFFSET $5`,[snapshot.coverageFrom,snapshot.coverageTo,options.domain,options.direction,(options.page-1)*10]);
  return {records:rows.map(row=>({hash:String(row.hash),logIndex:Number(row.logIndex),domain:Number(row.domain),direction:row.direction,amount:Number(row.amount),timestamp:new Date(row.timestamp).toISOString()} as FlowRecord)),total:Number(rows[0]?.total??0),page:options.page,pageSize:10};
}
