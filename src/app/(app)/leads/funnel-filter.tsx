"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/field";

/** Select nativo que navega trocando `?funil=` — sem estado de cliente, a URL continua a fonte da verdade. */
export function FunnelFilter({ funnels, current }: { funnels: { id: string; name: string }[]; current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("funil", value);
      params.delete("todos");
    } else {
      // "Todos os funis" aqui é a visão combinada explícita — sem isto, tirar
      // o filtro voltaria pro seletor em vez de mostrar a tabela misturada.
      params.delete("funil");
      params.set("todos", "1");
    }
    params.delete("page"); // trocar o filtro reinicia a paginação

    router.push(`?${params.toString()}`);
  }

  return (
    <Select
      value={current ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por funil"
      className="h-9"
    >
      <option value="">Todos os funis</option>
      {funnels.map((funnel) => (
        <option key={funnel.id} value={funnel.id}>
          {funnel.name}
        </option>
      ))}
    </Select>
  );
}
