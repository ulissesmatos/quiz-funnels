"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#preco", label: "Preço" },
];

export function SiteHeader({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScroll(10);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-transparent transition-colors",
        scrolled && "border-marketing-border bg-white/90 backdrop-blur",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <Logo className="h-8 w-8 shrink-0" />
            <span className="font-semibold tracking-tight">FunilQuiz</span>
          </Link>

          <ul className="hidden items-center gap-6 text-sm text-marketing-muted md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-marketing-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <HeaderCta isLoggedIn={isLoggedIn} />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-marketing-border text-marketing-ink md:hidden"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </button>
      </nav>

      <MobileMenu open={open} onClose={() => setOpen(false)} isLoggedIn={isLoggedIn} />
    </header>
  );
}

function HeaderCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <Link
        href="/funis"
        className="rounded-lg bg-marketing-blue px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-marketing-blue/20 transition-transform hover:-translate-y-0.5 hover:bg-[#2455d6]"
      >
        Ir para o painel
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/entrar"
        className="rounded-lg px-3 py-2 text-sm text-marketing-muted transition-colors hover:text-marketing-ink"
      >
        Entrar
      </Link>
      <Link
        href="/cadastro"
        className="rounded-lg bg-marketing-blue px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-marketing-blue/20 transition-transform hover:-translate-y-0.5 hover:bg-[#2455d6]"
      >
        Criar funil grátis
      </Link>
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  isLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
}) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className="fixed top-16 right-0 bottom-0 left-0 z-10 flex flex-col overflow-y-auto border-t border-marketing-border bg-white/95 backdrop-blur md:hidden"
    >
      <div className="flex flex-1 flex-col justify-between gap-8 p-4">
        <ul className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={onClose}
                className="block rounded-lg p-3 font-medium text-marketing-ink hover:bg-marketing-paper"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          {isLoggedIn ? (
            <Link
              href="/funis"
              onClick={onClose}
              className="rounded-lg bg-marketing-blue px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Ir para o painel
            </Link>
          ) : (
            <>
              <Link
                href="/entrar"
                onClick={onClose}
                className="rounded-lg border border-marketing-border px-4 py-3 text-center text-sm font-semibold text-marketing-ink"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={onClose}
                className="rounded-lg bg-marketing-blue px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Criar funil grátis
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > threshold);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
