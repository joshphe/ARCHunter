'use client';

import { memo, useId, useMemo, type RefObject } from 'react';
import CityBuilding from './city-building';
import CityLandmark from './city-landmark';
import { LandscapeTree, LandscapeBed, LandscapeBench, LandscapePergola } from './city-landscape';
import { avatarInitials, useProjectAvatar } from './use-project-avatar';
import { BUILDING_TIERS, layoutMap, mapScale, buildingHeight, buildingVariant } from '@/lib/ecosystem-map-layout';
import type { ProjectSummary } from '@/lib/project-schema';

export type CityLayout = ReturnType<typeof layoutMap<ProjectSummary>>;
type Props = {
  layout: CityLayout;
  language: 'en' | 'zh';
  selectedSlug: string | null;
  matchedSlugs: ReadonlySet<string> | null;
  onSelect: (slug: string) => void;
  onHover: (slug: string | null) => void;
  mapRef: RefObject<SVGSVGElement | null>;
};
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
const money = (value: number | null, zh: boolean) => value === null ? (zh ? '市值待定' : 'Cap unavailable') : moneyFormat.format(value);

function Tree({x,y,small=false,kind=0}: {x:number;y:number;small?:boolean;kind?:number}) {
  return <LandscapeTree x={x} y={y} scale={small ? .72 : 1} kind={kind}/>;
}
function ProjectBillboard({ handle, symbol, logoUrl, name, height, side }: { handle: string; symbol: string; logoUrl?: string | null; name: string; height: number; side: number }) {
  const clip = useId().replace(/:/g, '');
  const { src, markFailed } = useProjectAvatar(handle, logoUrl);
  const scale = Math.min(2,Math.max(1,Math.sqrt(side/128)));
  return <g className="city-billboard" transform={`translate(0 ${-height-side*.13-32*scale}) scale(${scale})`} aria-hidden="true">
    <defs><clipPath id={`${clip}-avatar`}><rect x="-41" y="-11" width="22" height="22" rx="5"/></clipPath></defs>
    <path className="city-billboard-support" d="M-25 14V36M25 14V36"/>
    <rect className="city-billboard-frame" x="-48" y="-17" width="96" height="34" rx="7"/>
    <rect className="city-billboard-logo" x="-41" y="-11" width="22" height="22" rx="5"/>
    <text className="city-billboard-initials" x="-30" y="4" textAnchor="middle">{avatarInitials(symbol, handle)}</text>
    {src ? <image key={src} href={src} x="-41" y="-11" width="22" height="22" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip}-avatar)`} onError={()=>markFailed(src)}/> : null}
    <text className="city-billboard-name" x="-12" y="0">{name.length>10?`${name.slice(0,9)}…`:name}</text>
    <text className="city-billboard-symbol" x="-12" y="10">{symbol.slice(0,9)}</text>
    <path className="city-billboard-strip" d="M-38 16H38"/>
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

// Roads, parks and waterfront furniture do not depend on camera or project selection.
const CityGround = memo(function CityGround({ layout, sceneId }: { layout: CityLayout; sceneId: string }) {
  const {landscapeVacant,blocks,streets,landmarks,cityWidth,cityDepth,span,origin,width,height}=layout;
  const waterfrontLandmarks=landmarks.filter(landmark=>landmark.placement==='waterfront');
  const ground=(u:number,v:number)=>[origin.x+u-v,origin.y+(u+v)/2];
  const gp=(u:number,v:number)=>ground(u,v).join(',');
  const island=[gp(-64,-64),gp(cityWidth+180,-64),gp(cityWidth+180,cityDepth+64),gp(-64,cityDepth+64)].join(' ');
  const river=`M${gp(cityWidth+64,-64)} L${gp(cityWidth+64,cityDepth+64)}`;
  const roads=[`M${gp(-36,-36)} L${gp(cityWidth+145,-36)} L${gp(cityWidth+145,cityDepth+36)} L${gp(-36,cityDepth+36)} Z`,...streets.map(points=>`M${points.map(p=>gp(p.u,p.v)).join(" L")}`)];
  const parks=Array.from({length:Math.max(4,Math.floor(cityDepth/80))},(_,i)=>ground(-52,16+i*80));
  const walks=blocks.flatMap(block=>block.parcels.flatMap((a,i)=>block.parcels.slice(i+1).flatMap(b=>{
    const paths:string[]=[];
    const left=a.u<b.u?a:b,right=left===a?b:a;
    const back=a.v<b.v?a:b,front=back===a?b:a;
    const v0=Math.max(left.v,right.v)+6,v1=Math.min(left.v+left.side,right.v+right.side)-6;
    if(left.packedU+left.side===right.packedU&&v1>v0){
      const u=block.u+(left.u+left.side+right.u)/2;
      paths.push(`M${gp(u,block.v+v0)} L${gp(u,block.v+v1)}`);
    }
    const u0=Math.max(back.u,front.u)+6,u1=Math.min(back.u+back.side,front.u+front.side)-6;
    if(back.packedV+back.side===front.packedV&&u1>u0){
      const v=block.v+(back.v+back.side+front.v)/2;
      paths.push(`M${gp(block.u+u0,v)} L${gp(block.u+u1,v)}`);
    }
    return paths;
  })));
  return <g aria-hidden="true">
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
          {landscapeVacant.map((cell,i)=><g key={i}>
            <polygon className="city-park-lawns" points={[gp(cell.u,cell.v),gp(cell.u+cell.side,cell.v),gp(cell.u+cell.side,cell.v+cell.side),gp(cell.u,cell.v+cell.side)].join(' ')}/>
            <path className="city-park-path" d={`M${gp(cell.u+cell.side*.12,cell.v+cell.side*.72)} L${gp(cell.u+cell.side*.72,cell.v+cell.side*.72)} L${gp(cell.u+cell.side*.72,cell.v+cell.side*.12)}`}/>
            {[.22,.5,.78].map((r,j)=>{const[x,y]=ground(cell.u+cell.side*r,cell.v+cell.side*.3);return <Tree key={r} x={x} y={y} small kind={(i+j)%3}/>;})}
            <LandscapeBed x={ground(cell.u+cell.side*.32,cell.v+cell.side*.58)[0]} y={ground(cell.u+cell.side*.32,cell.v+cell.side*.58)[1]} scale={.65} flowers/>
            {cell.side>=128?<LandscapePergola x={ground(cell.u+cell.side*.72,cell.v+cell.side*.72)[0]} y={ground(cell.u+cell.side*.72,cell.v+cell.side*.72)[1]} scale={.8}/>:null}
            {cell.side>=64?<LandscapeBench x={ground(cell.u+cell.side*.56,cell.v+cell.side*.64)[0]} y={ground(cell.u+cell.side*.56,cell.v+cell.side*.64)[1]} scale={.6}/>:null}
          </g>)}
          {streets.flatMap((points,i)=>{
            const a=points[0],b=points[1];
            const length=Math.abs(a.u-b.u)+Math.abs(a.v-b.v),count=Math.max(1,Math.floor(length/90));
            return Array.from({length:count},(_,j)=>{
              const ratio=(j+.5)/count,vertical=a.u===b.u;
              const u=a.u+(b.u-a.u)*ratio+(vertical?42:0),v=a.v+(b.v-a.v)*ratio+(vertical?0:42);
              // Landscaping stays outside the adjoining square parcels.
              const occupied=blocks.some(block=>u>block.u&&u<block.u+block.width&&v>block.v&&v<block.v+block.depth);
              if(occupied||u<0||v<0||u>cityWidth||v>cityDepth)return null;
              const[x,y]=ground(u,v);return <g key={`${i}-${j}`}><Tree x={x} y={y} small kind={(i+j)%4}/>{j%3===1?<LandscapeBed x={x-12} y={y-6} scale={.55} flowers/>:null}</g>;
            });
          })}
          <g className="city-road-edge">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-courtyard-walks">{walks.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-avenue">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-avenue-center">{roads.map((d,i)=><path key={i} d={d}/>)}</g>
          <g className="city-bridge">{[-36,cityDepth+36,...streets.filter(points=>points[0].v===points[1].v&&points[1].u>cityWidth).map(points=>points[0].v)].map(v=><path key={v} d={`M${gp(cityWidth+18,v)} L${gp(cityWidth+112,v)}`}/>)}</g>
          {streets.flatMap((points,i)=>{
            const [a,b]=points,length=Math.abs(a.u-b.u)+Math.abs(a.v-b.v),count=Math.max(1,Math.floor(length/140));
            return Array.from({length:count},(_,j)=>{
              const ratio=(j+.5)/count,vertical=a.u===b.u;
              const u=a.u+(b.u-a.u)*ratio+(vertical?15:0),v=a.v+(b.v-a.v)*ratio+(vertical?0:15);
              const [x,y]=ground(u,v);
              return <g key={`${i}-${j}`} transform={`translate(${x} ${y})`} className="city-streetlamp"><path d="M0 0V-23L6-26"/><ellipse className="city-streetlamp-glow" cx="6" cy="-6" rx="13" ry="6"/><circle cx="6" cy="-26" r="3"/></g>;
            });
          })}
          {parks.map(([x,y],i)=><Tree key={i} x={x} y={y} small kind={i%4}/>)}
          {Array.from({length:Math.max(4,Math.floor(span/80))},(_,i)=>{const[x,y]=ground(16+i*cityWidth/Math.max(4,Math.floor(cityDepth/80)),cityDepth+52);return <g key={i}><Tree x={x} y={y} small kind={i%3}/>{i%3===0?<LandscapeBench x={x+24} y={y+12} scale={.7}/>:null}</g>;})}
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
          <g className="city-civic-promenade">
            <path d={`M${gp(landmarks[0].u+landmarks[0].side/2,landmarks[0].v+landmarks[0].side/2)} L${gp(landmarks[1].u+landmarks[1].side/2,landmarks[1].v+landmarks[1].side/2)}`}/>
            {waterfrontLandmarks.map(landmark=>{
              const v=landmark.v+landmark.side/2;
              return <path key={landmark.kind} d={`M${gp(cityWidth+142,v)} L${gp(landmark.u+landmark.side/2,v)}`}/>;
            })}
          </g>
        </g>;
});

function EcosystemMapScene({layout,language,selectedSlug,matchedSlugs,onSelect,onHover,mapRef}: Props) {
  const zh=language==='zh';
  const t=(en:string,cn:string)=>zh?cn:en;
  const sceneId=useId().replace(/:/g,'');
  const {buildings,landmarks,origin,width,height}=layout;
  const sceneObjects=useMemo(()=>[
    ...buildings.map(building=>({x:building.x,y:building.y,building,landmark:null})),
    ...landmarks.map(landmark=>({x:origin.x+landmark.u-landmark.v,y:origin.y+(landmark.u+landmark.v+landmark.side)/2,landmark,building:null})),
  ].sort((a,b)=>a.y-b.y||a.x-b.x),[buildings,landmarks,origin]);
  const projectClass=(slug:string)=>`city-project${selectedSlug===slug?' is-selected':''}${matchedSlugs&&!matchedSlugs.has(slug)?' is-filtered-out':''}`;
  return <svg ref={mapRef} className="arc-city" viewBox={`0 0 ${width} ${height}`} aria-label={t('Isometric project buildings','等距视角项目建筑')}>
        <defs>
          <linearGradient id={`${sceneId}-ground`} x1="0" y1="0" x2="0" y2="1"><stop className="city-ground-stop-light" stopColor="#d7efb6"/><stop className="city-ground-stop-dark" offset="1" stopColor="#a9d892"/></linearGradient>
          <pattern id={`${sceneId}-paving`} width="90" height="45" patternUnits="userSpaceOnUse"><path d="M0 22.5L45 0L90 22.5L45 45Z" fill="none" stroke="#eff9c6" strokeOpacity=".38" strokeWidth="1"/></pattern>
          <radialGradient id={`${sceneId}-shadow`}><stop stopColor="#000" stopOpacity=".34"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
          <pattern id={`${sceneId}-waves`} width="85" height="35" patternUnits="userSpaceOnUse"><path d="M5 13q9-5 18 0t18 0M59 29q7-4 14 0" fill="none" stroke="#e6ffff" strokeOpacity=".2" strokeWidth="1.4"/></pattern>
        </defs>
        <CityGround layout={layout} sceneId={sceneId}/>
        {sceneObjects.map(item=>{
          const {x,y}=item;
          if(item.landmark){
            const landmark=item.landmark;
            return <g key={`landmark-${landmark.kind}`} transform={`translate(${x} ${y})`} data-landmark={landmark.kind}><CityLandmark kind={landmark.kind} side={landmark.side} language={language}/></g>;
          }
          const {project}=item.building!;
          const {cap,buildingTier,plotTier}=mapScale(project.tokenMetrics?.marketCapUsd);
          const {side}=item.building!;
          const label=`${project.name} · ${money(cap,zh)} · ${buildingTier===null?t('Awaiting market cap','待补充市值'):`${BUILDING_TIERS[buildingTier].name[zh?1:0]} / ${BUILDING_TIERS[buildingTier].label} · ${t('Fixed plot','固定地块')}`}`;
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className={projectClass(project.slug)} onClick={event=>{event.preventDefault();onSelect(project.slug);}} onMouseEnter={()=>onHover(project.slug)} onMouseLeave={()=>onHover(null)} onFocus={()=>{onHover(project.slug);onSelect(project.slug);}} onBlur={()=>onHover(null)} aria-label={label} data-project={project.slug} data-building-tier={buildingTier??'unknown'} data-plot-tier={plotTier??'unknown'}>
            <title>{label}</title>
            <path className="city-cast-shadow" d={`M${-side},0 L0,${side/2} L${side+40},${side/2+25} L${side+65},18 L${side},0 Z`}/>
            <ellipse className="city-shadow" cx="4" cy="5" rx={side+4} ry={side*.5+3}/>
            {buildingTier===null?<g className="city-vacant"><polygon points={`0,${-side/2} ${side},0 0,${side/2} ${-side},0`}/><text x="0" y="5" textAnchor="middle">?</text></g>:<CityBuilding tier={buildingTier} side={side} variant={buildingVariant(project.slug)}/>}
          </a></g>;
        })}
        {buildings.map(({project,x,y,side})=>{
          const {buildingTier}=mapScale(project.tokenMetrics?.marketCapUsd);
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className={projectClass(project.slug)} tabIndex={-1} aria-label={project.name} onClick={event=>{event.preventDefault();onSelect(project.slug);}} onMouseEnter={()=>onHover(project.slug)} onMouseLeave={()=>onHover(null)}><title>{`${project.name} · ${money(mapScale(project.tokenMetrics?.marketCapUsd).cap,zh)}`}</title><ProjectBillboard handle={project.handle} symbol={project.symbol} logoUrl={project.logoUrl} name={project.name} height={buildingTier===null?0:buildingHeight(buildingTier,side)} side={side}/></a></g>;
        })}
      </svg>;
}

export default memo(EcosystemMapScene);
