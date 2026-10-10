'use client';


import Link from 'next/link';
import CityBuilding from './city-building';
import CityLandmark from './city-landmark';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Crosshair, Maximize2, PanelRightClose, PanelRightOpen, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import { BUILDING_TIERS, PLOT_TIERS, layoutMap, mapScale, buildingHeight, buildingVariant } from '@/lib/ecosystem-map-layout';
import ProjectAvatar from '@/app/project-avatar';
import { avatarInitials, useProjectAvatar } from '@/app/use-project-avatar';

type Props = { projects: EcosystemProject[]; language: 'en' | 'zh' };
function Tree({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .72 : 1})`} className="city-tree">
    <ellipse cx="7" cy="4" rx="18" ry="7" className="city-tree-shadow"/>
    <path d="M0 0V-23" className="city-tree-trunk"/>
    <path d="M0-50L17-18L0-9L-17-18Z" className="city-tree-crown"/>
    <path d="M0-50V-9L-17-18Z" className="city-tree-light"/>
  </g>;
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
function money(value:number|null,zh:boolean) {
  return value===null?(zh?'市值待定':'Cap unavailable'):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);
}
function metricSource(source:string|undefined,zh:boolean) {
  if(source==='okx')return 'OKX';
  if(source==='dexscreener+okx')return 'DEX Screener + OKX';
  return source==='dexscreener'?'DEX Screener':(zh?'暂无来源':'Source unavailable');
}
function metricDate(value:string|undefined,zh:boolean) {
  if(!value||!Number.isFinite(new Date(value).getTime()))return zh?'暂无更新时间':'Update time unavailable';
  return new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}
type CapFilter='all'|'unpriced'|'0'|'1'|'2'|'3'|'4';
const MIN_ZOOM=.8;
const MAX_ZOOM=3.2;

export default function EcosystemMap({projects,language}:Props) {
  const zh=language==='zh';
  const t=(en:string,cn:string)=>zh?cn:en;
  const [zoom,setZoom]=useState(1);
  const [activeSlug,setActiveSlug]=useState<string|null>(null);
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [categoryFilter,setCategoryFilter]=useState('all');
  const [capFilter,setCapFilter]=useState<CapFilter>('all');
  const [searchFocused,setSearchFocused]=useState(false);
  const [guideCollapsed,setGuideCollapsed]=useState(true);
  const [dragging,setDragging]=useState(false);
  const viewportRef=useRef<HTMLDivElement>(null);
  const mapRef=useRef<SVGSVGElement>(null);
  const zoomRef=useRef(1);
  const zoomAnchor=useRef<{x:number;y:number;u:number;v:number}|null>(null);
  const wheelFrame=useRef<number|null>(null);
  const wheelInput=useRef({delta:0,x:0,y:0});
  const changeZoom=useCallback((value:number,pointer?:{x:number;y:number})=>{
    const next=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,value));
    const viewport=viewportRef.current,map=mapRef.current;
    if(!viewport||!map||next===zoomRef.current)return;
    const view=viewport.getBoundingClientRect(),scene=map.getBoundingClientRect();
    if(!scene.width||!scene.height)return;
    const x=pointer?.x??view.left+view.width/2,y=pointer?.y??view.top+view.height/2;
    zoomAnchor.current={x,y,u:(x-scene.left)/scene.width,v:(y-scene.top)/scene.height};
    zoomRef.current=next;
    setZoom(next);
  },[]);
  const resetView=()=>{
    if(wheelFrame.current!==null)cancelAnimationFrame(wheelFrame.current);
    wheelFrame.current=null;
    wheelInput.current.delta=0;
    zoomAnchor.current=null;
    zoomRef.current=1;
    setZoom(1);
    viewportRef.current?.scrollTo({left:0,top:0,behavior:'instant'});
  };
  const [viewportSize,setViewportSize]=useState<{width:number;height:number}|null>(null);
  useEffect(()=>{
    const viewport=viewportRef.current;
    if(!viewport)return;
    const updateSize=()=>{
      const width=viewport.clientWidth,height=viewport.clientHeight;
      setViewportSize(previous=>previous?.width===width&&previous.height===height?previous:{width,height});
    };
    updateSize();
    const observer=new ResizeObserver(updateSize);
    observer.observe(viewport);
    return ()=>observer.disconnect();
  },[]);
  const gesture=useRef<{id:number;x:number;y:number;left:number;top:number;scaleX:number;scaleY:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const startPan=(event:PointerEvent<HTMLDivElement>)=>{
    if(!event.isPrimary||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    suppressClick.current=false;
    const viewport=event.currentTarget;
    const bounds=viewport.getBoundingClientRect();
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,scaleX:bounds.width/viewport.clientWidth,scaleY:bounds.height/viewport.clientHeight,moved:false};
  };
  const movePan=(event:PointerEvent<HTMLDivElement>)=>{
    const pan=gesture.current;
    if(!pan||pan.id!==event.pointerId)return;
    const dx=event.clientX-pan.x,dy=event.clientY-pan.y;
    if(!pan.moved&&Math.hypot(dx,dy)<6)return;
    if(!pan.moved){
      pan.moved=true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      setActiveSlug(null);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft=pan.left-dx/pan.scaleX;
    event.currentTarget.scrollTop=pan.top-dy/pan.scaleY;
  };
  const endPan=(event:PointerEvent<HTMLDivElement>)=>{
    const pan=gesture.current;
    if(!pan||pan.id!==event.pointerId)return;
    suppressClick.current=pan.moved;
    gesture.current=null;
    setDragging(false);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const sceneId=useId().replace(/:/g,'');
  const {buildings,landscapeVacant,blocks,streets,landmarks,cityWidth,cityDepth,span,origin,width,height}=useMemo(()=>layoutMap(projects),[projects]);
  const waterfrontLandmarks=landmarks.filter(landmark=>landmark.placement==='waterfront');
  const sceneObjects=useMemo(()=>[
    ...buildings.map(building=>({x:building.x,y:building.y,building,landmark:null})),
    ...landmarks.map(landmark=>({x:origin.x+landmark.u-landmark.v,y:origin.y+(landmark.u+landmark.v+landmark.side)/2,landmark,building:null})),
  ].sort((a,b)=>a.y-b.y||a.x-b.x),[buildings,landmarks,origin]);
  const fittedWidth=viewportSize?Math.min(viewportSize.width,viewportSize.height*width/height):null;
  // Restore the point under the cursor after React applies the new SVG size.
  useLayoutEffect(()=>{
    zoomRef.current=zoom;
    const anchor=zoomAnchor.current,viewport=viewportRef.current,map=mapRef.current;
    zoomAnchor.current=null;
    if(!anchor||!viewport||!map)return;
    const view=viewport.getBoundingClientRect(),scene=map.getBoundingClientRect();
    if(!view.width||!view.height)return;
    viewport.scrollLeft+=(scene.left+anchor.u*scene.width-anchor.x)*viewport.clientWidth/view.width;
    viewport.scrollTop+=(scene.top+anchor.v*scene.height-anchor.y)*viewport.clientHeight/view.height;
  },[zoom,fittedWidth]);
  useEffect(()=>{
    const viewport=viewportRef.current;
    if(!viewport)return;
    const onWheel=(event:WheelEvent)=>{
      // React wheel handlers can be passive; a native listener prevents page scrolling.
      event.preventDefault();
      if(gesture.current?.moved||event.deltaY===0)return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
      const input=wheelInput.current;
      input.delta+=Math.max(-120,Math.min(120,event.deltaY*unit));
      input.x=event.clientX;input.y=event.clientY;
      if(wheelFrame.current!==null)return;
      wheelFrame.current=requestAnimationFrame(()=>{
        wheelFrame.current=null;
        const delta=Math.max(-240,Math.min(240,input.delta));
        input.delta=0;
        changeZoom(zoomRef.current*Math.exp(-delta*.002),{x:input.x,y:input.y});
      });
    };
    viewport.addEventListener('wheel',onWheel,{passive:false});
    return ()=>{
      viewport.removeEventListener('wheel',onWheel);
      if(wheelFrame.current!==null)cancelAnimationFrame(wheelFrame.current);
      wheelFrame.current=null;
      wheelInput.current.delta=0;
    };
  },[changeZoom]);
  const categories=useMemo(()=>[...new Set(projects.flatMap(project=>project.categories))].sort((a,b)=>a.localeCompare(b)),[projects]);
  const matches=useMemo(()=>projects.filter(project=>{
    const normalized=query.trim().toLowerCase();
    const searchable=[project.name,project.symbol,project.handle,project.tagline,project.taglineZh,...project.categories].join(' ').toLowerCase();
    const textMatch=!normalized||searchable.includes(normalized);
    const categoryMatch=categoryFilter==='all'||project.categories.includes(categoryFilter);
    const {cap,plotTier}=mapScale(project.tokenMetrics?.marketCapUsd);
    const capMatch=capFilter==='all'||(capFilter==='unpriced'?cap===null:String(plotTier)===capFilter);
    return textMatch&&categoryMatch&&capMatch;
  }),[projects,query,categoryFilter,capFilter]);
  const matchedSlugs=useMemo(()=>new Set(matches.map(project=>project.slug)),[matches]);
  const selectedProject=projects.find(project=>project.slug===selectedSlug)??null;
  const focusProject=(slug:string)=>{
    requestAnimationFrame(()=>{
      const viewport=viewportRef.current;
      const target=viewport?.querySelector<SVGGraphicsElement>(`[data-project="${slug}"]`);
      if(!viewport||!target)return;
      const view=viewport.getBoundingClientRect(),item=target.getBoundingClientRect();
      viewport.scrollTo({left:viewport.scrollLeft+item.left+item.width/2-view.left-view.width/2,top:viewport.scrollTop+item.top+item.height/2-view.top-view.height/2,behavior:'smooth'});
    });
  };
  const selectProject=(slug:string)=>{
    setSelectedSlug(slug);
    setGuideCollapsed(false);
    focusProject(slug);
  };
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
  const activeProject=projects.find(p=>p.slug===activeSlug);
  const priced=projects.filter(project=>mapScale(project.tokenMetrics?.marketCapUsd).cap!==null).length;
  const filtersActive=Boolean(query.trim())||categoryFilter!=='all'||capFilter!=='all';
  const projectClass=(slug:string)=>`city-project${selectedSlug===slug?' is-selected':''}${filtersActive&&!matchedSlugs.has(slug)?' is-filtered-out':''}`;
  const capFilterOptions=[
    {value:'0',label:PLOT_TIERS[0].label},{value:'1',label:PLOT_TIERS[1].label},{value:'2',label:PLOT_TIERS[2].label},
    {value:'3',label:PLOT_TIERS[3].label},{value:'4',label:PLOT_TIERS[4].label},
  ] as const;
  const selectedCap=mapScale(selectedProject?.tokenMetrics?.marketCapUsd);
  const selectedBuildingTier=selectedCap.buildingTier===null?null:BUILDING_TIERS[selectedCap.buildingTier];
  const selectedStatus=selectedProject?.status==='live'?t('LIVE','已上线'):selectedProject?.status==='beta'?t('BETA','测试中'):t('UPCOMING','即将推出');
  const profileHref=selectedProject?`/projects/${encodeURIComponent(selectedProject.slug)}`:undefined;

  return <section className={`ecosystem-map-card${guideCollapsed?' is-guide-collapsed':''}`} aria-label={t('Arc ecosystem map','Arc 生态地图')}>
    <div className="city-scene">
    <div className="ecosystem-map-toolbar">
      <div className="ecosystem-map-tools">
        <button type="button" disabled={zoom>=MAX_ZOOM} onClick={()=>changeZoom(zoomRef.current+.2)} aria-label={t('Zoom in','放大地图')}><ZoomIn size={15}/></button>
        <button type="button" disabled={zoom<=MIN_ZOOM} onClick={()=>changeZoom(zoomRef.current-.2)} aria-label={t('Zoom out','缩小地图')}><ZoomOut size={15}/></button>
        <button type="button" onClick={resetView} aria-label={t('Fit entire map','适配全图')} title={t('Fit entire map','适配全图')}><Maximize2 size={14}/></button>
      </div>
    </div>
    <div ref={viewportRef} className={`ecosystem-map-viewport${dragging?' is-dragging':''}`} tabIndex={0} role="region" aria-label={t('City map · wheel to zoom · drag to pan','城市地图 · 滚轮缩放 · 拖拽平移')}
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}
      onPointerLeave={()=>{if(!gesture.current?.moved)gesture.current=null;}}
      onDragStart={event=>event.preventDefault()}
      onClickCapture={event=>{if(suppressClick.current&&event.detail!==0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}>
      <svg ref={mapRef} className="arc-city" viewBox={`0 0 ${width} ${height}`} style={{width:fittedWidth===null?`${zoom*100}%`:`${fittedWidth*zoom}px`,minWidth:0}} aria-label={t('Isometric project buildings','等距视角项目建筑')}>
        <defs>
          <linearGradient id={`${sceneId}-ground`} x1="0" y1="0" x2="0" y2="1"><stop className="city-ground-stop-light" stopColor="#d7efb6"/><stop className="city-ground-stop-dark" offset="1" stopColor="#a9d892"/></linearGradient>
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
          {landscapeVacant.map((cell,i)=><g key={i}>
            <polygon className="city-park-lawns" points={[gp(cell.u,cell.v),gp(cell.u+cell.side,cell.v),gp(cell.u+cell.side,cell.v+cell.side),gp(cell.u,cell.v+cell.side)].join(' ')}/>
            {[.25,.65].map(r=>{const[x,y]=ground(cell.u+cell.side*r,cell.v+cell.side*.5);return <Tree key={r} x={x} y={y} small/>;})}
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
              const[x,y]=ground(u,v);return <Tree key={`${i}-${j}`} x={x} y={y} small/>;
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
          <g className="city-civic-promenade">
            <path d={`M${gp(landmarks[0].u+landmarks[0].side/2,landmarks[0].v+landmarks[0].side/2)} L${gp(landmarks[1].u+landmarks[1].side/2,landmarks[1].v+landmarks[1].side/2)}`}/>
            {waterfrontLandmarks.map(landmark=>{
              const v=landmark.v+landmark.side/2;
              return <path key={landmark.kind} d={`M${gp(cityWidth+142,v)} L${gp(landmark.u+landmark.side/2,v)}`}/>;
            })}
          </g>
        </g>
        {sceneObjects.map(item=>{
          const {x,y}=item;
          if(item.landmark){
            const landmark=item.landmark;
            return <g key={`landmark-${landmark.kind}`} transform={`translate(${x} ${y})`} data-landmark={landmark.kind}><CityLandmark kind={landmark.kind} side={landmark.side} language={language}/></g>;
          }
          const {project}=item.building!;
          const {cap,buildingTier,plotTier,side}=mapScale(project.tokenMetrics?.marketCapUsd);
          const label=`${project.name} · ${money(cap,zh)} · ${buildingTier===null?t('Awaiting market cap','待补充市值'):`${BUILDING_TIERS[buildingTier].name[zh?1:0]} / ${BUILDING_TIERS[buildingTier].label} · ${t('Plot','地块')} ${PLOT_TIERS[plotTier!].size}`}`;
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className={projectClass(project.slug)} onClick={event=>{event.preventDefault();selectProject(project.slug);}} onMouseEnter={()=>setActiveSlug(project.slug)} onMouseLeave={()=>setActiveSlug(null)} onFocus={()=>{setActiveSlug(project.slug);selectProject(project.slug);}} onBlur={()=>setActiveSlug(null)} aria-label={label} data-project={project.slug} data-building-tier={buildingTier??'unknown'} data-plot-tier={plotTier??'unknown'}>
            <title>{label}</title>
            <path className="city-cast-shadow" d={`M${-side},0 L0,${side/2} L${side+40},${side/2+25} L${side+65},18 L${side},0 Z`}/>
            <ellipse className="city-shadow" cx="4" cy="5" rx={side+4} ry={side*.5+3}/>
            {buildingTier===null?<g className="city-vacant"><polygon points={`0,${-side/2} ${side},0 0,${side/2} ${-side},0`}/><text x="0" y="5" textAnchor="middle">?</text></g>:<CityBuilding tier={buildingTier} side={side} variant={buildingVariant(project.slug)}/>}
          </a></g>;
        })}
        {buildings.map(({project,x,y})=>{
          const {side,buildingTier}=mapScale(project.tokenMetrics?.marketCapUsd);
          return <g key={project.slug} transform={`translate(${x} ${y})`}><a href={`/projects/${encodeURIComponent(project.slug)}`} className={projectClass(project.slug)} tabIndex={-1} aria-label={project.name} onClick={event=>{event.preventDefault();selectProject(project.slug);}} onMouseEnter={()=>setActiveSlug(project.slug)} onMouseLeave={()=>setActiveSlug(null)}><title>{`${project.name} · ${money(mapScale(project.tokenMetrics?.marketCapUsd).cap,zh)}`}</title><ProjectBillboard handle={project.handle} symbol={project.symbol} logoUrl={project.logoUrl} name={project.name} height={buildingTier===null?0:buildingHeight(buildingTier,side)} side={side}/></a></g>;
        })}
      </svg>
    </div>
    {activeProject?<div className="city-project-detail" aria-live="polite"><b>{activeProject.name}</b><span>{money(mapScale(activeProject.tokenMetrics?.marketCapUsd).cap,zh)} · {t('Plot','地块')} {PLOT_TIERS[mapScale(activeProject.tokenMetrics?.marketCapUsd).plotTier??0].size}</span><span>{t('Select the plot to see its profile →','选中地块后可在侧栏打开项目详情 →')}</span></div>:null}
    <div className="city-scene-footer"><span>{t(`${projects.length} projects · ${priced} priced`,`${projects.length} 个项目 · ${priced} 个已有市值`)}</span><span>{t('Wheel to zoom · Drag to pan · Select a building','滚轮缩放 · 拖拽平移 · 点击建筑')}</span></div>
    </div>
    <div className="city-scale-guide" tabIndex={guideCollapsed?-1:0} role="region" aria-label={t('Project details','项目详情')}>
      <button className="city-guide-collapse" type="button" onClick={()=>setGuideCollapsed(value=>!value)} aria-expanded={!guideCollapsed} aria-label={guideCollapsed?t('Expand details panel','展开详情栏'):t('Collapse details panel','向右收起详情栏')} title={guideCollapsed?t('Expand details panel','展开详情栏'):t('Collapse details panel','向右收起详情栏')}>
        {guideCollapsed?<PanelRightOpen size={15}/>:<PanelRightClose size={15}/>}
        {guideCollapsed?<span>{t('DETAILS','详情')}</span>:null}
      </button>
      {!guideCollapsed?<>
      <div className="city-map-filters">
        <div className="city-search-wrap"><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} onFocus={()=>setSearchFocused(true)} onBlur={()=>window.setTimeout(()=>setSearchFocused(false),120)} onKeyDown={event=>{if(event.key==='Enter'&&matches[0]){event.preventDefault();selectProject(matches[0].slug);setQuery(matches[0].name);setSearchFocused(false);}}} placeholder={t('Find a project…','搜索项目…')} aria-label={t('Search projects','搜索项目')}/>{query?<button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>{setQuery('');setSearchFocused(true);}} aria-label={t('Clear search','清空搜索')}><X size={13}/></button>:null}
          {query.trim()&&searchFocused&&matches.length?<div className="city-search-results" role="listbox">{matches.slice(0,5).map(project=><button key={project.slug} type="button" role="option" aria-selected={selectedSlug===project.slug} onMouseDown={event=>event.preventDefault()} onClick={()=>{selectProject(project.slug);setQuery(project.name);setSearchFocused(false);}}><span>{project.symbol}</span><b>{project.name}</b></button>)}</div>:null}
        </div>
        <div className="city-filter-selects">
          <label><span className="sr-only">{t('Category','类别')}</span><select value={categoryFilter} onChange={event=>setCategoryFilter(event.target.value)} aria-label={t('Filter by category','按类别筛选')}><option value="all">{t('All categories','全部类别')}</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select></label>
          <label><span className="sr-only">{t('Market cap','市值')}</span><select value={capFilter} onChange={event=>setCapFilter(event.target.value as CapFilter)} aria-label={t('Filter by market cap','按市值筛选')}><option value="all">{t('All caps','全部市值')}</option>{capFilterOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}<option value="unpriced">{t('Unverified','暂无市值')}</option></select></label>
        </div>
        <div className="city-filter-count"><span>{t('MATCHING PROJECTS','匹配项目')}</span><b>{matches.length} / {projects.length}</b></div>
      </div>

      {selectedProject?<div className="city-selected-project" aria-live="polite">
        <div className="city-selected-head"><ProjectAvatar handle={selectedProject.handle} symbol={selectedProject.symbol} logoUrl={selectedProject.logoUrl} className="city-selected-avatar"/><div><b>{selectedProject.name}</b><span>{selectedProject.categories[0]||t('ARC ecosystem','ARC 生态')} · {selectedStatus}</span></div><button type="button" onClick={()=>{setSelectedSlug(null);}} aria-label={t('Clear selected project','清除选中项目')}><X size={14}/></button></div>
        <p>{zh?selectedProject.taglineZh||selectedProject.tagline:selectedProject.tagline}</p>
        <div className="city-selected-metrics"><span>{t('MARKET CAP','市值')} <b>{money(selectedCap.cap,zh)}</b></span><span>{t('BUILDING / PLOT','建筑 / 地块')} <b>{selectedBuildingTier?`${selectedBuildingTier.label} · `:''}{selectedCap.plotTier===null?'—':PLOT_TIERS[selectedCap.plotTier].size}</b></span></div>
        <div className="city-selected-source">{selectedProject.tokenMetrics?<><span>{metricSource(selectedProject.tokenMetrics.source,zh)}</span><span>{t('Updated','更新于')} {metricDate(selectedProject.tokenMetrics.updatedAt,zh)}</span>{selectedProject.tokenMetrics.sourceUrl?<a href={selectedProject.tokenMetrics.sourceUrl} target="_blank" rel="noreferrer">↗</a>:null}</>:<span>{t('Market cap has not been verified','暂无已验证的市值数据')}</span>}</div>
        <div className="city-project-actions"><button type="button" className="city-locate-button" onClick={()=>focusProject(selectedProject.slug)}><Crosshair size={12}/>{t('Locate','定位建筑')}</button><Link className="city-profile-link" href={profileHref!}>{t('Open profile','项目详情')} ↗</Link></div>
      </div>:<p className="city-selection-hint">{t('Select a building to view the project.','点击地图中的建筑，查看项目详情。')}</p>}

      </>:null}
    </div>
  </section>;
}
