'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Search, Send, TriangleAlert } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import { riskLabels, evidenceLabels } from '@/lib/project-risk';
import ProjectAvatar from '@/app/project-avatar';
import { getProjectScore } from '@/lib/project-scoring';

type Props = { language: 'en' | 'zh'; projects: EcosystemProject[] };
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

const categoryLabel = (category: string, zh: boolean) => {
  if (!zh) return category;
  if (category === 'Prediction Markets') return '预测市场';
  if (category === 'Tokens') return '代币项目';
  return category;
};

export default function EcosystemPage({ language, projects }: Props) {
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
    const searchableText = `${project.tokenAddress ?? ''} ${project.symbol} ${project.name} ${project.handle} ${project.categories.join(' ')} ${project.tagline} ${project.description.en} ${project.description.zh}`;
    return (risk === 'all' || (project.riskReviews?.[0]?.priority ?? 'unassessed') === risk) && matchesCategory && matchesStatus && (!term || searchableText.toLowerCase().includes(term));
  }), [category, projects, query, status, risk]);
  const sortedProjects = useMemo(() => {
    if (sortBy === 'recommended') return filteredProjects;
    return [...filteredProjects].sort((a, b) => {
      if (sortBy === 'score') return (getProjectScore(b.scorecard).total ?? -1) - (getProjectScore(a.scorecard).total ?? -1);
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
      <div className="ecosystem-reviewed"><span className="ecosystem-reviewed-dot"/>{t('CURATED PROJECT INFO', '人工整理项目信息')}</div>
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
        <span>{t('PROJECT', '项目')}</span><span>{t('TAGS', '标签')}</span><span>{t('INTRODUCTION', '简介')}</span><span>{t('MARKET CAP', '市值')}</span><span>TVL</span><span>{t('SCORE', '观察分')}</span><span>{t('STATUS', '状态')}</span><span/>
      </div>
      <div className="ecosystem-table-body">
        {visibleProjects.map((project) => {
          const marketValue = project.tokenMetrics?.marketCapUsd ?? null;
          const score = getProjectScore(project.scorecard).total;
          const review = project.riskReviews?.[0];
          return <Link href={`/projects/${encodeURIComponent(project.slug)}`} className="ecosystem-table-row" key={project.slug} onClick={rememberScroll}>
            <span className="ecosystem-table-project"><ProjectAvatar handle={project.handle} symbol={project.symbol}/><span><span className="ecosystem-project-name"><b>{project.name}</b><span className={`ecosystem-risk-badge risk-${review?.priority ?? 'unassessed'}`} title={t('Review priority, not a probability of fraud.','核查优先级，不是跑路概率。')}><TriangleAlert size={11} aria-hidden="true"/>{riskLabels[review?.priority ?? 'unassessed'][language]}</span></span><small>{project.handle}</small>{review && <small>{evidenceLabels[review.evidenceStatus][language]} · {review.reviewedOn}</small>}</span></span>
            <span className="ecosystem-table-tags">{project.categories.slice(0, 3).map((item) => <i key={item}>{categoryLabel(item, zh)}</i>)}</span>
            <span className="ecosystem-table-description">{zh ? project.taglineZh || project.tagline : project.tagline}</span>
            <span className="ecosystem-table-value"><small>{t('MARKET CAP', '市值')}</small><b className={marketValue == null ? 'not-indexed' : ''}>{amount(marketValue, zh)}</b></span>
            <span className="ecosystem-table-value ecosystem-table-tvl"><small>TVL</small><b className={project.tvl == null ? 'not-indexed' : ''}>{amount(project.tvl,zh)}</b></span>
            <span className={`ecosystem-score-value ${score == null ? 'unrated' : ''}`}><b>{score ?? '—'}</b>{score != null ? <small>/100</small> : null}</span>
            <span className={`ecosystem-status ${project.status}`}>{project.status === 'beta' ? t('BETA', '测试版') : project.status === 'live' ? t('LIVE', '已上线') : t('UPCOMING', '即将上线')}</span>
            <ChevronRight className="ecosystem-row-arrow" size={16}/>
          </Link>;
        })}
      </div>
      <nav className="ecosystem-pagination" aria-label={t('Project pages', '项目分页')}>
        <span>{t(`${firstVisibleProject}–${lastVisibleProject} of ${filteredProjects.length}`, `显示 ${firstVisibleProject}–${lastVisibleProject} 项，共 ${filteredProjects.length} 项`)}</span>
        <div><button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label={t('Previous page', '上一页')}><ChevronLeft size={14}/></button><b>{currentPage} / {pageCount}</b><button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label={t('Next page', '下一页')}><ChevronRight size={14}/></button></div>
      </nav>
    </section> : <div className="ecosystem-empty"><Search size={19}/><b>{projects.length === 0 ? t('Loading project directory…', '正在加载项目目录…') : t('No projects match your search.', '没有找到匹配的项目。')}</b><span>{projects.length === 0 ? t('Fetching curated data.', '正在读取已整理的项目信息。') : t('Try a different name or category.', '试试其他项目名称或类别。')}</span></div>}

    <div className="ecosystem-data-note"><span>ⓘ</span><p>{t('Market cap measures token value; TVL measures assets in the protocol. They are shown and sorted separately. Market data loads when you enter this workspace.', '市值衡量代币价值，TVL 衡量协议锁定资产，两者独立展示和排序。行情在进入工作区时加载，不自动刷新。')}</p></div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href="https://unavatar.io" target="_blank" rel="noreferrer">{t('Avatars by Unavatar', '头像由 Unavatar 提供')}</a></span></footer>
  </div>;
}
