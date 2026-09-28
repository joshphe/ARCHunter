'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronDown, Compass, Copy, ExternalLink, LayoutDashboard, Menu, Moon, Sparkles, Sun, X } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';
import ProjectScoreRadar from '@/app/project-score-radar';
import { emptyScorecard, getProjectScore, scoreDimensions } from '@/lib/project-scoring';
import type { TokenMetrics } from '@/lib/token-metrics';

type Props = { project: EcosystemProject; initialLanguage: 'en' | 'zh' };

const amount = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
const count = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const price = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 6 }).format(value);

export default function ProjectDetailClient({ project, initialLanguage }: Props) {
  const [metrics, setMetrics] = useState<TokenMetrics | null | undefined>(project.tokenAddress ? undefined : null);
  const [language, setLanguage] = useState<'en' | 'zh'>(initialLanguage);
  const [isDark, setIsDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;

  useEffect(() => {
    const savedTheme = localStorage.getItem('arcwatch-theme');
    setIsDark(savedTheme !== 'light');
    document.cookie = `arcwatch-language=${initialLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [initialLanguage]);
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('arcwatch-theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  useEffect(() => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
  }, [language, zh]);
  useEffect(() => {
    let current = true;
    if (!project.tokenAddress) return () => { current = false; };
    fetch(`/api/ecosystem-projects/${encodeURIComponent(project.slug)}/metrics`, { signal: AbortSignal.timeout(6000) })
      .then((response) => response.ok ? response.json() as Promise<{ tokenMetrics: TokenMetrics | null }> : Promise.reject(new Error('Unavailable')))
      .then((data) => { if (current) setMetrics(data.tokenMetrics); })
      .catch(() => { if (current) setMetrics(null); });
    return () => { current = false; };
  }, [project.slug, project.tokenAddress]);

  async function copyAddress() {
    if (!project?.tokenAddress) return;
    try {
      await navigator.clipboard.writeText(project.tokenAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }

  const metricItems = metrics ? [
    { label: t('MARKET CAP', '市值'), value: metrics.marketCapUsd, display: amount(metrics.marketCapUsd, zh) },
    { label: t('LIQUIDITY', '流动性'), value: metrics.liquidityUsd, display: amount(metrics.liquidityUsd, zh) },
    { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: metrics.volume24hUsd, display: amount(metrics.volume24hUsd, zh) },
    { label: t('HOLDERS', '持币地址'), value: metrics.holders, display: count(metrics.holders, zh) },
  ] : metrics === undefined ? [
    { label: t('MARKET CAP', '市值'), value: null, display: t('Loading…', '加载中…'), loading: true },
    { label: t('LIQUIDITY', '流动性'), value: null, display: t('Loading…', '加载中…'), loading: true },
    { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: null, display: t('Loading…', '加载中…'), loading: true },
    { label: t('HOLDERS', '持币地址'), value: null, display: t('Loading…', '加载中…'), loading: true },
  ] : [
    { label: 'TVL', value: project.tvl, display: amount(project.tvl, zh) },
    { label: t('FEES · 24H', '费用 · 24 小时'), value: project.fees24h, display: amount(project.fees24h, zh) },
    { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: project.volume24h, display: amount(project.volume24h, zh) },
  ];

  return <main className="shell project-detail-shell">
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span/></div><span>arc<span className="brand-light">watch</span></span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label={t('Close menu', '关闭菜单')}><X size={18}/></button></div>
      <div className="network"><span className="network-dot"/> {t('ARC Network', 'ARC 网络')} <ChevronDown size={14}/><span className="network-main">MAINNET</span></div>
      <div className="nav-label">{t('WORKSPACE', '工作区')}</div>
      <nav>
        <Link className="nav-item" href="/"><LayoutDashboard size={17}/><span>{t('Overview', '概览')}</span></Link>
        <Link className="nav-item selected" href="/?view=ecosystem"><Compass size={17}/><span>{t('Ecosystem', '生态')}</span></Link>
        <Link className="nav-item" href="/?view=launchpad"><Sparkles size={17}/><span>{t('Launchpad', '发射台')}</span></Link>
      </nav>
    </aside>
    <section className="main-area">
      <header className="topbar"><button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label={t('Open menu', '打开菜单')}><Menu size={19}/></button><div className="breadcrumbs"><span>{t('Workspace', '工作区')}</span><span className="slash">/</span><Link href="/?view=ecosystem">{t('Ecosystem', '生态')}</Link><span className="slash">/</span><b>{project?.name ?? t('Project', '项目')}</b></div><div className="top-actions"><div className="live-indicator"><span/> {t('LIVE DATA', '实时数据')}</div><button className="language-button" onClick={() => {const next = zh ? 'en' : 'zh'; setLanguage(next); localStorage.setItem('arcwatch-language', next); document.cookie = `arcwatch-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;}} aria-label={zh ? '切换为英文' : 'Switch to Chinese'}>{zh ? 'CN' : 'EN'}</button><button className="icon-button" onClick={() => setIsDark(!isDark)} aria-label={isDark ? '切换到白天模式' : '切换到夜间模式'}>{isDark ? <Sun size={17}/> : <Moon size={17}/>}</button></div></header>
      <div className="project-route-content">
      <Link className="project-back-link" href="/?view=ecosystem"><ArrowLeft size={15}/>{t('Back to project directory', '返回项目目录')}</Link>
        <section className="project-detail-hero">
          <div className="project-detail-heading"><ProjectAvatar handle={project.handle} symbol={project.symbol} large/><div><span>{project.handle}</span><h1>{project.name}</h1><p>{zh ? project.taglineZh || project.tagline : project.tagline}</p></div></div>
          <div className="project-detail-actions"><span className={`ecosystem-status ${project.status}`}>{project.status === 'beta' ? t('BETA', '测试版') : project.status === 'live' ? t('LIVE ON ARC', '已上线 ARC') : t('UPCOMING', '即将上线')}</span><a href={project.website} target="_blank" rel="noreferrer">{t('Website', '官网')} <ExternalLink size={13}/></a><a href={project.x} target="_blank" rel="noreferrer">X <ExternalLink size={13}/></a></div>
        </section>

        <section className="project-detail-intro"><p>{zh ? project.description.zh : project.description.en}</p><div className="ecosystem-category-tags">{project.categories.map((item) => <span key={item}>{item === 'Prediction Markets' && zh ? '预测市场' : item === 'Tokens' && zh ? '代币项目' : item}</span>)}</div></section>

        {(() => {
          const scorecard = project.scorecard ?? emptyScorecard();
          const { total, coverage } = getProjectScore(project.scorecard);
          const priorReviews = [...(project.scoreHistory ?? [])].reverse().slice(0, 5);
          return <section className="project-score-panel">
            <div className="project-score-heading"><div><div className="ecosystem-detail-label">{t('ARC WATCH OBSERVATION SCORE', 'ARC WATCH 生态观察分')}</div><p>{t('A transparent editorial snapshot of project progress and ecosystem activity.', '基于可查证信息，观察项目进展与生态活跃度。')}</p>{project.scoreReviewedAt ? <small className="project-score-reviewed">{t('Last reviewed', '最近复核')} · {new Date(project.scoreReviewedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US')}</small> : null}</div><div className="project-score-total"><b>{total ?? '—'}</b><span>/100</span></div></div>
            <div className="project-score-content">
              <div className="project-score-chart-wrap"><ProjectScoreRadar scorecard={project.scorecard} language={language}/><div className="project-score-coverage">{t('EVIDENCE COVERAGE', '评分覆盖度')} <b>{Math.round(coverage * 100)}%</b></div></div>
              <div className="project-score-breakdown">{scoreDimensions.map((dimension) => {
                const item = scorecard[dimension.key];
                return <div className="project-score-dimension" key={dimension.key}>
                  <div className="project-score-dimension-top"><b>{zh ? dimension.labelZh : dimension.labelEn}</b><span>{dimension.weight}%</span><strong>{!item.applicable ? 'N/A' : item.score == null ? '—' : `${item.score} / 5`}</strong></div>
                  <p>{item.applicable ? (zh ? item.noteZh || '评分依据待补充' : item.noteEn || 'Evidence note pending') : t('Not applicable to this project type.', '此维度不适用于该项目类型。')}</p>
                </div>;
              })}</div>
            </div>
            <div className="project-score-method">{t('Weighted score = Σ (dimension score ÷ 5 × weight). 1 = little public evidence; 3 = working baseline with gaps; 5 = strong, repeatedly verifiable evidence. N/A is excluded; totals require at least 70% evidence coverage.', '总分 = 各维度（分数 ÷ 5 × 权重）之和。1 分代表公开证据较少；3 分代表已有基础运行表现，但仍有关键数据缺口；5 分代表表现突出且有持续、可核验证据。N/A 不纳入计算；评分覆盖度达到 70% 才显示总分。')}</div>
            {priorReviews.length ? <details className="project-score-history"><summary>{t('Previous score reviews', '历史评分')} · {priorReviews.length}</summary>{priorReviews.map((review, index) => <div key={`${review.reviewedAt}-${index}`}><span>{new Date(review.reviewedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US')}</span><b>{getProjectScore(review.scorecard).total ?? '—'} / 100</b></div>)}</details> : null}
          </section>;
        })()}

        <section className={`ecosystem-metrics project-detail-metrics ${metrics || metrics === undefined ? 'token-metrics' : ''}`}>{metricItems.map((metric) => <div className={`ecosystem-metric ${'loading' in metric && metric.loading ? 'metric-loading' : ''}`} key={metric.label}><span>{metric.label}</span><b className={metric.value == null ? 'not-indexed' : ''}>{metric.display}</b></div>)}</section>
        {metrics ? <div className="ecosystem-token-summary project-detail-summary"><span>{t('PRICE', '价格')} <b>{price(metrics.priceUsd, zh)}</b>{metrics.priceChange24h != null ? <em className={metrics.priceChange24h >= 0 ? 'positive' : 'negative'}>{metrics.priceChange24h >= 0 ? '+' : ''}{metrics.priceChange24h.toFixed(2)}%</em> : null}</span><span>{t('TRADES · 24H', '交易笔数 · 24 小时')} <b>{count((metrics.buys24h ?? 0) + (metrics.sells24h ?? 0), zh)}</b></span><span>{t('TOTAL FEES', '总手续费')} <b>{count(metrics.totalFee, zh)}</b></span></div> : null}

        <div className="project-detail-grid">
          <section className="project-detail-panel"><div className="ecosystem-detail-label">{t('PRODUCTS', '产品')}</div><div className="ecosystem-product-tags">{project.products.map((product) => <span key={product.en}>{zh ? product.zh : product.en}{product.status === 'upcoming' ? <em>{t('SOON', '即将推出')}</em> : null}</span>)}</div></section>
          <section className="project-detail-panel"><div className="ecosystem-detail-label">{t('PROJECT INFO', '项目信息')}</div><dl><div><dt>{t('VERIFIED', '资料核验')}</dt><dd>{project.verifiedOn}</dd></div><div><dt>{t('PROJECT STATUS', '项目状态')}</dt><dd>{project.status === 'live' ? t('Live on Arc', '已上线 ARC') : project.status === 'beta' ? t('Beta', '测试版') : t('Upcoming', '即将上线')}</dd></div></dl></section>
        </div>

        {project.tokenAddress ? <section className="project-detail-panel project-contract-panel"><div className="ecosystem-detail-label">{t('TOKEN CONTRACT · ARC', '代币合约 · ARC')}</div><div className="ecosystem-token-row"><code className="ecosystem-token-address">{project.tokenAddress}</code><button type="button" className="ecosystem-token-action" onClick={() => void copyAddress()}>{copied ? <Check size={14}/> : <Copy size={14}/>}<span>{copied ? t('Copied', '已复制') : t('Copy', '复制')}</span></button><a className="ecosystem-token-action ecosystem-token-okx" href={`https://web3.okx.com/zh-hans/token/arc/${encodeURIComponent(project.tokenAddress)}`} target="_blank" rel="noreferrer">OKX {t('Chart', '图表')} <ExternalLink size={13}/></a></div></section> : null}

        {project.updates.length ? <section className="project-detail-panel project-updates-panel"><div className="ecosystem-detail-label">{t('PROJECT UPDATES', '项目动态')}</div><div className="ecosystem-update-list">{project.updates.map((update) => <a key={update.sourceUrl} href={update.sourceUrl} target="_blank" rel="noreferrer"><small>{update.publishedAt ? new Date(update.publishedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US') : t('Date not set', '日期未注明')}</small><b>{zh ? update.titleZh || update.titleEn : update.titleEn}</b><span>{zh ? update.summaryZh || update.summaryEn : update.summaryEn}</span></a>)}</div></section> : null}
      </div>
    </section>
    {mobileOpen ? <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label={t('Close menu', '关闭菜单')}/> : null}
  </main>;
}
