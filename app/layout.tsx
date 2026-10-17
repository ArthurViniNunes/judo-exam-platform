import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exames de Faixa | Judô Rogério Cruz",
  description:
    "Programa de avaliação teórica e técnica da Associação Judô Rogério Cruz.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
