"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export const DONUT_COLORS = ["#3d5a9e", "#c28a2b", "#3f9a8a", "#9c6bb0", "#c4605a", "#7a7f8c"];

export function Donut({ slices, centre, sub }: { slices: { label: string; value: number }[]; centre: string; sub: string }) {
  return (
    <div>
      <div style={{ position: "relative", width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="var(--paper)"
              isAnimationActive={false}
            >
              {slices.map((s, i) => (
                <Cell key={s.label} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span className="tile-value" style={{ fontSize: "1.6rem" }}>{centre}</span>
          <span className="muted" style={{ fontSize: "0.75rem" }}>{sub}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((s, i) => (
          <li key={s.label}>
            <i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            {s.label} {(s.value * 100).toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
