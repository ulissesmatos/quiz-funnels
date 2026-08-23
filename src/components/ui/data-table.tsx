import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Casca de tabela. `leads` e `admin/organizacoes` tinham as mesmas classes
 * byte a byte, incluindo o `overflow-x-auto` que é o que faz a tabela caber no
 * celular sem estourar a página.
 *
 * `minWidth` fica por conta de quem chama: depende de quantas colunas a tabela
 * tem, e é o número que decide quando a rolagem horizontal começa.
 */
export function DataTable({
  minWidth = 760,
  className,
  children,
  ...props
}: ComponentProps<"table"> & { minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-app-border">
      <table
        style={{ minWidth }}
        className={cn("w-full text-left text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-app-border bg-app-surface-2 text-xs text-app-muted", className)}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-4 py-2.5 font-medium", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-app-border last:border-0 hover:bg-app-surface-2/50", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
