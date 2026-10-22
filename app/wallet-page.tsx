'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Fuel, RefreshCw, Search, X } from 'lucide-react';

// ARC Mainnet Blockscout PRO API base (chain ID 5042)
const API_BASE = 'https://api.blockscout.com/5042/api/v2';
// ARC USDC ERC-20 address (same on all Arc networks)
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const EXPLORER = 'https://explorer.arc.io';

type Props = { language: 'en' | 'zh' };

// ── Blockscout response shapes ──────────────────────────────────────────────
type BSAddress = {
  hash: string;
  coin_balance: string | null;          // native (18-dec) = USDC
  token_balances_count: number | null;
  transactions_count: number | null;
};
type BSTokenBalance = {
  token: { address_hash: string; symbol: string; decimals: string | null; name: string };
  value: string;
};
type BSTx = {
  hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string } | null;
  fee: { value: string } | null;         // USDC wei (18-dec) on Arc
  value: string;                         // native USDC wei
  method: string | null;
  status: 'ok' | 'error' | string;
  block: number | null;
  decoded_input?: { method_call: string } | null;
};
type BSTokenTransfer = {
  transaction_hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string };
  total: { value: string; decimals: string | null };
  token: { symbol: string; address_hash: string };
  method: string | null;
};
type PagedResult<T> = { items: T[]; next_page_params: Record<string, unknown> | null };

// ── Helpers ─────────────────────────────────────────────────────────────────
const USDC6 = 1_000_000;
const WEI18 = 1e18;

// Arc native/fee amounts are in 18-dec wei (same asset as USDC ERC-20 6-dec)
function weiToUsdc(wei: string | null | undefined): number {
  if (!wei) return 0;
  return Number(BigInt(wei)) / WEI18;
}
// ERC-20 transfer values already carry their own decimals field
function tokenUnits(value: string, decimals: string | null): number {
  const dec = decimals ? parseInt(decimals, 10) : 6;
  return Number(BigInt(value)) / Math.pow(10, dec);
}
function fmtUsdc(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.000001) return '< $0.000001';
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1000) return `$${n.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
function fmtDate(iso: string, zh: boolean): string {
  return new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(iso));
}
function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
}

// ── Fetch helpers ────────────────────────────────────────────────────────────
async function bsFetch<T>(path: string, apiKey?: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Blockscout ${res.status}`);
  return res.json() as Promise<T>;
}

// Paginate up to maxPages pages, collecting items
async function fetchPaged<T>(
  path: string,
  maxPages: number,
  apiKey?: string,
): Promise<T[]> {
  const items: T[] = [];
  let url = path;
  for (let page = 0; page < maxPages; page++) {
    const data = await bsFetch<PagedResult<T>>(url, apiKey);
    items.push(...data.items);
    if (!data.next_page_params) break;
    const params = new URLSearchParams(
      Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)]),
    );
    url = `${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;
  }
  return items;
}

// ── Date range preset ────────────────────────────────────────────────────────
type Range = '7d' | '30d' | '90d' | 'all';

function rangeStart(range: Range): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86400000);
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WalletPage({ language }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;

  const [input, setInput] = useState('');
  const [address, setAddress] = useState('');
  const [range, setRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addrInfo, setAddrInfo] = useState<BSAddress | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<BSTx[]>([]);
  const [transfers, setTransfers] = useState<BSTokenTransfer[]>([]);
  const [txPage, setTxPage] = useState(0);       // transfer list pagination
  const TX_PAGE_SIZE = 15;

  const inputRef = useRef<HTMLInputElement>(null);

  const isValidAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());

  const lookup = useCallback(async (addr: string, r: Range) => {
    if (!isValidAddress(addr)) {
      setError(t('Please enter a valid 0x address.', '请输入有效的 0x 地址。'));
      return;
    }
    const a = addr.trim().toLowerCase();
    setLoading(true);
    setError(null);
    setAddrInfo(null);
    setUsdcBalance(null);
    setTxs([]);
    setTransfers([]);
    setTxPage(0);

    try {
      // 1. Address overview + token balances in parallel
      const [info, tokenBals] = await Promise.all([
        bsFetch<BSAddress>(`/addresses/${a}`),
        bsFetch<BSTokenBalance[]>(`/addresses/${a}/token-balances`),
      ]);
      setAddrInfo(info);

      // Find USDC ERC-20 balance
      const usdcBal = tokenBals.find(
        b => b.token.address_hash.toLowerCase() === USDC_ADDRESS.toLowerCase(),
      );
      setUsdcBalance(usdcBal ? tokenUnits(usdcBal.value, usdcBal.token.decimals) : 0);

      // 2. Transactions (for gas calc) — up to 10 pages = 500 txs
      const allTxs = await fetchPaged<BSTx>(`/addresses/${a}/transactions`, 10);
      const start = rangeStart(r);
      const filtered = start
        ? allTxs.filter(tx => tx.timestamp && new Date(tx.timestamp) >= start)
        : allTxs;
      setTxs(filtered);

      // 3. USDC ERC-20 token transfers — up to 8 pages = 400
      const allTransfers = await fetchPaged<BSTokenTransfer>(
        `/addresses/${a}/token-transfers?token=${USDC_ADDRESS}`,
        8,
      );
      const filteredTransfers = start
        ? allTransfers.filter(tf => tf.timestamp && new Date(tf.timestamp) >= start)
        : allTransfers;
      setTransfers(filteredTransfers);

    } catch (e) {
      setError(t(
        'Could not fetch data from Blockscout. Check the address or try again.',
        '无法从 Blockscout 获取数据，请检查地址后重试。',
      ));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [zh]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddress(input.trim());
    void lookup(input.trim(), range);
  }

  function handleRangeChange(r: Range) {
    setRange(r);
    if (address) void lookup(address, r);
  }

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

  const hasData = addrInfo !== null;

  return (
    <div className="content wallet-content">
      <div className="page-heading wallet-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC CHAIN EXPLORER', 'ARC 链上探索')}<span className="eyebrow-line"/></div>
          <h1>{t('Wallet', '地址')} <span>{t('Lookup', '查询')}</span></h1>
          <p className="subtitle">{t('Query USDC balance, transfers and Gas spend for any Arc address.', '查询任意 Arc 地址的 USDC 余额、转账记录与 Gas 支出。')}</p>
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

      {error && <div className="wallet-error" role="alert">{error}</div>}

      {loading && (
        <div className="wallet-loading" role="status">
          <RefreshCw size={16} className="spin"/>
          <span>{t('Fetching onchain data…', '正在获取链上数据…')}</span>
        </div>
      )}

      {hasData && !loading && (
        <>
          {/* Address header */}
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

          {/* Stats grid */}
          <div className="wallet-stats-grid">
            <article className="wallet-stat-card wallet-stat-primary">
              <span className="wallet-stat-label">{t('USDC BALANCE', 'USDC 余额')}</span>
              <strong>{usdcBalance !== null ? fmtUsdc(usdcBalance) : '—'}</strong>
              <small>{t('ERC-20 · ARC Mainnet', 'ERC-20 · Arc 主网')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{t('USDC IN · ' + rangeLabel.toUpperCase(), 'USDC 流入 · ' + rangeLabel)}</span>
              <strong className="positive">{fmtUsdc(usdcIn)}</strong>
              <small>{transfers.filter(tf => tf.to.hash.toLowerCase() === address.toLowerCase()).length} {t('transfers', '笔转入')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{t('USDC OUT · ' + rangeLabel.toUpperCase(), 'USDC 流出 · ' + rangeLabel)}</span>
              <strong className="negative">{fmtUsdc(usdcOut)}</strong>
              <small>{transfers.filter(tf => tf.from.hash.toLowerCase() === address.toLowerCase()).length} {t('transfers', '笔转出')}</small>
            </article>
            <article className="wallet-stat-card">
              <span className="wallet-stat-label">{t('NET USDC · ' + rangeLabel.toUpperCase(), 'USDC 净值 · ' + rangeLabel)}</span>
              <strong className={netUsdc >= 0 ? 'positive' : 'negative'}>{netUsdc >= 0 ? '+' : ''}{fmtUsdc(netUsdc)}</strong>
              <small>{t('In minus out', '流入减流出')}</small>
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
                <span>{t('TOTAL GAS · ' + rangeLabel.toUpperCase(), 'Gas 总支出 · ' + rangeLabel)}</span>
                <strong>{fmtUsdc(totalGasUsdc)}</strong>
              </div>
              <div className="wallet-gas-meta">
                <div><span>{t('Sent txs', '发起交易')}</span><b>{sentTxs.length}</b></div>
                <div><span>{t('Success', '成功')}</span><b className="positive">{successTxs}</b></div>
                <div><span>{t('Reverted', '回滚')}</span><b className={failedTxs > 0 ? 'negative' : ''}>{failedTxs}</b></div>
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
            {sentTxs.length === 0 && (
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
              <span className="wallet-count">{transfers.length} {t('records', '条')}</span>
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
                      <div className="wallet-transfer-row" key={`${tf.transaction_hash}-${tf.to.hash}`}>
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
              <div className="wallet-empty-inline">{t('No USDC transfers found in this range.', '该时间范围内未找到 USDC 转账记录。')}</div>
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
                'Data is fetched live from the Arc Mainnet Blockscout API. Transfers are limited to the most recent 400 records per range. For complete history, use the Blockscout explorer.',
                '数据实时来自 Arc 主网 Blockscout API。每次查询最多返回最近 400 条转账记录。如需完整历史，请前往 Blockscout 浏览器。',
              )}
            </p>
          </div>
        </>
      )}

      {!hasData && !loading && !error && (
        <div className="wallet-placeholder">
          <Search size={32}/>
          <b>{t('Enter an ARC address to get started', '输入 ARC 地址开始查询')}</b>
          <span>{t('Lookup USDC balance, transfer history and Gas spend on Arc Mainnet.', '查询 Arc 主网上的 USDC 余额、转账历史与 Gas 支出。')}</span>
        </div>
      )}

      <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span><span><a href={EXPLORER} target="_blank" rel="noreferrer">{t('Powered by Blockscout', '数据来源 Blockscout')} <ExternalLink size={10}/></a></span></footer>
    </div>
  );
}
