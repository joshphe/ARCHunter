'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, Search } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';

type Props = { language: 'en' | 'zh' };

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

export default function EcosystemPage({ language }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [projects, setProjects] = useState<EcosystemProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetch('/api/ecosystem-projects', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Project directory unavailable.');
        return response.json() as Promise<EcosystemProject[]>;
      })
      .then((items) => {
        if (!current) return;
        setProjects(items);
        setSelectedSlug(items[0]?.slug ?? null);
        setLoadError(false);
      })
      .catch(() => { if (current) setLoadError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesCategory = category === 'all' || project.categories.includes(category);
    const term = query.trim().toLowerCase();
    const searchableText = `${project.name} ${project.handle} ${project.categories.join(' ')} ${project.tagline} ${project.description.en} ${project.description.zh} ${project.products.map((product) => `${product.en} ${product.zh}`).join(' ')}`;
    const matchesSearch = !term || searchableText.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  }), [category, projects, query]);
  const selectedProject = filteredProjects.find((project) => project.slug === selectedSlug) ?? filteredProjects[0];

  return <div className="content ecosystem-content">
    <div className="page-heading ecosystem-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC PROJECT DIRECTORY', 'ARC 项目目录')}<span className="eyebrow-line"/></div>
        <h1>{t('Ecosystem', '生态')} <span>{t('Projects', '项目')}</span></h1>
        <p className="subtitle">{t('Discover teams building across the Arc ecosystem.', '发现正在 Arc 生态中构建的项目。')}</p>
      </div>
      <div className="ecosystem-reviewed"><span className="ecosystem-reviewed-dot"/>{t('CURATED PROJECT INFO', '人工整理项目信息')}</div>
    </div>

    <section className="ecosystem-toolbar" aria-label={t('Project search and filters', '项目搜索与筛选')}>
      <label className="ecosystem-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search projects or categories', '搜索项目或类别')} aria-label={t('Search projects', '搜索项目')}/></label>
      <div className="ecosystem-filters" aria-label={t('Filter by category', '按类别筛选')}>
        {categories.map((item) => <button key={item.value} type="button" className={category === item.value ? 'active' : ''} onClick={() => setCategory(item.value)}>{t(item.en, item.zh)}</button>)}
      </div>
    </section>

    <div className="ecosystem-results-bar"><span>{t('CURATED DIRECTORY', '精选项目目录')}</span><b>{zh ? `${String(filteredProjects.length).padStart(2, '0')} 个项目` : `${filteredProjects.length} ${filteredProjects.length === 1 ? 'project' : 'projects'}`}</b><i/><span>{t('Curated project profiles', '人工整理项目信息')}</span></div>

    {selectedProject ? <div className="ecosystem-layout">
      <section className="ecosystem-project-list" aria-label={t('Project results', '项目列表')}>
        {filteredProjects.map((project) => <button type="button" key={project.slug} onClick={() => setSelectedSlug(project.slug)} className={`ecosystem-project-card ${selectedProject.slug === project.slug ? 'selected' : ''}`} aria-pressed={selectedProject.slug === project.slug}>
          <ProjectAvatar key={project.handle} handle={project.handle} symbol={project.symbol}/>
          <span className="ecosystem-card-copy"><b>{project.name}</b><small>{project.handle} <i>·</i> {project.categories.map((item) => categoryLabel(item, zh)).join(' / ')}</small></span>
          <span className={`ecosystem-status ${project.status}`}>{project.status === 'beta' ? t('BETA', '测试版') : project.status === 'live' ? t('LIVE', '已上线') : t('UPCOMING', '即将上线')}</span>
          <ArrowUpRight size={15}/>
        </button>)}
      </section>

      <article className="ecosystem-detail-card">
        <div className="ecosystem-detail-top">
          <div className="ecosystem-detail-brand"><ProjectAvatar key={selectedProject.handle} handle={selectedProject.handle} symbol={selectedProject.symbol} large/><div><div className="ecosystem-handle">{selectedProject.handle}</div><h2>{selectedProject.name}</h2></div></div>
          <span className={`ecosystem-status ${selectedProject.status}`}>{selectedProject.status === 'beta' ? t('BETA', '测试版') : selectedProject.status === 'live' ? t('LIVE ON ARC', '已上线 ARC') : t('UPCOMING', '即将上线')}</span>
        </div>
        <p className="ecosystem-tagline">{zh ? selectedProject.taglineZh || selectedProject.tagline : selectedProject.tagline}</p>
        <p className="ecosystem-description">{zh ? selectedProject.description.zh : selectedProject.description.en}</p>
        <div className="ecosystem-category-tags">{selectedProject.categories.map((item) => <span key={item}>{categoryLabel(item, zh)}</span>)}</div>

        <div className="ecosystem-metrics">
          {[
            { label: 'TVL', value: selectedProject.tvl },
            { label: t('FEES · 24H', '费用 · 24 小时'), value: selectedProject.fees24h },
            { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: selectedProject.volume24h },
          ].map((metric) => <div className="ecosystem-metric" key={metric.label}><span>{metric.label}</span><b className={metric.value == null ? 'not-indexed' : ''}>{amount(metric.value, zh)}</b></div>)}
        </div>

        <div className="ecosystem-detail-section"><div className="ecosystem-detail-label">{t('PRODUCTS', '产品')}</div><div className="ecosystem-product-tags">{selectedProject.products.map((product) => <span key={product.en}>{zh ? product.zh : product.en}{product.status === 'upcoming' && <em>{t('SOON', '即将推出')}</em>}</span>)}</div></div>

        {selectedProject.updates.length > 0 && <div className="ecosystem-detail-section"><div className="ecosystem-detail-label">{t('PROJECT UPDATES', '项目动态')}</div><div className="ecosystem-update-list">{selectedProject.updates.map((update) => <a key={update.sourceUrl} href={update.sourceUrl} target="_blank" rel="noreferrer"><small>{update.publishedAt ? new Date(update.publishedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US') : t('Date not set', '日期未注明')}</small><b>{zh ? update.titleZh || update.titleEn : update.titleEn}</b><span>{zh ? update.summaryZh || update.summaryEn : update.summaryEn}</span></a>)}</div></div>}

        {selectedProject.tokenAddress && <div className="ecosystem-detail-section"><div className="ecosystem-detail-label">{t('TOKEN CONTRACT · ARC', '代币合约 · ARC')}</div><code className="ecosystem-token-address">{selectedProject.tokenAddress}</code></div>}

        <div className="ecosystem-detail-footer"><div className="ecosystem-links"><a href={selectedProject.website} target="_blank" rel="noreferrer">{t('Website', '官网')} <ExternalLink size={12}/></a><a href={selectedProject.x} target="_blank" rel="noreferrer">X <ExternalLink size={12}/></a></div></div>
      </article>
    </div> : <div className="ecosystem-empty"><Search size={19}/><b>{loading ? t('Loading project directory…', '正在加载项目目录…') : loadError ? t('Project directory is temporarily unavailable.', '项目目录暂时无法加载。') : t('No projects match your search.', '没有找到匹配的项目。')}</b><span>{loading ? t('Fetching curated data.', '正在读取已整理的项目信息。') : loadError ? t('Please try again in a moment.', '请稍后重试。') : t('Try a different name or category.', '试试其他项目名称或类别。')}</span></div>}

    <div className="ecosystem-data-note"><span>ⓘ</span><p>{t('“Not indexed” means the metric has not been confirmed; it does not mean zero.', '“未收录”表示暂未确认指标，不代表数值为零。')}</p></div>
    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href="https://unavatar.io" target="_blank" rel="noreferrer">{t('Avatars by Unavatar', '头像由 Unavatar 提供')}</a></span></footer>
  </div>;
}
