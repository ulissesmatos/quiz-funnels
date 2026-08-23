import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Faixa de aviso. Cobre os dois formatos que existiam soltos: o erro de
 * formulário (`text-xs text-app-danger`, 16 ocorrências) e a faixa tingida do
 * layout/configurações (`bg-app-danger/15` etc.).
 *
 * `role="alert"` só quando o tom é de erro — um aviso informativo anunciado
 * como alerta atrapalha quem usa leitor de tela.
 */
const TONES = {
  info: { box: "bg-app-surface-2 text-app-text", icon: Info, iconColor: "text-app-muted" },
  success: { box: "bg-app-success/10 text-app-success", icon: CheckCircle2, iconColor: "" },
  warning: { box: "bg-app-warning/10 text-app-warning", icon: TriangleAlert, iconColor: "" },
  danger: { box: "bg-app-danger/10 text-app-danger", icon: AlertCircle, iconColor: "" },
} as const;

export function Alert({
  tone = "info",
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  const { box, icon: Icone, iconColor } = TONES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm", box, className)}
      {...props}
    >
      <Icone size={15} className={cn("mt-0.5 shrink-0", iconColor)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
