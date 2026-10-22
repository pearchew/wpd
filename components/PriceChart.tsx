"use client";

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
import { price } from "@/lib/format";

interface Props {
  data: { date: string; price: number }[];
  buy?: { date: string; price: number };
  /** the asset's own currency */
  currency?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

export function PriceChart({ data, buy, currency = "USD" }: Props) {
  const fmt = (v: number) => price(v, currency);
  const prices = data.map((d) => d.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = (hi - lo) * 0.08 || 1;
  return (
    <div className="chart-box">
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="date" tickFormatter={short} tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--rule)" minTickGap={32} />
            <YAxis
              width={currency === "USD" ? 56 : 72}
              domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              stroke="var(--rule)"
              tickFormatter={fmt}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="chart-tip">
                    <div className="muted">{short(String(label))}</div>
                    <div className="row">
                      <span>Close</span>
                      <b>{fmt(Number(payload[0].value))}</b>
                    </div>
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey="price" name="Close" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {buy && data.some((d) => d.date === buy.date) && (
              <ReferenceDot x={buy.date} y={buy.price} r={5} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-swatch" style={{ borderTopColor: "var(--accent)" }} />
          Close
        </span>
        {buy && <span>○ Our purchase</span>}
      </div>
    </div>
  );
}
