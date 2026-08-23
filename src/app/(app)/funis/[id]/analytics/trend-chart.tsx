"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TrendPoint } from "@/server/analytics/queries";

import { EIXO_CATEGORIA, EIXO_VALOR, GRADE, TOOLTIP_STYLE } from "./chart-theme";

/** Duas séries = identidade categórica: slots 1 e 2 da paleta, nessa ordem fixa. */
const VIEWS_COLOR = "var(--color-chart-1)";
const COMPLETIONS_COLOR = "var(--color-chart-2)";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* `left: 0`, não negativo: a margem negativa puxava o eixo Y pra fora
            do SVG e cortava a primeira casa dos rótulos de dois dígitos. */}
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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

          <CartesianGrid {...GRADE} />
          <XAxis dataKey="date" {...EIXO_CATEGORIA} minTickGap={24} />
          <YAxis {...EIXO_VALOR} width={32} />
          <Tooltip contentStyle={TOOLTIP_STYLE.contentStyle} labelStyle={TOOLTIP_STYLE.labelStyle} />
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
