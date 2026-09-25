'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Search, Send } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';

type Props = { language: 'en' | 'zh'; projects: EcosystemProject[] };
const PROJECTS_PER_PAGE = 8;

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
  const [page, setPage] = useState(1);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesCategory = category === 'all' || project.categories.includes(category);
    const term = query.trim().toLowerCase();
    const searchableText = `${project.name} ${project.handle} ${project.categories.join(' ')} ${project.tagline} ${project.description.en} ${project.description.zh}`;
    return matchesCategory && (!term || searchableText.toLowerCase().includes(term));
  }), [category, projects, query]);
  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));
  const visibleProjects = filteredProjects.slice((page - 1) * PROJECTS_PER_PAGE, page * PROJECTS_PER_PAGE);
  const firstVisibleProject = filteredProjects.length ? (page - 1) * PROJECTS_PER_PAGE + 1 : 0;
  const lastVisibleProject = Math.min(page * PROJECTS_PER_PAGE, filteredProjects.length);

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
      <label className="ecosystem-search"><Search size={15}/><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={t('Search projects or categories', '搜索项目或类别')} aria-label={t('Search projects', '搜索项目')}/></label>
      <div className="ecosystem-filters" aria-label={t('Filter by category', '按类别筛选')}>
        {categories.map((item) => <button key={item.value} type="button" className={category === item.value ? 'active' : ''} onClick={() => { setCategory(item.value); setPage(1); }}>{t(item.en, item.zh)}</button>)}
      </div>
    </section>

    <div className="ecosystem-results-bar"><span>{t('CURATED DIRECTORY', '精选项目目录')}</span><b>{zh ? `${String(filteredProjects.length).padStart(2, '0')} 个项目` : `${filteredProjects.length} ${filteredProjects.length === 1 ? 'project' : 'projects'}`}</b><i/><span>{t('Select a project for details', '选择项目查看详情')}</span></div>

    {visibleProjects.length > 0 ? <section className="ecosystem-table" aria-label={t('Project directory', '项目目录')}>
      <div className="ecosystem-table-head" aria-hidden="true">
        <span>{t('PROJECT', '项目')}</span><span>{t('TAGS', '标签')}</span><span>{t('INTRODUCTION', '简介')}</span><span>{t('MARKET CAP / TVL', '市值 / TVL')}</span><span>{t('STATUS', '状态')}</span><span/>
      </div>
      <div className="ecosystem-table-body">
        {visibleProjects.map((project) => {
          const marketValue = project.tokenMetrics?.marketCapUsd ?? project.tvl;
          return <Link href={`/projects/${encodeURIComponent(project.slug)}`} className="ecosystem-table-row" key={project.slug}>
            <span className="ecosystem-table-project"><ProjectAvatar handle={project.handle} symbol={project.symbol}/><span><b>{project.name}</b><small>{project.handle}</small></span></span>
            <span className="ecosystem-table-tags">{project.categories.slice(0, 3).map((item) => <i key={item}>{categoryLabel(item, zh)}</i>)}</span>
            <span className="ecosystem-table-description">{zh ? project.description.zh || project.taglineZh || project.tagline : project.description.en || project.tagline}</span>
            <span className="ecosystem-table-value"><small>{project.tokenMetrics?.marketCapUsd != null ? t('MARKET CAP', '市值') : 'TVL'}</small><b className={marketValue == null ? 'not-indexed' : ''}>{amount(marketValue, zh)}</b></span>
            <span className={`ecosystem-status ${project.status}`}>{project.status === 'beta' ? t('BETA', '测试版') : project.status === 'live' ? t('LIVE', '已上线') : t('UPCOMING', '即将上线')}</span>
            <ChevronRight className="ecosystem-row-arrow" size={16}/>
          </Link>;
        })}
      </div>
      <nav className="ecosystem-pagination" aria-label={t('Project pages', '项目分页')}>
        <span>{t(`${firstVisibleProject}–${lastVisibleProject} of ${filteredProjects.length}`, `显示 ${firstVisibleProject}–${lastVisibleProject} 项，共 ${filteredProjects.length} 项`)}</span>
        <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label={t('Previous page', '上一页')}><ChevronLeft size={14}/></button><b>{page} / {pageCount}</b><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} aria-label={t('Next page', '下一页')}><ChevronRight size={14}/></button></div>
      </nav>
    </section> : <div className="ecosystem-empty"><Search size={19}/><b>{projects.length === 0 ? t('Loading project directory…', '正在加载项目目录…') : t('No projects match your search.', '没有找到匹配的项目。')}</b><span>{projects.length === 0 ? t('Fetching curated data.', '正在读取已整理的项目信息。') : t('Try a different name or category.', '试试其他项目名称或类别。')}</span></div>}

    <div className="ecosystem-data-note"><span>ⓘ</span><p>{t('Market data refreshes every five minutes. Open a project to view all available metrics, products, updates and contract details.', '市场数据每五分钟更新一次。进入项目详情可查看完整指标、产品、动态与合约信息。')}</p></div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href="https://unavatar.io" target="_blank" rel="noreferrer">{t('Avatars by Unavatar', '头像由 Unavatar 提供')}</a></span></footer>
  </div>;
}
