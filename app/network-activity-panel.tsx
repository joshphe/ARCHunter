'use client';

import { useState, type CSSProperties } from 'react';
import { Activity, Coins, FileCode2, UsersRound } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type MetricKey = 'transactions' | 'activeAddresses' | 'contractsDeployed' | 'feesUsdc';
type ActivityPoint = {
  timestamp: number;
  transactions?: number;
  activeAddresses?: number;
  contractsDeployed?: number;
  feesUsdc?: number;
  complete?: boolean;
  block?: number;
};
export type NetworkActivityData = {
  source: string;
  updatedAt: string | null;
  latestBlock: number | null;
  partial: boolean;
  history: ActivityPoint[];
};
type Props = { data: NetworkActivityData | null; loaded: boolean; zh: boolean; isDark: boolean };

const metrics: Array<{ key: MetricKey; title: string; titleZh: string; icon: typeof Activity; color: string; unit: 'count' | 'usdc' }> = [
  { key: 'transactions', title: 'Transactions', titleZh: '每日交易数', icon: Activity, color: '#c2f970', unit: 'count' },
  { key: 'activeAddresses', title: 'Active addresses', titleZh: '活跃地址', icon: UsersRound, color: '#80cfff', unit: 'count' },
  { key: 'contractsDeployed', title: 'Contracts deployed', titleZh: '合约部署数', icon: FileCode2, color: '#b29aff', unit: 'count' },
  { key: 'feesUsdc', title: 'Network fees', titleZh: '网络手续费', icon: Coins, color: '#ffb866', unit: 'usdc' },
];

const shortNumber = (value: number | null | undefined, zh: boolean) => value == null ? '—' : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const fullNumber = (value: number, zh: boolean) => new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }).format(value);
const timestampLabel = (timestamp: number, zh: boolean, withTime = false) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', withTime
  ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }
  : { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(timestamp * 1000));

export default function NetworkActivityPanel({ data, loaded, zh, isDark }: Props) {
  const [selected, setSelected] = useState<MetricKey>('transactions');
  const [days, setDays] = useState(30);
  const activeMetric = metrics.find((metric) => metric.key === selected) ?? metrics[0];
  const chartData = (data?.history ?? []).slice(-days);
  const completed = (data?.history ?? []).filter((point) => point.complete && metrics.every((metric) => typeof point[metric.key] === 'number'));
  const latest = completed.at(-1);
  const dateLabel = latest ? timestampLabel(latest.timestamp, zh) : null;

  return <section className="network-activity-panel">
    <div className="network-activity-heading">
      <div><div className="section-kicker">{zh ? 'ARC 链上活跃度' : 'ARC NETWORK ACTIVITY'}</div><h3>{zh ? '网络使用情况' : 'Network usage'}</h3><p>{zh ? '按 UTC 自然日统计，持续观察链上活动变化。' : 'Daily UTC measurements to track on-chain activity over time.'}</p></div>
      <div className="network-activity-meta">
        {data?.updatedAt ? <span>{zh ? '数据更新' : 'Updated'} · {timestampLabel(Date.parse(data.updatedAt) / 1000, zh, true)} UTC</span> : null}
        {data?.latestBlock ? <span>{zh ? '索引区块' : 'Indexed block'} · {fullNumber(data.latestBlock, zh)}</span> : null}
        <a href="https://docs.arc-scan.org/apis" target="_blank" rel="noreferrer">{zh ? `数据来源：${data?.source ?? 'Arcscan'}` : `Source: ${data?.source ?? 'Arcscan'}`}</a>
      </div>
    </div>

    <div className="network-activity-cards">
      {metrics.map(({ key, title, titleZh, icon: Icon, unit }) => <article className="network-activity-card" key={key}>
        <div className="network-activity-card-label"><span>{zh ? titleZh : title}</span><Icon size={15}/></div>
        <strong>{!loaded && !data ? '…' : latest ? (unit === 'usdc' ? `${shortNumber(latest[key], zh)} USDC` : shortNumber(latest[key], zh)) : '—'}</strong>
        <small>{dateLabel ? `${zh ? '最近完整日' : 'Latest complete day'} · ${dateLabel} UTC` : (zh ? '等待完整日数据' : 'Waiting for a complete day')}</small>
      </article>)}
    </div>

    <div className="network-activity-chart-card">
      <div className="network-activity-chart-head">
        <div className="network-activity-metric-switch" role="group" aria-label={zh ? '选择趋势指标' : 'Choose activity metric'}>
          {metrics.map(({ key, title, titleZh, color }) => <button type="button" key={key} className={selected === key ? 'selected' : ''} style={{ '--activity-color': color } as CSSProperties} onClick={() => setSelected(key)} aria-pressed={selected === key}>{zh ? titleZh : title}</button>)}
        </div>
        <div className="network-activity-range" role="group" aria-label={zh ? '选择图表时间范围' : 'Choose chart time range'}>
          {[7, 30, 90].map((range) => <button type="button" key={range} className={days === range ? 'active' : ''} onClick={() => setDays(range)} aria-pressed={days === range}>{range}{zh ? '天' : 'D'}</button>)}
        </div>
      </div>
      <div className="network-activity-chart">
        {chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs><linearGradient id="networkActivityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={activeMetric.color} stopOpacity={0.22}/><stop offset="100%" stopColor={activeMetric.color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={isDark ? '#252a32' : '#e6e9e2'} vertical={false}/>
          <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#7c8490' : '#798179', fontSize: 10 }} tickFormatter={(value) => timestampLabel(Number(value), zh)} dy={8}/>
          <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#7c8490' : '#798179', fontSize: 10 }} tickFormatter={(value) => shortNumber(Number(value), zh)}/>
          <Tooltip contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} labelFormatter={(value) => `${timestampLabel(Number(value), zh)} UTC`} formatter={(value) => [`${fullNumber(Number(value), zh)}${activeMetric.unit === 'usdc' ? ' USDC' : ''}`, zh ? activeMetric.titleZh : activeMetric.title]}/>
          <Area type="monotone" dataKey={selected} stroke={activeMetric.color} strokeWidth={2} fill="url(#networkActivityFill)" connectNulls={false} isAnimationActive={false}/>
        </AreaChart></ResponsiveContainer> : <div className="network-activity-empty">{loaded ? (zh ? '链上活跃度暂时不可用。' : 'Network activity is temporarily unavailable.') : (zh ? '正在加载链上数据…' : 'Loading network activity…')}</div>}
      </div>
      <div className="network-activity-note">
        <span>{zh ? '图表包含未完成的当日数据；上方指标仅显示最近完整 UTC 日。' : 'The chart may include an incomplete current day; cards use the latest complete UTC day.'}</span>
        {data?.partial ? <span>{zh ? '部分指标暂不可用' : 'Some metrics are unavailable'}</span> : null}
      </div>
    </div>

    <details className="network-activity-method">
      <summary>{zh ? '指标口径' : 'Metric definitions'}</summary>
      <ul>
        <li>{zh ? '交易数：该时间段内已提交的顶层交易，包含成功与失败交易。' : 'Transactions: top-level transactions committed in the period, including successful and reverted transactions.'}</li>
        <li>{zh ? '活跃地址：该时间段内发送或接收顶层交易的去重地址数。' : 'Active addresses: distinct addresses that sent or received a top-level transaction in the period.'}</li>
        <li>{zh ? '合约部署数：该时间段内新部署的合约数。' : 'Contracts deployed: new contracts deployed during the period.'}</li>
        <li>{zh ? '网络手续费：交易发送者支付的手续费总额，Arc 使用 USDC 作为 Gas 代币。' : 'Network fees: total fees paid by transaction senders; Arc uses USDC as its gas token.'}</li>
        <li>{zh ? '所有日度数据按 UTC 统计；完整性与更新区块由数据源索引状态决定。' : 'Daily buckets use UTC; completeness and indexed block coverage follow the data source index.'}</li>
      </ul>
    </details>
  </section>;
}
