import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Funis — construtor de funis interativos",
    template: "%s · Funis",
  },
  description: "Crie funis de venda dinâmicos e interativos, com ou sem ajuda da IA.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
