import type { Metadata } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exames de Faixa | Judô Rogério Cruz",
  description:
    "Programa de avaliação teórica e técnica da Associação Judô Rogério Cruz.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Exames AJRC",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
