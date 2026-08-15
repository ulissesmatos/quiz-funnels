import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-app-primary text-lg font-bold text-white">
          F
        </span>
        <span className="text-lg font-semibold">Funis</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-6">
        {children}
      </div>
    </div>
  );
}
