"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, useCallback, useState } from "react";

import { cn } from "@/lib/cn";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  items?: SidebarNavItem[];
};

/**
 * Coluna de navegação — **só do `md:` pra cima**.
 *
 * Antes este mesmo elemento virava uma barra horizontal no celular, com a
 * navegação inteira, o logo e o bloco de conta lado a lado. Somados davam
 * ~738px numa tela de 412px: o estouro horizontal esticava o *layout viewport*
 * e o app inteiro aparecia com zoom out no telefone. No mobile agora quem
 * manda é `MobileTopBar`, e esta coluna simplesmente não existe.
 */
export function Sidebar({ collapsed = false, className, ...props }: ComponentProps<"aside"> & { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-app-border bg-app-surface py-4",
        "md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:items-stretch md:gap-1 md:transition-[width] md:duration-200",
        collapsed ? "md:w-[72px] md:px-2" : "md:w-60 md:px-3",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 md:mb-4 md:px-2", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-auto border-t border-app-border pt-3", className)} {...props} />;
}

/**
 * Recolhe o sidebar pra uma trilha só de ícones. Grudado na borda direita do
 * sidebar (metade pra fora, sobre o conteúdo) — padrão de VSCode/Linear/
 * Notion, evita brigar por espaço dentro do header quando recolhido a 72px.
 * Some no mobile: lá o sidebar já é a barra horizontal compacta.
 */
export function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? "Expandir menu" : "Recolher menu"}
      aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      className="absolute top-6 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-muted shadow-sm hover:bg-app-surface-2 hover:text-app-text md:flex"
    >
      {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
    </button>
  );
}

/**
 * Cabeçalho do celular: marca à esquerda, botão de menu à direita, e a
 * navegação inteira dentro de uma gaveta. Substitui a antiga barra horizontal
 * que empilhava tudo em linha e estourava a largura da tela.
 *
 * A gaveta fecha sozinha ao navegar (`usePathname` muda) — sem isso ela fica
 * aberta por cima da página nova.
 */
export function MobileTopBar({
  brand,
  children,
}: {
  brand: ReactNode;
  /** Recebe `fechar` para que os links da gaveta a fechem ao navegar. */
  children: (fechar: () => void) => ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);

  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={setAberta}>
      <header className="flex items-center justify-between gap-2 border-b border-app-border bg-app-surface px-4 py-3 md:hidden">
        {brand}
        <DialogPrimitive.Trigger
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-app-muted transition-colors hover:bg-app-surface-2 hover:text-app-text"
        >
          <Menu size={20} />
        </DialogPrimitive.Trigger>
      </header>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col border-r border-app-border bg-app-surface p-3 focus:outline-none md:hidden"
          aria-label="Menu"
        >
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <DialogPrimitive.Title className="text-sm font-semibold">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar menu"
              className="rounded-lg p-1.5 text-app-muted transition-colors hover:bg-app-surface-2 hover:text-app-text"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {children(fechar)}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: SidebarNavItem[];
  collapsed?: boolean;
  /** Chamado ao clicar num link — a gaveta do celular usa isto pra se fechar. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    // `min-h-0` é o que permite o nav encolher: filho de flex tem
    // `min-height: auto` por padrão e não cede abaixo do conteúdo, então sem
    // isso a rolagem nunca aparece e o rodapé de conta é empurrado pra fora do
    // sidebar de altura fixa.
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto">
      {items.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          pathname={pathname}
          depth={0}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function NavRow({
  item,
  pathname,
  depth,
  collapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const rowClass = cn(
    "relative flex items-center gap-2 rounded-lg py-2 text-sm transition-all duration-150 ease-app",
    depth === 0 ? "px-3" : "px-3 ml-4",
    collapsed && depth === 0 && "md:mx-auto md:w-9 md:justify-center md:px-0",
    active
      // Barra de acento à esquerda + tinta da marca: o item ativo passa a ser
      // reconhecível de relance, não só "um cinza um pouco diferente".
      ? "bg-app-primary/10 font-medium text-app-text before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-app-primary"
      : "text-app-muted hover:bg-app-surface-2 hover:text-app-text",
  );

  const showTooltip = collapsed && depth === 0;

  if (!item.items?.length) {
    const link = (
      <Link href={item.href} onClick={onNavigate} className={rowClass}>
        <span className={cn("shrink-0 transition-colors", active && "text-app-primary")}>{item.icon}</span>
        <span className={showTooltip ? "md:hidden" : undefined}>{item.label}</span>
      </Link>
    );

    if (!showTooltip) return link;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  const gatilho = (
    <button type="button" onClick={() => setOpen((v) => !v)} className={cn(rowClass, "w-full")}>
      {item.icon}
      <span className={cn("flex-1 text-left", showTooltip && "md:hidden")}>{item.label}</span>
      <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180", showTooltip && "md:hidden")} />
    </button>
  );

  return (
    <div>
      {showTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{gatilho}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ) : (
        gatilho
      )}
      {open && (
        <div className="flex flex-col gap-1">
          {item.items.map((child) => (
            <NavRow
              key={child.href}
              item={child}
              pathname={pathname}
              depth={depth + 1}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
