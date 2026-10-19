'use client';
import { useMemo } from 'react';
import { Bar,CartesianGrid,ComposedChart,Legend,Line,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import { FLOW_CHAINS,type CapitalFlowSnapshot,type FlowDirection } from '@/lib/capital-flow';
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);
type Props={snapshot:CapitalFlowSnapshot;domain:number|null;direction:FlowDirection;zh:boolean};
function TrendTooltip({active,payload,zh,direction}:{active?:boolean;payload?:Array<{payload?:{time:number;inflow:number|null;outflow:number|null;net:number|null;partial:boolean}}> ;zh:boolean;direction:FlowDirection}){
 const row=payload?.[0]?.payload;if(!active||!row)return null;
 return <div className="flow-trend-tooltip"><b>{new Date(row.time).toLocaleString(zh?'zh-CN':'en-US',{timeZone:'UTC',month:'short',day:'numeric',hour:'2-digit'})} UTC</b>{direction!=='out'&&<span>{zh?'流入':'Inflow'} <strong>{money(row.inflow??0)}</strong></span>}{direction!=='in'&&<span>{zh?'流出':'Outflow'} <strong>{money(Math.abs(row.outflow??0))}</strong></span>}{direction==='all'&&<span>{zh?'净流入':'Net inflow'} <strong>{money(row.net??0)}</strong></span>}{row.partial&&<small>{zh?'此时段仅包含已覆盖部分':'This interval is partially covered'}</small>}</div>;
}
export default function CapitalFlowTrend({snapshot,domain,direction,zh}:Props){
 const data=useMemo(()=>{
  const step=snapshot.window==='24h'?3600000:86400000;
  const from=Math.floor(Date.parse(snapshot.from)/step)*step,to=Date.parse(snapshot.to),coveredFrom=Date.parse(snapshot.coverageFrom??''),coveredTo=Date.parse(snapshot.coverageTo??'');
  const grouped=new Map<number,{inflow:number;outflow:number}>();
  for(const row of snapshot.history??[]){if(domain!==null&&row.domain!==domain)continue;const time=Date.parse(row.timestamp),sum=grouped.get(time)??{inflow:0,outflow:0};sum.inflow+=Number(row.inflow);sum.outflow+=Number(row.outflow);grouped.set(time,sum);}
  const rows=[];
  for(let time=from;time<=to;time+=step){
   const known=time+step>coveredFrom&&time<=coveredTo&&Number.isFinite(coveredFrom)&&Number.isFinite(coveredTo),value=grouped.get(time)??{inflow:0,outflow:0};
   rows.push({time,label:new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{timeZone:'UTC',...(snapshot.window==='24h'?{hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric'})}).format(time),inflow:known?value.inflow:null,outflow:known?-value.outflow:null,net:known?value.inflow-value.outflow:null,partial:time<coveredFrom||time+step>coveredTo});
  }return rows;
 },[snapshot,domain,zh]);
 return <div className="flow-trend"><div className="flow-trend-heading"><b>{domain!==null?`${FLOW_CHAINS.find(chain=>chain.domain===domain)?.name??`Domain ${domain}`} ↔ ARC · `:''}{zh?'资金流入流出趋势':'Capital flow over time'}</b><span>{snapshot.window==='24h'?(zh?'按小时':'Hourly'):(zh?'按 UTC 日期':'Daily UTC')} · USDC</span></div><ResponsiveContainer width="100%" height={390}><ComposedChart data={data} margin={{top:20,right:20,bottom:5,left:10}}><CartesianGrid stroke="var(--flow-line)" vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" stroke="var(--flow-muted)" tickLine={false} axisLine={false} minTickGap={28} tick={{fontSize:11}}/><YAxis tickFormatter={money} stroke="var(--flow-muted)" tickLine={false} axisLine={false} width={76} tick={{fontSize:11}}/><Tooltip content={<TrendTooltip zh={zh} direction={direction}/>} cursor={{fill:'var(--flow-line)',opacity:.2}}/><Legend wrapperStyle={{fontSize:12,paddingTop:18}}/>{direction!=='out'&&<Bar dataKey="inflow" name={zh?'流入 ARC':'Into Arc'} fill="var(--flow-green)" radius={[3,3,0,0]} maxBarSize={26} isAnimationActive={false}/>} {direction!=='in'&&<Bar dataKey="outflow" name={zh?'流出 ARC':'Out of Arc'} fill="var(--flow-red)" radius={[0,0,3,3]} maxBarSize={26} isAnimationActive={false}/>} {direction==='all'&&<Line dataKey="net" name={zh?'净流入':'Net inflow'} stroke="var(--flow-trend-line)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>}</ComposedChart></ResponsiveContainer><p>{zh?'空白时段表示尚未覆盖；边界时段可能不完整。流出绘制在零轴下方，折线表示流入减去流出。':'Blank intervals are not covered. Boundary intervals may be incomplete. Outflows appear below zero; the line shows inflow minus outflow.'}</p></div>;
}
