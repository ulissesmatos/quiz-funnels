"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TrendPoint } from "@/server/analytics/queries";

/** Duas séries = identidade categórica: slots 1 e 2 da paleta, nessa ordem fixa. */
const VIEWS_COLOR = "var(--color-chart-1)";
const COMPLETIONS_COLOR = "var(--color-chart-2)";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="qf-views-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIEWS_COLOR} stopOpacity={0.12} />
              <stop offset="100%" stopColor={VIEWS_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="qf-completions-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COMPLETIONS_COLOR} stopOpacity={0.12} />
              <stop offset="100%" stopColor={COMPLETIONS_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--color-app-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-app-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-app-border)" }}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-app-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-app-surface)",
              border: "1px solid var(--color-app-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-app-text)",
            }}
            labelStyle={{ color: "var(--color-app-muted)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-app-muted)" }}
            iconType="plainline"
            iconSize={12}
          />

          <Area
            type="monotone"
            dataKey="views"
            name="Visualizações"
            stroke={VIEWS_COLOR}
            strokeWidth={2}
            fill="url(#qf-views-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-app-surface)" }}
          />
          <Area
            type="monotone"
            dataKey="completions"
            name="Conclusões"
            stroke={COMPLETIONS_COLOR}
            strokeWidth={2}
            fill="url(#qf-completions-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-app-surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
