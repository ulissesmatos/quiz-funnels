"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Select nativo que navega trocando `?funil=` — sem estado de cliente, a URL continua a fonte da verdade. */
export function FunnelFilter({ funnels, current }: { funnels: { id: string; name: string }[]; current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("funil", value);
    else params.delete("funil");
    params.delete("page"); // trocar o filtro reinicia a paginação

    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={current ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por funil"
      className="h-9 rounded-lg border border-app-border bg-app-surface px-2.5 text-sm text-app-text focus:border-app-primary focus:outline-none"
    >
      <option value="">Todos os funis</option>
      {funnels.map((funnel) => (
        <option key={funnel.id} value={funnel.id}>
          {funnel.name}
        </option>
      ))}
    </select>
  );
}
