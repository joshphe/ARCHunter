'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FLOW_CHAINS, type CapitalFlowSnapshot, type FlowDirection } from '@/lib/capital-flow';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);

type TrendRow = {
  time: number;
  label: string;
  inflow: number | null;
  outflow: number | null;
  net: number | null;
  partial: boolean;
};

type Props = {
  snapshot: CapitalFlowSnapshot;
  domain: number | null;
  direction: FlowDirection;
  zh: boolean;
};

function TrendTooltip({
  active,
  payload,
  zh,
  direction,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendRow }>;
  zh: boolean;
  direction: FlowDirection;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="flow-trend-tooltip">
      <b>
        {new Date(row.time).toLocaleString(zh ? 'zh-CN' : 'en-US', {
          timeZone: 'UTC',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        UTC
      </b>
      {direction !== 'out' && (
        <span>
          {zh ? '流入' : 'Inflow'} <strong>{money(row.inflow ?? 0)}</strong>
        </span>
      )}
      {direction !== 'in' && (
        <span>
          {zh ? '流出' : 'Outflow'} <strong>{money(Math.abs(row.outflow ?? 0))}</strong>
        </span>
      )}
      {direction === 'all' && (
        <span>
          {zh ? '净流入' : 'Net inflow'} <strong>{money(row.net ?? 0)}</strong>
        </span>
      )}
      {row.partial && (
        <small>
          {zh ? '此时段仅包含已覆盖部分' : 'This interval is partially covered'}
        </small>
      )}
    </div>
  );
}

export default function CapitalFlowTrend({ snapshot, domain, direction, zh }: Props) {
  const hourly = snapshot.window === '24h';
  const step = hourly ? 3_600_000 : 86_400_000;

  const data = useMemo(() => {
    const from = Math.floor(Date.parse(snapshot.from) / step) * step;
    const to = Date.parse(snapshot.to);
    const coveredFrom = Date.parse(snapshot.coverageFrom ?? '');
    const coveredTo = Date.parse(snapshot.coverageTo ?? '');
    const labelFmt = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
      timeZone: 'UTC',
      ...(hourly
        ? { hour: '2-digit', minute: '2-digit' }
        : { month: 'short', day: 'numeric' }),
    });

    // Floor every history timestamp onto the same UTC bucket grid used for the X axis,
    // so bar/line series never look up a different key than the category they render on.
    const grouped = new Map<number, { inflow: number; outflow: number }>();
    for (const row of snapshot.history ?? []) {
      if (domain !== null && row.domain !== domain) continue;
      const parsed = Date.parse(row.timestamp);
      if (!Number.isFinite(parsed)) continue;
      const time = Math.floor(parsed / step) * step;
      const sum = grouped.get(time) ?? { inflow: 0, outflow: 0 };
      sum.inflow += Number(row.inflow) || 0;
      sum.outflow += Number(row.outflow) || 0;
      grouped.set(time, sum);
    }

    const rows: TrendRow[] = [];
    for (let time = from; time <= to; time += step) {
      const known =
        time + step > coveredFrom &&
        time <= coveredTo &&
        Number.isFinite(coveredFrom) &&
        Number.isFinite(coveredTo);
      const value = grouped.get(time) ?? { inflow: 0, outflow: 0 };
      rows.push({
        time,
        label: labelFmt.format(time),
        inflow: known ? value.inflow : null,
        // Negative so outflow renders below the zero baseline when stacked with inflow.
        outflow: known ? -value.outflow : null,
        net: known ? value.inflow - value.outflow : null,
        partial: time < coveredFrom || time + step > coveredTo,
      });
    }
    return rows;
  }, [snapshot, domain, zh, step, hourly]);

  const hasSeries = data.some(
    (row) => row.inflow != null || row.outflow != null || row.net != null,
  );
  const chainName =
    domain !== null
      ? FLOW_CHAINS.find((chain) => chain.domain === domain)?.name ?? `Domain ${domain}`
      : null;

  return (
    <div className="flow-trend">
      <div className="flow-trend-heading">
        <b>
          {chainName ? `${chainName} ↔ ARC · ` : ''}
          {zh ? '资金流入流出趋势' : 'Capital flow over time'}
        </b>
        <span>
          {hourly ? (zh ? '按小时' : 'Hourly') : zh ? '按 UTC 日期' : 'Daily UTC'} · USDC
        </span>
      </div>

      {!hasSeries ? (
        <div className="flow-trend-empty" role="status">
          {zh
            ? '该链在当前时间窗口内还没有可绘制的已核验资金记录。'
            : 'No verified flow points to chart for this corridor in the selected window.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={390}>
          <ComposedChart
            data={data}
            margin={{ top: 18, right: 18, bottom: 8, left: 6 }}
            barCategoryGap="22%"
            barGap={0}
          >
            <CartesianGrid
              stroke="var(--flow-line)"
              vertical={false}
              strokeDasharray="3 5"
            />
            {/* Category axis keyed by bucket ms so ticks stay unique and align with series. */}
            <XAxis
              dataKey="time"
              type="category"
              allowDuplicatedCategory={false}
              stroke="var(--flow-muted)"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11, fill: 'var(--flow-muted)' }}
              tickFormatter={(value) => {
                const row = data.find((item) => item.time === Number(value));
                return row?.label ?? '';
              }}
            />
            <YAxis
              tickFormatter={money}
              stroke="var(--flow-muted)"
              tickLine={false}
              axisLine={false}
              width={78}
              tick={{ fontSize: 11, fill: 'var(--flow-muted)' }}
            />
            <ReferenceLine
              y={0}
              stroke="var(--flow-muted)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <Tooltip
              content={<TrendTooltip zh={zh} direction={direction} />}
              cursor={{ fill: 'var(--flow-line)', opacity: 0.18 }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
            />
            {/* Same stackId keeps inflow/outflow on one X slot so the net line sits on the bar center. */}
            {direction !== 'out' && (
              <Bar
                dataKey="inflow"
                name={zh ? '流入 ARC' : 'Into Arc'}
                fill="var(--flow-green)"
                fillOpacity={0.88}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                stackId="flow"
                isAnimationActive={false}
              />
            )}
            {direction !== 'in' && (
              <Bar
                dataKey="outflow"
                name={zh ? '流出 ARC' : 'Out of Arc'}
                fill="var(--flow-red)"
                fillOpacity={0.88}
                radius={[0, 0, 4, 4]}
                maxBarSize={30}
                stackId="flow"
                isAnimationActive={false}
              />
            )}
            {direction === 'all' && (
              <Line
                dataKey="net"
                name={zh ? '净流入' : 'Net inflow'}
                type="monotone"
                stroke="var(--flow-trend-line)"
                strokeWidth={2.25}
                dot={{ r: 2.5, strokeWidth: 0, fill: 'var(--flow-trend-line)' }}
                activeDot={{ r: 4.5, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <p>
        {zh
          ? '空白时段表示尚未覆盖；边界时段可能不完整。流出绘制在零轴下方，折线表示流入减去流出。'
          : 'Blank intervals are not covered. Boundary intervals may be incomplete. Outflows appear below zero; the line shows inflow minus outflow.'}
      </p>
    </div>
  );
}
