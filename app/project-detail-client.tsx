'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronDown, Compass, Copy, ExternalLink, LayoutDashboard, Menu, Moon, Sparkles, Sun, X } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';

type Props = { slug: string };

const amount = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
const count = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const price = (value: number | null, zh: boolean) => value == null
  ? (zh ? '未收录' : 'Not indexed')
  : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 6 }).format(value);

export default function ProjectDetailClient({ slug }: Props) {
  const [project, setProject] = useState<EcosystemProject | null | undefined>(undefined);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [isDark, setIsDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;

  useEffect(() => {
    const savedTheme = localStorage.getItem('arcwatch-theme');
    const savedLanguage = localStorage.getItem('arcwatch-language');
    setIsDark(savedTheme !== 'light');
    setLanguage(savedLanguage === 'zh' ? 'zh' : 'en');
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('arcwatch-theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  useEffect(() => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    localStorage.setItem('arcwatch-language', language);
  }, [language, zh]);
  useEffect(() => {
    let current = true;
    fetch(`/api/ecosystem-projects/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<EcosystemProject> : Promise.reject(new Error('Unavailable')))
      .then((item) => { if (current) setProject(item); })
      .catch(() => { if (current) setProject(null); });
    return () => { current = false; };
  }, [slug]);

  async function copyAddress() {
    if (!project?.tokenAddress) return;
    try {
      await navigator.clipboard.writeText(project.tokenAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }

  const metrics = project?.tokenMetrics;
  const metricItems = metrics ? [
    { label: t('MARKET CAP', '市值'), value: metrics.marketCapUsd, display: amount(metrics.marketCapUsd, zh) },
    { label: t('LIQUIDITY', '流动性'), value: metrics.liquidityUsd, display: amount(metrics.liquidityUsd, zh) },
    { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: metrics.volume24hUsd, display: amount(metrics.volume24hUsd, zh) },
    { label: t('HOLDERS', '持币地址'), value: metrics.holders, display: count(metrics.holders, zh) },
  ] : project ? [
    { label: 'TVL', value: project.tvl, display: amount(project.tvl, zh) },
    { label: t('FEES · 24H', '费用 · 24 小时'), value: project.fees24h, display: amount(project.fees24h, zh) },
    { label: t('VOLUME · 24H', '交易量 · 24 小时'), value: project.volume24h, display: amount(project.volume24h, zh) },
  ] : [];

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
      <header className="topbar"><button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label={t('Open menu', '打开菜单')}><Menu size={19}/></button><div className="breadcrumbs"><span>{t('Workspace', '工作区')}</span><span className="slash">/</span><Link href="/?view=ecosystem">{t('Ecosystem', '生态')}</Link><span className="slash">/</span><b>{project?.name ?? t('Project', '项目')}</b></div><div className="top-actions"><div className="live-indicator"><span/> {t('LIVE DATA', '实时数据')}</div><button className="language-button" onClick={() => setLanguage(zh ? 'en' : 'zh')} aria-label={zh ? '切换为英文' : 'Switch to Chinese'}>{zh ? 'CN' : 'EN'}</button><button className="icon-button" onClick={() => setIsDark(!isDark)} aria-label={isDark ? '切换到白天模式' : '切换到夜间模式'}>{isDark ? <Sun size={17}/> : <Moon size={17}/>}</button></div></header>
      <div className="project-route-content">
      <Link className="project-back-link" href="/?view=ecosystem"><ArrowLeft size={15}/>{t('Back to project directory', '返回项目目录')}</Link>
      {project === undefined ? <div className="project-route-state">{t('Loading project profile…', '正在加载项目详情…')}</div> : project === null ? <div className="project-route-state"><b>{t('Project not found', '未找到该项目')}</b><Link href="/?view=ecosystem">{t('Browse all projects', '浏览全部项目')}</Link></div> : <>
        <section className="project-detail-hero">
          <div className="project-detail-heading"><ProjectAvatar handle={project.handle} symbol={project.symbol} large/><div><span>{project.handle}</span><h1>{project.name}</h1><p>{zh ? project.taglineZh || project.tagline : project.tagline}</p></div></div>
          <div className="project-detail-actions"><span className={`ecosystem-status ${project.status}`}>{project.status === 'beta' ? t('BETA', '测试版') : project.status === 'live' ? t('LIVE ON ARC', '已上线 ARC') : t('UPCOMING', '即将上线')}</span><a href={project.website} target="_blank" rel="noreferrer">{t('Website', '官网')} <ExternalLink size={13}/></a><a href={project.x} target="_blank" rel="noreferrer">X <ExternalLink size={13}/></a></div>
        </section>

        <section className="project-detail-intro"><p>{zh ? project.description.zh : project.description.en}</p><div className="ecosystem-category-tags">{project.categories.map((item) => <span key={item}>{item === 'Prediction Markets' && zh ? '预测市场' : item === 'Tokens' && zh ? '代币项目' : item}</span>)}</div></section>

        <section className={`ecosystem-metrics project-detail-metrics ${metrics ? 'token-metrics' : ''}`}>{metricItems.map((metric) => <div className="ecosystem-metric" key={metric.label}><span>{metric.label}</span><b className={metric.value == null ? 'not-indexed' : ''}>{metric.display}</b></div>)}</section>
        {metrics ? <div className="ecosystem-token-summary project-detail-summary"><span>{t('PRICE', '价格')} <b>{price(metrics.priceUsd, zh)}</b>{metrics.priceChange24h != null ? <em className={metrics.priceChange24h >= 0 ? 'positive' : 'negative'}>{metrics.priceChange24h >= 0 ? '+' : ''}{metrics.priceChange24h.toFixed(2)}%</em> : null}</span><span>{t('TRADES · 24H', '交易笔数 · 24 小时')} <b>{count((metrics.buys24h ?? 0) + (metrics.sells24h ?? 0), zh)}</b></span><span>{t('TOTAL FEES', '总手续费')} <b>{count(metrics.totalFee, zh)}</b></span></div> : null}

        <div className="project-detail-grid">
          <section className="project-detail-panel"><div className="ecosystem-detail-label">{t('PRODUCTS', '产品')}</div><div className="ecosystem-product-tags">{project.products.map((product) => <span key={product.en}>{zh ? product.zh : product.en}{product.status === 'upcoming' ? <em>{t('SOON', '即将推出')}</em> : null}</span>)}</div></section>
          <section className="project-detail-panel"><div className="ecosystem-detail-label">{t('PROJECT INFO', '项目信息')}</div><dl><div><dt>{t('VERIFIED', '资料核验')}</dt><dd>{project.verifiedOn}</dd></div><div><dt>{t('DATA SOURCE', '数据来源')}</dt><dd>{metrics?.source === 'dexscreener+okx' ? 'DEX Screener + OKX' : metrics?.source === 'okx' ? 'OKX' : metrics ? 'DEX Screener' : t('Curated', '人工整理')}</dd></div></dl></section>
        </div>

        {project.tokenAddress ? <section className="project-detail-panel project-contract-panel"><div className="ecosystem-detail-label">{t('TOKEN CONTRACT · ARC', '代币合约 · ARC')}</div><div className="ecosystem-token-row"><code className="ecosystem-token-address">{project.tokenAddress}</code><button type="button" className="ecosystem-token-action" onClick={() => void copyAddress()}>{copied ? <Check size={14}/> : <Copy size={14}/>}<span>{copied ? t('Copied', '已复制') : t('Copy', '复制')}</span></button><a className="ecosystem-token-action ecosystem-token-okx" href={`https://web3.okx.com/zh-hans/token/arc/${encodeURIComponent(project.tokenAddress)}`} target="_blank" rel="noreferrer">OKX {t('Chart', '图表')} <ExternalLink size={13}/></a></div></section> : null}

        {project.updates.length ? <section className="project-detail-panel project-updates-panel"><div className="ecosystem-detail-label">{t('PROJECT UPDATES', '项目动态')}</div><div className="ecosystem-update-list">{project.updates.map((update) => <a key={update.sourceUrl} href={update.sourceUrl} target="_blank" rel="noreferrer"><small>{update.publishedAt ? new Date(update.publishedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US') : t('Date not set', '日期未注明')}</small><b>{zh ? update.titleZh || update.titleEn : update.titleEn}</b><span>{zh ? update.summaryZh || update.summaryEn : update.summaryEn}</span></a>)}</div></section> : null}
      </>}
      </div>
    </section>
    {mobileOpen ? <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label={t('Close menu', '关闭菜单')}/> : null}
  </main>;
}
