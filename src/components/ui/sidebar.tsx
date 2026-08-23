"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, useState } from "react";

import { cn } from "@/lib/cn";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  items?: SidebarNavItem[];
};

export function Sidebar({ collapsed = false, className, ...props }: ComponentProps<"aside"> & { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        "relative flex shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 py-3",
        "md:sticky md:top-0 md:h-dvh md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:py-4 md:transition-[width] md:duration-200",
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
  return <div className={cn("md:mt-auto md:border-t md:border-app-border md:pt-3", className)} {...props} />;
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

export function SidebarNav({ items, collapsed = false }: { items: SidebarNavItem[]; collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    // `min-h-0` é o que permite o nav encolher: filho de flex tem
    // `min-height: auto` por padrão e não cede abaixo do conteúdo, então sem
    // isso a rolagem nunca aparece e o rodapé de conta é empurrado pra fora do
    // sidebar de altura fixa.
    <nav className="flex flex-1 gap-1 md:min-h-0 md:flex-col md:overflow-y-auto">
      {items.map((item) => (
        <NavRow key={item.href} item={item} pathname={pathname} depth={0} collapsed={collapsed} />
      ))}
    </nav>
  );
}

function NavRow({
  item,
  pathname,
  depth,
  collapsed,
}: {
  item: SidebarNavItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const rowClass = cn(
    "group/row relative flex items-center gap-2 rounded-lg py-2 text-sm transition-colors",
    depth === 0 ? "px-3" : "px-3 ml-4",
    collapsed && depth === 0 && "md:mx-auto md:w-9 md:justify-center md:px-0",
    active ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:bg-app-surface-2 hover:text-app-text",
  );

  const showTooltip = collapsed && depth === 0;

  if (!item.items?.length) {
    return (
      <Link href={item.href} className={rowClass}>
        {item.icon}
        <span className={showTooltip ? "md:hidden" : undefined}>{item.label}</span>
        {showTooltip && <SidebarTooltip>{item.label}</SidebarTooltip>}
      </Link>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={cn(rowClass, "w-full")}>
        {item.icon}
        <span className={cn("flex-1 text-left", showTooltip && "md:hidden")}>{item.label}</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180", showTooltip && "md:hidden")} />
        {showTooltip && <SidebarTooltip>{item.label}</SidebarTooltip>}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {item.items.map((child) => (
            <NavRow key={child.href} item={child} pathname={pathname} depth={depth + 1} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tooltip só-CSS (sem dependência nova): aparece à direita ao passar o mouse, só quando o sidebar está recolhido. */
function SidebarTooltip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none invisible absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md border border-app-border bg-app-surface-2 px-2 py-1 text-xs whitespace-nowrap text-app-text opacity-0 shadow-lg transition-opacity md:group-hover/row:visible md:group-hover/row:opacity-100">
      {children}
    </span>
  );
}
