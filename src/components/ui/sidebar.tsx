"use client";

import { ChevronDown } from "lucide-react";
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

export function Sidebar({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "flex shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 py-3 md:w-60 md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3 md:py-4",
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

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 gap-1 md:flex-col">
      {items.map((item) => (
        <NavRow key={item.href} item={item} pathname={pathname} depth={0} />
      ))}
    </nav>
  );
}

function NavRow({ item, pathname, depth }: { item: SidebarNavItem; pathname: string; depth: number }) {
  const [open, setOpen] = useState(false);
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const rowClass = cn(
    "flex items-center gap-2 rounded-lg py-2 text-sm transition-colors",
    depth === 0 ? "px-3" : "px-3 ml-4",
    active ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:bg-app-surface-2 hover:text-app-text",
  );

  if (!item.items?.length) {
    return (
      <Link href={item.href} className={rowClass}>
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={cn(rowClass, "w-full")}>
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {item.items.map((child) => (
            <NavRow key={child.href} item={child} pathname={pathname} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
