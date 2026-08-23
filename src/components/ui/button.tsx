import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Botão do shell da aplicação. O botão do funil público é outro, temático. */
const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-app-primary text-white hover:bg-app-primary-hover",
        secondary: "bg-app-surface-2 text-app-text hover:bg-app-border",
        outline: "border border-app-border text-app-text hover:bg-app-surface-2",
        ghost: "text-app-muted hover:bg-app-surface-2 hover:text-app-text",
        danger: "bg-app-danger text-white hover:brightness-110",
        /** Ação destrutiva discreta — o X de remover linha, que antes era um `<button>` cru. */
        "ghost-danger": "text-app-muted hover:bg-app-danger/10 hover:text-app-danger",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonStyles> & {
    /** Troca o conteúdo por um spinner e desabilita — evita repetir `<Loader2 className="animate-spin" />` em cada chamada. */
    loading?: boolean;
  };

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export { buttonStyles };
