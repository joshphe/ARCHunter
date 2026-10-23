'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import type { WalletPnl, WalletPnlIssue, WalletTradeKind } from '@/lib/wallet-portfolio-types';
import type { WalletRange } from '@/lib/wallet-lookup';
import type { ProjectSummary } from '@/lib/project-schema';
import { walletDate, walletMoney, walletQuantity, walletShortAddress } from './wallet-format';

type Props = { address: string; project: ProjectSummary; range: WalletRange; language: 'en' | 'zh'; revision: number; onClose: () => void };
const PAGE_SIZE = 10;
export default function WalletPnlPanel({ address, project, range, language, revision, onClose }: Props) {
  const zh = language === 'zh'; const t = (en: string, cn: string) => zh ? cn : en;
  const token = project.tokenAddress!.toLowerCase();
  const [data, setData] = useState<WalletPnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    panel.current?.focus({ preventScroll: true });
  }, [token]);
  useEffect(() => {
    const controller = new AbortController(); let disposed = false; let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 29_000);
    setLoading(true); setData(null); setError(null); setPage(0);
    const params = new URLSearchParams({ address, token, range });
    void fetch('/api/wallet/pnl?' + params, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 429 ? 'busy' : 'unavailable');
      const result = await response.json() as WalletPnl;
      if (result.address !== address || result.token !== token || result.range !== range) throw new Error('unavailable');
      if (!disposed) setData(result);
    }).catch(error => { if (!disposed) setError(timedOut ? 'timeout' : error instanceof Error ? error.message : 'unavailable'); })
      .finally(() => { window.clearTimeout(timer); if (!disposed) setLoading(false); });
    return () => { disposed = true; window.clearTimeout(timer); controller.abort(); };
  }, [address, token, range, revision, retry]);
  const issueLabels: Record<WalletPnlIssue, string> = {
    'history-limited': t('History is not complete; missing acquisition cost is unknown.', '历史未完整覆盖，缺失的早期买入成本按未知处理。'),
    'unknown-cost': t('Some tokens arrived without a verifiable acquisition cost.', '存在无法核验买入成本的转入或交互。'),
    'unrecognized': t('Some interactions are unsupported and excluded from trade profit.', '部分交互尚未识别，未将其计为买卖盈亏。'),
    'balance-mismatch': t('Records do not reconcile with the balance snapshot. Current cost and unrealized profit are withheld.', '历史与余额快照暂未对齐，当前成本及浮动盈亏暂不计算。'),
    'no-price': t('A sufficiently liquid price is unavailable. Unrealized profit is unknown.', '缺少流动性充足的报价，浮动盈亏暂无法估算。'),
    'receipt-unavailable': t('Some receipts could not be verified.', '部分交易回执暂无法核验。'),
  };
  const kinds: Record<WalletTradeKind, string> = {
    buy: t('Buy', '买入'), sell: t('Sell', '卖出'), 'transfer-in': t('Transfer in', '转入'),
    'transfer-out': t('Transfer out', '转出'), unclassified: t('Unrecognized', '未识别交互'), self: t('Self transfer', '自身转账'),
  };
  const available = data !== null && data.status !== 'unavailable';
  const pages = Math.max(1, Math.ceil((data?.trades.length ?? 0) / PAGE_SIZE));
  const rangeLabel = range === 'all' ? t('all available history', '全部可读历史') : t('last ' + range.slice(0, -1) + ' days', '近 ' + range.slice(0, -1) + ' 天');
  return <section ref={panel} tabIndex={-1} className="wallet-pnl-panel" aria-label={t('Token profit and loss', '单币盈亏分析')} aria-busy={loading}>
    <div className="wallet-panel-head">
      <div><div className="section-kicker">{t('COST & PERFORMANCE', '成本与收益')}</div><h3>{project.name} · {t('Trade analysis', '交易盈亏分析')}</h3></div>
      <div className="wallet-addr-actions"><button type="button" className="wallet-addr-link" disabled={loading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={13}/>{t('Retry', '重新分析')}</button><button type="button" className="wallet-icon-button" onClick={onClose} aria-label={t('Close analysis', '关闭分析')}><X size={18}/></button></div>
    </div>
    <p className="wallet-pnl-intro">{t('Acquisition history is traced before applying the date filter. Cost uses a moving weighted average; amounts below are denominated in USDC.', '先追溯买入历史，再应用日期筛选；使用移动加权平均成本，以下收益金额以 USDC 计。')}</p>
    {loading && <div className="wallet-assets-loading" role="status"><RefreshCw size={17} className="spin"/>{t('Tracing transfers and verifying swaps…', '正在追溯转账并核验兑换记录…')}</div>}
    {error && <div className="wallet-notice" role="alert">{error === 'busy' ? t('Queries are busy. Please retry shortly.', '查询较多，请稍后重新分析。') : error === 'timeout' ? t('Analysis timed out. Please retry.', '分析超时，请稍后重试。') : t('Analysis is temporarily unavailable.', '盈亏分析暂不可用，请稍后重试。')}</div>}
    {data?.status === 'unavailable' && <div className="wallet-notice" role="status">{data.reason === 'key-required' ? t('History is not configured in this environment. The server needs the free Blockscout API key.', '当前环境尚未配置历史查询服务，需要在服务端配置免费的 Blockscout API Key。') : data.reason === 'authentication' ? t('The history service could not authenticate. Please check the server configuration.', '历史服务鉴权失败，请检查服务端配置。') : data.reason === 'rate-limited' ? t('The history service rate limit was reached. Please retry later.', '历史服务触发限流，请稍后重试。') : t('History or the balance snapshot is unavailable. Unknown values are not zero.', '历史记录或余额快照暂无法获取，未获取的数据不代表零。')}</div>}
    {available && data && <>
      {data.issues.length > 0 && <ul className="wallet-pnl-issues" role="status">{data.issues.map(issue => <li key={issue}>{issueLabels[issue]}</li>)}</ul>}
      <div className="wallet-pnl-stats">
        <article><span>{t('REALIZED · ', '已实现盈亏 · ')}{rangeLabel}</span><strong className={data.realizedUsdc !== null && data.realizedUsdc < 0 ? 'negative' : 'positive'}>{walletMoney(data.realizedUsdc, true)}</strong><small>{data.realizedUsdc === null && data.knownRealizedUsdc !== null ? t('Verified records: ', '已知成本记录合计：') + walletMoney(data.knownRealizedUsdc, true) : t('Before Gas fees', '未扣 Gas')}</small></article>
        <article><span>{t('UNREALIZED · CURRENT', '浮动盈亏 · 当前持仓')}</span><strong className={data.unrealizedUsdc !== null && data.unrealizedUsdc < 0 ? 'negative' : 'positive'}>{walletMoney(data.unrealizedUsdc, true)}</strong><small>{t('Current value minus remaining cost', '当前估值减剩余持仓成本')}</small></article>
        <article><span>{t('AVERAGE ENTRY COST', '当前平均买入成本')}</span><strong>{walletMoney(data.averageCostUsdc)}</strong><small>{walletQuantity(data.balance)} {project.symbol}</small></article>
        <article><span>{t('VERIFIED SWAP GAS · ', '已核验兑换 Gas · ')}{rangeLabel}</span><strong>{walletMoney(data.gasUsdc)}</strong><small>{data.verifiedSwaps} {t('verified swaps; includes buys', '笔已核验兑换，含买入')}</small></article>
      </div>
      {data.totalPnlUsdc !== null && <div className="wallet-pnl-total"><span>{t('Verified trade P&L after Gas · available history', '可读历史交易盈亏 · 已扣核验兑换 Gas')}</span><strong className={data.totalPnlUsdc < 0 ? 'negative' : 'positive'}>{walletMoney(data.totalPnlUsdc, true)}</strong></div>}
      {data.trades.length > 0 ? <div className="wallet-assets-table-wrap"><table className="wallet-assets-table wallet-pnl-table"><thead><tr><th>{t('Time (UTC)', '时间（UTC）')}</th><th>{t('Activity', '类型')}</th><th>{t('Token amount', '代币数量')}</th><th>{t('USDC paid / received', 'USDC 支付／收到')}</th><th>{t('Realized P&L', '已实现盈亏')}</th><th>{t('Transaction', '交易')}</th></tr></thead><tbody>{data.trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(trade => <tr key={trade.hash}>
        <td>{walletDate(trade.timestamp, language)}</td><td><span className={'wallet-trade-kind ' + trade.kind}>{kinds[trade.kind]}</span></td><td>{walletQuantity(trade.quantity)}</td><td>{walletMoney(trade.usdc)}</td><td className={trade.realizedUsdc !== null && trade.realizedUsdc < 0 ? 'negative' : 'positive'}>{walletMoney(trade.realizedUsdc, true)}</td><td><a className="wallet-inline-link" href={'https://explorer.arc.io/tx/' + trade.hash} target="_blank" rel="noreferrer">{walletShortAddress(trade.hash)}<ExternalLink size={12}/></a></td>
      </tr>)}</tbody></table></div> : <div className="wallet-assets-empty">{t('No token movements found in this date range.', '当前时间范围未发现该代币的变动记录。')}</div>}
      {pages > 1 && <div className="wallet-assets-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t('Previous', '上一页')}</button><span>{page + 1} / {pages}</span><button type="button" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>{t('Next', '下一页')}</button></div>}
      <p className="wallet-assets-footnote">{t('Snapshot block ', '快照区块 ')}{data.snapshotBlock?.toLocaleString('en-US') ?? '—'} · {walletDate(data.checkedAt, language)} UTC · {data.scannedTransactions} {t('transactions read', '笔交互已读取')}</p>
    </>}
    <details className="wallet-methodology"><summary>{t('Coverage and calculation rules', '覆盖范围与计算口径')}</summary><p>{t('Recognizes simple, wallet-initiated Uniswap v2/v3-compatible token/USDC swaps with a verified pool and complete native USDC system events. Complex routes, launchpad curves, LP positions and relayed swaps need separate adapters. Transfers in have unknown cost; direct transfers out are not sales. Fees are shown separately and deducted once in the all-history total. Values estimate the wallet trades covered above.', '识别钱包发起、池子可核验且具备完整原生 USDC 系统事件的简单 Uniswap v2/v3 兼容代币／USDC 兑换。复杂路由、发射台曲线、LP 仓位及代付交易需另行适配。转入按成本未知处理，直接转出不计为卖出。Gas 单列，仅在全部历史合计中扣除一次；这里按上述覆盖范围估算钱包交易收益。')}</p><p>{t('Each analysis reads up to 20 pages of token transfers and verifies the latest 40 related transactions. Missing history or unsupported interactions may prevent a total from being calculated. Current unrealized P&L is independent of the realized-P&L date filter.', '每次最多读取 20 页代币转账、核验最近 40 笔相关交互。历史缺失或未识别交互可能导致总盈亏无法计算。浮动盈亏以当前持仓计算，独立于已实现盈亏的日期范围。')}</p></details>
  </section>;
}
