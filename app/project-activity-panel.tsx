'use client';

import { useRef, useState, useEffect } from 'react';
import type { ProjectActivity } from '@/lib/project-activity';

export default function ProjectActivityPanel({slug,language}:{slug:string;language:'en'|'zh'}) {
  const zh=language==='zh';const t=(en:string,cn:string)=>zh?cn:en;
  const [scope,setScope]=useState<'business'|'token'>('business');
  const [data,setData]=useState<ProjectActivity|null>(null);
  const [days,setDays]=useState<7|30>(7);
  const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function query(){
    controller.current?.abort();const next=new AbortController();controller.current=next;
    setBusy(true);setError(false);setData(null);
    try{
      const response=await fetch(`/api/ecosystem-projects/${encodeURIComponent(slug)}/activity?scope=${scope}`,{cache:'no-store',signal:AbortSignal.any([next.signal,AbortSignal.timeout(35000)])});
      if(!response.ok)throw new Error('Unavailable');
      const result=await response.json() as ProjectActivity;
      if(!next.signal.aborted)setData(result);
    }catch{if(!next.signal.aborted)setError(true);}finally{if(!next.signal.aborted)setBusy(false);}
  }
  const window=data?.windows.find(w=>w.days===days);
  const partial=data?.status==='partial';
  const available=data?.status==='complete'||partial;
  const format=(value:number|null|undefined)=>value==null?'—':`${partial?'≥ ':''}${value.toLocaleString(zh?'zh-CN':'en-US')}`;
  const daily=data?.daily.filter(d=>Date.parse(d.date)+86400000>Date.parse(data.fetchedAt)-days*86400000) ?? [];
  const peak=Math.max(1,...daily.map(d=>d.transactions));
  return <section className="project-detail-panel project-activity-panel" id="activity" aria-labelledby="activity-heading">
    <div className="activity-heading"><div><h2 id="activity-heading">{t('On-chain activity','链上活跃度')}</h2><p>{t('Arc Mainnet · Query on demand · No automatic refresh','Arc 主网 · 按需查询 · 不自动刷新')}</p></div><button type="button" onClick={query} disabled={busy}>{busy?t('Querying…','查询中…'):data?t('Query again','重新查询'):t('Query activity','查询活跃度')}</button></div>
    <div className="activity-controls"><label>{t('Scope','统计范围')}<select value={scope} disabled={busy} onChange={e=>{setScope(e.target.value as typeof scope);setData(null);setError(false);}}><option value="business">{t('Business contracts','业务合约')}</option><option value="token">{t('Token contract calls','代币合约调用')}</option></select></label><div role="group" aria-label={t('Time window','统计周期')}>{([7,30] as const).map(n=><button key={n} type="button" aria-pressed={days===n} onClick={()=>setDays(n)}>{n}{t(' days',' 天')}</button>)}</div></div>
    <p className="activity-scope-note">{scope==='business'?t('Successful direct calls to registered business contracts. Token transfers and approvals are excluded.','统计已登记业务合约的成功直接调用，排除代币转账和授权。'):t('Direct calls to the token contract, including transfers and approvals. This is not product usage and does not include all token transfers through other contracts.','统计代币合约的直接调用，包含转账与授权，不代表产品使用量，也不覆盖经其他合约发生的全部代币转账。')}</p>
    <div role="status" aria-live="polite">
      {busy&&<p>{t('Reading up to 30 days of indexed transactions…','正在读取近 30 天的已索引交易…')}</p>}
      {error&&<p className="activity-warning">{t('Query failed. Please retry later; no zero-activity conclusion was made.','查询失败，请稍后重试；这不代表项目没有活动。')}</p>}
      {data?.status==='unconfigured'&&<p className="activity-warning">{scope==='business'?t('Business contracts have not been verified and registered for this project. Product activity cannot yet be measured. You can separately query token contract calls.','该项目尚未登记经核验的业务合约，暂不能统计产品活跃度。可切换查看代币合约调用，作为独立参考。'):t('No token contract is registered for this project.','该项目尚未登记代币合约。')}</p>}
      {data?.status==='unavailable'&&<p className="activity-warning">{t('The data provider is unavailable or access is restricted. Activity is unknown, not zero. Try later or inspect the contract in the explorer.','数据源暂不可用或访问受限，活跃度未知，不代表零活跃。可稍后重试，或通过下方浏览器链接核查。')}</p>}
      {partial&&<p className="activity-warning">{t('Partial results: pagination limits, incomplete records or provider errors prevented full coverage. Counts are observed lower bounds; returning ratio and comparison are withheld.','部分结果：分页上限、记录不完整或接口异常导致覆盖不足。数量仅为已观测下限，暂不计算回访比例与环比。')}</p>}
    </div>
    {available&&<><div className="activity-metrics">
      <div><span>{t('Successful calls','成功调用笔数')}</span><b>{format(window?.transactions)}</b></div>
      <div><span>{t('Active addresses','活跃地址')}</span><b>{format(window?.activeAddresses)}</b></div>
      <div title={t('Senders active on at least two distinct UTC dates within the selected window, divided by all active senders. Not user retention.','所选周期内至少在两个 UTC 日期发起调用的地址占比，不等同于用户留存率。')}><span>{t('Multi-day returning addresses','多日回访地址占比')}</span><b>{window?.returningPercent==null?'—':`${window.returningPercent.toFixed(1)}%`}</b></div>
      <div><span>{t('Latest call · 30 days · UTC','最近调用 · 30 天 · UTC')}</span><b className="activity-date">{data.lastActiveAt?new Date(data.lastActiveAt).toISOString().replace('T',' ').slice(0,19):t('None in window','周期内未观测到')}</b></div>
    </div>
    <div className="activity-trend-heading"><b>{t('Daily successful calls · UTC','每日成功调用 · UTC')}{partial?t(' · Observed subset',' · 已观测部分'):''}</b>{days===7&&data.change7d!=null&&<span>{t('vs previous 7 days','较前 7 天')} {data.change7d>=0?'+':''}{data.change7d.toFixed(1)}%</span>}</div>
    <div className="activity-chart" role="img" aria-label={t('Daily calls; exact values are available in the table below.','每日调用趋势；准确数值见下方每日明细。')}>{daily.map(d=><div key={d.date} title={`${d.date} UTC · ${d.transactions} ${t('calls','次调用')} · ${d.addresses} ${t('addresses','个地址')}`}><span style={{height:`${d.transactions/peak*100}%`}}/><small>{d.date.slice(5)}</small></div>)}</div>
    <details className="activity-daily"><summary>{t('Daily breakdown','每日明细')}</summary><table><thead><tr><th>{t('Date · UTC','日期 · UTC')}</th><th>{t('Calls','调用')}</th><th>{t('Addresses','地址')}</th></tr></thead><tbody>{daily.map(d=><tr key={d.date}><td>{d.date}</td><td>{format(d.transactions)}</td><td>{format(d.addresses)}</td></tr>)}</tbody></table></details></>}
    {data&&data.contracts.length>0&&<details className="activity-sources" open><summary>{t('Coverage and sources','统计合约与来源')} · {data.contracts.length}</summary>{data.contracts.map(c=><div key={c.address}><b>{c.label}</b><a href={`https://explorer.arc.io/address/${c.address}`} target="_blank" rel="noreferrer">{c.address}</a><a href={c.sourceUrl} target="_blank" rel="noreferrer">{t('Attribution source','归属来源')}</a></div>)}</details>}
    <p className="activity-method">{t('Addresses are not people. Only successful top-level transactions with function calldata are counted; internal calls, account-abstraction operations and off-chain activity are not decoded. Hashes are deduplicated across contracts. Returning addresses means activity on at least two UTC dates. Rolling windows include partial first/last days. Data covers only the listed contracts and the explorer’s index, not the entire project.','地址不等于真实用户。仅统计带函数调用数据的成功顶层交易，不解析内部调用、账户抽象操作及链下活动；跨合约按交易哈希去重。回访指至少在两个 UTC 日期活跃。滚动周期首尾可能不足一天。数据仅覆盖所列合约及浏览器已索引记录，不代表整个项目。')}</p>
    {data&&<small>{t('Query snapshot','查询快照')} · {data.fetchedAt.replace('T',' ').slice(0,19)} UTC · {t('Source: Blockscout · Results may be cached for 5 minutes','来源：Blockscout · 结果可能缓存 5 分钟')}</small>}
  </section>;
}
