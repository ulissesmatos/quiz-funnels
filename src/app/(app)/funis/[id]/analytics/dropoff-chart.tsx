"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { StepDropoff } from "@/server/analytics/queries";

import { TOOLTIP_STYLE } from "./chart-theme";

/** Uma métrica só (sessões por etapa), não identidade — um hue só, o do app. */
const BAR_COLOR = "var(--color-app-primary)";

export function DropoffChart({ data }: { data: StepDropoff[] }) {
  const chartData = data.map((step, index) => ({ ...step, label: `${index + 1}. ${step.stepName}` }));
  const height = Math.max(160, chartData.length * 40);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--color-app-border)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--color-app-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-app-border)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fill: "var(--color-app-text)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={TOOLTIP_STYLE.cursor}
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(value) => [`${value} sessões`, "Sessões"]}
          />
          <Bar dataKey="sessions" name="Sessões" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList dataKey="sessions" position="right" style={{ fill: "var(--color-app-muted)", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
