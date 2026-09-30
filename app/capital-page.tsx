'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Brush, CartesianGrid, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Coins, RefreshCw, Waves } from 'lucide-react';

type CapitalData = {
  updatedAt: string;
  partial: boolean;
  stablecoins: {
    supplyUsd: number | null;
    assets: Array<{ name: string; symbol: string; current: number; change24h: number; change7d: number }>;
    history: Array<{ timestamp: number; value: number | null }>;
  };
  dex: {
    volume24h: number | null;
    volume7d: number | null;
    venues: Array<{ name: string; category: string; volume24h: number; volume7d: number | null; share24h: number | null }>;
  };
  lending: Array<{ name: string; supplyUsd: number; borrowedUsd: number; utilization: number | null }>;
};
type Props = { language: 'en' | 'zh'; isDark: boolean };
type StablecoinTrend = {
  updatedAt: string | null;
  latestDataDay: string | null;
  history: Array<{ timestamp: number; value: number }>;
};

const money = (value: number | null | undefined, compact = true) => value == null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 2 : value < 100 ? 2 : 0,
}).format(value);

export default function CapitalPage({ language, isDark }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [data, setData] = useState<CapitalData | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stablecoinTrend, setStablecoinTrend] = useState<StablecoinTrend | null>(null);
  const [trendFailed, setTrendFailed] = useState(false);
  const [trendRefreshing, setTrendRefreshing] = useState(false);
  const [range, setRange] = useState<30 | 90 | 'all'>(30);
  const [chartWindow, setChartWindow] = useState({ startIndex: 0, endIndex: 0 });

  async function loadData(force = false) {
    setRefreshing(true);
    try {
      const response = await fetch('/api/capital', force ? { cache: 'no-store' } : undefined);
      if (!response.ok) throw new Error('Could not load capital data');
      setData(await response.json() as CapitalData);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadStablecoinTrend(force = false) {
    setTrendRefreshing(true);
    try {
      const response = await fetch('/api/capital/stablecoin-trend', force ? { cache: 'no-store' } : undefined);
      if (!response.ok) throw new Error('Could not load stablecoin trend');
      setStablecoinTrend(await response.json() as StablecoinTrend);
      setTrendFailed(false);
    } catch {
      setTrendFailed(true);
    } finally {
      setTrendRefreshing(false);
    }
  }

  useEffect(() => { void loadData(); }, []);
  useEffect(() => { void loadStablecoinTrend(); }, []);

  const history = useMemo(() => {
    const all = data?.stablecoins.history ?? [];
    if (range === 'all' || all.length <= range) return all;
    return all.slice(-range);
  }, [data, range]);

  useEffect(() => {
    if (!history.length) return;
    setChartWindow({ startIndex: 0, endIndex: history.length - 1 });
  }, [history.length]);

  const latestSupply = data?.stablecoins.supplyUsd;
  const supplyChange = data?.stablecoins.assets.reduce((sum, asset) => sum + asset.change24h, 0) ?? null;
  const lendingSupply = data?.lending.reduce((sum, market) => sum + market.supplyUsd, 0) ?? null;
  const lendingBorrowed = data?.lending.reduce((sum, market) => sum + market.borrowedUsd, 0) ?? null;
  const updatedLabel = data?.updatedAt ? new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(new Date(data.updatedAt)) : null;
  const trendHistory = stablecoinTrend?.history ?? [];
  const latestTrend = trendHistory.at(-1);
  const priorTrend = trendHistory.length > 7 ? trendHistory.at(-8) : trendHistory[0];
  const trendChange7d = latestTrend && priorTrend ? latestTrend.value - priorTrend.value : null;
  const trendChange7dPercent = trendChange7d != null && priorTrend?.value ? trendChange7d / priorTrend.value * 100 : null;
  const latestTrendDayLabel = stablecoinTrend?.latestDataDay ? new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC', timeZoneName: 'short',
  }).format(new Date(stablecoinTrend.latestDataDay)) : null;
  const trendUpdatedLabel = stablecoinTrend?.updatedAt ? new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(new Date(stablecoinTrend.updatedAt)) : null;

  return <div className="content capital-content">
    <div className="page-heading capital-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC CAPITAL MARKETS', 'ARC 资金与流动性')}<span className="eyebrow-line"/></div>
        <h1>{t('Capital', '资金')} <span>{t('& Liquidity', '与流动性')}</span></h1>
        <p className="subtitle">{t('Track stablecoin supply trends, DEX venues, and lending markets across Arc.', '追踪 Arc 稳定币存量趋势、DEX 场所与借贷市场。')}</p>
      </div>
      <button className="capital-refresh" onClick={() => { void loadData(true); void loadStablecoinTrend(true); }} disabled={refreshing || trendRefreshing}><RefreshCw size={14} className={refreshing || trendRefreshing ? 'spin' : ''}/>{t('Refresh data', '刷新数据')}</button>
    </div>

    <div className="capital-meta"><span className="capital-live"><i/>{t('LIVE DATA', '实时数据')}</span><span>{t('Updated', '更新时间')} {updatedLabel ?? '—'}</span>{(failed || data?.partial) && <span className="capital-warning">{t('Some data is temporarily unavailable', '部分数据暂时不可用')}</span>}</div>

    <div className="capital-metrics">
      <article className="capital-metric-card"><div className="capital-metric-label"><span>{t('STABLECOIN SUPPLY', '稳定币流通量')}</span><Coins size={15}/></div><strong>{money(latestSupply)}</strong><div className="capital-metric-foot"><span className={supplyChange != null && supplyChange < 0 ? 'negative' : 'positive'}>{supplyChange != null && (supplyChange >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)} {supplyChange == null ? '—' : money(Math.abs(supplyChange))}</span><span>{t('24h net change', '24 小时净变化')}</span></div></article>
      <article className="capital-metric-card"><div className="capital-metric-label"><span>{t('LENDING SUPPLIED', '借贷市场存款')}</span><Waves size={15}/></div><strong>{money(lendingSupply)}</strong><div className="capital-metric-foot"><span>{data?.lending.length ?? '—'} {t('tracked market', '个追踪市场')}</span></div></article>
      <article className="capital-metric-card"><div className="capital-metric-label"><span>{t('LENDING BORROWED', '借贷市场借款')}</span><ArrowUpRight size={15}/></div><strong>{money(lendingBorrowed)}</strong><div className="capital-metric-foot"><span>{t('Across tracked Arc markets', '已追踪 Arc 市场')}</span></div></article>
    </div>

    <section className="capital-panel capital-flow-panel">
      <div className="capital-panel-head"><div><div className="section-kicker">{t('ARC STABLECOIN SUPPLY', 'ARC 稳定币存量')}</div><h3>{t('Stablecoin supply trend on Arc', 'Arc 稳定币存量变化')}</h3></div><span className="capital-total">{t('FREE DATA', '免费数据')}</span></div>
      {!trendHistory.length ? <div className="capital-flow-state"><b>{t('Stablecoin history is unavailable', '暂时无法获取稳定币历史数据')}</b><span>{trendFailed ? t('The public data source could not return Arc history. Try again later.', '免费数据源暂时未能返回 Arc 历史数据，请稍后重试。') : t('Loading public stablecoin data…', '正在加载免费稳定币数据…')}</span></div> : <>
        <div className="capital-flow-period-label">{t('LATEST REPORTED UTC DAY', '最近报告的 UTC 日期')} · {latestTrendDayLabel ?? '—'} <span>{t('Refreshed', '更新时间')} {trendUpdatedLabel ?? '—'}</span></div>
        <div className="capital-flow-metrics capital-supply-trend-metrics">
          <article><span>{t('CURRENT REPORTED SUPPLY', '当前报告流通量')}</span><b>{money(latestTrend?.value ?? null)}</b></article>
          <article><span>{t('CHANGE · 7D', '近 7 日变化')}</span><b className={(trendChange7d ?? 0) < 0 ? 'negative' : 'positive'}>{trendChange7d == null ? '—' : `${trendChange7d < 0 ? '−' : '+'}${money(Math.abs(trendChange7d))}`}</b></article>
          <article><span>{t('CHANGE · 7D %', '近 7 日变化率')}</span><b className={(trendChange7dPercent ?? 0) < 0 ? 'negative' : 'positive'}>{trendChange7dPercent == null ? '—' : `${trendChange7dPercent < 0 ? '−' : '+'}${Math.abs(trendChange7dPercent).toFixed(2)}%`}</b></article>
        </div>
        <div className="capital-flow-chart">{trendHistory.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendHistory} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs><linearGradient id="capitalFlowSupplyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a6d65d" stopOpacity={0.2}/><stop offset="100%" stopColor="#a6d65d" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={isDark ? '#20252d' : '#e6e9e2'} vertical={false}/><XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 9 }} tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))}/><YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 9 }} tickFormatter={(value) => money(Number(value))}/><Tooltip contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} labelFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Number(value) * 1000))} formatter={(value) => [money(Number(value), false), t('USD-pegged stablecoin supply', '美元稳定币流通量')]}/><Area type="monotone" dataKey="value" stroke="#a6d65d" strokeWidth={2} fill="url(#capitalFlowSupplyFill)" isAnimationActive={false}/>
        </AreaChart></ResponsiveContainer> : <div className="capital-empty">{t('Not enough daily history to draw a trend yet.', '每日历史数据不足，暂时无法绘制趋势。')}</div>}</div>
        <div className="capital-footnote">{t('This chart tracks reported USD-pegged stablecoin supply on Arc. Supply changes are a capital trend indicator, not a direct measure of bridge inflows or outflows. Source: DeFiLlama public stablecoin API.', '此图追踪 Arc 上报告的美元稳定币流通量。存量变化可作为资金趋势参考，但不等同于跨链桥直接流入或流出。数据来源：DeFiLlama 免费稳定币 API。')} <a href="https://stablecoins.llama.fi/stablecoincharts/Arc" target="_blank" rel="noreferrer">DeFiLlama API</a></div>
      </>}
    </section>

    <section className="capital-panel capital-stable-panel">
      <div className="capital-panel-head"><div><div className="section-kicker">{t('STABLECOIN LIQUIDITY', '稳定币流动性')}</div><h3>{t('Circulating supply on Arc', 'Arc 稳定币流通趋势')}</h3></div><div className="capital-range">{([30, 90, 'all'] as const).map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item === 'all' ? t('All', '全部') : `${item}${t('D', '天')}`}</button>)}</div></div>
      <div className="capital-chart-wrap">{history.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs><linearGradient id="capitalStableFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c2f970" stopOpacity={0.22}/><stop offset="100%" stopColor="#c2f970" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid stroke={isDark ? '#20252d' : '#e6e9e2'} vertical={false}/><XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 10 }} tickFormatter={(value) => money(Number(value))}/>
        <Tooltip contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} labelFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Number(value) * 1000))} formatter={(value) => [money(Number(value), false), t('USD-pegged stablecoins', '美元稳定币')]}/>
        <Area type="monotone" dataKey="value" stroke="#a6d65d" strokeWidth={2} fill="url(#capitalStableFill)" isAnimationActive={false}/>
        {history.length > 1 && <Brush dataKey="timestamp" height={38} travellerWidth={14} gap={1} startIndex={chartWindow.startIndex} endIndex={chartWindow.endIndex} onChange={(window) => { if (window.startIndex != null && window.endIndex != null) setChartWindow({ startIndex: window.startIndex, endIndex: window.endIndex }); }} alwaysShowText tickFormatter={(value) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value * 1000))} fill={isDark ? '#15191e' : '#f6f8f3'} stroke={isDark ? '#303640' : '#dce2d6'}/>}
      </AreaChart></ResponsiveContainer> : <div className="capital-empty">{failed ? t('Stablecoin history is unavailable.', '稳定币历史数据暂不可用。') : t('Loading stablecoin data…', '正在加载稳定币数据…')}</div>}</div>
      <div className="capital-footnote">{t('USD-pegged stablecoins only. Daily values follow UTC and the latest day may be incomplete.', '仅统计美元锚定稳定币。按 UTC 自然日统计，最新一天可能尚未完整。')}</div>
      <div className="capital-assets">{data?.stablecoins.assets.map((asset) => <div className="capital-asset-row" key={asset.symbol}><span><i/>{asset.name} <small>{asset.symbol}</small></span><b>{money(asset.current)}</b></div>)}{data && data.stablecoins.assets.length === 0 && <div className="capital-empty-inline">{t('No stablecoins are currently reported for Arc.', '当前没有可用的 Arc 稳定币数据。')}</div>}</div>
    </section>

    <div className="capital-lower-grid">
      <section className="capital-panel">
        <div className="capital-panel-head"><div><div className="section-kicker">{t('DEX MARKET SHARE', 'DEX 市场结构')}</div><h3>{t('Trading volume by venue · 24h', '各交易场所成交量 · 24 小时')}</h3></div><span className="capital-total">{money(data?.dex.volume24h)} {t('tracked', '已归集')}</span></div>
        <div className="capital-venue-chart">{data?.dex.venues.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.dex.venues} layout="vertical" margin={{ top: 4, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={isDark ? '#20252d' : '#e6e9e2'} horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#6f7783' : '#798179', fontSize: 9 }} tickFormatter={(value) => money(Number(value))}/><YAxis type="category" dataKey="name" width={98} axisLine={false} tickLine={false} tick={{ fill: isDark ? '#b3bac3' : '#596252', fontSize: 10 }}/><Tooltip cursor={{ fill: isDark ? '#ffffff0a' : '#00000008' }} contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 8, color: isDark ? '#eef0eb' : '#20251e', fontSize: 11 }} formatter={(value, _name, item) => [money(Number(value), false), `${item.payload.share24h?.toFixed(1) ?? '—'}% · ${t('of tracked volume', '已归集成交占比')}`]}/><Bar dataKey="volume24h" fill="#8bab55" radius={[0, 4, 4, 0]} barSize={14}/>
        </BarChart></ResponsiveContainer> : <div className="capital-empty">{failed ? t('DEX venue data is unavailable.', 'DEX 场所数据暂不可用。') : t('Loading venue activity…', '正在加载场所数据…')}</div>}</div>
        <div className="capital-venue-list">{data?.dex.venues.slice(0, 4).map((venue, index) => <div key={venue.name}><span className="capital-venue-rank">{String(index + 1).padStart(2, '0')}</span><b>{venue.name}</b><span>{venue.share24h?.toFixed(1) ?? '—'}%</span><strong>{money(venue.volume24h)}</strong></div>)}</div>
        <div className="capital-footnote">{t('Venue shares are calculated against the volume attributed by the data provider; coverage may differ by protocol.', '场所占比以数据源可归集的成交量为分母，不同协议的覆盖范围可能不同。')}</div>
      </section>

      <section className="capital-panel capital-lending-panel">
        <div className="capital-panel-head"><div><div className="section-kicker">{t('LENDING MARKETS', '借贷市场')}</div><h3>{t('Supply and borrowing', '存款与借款')}</h3></div></div>
        {data?.lending.length ? <div className="capital-lending-list">{data.lending.map((market) => <article key={market.name}>
          <div className="capital-lending-title"><span className="capital-lending-icon"><Waves size={15}/></span><b>{market.name}</b><span className="capital-market-tag">{t('ARC', 'ARC')}</span></div>
          <div className="capital-lending-values"><div><small>{t('SUPPLIED', '存款')}</small><b>{money(market.supplyUsd)}</b></div><div><small>{t('BORROWED', '借款')}</small><b>{money(market.borrowedUsd)}</b></div></div>
          <div className="capital-utilization"><span>{t('Utilization', '资金利用率')}</span><b>{market.utilization == null ? '—' : `${market.utilization.toFixed(1)}%`}</b><div><i style={{ width: `${Math.min(100, Math.max(0, market.utilization ?? 0))}%` }}/></div></div>
        </article>)}</div> : <div className="capital-lending-empty">{data ? t('No Arc lending market data is available yet.', '暂时没有可用的 Arc 借贷市场数据。') : t('Loading lending markets…', '正在加载借贷市场…')}</div>}
        <div className="capital-footnote">{t('Utilization is estimated as borrowed value divided by supplied value; protocol definitions can vary.', '资金利用率按借款金额除以存款金额估算，具体口径可能因协议而异。')}</div>
      </section>
    </div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span></footer>
  </div>;
}
