"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  width?: number;
}
export interface ChartPoint {
  date: string;
  [key: string]: string | number;
}
export interface ChartMarker {
  date: string;
  label: string;
}

type Range = "1W" | "1M" | "ALL";
const RANGE_DAYS: Record<Range, number> = { "1W": 7, "1M": 30, ALL: Infinity };

/** Evenly spaced, round-numbered axis ticks that cover [min, max]. */
function niceTicks(min: number, max: number, target = 5): number[] {
  const span = max - min || 1;
  const raw = span / (target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(6)));
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const daysAgo = (iso: string, n: number) => new Date(Date.parse(iso) - n * 86_400_000).toISOString().slice(0, 10);

interface Props {
  data: ChartPoint[];
  series: ChartSeries[];
  markers?: ChartMarker[];
  mode: "index" | "usd";
  height?: number;
  note?: string;
  rangeToggle?: boolean;
}

export function PerformanceChart({ data, series, markers = [], mode, height = 320, note, rangeToggle = true }: Props) {
  const [range, setRange] = useState<Range>("ALL");

  const visible = useMemo(() => {
    if (!data.length || range === "ALL") return data;
    const cutoff = daysAgo(data[data.length - 1].date, RANGE_DAYS[range]);
    const sliced = data.filter((p) => p.date >= cutoff);
    return sliced.length >= 2 ? sliced : data.slice(-2);
  }, [data, range]);

  const ticks = useMemo(() => {
    const vals = visible.flatMap((p) => series.map((s) => Number(p[s.key])).filter((v) => Number.isFinite(v)));
    return niceTicks(Math.min(...vals), Math.max(...vals));
  }, [visible, series]);

  const fmt = (v: number) =>
    mode === "index" ? v.toFixed(1) : `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;
  const first = series[0]?.key;

  return (
    <div className="chart-box">
      {rangeToggle && (
        <div className="seg" role="group" aria-label="Chart range">
          {(["1W", "1M", "ALL"] as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r === "ALL" ? "Since inception" : r}
            </button>
          ))}
        </div>
      )}
      <div style={{ width: "100%", height, marginTop: 12 }}>
        <ResponsiveContainer>
          <LineChart data={visible} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={short}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--rule)"
              minTickGap={32}
            />
            <YAxis
              width={56}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--rule)"
              tickFormatter={(v: number) => fmt(v)}
              ticks={ticks}
              domain={[ticks[0], ticks[ticks.length - 1]]}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="chart-tip">
                    <div className="muted">{short(String(label))}</div>
                    {payload.map((p) => (
                      <div className="row" key={String(p.dataKey)}>
                        <span style={{ color: p.color }}>{p.name}</span>
                        <b>{fmt(Number(p.value))}</b>
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.width ?? 2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {first &&
              markers
                .filter((m) => visible.some((p) => p.date === m.date))
                .map((m) => {
                  const p = visible.find((x) => x.date === m.date)!;
                  return (
                    <ReferenceDot
                      key={m.date + m.label}
                      x={m.date}
                      y={Number(p[first])}
                      r={4}
                      fill="var(--paper)"
                      stroke="var(--ink)"
                      strokeWidth={2}
                      ifOverflow="visible"
                    />
                  );
                })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i
              className="legend-swatch"
              style={{ borderTopColor: s.color, borderTopStyle: s.dashed ? "dashed" : "solid" }}
            />
            {s.label}
          </span>
        ))}
        {markers.length > 0 && (
          <span>
            <i className="legend-swatch" style={{ borderTop: 0, width: 10, height: 10, border: "2px solid var(--ink)", borderRadius: "50%" }} />
            Trade / rebalance
          </span>
        )}
      </div>
      {note && <p className="chart-note">{note}</p>}
    </div>
  );
}
