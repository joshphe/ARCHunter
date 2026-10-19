'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CircleHelp, Expand, Minimize, Pause, Play, Radio, RefreshCw, X } from 'lucide-react';
import { DEMO_FLOWS, FLOW_CHAINS, type CapitalFlowSnapshot, type ChainFlow, type FlowDirection, type FlowWindow } from '@/lib/capital-flow';

import dynamic from 'next/dynamic';
import CapitalFlowRecords from './capital-flow-records';
import { CHAIN_LOGOS } from '@/lib/chain-logos';
import { layoutFlowNetwork } from '@/lib/capital-flow-layout';
const CapitalFlowTrend = dynamic(()=>import('./capital-flow-trend'),{loading:()=> <div className="flow-trend-loading" role="status">…</div>});

type Props = { language: 'zh' | 'en' };
const usd = (value: number | null, signed = false) => value === null ? '—' : `${signed && value > 0 ? '+' : value < 0 ? '−' : ''}${new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(Math.abs(value))}`;
const volume = (chain: ChainFlow, direction: FlowDirection) => direction === 'in' ? chain.inflow : direction === 'out' ? chain.outflow : chain.inflow + chain.outflow;

export default function CapitalFlowNetwork({ language }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [snapshot, setSnapshot] = useState<CapitalFlowSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [windowSize, setWindowSize] = useState<FlowWindow>('24h');
  const [direction, setDirection] = useState<FlowDirection>('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode,setMode]=useState<'network'|'trend'>('network');
  const [fullscreen,setFullscreen]=useState(false);
  const section = useRef<HTMLElement>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 28000);
    let current = true;
    setLoading(true); setFailed(false);
    fetch(`/api/capital/flows?window=${windowSize}${refreshKey ? `&refresh=${refreshKey}` : ''}`, {signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error('Unavailable'); return await response.json() as CapitalFlowSnapshot; })
      .then(data => { if(current) {setSnapshot(data);setFailed(data.status === 'unavailable');} })
      .catch(() => { if(current) setFailed(true); })
      .finally(() => {window.clearTimeout(timeout);if(current)setLoading(false);});
    return () => {current=false;controller.abort();window.clearTimeout(timeout);};
  }, [windowSize, refreshKey]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => {setCanAnimate(visible && !document.hidden && !media.matches);setPageVisible(!document.hidden);};
    const observer = new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;update();}, {threshold:.1});
    if(section.current)observer.observe(section.current);
    document.addEventListener('visibilitychange',update);media.addEventListener('change',update);
    return () => {observer.disconnect();document.removeEventListener('visibilitychange',update);media.removeEventListener('change',update);};
  }, []);

  const current = snapshot?.window === windowSize ? snapshot : null;
  const usable = !demo && current && current.status !== 'unavailable';
  const chains = useMemo(() => demo ? DEMO_FLOWS : usable ? current.chains.map(chain=>({...chain,...FLOW_CHAINS.find(meta=>meta.domain===chain.domain)})) : [], [demo, usable, current]);
  const totals = useMemo(() => chains.reduce((sum,c) => ({in:sum.in+c.inflow,out:sum.out+c.outflow,transfers:sum.transfers+c.transfers}), {in:0,out:0,transfers:0}), [chains]);
  const ranked = useMemo(() => [...chains].sort((a,b) => volume(b,direction)-volume(a,direction)), [chains,direction]);
  const displayed = useMemo(() => {
    const source = chains.length ? chains : FLOW_CHAINS.slice(0,12).map(chain=>({...chain,inflow:0,outflow:0,transfers:0}));
    return layoutFlowNetwork(source, selected);
  }, [chains,selected]);
  const focused = chains.find(c=>c.domain===(hovered ?? selected));
  const active = chains.find(c=>c.domain===selected);
  const peak = Math.max(1,...chains.map(c=>c.inflow+c.outflow));
  const realPartial = usable && (current.status==='partial' || failed);
  const animate = canAnimate && !paused && chains.length > 0;
  const hasData = Boolean(demo || usable);
  const net = hasData ? totals.in-totals.out : null;
  const dateLabel = usable ? new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(current.coverageTo??current.checkedAt)) : null;
  const coverageDate = (value: string) => new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value));
  const fillingHistory = Boolean(current && (current.collecting || (current.status==='partial' && !current.stale)));
  useEffect(()=>{
    if(loading||demo||!pageVisible)return;
    const timer=window.setTimeout(()=>setRefreshKey(value=>value+1),!current||current.status!=='complete'||current.stale||current.collecting?15000:300000);
    return()=>window.clearTimeout(timer);
  },[loading,demo,pageVisible,current,refreshKey]);
  useEffect(()=>{
    const update=()=>setFullscreen(document.fullscreenElement===section.current);
    document.addEventListener('fullscreenchange',update);
    return()=>document.removeEventListener('fullscreenchange',update);
  },[]);
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await section.current?.requestFullscreen();}catch{setFullscreen(false);}};

  return <section className={`capital-flow-network${demo?' is-demo':''}`} ref={section} aria-label={t('Arc cross-chain capital flow','ARC 跨链资金流向')}>
    <header className="flow-head">
      <div><div className="flow-eyebrow"><span/> ARC CAPITAL RADAR</div><h2>{t('Follow the','看见资金的')} <em>{t('flow.','方向。')}</em></h2><p>{t('Verified CCTP USDC flows into and out of Arc.','追踪已核验的 CCTP USDC 跨链方向。')}</p></div>
      <div className="flow-controls"><div className="flow-mode" aria-label={t('Visualization','图表视图')}>{(['network','trend'] as const).map(view=><button type="button" key={view} aria-pressed={mode===view} className={mode===view?'on':''} onClick={()=>setMode(view)}>{view==='network'?t('Network','动效图'):t('Trend','趋势图')}</button>)}</div><div className="flow-window" aria-label={t('Time window','时间窗口')}>{(['24h','7d'] as const).map(w=><button key={w} className={windowSize===w?'on':''} aria-pressed={windowSize===w} disabled={demo&&w!=='24h'} onClick={()=>{setWindowSize(w);setRefreshKey(0);setSelected(null);}}>{w==='24h'?'24H':'7D'}</button>)}</div><button className="flow-icon-button" type="button" onClick={()=>setPaused(value=>!value)} aria-pressed={paused} aria-label={paused?t('Play animation','播放动效'):t('Pause animation','暂停动效')}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button className="flow-icon-button" type="button" disabled={loading||demo} onClick={()=>{setRefreshKey(value=>value+1);}} aria-label={t('Refresh flows','刷新资金流')}><RefreshCw size={15} className={loading?'spin':''}/></button><button className="flow-icon-button flow-fullscreen-button" type="button" onClick={toggleFullscreen} aria-label={fullscreen?t('Exit fullscreen','退出全屏'):t('Fullscreen','全屏查看')}>{fullscreen?<Minimize size={15}/>:<Expand size={15}/>}</button></div>
    </header>
    <div className="flow-status-line"><span className={`flow-status${realPartial?' is-partial':!demo&&!loading&&!usable?' is-offline':''}`}><Radio size={12}/>{demo?t('DEMO · NOT ON-CHAIN DATA','动效演示 · 非真实链上数据'):loading?t('READING SAVED DATA','正在读取已存记录'):usable?realPartial?t('PARTIAL COVERAGE','部分覆盖'):t('CCTP · VERIFIED WINDOW','CCTP · 已核验时间窗口'):t('DATA UNAVAILABLE','数据暂不可用')}</span><span>{demo?t('Illustrative values only · 24H','仅用于效果预览 · 24 小时'):t('USDC / CCTP','USDC / CCTP')}{dateLabel?` · ${t('As of','数据截至')} ${dateLabel} UTC`:''}{usable&&current.stale?` · ${t('Stored data · updating','历史快照 · 正在更新')}`:''}{current?.collecting&&!demo?` · ${t('Background update','后台采集中')}`:''}{failed&&usable?` · ${t('Refresh unavailable · previous snapshot retained','刷新暂不可用，保留上次快照')}`:''}</span>{demo&&<button className="flow-exit-demo" onClick={()=>setDemo(false)}>{t('Exit demo','退出演示')} <X size={12}/></button>}</div>
    {realPartial&&!demo&&current.coverageFrom&&current.coverageTo&&<div className="flow-partial-note"><span>{t('Observed','实际已覆盖')} {coverageDate(current.coverageFrom)} → {coverageDate(current.coverageTo)} UTC · {current.coveragePercent?.toFixed(1)}%</span><span>{current.stale?t('A stored snapshot is shown. New events are collected in the background.','正在显示已保存快照，后台增量更新链上记录。'):fillingHistory?t('History is saved continuously; this page only reads saved results.','历史记录持续保存，页面直接读取已存结果。'):t('Only verified records are included.','金额仅包含已核验记录。')}</span><div className="flow-progress" role="progressbar" aria-label={t('Window coverage','时间窗口覆盖进度')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.coveragePercent??0}><i style={{width:`${Math.max(0,Math.min(100,current.coveragePercent??0))}%`}}/></div></div>}

    <div className={`flow-layout${mode==='trend'?' flow-layout-trend':''}`}>
      {mode==='trend'?<div className="flow-universe">{usable&&!demo?<CapitalFlowTrend snapshot={current} domain={selected} direction={direction} zh={zh}/>:<div className="flow-trend-loading">{t('Trend is available after verified history is saved.','已核验历史保存后即可展示资金趋势。')}</div>}</div>:<div className="flow-universe">
        <div className="flow-orbital-label">{t('CROSS-CHAIN LIQUIDITY','跨链资金网络')}<span>{t('ARC AS THE CENTER OF GRAVITY','以 ARC 为资金坐标原点')}</span></div>
        <svg className="flow-canvas" viewBox="0 0 760 680" role="group" aria-label={t('Select a chain to inspect observed transfers','选择一条链，查看已观测的资金流')}>
          <defs>
            <radialGradient id={`${uid}-aura`}><stop stopColor="#3fdfb6" stopOpacity=".22"/><stop offset="1" stopColor="#3fdfb6" stopOpacity="0"/></radialGradient>
            <radialGradient id={`${uid}-core`} cx="35%" cy="25%"><stop stopColor="#adf8d8"/><stop offset=".5" stopColor="#4ce6bb"/><stop offset="1" stopColor="#159e8a"/></radialGradient>
            <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" className="flow-grid-dot"/></pattern>
          </defs>
          <rect width="760" height="680" fill={`url(#${uid}-grid)`}/>
          <circle cx="380" cy="340" r="235" fill={`url(#${uid}-aura)`}/>
          {[100,154,218,280].map((radius,i)=><circle key={radius} cx="380" cy="340" r={radius} className={`flow-orbit orbit-${i}`}/>)}
          <path d="M380 60V620M100 340H660" className="flow-crosshair"/>
          {displayed.map(({chain,x,y,labelX,labelAnchor},i)=>{
            const dx=x-380,dy=y-340;
            const curve=(dx>0?1:-1)*28;
            const incoming=`M${x} ${y} Q${380+dx*.42+curve} ${340+dy*.42-curve} 380 340`;
            const outgoing=`M380 340 Q${380+dx*.55-curve} ${340+dy*.55+curve} ${x} ${y}`;
            const highlighted=(hovered ?? selected)===null||(hovered ?? selected)===chain.domain;
            const routeVolume=chain.inflow+chain.outflow;
            const radius=hasData?16+Math.sqrt(routeVolume/peak)*9:17;
            return <g key={chain.domain} className={`flow-route${highlighted?'':' is-dimmed'}${selected===chain.domain?' is-selected':''}`}>
              <path d={incoming} className="flow-guide-path"/>
              {(['in','out'] as const).map(dir=>{
                const amount=dir==='in'?chain.inflow:chain.outflow;
                if(!hasData||amount<=0||(direction!=='all'&&direction!==dir))return null;
                const path=dir==='in'?incoming:outgoing;
                const particles=2+Math.round(Math.sqrt(amount/peak)*6);
                return <g key={dir} className={`flow-channel flow-channel-${dir}`}><path d={path} className="flow-channel-path" style={{strokeWidth:1+Math.sqrt(amount/peak)*3}}/>{animate&&Array.from({length:particles},(_,n)=><circle key={n} r={n===0?3.5:2} className="flow-particle"><animateMotion dur={`${4+i*.16}s`} begin={`${-n*(4+i*.16)/particles}s`} repeatCount="indefinite" path={path}/></circle>)}</g>;
              })}
              <g role="button" tabIndex={0} aria-pressed={selected===chain.domain} aria-label={`${chain.name}: ${t('inflow','流入')} ${hasData?usd(chain.inflow):'—'}, ${t('outflow','流出')} ${hasData?usd(chain.outflow):'—'}`} className="flow-chain-node" onMouseEnter={()=>setHovered(chain.domain)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(chain.domain)} onBlur={()=>setHovered(null)} onClick={()=>setSelected(value=>value===chain.domain?null:chain.domain)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(value=>value===chain.domain?null:chain.domain);}}}>
                <circle cx={x} cy={y} r={radius+5} className="flow-chain-halo" style={{stroke:chain.color}}/>
                <circle cx={x} cy={y} r={radius} className="flow-chain-disc"/>
                {CHAIN_LOGOS[chain.domain]?<><defs><clipPath id={`${uid}-chain-${chain.domain}`}><circle cx={x} cy={y} r={radius-3}/></clipPath></defs><image href={CHAIN_LOGOS[chain.domain]} x={x-radius+3} y={y-radius+3} width={(radius-3)*2} height={(radius-3)*2} clipPath={`url(#${uid}-chain-${chain.domain})`} aria-hidden="true"/></>:<text x={x} y={y+4} textAnchor="middle" style={{fill:chain.color}} className="flow-chain-symbol">{chain.short}</text>}
                <text x={labelX} y={y-4} textAnchor={labelAnchor} className="flow-chain-name">{chain.name}</text>
                <text x={labelX} y={y+16} textAnchor={labelAnchor} className={`flow-chain-value${chain.inflow-chain.outflow<0?' is-negative':''}`}>{hasData?usd(chain.inflow-chain.outflow,true):'—'}</text>
                <title>{chain.name} · {t('Net inflow','净流入')} {hasData?usd(chain.inflow-chain.outflow,true):'—'}</title>
              </g>
            </g>;
          })}
          <circle cx="380" cy="340" r="80" className="flow-core-outline"/>
          <circle cx="380" cy="340" r="65" fill={`url(#${uid}-core)`}/>
          <text x="380" y="349" textAnchor="middle" className="flow-core-name">ARC</text>
          <g className="flow-center-summary"><rect x="285" y="430" width="190" height="69" rx="18"/><text x="380" y="453" textAnchor="middle" className="flow-core-caption">{focused?focused.name:t('OBSERVED VOLUME','已观测流量')}</text><text x="380" y="478" textAnchor="middle" className="flow-core-total">{hasData?usd(focused?focused.inflow+focused.outflow:totals.in+totals.out):'—'}</text></g>
        </svg>
        {chains.length>0&&<div className="flow-mobile-chains" aria-label={t('Choose a chain','选择区块链')}>{chains.map(chain=><button type="button" key={chain.domain} className={selected===chain.domain?'on':''} aria-pressed={selected===chain.domain} onClick={()=>setSelected(value=>value===chain.domain?null:chain.domain)}><i style={{background:chain.color}}/>{chain.name}</button>)}</div>}
        <div className="flow-map-legend"><span><i className="flow-in-key"/>{t('Into Arc','流入 ARC')}</span><span><i className="flow-out-key"/>{t('Out of Arc','流出 ARC')}</span><span className="flow-legend-hint">{t('Particles indicate direction, not individual transactions','光点表示方向，不代表逐笔交易')}</span></div>
        {!hasData&&<div className="flow-empty-callout"><b>{loading?t('Finding the signal…','正在捕捉资金信号…'):t('Waiting for saved flow data','等待后台保存资金流记录')}</b><span>{t('This page reads saved data; collection continues on the server.','页面读取已保存数据，链上采集在后台进行。')}</span><button type="button" onClick={()=>{setDemo(true);setWindowSize('24h');setSelected(null);}}><Play size={13}/>{t('Preview the animation','查看动效示例')}</button></div>}
      </div>}
      <aside className="flow-inspector" aria-label={t('Flow details','资金流详情')}>
        <div className="flow-inspector-kicker">{t('THE BIG PICTURE','资金全景')}<span>USDC</span></div>
        <div className="flow-net"><span>{realPartial?t('Observed inflow − outflow','已观测流入 − 流出'):t('CCTP USDC NET INFLOW','CCTP USDC 净流入')}</span><strong className={(net??0)<0?'is-negative':''}>{usd(net,true)}</strong><small>{demo?t('Illustrative data','演示数据'):realPartial?t('Coverage incomplete · not a whole-chain net flow','覆盖不完整 · 非全链净流量'):t('Across observed CCTP routes','已覆盖的 CCTP 链路')}</small></div>
        <div className="flow-direction-totals"><div><span><ArrowDownLeft size={13}/>{t('Inflow','流入')}</span><b>{hasData?usd(totals.in):'—'}</b></div><div><span><ArrowUpRight size={13}/>{t('Outflow','流出')}</span><b>{hasData?usd(totals.out):'—'}</b></div></div>
        <div className="flow-direction-switch" aria-label={t('Flow direction','资金方向')}>{(['all','in','out'] as const).map(dir=><button type="button" key={dir} className={direction===dir?'on':''} aria-pressed={direction===dir} onClick={()=>setDirection(dir)}>{dir==='all'?t('All flows','全部'):dir==='in'?t('Inflow','流入'):t('Outflow','流出')}</button>)}</div>
        {chains.length>0&&<select className="flow-chain-picker" aria-label={t('Inspect any observed chain','查看任一已观测链')} value={selected??''} onChange={event=>{setSelected(event.target.value===''?null:Number(event.target.value));setHovered(null);}}><option value="">{t('All routes','全部链路')} · {chains.length}</option>{[...chains].sort((a,b)=>a.name.localeCompare(b.name)).map(chain=><option key={chain.domain} value={chain.domain}>{chain.name} ↔ ARC</option>)}</select>}
        {active?<div className="flow-selected-route"><div><b>{active.name} <span>↔ ARC</span></b><button className="flow-icon-button" onClick={()=>setSelected(null)} aria-label={t('Clear selection','清除选择')}><X size={13}/></button></div><dl><div><dt>{t('Inflow','流入')}</dt><dd>{usd(active.inflow)}</dd></div><div><dt>{t('Outflow','流出')}</dt><dd>{usd(active.outflow)}</dd></div><div><dt>{t('Net inflow','净流入')}</dt><dd className={active.inflow<active.outflow?'is-negative':''}>{usd(active.inflow-active.outflow,true)}</dd></div><div><dt>{t('Observed transfers','已观测笔数')}</dt><dd>{active.transfers}</dd></div></dl><button className="flow-view-link" type="button" onClick={()=>setMode('trend')}>{t('View route trend →','查看该链资金趋势 →')}</button></div>:<div className="flow-ranking"><div className="flow-ranking-label">{t('TOP CORRIDORS','主要资金通道')}<span>{t('VOLUME','流量')}</span></div>{ranked.slice(0,5).map((chain,i)=><button type="button" key={chain.domain} onClick={()=>setSelected(chain.domain)} onMouseEnter={()=>setHovered(chain.domain)} onMouseLeave={()=>setHovered(null)}><span className="flow-ranking-index">0{i+1}</span><i style={{background:chain.color}}/><b>{chain.name}</b><strong>{usd(volume(chain,direction))}</strong><ChevronRight size={12}/></button>)}{!ranked.length&&<p className="flow-ranking-empty">{t('Routes appear here when data is available.','数据就绪后展示资金通道排行。')}</p>}</div>}
        <div className="flow-coverage"><span><i/>{hasData?chains.length:'—'} {t('observed chains','条已观测链')}</span><span>{hasData?totals.transfers.toLocaleString():'—'} {t('transfers','笔跨链记录')}</span></div>
        {mode==='network'&&displayed.length<chains.length&&<small className="flow-overflow-note">{t(`Map shows ${displayed.length} chains; totals include all ${chains.length}.`,`图上显示 ${displayed.length} 条链，汇总包含全部 ${chains.length} 条。`)}</small>}
      </aside>
    </div>
    {!demo&&<CapitalFlowRecords windowSize={windowSize} domain={selected} direction={direction} zh={zh} updatedAt={current?.checkedAt??null}/>}
    <details className="flow-method"><summary><CircleHelp size={13}/>{t('Coverage & methodology','覆盖范围与统计口径')}<ChevronRight size={12}/></summary>
      <p>{t('USDC principal observed through CCTP V2 on Arc mainnet (5042). Inflow requires a matching USDC mint in the same transaction and uses Arc execution time; outflow uses Arc burn time. Amounts include the destination mint fee and use 6 USDC decimals. Gateway, other bridges, direct issuer mint/redemptions, exchange wallet transfers and same-chain transfers are excluded. Partial coverage is not a whole-chain net flow; missing data is never treated as zero.','统计 ARC 主网（5042）CCTP V2 的 USDC 桥接本金，按 6 位小数计算，包含目标链铸造费用。流入须与同笔交易中实际铸造 USDC 的事件核对，按 ARC 执行时间计入；流出按 ARC 销毁时间计入。不覆盖 Gateway、其他跨链桥、发行方直接增发赎回、交易所钱包转账或链内转账。部分覆盖不代表全链净流量，缺失数据不视为零。')}</p>
      {usable&&!demo&&current.coverageFrom&&current.coverageTo&&<p className="flow-window-detail">{t('Observed window','实际覆盖时间')}：{coverageDate(current.coverageFrom)} → {coverageDate(current.coverageTo)} UTC<br/>{t('Blocks','区块')} #{current.fromBlock?.toLocaleString()} → #{current.toBlock?.toLocaleString()}{current.skipped>0&&<> · {current.skipped} {t('unverified events excluded','条未核验事件未计入')}</>}</p>}

      <p>{t('Node sizes and route widths are scaled for readability. Animation is an aggregated direction cue, not a transaction replay. Verified records and hourly summaries are persisted. A daily job and bounded background catch-ups collect new events; this page reads stored snapshots.','节点大小和线宽经过缩放便于阅读；动效表现汇总方向，不是逐笔交易回放。核验记录和小时汇总持久保存，每日任务及受限后台增量更新采集新事件；本页直接读取已存快照。')}{usable&&!demo&&<a href={current.sourceUrl} target="_blank" rel="noreferrer">{t('Explore contract events ↗','查看合约事件 ↗')}</a>}</p>
    </details>
  </section>;
}
