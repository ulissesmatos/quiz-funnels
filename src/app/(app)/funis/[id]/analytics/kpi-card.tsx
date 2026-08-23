export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4">
      <p className="text-xs text-app-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-app-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-app-muted">{hint}</p>}
    </div>
  );
}
