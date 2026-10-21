'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Search, Send } from 'lucide-react';
import type { ProjectSummary } from '@/lib/project-schema';
import { riskLabels } from '@/lib/project-risk';
import ProjectAvatar from '@/app/project-avatar';
import ProjectDirectorySync from './project-directory-sync';
import type { DirectorySyncProps } from './project-directory-sync';

type Props = { language: 'en' | 'zh'; projects: ProjectSummary[] } & DirectorySyncProps;
const PROJECTS_PER_PAGE = 10;

const categories = [
  { en: 'All projects', zh: '全部项目', value: 'all' },
  { en: 'DeFi', zh: 'DeFi', value: 'DeFi' },
  { en: 'Prediction markets', zh: '预测市场', value: 'Prediction Markets' },
  { en: 'Token projects', zh: '代币项目', value: 'Tokens' },
];

const amount = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);

const httpUrl = (value: string | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const categoryLabel = (category: string, zh: boolean) => {
  if (!zh) return category;
  if (category === 'Prediction Markets') return '预测市场';
  if (category === 'Tokens') return '代币项目';
  return category;
};

export default function EcosystemPage({ language, projects, ...syncProps }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'score' | 'market-cap' | 'tvl' | 'recent'>('recommended');
  const [page, setPage] = useState(1);
  const [risk, setRisk] = useState('all');
  const [ready, setReady] = useState(false);
  const restoreScroll = useRef<number | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let saved: Record<string, string> = {};
    try { saved = JSON.parse(sessionStorage.getItem('archunter-directory') ?? '{}'); } catch { /* Use defaults. */ }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const explicit = ['q','category','status','sort','page','risk'].some(k => params.has(k));
    const read = (k: string) => explicit ? params.get(k) ?? '' : typeof saved[k] === 'string' ? saved[k] : '';
    setQuery(read('q'));
    setCategory(categories.some(c=>c.value===read('category'))?read('category'):'all');
    setStatus(['live','beta','upcoming'].includes(read('status'))?read('status'):'all');
    setSortBy(['recommended','score','market-cap','tvl','recent'].includes(read('sort'))?read('sort') as typeof sortBy:'recommended');
    setRisk(['priority','watch','limited','unassessed'].includes(read('risk'))?read('risk'):'all');
    setPage(Math.min(100000,Math.max(1,Number.parseInt(read('page'),10)||1)));
    if (!explicit || saved.url === window.location.search) restoreScroll.current = Math.max(0,Number(saved.scroll)||0);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({view:'ecosystem',q:query,category,status,sort:sortBy,page:String(page),risk});
    window.history.replaceState(window.history.state,'','/?'+params);
    try { sessionStorage.setItem('archunter-directory',JSON.stringify({q:query,category,status,sort:sortBy,page:String(page),risk,url:'?'+params,scroll:String(restoreScroll.current ?? window.scrollY)})); } catch { /* URL still preserves filters. */ }
  }, [ready,query,category,status,sortBy,page,risk]);
  useEffect(() => {
    if (!ready || !projects.length || restoreScroll.current === null) return;
    const frame=requestAnimationFrame(()=>{window.scrollTo(0,restoreScroll.current ?? 0);restoreScroll.current=null;});
    return ()=>cancelAnimationFrame(frame);
  }, [ready,projects]);
  function rememberScroll() {
    try { const saved=JSON.parse(sessionStorage.getItem('archunter-directory') ?? '{}'); sessionStorage.setItem('archunter-directory',JSON.stringify({...saved,scroll:String(window.scrollY)})); } catch { /* Storage is optional. */ }
  }

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesCategory = category === 'all' || project.categories.includes(category);
    const matchesStatus = status === 'all' || project.status === status;
    const term = query.trim().toLowerCase();
    const searchableText = `${project.tokenAddress ?? ''} ${project.symbol} ${project.name} ${project.handle} ${project.categories.join(' ')} ${project.tagline} ${project.taglineZh}`;
    return (risk === 'all' || (project.riskReview?.priority ?? 'unassessed') === risk) && matchesCategory && matchesStatus && (!term || searchableText.toLowerCase().includes(term));
  }), [category, projects, query, status, risk]);
  const sortedProjects = useMemo(() => {
    if (sortBy === 'recommended') return filteredProjects;
    return [...filteredProjects].sort((a, b) => {
      if (sortBy === 'score') return (b.observationScore ?? -1) - (a.observationScore ?? -1);
      if (sortBy === 'market-cap') return (b.tokenMetrics?.marketCapUsd ?? -1) - (a.tokenMetrics?.marketCapUsd ?? -1);
      if (sortBy === 'tvl') return (b.tvl ?? -1) - (a.tvl ?? -1);
      return b.verifiedOn.localeCompare(a.verifiedOn);
    });
  }, [filteredProjects, sortBy]);
  const pageCount = Math.max(1, Math.ceil(sortedProjects.length / PROJECTS_PER_PAGE));
  const currentPage = Math.min(page,pageCount);
  const visibleProjects = sortedProjects.slice((currentPage - 1) * PROJECTS_PER_PAGE, currentPage * PROJECTS_PER_PAGE);
  const firstVisibleProject = sortedProjects.length ? (currentPage - 1) * PROJECTS_PER_PAGE + 1 : 0;
  const lastVisibleProject = Math.min(currentPage * PROJECTS_PER_PAGE, sortedProjects.length);

  if (!ready) return <div className="content" role="status">{t('Loading directory…','正在读取列表…')}</div>;
  return <div className="content ecosystem-content">
    <aside className="ecosystem-contact-banner">
      <span className="ecosystem-contact-icon"><Send size={17}/></span>
      <div className="ecosystem-contact-copy">
        <span>{t('ARC ECOSYSTEM · PROJECT INVITATION', 'ARC 生态 · 项目征集')}</span>
        <b>{t('Want a project you’re involved in featured here?', '想让你参与的项目也出现在这里？')}</b>
        <small>{t('Get in touch on Telegram and tell us about it.', '欢迎通过 Telegram 联系我，介绍你的项目。')}</small>
      </div>
      <a href="https://t.me/Joshphe" target="_blank" rel="noreferrer"><span>{t('Contact', '联系我')}</span><b>@Joshphe</b><ExternalLink size={14}/></a>
    </aside>

    <div className="page-heading ecosystem-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC PROJECT DIRECTORY', 'ARC 项目目录')}<span className="eyebrow-line"/></div>
        <h1>{t('Ecosystem', '生态')} <span>{t('Projects', '项目')}</span></h1>
        <p className="subtitle">{t('Browse projects building across Arc. Open a row to view the full profile.', '浏览 Arc 生态项目，点击列表行进入完整项目详情。')}</p>
      </div>
      <ProjectDirectorySync language={language} {...syncProps}/>
    </div>

    <section className="ecosystem-toolbar" aria-label={t('Project search and filters', '项目搜索与筛选')}>
      <label className="ecosystem-search"><Search size={15}/><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={t('Search name, symbol or contract', '搜索项目名、代币或合约')} aria-label={t('Search projects', '搜索项目')}/></label>
      <div className="ecosystem-filters" aria-label={t('Filter by category', '按类别筛选')}>
        {categories.map((item) => <button key={item.value} type="button" className={category === item.value ? 'active' : ''} onClick={() => { setCategory(item.value); setPage(1); }}>{t(item.en, item.zh)}</button>)}
      </div>
      <div className="ecosystem-filter-selects">
        <label>{t('Risk review','风险分级')}<select value={risk} onChange={e=>{setRisk(e.target.value);setPage(1);}}><option value="all">{t('All','全部')}</option>{Object.entries(riskLabels).map(([k,v])=><option key={k} value={k}>{zh?v.zh:v.en}</option>)}</select></label>
        <label>{t('Status', '状态')}<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">{t('All', '全部')}</option><option value="live">{t('Live', '已上线')}</option><option value="beta">{t('Beta', '测试版')}</option><option value="upcoming">{t('Upcoming', '即将上线')}</option></select></label>
        <label>{t('Sort', '排序')}<select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setPage(1); }}><option value="recommended">{t('Recommended', '推荐优先')}</option><option value="score">{t('Observation score', '观察分')}</option><option value="market-cap">{t('Market cap', '市值')}</option><option value="tvl">TVL</option><option value="recent">{t('Recently verified', '最近核验')}</option></select></label>
      </div>
    </section>

    <div className="ecosystem-results-bar"><span>{t('CURATED DIRECTORY', '精选项目目录')}</span><b>{zh ? `${String(sortedProjects.length).padStart(2, '0')} 个项目` : `${sortedProjects.length} ${sortedProjects.length === 1 ? 'project' : 'projects'}`}</b><i/><span>{t('Select a project for details', '选择项目查看详情')}</span></div>

    {visibleProjects.length > 0 ? <section className="ecosystem-table ecosystem-directory-table" aria-label={t('Project directory', '项目目录')}>
      <div className="ecosystem-table-head" aria-hidden="true">
        <span>{t('PROJECT', '项目')}</span><span>{t('TAGS', '标签')}</span><span>{t('INTRODUCTION', '简介')}</span><span>{t('MARKET CAP', '市值')}</span><span>{t('QUICK LINKS', '快捷访问')}</span>
      </div>
      <div className="ecosystem-table-body">
        {visibleProjects.map((project) => {
          const marketValue = project.tokenMetrics?.marketCapUsd ?? null;
          const links = [
            {
              label: 'OKX',
              href: project.tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(project.tokenAddress)
                ? `https://web3.okx.com/${zh ? 'zh-hans' : 'en'}/token/arc/${project.tokenAddress}`
                : null,
              title: t('Trade token on OKX', '在 OKX 查看并交易代币'),
              unavailable: t('Token contract not listed', '暂未收录代币合约'),
            },
            { label: 'X', href: httpUrl(project.x), title: t('Official X account', '官方 X 账号'), unavailable: t('Official X account not listed', '暂未收录官方 X 账号') },
            { label: t('Website', '官网'), href: httpUrl(project.website), title: t('Official website', '项目官网'), unavailable: t('Official website not listed', '暂未收录官网') },
          ];
          return <article className="ecosystem-table-row" key={project.slug}>
            <Link href={`/projects/${encodeURIComponent(project.slug)}`} className="ecosystem-table-project" onClick={rememberScroll} aria-label={`${project.name} · ${t('View project details', '查看项目详情')}`}><ProjectAvatar handle={project.handle} symbol={project.symbol} logoUrl={project.logoUrl}/><span><span className="ecosystem-project-name"><b>{project.name}</b></span><small>{project.handle}</small></span></Link>
            <span className="ecosystem-table-tags">{project.categories.slice(0, 3).map((item) => <i key={item}>{categoryLabel(item, zh)}</i>)}</span>
            <span className="ecosystem-table-description">{zh ? project.taglineZh || project.tagline : project.tagline}</span>
            <span className="ecosystem-table-value"><small>{t('MARKET CAP', '市值')}</small><b className={marketValue == null ? 'not-indexed' : ''}>{amount(marketValue, zh)}</b></span>
            <div className="ecosystem-project-links" role="group" aria-label={`${project.name} · ${t('Quick links', '快捷访问')}`}>
              {links.map((link) => link.href
                ? <a key={link.label} className="ecosystem-project-link" href={link.href} target="_blank" rel="noopener noreferrer" title={link.title} aria-label={`${project.name} · ${link.title} (${t('opens in a new tab', '新标签页打开')})`}>{link.label}<ExternalLink size={12} aria-hidden="true"/></a>
                : <span key={link.label} className="ecosystem-project-link is-disabled" role="link" aria-disabled="true" title={link.unavailable} aria-label={`${project.name} · ${link.unavailable}`}>{link.label}<ExternalLink size={12} aria-hidden="true"/></span>)}
            </div>
          </article>;
        })}
      </div>
      <nav className="ecosystem-pagination" aria-label={t('Project pages', '项目分页')}>
        <span>{t(`${firstVisibleProject}–${lastVisibleProject} of ${filteredProjects.length}`, `显示 ${firstVisibleProject}–${lastVisibleProject} 项，共 ${filteredProjects.length} 项`)}</span>
        <div><button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label={t('Previous page', '上一页')}><ChevronLeft size={14}/></button><b>{currentPage} / {pageCount}</b><button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label={t('Next page', '下一页')}><ChevronRight size={14}/></button></div>
      </nav>
    </section> : <div className="ecosystem-empty"><Search size={19}/><b>{projects.length === 0 ? (syncProps.syncError ? t('Could not sync the project directory', '项目目录同步失败') : t('Loading project directory…', '正在加载项目目录…')) : t('No projects match your search.', '没有找到匹配的项目。')}</b><span>{projects.length === 0 ? (syncProps.syncError ? t('Use Refresh to try again.', '请点击刷新项目重试。') : t('Fetching curated data.', '正在读取已整理的项目信息。')) : t('Try a different name or category.', '试试其他项目名称或类别。')}</span></div>}

    <div className="ecosystem-data-note"><span>ⓘ</span><p>{t('Market cap measures token value. Quick links open the project’s token page, official X account and website in a new tab. The directory syncs on entry, when returning to this page, and every two minutes while visible. Market data uses a separate short cache.', '市值衡量代币价值。快捷按钮在新标签页打开代币交易页、官方 X 账号和官网。目录在进入工作区、返回页面和可见时每两分钟同步；行情数据采用独立短缓存。')}</p></div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href="https://unavatar.io" target="_blank" rel="noreferrer">{t('Avatars by Unavatar', '头像由 Unavatar 提供')}</a></span></footer>
  </div>;
}
