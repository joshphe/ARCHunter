'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Flame, Radio, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';
import ProjectAvatar from '@/app/project-avatar';

type Protocol = { name: string; twitter?: string; module?: string; category?: string; logo?: string; total24h?: number; total7d?: number; total30d?: number; change_1d?: number };
type HistoryPoint = { timestamp: number; tvl?: number; fees?: number; volume?: number };
type OverviewData = {
  updatedAt: string; source: string; partial: boolean;
  metrics: { tvl: number | null; tvlChange24h: number | null; fees24h: number | null; feesChange24h: number | null; fees7d: number | null; dexVolume24h: number | null; dexVolumeChange24h: number | null; protocolCount: number | null };
  history: HistoryPoint[]; topProtocols: Protocol[];
};
type Launchpad = { slug: string; name: string; logo: string; xHandle: string; available: boolean; fees24h: number | null; fees7d: number | null; change24h: number | null };
type LaunchpadData = { launchpads: Launchpad[] };
type Props = { language: 'en' | 'zh'; isDark: boolean; onNavigate: () => void };
type Metric = 'tvl' | 'fees' | 'volume';

const currency = (value: number | null | undefined, compact = true) => value == null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 2 : value < 100 ? 2 : 0,
}).format(value);
const percent = (value: number | null | undefined) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

export default function OverviewPage({ language, isDark, onNavigate }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [data, setData] = useState<OverviewData | null>(null);
  const [launchpads, setLaunchpads] = useState<Launchpad[]>([]);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<Metric>('tvl');
  const [period, setPeriod] = useState<number | null>(30);
  const [chartWindow, setChartWindow] = useState({ startIndex: 0, endIndex: 0 });

  async function loadData() {
    setRefreshing(true);
    const [overviewResult, launchpadResult] = await Promise.allSettled([
      fetch('/api/overview', { cache: 'no-store' }).then((res) => { if (!res.ok) throw new Error('Failed'); return res.json() as Promise<OverviewData>; }),
      fetch('/api/launchpads', { cache: 'no-store' }).then((res) => { if (!res.ok) throw new Error('Failed'); return res.json() as Promise<LaunchpadData>; }),
    ]);
    if (overviewResult.status === 'fulfilled') { setData(overviewResult.value); setFailed(overviewResult.value.partial); }
    else setFailed(true);
    if (launchpadResult.status === 'fulfilled') setLaunchpads(launchpadResult.value.launchpads);
    setRefreshing(false);
  }

  useEffect(() => { void loadData(); }, []);

  const history = useMemo(() => {
    const points = (data?.history ?? []).filter((point) => point.timestamp >= ARC_LAUNCH_START_TIMESTAMP);
    if (!points.some((point) => point.timestamp === ARC_LAUNCH_START_TIMESTAMP)) {
      points.push({ timestamp: ARC_LAUNCH_START_TIMESTAMP });
    }
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);
  useEffect(() => {
    if (!history.length) return;
    const endIndex = history.length - 1;
    setChartWindow({ startIndex: Math.max(0, endIndex - 29), endIndex });
    setPeriod(30);
  }, [history.length]);

  const currentMetric = {
    tvl: { label: t('Total value locked', '总锁仓价值'), dataKey: 'tvl', color: '#c2f970', value: data?.metrics.tvl, change: data?.metrics.tvlChange24h },
    fees: { label: t('Protocol fees', '协议费用'), dataKey: 'fees', color: '#a18aff', value: data?.metrics.fees24h, change: data?.metrics.feesChange24h },
    volume: { label: t('DEX volume', 'DEX 成交量'), dataKey: 'volume', color: '#80cfff', value: data?.metrics.dexVolume24h, change: data?.metrics.dexVolumeChange24h },
  }[metric];

  function choosePeriod(days: number) {
    const endIndex = history.length - 1;
    setChartWindow({ startIndex: Math.max(0, endIndex - days + 1), endIndex: Math.max(0, endIndex) });
    setPeriod(days);
  }
  function handleBrush(window: { startIndex?: number; endIndex?: number }) {
    if (window.startIndex == null || window.endIndex == null) return;
    setChartWindow({ startIndex: window.startIndex, endIndex: window.endIndex });
    setPeriod(null);
  }

  const updatedLabel = data?.updatedAt ? new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(data.updatedAt)) : null;
  const launchpadLeaders = [...launchpads].filter((item) => item.available).sort((a, b) => (b.fees24h ?? 0) - (a.fees24h ?? 0)).slice(0, 4);

  return <div className="content overview-content">
    <div className="page-heading overview-heading">
      <div><div className="eyebrow"><span className="eyebrow-line"/>{t('ARC ECOSYSTEM INTELLIGENCE', 'ARC 生态情报')}<span className="eyebrow-line"/></div><h1>ARC <span>{t('Overview', '总览')}</span></h1><p className="subtitle">{t('A live pulse of activity across the Arc ecosystem.', '实时掌握 Arc 生态整体动态。')}</p></div>
      <button className="overview-refresh" onClick={() => void loadData()} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''}/>{t('Refresh', '刷新')}</button>
    </div>
    <div className="overview-sourcebar"><span className="overview-live"><i/> {t('LIVE DATA', '实时数据')}</span><span>{t('Source: DefiLlama', '数据来源：DefiLlama')}</span>{updatedLabel && <span className="overview-updated">{t('Updated', '更新时间')} {updatedLabel}</span>}{failed && <span className="overview-partial">{t('Some data is temporarily unavailable', '部分数据暂时不可用')}</span>}<a href="https://defillama.com/chain/arc" target="_blank" rel="noreferrer">{t('Open source page', '打开数据源')} <ExternalLink size={12}/></a></div>

    <div className="overview-metrics">
      <article className="overview-metric-card"><div className="overview-metric-label"><span>{t('TOTAL VALUE LOCKED', '总锁仓价值')}</span><Wallet size={15}/></div><strong>{currency(data?.metrics.tvl)}</strong><div className="overview-metric-foot"><span className={data?.metrics.tvlChange24h != null && data.metrics.tvlChange24h < 0 ? 'negative' : 'positive'}>{data?.metrics.tvlChange24h != null && (data.metrics.tvlChange24h >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)} {percent(data?.metrics.tvlChange24h)}</span><span>{t('24h change', '24 小时变化')}</span></div></article>
      <article className="overview-metric-card"><div className="overview-metric-label"><span>{t('PROTOCOL FEES · 24H', '协议费用 · 24 小时')}</span><Flame size={15}/></div><strong>{currency(data?.metrics.fees24h)}</strong><div className="overview-metric-foot"><span className={data?.metrics.feesChange24h != null && data.metrics.feesChange24h < 0 ? 'negative' : 'positive'}>{data?.metrics.feesChange24h != null && (data.metrics.feesChange24h >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)} {percent(data?.metrics.feesChange24h)}</span><span>{t('24h change', '24 小时变化')}</span></div></article>
      <article className="overview-metric-card"><div className="overview-metric-label"><span>{t('DEX VOLUME · 24H', 'DEX 成交量 · 24 小时')}</span><Radio size={15}/></div><strong>{currency(data?.metrics.dexVolume24h)}</strong><div className="overview-metric-foot"><span className={data?.metrics.dexVolumeChange24h != null && data.metrics.dexVolumeChange24h < 0 ? 'negative' : 'positive'}>{data?.metrics.dexVolumeChange24h != null && (data.metrics.dexVolumeChange24h >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)} {percent(data?.metrics.dexVolumeChange24h)}</span><span>{t('24h change', '24 小时变化')}</span></div></article>
      <article className="overview-metric-card"><div className="overview-metric-label"><span>{t('TRACKED PROTOCOLS', '已追踪协议')}</span><Sparkles size={15}/></div><strong>{data?.metrics.protocolCount ?? '—'}</strong><div className="overview-metric-foot count-foot"><span>{t('Protocols on Arc', 'Arc 链协议')}</span></div></article>
    </div>

    <section className="overview-chart-card">
      <div className="overview-chart-head"><div><div className="section-kicker">{t('ECOSYSTEM TRENDS', '生态趋势')}</div><h3>{t('Network activity over time', '网络活动趋势')}</h3></div><div className="overview-chart-controls">
        <div className="overview-metric-switch">{(['tvl', 'fees', 'volume'] as Metric[]).map((item) => <button key={item} className={metric === item ? 'selected' : ''} onClick={() => setMetric(item)}>{item === 'tvl' ? 'TVL' : item === 'fees' ? t('Fees', '费用') : t('DEX volume', 'DEX 成交量')}</button>)}</div>
        <div className="range-switch">{[7, 30, 90].map((days) => <button key={days} className={period === days ? 'on' : ''} onClick={() => choosePeriod(days)}>{days}D</button>)}</div>
      </div></div>
      <div className="overview-chart-wrap">{history.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 10, right: 8, left: -19, bottom: 0 }}>
        <defs><linearGradient id="overviewMetricFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={currentMetric.color} stopOpacity={0.22}/><stop offset="100%" stopColor={currentMetric.color} stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid stroke={isDark ? '#20252d' : '#e6e9e2'} vertical={false}/><XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => currency(Number(value))}/><Tooltip contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} labelFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Number(value) * 1000))} formatter={(value) => [currency(Number(value), false), currentMetric.label]}/>
        <Area type="monotone" dataKey={currentMetric.dataKey} name={currentMetric.label} stroke={currentMetric.color} strokeWidth={2} fill="url(#overviewMetricFill)" connectNulls isAnimationActive={false}/>
        {history.length > 1 && <Brush dataKey="timestamp" height={40} travellerWidth={15} gap={1} startIndex={chartWindow.startIndex} endIndex={chartWindow.endIndex} onChange={handleBrush} alwaysShowText tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))} fill={isDark ? '#15191e' : '#f6f8f3'} stroke={isDark ? '#303640' : '#dce2d6'} traveller={(props: { x: number; y: number; width: number; height: number }) => { const cx = props.x + props.width / 2; const cy = props.y + props.height / 2; return <g className="launchpad-brush-handle"><rect x={cx - 5} y={props.y + 5} width={10} height={props.height - 10} rx={5}/><path d={`M ${cx - 1.5} ${cy - 4} v 8 M ${cx + 1.5} ${cy - 4} v 8`}/></g>; }} />}
      </AreaChart></ResponsiveContainer> : <div className="overview-chart-empty">{failed ? t('Metrics could not be loaded.', '指标暂时无法加载。') : t('Loading chain data…', '正在加载链上数据…')}</div>}</div>
      <div className="overview-chart-summary"><span>{currentMetric.label}<b>{currency(currentMetric.value)}</b></span><span>{t('24h change', '24 小时变化')}<b className={(currentMetric.change ?? 0) < 0 ? 'negative' : 'positive'}>{percent(currentMetric.change)}</b></span><span className="overview-chart-source">{t('Daily data', '每日数据')}</span></div>
    </section>

    <div className="overview-lower-grid">
      <section className="overview-panel"><div className="overview-panel-head"><div><div className="section-kicker">{t('ON-CHAIN FEES', '链上费用')}</div><h3>{t('Top protocols · 24h', '协议费用榜 · 24 小时')}</h3></div></div>
        <div className="overview-table-scroll"><table className="overview-table"><thead><tr><th>#</th><th>{t('PROTOCOL', '协议')}</th><th>{t('CATEGORY', '类别')}</th><th>{t('FEES · 24H', '费用 · 24 小时')}</th><th>{t('FEES · 7D', '费用 · 7 天')}</th></tr></thead><tbody>{data?.topProtocols.map((protocol, index) => <tr key={`${protocol.name}-${index}`}><td className="overview-rank">{String(index + 1).padStart(2, '0')}</td><td><div className="overview-protocol-name"><ProjectAvatar key={protocol.twitter ?? protocol.name} className="overview-x-avatar" handle={protocol.twitter ?? ''} symbol={protocol.name.slice(0, 1)}/><b>{protocol.name}</b></div></td><td className="overview-category">{protocol.category ?? '—'}</td><td className="overview-money">{currency(protocol.total24h)}</td><td className="overview-money">{currency(protocol.total7d)}</td></tr>)}{!data && <tr><td colSpan={5} className="overview-loading">{t('Loading protocol fees…', '正在加载协议费用…')}</td></tr>}{data?.topProtocols.length === 0 && <tr><td colSpan={5} className="overview-loading">{t('No protocol fee data available.', '暂无协议费用数据。')}</td></tr>}</tbody></table></div>
      </section>
      <section className="overview-panel launchpad-pulse-panel"><div className="overview-panel-head"><div><div className="section-kicker">{t('LAUNCHPAD PULSE', '发射台动态')}</div><h3>{t('Top launchpads · 24h fees', '发射台费用榜 · 24 小时')}</h3></div><button onClick={onNavigate}>{t('View all', '查看全部')} <ArrowUpRight size={12}/></button></div>
        <div className="overview-launchpad-list">{launchpadLeaders.map((item, index) => <div className="overview-launchpad-row" key={item.slug}><span className="overview-rank">{String(index + 1).padStart(2, '0')}</span><ProjectAvatar key={item.xHandle} className="overview-x-avatar launchpad-x-avatar" handle={item.xHandle} symbol={item.logo}/><b>{item.name}</b><span className="overview-money">{currency(item.fees24h)}</span><span className={item.change24h == null ? 'launchpad-change unavailable' : item.change24h >= 0 ? 'launchpad-change positive' : 'launchpad-change negative'}>{item.change24h != null && (item.change24h >= 0 ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>)}{percent(item.change24h)}</span></div>)}{launchpadLeaders.length === 0 && <div className="overview-loading">{failed ? t('Launchpad metrics unavailable.', '发射台数据暂不可用。') : t('Loading launchpad fees…', '正在加载发射台费用…')}</div>}</div>
        <div className="overview-launchpad-foot"><span>{t('Selected Arc launchpads', '精选 Arc 发射台')}</span><Sparkles size={13}/></div>
      </section>
    </div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span></footer>
  </div>;
}
