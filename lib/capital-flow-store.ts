import { randomUUID } from 'node:crypto';
import { getSql } from './db';
import type { FlowRange } from './capital-flow-rpc';

export type StoredRange = { fromBlock: number; toBlock: number; fromTime: string; toTime: string; skipped: number };
export async function readCollectionState() {
  const rows = await getSql().query(`SELECT last_success_at AS "lastSuccessAt",last_attempt_at AS "lastAttemptAt",lease_until AS "leaseUntil",next_run_at AS "nextRunAt",last_error AS "lastError",
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('fromBlock',from_block,'toBlock',to_block,'fromTime',from_time,'toTime',to_time,'skipped',skipped) ORDER BY from_block DESC),'[]'::jsonb)
     FROM arc_cctp_scan_ranges WHERE to_time>now()-interval '10 days') AS ranges FROM arc_cctp_collector_state WHERE id=1`,[],{fetchOptions:{signal:AbortSignal.timeout(8000)}});
  const row = rows[0];
  if (!row) throw new Error('CCTP migration is not applied');
  return { ranges: row.ranges as StoredRange[], lastSuccessAt: row.lastSuccessAt ? new Date(row.lastSuccessAt).toISOString() : null,
    collecting: new Date(row.leaseUntil).getTime()>Date.now(), nextRunAt: new Date(row.nextRunAt).getTime(), lastError: row.lastError as string|null };
}
export async function acquireCollectionLease(budgetMs: number, force = false) {
  const owner = randomUUID();
  const rows = await getSql().query(`UPDATE arc_cctp_collector_state SET lease_owner=$1,lease_until=now()+($2::int*interval '1 second'),last_attempt_at=now(),updated_at=now()
    WHERE id=1 AND lease_until<now() AND ($3::boolean OR next_run_at<=now()) RETURNING id`,[owner,Math.ceil(budgetMs/1000)+30,force],{fetchOptions:{signal:AbortSignal.timeout(8000)}});
  return rows.length ? owner : null;
}
export async function releaseCollectionLease(owner: string, error: boolean, changed: boolean, complete: boolean) {
  await getSql().query(`UPDATE arc_cctp_collector_state SET lease_owner=NULL,lease_until='epoch',next_run_at=now()+($2::int*interval '1 second'),
    last_success_at=CASE WHEN $3::boolean THEN now() ELSE last_success_at END,last_error=$4,updated_at=now() WHERE id=1 AND lease_owner=$1`,[owner,error?60:complete?300:20,changed,error?'upstream_unavailable':null],{fetchOptions:{signal:AbortSignal.timeout(8000)}});
}
export async function storeFlowRange(range: FlowRange, owner: string) {
  const sql = getSql();
  // Only new ledger rows contribute to rollups. Replaying a chunk cannot double-count funds.
  await sql.transaction([
    sql.query(`WITH accepted AS (
      INSERT INTO arc_cctp_transfers (tx_hash,log_index,block_number,occurred_at,domain,direction,amount_units)
      SELECT x.hash,x."logIndex",x."blockNumber",x.timestamp::timestamptz,x.domain,x.direction,x.units::numeric
      FROM jsonb_to_recordset($1::jsonb) AS x(hash text,"logIndex" int,"blockNumber" bigint,timestamp text,domain int,direction text,units text)
      WHERE EXISTS(SELECT 1 FROM arc_cctp_collector_state WHERE id=1 AND lease_owner=$2 AND lease_until>now())
      ON CONFLICT(tx_hash,log_index) DO NOTHING RETURNING occurred_at,domain,direction,amount_units
    ) INSERT INTO arc_cctp_hourly(hour,domain,direction,amount_units,transfers)
      SELECT date_trunc('hour',occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',domain,direction,sum(amount_units),count(*)::int FROM accepted GROUP BY 1,2,3
      ON CONFLICT(hour,domain,direction) DO UPDATE SET amount_units=arc_cctp_hourly.amount_units+EXCLUDED.amount_units,transfers=arc_cctp_hourly.transfers+EXCLUDED.transfers`,[JSON.stringify(range.transfers),owner]),
    sql.query(`INSERT INTO arc_cctp_scan_ranges(from_block,to_block,from_time,to_time,skipped)
      SELECT $1,$2,$3::timestamptz,$4::timestamptz,$5 WHERE EXISTS(SELECT 1 FROM arc_cctp_collector_state WHERE id=1 AND lease_owner=$6 AND lease_until>now())
      ON CONFLICT(from_block) DO UPDATE SET to_block=EXCLUDED.to_block,to_time=EXCLUDED.to_time,skipped=EXCLUDED.skipped,scanned_at=now()
      WHERE EXCLUDED.to_block>=arc_cctp_scan_ranges.to_block`,[range.fromBlock,range.toBlock,range.fromTime,range.toTime,range.skipped,owner]),
    sql.query(`UPDATE arc_cctp_collector_state SET last_success_at=now(),updated_at=now() WHERE id=1 AND lease_owner=$1`,[owner]),
  ],{fetchOptions:{signal:AbortSignal.timeout(8000)}});
}
