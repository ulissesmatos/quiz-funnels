import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/site";

import { fraunces, instrumentSans, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: "FunilQuiz",
  title: {
    default: "FunilQuiz — construtor de funis interativos",
    template: "%s · FunilQuiz",
  },
  description: "Crie funis de venda dinâmicos e interativos, com ou sem ajuda da IA.",
  keywords: ["funis de venda", "quiz", "funis interativos", "conversão"],
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "FunilQuiz",
    title: "FunilQuiz — construtor de funis interativos",
    description: "Crie funis de venda dinâmicos e interativos, com ou sem ajuda da IA.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "FunilQuiz — construtor de funis interativos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FunilQuiz — construtor de funis interativos",
    description: "Crie funis de venda dinâmicos e interativos, com ou sem ajuda da IA.",
    images: ["/twitter-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c12",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${instrumentSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
