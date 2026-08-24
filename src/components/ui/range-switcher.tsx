import Link from "next/link";

import { cn } from "@/lib/cn";
import type { RangeKey } from "@/server/analytics/queries";

const OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

/**
 * Links puros — sem estado de cliente, a URL já é a fonte da verdade do range.
 *
 * `extraParams` preserva outros filtros da mesma página (ex.: `funil`) que um
 * `href="?range=X"` simples apagaria, por substituir a query string inteira.
 * Trocar de range também reinicia `page`, de propósito — a paginação da
 * página anterior não faz sentido para um recorte de dado diferente.
 */
export function RangeSwitcher({
  current,
  param = "range",
  extraParams,
}: {
  current: RangeKey;
  param?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex rounded-lg border border-app-border p-0.5">
      {OPTIONS.map(({ key, label }) => {
        const params = new URLSearchParams();
        for (const [nome, valor] of Object.entries(extraParams ?? {})) {
          if (valor) params.set(nome, valor);
        }
        params.set(param, key);

        return (
          <Link
            key={key}
            href={`?${params.toString()}`}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 ease-app",
              current === key ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:text-app-text",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
