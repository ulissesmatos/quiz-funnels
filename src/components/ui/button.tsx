import { cva, type VariantProps } from "class-variance-authority";
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
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export { buttonStyles };
