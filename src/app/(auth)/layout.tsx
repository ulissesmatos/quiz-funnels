import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-10 w-10 shrink-0" />
        <span className="text-xl font-bold tracking-tight">FunilQuiz</span>
      </Link>

      <Card padding="lg" className="w-full max-w-sm shadow-app-lg">
        {children}
      </Card>

      <p className="mt-6 text-xs text-app-muted">Funis de quiz que vendem, montados por IA.</p>
    </div>
  );
}
