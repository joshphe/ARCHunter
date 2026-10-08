'use client';


import Link from 'next/link';
import CityBuilding from './city-building';
import { useId, useMemo, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import { BUILDING_TIERS, PLOT_TIERS, layoutMap, mapScale, buildingHeight } from '@/lib/ecosystem-map-layout';

type Props = { projects: EcosystemProject[]; language: 'en' | 'zh' };
function Tree({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .72 : 1})`} className="city-tree">
    <ellipse cx="7" cy="4" rx="18" ry="7" className="city-tree-shadow"/>
    <path d="M0 0V-23" className="city-tree-trunk"/>
    <path d="M0-50L17-18L0-9L-17-18Z" className="city-tree-crown"/>
    <path d="M0-50V-9L-17-18Z" className="city-tree-light"/>
  </g>;
}
function ProjectPin({ handle, symbol, height, side, tier }: { handle: string; symbol: string; height: number; side: number; tier: number | null }) {
  const clip = useId().replace(/:/g, '');
  const [failed, setFailed] = useState(false);
  const username = handle.replace(/^@/, '').trim();
  const tall = tier !== null && tier >= 4;
  return <g className="city-logo-pin" transform={`translate(${tall ? side*.85 : 0} ${tall ? -height-12 : -height-side/2-36})`} aria-hidden="true">
    <defs><clipPath id={`${clip}-avatar`}><circle r="20"/></clipPath></defs>
    <path d="M-8 16L0 31L8 16" fill="#fff9e9" stroke="#237a91" strokeWidth="2"/>
    <circle r="25" fill="#154c63" opacity=".16" cy="3"/>
    <circle r="24" fill="#fff9e9" stroke="#237a91" strokeWidth="2"/>
    <circle r="20" fill="#234e60"/>
    <text textAnchor="middle" y="6" fill="white" fontSize="15" fontWeight="700">{symbol.slice(0,3)}</text>
    {!failed && username ? <image href={`https://unavatar.io/x/${encodeURIComponent(username)}`} x="-20" y="-20" width="40" height="40" clipPath={`url(#${clip}-avatar)`} onError={()=>setFailed(true)}/> : null}
  </g>;
}

function Boat({ x, y, large = false }: { x: number; y: number; large?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${large ? 1.8 : 1})`}>
    <ellipse cx="0" cy="10" rx="30" ry="8" fill="#125d8230"/>
    <path d="M-29 0L-13 12L20 12L31 0Z" fill="#e6f5ee"/>
    <path d="M-13 12L20 12L26 7L-20 7Z" fill="#e68f68"/>
    <path d="M-3 0V-42L19-2Z" fill="#fffdf2"/>
    <path d="M-6-5V-29L-23-5Z" fill="#bfe2e9"/>
    <path d="M-3 0V-43" stroke="#537b83" strokeWidth="2"/>
  </g>;
}
function money(value:number|null,zh:boolean) {
  return value===null?(zh?'市值待定':'Cap unavailable'):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);
}

export default function EcosystemMap({projects,language}:Props) {
  const zh=language==='zh';
  const t=(en:string,cn:string)=>zh?cn:en;
  const [zoom,setZoom]=useState(.8);
  const [activeSlug,setActiveSlug]=useState<string|null>(null);
  const sceneId=useId().replace(/:/g,'');
  const {buildings,unassigned,vacant,blocks,streets,cityWidth,cityDepth,span,origin,width,height}=useMemo(()=>layoutMap(projects),[projects]);
  const ground=(u:number,v:number)=>[origin.x+u-v,origin.y+(u+v)/2];
  const gp=(u:number,v:number)=>ground(u,v).join(',');
  const island=[gp(-64,-64),gp(cityWidth+180,-64),gp(cityWidth+180,cityDepth+64),gp(-64,cityDepth+64)].join(' ');
  const river=`M${gp(cityWidth+64,-64)} L${gp(cityWidth+64,cityDepth+64)}`;
  const roads=[`M${gp(-36,-36)} L${gp(cityWidth+145,-36)} L${gp(cityWidth+145,cityDepth+36)} L${gp(-36,cityDepth+36)} Z`,...streets.map(points=>`M${points.map(p=>gp(p.u,p.v)).join(" L")}`)];
  const parks=Array.from({length:Math.max(4,Math.floor(cityDepth/80))},(_,i)=>ground(-52,16+i*80));
  const activeProject=projects.find(p=>p.slug===activeSlug);
  const priced=projects.filter(project=>mapScale(project.tokenMetrics?.marketCapUsd).cap!==null).length;

  return <section className="ecosystem-map-card" aria-label={t('Arc ecosystem map','Arc 生态地图')}>
    <div className="ecosystem-map-toolbar">
      <div><span className="section-kicker">THE ARC ATLAS</span><b>{t('A living city, shaped by its projects.','一座由项目生长而成的城市。')}</b></div>
      <div className="ecosystem-map-tools">
        <button type="button" disabled={zoom>=1.8} onClick={()=>setZoom(v=>Math.min(1.8,+(v+.2).toFixed(1)))} aria-label={t('Zoom in','放大地图')}><ZoomIn size={15}/></button>
        <button type="button" disabled={zoom<=.8} onClick={()=>setZoom(v=>Math.max(.8,+(v-.2).toFixed(1)))} aria-label={t('Zoom out','缩小地图')}><ZoomOut size={15}/></button>
        <button type="button" onClick={()=>setZoom(.8)} aria-label={t('Reset map zoom','重置地图缩放')}><RotateCcw size={14}/></button>
      </div>
    </div>
    <div className="city-scene">
      <div className="city-scene-heading"><span>ARC / ECOSYSTEM</span><strong>{t('The onchain city','链上之城')}</strong><p>{t('Every building tells a story.','每一座建筑，都是一个项目。')}</p></div>
      <div className="city-scene-index"><b>{String(projects.length).padStart(2,'0')}</b><span>{t('PROJECTS','项目坐标')}</span><i/>{t(`${priced} with market cap`,`${priced} 个已有市值`)}</div>
    <div className="ecosystem-map-viewport" tabIndex={0} role="region" aria-label={t('Scrollable city map','可滚动城市地图')}>
      <svg className="arc-city" viewBox={`0 0 ${width} ${height}`} style={{width:`${zoom*100}%`,minWidth:680*zoom}} aria-label={t('Isometric project buildings','等距视角项目建筑')}>
        <defs>
          <linearGradient id={`${sceneId}-ground`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d7efb6"/><stop offset="1" stopColor="#a9d892"/></linearGradient>
          <pattern id={`${sceneId}-paving`} width="90" height="45" patternUnits="userSpaceOnUse"><path d="M0 22.5L45 0L90 22.5L45 45Z" fill="none" stroke="#eff9c6" strokeOpacity=".38" strokeWidth="1"/></pattern>
          <radialGradient id={`${sceneId}-shadow`}><stop stopColor="#000" stopOpacity=".34"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
          <pattern id={`${sceneId}-waves`} width="85" height="35" patternUnits="userSpaceOnUse"><path d="M5 13q9-5 18 0t18 0M59 29q7-4 14 0" fill="none" stroke="#e6ffff" strokeOpacity=".2" strokeWidth="1.4"/></pattern>
        </defs>
        <g aria-hidden="true">
          <rect width={width} height={height} fill={`url(#${sceneId}-waves)`}/>
          <ellipse cx={origin.x} cy={origin.y+span*.6} rx={span+150} ry={span*.6+130} fill={`url(#${sceneId}-shadow)`}/>
          <polygon className="city-waterline" points={island} transform="translate(-42 -22) scale(1.035)"/>
          <polygon className="city-island-edge" points={island} transform="translate(0 25)"/>
          <polygon className="city-ground" points={island} fill={`url(#${sceneId}-ground)`}/>
          <polygon points={island} fill={`url(#${sceneId}-paving)`}/>
          <polygon className="city-quay" points={island}/>
          <path className="city-river-bank" d={river}/>
          <path className="city-river" d={river}/>
          <path className="city-river-current" d={river}/>
          {vacant.map((cell,i)=><g key={i}>
            <polygon className="city-park-lawns" points={[gp(cell.u,cell.v),gp(cell.u+cell.side,cell.v),gp(cell.u+cell.side,cell.v+cell.side),gp(cell.u,cell.v+cell.side)].join(' ')}/>
            {[.25,.65].map(r=>{const[x,y]=ground(cell.u+cell.side*r,cell.v+cell.side*.5);return <Tree key={r} x={x} y={y} small/>;})}
          </g>)}
          {streets.flatMap((points,i)=>{
            const a=points[0],b=points[1];
            const length=Math.abs(a.u-b.u)+Math.abs(a.v-b.v),count=Math.max(1,Math.floor(length/90));
            return Array.from({length:count},(_,j)=>{
              const ratio=(j+.5)/count,vertical=a.u===b.u;
              const u=a.u+(b.u-a.u)*ratio+(vertical?26:0),v=a.v+(b.v-a.v)*ratio+(vertical?0:26);
              // Landscaping stays outside the adjoining square parcels.
              const occupied=blocks.some(block=>u>block.u&&u<block.u+block.width&&v>block.v&&v<block.v+block.depth);
              if(occupied||u<0||v<0||u>cityWidth||v>cityDepth)return null;
              const[x,y]=ground(u,v);return <Tree key={`${i}-${j}`} x={x} y={y} small/>;
            });
          })}
          <g className="city-road-edge">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-avenue">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-avenue-center">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-bridge">{[-36,cityDepth+36,...streets.filter(points=>points[0].v===points[1].v&&points[1].u>cityWidth).map(points=>points[0].v)].map(v=><path key={v} d={`M${gp(cityWidth+18,v)} L${gp(cityWidth+112,v)}`}/>)}</g>
          {parks.map(([x,y],i)=><Tree key={i} x={x} y={y} small/>)}
          {Array.from({length:Math.max(4,Math.floor(span/80))},(_,i)=>{const[x,y]=ground(16+i*cityWidth/Math.max(4,Math.floor(cityDepth/80)),cityDepth+52);return <Tree key={i} x={x} y={y} small/>;})}
          <g transform={`translate(${gp(cityWidth+142,cityDepth*.55).replace(',', ' ')}) scale(.48)`} className="city-plaza">
            <polygon points="0,-94 188,0 0,94 -188,0" fill="#f0e9ce" stroke="#fffae9" strokeWidth="8"/>
            <ellipse cy="5" rx="61" ry="30" fill="#94cdbd" stroke="#fffdf0" strokeWidth="8"/>
            <ellipse cy="-1" rx="43" ry="20" fill="#49b6d0" stroke="#d5f4ee" strokeWidth="4"/>
            <path d="M-10-5L0-66L10-5Z" fill="#eaffee"/><path d="M0-66L10-5L24 3L4-6Z" fill="#77bec4"/>
            <text y="65" textAnchor="middle" fill="#577f78" fontSize="14" letterSpacing="5">ARC PLAZA</text>
          </g>
          <g className="city-marina"><path d={`M${gp(cityWidth*.8,cityDepth+64)} L${gp(cityWidth*.8,cityDepth+125)} L${gp(cityWidth*.35,cityDepth+125)}`}/>{[.4,.55,.7].map(r=><path key={r} d={`M${gp(cityWidth*r,cityDepth+125)} L${gp(cityWidth*r,cityDepth+170)}`}/>)}</g>
          <Boat x={ground(cityWidth*.5,cityDepth+190)[0]} y={ground(cityWidth*.5,cityDepth+190)[1]}/>
          <Boat x={ground(-120,cityDepth*.7)[0]} y={ground(-120,cityDepth*.7)[1]}/>
        </g>
        {buildings.map(({project,slot,x,y})=>{
          const {cap,buildingTier,plotTier,side}=mapScale(project.tokenMetrics?.marketCapUsd);
          const label=`${project.name} · ${money(cap,zh)} · ${buildingTier===null?t('Awaiting market cap','待补充市值'):`${BUILDING_TIERS[buildingTier].name[zh?1:0]} / ${BUILDING_TIERS[buildingTier].label} · ${t('Plot','地块')} ${PLOT_TIERS[plotTier!].size}`}`;
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className="city-project" onMouseEnter={()=>setActiveSlug(project.slug)} onMouseLeave={()=>setActiveSlug(null)} onFocus={()=>setActiveSlug(project.slug)} onBlur={()=>setActiveSlug(null)} aria-label={label} data-project={project.slug} data-building-tier={buildingTier??'unknown'} data-plot-tier={plotTier??'unknown'}>
            <title>{label}</title>
            <path className="city-cast-shadow" d={`M${-side},0 L0,${side/2} L${side+40},${side/2+25} L${side+65},18 L${side},0 Z`}/>
            <ellipse className="city-shadow" cx="4" cy="5" rx={side+4} ry={side*.5+3}/>
            {buildingTier===null?<g className="city-vacant"><polygon points={`0,${-side/2} ${side},0 0,${side/2} ${-side},0`}/><text x="0" y="5" textAnchor="middle">?</text></g>:<CityBuilding tier={buildingTier} side={side}/>}
          </a></g>;
        })}
        {buildings.map(({project,x,y})=>{
          const {side,buildingTier}=mapScale(project.tokenMetrics?.marketCapUsd);
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className="city-project" tabIndex={-1} aria-label={project.name} onMouseEnter={()=>setActiveSlug(project.slug)} onMouseLeave={()=>setActiveSlug(null)}><title>{`${project.name} · ${money(mapScale(project.tokenMetrics?.marketCapUsd).cap,zh)}`}</title><ProjectPin handle={project.handle} symbol={project.symbol} height={buildingTier===null?22:buildingHeight(buildingTier,side)} side={side} tier={buildingTier}/></a></g>;
        })}
      </svg>
    </div>
    {activeProject?<div className="city-project-detail" aria-live="polite"><b>{activeProject.name}</b><span>{money(mapScale(activeProject.tokenMetrics?.marketCapUsd).cap,zh)} · {t('Plot','地块')} {PLOT_TIERS[mapScale(activeProject.tokenMetrics?.marketCapUsd).plotTier??0].size}</span><span>{t('Click the building for details ↗','点击建筑查看详情 ↗')}</span></div>:null}
    <div className="city-scene-footer"><span><i/>{t('ISOMETRIC VIEW','等距视角')} <em>2.5D</em></span><span>{t('Select a building to explore ↗','点击建筑，探索项目 ↗')}</span></div>
    </div>
    <div className="city-scale-guide">
      <div className="city-guide-heading"><b>{t('Building forms','建筑形态')}</b><span>{t('Normalized illustrations · USD cap bands include the lower bound','形态示意图 · 美元市值各档含下限、不含上限')}</span></div>
      <div className="city-building-legend">{BUILDING_TIERS.map((tier,i)=><div key={tier.min}>
        <span className="city-tier-index">{String(i+1).padStart(2,'0')}</span><svg viewBox="-90 -180 180 250" aria-hidden="true"><CityBuilding tier={i} side={64}/></svg>
        <b>{tier.label}</b><span>{tier.name[zh?1:0]}</span>
      </div>)}</div>
      <div className="city-plot-legend"><b>{t('Square footprints · 1 : 2 : 4 : 8 : 16','正方形地块 · 1 : 2 : 4 : 8 : 16')}</b>{PLOT_TIERS.map(tier=><span key={tier.min}><svg width="38" height="24" viewBox="-1050 -550 2100 1100" aria-hidden="true"><polygon points={`0,${-tier.side/2} ${tier.side},0 0,${tier.side/2} ${-tier.side},0`}/></svg><strong>{tier.size}</strong> {tier.label}</span>)}</div>
    </div>
    {unassigned.length?<div className="city-annex"><b>{t('New projects · plots pending','新项目 · 待分配固定地块')}</b>{unassigned.map(project=><Link key={project.slug} href={`/projects/${encodeURIComponent(project.slug)}`}>{project.name}</Link>)}</div>:null}
    <p className="capital-footnote ecosystem-map-note">{t('Projects stay in permanent clusters of two to four. Parcel sides double at each band; parcels repack inside their cluster, with streets and green strips separating the clusters. Building bases cover their entire square parcels. A ? marks an unpriced project, not a zero valuation. Building size does not indicate safety or quality.','项目固定分组，每组 2–4 栋，组间由道路与绿带分隔。地块边长按 1:2 倍增，市值跨档时在组内重新拼接，街区扩建时保留道路间隔。建筑底座与正方形地块完全同尺寸，四块小地皮可拼成一块相邻大档地皮。? 表示暂无市值，并非零市值；建筑大小不代表项目安全性或质量。')}</p>
  </section>;
}
