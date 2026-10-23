'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, RefreshCw, Search, Wallet } from 'lucide-react';
import type { ProjectSummary } from '@/lib/project-schema';
import type { WalletPortfolio } from '@/lib/wallet-portfolio-types';
import type { WalletRange } from '@/lib/wallet-lookup';
import ProjectAvatar from './project-avatar';
import { walletDate, walletMoney, walletQuantity } from './wallet-format';

const WalletPnlPanel = dynamic(() => import('./wallet-pnl-panel'), { loading: () => <div className="wallet-assets-loading" role="status">…</div> });
const USDC = '0x3600000000000000000000000000000000000000';
type Props = { address: string; language: 'en' | 'zh'; range: WalletRange; revision: number; projects: ProjectSummary[] };
const PAGE_SIZE = 10;
export default function WalletPortfolioPanel({ address, language, range, revision, projects }: Props) {
  const zh = language === 'zh'; const t = (en: string, cn: string) => zh ? cn : en;
  const [data, setData] = useState<WalletPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(''); const [active, setActive] = useState('');
  const [retry, setRetry] = useState(0);
  const tokenProjects = useMemo(() => {
    const entries = new Map<string, ProjectSummary>();
    for (const project of projects) if (project.tokenAddress && project.tokenAddress.toLowerCase() !== USDC) entries.set(project.tokenAddress.toLowerCase(), project);
    return entries;
  }, [projects]);
  useEffect(() => {
    const controller = new AbortController(); let disposed = false; let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 29_000);
    setLoading(true); setPricing(false); setPriceError(false); setError(null); setPage(0);
    async function read(prices: boolean) {
      const response = await fetch('/api/wallet/portfolio?' + new URLSearchParams({ address, includePrices: prices ? '1' : '0' }), { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 429 ? 'busy' : 'unavailable');
      const result = await response.json() as WalletPortfolio;
      if (result.address !== address || !Array.isArray(result.assets)) throw new Error('unavailable');
      return result;
    }
    void (async () => {
      try {
        const holdings = await read(false);
        if (disposed) return;
        setData(holdings); setLoading(false);
        if (holdings.assets.some(asset => asset.address !== USDC)) {
          setPricing(true);
          try { const priced = await read(true); if (!disposed) setData(priced); }
          catch { if (!disposed) setPriceError(true); }
        }
      } catch (error) { if (!disposed) setError(timedOut ? 'timeout' : error instanceof Error ? error.message : 'unavailable'); }
      finally { window.clearTimeout(timer); if (!disposed) { setLoading(false); setPricing(false); } }
    })();
    return () => { disposed = true; window.clearTimeout(timer); controller.abort(); };
  }, [address, revision, retry]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data?.assets.filter(asset => [asset.name, asset.symbol, asset.address].some(value => value.toLowerCase().includes(query))) ?? [];
  }, [data, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const activeProject = tokenProjects.get(active);
  function analyze(token: string) { setSelected(token); setActive(token); }
  return <>
    <section className="wallet-panel wallet-assets-panel" aria-busy={loading}>
      <div className="wallet-panel-head"><div><div className="section-kicker"><Wallet size={13}/>{t('WALLET PORTFOLIO', '钱包资产')}</div><h3>{t('Assets held on Arc', 'Arc 链上持仓')}</h3></div><button className="wallet-addr-link" type="button" disabled={loading || pricing} onClick={() => setRetry(value => value + 1)}><RefreshCw size={13} className={loading || pricing ? 'spin' : ''}/>{t('Refresh assets', '刷新持仓')}</button></div>
      {loading && !data && <div className="wallet-assets-loading" role="status"><RefreshCw size={18} className="spin"/>{t('Loading token balances and quotes…', '正在读取代币余额与报价…')}</div>}
      {error && <div className="wallet-notice" role="alert">{error === 'busy' ? t('Queries are busy. Please retry shortly.', '查询较多，请稍后重试。') : t('Portfolio data is temporarily unavailable. Please retry.', '持仓数据暂不可用，请稍后刷新。')}{data && t(' The previous snapshot is shown below.', '下方保留上次快照。')}</div>}
      {data && <>
        {pricing && <p className="wallet-assets-footnote" role="status">{t('Balances loaded; updating quotes…', '余额已加载，正在补充行情估值…')}</p>}
        {priceError && <div className="wallet-notice" role="status">{t('Quotes are temporarily unavailable. Token balances remain visible.', '行情暂不可用，代币持仓数量仍可查看。')}</div>}
        <div className="wallet-portfolio-summary"><div><span>{t('PRICED ASSETS · REFERENCE VALUE', '已定价资产 · 参考估值')}</span><strong>{walletMoney(data.pricedTotalUsd)}</strong><small>{t('USDC is valued at $1; this is not an executable sell quote.', 'USDC 按 $1 参考估值，不代表全部卖出可得金额。')}</small></div><div className="wallet-portfolio-counts"><div><b>{data.status === 'unavailable' ? '—' : data.assets.filter(item => item.balanceUnits !== '0' && item.balanceUnits !== null).length}</b><span>{t('Tokens held', '持有代币')}</span></div><div><b>{data.unpricedCount}</b><span>{t('Unpriced / unavailable', '未定价／不可用')}</span></div><div><b>{data.status === 'complete' ? t('Read', '已读完') : data.status === 'unavailable' ? t('Unavailable', '暂不可用') : t('Partial', '部分数据')}</b><span>{t('Balance list coverage', '持仓列表覆盖')}</span></div></div></div>
        {data.status !== 'complete' && <div className="wallet-notice" role="status">{data.reason === 'key-required' ? t('The free Blockscout key is not configured here. Only the available USDC balance can be shown.', '当前环境未配置免费的 Blockscout Key，暂展示可获取的 USDC 余额。') : data.reason === 'authentication' ? t('The token history service could not authenticate. Available balances are shown.', '代币服务鉴权失败，暂展示已获取的余额。') : data.reason === 'limit' ? t('The token list exceeds the scan limit. This is a partial portfolio.', '持仓列表超过读取上限，当前展示部分资产。') : t('Some balances could not be loaded. The subtotal may not cover the full wallet.', '部分余额未能获取，当前合计可能未覆盖整个钱包。')}</div>}
        <div className="wallet-assets-toolbar"><label className="wallet-assets-search"><Search size={15}/><input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder={t('Search token or contract', '搜索代币或合约')} aria-label={t('Search holdings', '搜索持仓')}/></label><span>{walletDate(data.checkedAt, language)} UTC</span></div>
        <div className="wallet-assets-table-wrap"><table className="wallet-assets-table"><thead><tr><th>{t('Asset', '资产')}</th><th>{t('Balance', '持仓数量')}</th><th>{t('Price', '当前价格')}</th><th>{t('Value', '参考价值')}</th><th>{t('Priced allocation', '已定价占比')}</th><th>{t('Actions', '操作')}</th></tr></thead><tbody>{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(asset => {
          const project = tokenProjects.get(asset.address); const share = asset.valueUsd !== null && data.pricedTotalUsd !== null && data.pricedTotalUsd > 0 ? asset.valueUsd / data.pricedTotalUsd * 100 : null;
          return <tr key={asset.address}><td><div className="wallet-asset-identity">{project ? <ProjectAvatar handle={project.handle} symbol={project.symbol} logoUrl={project.logoUrl} className="wallet-asset-avatar"/> : <span className="wallet-asset-avatar wallet-asset-initials">{asset.symbol.slice(0, 2)}</span>}<div><strong>{project?.name ?? asset.name}</strong><small>{asset.symbol}{project && <Link href={'/projects/' + project.slug} className="wallet-project-tag">{t('Ecosystem', '已收录')}<ArrowUpRight size={11}/></Link>}</small></div></div></td><td title={asset.balanceUnits ?? ''}>{walletQuantity(asset.balance)}</td><td>{walletMoney(asset.priceUsd)}<small className="wallet-asset-sub">{asset.pricing === 'usdc-reference' ? t('$1 reference', '$1 参考价') : asset.pricing === 'low-liquidity' ? t('Low liquidity · excluded', '流动性低 · 不计估值') : asset.priceUpdatedAt ? walletDate(asset.priceUpdatedAt, language) + ' UTC' : t('No reliable quote', '暂无可靠报价')}</small></td><td>{asset.valueUsd === null ? t('Unpriced', '未定价') : walletMoney(asset.valueUsd)}</td><td>{share === null ? '—' : <div className="wallet-asset-share"><span>{share.toFixed(1)}%</span><i><i style={{ width: Math.min(100, share) + '%' }}/></i></div>}</td><td><div className="wallet-asset-actions">{project && <button type="button" onClick={() => analyze(asset.address)}>{t('Analyze P&L', '分析盈亏')}</button>}<a href={'https://web3.okx.com/' + (zh ? 'zh-hans' : 'en') + '/token/arc/' + asset.address} target="_blank" rel="noreferrer" aria-label={t('Open OKX chart for ', '在 OKX 查看 ') + asset.symbol}>OKX<ExternalLink size={11}/></a><a href={'https://explorer.arc.io/token/' + asset.address} target="_blank" rel="noreferrer" aria-label={t('Open explorer for ', '在区块浏览器查看 ') + asset.symbol}><ExternalLink size={14}/></a></div></td></tr>;
        })}</tbody></table></div>
        {filtered.length === 0 && <div className="wallet-assets-empty">{t('No matching assets.', '未找到匹配的资产。')}</div>}
        {pages > 1 && <div className="wallet-assets-pagination"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t('Previous', '上一页')}</button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{t('Next', '下一页')}</button></div>}
        <p className="wallet-assets-footnote">{t('Direct wallet ERC-20 balances only; lending, staking, LP and NFT positions are not included. USDC appears once. Unknown prices and quotes with less than $5,000 of reported liquidity are excluded from valuation.', '仅统计钱包内 ERC-20 持仓，不包含借贷、质押、LP 和 NFT 仓位。USDC 仅计一次；未知报价及报告流动性低于 $5,000 的报价不计入估值。')}</p>
      </>}
    </section>
    <section className="wallet-panel wallet-analysis-picker"><div><h3>{t('Explore token P&L', '查看单币盈亏')}</h3><p>{tokenProjects.size ? t('Choose a listed project, including tokens already sold. History is fetched only when you analyze.', '可选择已清仓的收录项目代币，点击分析后才读取历史。') : t('No listed project tokens are available yet. Please wait for the directory or refresh the page.', '暂未获取可分析的收录项目代币，请等待目录加载或刷新页面。')}</p></div><div className="wallet-analysis-controls"><select value={selected} onChange={event => setSelected(event.target.value)} aria-label={t('Project token to analyze', '选择分析的项目代币')}><option value="">{t('Select project token', '选择项目代币')}</option>{[...tokenProjects.entries()].map(([token, project]) => <option key={token} value={token}>{project.name} · {project.symbol}</option>)}</select><button className="wallet-analyze-button" type="button" disabled={!tokenProjects.has(selected)} onClick={() => analyze(selected)}>{t('Analyze P&L', '分析盈亏')}<ArrowUpRight size={14}/></button></div></section>
    {activeProject && <WalletPnlPanel key={active} address={address} project={activeProject} language={language} range={range} revision={revision} onClose={() => setActive('')}/>}
  </>;
}
