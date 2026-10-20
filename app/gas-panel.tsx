'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { Activity, X, Zap } from 'lucide-react';

const ARC_RPC = 'https://rpc.mainnet.arc.io';
// A standard ERC-20 transfer costs ~65 000 gas on Arc.
const TRANSFER_GAS = BigInt(65_000);
// A simple USDC transfer costs ~21 000 gas.
const SIMPLE_GAS = BigInt(21_000);
// A typical DEX swap costs ~150 000 gas.
const SWAP_GAS = BigInt(150_000);

type GasSample = { t: number; gwei: number };

async function fetchGasPrice(): Promise<{ gasPriceWei: bigint; baseFeeWei: bigint | null }> {
  const body = JSON.stringify([
    { jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] },
    { jsonrpc: '2.0', id: 2, method: 'eth_feeHistory', params: ['0x1', 'latest', [25, 50, 75]] },
  ]);
  const res = await fetch(ARC_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error('RPC error');
  const [gp, fh] = await res.json() as [
    { result: string },
    { result: { baseFeePerGas?: string[] } },
  ];
  const gasPriceWei = BigInt(gp.result);
  const baseFees = fh.result?.baseFeePerGas;
  const baseFeeWei = baseFees?.length ? BigInt(baseFees[baseFees.length - 1]) : null;
  return { gasPriceWei, baseFeeWei };
}

// Convert wei gas price to USDC cost for a given gas limit.
// On Arc: USDC has 6 decimals; native (gas token) has 18 decimals.
// They are the same asset — 1 USDC (ERC-20) = 1e6 units = 1e18 native units.
// So: cost_usdc = gasPriceWei * gasLimit / 1e18, then format as USDC (6 dec).
function weiToUsdc(gasPriceWei: bigint, gasLimit: bigint): string {
  // Multiply first, then divide by 1e18, keep 6 significant decimals.
  const raw = gasPriceWei * gasLimit; // in wei
  // raw / 1e18 = USDC value; display with up to 6 decimal places.
  const usdc = Number(raw) / 1e18;
  if (usdc === 0) return '< $0.000001';
  if (usdc < 0.0001) return `$${usdc.toFixed(6)}`;
  if (usdc < 0.01) return `$${usdc.toFixed(4)}`;
  return `$${usdc.toFixed(4)}`;
}

function gweiLabel(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  return gwei < 0.001 ? '< 0.001' : gwei < 1 ? gwei.toFixed(4) : gwei.toFixed(3);
}

type Props = { zh: boolean; isDark: boolean };

export default function GasPanel({ zh, isDark }: Props) {
  const t = (en: string, cn: string) => zh ? cn : en;

  const [open, setOpen] = useState(false);
  const [gasPriceWei, setGasPriceWei] = useState<bigint | null>(null);
  const [baseFeeWei, setBaseFeeWei] = useState<bigint | null>(null);
  const [history, setHistory] = useState<GasSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const poll = useCallback(async () => {
    try {
      setLoading(true);
      const { gasPriceWei: gp, baseFeeWei: bf } = await fetchGasPrice();
      setGasPriceWei(gp);
      setBaseFeeWei(bf);
      setError(false);
      setHistory(prev => {
        const next = [...prev, { t: Date.now(), gwei: Number(gp) / 1e9 }];
        return next.slice(-20);
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start polling on mount; continue every 10s.
  useEffect(() => {
    void poll();
    const tick = () => {
      timerRef.current = setTimeout(() => {
        void poll();
        tick();
      }, 10_000);
    };
    tick();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [poll]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  const gasBadge = gasPriceWei !== null
    ? `${gweiLabel(gasPriceWei)} Gwei`
    : error ? t('RPC err', 'RPC 错误') : '…';

  const transferCost = gasPriceWei !== null ? weiToUsdc(gasPriceWei, TRANSFER_GAS) : '—';
  const simpleCost   = gasPriceWei !== null ? weiToUsdc(gasPriceWei, SIMPLE_GAS)   : '—';
  const swapCost     = gasPriceWei !== null ? weiToUsdc(gasPriceWei, SWAP_GAS)     : '—';

  const chartMin = history.length > 1 ? Math.min(...history.map(p => p.gwei)) * 0.92 : 0;
  const chartMax = history.length > 1 ? Math.max(...history.map(p => p.gwei)) * 1.08 : 1;

  return (
    <div className="gas-panel-root">
      <button
        ref={btnRef}
        className={`gas-trigger-btn${open ? ' gas-trigger-btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={t('Gas fee panel', 'Gas 费用面板')}
        aria-expanded={open}
      >
        <Zap size={13} className={loading ? 'gas-zap-spin' : ''}/>
        <span className="gas-trigger-value">{gasBadge}</span>
        <span className="gas-trigger-label">GAS</span>
      </button>

      {open && (
        <div ref={panelRef} className="gas-popup" role="dialog" aria-label={t('Gas fee panel', 'Gas 费用面板')}>
          <div className="gas-popup-head">
            <div className="gas-popup-title">
              <Activity size={13}/>
              <span>{t('ARC GAS · LIVE', 'ARC GAS · 实时')}</span>
              <span className="gas-popup-usdc-badge">USDC = GAS</span>
            </div>
            <button className="gas-popup-close" onClick={() => setOpen(false)} aria-label={t('Close', '关闭')}><X size={13}/></button>
          </div>

          {error && (
            <div className="gas-popup-error">
              {t('Unable to reach Arc RPC. Retrying…', '无法连接 Arc RPC，正在重试…')}
            </div>
          )}

          <div className="gas-popup-main">
            <div className="gas-popup-price-block">
              <span className="gas-popup-price-label">{t('CURRENT GAS PRICE', '当前 Gas 价格')}</span>
              <strong className="gas-popup-price">
                {gasPriceWei !== null ? gweiLabel(gasPriceWei) : '…'}
                <small>Gwei</small>
              </strong>
              {baseFeeWei !== null && (
                <span className="gas-popup-basefee">
                  {t('Base fee', '基础费')} {gweiLabel(baseFeeWei)} Gwei
                </span>
              )}
            </div>

            <div className="gas-popup-chart">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gasChartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c2f970" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#c2f970" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <YAxis domain={[chartMin, chartMax]} hide/>
                    <Tooltip
                      contentStyle={{ background: isDark ? '#151920' : '#fff', border: `1px solid ${isDark ? '#303640' : '#dfe3da'}`, borderRadius: 6, fontSize: 10, color: isDark ? '#eef0eb' : '#20251e' }}
                      formatter={(v: number) => [`${v.toFixed(4)} Gwei`, t('Gas price', 'Gas 价格')]}
                      labelFormatter={() => ''}
                    />
                    <Area type="monotone" dataKey="gwei" stroke="#c2f970" strokeWidth={1.8} fill="url(#gasChartFill)" isAnimationActive={false} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="gas-popup-chart-empty">{t('Collecting samples…', '正在采集数据…')}</div>
              )}
            </div>
            <p className="gas-popup-chart-note">{t('Gas price samples · last 20 readings · 10s interval', 'Gas 价格采样 · 最近 20 次 · 每 10 秒')}</p>
          </div>

          <div className="gas-popup-estimates">
            <div className="gas-popup-estimates-label">{t('USDC FEE ESTIMATES', 'USDC 费用估算')}</div>
            <div className="gas-popup-estimate-row">
              <span>{t('USDC transfer', 'USDC 转账')}</span>
              <span className="gas-popup-est-gas">{Number(SIMPLE_GAS).toLocaleString()} gas</span>
              <strong>{simpleCost}</strong>
            </div>
            <div className="gas-popup-estimate-row">
              <span>{t('Token transfer', '代币转账')}</span>
              <span className="gas-popup-est-gas">{Number(TRANSFER_GAS).toLocaleString()} gas</span>
              <strong>{transferCost}</strong>
            </div>
            <div className="gas-popup-estimate-row">
              <span>{t('DEX swap', 'DEX 兑换')}</span>
              <span className="gas-popup-est-gas">{Number(SWAP_GAS).toLocaleString()} gas</span>
              <strong>{swapCost}</strong>
            </div>
          </div>

          <div className="gas-popup-foot">
            <span>{t('Arc Mainnet · USDC is the native gas token', 'Arc 主网 · USDC 即原生 Gas 代币')}</span>
            <a href="https://explorer.arc.io/gas-tracker" target="_blank" rel="noreferrer">{t('Explorer', '浏览器')}</a>
          </div>
        </div>
      )}
    </div>
  );
}
