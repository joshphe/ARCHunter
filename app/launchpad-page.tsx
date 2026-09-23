'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Flame, Radio, RefreshCw, Trophy } from 'lucide-react';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

type Launchpad = {
  slug: string; name: string; logo: string; color: string; available: boolean;
  fees24h: number | null; fees7d: number | null; fees30d: number | null; feesAllTime: number | null;
  change24h: number | null; history: [number, number][]; methodology: string | null; sourceUrl: string;
};
type ApiResponse = { updatedAt: string; launchpads: Launchpad[] };
type Props = { language: 'en' | 'zh'; isDark: boolean };

const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 100 ? 2 : 0 }).format(value);
const pct = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

export default function LaunchpadPage({ language, isDark }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [data, setData] = useState<ApiResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [rangePreset, setRangePreset] = useState<number | null>(7);
  const [chartWindow, setChartWindow] = useState({ startIndex: 0, endIndex: 0 });
  const [hiddenLaunchpads, setHiddenLaunchpads] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    setRefreshing(true);
    try {
      const response = await fetch('/api/launchpads', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load launchpad fees');
      setData(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const launchpads = data?.launchpads ?? [];
  const available = launchpads.filter((item) => item.available);
  const total24h = available.reduce((total, item) => total + (item.fees24h ?? 0), 0);
  const total7d = available.reduce((total, item) => total + (item.fees7d ?? 0), 0);
  const total30d = available.reduce((total, item) => total + (item.fees30d ?? 0), 0);
  const leader = [...available].sort((a, b) => (b.fees24h ?? 0) - (a.fees24h ?? 0))[0];

  const chartData = useMemo(() => {
    const byDay = new Map<number, Record<string, number>>([
      [ARC_LAUNCH_START_TIMESTAMP, { timestamp: ARC_LAUNCH_START_TIMESTAMP }],
    ]);
    for (const launchpad of launchpads) {
      for (const [timestamp, amount] of launchpad.history) {
        const day = Math.floor(timestamp / 86400) * 86400;
        if (day < ARC_LAUNCH_START_TIMESTAMP) continue;
        byDay.set(day, { ...(byDay.get(day) ?? { timestamp: day }), [launchpad.slug]: amount });
      }
    }
    return [...byDay.values()].sort((a, b) => a.timestamp - b.timestamp).map((day) => ({
      ...day,
      total: launchpads.reduce((sum, item) => sum + (hiddenLaunchpads.includes(item.slug) ? 0 : day[item.slug] ?? 0), 0),
    }));
  }, [launchpads, hiddenLaunchpads]);

  useEffect(() => {
    if (chartData.length === 0) return;
    const endIndex = chartData.length - 1;
    setChartWindow({ startIndex: Math.max(0, endIndex - 6), endIndex });
    setRangePreset(7);
  }, [chartData.length]);

  function selectRange(days: number) {
    const endIndex = chartData.length - 1;
    setChartWindow({ startIndex: Math.max(0, endIndex - days + 1), endIndex: Math.max(0, endIndex) });
    setRangePreset(days);
  }

  function handleBrushChange(window: { startIndex?: number; endIndex?: number }) {
    if (window.startIndex === undefined || window.endIndex === undefined) return;
    setChartWindow({ startIndex: window.startIndex, endIndex: window.endIndex });
    setRangePreset(null);
  }

  const updatedLabel = data?.updatedAt
    ? new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(data.updatedAt))
    : null;

  return <div className="content launchpad-content">
    <div className="page-heading launchpad-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/> {t('ARC LAUNCHPAD TRACKER', 'ARC 发射台监测')} <span className="eyebrow-line"/></div>
        <h1>{t('Launchpad', '发射台')} <span>{t('Fees', '费用')}</span></h1>
        <p className="subtitle">{t('Compare launchpad fees across the Arc ecosystem.', '对比 Arc 生态各发射台的费用表现。')}</p>
      </div>
      <button className="launchpad-refresh" onClick={() => void loadData()} disabled={refreshing}>
        <RefreshCw size={14} className={refreshing ? 'spin' : ''}/>{t('Refresh data', '刷新数据')}
      </button>
    </div>

    <div className="launchpad-sourcebar">
      <div className="launchpad-live"><span className="pulse-dot"/>{t('LIVE FROM DEFILLAMA', 'DEFILLAMA 实时数据')}</div>
      <span className="launchpad-sourcecopy">{t('Arc · Fees in USD', 'Arc · 美元计价费用')}</span>
      {updatedLabel && <span className="launchpad-updated">{t('Updated', '更新时间')} {updatedLabel}</span>}
      {failed && <span className="launchpad-warning">{t('Some data could not be loaded', '部分数据暂时无法加载')}</span>}
    </div>

    <div className="launchpad-stats">
      <article className="launchpad-stat-card"><div className="launchpad-stat-label"><span>{t('TOTAL FEES · 24H', '总费用 · 24 小时')}</span><Flame size={15}/></div><div className="launchpad-stat-value">{money(data ? total24h : null)}</div><div className="launchpad-stat-note">{t('Across tracked launchpads', '已追踪发射台合计')}</div></article>
      <article className="launchpad-stat-card"><div className="launchpad-stat-label"><span>{t('TOTAL FEES · 7D', '总费用 · 7 天')}</span><Radio size={15}/></div><div className="launchpad-stat-value">{money(data ? total7d : null)}</div><div className="launchpad-stat-note">{t('Rolling 7-day fees', '滚动 7 天费用')}</div></article>
      <article className="launchpad-stat-card"><div className="launchpad-stat-label"><span>{t('TOTAL FEES · 30D', '总费用 · 30 天')}</span><ArrowUpRight size={15}/></div><div className="launchpad-stat-value">{money(data ? total30d : null)}</div><div className="launchpad-stat-note">{t('Rolling 30-day fees', '滚动 30 天费用')}</div></article>
      <article className="launchpad-stat-card leader-stat"><div className="launchpad-stat-label"><span>{t('24H LEADER', '24 小时领先')}</span><Trophy size={15}/></div><div className="launchpad-stat-value leader-value">{leader?.name ?? '—'}</div><div className="launchpad-stat-note">{leader ? `${money(leader.fees24h)} ${t('in fees', '费用')}` : t('Waiting for data', '等待数据')}</div></article>
    </div>

    <section className="launchpad-chart-card">
      <div className="launchpad-panel-head"><div><div className="section-kicker">{t('DAILY FEE HISTORY', '每日费用记录')}</div><h3>{t('Fees by launchpad', '各发射台费用')}</h3></div><div className="range-switch">{[7, 30].map((days) => <button key={days} className={rangePreset === days ? 'on' : ''} onClick={() => selectRange(days)}>{days}{t('D', '天')}</button>)}</div></div>
      <div className="launchpad-chart-wrap">
        {chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 7, left: -20, bottom: 0 }}>
          <defs>{launchpads.map((item) => <linearGradient key={item.slug} id={`fill-${item.slug}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity={0.2}/><stop offset="100%" stopColor={item.color} stopOpacity={0}/></linearGradient>)}</defs>
          <CartesianGrid stroke={isDark ? '#20252d' : '#e6e9e2'} vertical={false}/>
          <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))} dy={8}/>
          <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}/>
          <Tooltip contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} labelFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Number(value) * 1000))} formatter={(value, name) => [money(Number(value)), launchpads.find((item) => item.slug === name)?.name ?? name]}/>
          {launchpads.filter((item) => !hiddenLaunchpads.includes(item.slug)).map((item) => <Area key={item.slug} type="monotone" dataKey={item.slug} name={item.slug} stroke={item.color} strokeWidth={1.8} fill={`url(#fill-${item.slug})`} connectNulls/>) }
          {chartData.length > 1 && <Brush
            dataKey="timestamp"
            height={44}
            travellerWidth={16}
            gap={1}
            startIndex={chartWindow.startIndex}
            endIndex={chartWindow.endIndex}
            onChange={handleBrushChange}
            alwaysShowText
            tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))}
            fill={isDark ? '#15191e' : '#f6f8f3'}
            stroke={isDark ? '#303640' : '#dce2d6'}
            traveller={(props: { x: number; y: number; width: number; height: number }) => {
              const centerX = props.x + props.width / 2;
              const gripY = props.y + props.height / 2;
              return <g className="launchpad-brush-handle">
                <rect x={centerX - 6} y={props.y + 6} width={12} height={props.height - 12} rx={6}/>
                <path d={`M ${centerX - 2} ${gripY - 4} v 8 M ${centerX + 2} ${gripY - 4} v 8`}/>
              </g>;
            }}
          >
            <AreaChart>
              <Area dataKey="total" type="monotone" stroke={isDark ? '#aab7cc' : '#6c7e99'} strokeWidth={1.2} fill={isDark ? '#aab7cc' : '#6c7e99'} fillOpacity={0.18} isAnimationActive={false}/>
            </AreaChart>
          </Brush>}
        </AreaChart></ResponsiveContainer> : <div className="launchpad-chart-empty">{failed ? t('Unable to load fee history.', '费用历史暂时无法加载。') : t('Loading fee history…', '正在加载费用记录…')}</div>}
      </div>
      <div className="launchpad-legend" aria-label={t('Toggle launchpad chart series', '切换发射台数据线')}>
        {launchpads.map((item) => {
          const hidden = hiddenLaunchpads.includes(item.slug);
          return <button type="button" key={item.slug} className={`launchpad-legend-item ${hidden ? 'is-hidden' : ''}`} aria-pressed={!hidden} onClick={() => setHiddenLaunchpads((current) => hidden ? current.filter((slug) => slug !== item.slug) : [...current, item.slug])}>
            <i style={{ background: hidden ? 'transparent' : item.color, borderColor: item.color }}/>{item.name}
          </button>;
        })}
      </div>
    </section>

    <section className="launchpad-table-card">
      <div className="launchpad-panel-head"><div><div className="section-kicker">{t('PROTOCOL BREAKDOWN', '协议明细')}</div><h3>{t('Launchpad leaderboard', '发射台排行榜')}</h3></div><a className="defillama-link" href="https://defillama.com/chain/arc" target="_blank" rel="noreferrer">{t('View Arc on DefiLlama', '在 DefiLlama 查看 Arc')} <ExternalLink size={13}/></a></div>
      <div className="launchpad-table-scroll"><table className="launchpad-table"><thead><tr><th>#</th><th>{t('LAUNCHPAD', '发射台')}</th><th>{t('FEES · 24H', '费用 · 24 小时')}</th><th>{t('FEES · 7D', '费用 · 7 天')}</th><th>{t('FEES · 30D', '费用 · 30 天')}</th><th>{t('24H CHANGE', '24 小时变化')}</th><th>{t('SOURCE', '来源')}</th></tr></thead><tbody>
        {[...launchpads].sort((a, b) => (b.fees24h ?? -1) - (a.fees24h ?? -1)).map((item, index) => <tr key={item.slug}>
          <td className="launchpad-rank">{item.available ? String(index + 1).padStart(2, '0') : '—'}</td>
          <td><div className="launchpad-project"><span className="launchpad-avatar" style={{ '--launchpad-color': item.color } as React.CSSProperties}>{item.logo}</span><span><b>{item.name}</b><small>{item.available ? t('Tracked on Arc', 'Arc 链上追踪中') : t('Data unavailable', '暂不可用')}</small></span></div></td>
          <td className="launchpad-money">{money(item.fees24h)}</td><td className="launchpad-money">{money(item.fees7d)}</td><td className="launchpad-money">{money(item.fees30d)}</td>
          <td><span className={item.change24h === null ? 'launchpad-change unavailable' : item.change24h >= 0 ? 'launchpad-change positive' : 'launchpad-change negative'}>{item.change24h !== null && (item.change24h >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)} {pct(item.change24h)}</span></td>
          <td><a className="launchpad-row-source" href={item.sourceUrl} target="_blank" rel="noreferrer">{t('DefiLlama', 'DefiLlama')} <ExternalLink size={11}/></a></td>
        </tr>)}
        {!data && <tr><td colSpan={7} className="launchpad-loading">{t('Loading launchpad fees…', '正在加载发射台费用…')}</td></tr>}
      </tbody></table></div>
      <div className="launchpad-methodology"><span>{t('Fee methodology varies by protocol; figures follow each protocol’s DefiLlama adapter.', '各协议费用口径有所不同，数据采用 DefiLlama 对应协议适配器的统计方式。')}</span><a href="https://defillama.com/protocol/argus-world" target="_blank" rel="noreferrer">{t('About fee methodology', '了解费用口径')} <ExternalLink size={11}/></a></div>
    </section>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span>{t('DATA SOURCE: DEFILLAMA', '数据来源：DEFILLAMA')} <i>·</i> <a href="https://defillama.com/chain/arc" target="_blank" rel="noreferrer">DefiLlama</a></span></footer>
  </div>;
}
