'use client';
import { useEffect, useState } from 'react';
import LaunchpadPage from './launchpad-page';
import OverviewPage from './overview-page';
import EcosystemPage from './ecosystem-page';
import { ChevronDown, Compass, LayoutDashboard, Menu, Moon, Sparkles, Sun, X } from 'lucide-react';

export default function Home(){
 const [active,setActive]=useState('Overview'); const [mobileOpen,setMobileOpen]=useState(false);
 const [isDark,setIsDark]=useState(true); const [language,setLanguage]=useState<'en'|'zh'>('en'); const tr=(en:string,zh:string)=>language==='zh'?zh:en;
 useEffect(()=>{const saved=localStorage.getItem('arcwatch-theme');if(saved==='light')setIsDark(false);const savedLanguage=localStorage.getItem('arcwatch-language');if(savedLanguage==='zh')setLanguage('zh')},[]);
 useEffect(()=>{document.documentElement.dataset.theme=isDark?'dark':'light';localStorage.setItem('arcwatch-theme',isDark?'dark':'light')},[isDark]); useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en';localStorage.setItem('arcwatch-language',language)},[language]);
 return <main className="shell">
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
   <div className="brand"><div className="brand-mark"><span/></div><span>arc<span className="brand-light">watch</span></span><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
   <div className="network"><span className="network-dot"/> {tr('ARC Network','ARC 网络')} <ChevronDown size={14}/><span className="network-main">MAINNET</span></div>
   <div className="nav-label">{tr('WORKSPACE','工作区')}</div>
   <nav>{[['Overview',LayoutDashboard],['Ecosystem',Compass],['Launchpad',Sparkles]].map(([label,Icon]:any)=><button key={label} className={`nav-item ${active===label?'selected':''}`} onClick={()=>{setActive(label);setMobileOpen(false)}}><Icon size={17}/><span>{tr(label,({Overview:'概览',Ecosystem:'生态',Launchpad:'发射台'} as Record<string,string>)[label]||label)}</span>{label==='Ecosystem'&&<span className="nav-count">01</span>}</button>)}</nav>

  </aside>
  <section className="main-area"><header className="topbar"><button className="hamburger" onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={19}/></button><div className="breadcrumbs"><span>{tr('Workspace','工作区')}</span><span className="slash">/</span><b>{tr(active,({Overview:'概览',Ecosystem:'生态',Launchpad:'发射台'} as Record<string,string>)[active]||active)}</b></div><div className="top-actions"><div className="live-indicator"><span/> {tr('LIVE DATA','实时数据')}</div><button className="language-button" onClick={()=>setLanguage(language==='en'?'zh':'en')} aria-label={language==='en'?'Switch to Chinese':'切换为英文'} title={language==='en'?'Switch to Chinese':'切换为英文'}>{language==='en'?'EN':'CN'}</button><button className="icon-button" aria-label={isDark?'切换到白天模式':'切换到夜间模式'} title={isDark?'白天模式':'夜间模式'} onClick={()=>setIsDark(!isDark)}>{isDark?<Sun size={17}/>:<Moon size={17}/>}</button></div></header>
  {active==='Launchpad'?<LaunchpadPage language={language} isDark={isDark}/>:active==='Ecosystem'?<EcosystemPage language={language}/>:<OverviewPage language={language} isDark={isDark} onNavigate={()=>setActive('Launchpad')}/> } </section>
  {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label={tr('Close menu','关闭菜单')}/>}</main>
}
