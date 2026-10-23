'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Fuel, RefreshCw, Search, X } from 'lucide-react';
import type { WalletLookup, WalletRange } from '@/lib/wallet-lookup';
import type { ProjectSummary } from '@/lib/project-schema';
import WalletPortfolioPanel from './wallet-portfolio-panel';
import './wallet-portfolio.css';

const EXPLORER = 'https://explorer.arc.io';
type Props = { language: 'en' | 'zh'; projects: ProjectSummary[] };
type Range = WalletRange;
const isValidAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value.trim());

function weiToUsdc(value: string | null | undefined): number {
  return value && /^\d+$/.test(value) ? Number(BigInt(value)) / 1e18 : 0;
}
function tokenUnits(value: string, decimals: string | null): number {
  return Number(BigInt(value)) / Math.pow(10, decimals ? Number.parseInt(decimals, 10) : 6);
}
function fmtUsdc(value: number): string {
  const n = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (n === 0) return '$0.00';
  if (n < 0.000001) return sign + '< $0.000001';
  if (n < 0.01) return sign + '$' + n.toFixed(6);
  if (n < 1000) return sign + '$' + n.toFixed(4);
  return sign + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function shortAddr(value: string): string { return value.slice(0, 6) + '…' + value.slice(-4); }
function fmtDate(iso: string, zh: boolean): string {
  return new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(iso));
}

export default function WalletPage({ language, projects }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [input, setInput] = useState('');
  const [address, setAddress] = useState('');
  const [portfolioRevision, setPortfolioRevision] = useState(0);
  const [range, setRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WalletLookup | null>(null);
  const [txPage, setTxPage] = useState(0);
  const TX_PAGE_SIZE = 15;
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => { requestRef.current?.abort(); requestRef.current = null; }, []);

  const lookup = useCallback(async (addr: string, r: Range, refreshPortfolio = true) => {
    if (!isValidAddress(addr)) {
      setError(zh ? '请输入有效的 0x 地址。' : 'Please enter a valid 0x address.');
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const a = addr.trim().toLowerCase();
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 27_000);
    setAddress(a);
    if (refreshPortfolio) setPortfolioRevision(value => value + 1);
    setLoading(true);
    setError(null);
    setResult(null);
    setTxPage(0);
    try {
      const params = new URLSearchParams({ address: a, range: r });
      const response = await fetch('/api/wallet?' + params, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        throw new Error(response.status === 429 ? 'busy' : response.status === 400 ? 'invalid' : 'unavailable');
      }
      const data = await response.json() as WalletLookup;
      if (data.address !== a || data.range !== r) throw new Error('unavailable');
      if (requestRef.current !== controller) return;
      setResult(data);
      if (data.balanceUnits === null && data.transactions.status === 'unavailable' && data.transfers.status === 'unavailable') {
        setError(zh ? '链上数据服务暂不可用，请稍后重试；这不代表地址有误。' : 'Onchain data services are temporarily unavailable. This does not mean the address is invalid.');
      }
    } catch (e) {
      if (requestRef.current !== controller || (controller.signal.aborted && !timedOut)) return;
      const code = e instanceof Error ? e.message : 'unavailable';
      setError(timedOut
        ? (zh ? '查询超时，请稍后重试。' : 'The query timed out. Please try again.')
        : code === 'busy'
          ? (zh ? '查询请求较多，请稍后重试。' : 'Too many queries. Please try again shortly.')
          : (zh ? '链上数据服务暂不可用，请稍后重试。' : 'Onchain data services are temporarily unavailable. Please try again.'));
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) setLoading(false);
    }
  }, [zh]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); void lookup(input.trim(), range); }
  function handleRangeChange(r: Range) { setRange(r); if (address) void lookup(address, r, false); }

  const txs = result?.transactions.items ?? [];
  const transfers = result?.transfers.items ?? [];
  const gasAvailable = result !== null && result.transactions.status !== 'unavailable';
  const transfersAvailable = result !== null && result.transfers.status !== 'unavailable';
  const gasPartial = result?.transactions.status === 'partial';
  const transfersPartial = result?.transfers.status === 'partial';
  const usdcBalance = result?.balanceUnits == null ? null : tokenUnits(result.balanceUnits, '6');

  // ── Derived stats ──────────────────────────────────────────────────────────
  const sentTxs = txs.filter(tx => tx.from.hash.toLowerCase() === address.toLowerCase());
  const totalGasUsdc = sentTxs.reduce((sum, tx) => sum + weiToUsdc(tx.fee?.value), 0);
  const successTxs = sentTxs.filter(tx => tx.status === 'ok').length;
  const failedTxs = sentTxs.filter(tx => tx.status !== 'ok').length;

  const usdcIn = transfers
    .filter(tf => tf.to.hash.toLowerCase() === address.toLowerCase())
    .reduce((sum, tf) => sum + tokenUnits(tf.total.value, tf.total.decimals), 0);
  const usdcOut = transfers
    .filter(tf => tf.from.hash.toLowerCase() === address.toLowerCase())
    .reduce((sum, tf) => sum + tokenUnits(tf.total.value, tf.total.decimals), 0);
  const netUsdc = usdcIn - usdcOut;

  // Date range label
  const rangeLabel = range === '7d' ? t('7 days', '7 天')
    : range === '30d' ? t('30 days', '30 天')
    : range === '90d' ? t('90 days', '90 天')
    : t('All time', '全部历史');

  // Paginated transfers for display
  const pagedTransfers = transfers.slice(txPage * TX_PAGE_SIZE, (txPage + 1) * TX_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(transfers.length / TX_PAGE_SIZE));

  // Gas by day (for mini report)
  const gasByDay: Record<string, number> = {};
  for (const tx of sentTxs) {
    if (!tx.timestamp) continue;
    const day = tx.timestamp.slice(0, 10);
    gasByDay[day] = (gasByDay[day] ?? 0) + weiToUsdc(tx.fee?.value);
  }
  const gasRows = Object.entries(gasByDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  const hasData = result !== null;

  return (
    <div className="content wallet-content">
      <div className="page-heading wallet-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC CHAIN EXPLORER', 'ARC 链上探索')}<span className="eyebrow-line"/></div>
          <h1>{t('Wallet', '地址')} <span>{t('Lookup', '查询')}</span></h1>
          <p className="subtitle">{t('Explore token holdings, trade performance and Gas spend for any Arc address.', '查询任意 Arc 地址的代币持仓、交易盈亏与 Gas 支出。')}</p>
        </div>
      </div>

      {/* Search bar */}
      <form className="wallet-search-form" onSubmit={handleSubmit}>
        <label className="wallet-search-wrap">
          <Search size={15} className="wallet-search-icon"/>
          <input
            ref={inputRef}
            className="wallet-search-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('Enter ARC address (0x…)', '输入 ARC 地址（0x…）')}
            spellCheck={false}
            autoComplete="off"
            aria-label={t('ARC address', 'ARC 地址')}
          />
          {input && (
            <button type="button" className="wallet-search-clear" onClick={() => { setInput(''); inputRef.current?.focus(); }} aria-label={t('Clear', '清除')}>
              <X size={13}/>
            </button>
          )}
        </label>
        <div className="wallet-range-row">
          <span className="wallet-range-label">{t('RANGE', '时间范围')}</span>
          {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
            <button key={r} type="button" className={`wallet-range-btn${range === r ? ' active' : ''}`} onClick={() => handleRangeChange(r)}>
              {r === '7d' ? t('7D', '7天') : r === '30d' ? t('30D', '30天') : r === '90d' ? t('90D', '90天') : t('All', '全部')}
            </button>
          ))}
        </div>
        <button type="submit" className="wallet-query-btn" disabled={loading || !input.trim()}>
          {loading ? <RefreshCw size={14} className="spin"/> : <Search size={14}/>}
          {t('Query', '查询')}
        </button>
      </form>

      {address && <>

          <div className="wallet-addr-header">
            <div className="wallet-addr-left">
              <span className="wallet-addr-eyebrow">{t('ARC ADDRESS', 'ARC 地址')}</span>
              <code className="wallet-addr-hash">{address}</code>
            </div>
            <div className="wallet-addr-actions">
              <a className="wallet-addr-link" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">
                Blockscout <ExternalLink size={12}/>
              </a>
              <button className="wallet-addr-link" type="button" onClick={() => void lookup(address, range)} disabled={loading}>
                <RefreshCw size={12} className={loading ? 'spin' : ''}/>
                {t('Refresh', '刷新')}
              </button>
            </div>
          </div>

        <WalletPortfolioPanel key={address} address={address} language={language} projects={projects} range={range} revision={portfolioRevision}/>
      </>}

      {error && <div className="wallet-error" role="alert">{error}</div>}

      {loading && (
        <div className="wallet-loading" role="status">
          <RefreshCw size={16} className="spin"/>
          <span>{t('Loading transfer and Gas history…', '正在加载转账与 Gas 历史…')}</span>
        </div>
      )}

      {hasData && !loading && (
        <>
          {(!gasAvailable || !transfersAvailable) && <div className="wallet-notice" role="status">{t('Some transfer or Gas history is temporarily unavailable. Available balance and history are shown independently; unavailable values are not zero.', '部分转账或 Gas 历史暂不可用。已获取的余额和记录仍可查看，未获取的数据以 — 显示。')}</div>}
          {(gasPartial || transfersPartial) && <div className="wallet-notice" role="status">{t('The selected period is only partially covered. Totals below describe the records loaded, not the complete history.', '当前时间范围未完整覆盖，下方合计仅代表已读取记录，不代表完整历史。')}</div>}
          {/* Stats grid */}
          <div className="wallet-stats-grid">
            <article className="wallet-stat-card wallet-stat-primary">
              <span className="wallet-stat-label">{t('USDC BALANCE', 'USDC 余额')}</span>
              <strong>{usdcBalance !== null ? fmtUsdc(usdcBalance) : '—'}</strong>
              <small>{t('ERC-20 · ARC Mainnet', 'ERC-20 · Arc 主网')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{t('USDC IN · ' + rangeLabel.toUpperCase(), 'USDC 流入 · ' + rangeLabel)}</span>
              <strong className="positive">{transfersAvailable ? `${transfersPartial ? '≥ ' : ''}${fmtUsdc(usdcIn)}` : '—'}</strong>
              <small>{transfersAvailable ? transfers.filter(tf => tf.to.hash.toLowerCase() === address.toLowerCase()).length : '—'} {t('transfers', '笔转入')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{t('USDC OUT · ' + rangeLabel.toUpperCase(), 'USDC 流出 · ' + rangeLabel)}</span>
              <strong className="negative">{transfersAvailable ? `${transfersPartial ? '≥ ' : ''}${fmtUsdc(usdcOut)}` : '—'}</strong>
              <small>{transfersAvailable ? transfers.filter(tf => tf.from.hash.toLowerCase() === address.toLowerCase()).length : '—'} {t('transfers', '笔转出')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{transfersPartial ? t('OBSERVED NET USDC', '已读取记录净流量') : t('NET USDC FLOW · ' + rangeLabel.toUpperCase(), 'USDC 净流入 · ' + rangeLabel)}</span>
              <strong className={netUsdc >= 0 ? 'positive' : 'negative'}>{transfersAvailable ? `${netUsdc >= 0 ? '+' : ''}${fmtUsdc(netUsdc)}` : '—'}</strong>
              <small>{t('In minus out for the records loaded', '已读取转账的流入减流出')}</small>
            </article>
          </div>

          {/* Gas report */}
          <section className="wallet-panel">
            <div className="wallet-panel-head">
              <div>
                <div className="section-kicker"><Fuel size={11}/> {t('GAS SPEND REPORT', 'Gas 支出报告')}</div>
                <h3>{t('Transaction fees paid in USDC', '以 USDC 支付的交易手续费')}</h3>
              </div>
              <span className="wallet-badge">USDC = GAS</span>
            </div>
            <div className="wallet-gas-summary">
              <div className="wallet-gas-total">
                <span>{gasPartial ? t('OBSERVED GAS SPEND', '已读取交易 Gas 支出') : t('TOTAL GAS · ' + rangeLabel.toUpperCase(), 'Gas 总支出 · ' + rangeLabel)}</span>
                <strong>{gasAvailable ? fmtUsdc(totalGasUsdc) : '—'}</strong>
              </div>
              <div className="wallet-gas-meta">
                <div><span>{t('Sent txs', '发起交易')}</span><b>{gasAvailable ? sentTxs.length : '—'}</b></div>
                <div><span>{t('Success', '成功')}</span><b className="positive">{gasAvailable ? successTxs : '—'}</b></div>
                <div><span>{t('Reverted', '回滚')}</span><b className={failedTxs > 0 ? 'negative' : ''}>{gasAvailable ? failedTxs : '—'}</b></div>
                <div><span>{t('Avg / tx', '均值/笔')}</span><b>{sentTxs.length ? fmtUsdc(totalGasUsdc / sentTxs.length) : '—'}</b></div>
              </div>
            </div>
            {gasRows.length > 0 && (
              <div className="wallet-gas-breakdown">
                <div className="wallet-gas-breakdown-head">
                  <span>{t('DATE (UTC)', 'UTC 日期')}</span>
                  <span>{t('GAS PAID', 'Gas 支出')}</span>
                </div>
                {gasRows.map(([day, amt]) => (
                  <div className="wallet-gas-row" key={day}>
                    <span>{day}</span>
                    <b>{fmtUsdc(amt)}</b>
                  </div>
                ))}
                {Object.keys(gasByDay).length > 7 && (
                  <div className="wallet-gas-more">{t(`+ ${Object.keys(gasByDay).length - 7} more days`, `还有 ${Object.keys(gasByDay).length - 7} 天`)}</div>
                )}
              </div>
            )}
            {!gasAvailable && <div className="wallet-empty-inline">{t('Gas history is temporarily unavailable. Please retry later or open the explorer.', 'Gas 历史暂不可用，请稍后重试或前往区块浏览器查看。')}</div>}
            {gasAvailable && sentTxs.length === 0 && (
              <div className="wallet-empty-inline">{t('No outgoing transactions found in this range.', '该时间范围内未找到发起交易。')}</div>
            )}
            <div className="wallet-footnote">
              {t('Gas fees on Arc are paid in USDC (the native gas token). Fee values are exact onchain amounts from Blockscout.', 'Arc 链上 Gas 手续费以 USDC 支付（USDC 即原生 Gas 代币）。费用数据来自 Blockscout 链上记录。')}
            </div>
          </section>

          {/* USDC transfer list */}
          <section className="wallet-panel">
            <div className="wallet-panel-head">
              <div>
                <div className="section-kicker">{t('USDC TRANSFERS', 'USDC 转账记录')}</div>
                <h3>{t(`Recent transfers · ${rangeLabel}`, `近期转账 · ${rangeLabel}`)}</h3>
              </div>
              <span className="wallet-count">{transfersAvailable ? transfers.length : '—'} {t('records', '条')}</span>
            </div>
            {pagedTransfers.length > 0 ? (
              <>
                <div className="wallet-transfers-table">
                  <div className="wallet-transfers-head" aria-hidden>
                    <span>{t('TIME (UTC)', '时间 (UTC)')}</span>
                    <span>{t('DIRECTION', '方向')}</span>
                    <span>{t('COUNTERPARTY', '对手方')}</span>
                    <span>{t('AMOUNT', '金额')}</span>
                    <span/>
                  </div>
                  {pagedTransfers.map(tf => {
                    const isIn = tf.to.hash.toLowerCase() === address.toLowerCase();
                    const counterparty = isIn ? tf.from.hash : tf.to.hash;
                    return (
                      <div className="wallet-transfer-row" key={`${tf.transaction_hash}-${tf.log_index}`}>
                        <span className="wallet-tf-time">{fmtDate(tf.timestamp, zh)}</span>
                        <span className={`wallet-tf-dir ${isIn ? 'in' : 'out'}`}>
                          {isIn ? <ArrowDownLeft size={11}/> : <ArrowUpRight size={11}/>}
                          {isIn ? t('IN', '转入') : t('OUT', '转出')}
                        </span>
                        <span className="wallet-tf-addr">
                          <a href={`${EXPLORER}/address/${counterparty}`} target="_blank" rel="noreferrer">
                            {shortAddr(counterparty)}
                          </a>
                        </span>
                        <span className={`wallet-tf-amount ${isIn ? 'positive' : 'negative'}`}>
                          {isIn ? '+' : '−'}{fmtUsdc(tokenUnits(tf.total.value, tf.total.decimals))}
                        </span>
                        <a className="wallet-tf-link" href={`${EXPLORER}/tx/${tf.transaction_hash}`} target="_blank" rel="noreferrer" aria-label={t('View tx', '查看交易')}>
                          <ExternalLink size={11}/>
                        </a>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="wallet-pagination">
                    <button onClick={() => setTxPage(p => Math.max(0, p - 1))} disabled={txPage === 0}>&lsaquo;</button>
                    <span>{txPage + 1} / {totalPages}</span>
                    <button onClick={() => setTxPage(p => Math.min(totalPages - 1, p + 1))} disabled={txPage === totalPages - 1}>&rsaquo;</button>
                  </div>
                )}
              </>
            ) : (
              <div className="wallet-empty-inline">{transfersAvailable ? t('No USDC transfers found in this range.', '该时间范围内未找到 USDC 转账记录。') : t('Transfer history is temporarily unavailable. Please retry later or open the explorer.', '转账历史暂不可用，请稍后重试或前往区块浏览器查看。')}</div>
            )}
            <div className="wallet-footnote">
              {t('Shows ERC-20 USDC transfers only. Source: Arc Mainnet Blockscout.', '仅显示 ERC-20 USDC 转账。数据来源：Arc 主网 Blockscout。')}
              {' '}<a href={`${EXPLORER}/address/${address}?tab=token_transfers`} target="_blank" rel="noreferrer">{t('View all on explorer', '在浏览器查看全部')} <ExternalLink size={10}/></a>
            </div>
          </section>

          <div className="wallet-data-note">
            <span>ⓘ</span>
            <p>
              {t(
                'Balance uses the Arc mainnet RPC, with Blockscout as fallback. History comes from Blockscout, capped at 10 transaction pages and 8 transfer pages. Partial coverage is marked. ERC-20 transfers exclude native-value transfers and do not capture every USDC movement. Results have a short cache.',
                '余额通过 Arc 主网 RPC 查询，Blockscout 作为备用；历史记录来自 Blockscout，最多读取 10 页交易和 8 页转账，未完整覆盖时会标注。ERC-20 转账不包含原生转账等全部 USDC 变动，结果采用短缓存。',
              )}
              {result && <span> {t('Checked at (UTC): ', '获取时间（UTC）：')}{new Date(result.checkedAt).toLocaleString(zh ? 'zh-CN' : 'en-US', { timeZone: 'UTC', hour12: false })}</span>}
            </p>
          </div>
        </>
      )}

      {!hasData && !loading && !error && (
        <div className="wallet-placeholder">
          <Search size={32}/>
          <b>{t('Enter an ARC address to get started', '输入 ARC 地址开始查询')}</b>
          <span>{t('Explore token holdings, trade P&L, transfers and Gas spend on Arc Mainnet.', '查看 Arc 主网代币持仓、交易盈亏、转账历史与 Gas 支出。')}</span>
        </div>
      )}

      <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href={EXPLORER} target="_blank" rel="noreferrer">{t('Powered by Blockscout', '数据来源 Blockscout')} <ExternalLink size={10}/></a></span></footer>
    </div>
  );
}
