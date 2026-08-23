import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Logo className="h-9 w-9 shrink-0" />
        <span className="text-lg font-semibold">FunilQuiz</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-6">
        {children}
      </div>
    </div>
  );
}
