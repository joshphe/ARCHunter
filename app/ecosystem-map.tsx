'use client';


import Link from 'next/link';
import CityBuilding from './city-building';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Crosshair, Maximize2, PanelRightClose, PanelRightOpen, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { ProjectSummary } from '@/lib/project-schema';
import { BUILDING_TIERS, PLOT_TIERS, layoutMap, mapScale } from '@/lib/ecosystem-map-layout';
import ProjectAvatar from '@/app/project-avatar';
import { readMapView, saveMapView, type MapViewState } from '@/lib/map-view-state';
import EcosystemMapScene from './ecosystem-map-scene';

type Props = { projects: ProjectSummary[]; language: 'en' | 'zh' };
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
  const viewportRef=useRef<HTMLDivElement>(null);
  const sceneLayerRef=useRef<HTMLDivElement>(null);
  const mapRef=useRef<SVGSVGElement>(null);
  const zoomRef=useRef(1);
  const restoreView=useRef<MapViewState|null>(null);
  const viewReady=useRef(false);
  const [viewLoaded,setViewLoaded]=useState(false);
  const saveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const persistLatest=useRef<(()=>void)|null>(null);
  const camera=useRef<{centerX:number;centerY:number}|null>(null);
  const lastGeometry=useRef('');
  useEffect(()=>{
    const saved=readMapView();
    restoreView.current=saved;
    if(saved){
      zoomRef.current=saved.zoom;
      setZoom(saved.zoom);
      setSelectedSlug(saved.selectedSlug);
      setQuery(saved.query);
      setCategoryFilter(saved.category);
      setCapFilter(saved.cap as CapFilter);
      setGuideCollapsed(saved.collapsed);
    }
    setViewLoaded(true);
  },[]);
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
    requestAnimationFrame(()=>persistLatest.current?.());
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
  const gesture=useRef<{id:number;x:number;y:number;left:number;top:number;nextLeft:number;nextTop:number;maxLeft:number;maxTop:number;scaleX:number;scaleY:number;moved:boolean}|null>(null);
  const panFrame=useRef<number|null>(null);
  const suppressClick=useRef(false);
  const commitPan=useCallback(()=>{
    if(panFrame.current!==null)cancelAnimationFrame(panFrame.current);
    panFrame.current=null;
    const pan=gesture.current,viewport=viewportRef.current,layer=sceneLayerRef.current;
    gesture.current=null;
    if(!pan||!viewport||!layer)return;
    if(pan.moved){
      suppressClick.current=true;
      // Commit once on release; while dragging only the composited HTML layer moves.
      viewport.scrollTo({left:pan.nextLeft,top:pan.nextTop,behavior:'instant'});
    }
    layer.style.transform='';
    layer.style.willChange='';
    viewport.classList.remove('is-dragging');
  },[]);
  const startPan=(event:PointerEvent<HTMLDivElement>)=>{
    if(!event.isPrimary||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    suppressClick.current=false;
    if(saveTimer.current!==null)clearTimeout(saveTimer.current);
    saveTimer.current=null;
    const viewport=event.currentTarget;
    viewport.scrollTo({left:viewport.scrollLeft,top:viewport.scrollTop,behavior:'instant'});
    const bounds=viewport.getBoundingClientRect();
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,nextLeft:viewport.scrollLeft,nextTop:viewport.scrollTop,maxLeft:Math.max(0,viewport.scrollWidth-viewport.clientWidth),maxTop:Math.max(0,viewport.scrollHeight-viewport.clientHeight),scaleX:bounds.width/viewport.clientWidth,scaleY:bounds.height/viewport.clientHeight,moved:false};
    if(sceneLayerRef.current)sceneLayerRef.current.style.willChange='transform';
  };
  const movePan=(event:PointerEvent<HTMLDivElement>)=>{
    const pan=gesture.current;
    if(!pan||pan.id!==event.pointerId)return;
    const dx=event.clientX-pan.x,dy=event.clientY-pan.y;
    if(!pan.moved&&Math.hypot(dx,dy)<6)return;
    if(!pan.moved){
      pan.moved=true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('is-dragging');
      setActiveSlug(null);
    }
    event.preventDefault();
    pan.nextLeft=Math.max(0,Math.min(pan.maxLeft,pan.left-dx/pan.scaleX));
    pan.nextTop=Math.max(0,Math.min(pan.maxTop,pan.top-dy/pan.scaleY));
    if(panFrame.current!==null)return;
    panFrame.current=requestAnimationFrame(()=>{
      panFrame.current=null;
      const current=gesture.current,layer=sceneLayerRef.current;
      if(current&&layer)layer.style.transform=`translate3d(${current.left-current.nextLeft}px,${current.top-current.nextTop}px,0)`;
    });
  };
  const endPan=(event:PointerEvent<HTMLDivElement>)=>{
    const pan=gesture.current;
    if(!pan||pan.id!==event.pointerId)return;
    commitPan();
    persistLatest.current?.();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const hoverProject=useCallback((slug:string|null)=>{
    if(!gesture.current?.moved)setActiveSlug(slug);
  },[]);
  const layout=useMemo(()=>layoutMap(projects),[projects]);
  const {origin,width,height}=layout;
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
  const persistView=useCallback(()=>{
    const viewport=viewportRef.current,map=mapRef.current;
    if(gesture.current?.moved||!viewReady.current||!viewport||!map)return;
    const view=viewport.getBoundingClientRect(),scene=map.getBoundingClientRect();
    if(!scene.width||!scene.height)return;
    // Coordinates relative to the island origin survive new streets and screen resizing.
    const center={
      centerX:(view.left+view.width/2-scene.left)/scene.width*width-origin.x,
      centerY:(view.top+view.height/2-scene.top)/scene.height*height-origin.y};
    camera.current=center;
    saveMapView({version:2,zoom:zoomRef.current,...center,
      selectedSlug,query,category:categoryFilter,cap:capFilter,collapsed:guideCollapsed});
  },[width,height,origin.x,origin.y,selectedSlug,query,categoryFilter,capFilter,guideCollapsed]);
  useLayoutEffect(()=>{persistLatest.current=persistView;},[persistView]);
  useLayoutEffect(()=>{
    if(!viewLoaded||fittedWidth===null||!fittedWidth)return;
    const geometry=`${width}:${height}:${origin.x}:${origin.y}:${fittedWidth}`;
    if(viewReady.current&&lastGeometry.current===geometry)return;
    const saved=viewReady.current?camera.current:restoreView.current,viewport=viewportRef.current,map=mapRef.current;
    if(!viewport||!map)return;
    if(saved){
      const view=viewport.getBoundingClientRect(),scene=map.getBoundingClientRect();
      if(!scene.width||!scene.height||!view.width||!view.height)return;
      viewport.scrollLeft+=(scene.left+(origin.x+saved.centerX)/width*scene.width-view.left-view.width/2)*viewport.clientWidth/view.width;
      viewport.scrollTop+=(scene.top+(origin.y+saved.centerY)/height*scene.height-view.top-view.height/2)*viewport.clientHeight/view.height;
    }
    viewReady.current=true;
    lastGeometry.current=geometry;
    restoreView.current=null;
    persistLatest.current?.();
  },[viewLoaded,fittedWidth,width,height,origin.x,origin.y,zoom]);
  useEffect(()=>{persistLatest.current?.();},[zoom,selectedSlug,query,categoryFilter,capFilter,guideCollapsed]);
  useEffect(()=>{
    const save=()=>persistLatest.current?.();
    window.addEventListener('pagehide',save);
    return ()=>{
      window.removeEventListener('pagehide',save);
      if(saveTimer.current!==null)clearTimeout(saveTimer.current);
    };
  },[]);
  useLayoutEffect(()=>()=>{commitPan();persistLatest.current?.();},[commitPan]);
  const scheduleSave=()=>{
    if(gesture.current?.moved)return;
    if(saveTimer.current!==null)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>persistLatest.current?.(),100);
  };
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
  const focusProject=useCallback((slug:string)=>{
    requestAnimationFrame(()=>{
      const viewport=viewportRef.current;
      const target=viewport?.querySelector<SVGGraphicsElement>(`[data-project="${slug}"]`);
      if(!viewport||!target)return;
      const view=viewport.getBoundingClientRect(),item=target.getBoundingClientRect();
      viewport.scrollTo({left:viewport.scrollLeft+(item.left+item.width/2-view.left-view.width/2)*viewport.clientWidth/view.width,top:viewport.scrollTop+(item.top+item.height/2-view.top-view.height/2)*viewport.clientHeight/view.height,behavior:'smooth'});
    });
  },[]);
  const selectProject=useCallback((slug:string)=>{
    // Pointer focus happens before a drag is known; only keyboard focus selects here.
    if(gesture.current)return;
    setSelectedSlug(slug);
    setGuideCollapsed(false);
    focusProject(slug);
  },[focusProject]);
  const activeProject=projects.find(p=>p.slug===activeSlug);
  const priced=projects.filter(project=>mapScale(project.tokenMetrics?.marketCapUsd).cap!==null).length;
  const filtersActive=Boolean(query.trim())||categoryFilter!=='all'||capFilter!=='all';
  const capFilterOptions=[
    {value:'0',label:PLOT_TIERS[0].label},{value:'1',label:PLOT_TIERS[1].label},{value:'2',label:PLOT_TIERS[2].label},
    {value:'3',label:PLOT_TIERS[3].label},{value:'4',label:PLOT_TIERS[4].label},
  ] as const;
  const selectedCap=mapScale(selectedProject?.tokenMetrics?.marketCapUsd);
  const selectedBuildingTier=selectedCap.buildingTier===null?null:BUILDING_TIERS[selectedCap.buildingTier];
  const selectedStatus=selectedProject?.status==='live'?t('LIVE','已上线'):selectedProject?.status==='beta'?t('BETA','测试中'):t('UPCOMING','即将推出');
  const profileHref=selectedProject?`/projects/${encodeURIComponent(selectedProject.slug)}?from=map`:undefined;

  return <section className={`ecosystem-map-card${guideCollapsed?' is-guide-collapsed':''}`} aria-label={t('Arc ecosystem map','Arc 生态地图')}>
    <div className="city-scene">
    <div className="ecosystem-map-toolbar">
      <div className="ecosystem-map-tools">
        <button type="button" disabled={zoom>=MAX_ZOOM} onClick={()=>changeZoom(zoomRef.current+.2)} aria-label={t('Zoom in','放大地图')}><ZoomIn size={15}/></button>
        <button type="button" disabled={zoom<=MIN_ZOOM} onClick={()=>changeZoom(zoomRef.current-.2)} aria-label={t('Zoom out','缩小地图')}><ZoomOut size={15}/></button>
        <button type="button" onClick={resetView} aria-label={t('Fit entire map','适配全图')} title={t('Fit entire map','适配全图')}><Maximize2 size={14}/></button>
      </div>
    </div>
    <div ref={viewportRef} className="ecosystem-map-viewport" tabIndex={0} role="region" aria-label={t('City map · wheel to zoom · drag to pan','城市地图 · 滚轮缩放 · 拖拽平移')}
      onScroll={scheduleSave}
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}
      onPointerLeave={()=>{if(gesture.current&&!gesture.current.moved)commitPan();}}
      onDragStart={event=>event.preventDefault()}
      onClickCapture={event=>{if(suppressClick.current&&event.detail!==0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}>
      <div ref={sceneLayerRef} className="city-camera-layer" style={{width:fittedWidth===null?`${zoom*100}%`:`${fittedWidth*zoom}px`}}>
        <EcosystemMapScene layout={layout} language={language} selectedSlug={selectedSlug} matchedSlugs={filtersActive?matchedSlugs:null} onSelect={selectProject} onHover={hoverProject} mapRef={mapRef}/>
      </div>
    </div>
    {activeProject?<div className="city-project-detail" aria-live="polite"><b>{activeProject.name}</b><span>{money(mapScale(activeProject.tokenMetrics?.marketCapUsd).cap,zh)} · {t('Fixed plot','固定地块')}</span><span>{t('Select the plot to see its profile →','选中地块后可在侧栏打开项目详情 →')}</span></div>:null}
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
        <div className="city-selected-metrics"><span>{t('MARKET CAP','市值')} <b>{money(selectedCap.cap,zh)}</b></span><span>{t('BUILDING TIER','建筑等级')} <b>{selectedBuildingTier?selectedBuildingTier.label:'—'}</b></span></div>
        <div className="city-selected-source">{selectedProject.tokenMetrics?<><span>{metricSource(selectedProject.tokenMetrics.source,zh)}</span><span>{t('Updated','更新于')} {metricDate(selectedProject.tokenMetrics.updatedAt,zh)}</span>{selectedProject.tokenMetrics.sourceUrl?<a href={selectedProject.tokenMetrics.sourceUrl} target="_blank" rel="noreferrer">↗</a>:null}</>:<span>{t('Market cap has not been verified','暂无已验证的市值数据')}</span>}</div>
        <div className="city-project-actions"><button type="button" className="city-locate-button" onClick={()=>focusProject(selectedProject.slug)}><Crosshair size={12}/>{t('Locate','定位建筑')}</button><Link className="city-profile-link" href={profileHref!} onClick={persistView}>{t('Open profile','项目详情')} ↗</Link></div>
      </div>:<p className="city-selection-hint">{t('Select a building to view the project.','点击地图中的建筑，查看项目详情。')}</p>}

      </>:null}
    </div>
  </section>;
}
