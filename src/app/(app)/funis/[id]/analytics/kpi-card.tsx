import { Card } from "@/components/ui/card";

/**
 * Número em destaque do analytics. O valor é o herói do cartão: fonte grande,
 * `tabular-nums` pra os dígitos não dançarem quando o número muda de faixa, e
 * `tracking` apertado pra não parecer texto corrido.
 */
export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card padding="sm">
      <p className="text-xs font-medium tracking-wide text-app-muted uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-app-text tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-app-muted">{hint}</p>}
    </Card>
  );
}
