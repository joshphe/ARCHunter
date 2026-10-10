'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DragEvent, KeyboardEvent } from 'react';
import ProjectTicker from './project-ticker';
import { useSiteVisits } from './site-visits-provider';
import { useEcosystemProjects } from './use-ecosystem-projects';
import { WORKSPACES, WORKSPACE_ORDER_KEY, parseWorkspaceOrder } from '@/lib/workspaces';
import type { Workspace } from '@/lib/workspaces';
import { ChevronDown, GripVertical, Menu, Moon, Sun, Users, X } from 'lucide-react';

const OverviewPage = dynamic(() => import('./overview-page'));
const EcosystemPage = dynamic(() => import('./ecosystem-page'));
const EcosystemMapPage = dynamic(() => import('./ecosystem-map-page'));
const LaunchpadPage = dynamic(() => import('./launchpad-page'));
const RugPage = dynamic(() => import('./rug-page'));
const CapitalPage = dynamic(() => import('./capital-page'));

export default function Home(){
 const [active,setActive]=useState('Overview'); const [mobileOpen,setMobileOpen]=useState(false);
 const {projects:ecosystemProjects,source:projectSource,refreshing:projectsRefreshing,error:projectsSyncError,refresh:refreshProjects}=useEcosystemProjects(active);
 const totalVisits=useSiteVisits();
 const [workspaceOrder,setWorkspaceOrder]=useState<Workspace[]>(()=>WORKSPACES.map(({key})=>key));
 const [workspaceOrderReady,setWorkspaceOrderReady]=useState(false);
 const [draggedWorkspace,setDraggedWorkspace]=useState<Workspace|null>(null);
 const [dropTarget,setDropTarget]=useState<Workspace|null>(null);
 const [isDark,setIsDark]=useState(true); const [language,setLanguage]=useState<'en'|'zh'>('en'); const tr=(en:string,zh:string)=>language==='zh'?zh:en; const router=useRouter();
 useEffect(()=>{const saved=localStorage.getItem('arcwatch-theme');if(saved==='light')setIsDark(false);const savedLanguage=localStorage.getItem('arcwatch-language');const initialLanguage=savedLanguage==='zh'?'zh':'en';setLanguage(initialLanguage);document.cookie=`arcwatch-language=${initialLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`},[]);
 useEffect(()=>{try{setWorkspaceOrder(parseWorkspaceOrder(localStorage.getItem(WORKSPACE_ORDER_KEY)))}catch{/* Keep the default order if browser storage is unavailable. */}finally{setWorkspaceOrderReady(true)}},[]);
 useEffect(()=>{if(!workspaceOrderReady)return;try{localStorage.setItem(WORKSPACE_ORDER_KEY,JSON.stringify(workspaceOrder))}catch{/* Keep workspace navigation usable when browser storage is disabled. */}},[workspaceOrder,workspaceOrderReady]);
 useEffect(()=>{const view=new URLSearchParams(window.location.search).get('view');if(view==='ecosystem')setActive('Ecosystem');if(view==='map')setActive('Map');if(view==='launchpad')setActive('Launchpad');if(view==='capital')setActive('Capital');if(view==='rug')setActive('Rug')},[]);
 useEffect(()=>{document.documentElement.dataset.theme=isDark?'dark':'light';localStorage.setItem('arcwatch-theme',isDark?'dark':'light')},[isDark]); useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en'},[language]);
 const reorderWorkspace=(from:Workspace,to:Workspace)=>setWorkspaceOrder((current)=>{const next=[...current];const fromIndex=next.indexOf(from);const toIndex=next.indexOf(to);if(fromIndex<0||toIndex<0||fromIndex===toIndex)return current;next.splice(fromIndex,1);next.splice(toIndex,0,from);return next});
 const moveWorkspace=(key:Workspace,direction:-1|1)=>setWorkspaceOrder((current)=>{const index=current.indexOf(key);const destination=index+direction;if(index<0||destination<0||destination>=current.length)return current;const next=[...current];[next[index],next[destination]]=[next[destination],next[index]];return next});
 const handleWorkspaceKeyDown=(event:KeyboardEvent<HTMLButtonElement>,key:Workspace)=>{if(!event.altKey)return;if(event.key==='ArrowUp'){event.preventDefault();moveWorkspace(key,-1)}else if(event.key==='ArrowDown'){event.preventDefault();moveWorkspace(key,1)}};
 const handleWorkspaceDragStart=(event:DragEvent<HTMLDivElement>,key:Workspace)=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',key);setDraggedWorkspace(key)};
 const handleWorkspaceDrop=(event:DragEvent<HTMLDivElement>,target:Workspace)=>{event.preventDefault();const source=draggedWorkspace??event.dataTransfer.getData('text/plain') as Workspace;if(source)reorderWorkspace(source,target);setDraggedWorkspace(null);setDropTarget(null)};
 return <main className={`shell${active==='Map'?' is-map-workspace':''}`}>
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
   <div className="brand"><div className="brand-mark"><span/></div><span>arc<span className="brand-light">watch</span></span><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
   <div className="network"><span className="network-dot"/> {tr('ARC Network','ARC 网络')} <ChevronDown size={14}/><span className="network-main">MAINNET</span></div>
   <div className="nav-label">{tr('WORKSPACE','工作区')}</div>
   <nav aria-label={tr('Workspaces','工作区')} aria-describedby="workspace-sort-help">{workspaceOrder.map((key)=>{const workspace=WORKSPACES.find((item)=>item.key===key)!;const Icon=workspace.Icon;return <div key={key} className={`workspace-nav-row ${dropTarget===key?'drop-target':''} ${draggedWorkspace===key?'is-dragging':''}`} draggable onDragStart={(event)=>handleWorkspaceDragStart(event,key)} onDragOver={(event)=>{event.preventDefault();setDropTarget(key)}} onDrop={(event)=>handleWorkspaceDrop(event,key)} onDragEnd={()=>{setDraggedWorkspace(null);setDropTarget(null)}} title={tr('Drag to reorder · Alt + ↑ / ↓ to move with keyboard','拖动排序 · 按 Alt + ↑ / ↓ 可用键盘调整')}>
    <button className={`nav-item ${active===key?'selected':''}`} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" onKeyDown={(event)=>handleWorkspaceKeyDown(event,key)} onClick={()=>{setActive(key);window.history.replaceState(null,'',`/?view=${key.toLowerCase()}`);setMobileOpen(false)}}><Icon size={17}/><span>{tr(key,workspace.label)}</span><GripVertical className="workspace-drag-icon" size={13} aria-hidden="true"/></button>
   </div>})}</nav><span id="workspace-sort-help" className="sr-only">{tr('Drag a workspace to reorder it, or focus it and press Alt plus the up or down arrow. Your order is saved in this browser.','拖动工作区即可排序，也可聚焦后按 Alt 加上方向键调整。排序会保存在此浏览器。')}</span>
   <div className="sidebar-visitor-count"><span className="sidebar-visitor-icon"><Users size={14}/></span><div className="sidebar-visitor-copy"><span>{tr('TOTAL VISITS','累计访问')}</span><b>{totalVisits===null?'—':new Intl.NumberFormat(language==='zh'?'zh-CN':'en-US').format(totalVisits)}</b></div></div>

  </aside>
  <section className="main-area"><header className="topbar"><button className="hamburger" onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={19}/></button><div className="breadcrumbs"><span>{tr('Workspace','工作区')}</span><span className="slash">/</span><b>{tr(active,({Overview:'概览',Ecosystem:'生态',Map:'生态地图',Capital:'资金与流动性',Launchpad:'发射台',Rug:'Rug 档案'} as Record<string,string>)[active]||active)}</b></div><div className="top-actions"><div className="live-indicator"><span/> {tr('LIVE DATA','实时数据')}</div><button className="language-button" onClick={()=>{const next=language==='en'?'zh':'en';setLanguage(next);localStorage.setItem('arcwatch-language',next);document.cookie=`arcwatch-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax`}} aria-label={language==='en'?'Switch to Chinese':'切换为英文'} title={language==='en'?'Switch to Chinese':'切换为英文'}>{language==='en'?'EN':'CN'}</button><button className="icon-button" aria-label={isDark?'切换到白天模式':'切换到夜间模式'} title={isDark?'白天模式':'夜间模式'} onClick={()=>setIsDark(!isDark)}>{isDark?<Sun size={17}/>:<Moon size={17}/>}</button></div></header>
  {active==='Overview'&&<ProjectTicker projects={ecosystemProjects} language={language} onSelectProject={(slug)=>{router.push(`/projects/${encodeURIComponent(slug)}`);setMobileOpen(false)}}/>}
  {active==='Rug'?<RugPage language={language}/>:active==='Launchpad'?<LaunchpadPage language={language} isDark={isDark} projects={ecosystemProjects}/>:active==='Ecosystem'?<EcosystemPage language={language} projects={ecosystemProjects} dataSource={projectSource} refreshing={projectsRefreshing} syncError={projectsSyncError} onRefresh={refreshProjects}/>:active==='Map'?<EcosystemMapPage language={language} projects={ecosystemProjects} dataSource={projectSource} refreshing={projectsRefreshing} syncError={projectsSyncError} onRefresh={refreshProjects}/>:active==='Capital'?<CapitalPage language={language} isDark={isDark}/>:<OverviewPage language={language} isDark={isDark} projects={ecosystemProjects} onNavigate={()=>setActive('Launchpad')}/> } </section>
  {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label={tr('Close menu','关闭菜单')}/>}</main>
}
