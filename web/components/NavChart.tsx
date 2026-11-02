"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { NavPoint } from "@/lib/hooks";

export function NavChart({ points, symbol, tone }: { points: NavPoint[]; symbol: string; tone: "gold" | "ink" }) {
  if (points.length < 2)
    return (
      <div className="panel quiet small muted" style={{ height: 220, display: "grid", placeItems: "center" }}>
        The price chart fills in as the keeper records snapshots.
      </div>
    );
  const data = points.map((p) => ({ t: p.t, v: p.navPerShare }));
  const color = tone === "gold" ? "var(--gold)" : "var(--ink)";
  return (
    <div style={{ height: 240 }} aria-label="Share price history" role="img">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${symbol}${Number(v).toFixed(4)}`}
            stroke="var(--muted)"
            fontSize={12}
            width={80}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => [`${symbol}${Number(v).toFixed(4)}`, "Share price"]}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-AU")}
            contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6 }}
          />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
