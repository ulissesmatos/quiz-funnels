import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Paginação por link (não por estado): a página atual vive na querystring, o
 * que mantém o `page.tsx` como server component e faz o botão voltar do
 * navegador funcionar. Estava duplicada literalmente em `leads` e
 * `admin/auditoria`.
 *
 * `construirHref` fica com quem chama porque cada tela carrega filtros
 * diferentes na URL (funil, range, busca) que precisam sobreviver à troca de
 * página.
 */
export function Pagination({
  page,
  totalPages,
  construirHref,
  className,
}: {
  page: number;
  totalPages: number;
  construirHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className={cn("mt-4 flex items-center justify-center gap-3 text-sm", className)}
    >
      <PageLink href={construirHref(page - 1)} disabled={page <= 1}>
        Anterior
      </PageLink>
      <span className="text-app-muted">
        Página {page} de {totalPages}
      </span>
      <PageLink href={construirHref(page + 1)} disabled={page >= totalPages}>
        Próxima
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  const classes = "rounded-lg border border-app-border px-3 py-1.5";

  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(classes, "opacity-40")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(classes, "hover:bg-app-surface-2")}>
      {children}
    </Link>
  );
}
