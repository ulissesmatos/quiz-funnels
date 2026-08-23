"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { QuestionBreakdown } from "@/server/analytics/queries";

import { TOOLTIP_STYLE } from "./chart-theme";

const BAR_COLOR = "var(--color-app-primary)";

type ChoiceOptions = Extract<QuestionBreakdown, { kind: "choice" }>["options"];

export function AnswerBarChart({ options }: { options: ChoiceOptions }) {
  const height = Math.max(120, options.length * 36);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={options} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
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
            width={140}
            tick={{ fill: "var(--color-app-text)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={TOOLTIP_STYLE.cursor}
            contentStyle={TOOLTIP_STYLE.contentStyle}
            labelStyle={TOOLTIP_STYLE.labelStyle}
            formatter={(value) => [`${value} respostas`, "Respostas"]}
          />
          <Bar dataKey="count" name="Respostas" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey="count" position="right" style={{ fill: "var(--color-app-muted)", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
