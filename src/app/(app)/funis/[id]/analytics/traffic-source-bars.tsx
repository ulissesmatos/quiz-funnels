import { TRAFFIC_SOURCE_LABELS } from "@/server/analytics/traffic-source";
import type { TrafficSourceBreakdown } from "@/server/analytics/queries";

/** Identidade categórica: até 6 fontes, slots 1..N na ordem fixa da paleta. */
const SLOT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

export function TrafficSourceBars({ data }: { data: TrafficSourceBreakdown[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-app-surface-2">
        {data.map((entry, index) => (
          <div
            key={entry.source}
            style={{ width: `${Math.max(entry.pct * 100, 1)}%`, backgroundColor: SLOT_COLORS[index % SLOT_COLORS.length] }}
            title={`${TRAFFIC_SOURCE_LABELS[entry.source]}: ${Math.round(entry.pct * 100)}%`}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {data.map((entry, index) => (
          <li key={entry.source} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SLOT_COLORS[index % SLOT_COLORS.length] }}
              />
              <span className="text-app-text">{TRAFFIC_SOURCE_LABELS[entry.source]}</span>
            </span>
            <span className="text-app-muted tabular-nums">
              {entry.sessions} · {Math.round(entry.pct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
